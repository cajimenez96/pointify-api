import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    // Resolver httpAdapter aquí para evitar problemas de dependencias circulares
    const { httpAdapter } = this.httpAdapterHost;

    const ctx = host.switchToHttp();
    const request = ctx.getRequest();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody = {
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(request),
      method: httpAdapter.getRequestMethod(request),
      message:
        exception instanceof HttpException
          ? exception.message
          : 'Internal server error',
    };

    // Extraer detalles de validación si existen (class-validator devuelve arrays de errores)
    let details = null;
    if (exception instanceof HttpException) {
      const resp = exception.getResponse() as any;
      if (typeof resp === 'object' && resp.message) {
        // A veces el mensaje es un array de strings (errores de validación)
        details = resp.message;
      }
    }

    // ========== LOGGING DETALLADO PARA DEBUGGING ==========
    const method = httpAdapter.getRequestMethod(request);
    const url = httpAdapter.getRequestUrl(request);
    
    // Identificar usuario si existe en la request (inyectado por Passport)
    const user = request.user 
      ? `[User: ${request.user.dni || request.user.username || request.user.userId}]` 
      : '[Public/Unauth]';

    // Loguear el error con iconos y formato legible
    this.logger.error(
      `❌ Fallo en ${method} ${url} ${user}`
    );
    this.logger.error(`   👉 Status: ${httpStatus}`);
    this.logger.error(`   👉 Message: ${JSON.stringify(responseBody.message)}`);
    
    if (details) {
      this.logger.error(`   👉 Details: ${JSON.stringify(details)}`);
    }

    // Stack trace solo para errores 500 (bugs inesperados)
    if (httpStatus >= 500) {
      this.logger.error(exception);
    }
    // ======================================================

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
