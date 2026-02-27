# Pointify API - Documentación Técnica

## Visión General

Pointify es una **Plataforma SaaS Multi-Tenant** para gestión de programas de lealtad basados en puntos. Permite a múltiples empresas (tenants) gestionar sus propios clientes, productos y sistema de recompensas de forma aislada.

---

## 1. Arquitectura Multi-Tenant

### Jerarquía de Usuarios

| Nivel | Rol | Scope | companyId |
|-------|-----|-------|-----------|
| 0 (Global) | SuperAdmin | Gestión de empresas | `null` |
| 1 (Tenant) | Admin | Gestión de su empresa | `ObjectId` |
| 1 (Tenant) | Cashier | Operaciones de caja | `ObjectId` |

### Reglas de Aislamiento

- **Datos aislados por `companyId`**: Usuarios, Clientes, Transacciones, Settings
- **SuperAdmin**: Acceso global, bypassea validaciones de empresa
- **Validación de suscripción**: Si `subscriptionEndDate` está vencida → HTTP 402

---

## 2. Schemas MongoDB

### 2.1 Company (Empresa/Tenant)

**Ubicación:** `src/schemas/company.schema.ts`

```typescript
{
  companyCode: string,        // Único, uppercase (ej: "CAFE-2026")
  businessName: string,       // Razón social
  cuitCuil: string,          // ID Fiscal (11 dígitos, único)
  address?: string,          // Dirección física
  contactInfo: {
    name: string,
    phone: string,
    email: string
  },
  isActive: boolean,         // Default: true
  subscriptionEndDate: Date | null,  // null = sin vencimiento
  maxUsers: number,          // 0 = ilimitado
  maxClients: number,        // 0 = ilimitado
  createdAt, updatedAt       // Timestamps automáticos
}
```

**Índices:**
- `{ companyCode: 1 }` - unique
- `{ cuitCuil: 1 }` - unique
- `{ isActive: 1 }`

---

### 2.2 User (Usuario del Sistema)

**Ubicación:** `src/schemas/user.schema.ts`

```typescript
enum UserRole {
  SUPER_ADMIN = 'superadmin',
  ADMIN = 'admin',
  CASHIER = 'cashier'
}

{
  companyId: ObjectId | null,  // null para SuperAdmin
  username: string,            // Login (único por empresa)
  password: string,            // Hash bcrypt
  role: UserRole,
  name: string,
  dni: string,
  isActive: boolean,
  createdAt, updatedAt
}
```

**Índices:**
- `{ companyId: 1, username: 1 }` - unique, sparse
- `{ username: 1 }` - unique (partialFilter: companyId = null)
- `{ companyId: 1, dni: 1 }` - unique, sparse
- `{ companyId: 1, isActive: 1 }`

---

### 2.3 Client (Cliente del Programa de Lealtad)

**Ubicación:** `src/schemas/client.schema.ts`

```typescript
{
  companyId: ObjectId,        // Empresa propietaria
  dni: string,                // Único por empresa
  name: string,
  phone: string,
  email: string,
  status: 'PENDING' | 'ACTIVE',  // PENDING = Shadow User
  currentPoints: number,      // Puntos disponibles
  totalAccumulated: number,   // Histórico total
  isActive: boolean,
  createdAt, updatedAt
}
```

**Índices:**
- `{ companyId: 1, dni: 1 }` - unique
- `{ companyId: 1, isActive: 1 }`
- `{ companyId: 1, status: 1 }`

**Concepto Shadow User:**
Cuando un cliente gana puntos sin estar registrado, se crea con `status: PENDING`. Luego puede completar su perfil → `status: ACTIVE`.

---

### 2.4 Transaction (Historial de Puntos)

**Ubicación:** `src/schemas/transaction.schema.ts`

