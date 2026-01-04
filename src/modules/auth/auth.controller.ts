import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, LoginResponseDto } from './dto/auth.dto';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Iniciar sesión',
    description: 'Permite a administradores y cajeros iniciar sesión con DNI y contraseña. Retorna un token JWT válido por 7 días.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Inicio de sesión exitoso. Retorna token JWT y datos del usuario.',
    type: LoginResponseDto,
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Credenciales inválidas. El DNI o la contraseña son incorrectos.',
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Datos de entrada inválidos. Verifica el formato del DNI y contraseña.',
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.dni, loginDto.password);
  }
}
