import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole } from '../schemas/user.schema';

/**
 * Guard para proteger endpoints que solo pueden acceder SuperAdmins
 * Debe usarse junto con AuthGuard('jwt')
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Inyectado por AuthGuard('jwt')

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    if (user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Acceso denegado. Se requieren permisos de SuperAdmin',
      );
    }

    return true;
  }
}