```typescript
{
  companyId: ObjectId,
  type: 'EARN' | 'REDEEM',
  dni: string,                // DNI del cliente
  clientId?: ObjectId,        // Referencia opcional
  points: number,             // Valor absoluto

  // Solo EARN:
  saleCode?: string,          // Código único de venta
  productName?: string,       // Producto comprado

  // Solo REDEEM:
  rewardId?: ObjectId,        // ID del premio
  rewardName?: string,        // Snapshot del nombre

  userId?: ObjectId,          // Quién registró
  createdAt, updatedAt
}
```

**Índices:**
- `{ companyId: 1, saleCode: 1 }` - unique, sparse
- `{ companyId: 1, type: 1, createdAt: -1 }`
- `{ companyId: 1, dni: 1, createdAt: -1 }`
- `{ companyId: 1, createdAt: -1 }`

---

### 2.5 Settings (Configuración de Empresa)

**Ubicación:** `src/schemas/settings.schema.ts`

```typescript
// Subdocumento: Producto
interface ProductPointsConfig {
  productName: string,      // Ej: "Café Espresso"
  pointsValue: number,      // Puntos que otorga
  isActive: boolean
}

// Subdocumento: Premio
interface Reward {
  _id: ObjectId,
  name: string,
  description?: string,
  pointsCost: number,       // Puntos necesarios
  stock: number | null,     // null = infinito
  isActive: boolean,
  imageUrl?: string
}

// Schema principal
{
  companyId: ObjectId,        // Único por empresa
  pointsConfig: ProductPointsConfig[],
  rewards: Reward[],
  campaignStartDate?: Date,
  campaignEndDate?: Date,
  isActive: boolean,
  createdAt, updatedAt
}
```

**Índice:**
- `{ companyId: 1 }` - unique

---

## 3. Sistema de Autenticación

### 3.1 JWT Payload

```typescript
{
  sub: string,              // User ID
  username: string,
  role: 'superadmin' | 'admin' | 'cashier',
  companyId: string | null, // null para SuperAdmin
  companyCode: string | null,
  iat: number,
  exp: number               // 7 días
}
```

### 3.2 Request User (después de JWT validation)

```typescript
request.user = {
  userId: string,
  username: string,
  role: string,
  companyId: string | null,
  companyCode: string | null
}
```

---

## 4. Guards de Seguridad

### 4.1 CompanyContextGuard

**Ubicación:** `src/guards/company-context.guard.ts`

**Flujo:**
1. Si `role === SUPER_ADMIN` → bypass, inyecta `req.isSuperAdmin = true`
2. Valida que empresa exista y `isActive = true`
3. Valida suscripción: si `subscriptionEndDate < now` → HTTP 402
4. Inyecta: `req.companyId`, `req.companyCode`, `req.company`

### 4.2 RolesGuard

**Ubicación:** `src/guards/roles.guard.ts`

Valida que `user.role` esté en los roles permitidos del endpoint.

```typescript
@Roles('admin', 'cashier')
```

### 4.3 SuperAdminGuard

**Ubicación:** `src/guards/super-admin.guard.ts`

Valida que `user.role === 'superadmin'`.

---

## 5. Endpoints API

### 5.1 Auth Module

#### POST /auth/superadmin/login

**Payload:**
```json
{
  "username": "superadmin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "access_token": "eyJ...",
  "user": {
    "_id": "...",
    "username": "superadmin",
    "role": "superadmin",
    "name": "Sistema Super Admin"
  }
}
```

---

#### POST /auth/login (Tenant)

**Payload:**
```json
{
  "companyCode": "DEMO-2026",
  "username": "admin.demo",
  "password": "demo1234"
}
```

**Response:**
```json
{
  "access_token": "eyJ...",
  "user": {
    "_id": "...",
    "username": "admin.demo",
    "role": "admin",
    "name": "Administrador Demo",
    "companyCode": "DEMO-2026",
    "companyName": "Café Demo S.A."
  }
}
```

---

### 5.2 SuperAdmin Module

#### POST /superadmin/companies

**Guards:** JWT + SuperAdminGuard

