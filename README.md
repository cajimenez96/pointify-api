# Pointify API - Multi-Tenant SaaS

> Sistema de fidelización de clientes multi-empresa construido con NestJS, MongoDB y JWT.

## 🏢 Arquitectura Multi-Tenant

Pointify API es un **sistema multi-tenant** que permite a múltiples empresas gestionar sus propios programas de fidelización de clientes de forma aislada y segura. Cada empresa tiene:

- ✅ **Datos aislados**: Clientes, transacciones, configuraciones y usuarios separados por empresa
- ✅ **Suscripciones**: Control de acceso por fecha de expiración
- ✅ **SuperAdmin**: Acceso global para administración de empresas
- ✅ **Autenticación dual**: Login por empresa + Login SuperAdmin

---

## 📚 Documentación Completa

Para información detallada sobre la arquitectura y el plan de transformación multi-tenant:

📁 **[Ver Documentación en `/docs`](./docs/MULTI_TENANT_INDEX.md)**

Incluye:

- [Resumen Ejecutivo](./docs/RESUMEN_EJECUTIVO.md)
- [Análisis de Arquitectura](./docs/ANALISIS_ARQUITECTURA_ACTUAL.md)
- [Plan Multi-Tenant Completo](./docs/PLAN_MULTI_TENANT.md)
- [Documentación de API](./docs/API_DOCS.md)

---

## 🚀 Inicio Rápido

### Requisitos Previos

- Node.js >= 18
- MongoDB >= 6.0
- npm o yarn

### Instalación

```bash
# Clonar repositorio
git clone <repo-url>
cd pointify-api

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env y configurar MONGODB_URI y JWT_SECRET
```

### Inicialización SuperAdmin (Primera Vez)

La primera vez que ejecutes el proyecto, debes crear la cuenta SuperAdmin:

```bash
# Opción 1: Desarrollo (con ts-node)
npm run seed

# Opción 2: Producción (después de compilar)
npm run build
npm run seed:prod
```

Este script:

- ✅ Crea SuperAdmin (username: `superadmin`, password: `admin123`)
- ✅ Es idempotente: solo crea el SuperAdmin si NO existe
- ✅ NO modifica la contraseña en ejecuciones posteriores

> ⚠️ **Importante**: Cambiar contraseña del SuperAdmin después del primer login
>
> 💡 **Nota**: Este script es seguro ejecutarlo múltiples veces. Si el SuperAdmin ya existe, no realiza ningún cambio.

### Ejecutar en Desarrollo

```bash
# Modo watch (desarrollo)
npm run start:dev

# Producción (sin seed)
npm run start:prod

# Producción (con seed automático)
npm run start:prod:init
```

La API estará disponible en `http://localhost:3000`

### 🚀 Despliegue en Coolify

Para desplegar en Coolify, configura el proyecto con los siguientes ajustes:

#### 1. Build Configuration

```bash
# Build Command
npm install && npm run build
```

#### 2. Start Command

```bash
# Start Command (ejecuta seed automáticamente)
npm run start:prod:init
```

Este comando:
- ✅ Ejecuta el seed automáticamente al iniciar
- ✅ Crea el SuperAdmin solo si no existe (idempotente)
- ✅ Inicia el servidor después del seed

#### 3. Variables de Entorno

Configura estas variables en Coolify:

```bash
MONGODB_URI=mongodb://usuario:password@host:27017/pointify
JWT_SECRET=tu-clave-secreta-super-segura-cambiala-en-produccion
PORT=3000
NODE_ENV=production
```

> 💡 **Recomendación**: El script `start:prod:init` es seguro ejecutarlo en cada reinicio del contenedor, ya que solo crea el SuperAdmin si no existe.

---

## 🔐 Autenticación

### SuperAdmin Login

**Endpoint**: `POST /auth/superadmin/login`

```json
{
  "username": "superadmin",
  "password": "admin123"
}
```

**Respuesta**:

```json
{
  "access_token": "eyJhbGc...",
  "user": {
    "id": "...",
    "username": "superadmin",
    "name": "Super Administrador",
    "role": "superadmin",
    "isSuperAdmin": true
  }
}
```

### Tenant Login (Usuarios de Empresa)

**Endpoint**: `POST /auth/login`

```json
{
  "companyCode": "DEFAULT",
  "username": "juan.perez",
  "password": "pass123"
}
```

**Respuesta**:

