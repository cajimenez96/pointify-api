import {
  IsString,
  IsOptional,
  MinLength,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { UserRole } from '../../../schemas/user.schema';

/**
 * DTO para actualizar un usuario
 * Puede ser usado por SuperAdmin o Admin de la misma empresa
 */
export class UpdateUserDto {
  @IsString()
  @IsOptional()
  @MinLength(3)
  username?: string;

  @IsString()
  @IsOptional()
  @MinLength(6)
  password?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  dni?: string;

  @IsEnum([UserRole.ADMIN, UserRole.CASHIER])
  @IsOptional()
  role?: UserRole.ADMIN | UserRole.CASHIER;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