**Payload:**
```json
{
  "companyCode": "CAFE-2026",
  "businessName": "Café Martínez S.A.",
  "cuitCuil": "30123456789",
  "email": "contacto@cafe.com",
  "phone": "+54 11 1234-5678",
  "country": "Argentina",
  "maxClients": 1000,
  "maxUsers": 10,
  "subscriptionEndDate": "2027-12-31T23:59:59Z"
}
```

**Response:** Objeto Company creado

**Errores:**
- 409: companyCode o cuitCuil duplicado

---

#### GET /superadmin/companies

**Guards:** JWT + SuperAdminGuard

**Query Params:** `businessName`, `cuitCuil`, `isActive`, `page`, `limit`

**Response:** Lista paginada de empresas

---

#### PATCH /superadmin/companies/:id

**Guards:** JWT + SuperAdminGuard

**Payload:** Campos parciales a actualizar

---

#### POST /superadmin/users

**Guards:** JWT + SuperAdminGuard

**Payload:**
```json
{
  "companyId": "507f1f77bcf86cd799439011",
  "username": "nuevo.admin",
  "password": "password123",
  "name": "Nuevo Administrador",
  "dni": "12345678",
  "role": "admin"
}
```

---

#### GET /superadmin/users

**Guards:** JWT + SuperAdminGuard

**Query Params:** `companyId`, `role`, `isActive`

---

### 5.3 Settings Module

#### GET /settings

**Guards:** JWT + CompanyContextGuard + RolesGuard (admin)

**Response:**
```json
{
  "_id": "...",
  "companyId": "...",
  "pointsConfig": [
    { "productName": "Café Espresso", "pointsValue": 5, "isActive": true }
  ],
  "rewards": [
    {
      "_id": "...",
      "name": "Café Gratis",
      "description": "Un café a elección",
      "pointsCost": 50,
      "stock": null,
      "isActive": true
    }
  ],
  "campaignStartDate": "2026-01-01T00:00:00Z",
  "campaignEndDate": null,
  "isActive": true
}
```

---

#### POST /settings/products

**Guards:** JWT + CompanyContextGuard + RolesGuard (admin)

**Payload:**
```json
{
  "productName": "Café con Leche",
  "pointsValue": 7
}
```

---

#### PATCH /settings/products/:productName/points

**Guards:** JWT + CompanyContextGuard + RolesGuard (admin)

**Payload:**
```json
{
  "pointsValue": 10
}
```

---

#### DELETE /settings/products/:productName

**Guards:** JWT + CompanyContextGuard + RolesGuard (admin)

---

#### POST /settings/rewards

**Guards:** JWT + CompanyContextGuard + RolesGuard (admin)

**Payload:**
```json
{
  "name": "Desayuno Gratis",
  "description": "Café + Medialunas",
  "pointsCost": 100,
  "stock": 20,
  "imageUrl": "https://..."
}
```

---

#### PATCH /settings/rewards/:rewardId

**Guards:** JWT + CompanyContextGuard + RolesGuard (admin)

**Payload:** Campos parciales (name, description, pointsCost, stock, isActive)

---

#### DELETE /settings/rewards/:rewardId

**Guards:** JWT + CompanyContextGuard + RolesGuard (admin)

**Nota:** Soft delete (isActive = false)

---

### 5.4 Transactions Module

#### POST /transactions/earn

**Guards:** JWT + CompanyContextGuard + RolesGuard (admin, cashier)

**Payload:**
```json
{
  "dni": "11223344",
  "saleCode": "SALE-001",
  "productName": "Café Espresso"
}
```

**Flujo:**
1. Validar saleCode único en la empresa
2. Validar campaña activa y dentro de fechas
3. Buscar producto en pointsConfig → obtener pointsValue
4. Buscar cliente o crear Shadow User (PENDING)
5. Sumar puntos: `currentPoints += pointsValue`, `totalAccumulated += pointsValue`
6. Crear Transaction type=EARN

