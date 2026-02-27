import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
    : ['http://localhost:3000', 'http://localhost:3001'];

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // Global Error Handling & Logging
  const httpAdapter = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));
  app.useGlobalInterceptors(new LoggingInterceptor());

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
