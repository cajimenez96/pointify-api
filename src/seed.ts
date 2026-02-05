import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AuthService } from './modules/auth/auth.service';
import { UserRole } from './schemas/user.schema';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const authService = app.get(AuthService);

  try {
    // NOTA: Este seed está deprecated. Usar init-multitenant.ts para inicialización multi-tenant

    // Create admin user (estos usuarios NO tienen empresa asignada sin migración)
    await authService.createUser(
      'admin.user', // username
      'admin123', // password
      'Admin User', // name
      '12345678', // dni
      UserRole.ADMIN, // role
      null, // companyId - null porque este seed es legacy
    );
    console.log('✅ Admin user created successfully!');
    console.log('   Username: admin.user');
    console.log('   DNI: 12345678');
    console.log('   Password: admin123');

    // Create cashier user
    await authService.createUser(
      'cashier.user', // username
      'cashier123', // password
      'Cashier User', // name
      '87654321', // dni
      UserRole.CASHIER, // role
      null, // companyId - null porque este seed es legacy
    );
    console.log('✅ Cashier user created successfully!');
    console.log('   Username: cashier.user');
    console.log('   DNI: 87654321');
    console.log('   Password: cashier123');
  } catch (error: any) {
    console.error('❌ Error seeding users:', error.message);
  }

  await app.close();
}

seed();