**Response:**
```json
{
  "message": "Puntos agregados exitosamente",
  "client": {
    "dni": "11223344",
    "currentPoints": 15,
    "totalAccumulated": 15
  },
  "transaction": {
    "type": "EARN",
    "points": 5,
    "productName": "Café Espresso",
    "saleCode": "SALE-001"
  }
}
```

**Errores:**
- 400: Campaña no activa, producto no encontrado, fuera de fechas
- 409: saleCode duplicado

---

#### POST /transactions/redeem

**Guards:** JWT + CompanyContextGuard + RolesGuard (admin, cashier)

**Payload:**
```json
{
  "dni": "11223344",
  "rewardId": "507f1f77bcf86cd799439011"
}
```

**Flujo (Atómico con sesión MongoDB):**
1. Buscar cliente (debe existir)
2. Buscar reward en Settings
3. Validar stock > 0 (o null = infinito)
4. Validar currentPoints >= pointsCost
5. Restar puntos al cliente
6. Decrementar stock del reward
7. Crear Transaction type=REDEEM

**Response:**
```json
{
  "message": "Canje realizado exitosamente",
  "client": {
    "dni": "11223344",
    "currentPoints": 25
  },
  "reward": {
    "name": "Café Gratis",
    "stockRemaining": 19
  },
  "transaction": {
    "type": "REDEEM",
    "points": 50,
    "rewardName": "Café Gratis"
  }
}
```

**Errores:**
- 400: Puntos insuficientes
- 404: Cliente o reward no encontrado
- 409: Stock agotado

---

#### GET /transactions

**Guards:** JWT + CompanyContextGuard + RolesGuard (admin)

**Query Params:** `page=1`, `limit=20`, `type=EARN|REDEEM`

**Response:** Lista paginada de transacciones

---

#### GET /transactions/client/:dni

**Guards:** JWT + CompanyContextGuard + RolesGuard (admin, cashier)

**Response:** Historial de transacciones del cliente

---

### 5.5 Clients Module

#### GET /clients/:dni (Público - QR Code)

**Sin autenticación**

**Query Params:** `companyCode` (obligatorio)

**Response (cliente existe):**
```json
{
  "exists": true,
  "dni": "11223344",
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "phone": "1155551234",
  "currentPoints": 75,
  "totalAccumulated": 150,
  "status": "ACTIVE",
  "company": {
    "companyCode": "DEMO-2026",
    "businessName": "Café Demo S.A."
  },
  "rewards": [
    {
      "_id": "...",
      "name": "Café Gratis",
      "description": "Un café a elección",
      "pointsCost": 50,
      "stock": null,
      "canAfford": true,
      "pointsNeeded": 0
    },
    {
      "_id": "...",
      "name": "Desayuno Completo",
      "pointsCost": 100,
      "stock": 20,
      "canAfford": false,
      "pointsNeeded": 25
    }
  ]
}
```

**Response (cliente no existe):**
```json
{
  "exists": false,
  "dni": "99999999",
  "name": null,
  "currentPoints": 0,
  "totalAccumulated": 0,
  "status": "PENDING",
  "company": { ... },
  "rewards": [ ... ]
}
```

---

#### POST /clients (Público - Registro)

**Sin autenticación**

**Payload:**
```json
{
  "companyCode": "DEMO-2026",
  "dni": "11223344",
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "phone": "1155551234"
}
```

**Response:** Cliente creado con status ACTIVE

**Errores:**
- 403: Empresa no activa, límite de clientes alcanzado, DNI duplicado
- 404: Empresa no encontrada

---

#### POST /clients/complete-profile (Público)

**Sin autenticación**

**Payload:**
```json
{
  "companyCode": "DEMO-2026",
  "dni": "11223344",
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "phone": "1155551234"
}
```

**Flujo:**
1. Buscar empresa por companyCode
2. Buscar cliente PENDING con ese DNI
3. Actualizar datos y cambiar status → ACTIVE

