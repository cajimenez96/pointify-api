import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe());

  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('Pointify API')
    .setDescription('Sistema de Puntos de Lealtad para Comercios Minoristas')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Autenticación', 'Endpoints para inicio de sesión de usuarios')
    .addTag('Clientes', 'Gestión de clientes del programa de lealtad')
    .addTag('Transacciones', 'Agregar y consultar transacciones de puntos')
    .addTag('Configuración', 'Configuración del sistema de recompensas')
    .addTag('Panel de Control', 'Estadísticas y métricas del sistema')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
  console.log(
    `🚀 Pointify API ejecutándose en http://localhost:${process.env.PORT}`,
  );
  console.log(
    `📚 Documentación Swagger disponible en http://localhost:${process.env.PORT}/api`,
  );
}
bootstrap();
