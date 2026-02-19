import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Company, CompanyDocument } from '../schemas/company.schema';
import { UserRole } from '../schemas/user.schema';
import { PaymentRequiredException } from './payment-required.exception';

/**
 * Guard de Contexto de Empresa (Multi-Tenancy)
 *
 * Responsabilidades:
 * 1. Inyecta el companyId del token JWT en el request
 * 2. Valida que la empresa esté activa
 * 3. Valida que la suscripción no haya expirado (HTTP 402 si expiró)
 * 4. Permite bypass para SuperAdmins
 */
@Injectable()
export class CompanyContextGuard implements CanActivate {
  constructor(
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Del JWT (inyectado por AuthGuard)

    // Validar que el usuario esté autenticado
    if (!user) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    // BYPASS para SuperAdmins
    if (user.role === UserRole.SUPER_ADMIN) {
      // SuperAdmins tienen acceso completo sin restricciones
      request.isSuperAdmin = true;
      request.companyId = null;
      return true;
    }

    // Usuarios tenant deben tener companyId
    if (!user.companyId) {
      throw new ForbiddenException('No se encontró contexto de empresa');
    }

    // Validar que companyId sea un ObjectId válido
    if (!Types.ObjectId.isValid(user.companyId)) {
      throw new ForbiddenException(
        'ID de empresa inválido en el token de autenticación',
      );
    }
    // Convertir a ObjectId
    const companyObjectId = new Types.ObjectId(user.companyId);

    // Buscar la empresa en la base de datos
    const company = await this.companyModel.findById(companyObjectId);

    if (!company) {
      throw new ForbiddenException('Empresa no encontrada');
    }

    // Validar que la empresa esté activa
    if (!company.isActive) {
      throw new ForbiddenException(
        'Empresa desactivada. Contacte al administrador.',
      );
    }

    // VALIDACIÓN DE SUSCRIPCIÓN
    // Si subscriptionEndDate es null → Suscripción ilimitada (OK)
    // Si subscriptionEndDate existe → Validar si está expirada
    if (company.subscriptionEndDate !== null) {
      const now = new Date();
      const subscriptionEnd = new Date(company.subscriptionEndDate);

      if (now > subscriptionEnd) {
        // Suscripción expirada → HTTP 402 Payment Required
        throw new PaymentRequiredException(
          'La suscripción de su empresa ha expirado. Por favor, renueve su plan para continuar.',
        );
      }
    }

    // Inyectar companyId como ObjectId en el request para usar en servicios
    request.companyId = companyObjectId; // Ya es ObjectId validado
    request.companyCode = user.companyCode; // Del JWT
    request.company = company; // Opcionalmente inyectar el objeto completo// Opcionalmente inyectar el objeto completo

    return true;
  }
}