**Response:**
```json
{
  "message": "Perfil completado exitosamente",
  "client": { ... }
}
```

**Errores:**
- 404: Empresa o cliente no encontrado, cliente ya tiene perfil

---

#### GET /clients (Privado - Admin)

**Guards:** JWT + RolesGuard (admin)

**Response:** Lista de clientes de la empresa

---

## 6. DTOs

### 6.1 CreateClientDto

**Ubicación:** `src/modules/clients/dto/client.dto.ts`

```typescript
{
  companyCode: string,  // Obligatorio
  dni: string,          // Obligatorio
  name: string,         // Obligatorio
  phone?: string,       // Opcional
  email?: string        // Opcional, validación email
}
```

---

### 6.2 CompleteProfileDto

**Ubicación:** `src/modules/clients/dto/complete-profile.dto.ts`

```typescript
{
  companyCode: string,  // Obligatorio
  dni: string,          // Obligatorio
  name: string,         // Obligatorio
  email: string,        // Obligatorio, validación email
  phone?: string        // Opcional
}
```

---

### 6.3 EarnPointsDto

**Ubicación:** `src/modules/transactions/dto/earn-points.dto.ts`

```typescript
{
  dni: string,          // DNI del cliente
  saleCode: string,     // Código único de venta
  productName: string   // Debe existir en Settings.pointsConfig
}
```

---

### 6.4 RedeemPointsDto

**Ubicación:** `src/modules/transactions/dto/redeem-points.dto.ts`

```typescript
{
  dni: string,          // DNI del cliente
  rewardId: string      // ObjectId del reward
}
```

---

### 6.5 TenantLoginDto

**Ubicación:** `src/modules/auth/dto/tenant-login.dto.ts`

```typescript
{
  companyCode: string,  // Código de empresa
  username: string,     // Min 3 caracteres
  password: string      // Min 6 caracteres
}
```

---

### 6.6 SuperAdminLoginDto

**Ubicación:** `src/modules/auth/dto/superadmin-login.dto.ts`

```typescript
{
  username: string,     // Min 3 caracteres
  password: string      // Min 6 caracteres
}
```

---

## 7. Códigos de Error HTTP

| Código | Significado | Uso |
|--------|-------------|-----|
| 400 | Bad Request | Validación fallida, puntos insuficientes, campaña inactiva |
| 401 | Unauthorized | JWT inválido o expirado |
| 402 | Payment Required | Suscripción de empresa vencida |
| 403 | Forbidden | Sin permisos, empresa inactiva, límites alcanzados |
| 404 | Not Found | Recurso no encontrado |
| 409 | Conflict | Duplicado (companyCode, cuitCuil, saleCode, DNI) |

---

## 8. Scripts

### 8.1 Seed SuperAdmin

**Ubicación:** `src/seed.ts`

```bash
npx ts-node src/seed.ts
```

Crea el SuperAdmin inicial:
- Username: `superadmin`
- Password: `admin123`

---

### 8.2 Init Multi-Tenant (Demo)

**Ubicación:** `scripts/init-multitenant.ts`

```bash
npx ts-node scripts/init-multitenant.ts
```

Crea datos de ejemplo:

**Empresa:**
- Código: `DEMO-2026`
- Nombre: `Café Demo S.A.`

**Usuarios:**
- Admin: `admin.demo` / `demo1234`
- Cajero: `cajero.demo` / `demo1234`

**Productos (6):**
- Café Espresso (5 pts)
- Café con Leche (7 pts)
- Cappuccino (8 pts)
- Medialunas x3 (10 pts)
- Tostado Completo (15 pts)
- Almuerzo Ejecutivo (25 pts)

**Premios (4):**
- Café Gratis (50 pts, stock infinito)
- Desayuno Completo (100 pts, stock 20)
- Almuerzo Gratis (200 pts, stock 10)
- Gift Card $5000 (500 pts, stock 5)