```json
{
  "access_token": "eyJhbGc...",
  "user": {
    "id": "...",
    "username": "juan.perez",
    "name": "Juan Pérez",
    "role": "admin",
    "companyCode": "DEFAULT",
    "companyName": "Empresa Principal"
  }
}
```

---

## 📦 Estructura del Proyecto

```
pointify-api/
├── src/
│   ├── guards/                   # Guards de seguridad
│   │   ├── company-context.guard.ts    # Validación multi-tenant y suscripciones
│   │   ├── roles.guard.ts              # Control de roles
│   │   └── payment-required.exception.ts
│   ├── modules/
│   │   ├── auth/                 # Autenticación (SuperAdmin + Tenant)
│   │   ├── clients/              # Gestión de clientes
│   │   ├── transactions/         # Transacciones de puntos
│   │   ├── settings/             # Configuración de campañas
│   │   └── dashboard/            # Métricas y estadísticas
│   ├── schemas/
│   │   ├── company.schema.ts     # 🆕 Empresa (Multi-Tenant)
│   │   ├── user.schema.ts        # Usuarios (con companyId)
│   │   ├── client.schema.ts      # Clientes (con companyId)
│   │   ├── transaction.schema.ts # Transacciones (con companyId)
│   │   └── settings.schema.ts    # Configuración (con companyId)
│   ├── seed.ts                   # Script para crear SuperAdmin
│   └── main.ts
├── docs/                         # Documentación completa
└── README.md
```

---

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

---

## 🔒 Seguridad Multi-Tenant

### CompanyContextGuard

Todos los endpoints protegidos utilizan `CompanyContextGuard` que:

1. Valida JWT y extrae `companyId`
2. **Bypass para SuperAdmins** (acceso global)
3. Verifica que la empresa esté activa (`isActive: true`)
4. **Valida suscripción**: Si expiró → `HTTP 402 Payment Required`
5. Inyecta `companyId` en el request para aislamiento de datos

### Aislamiento de Datos

Todos los queries filtran por `companyId`:

```typescript
// Ejemplo: Buscar clientes de una empresa
clientModel.find({ companyId: req.companyId, isActive: true });
```

---

## 📊 Schemas Multi-Tenant

### Company (Nuevo)

```typescript
{
  companyCode: string (unique)      // Ej: "DEFAULT", "EMP001"
  businessName: string              // Razón social
  contactInfo: { email, phone, ... }
  isActive: boolean                 // Estado activo/suspendido
  subscriptionEndDate: Date | null  // null = ilimitado
  maxUsers: number                  // Límites (0 = sin límite)
  maxClients: number
}
```

### User, Client, Transaction, Settings

Todos ahora tienen:

- `companyId: ObjectId` (required)
- Índices compuestos: `{ companyId: 1, ... }`

---

## 🌐 Variables de Entorno

```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017/pointify

# JWT
JWT_SECRET=your-super-secret-key-change-in-production

# Puerto (opcional)
PORT=3000
```

---

## 🚨 Errores Comunes

### HTTP 401 - Unauthorized

- Token JWT inválido o expirado
- Credenciales incorrectas

### HTTP 402 - Payment Required

- **Suscripción de la empresa expirada**
- Renovar plan o actualizar `subscriptionEndDate`

### HTTP 403 - Forbidden

- Empresa no encontrada o desactivada (`isActive: false`)
- Usuario sin permisos para la acción

---

## 📖 Documentación API

Ver documentación completa de endpoints en:
**[docs/API_DOCS.md](./docs/API_DOCS.md)**

Documentación Swagger disponible en:
`http://localhost:3000/api`

---

## 🛠️ Scripts Disponibles

```bash
npm run start              # Iniciar en modo normal
npm run start:dev          # Modo desarrollo (watch)
npm run start:prod         # Modo producción
npm run start:prod:init    # Producción con seed automático (para Coolify)
npm run build              # Compilar TypeScript
npm run seed               # Crear SuperAdmin (desarrollo con ts-node)
npm run seed:prod          # Crear SuperAdmin (producción, requiere build previo)
npm run format             # Formatear código con Prettier
npm run lint               # Lint con ESLint
npm run test               # Tests unitarios
npm run test:e2e           # Tests E2E
```

---

## 📝 Licencia

[MIT Licensed](LICENSE)

---

## 👥 Contribuir

1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📞 Soporte

Para preguntas o soporte, contactar a: **admin@pointify.com**
