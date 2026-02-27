import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UserRole, User } from './schemas/user.schema';
import * as bcrypt from 'bcrypt';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';

async function bootstrap() {
  console.log('🌱 Iniciando Seed de Super Admin...');

  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    const userModel = app.get<Model<User>>(getModelToken(User.name));

    const superAdminData = {
      username: 'superadmin',
      password: 'admin123', // Contraseña por defecto
      role: UserRole.SUPER_ADMIN, // 'superadmin'
      name: 'Sistema Super Admin',
      dni: '00000000', // DNI ficticio para sistema
      companyId: null, // Importante: null define al Super Admin global
      isActive: true,
    };

    // Verificar si ya existe
    const existingAdmin = await userModel.findOne({
      username: superAdminData.username,
      companyId: null,
    });

    if (existingAdmin) {
      console.log('⚠️  El Super Admin ya existe. No se realizan cambios.');
      console.log('👤 Usuario:', superAdminData.username);
      console.log(
        'ℹ️  Si necesitas resetear la contraseña, hazlo manualmente desde la base de datos.',
      );
    } else {
      // Crear nuevo Super Admin
      const hashedPassword = await bcrypt.hash(superAdminData.password, 10);
      await userModel.create({
        ...superAdminData,
        password: hashedPassword,
      });

      console.log('✅ Super Admin creado exitosamente.');
      console.log('-----------------------------------');
      console.log('👤 Usuario:', superAdminData.username);
      console.log('🔑 Password:', superAdminData.password);
      console.log(
        '⚠️  IMPORTANTE: Cambia la contraseña después del primer login',
      );
      console.log('-----------------------------------');
    }

    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante el seeding:', error);
    process.exit(1);
  }
}

bootstrap();
