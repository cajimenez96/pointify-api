/**
 * Script de Inicialización Multi-Tenant
 *
 * Este script crea datos de ejemplo para probar el sistema:
 * 1. Empresa demo (DEMO-2026)
 * 2. Settings con productos y premios de ejemplo
 * 3. Usuario Admin para la empresa
 * 4. Clientes de prueba (opcional)
 *
 * Uso: npx ts-node scripts/init-multitenant.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';

// Schemas
import { Company } from '../src/schemas/company.schema';
import { User, UserRole } from '../src/schemas/user.schema';
import { Settings } from '../src/schemas/settings.schema';
import { Client } from '../src/schemas/client.schema';

async function bootstrap() {
  console.log('='.repeat(60));
  console.log('  POINTIFY - Inicialización Multi-Tenant');
  console.log('='.repeat(60));
  console.log('');

  try {
    const app = await NestFactory.createApplicationContext(AppModule);

    // Obtener modelos
    const companyModel = app.get<Model<Company>>(getModelToken(Company.name));
    const userModel = app.get<Model<User>>(getModelToken(User.name));
    const settingsModel = app.get<Model<Settings>>(getModelToken(Settings.name));
    const clientModel = app.get<Model<Client>>(getModelToken(Client.name));

    // ========================================
    // 1. CREAR EMPRESA DEMO
    // ========================================
    console.log('1. Creando empresa demo...');

    const companyData = {
      companyCode: 'DEMO-2026',
      businessName: 'Café Demo S.A.',
      cuitCuil: '30123456789',
      address: 'Av. Corrientes 1234, CABA',
      contactInfo: {
        name: 'Gerente Demo',
        phone: '+54 11 1234-5678',
        email: 'contacto@cafedemo.com',
      },
      isActive: true,
      subscriptionEndDate: null, // Sin vencimiento (demo)
      maxUsers: 10,
      maxClients: 1000,
    };

    let company = await companyModel.findOne({ companyCode: companyData.companyCode });

    if (company) {
      console.log('   - Empresa ya existe, actualizando...');
      await companyModel.updateOne(
        { _id: company._id },
        { $set: companyData },
      );
      company = await companyModel.findById(company._id);
    } else {
      company = await companyModel.create(companyData);
      console.log('   - Empresa creada exitosamente');
    }

    console.log(`   - Código: ${company!.companyCode}`);
    console.log(`   - Nombre: ${company!.businessName}`);
    console.log('');

    // ========================================
    // 2. CREAR SETTINGS CON PRODUCTOS Y PREMIOS
    // ========================================
    console.log('2. Configurando productos y premios...');

    const settingsData = {
      companyId: company!._id,
      pointsConfig: [
        { productName: 'Café Espresso', pointsValue: 5, isActive: true },
        { productName: 'Café con Leche', pointsValue: 7, isActive: true },
        { productName: 'Cappuccino', pointsValue: 8, isActive: true },
        { productName: 'Medialunas (x3)', pointsValue: 10, isActive: true },
        { productName: 'Tostado Completo', pointsValue: 15, isActive: true },
        { productName: 'Almuerzo Ejecutivo', pointsValue: 25, isActive: true },
      ],
      rewards: [
        {
          _id: new Types.ObjectId(),
          name: 'Café Gratis',
          description: 'Un café espresso o americano a elección',
          pointsCost: 50,
          stock: null, // Infinito
          isActive: true,
          imageUrl: null,
        },
        {
          _id: new Types.ObjectId(),
          name: 'Desayuno Completo',
          description: 'Café + Medialunas + Jugo de naranja',
          pointsCost: 100,
          stock: 20,
          isActive: true,
          imageUrl: null,
        },
        {
          _id: new Types.ObjectId(),
          name: 'Almuerzo Gratis',
          description: 'Almuerzo ejecutivo del día',
          pointsCost: 200,
          stock: 10,
          isActive: true,
          imageUrl: null,
        },
        {
          _id: new Types.ObjectId(),
          name: 'Gift Card $5000',
          description: 'Tarjeta de regalo para usar en el local',
          pointsCost: 500,
          stock: 5,
          isActive: true,
          imageUrl: null,
        },
      ],
      campaignStartDate: new Date(),
      campaignEndDate: null, // Sin fecha de fin
      isActive: true,
    };

    let settings = await settingsModel.findOne({ companyId: company!._id });

    if (settings) {
      console.log('   - Settings ya existen, actualizando...');
      await settingsModel.updateOne(
        { _id: settings._id },
        { $set: settingsData },
      );
    } else {
      await settingsModel.create(settingsData);
      console.log('   - Settings creados exitosamente');
    }

    console.log(`   - ${settingsData.pointsConfig.length} productos configurados`);
    console.log(`   - ${settingsData.rewards.length} premios disponibles`);
    console.log('');

    // ========================================
    // 3. CREAR USUARIO ADMIN
    // ========================================
    console.log('3. Creando usuario Admin...');

    const adminData = {
      companyId: company!._id,
      username: 'admin.demo',
      password: 'demo1234',
      role: UserRole.ADMIN,
      name: 'Administrador Demo',
      dni: '11111111',
      isActive: true,
    };

    let adminUser = await userModel.findOne({
      companyId: company!._id,
      username: adminData.username,
    });

    const hashedPassword = await bcrypt.hash(adminData.password, 10);

    if (adminUser) {
      console.log('   - Usuario Admin ya existe, actualizando contraseña...');
      adminUser.password = hashedPassword;
      await adminUser.save();
    } else {
      await userModel.create({
        ...adminData,
        password: hashedPassword,
      });
      console.log('   - Usuario Admin creado exitosamente');
    }

    console.log(`   - Username: ${adminData.username}`);
    console.log(`   - Password: ${adminData.password}`);
    console.log('');

    // ========================================
    // 4. CREAR USUARIO CAJERO
    // ========================================
    console.log('4. Creando usuario Cajero...');

    const cashierData = {
      companyId: company!._id,
      username: 'cajero.demo',
      password: 'demo1234',
      role: UserRole.CASHIER,
      name: 'Cajero Demo',
      dni: '22222222',
      isActive: true,
    };

    let cashierUser = await userModel.findOne({
      companyId: company!._id,
      username: cashierData.username,
    });

    const cashierHashedPassword = await bcrypt.hash(cashierData.password, 10);

    if (cashierUser) {
      console.log('   - Usuario Cajero ya existe, actualizando contraseña...');
      cashierUser.password = cashierHashedPassword;
      await cashierUser.save();
    } else {
      await userModel.create({
        ...cashierData,
        password: cashierHashedPassword,
      });
      console.log('   - Usuario Cajero creado exitosamente');
    }

    console.log(`   - Username: ${cashierData.username}`);
    console.log(`   - Password: ${cashierData.password}`);
    console.log('');

    // ========================================
    // 5. CREAR CLIENTES DE PRUEBA
    // ========================================
    console.log('5. Creando clientes de prueba...');

    const clientsData = [
      {
        companyId: company!._id,
        dni: '33333333',
        name: 'María García',
        email: 'maria.garcia@example.com',
        phone: '1155551111',
        status: 'ACTIVE',
        currentPoints: 75,
        totalAccumulated: 150,
        isActive: true,
      },
      {
        companyId: company!._id,
        dni: '44444444',
        name: 'Juan Pérez',
        email: 'juan.perez@example.com',
        phone: '1155552222',
        status: 'ACTIVE',
        currentPoints: 120,
        totalAccumulated: 320,
        isActive: true,
      },
      {
        companyId: company!._id,
        dni: '55555555',
        name: '', // Shadow User - sin completar perfil
        email: '',
        phone: '',
        status: 'PENDING',
        currentPoints: 25,
        totalAccumulated: 25,
        isActive: true,
      },
    ];

    for (const clientData of clientsData) {
      const existingClient = await clientModel.findOne({
        companyId: company!._id,
        dni: clientData.dni,
      });

      if (existingClient) {
        await clientModel.updateOne({ _id: existingClient._id }, { $set: clientData });
      } else {
        await clientModel.create(clientData);
      }
    }

    console.log(`   - ${clientsData.length} clientes creados/actualizados`);
    console.log('');

    // ========================================
    // RESUMEN FINAL
    // ========================================
    console.log('='.repeat(60));
    console.log('  RESUMEN - Datos de acceso');
    console.log('='.repeat(60));
    console.log('');
    console.log('EMPRESA DEMO:');
    console.log(`  - Código: ${company!.companyCode}`);
    console.log(`  - Nombre: ${company!.businessName}`);
    console.log('');
    console.log('CREDENCIALES DE ACCESO:');
    console.log('');
    console.log('  Admin:');
    console.log(`    POST /auth/login`);
    console.log(`    { "companyCode": "${company!.companyCode}", "username": "${adminData.username}", "password": "${adminData.password}" }`);
    console.log('');
    console.log('  Cajero:');
    console.log(`    POST /auth/login`);
    console.log(`    { "companyCode": "${company!.companyCode}", "username": "${cashierData.username}", "password": "${cashierData.password}" }`);
    console.log('');
    console.log('CLIENTES DE PRUEBA:');
    for (const client of clientsData) {
      console.log(`  - DNI: ${client.dni} | Puntos: ${client.currentPoints} | Status: ${client.status}`);
    }
    console.log('');
    console.log('='.repeat(60));
    console.log('  Inicialización completada exitosamente');
    console.log('='.repeat(60));

    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('Error durante la inicialización:', error);
    process.exit(1);
  }
}

bootstrap();
