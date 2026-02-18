import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SuperAdminLoginDto } from './dto/superadmin-login.dto';
import { TenantLoginDto } from './dto/tenant-login.dto';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Login de SuperAdmin (sin código de empresa)
   * POST /auth/superadmin/login
   */
  @Post('superadmin/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login de SuperAdmin',
    description:
      'Permite a SuperAdmins iniciar sesión con username y contraseña. SuperAdmins tienen acceso global a todas las empresas.',
  })
  @ApiBody({ type: SuperAdminLoginDto })
  @ApiResponse({
    status: 200,
    description:
      'Login exitoso. Retorna token JWT con privilegios de SuperAdmin.',
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciales de SuperAdmin inválidas.',
  })
  async superAdminLogin(@Body() dto: SuperAdminLoginDto) {
    return this.authService.superAdminLogin(dto.username, dto.password);
  }

  /**
   * Login de Usuario de Empresa (Tenant)
   * POST /auth/login
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login de Usuario de Empresa',
    description:
      'Permite a usuarios de una empresa (admins y cajeros) iniciar sesión con código de empresa, username y contraseña.',
  })
  @ApiBody({ type: TenantLoginDto })
  @ApiResponse({
    status: 200,
    description:
      'Login exitoso. Retorna token JWT con scope limitado a la empresa.',
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciales inválidas o empresa no encontrada/desactivada.',
  })
  async tenantLogin(@Body() dto: TenantLoginDto) {
    return this.authService.tenantLogin(
      dto.companyCode,
      dto.username,
      dto.password,
    );
  }
}
