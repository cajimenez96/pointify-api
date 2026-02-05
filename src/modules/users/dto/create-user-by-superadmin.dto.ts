import {
  IsString,
  IsNotEmpty,
  MinLength,
  IsMongoId,
  IsEnum,
} from 'class-validator';
import { UserRole } from '../../../schemas/user.schema';

export class CreateUserBySuperAdminDto {
  @IsMongoId()
  @IsNotEmpty()
  companyId: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  dni: string;

  @IsEnum([UserRole.ADMIN, UserRole.CASHIER])
  @IsNotEmpty()
  role: UserRole.ADMIN | UserRole.CASHIER;
}
