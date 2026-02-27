import { IsString, MinLength } from 'class-validator';

/**
 * DTO para login de usuarios de empresa (Tenant)
 */
export class TenantLoginDto {
  @IsString()
  @MinLength(3)
  companyCode: string;

  @IsString()
  @MinLength(3)
  username: string;

  @IsString()
  @MinLength(6)
  password: string;
}
