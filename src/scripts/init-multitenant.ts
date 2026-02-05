import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Company, CompanyDocument } from '../schemas/company.schema';
import { User, UserDocument, UserRole } from '../schemas/user.schema';
import { Client, ClientDocument } from '../schemas/client.schema';
import {
  Transaction,
  TransactionDocument,
} from '../schemas/transaction.schema';
import { Settings, SettingsDocument } from '../schemas/settings.schema';
import * as bcrypt from 'bcrypt';

/**
 * Script de Inicialización y Migración Multi-Tenant
 *
 * Este script realiza:
 * 1. Crea una empresa "DEFAULT" para datos existentes
 * 2. Crea un SuperAdmin inicial (username: superadmin)
 * 3. Migra todos los registros existentes a la empresa DEFAULT
 * 4. Crea los índices compuestos necesarios
 *
 * IMPORTANTE: Este script debe ejecutarse UNA SOLA VEZ antes del deploy multi-tenant
 *
 * Ejecución:
 * npm run build
 * node dist/scripts/init-multitenant.js
 */

async function bootstrap() {
  console.log('🚀 Iniciando migración multi-tenant...\n');

  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const companyModel = app.get<Model<CompanyDocument>>('CompanyModel');
    const userModel = app.get<Model<UserDocument>>('UserModel');
    const clientModel = app.get<Model<ClientDocument>>('ClientModel');
    const transactionModel =
      app.get<Model<TransactionDocument>>('TransactionModel');
    const settingsModel = app.get<Model<SettingsDocument>>('SettingsModel');

    // ========================
    // PASO 1: Crear Empresa DEFAULT
    // ========================
    console.log('📦 Paso 1: Creando empresa DEFAULT...');

    let defaultCompany = await companyModel.findOne({
      companyCode: 'DEFAULT',
    });

    if (!defaultCompany) {
      defaultCompany = await companyModel.create({
        companyCode: 'DEFAULT',
        businessName: 'Empresa Principal',
        cuitCuil: '00000000000', // CUIT ficticio para migración
        address: 'Dirección Principal, Buenos Aires, Argentina',
        contactInfo: {
          name: 'Administrador',
          phone: '+54 9 11 1234-5678',
          email: 'admin@pointify.com',
        },
        isActive: true,
        subscriptionEndDate: null, // Suscripción ilimitada
        maxUsers: 0, // Sin límite
        maxClients: 0, // Sin límite
      });
      console.log(`✅ Empresa DEFAULT creada: ${defaultCompany._id}`);
    } else {
      console.log(`ℹ️  Empresa DEFAULT ya existe: ${defaultCompany._id}`);
    }

    // ========================
    // PASO 2: Crear SuperAdmin
    // ========================
    console.log('\n👤 Paso 2: Creando SuperAdmin...');

    let superAdmin = await userModel.findOne({
      username: 'superadmin',
      role: UserRole.SUPER_ADMIN,
    });

    if (!superAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      superAdmin = await userModel.create({
        username: 'superadmin',
        password: hashedPassword,
        name: 'Super Administrador',
        dni: '00000000', // DNI placeholder
        role: UserRole.SUPER_ADMIN,
        companyId: null, // SuperAdmin no pertenece a ninguna empresa
        isActive: true,
      });
      console.log('✅ SuperAdmin creado:');
      console.log('   Username: superadmin');
      console.log('   Password: admin123');
      console.log('   ⚠️  Cambiar contraseña después del primer login');
    } else {
      console.log('ℹ️  SuperAdmin ya existe');
    }

    // ========================
    // PASO 3: Migrar Usuarios Existentes
    // ========================
    console.log('\n👥 Paso 3: Migrando usuarios existentes...');

    const usersToMigrate = await userModel.find({
      companyId: { $exists: false },
    });

    if (usersToMigrate.length > 0) {
      // Agregar campo username a usuarios que no lo tengan
      for (const user of usersToMigrate) {
        const username = user.dni || `user_${user._id}`;
        await userModel.findByIdAndUpdate(user._id, {
          $set: {
            companyId: defaultCompany._id,
            username: username,
          },
        });
      }
      console.log(`✅ ${usersToMigrate.length} usuarios migrados`);
    } else {
      console.log('ℹ️  No hay usuarios para migrar');
    }

    // ========================
    // PASO 4: Migrar Clientes Existentes
    // ========================
    console.log('\n🧑‍🤝‍🧑 Paso 4: Migrando clientes existentes...');

    const clientsUpdated = await clientModel.updateMany(
      { companyId: { $exists: false } },
      { $set: { companyId: defaultCompany._id } },
    );
    console.log(`✅ ${clientsUpdated.modifiedCount} clientes migrados`);

    // ========================
    // PASO 5: Migrar Transacciones Existentes
    // ========================
    console.log('\n💳 Paso 5: Migrando transacciones existentes...');

    const transactionsUpdated = await transactionModel.updateMany(
      { companyId: { $exists: false } },
      { $set: { companyId: defaultCompany._id } },
    );
    console.log(
      `✅ ${transactionsUpdated.modifiedCount} transacciones migradas`,
    );

    // ========================
    // PASO 6: Migrar Settings Existentes
    // ========================
    console.log('\n⚙️  Paso 6: Migrando configuración existente...');

    const oldSettings = await settingsModel.findOne({ key: 'default' });

    if (oldSettings) {
      // Eliminar campo "key" y agregar companyId
      await settingsModel.findByIdAndUpdate(oldSettings._id, {
        $set: { companyId: defaultCompany._id },
        $unset: { key: '' },
      });
      console.log('✅ Settings migrado');
    } else {
      // Crear settings default si no existe
      const existingSettings = await settingsModel.findOne({
        companyId: defaultCompany._id,
      });

      if (!existingSettings) {
        await settingsModel.create({
          companyId: defaultCompany._id,
          pointsTarget: 10,
          rewardName: 'Café Gratis',
          minPurchaseAmount: 0,
          isActive: true,
          maxWinners: 0,
          currentWinners: 0,
          // campaignStartDate y campaignEndDate usan default: null del schema
        });
        console.log('✅ Settings creado para empresa DEFAULT');
      } else {
        console.log('ℹ️  Settings ya existe para empresa DEFAULT');
      }
    }

    // ========================
    // PASO 7: Crear Índices Compuestos
    // ========================
    console.log('\n🔧 Paso 7: Creando índices compuestos...');

    // Company indices
    try {
      await companyModel.collection.createIndex(
        { companyCode: 1 },
        { unique: true },
      );
      await companyModel.collection.createIndex({ isActive: 1 });
      console.log('✅ Índices de Company creados');
    } catch (error: any) {
      if (error.code === 85) {
        console.log('ℹ️  Índices de Company ya existen');
      } else {
        throw error;
      }
    }

    // User indices
    try {
      await userModel.collection.createIndex(
        { companyId: 1, username: 1 },
        { unique: true, sparse: true },
      );
      await userModel.collection.createIndex(
        { username: 1 },
        { unique: true, partialFilterExpression: { companyId: null } },
      );
      await userModel.collection.createIndex(
        { companyId: 1, dni: 1 },
        { unique: true, sparse: true },
      );
      await userModel.collection.createIndex({ companyId: 1, isActive: 1 });
      console.log('✅ Índices de User creados');
    } catch (error: any) {
      if (error.code === 85) {
        console.log('ℹ️  Índices de User ya existen');
      } else {
        throw error;
      }
    }

    // Client indices
    try {
      await clientModel.collection.createIndex(
        { companyId: 1, dni: 1 },
        { unique: true },
      );
      await clientModel.collection.createIndex({ companyId: 1, isActive: 1 });
      await clientModel.collection.createIndex({ companyId: 1, status: 1 });
      console.log('✅ Índices de Client creados');
    } catch (error: any) {
      if (error.code === 85) {
        console.log('ℹ️  Índices de Client ya existen');
      } else {
        throw error;
      }
    }

    // Transaction indices
    try {
      await transactionModel.collection.createIndex(
        { companyId: 1, saleCode: 1 },
        { unique: true },
      );
      await transactionModel.collection.createIndex({ companyId: 1, date: -1 });
      await transactionModel.collection.createIndex({
        clientId: 1,
        companyId: 1,
      });
      console.log('✅ Índices de Transaction creados');
    } catch (error: any) {
      if (error.code === 85) {
        console.log('ℹ️  Índices de Transaction ya existen');
      } else {
        throw error;
      }
    }

    // Settings indices
    try {
      await settingsModel.collection.createIndex(
        { companyId: 1 },
        { unique: true },
      );
      console.log('✅ Índices de Settings creados');
    } catch (error: any) {
      if (error.code === 85) {
        console.log('ℹ️  Índices de Settings ya existen');
      } else {
        throw error;
      }
    }

    // ========================
    // RESUMEN FINAL
    // ========================
    console.log('\n' + '='.repeat(60));
    console.log('🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE');
    console.log('='.repeat(60));
    console.log('\n📊 Resumen:');
    console.log(`   • Empresa DEFAULT:   ${defaultCompany._id}`);
    console.log(`   • Código de Empresa: ${defaultCompany.companyCode}`);
    console.log('\n👤 Credenciales SuperAdmin:');
    console.log('   • Endpoint: POST /auth/superadmin/login');
    console.log('   • Username: superadmin');
    console.log('   • Password: admin123');
    console.log('   ⚠️  Cambiar contraseña en producción!');
    console.log('\n🏢 Login de Usuarios de Empresa:');
    console.log('   • Endpoint: POST /auth/login');
    console.log('   • Company Code: DEFAULT');
    console.log('   • Username: (DNI del usuario)');
    console.log('   • Password: (contraseña existente)');
    console.log('\n✅ El sistema está listo para operar en modo multi-tenant');
    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error('\n❌ Error durante la migración:', error);
    throw error;
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  console.error('💥 Fallo crítico:', error);
  process.exit(1);
});
