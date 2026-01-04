import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AuthService } from './modules/auth/auth.service';
import { UserRole } from './schemas/user.schema';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const authService = app.get(AuthService);

  try {
    // Create admin user
    await authService.createUser(
      '12345678',
      'admin123',
      'Admin User',
      UserRole.ADMIN,
    );
    console.log('✅ Admin user created successfully!');
    console.log('   DNI: 12345678');
    console.log('   Password: admin123');

    // Create cashier user
    await authService.createUser(
      '87654321',
      'cashier123',
      'Cashier User',
      UserRole.CASHIER,
    );
    console.log('✅ Cashier user created successfully!');
    console.log('   DNI: 87654321');
    console.log('   Password: cashier123');
  } catch (error: any) {
    console.error('❌ Error seeding users:', error.message);
  }

  await app.close();
}

seed();
