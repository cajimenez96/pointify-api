import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;
    const url = req.url;
    const body = { ...req.body };

    // Ocultar información sensible en los logs
    if (body.password) body.password = '******';
    if (body.token) body.token = '******';

    const now = Date.now();

    // Log Request
    this.logger.log(`📥 Recibiendo Request: ${method} ${url}`);
    if (Object.keys(body).length > 0) {
      this.logger.debug(`   📦 Body: ${JSON.stringify(body)}`);
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - now;
          this.logger.log(
            `✅ Respuesta Exitosa: ${method} ${url} (${duration}ms)`,
          );
          // Opcional: Loguear respuesta si no es muy grande (útil para debug)
          // this.logger.debug(`   📤 Response: ${JSON.stringify(data)}`);
        },
        error: () => {
          // Los errores se manejan en el Exception Filter, pero aquí podemos loguear el tiempo
          const duration = Date.now() - now;
          // No logueamos el error aquí para no duplicar logs con el filtro
          this.logger.warn(`⚠️ Request fallida o interrumpida: ${method} ${url} (${duration}ms)`);
        },
      }),
    );
  }
}
