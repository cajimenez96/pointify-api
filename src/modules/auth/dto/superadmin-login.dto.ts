import { IsString, MinLength } from 'class-validator';

/**
 * DTO para login de SuperAdmin
 */
export class SuperAdminLoginDto {
  @IsString()
  @MinLength(3)
  username: string;

  @IsString()
  @MinLength(6)
  password: string;
}