**Clientes de prueba (3):**
- DNI 33333333: 75 pts, ACTIVE
- DNI 44444444: 120 pts, ACTIVE
- DNI 55555555: 25 pts, PENDING (Shadow User)

---

## 9. Flujos de Negocio

### 9.1 Flujo de Venta (Earn Points)

```
Cliente compra → Cajero escanea/ingresa DNI
                      ↓
              POST /transactions/earn
              { dni, saleCode, productName }
                      ↓
         ┌─ Cliente existe? ──────────────┐
         │                                │
        Sí                               No
         │                                │
         ↓                                ↓
   Sumar puntos                    Crear Shadow User
         │                         (status: PENDING)
         └────────────────┬───────────────┘
                          ↓
                   Crear Transaction
                   (type: EARN)
                          ↓
                   Respuesta con
                   puntos actualizados
```

### 9.2 Flujo de Canje (Redeem)

```
Cliente consulta puntos → GET /clients/:dni?companyCode=XXX
                                    ↓
                         Ve premios con canAfford=true
                                    ↓
                         Selecciona premio a canjear
                                    ↓
                         POST /transactions/redeem
                         { dni, rewardId }
                                    ↓
                    ┌─ Validaciones ─────────────────┐
                    │ - Cliente existe               │
                    │ - Reward existe y activo       │
                    │ - Stock > 0 (o null)           │
                    │ - currentPoints >= pointsCost  │
                    └────────────────────────────────┘
                                    ↓
                         TRANSACCIÓN ATÓMICA:
                         - client.currentPoints -= cost
                         - reward.stock -= 1
                         - Crear Transaction REDEEM
                                    ↓
                         Respuesta con nuevo saldo
```

### 9.3 Flujo de Registro de Cliente

```
                    ┌─────────────────────────┐
                    │  Opción A: Registro     │
                    │  directo (POST /clients)│
                    └───────────┬─────────────┘
                                ↓
                         status: ACTIVE


                    ┌─────────────────────────┐
                    │  Opción B: Shadow User  │
                    │  (via earn points)      │
                    └───────────┬─────────────┘
                                ↓
                         status: PENDING
                                ↓
                    Luego: POST /clients/complete-profile
                                ↓
                         status: ACTIVE
```

---

## 10. Cambios Realizados (Refactorización)

### Fecha: 2026-02-06

### Archivos Modificados:

1. **`src/modules/clients/dto/client.dto.ts`**
   - Agregado campo `companyCode` a `CreateClientDto`

2. **`src/modules/clients/clients.controller.ts`**
   - Importado `CompleteProfileDto`
   - Actualizado endpoint `complete-profile` para usar nuevo DTO

3. **`src/modules/clients/clients.service.ts`**
   - Método `createClient()` ahora resuelve `companyCode` → `companyId`
   - Nuevo método `createClientInternal()` para uso interno (Shadow Users)
   - Nuevo método `completeProfileByCompanyCode()` para endpoint público

### Archivos Creados:

1. **`src/modules/clients/dto/complete-profile.dto.ts`**
   - Nuevo DTO con campos: companyCode, dni, name, email, phone

2. **`scripts/init-multitenant.ts`**
   - Script de inicialización con datos de ejemplo

---

## 11. Configuración

### Variables de Entorno

```env
MONGODB_URI=mongodb://localhost:27017/pointify
JWT_SECRET=your-secret-key
PORT=3000
```

### Ejecutar Proyecto

```bash
# Desarrollo
npm run start:dev

# Seed SuperAdmin
npx ts-node src/seed.ts

# Datos de ejemplo
npx ts-node scripts/init-multitenant.ts

# Build
npm run build

# Producción
npm run start:prod
```

---

## 12. Swagger/OpenAPI

Disponible en: `http://localhost:3000/api`

Documentación automática de todos los endpoints con:
- Schemas de request/response
- Ejemplos de payloads
- Códigos de error
