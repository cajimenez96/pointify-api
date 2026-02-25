import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Request,
  NotFoundException,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ClientsService } from './clients.service';
import { CreateClientDto, ClientResponseDto } from './dto/client.dto';
import { CompleteProfileDto } from './dto/complete-profile.dto';
// mejora post-mvp
// import { ClientLoginDto } from './dto/client-login.dto';
import { CompanyContextGuard } from '../../guards/company-context.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../guards/roles.decorator';

@ApiTags('Clientes')
@Controller('clients')
export class ClientsController {
  constructor(private clientsService: ClientsService) {}

  // ========== PROTEGIDOS (CON JWT) ==========
  // mejora post-mvp
  // @Get('me')
  // @UseGuards(AuthGuard('jwt'))
  // @ApiBearerAuth()
  // @ApiOperation({
  //   summary: 'Perfil del cliente logueado',
  //   description: 'Retorna el perfil y los puntos del cliente en cada empresa.',
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Perfil con lista de empresas y puntos.',
  // })
  // async getMyProfile(@Request() req) {
  //   return this.clientsService.getMyProfile(req.user.sub);
  // }

  @Post('complete-profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Completar perfil de Shadow User (Público)',
    description:
      'Endpoint público que permite a un cliente con status PENDING completar su registro proporcionando su información personal y el código de empresa.',
  })
  @ApiBody({ type: CompleteProfileDto })
  @ApiResponse({
    status: 200,
    description: 'Perfil completado exitosamente. Status cambiado a ACTIVE.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Empresa o cliente no encontrado, o el cliente ya tiene perfil completo.',
  })
  async completeProfile(@Body() dto: CompleteProfileDto) {
    const client = await this.clientsService.completeProfileByCompanyCode(dto);
    console.log({ 'controlador:': client });
    if (!client) {
      throw new NotFoundException(
        'Cliente no encontrado o ya tiene perfil completo',
      );
    }

    return {
      message: 'Perfil completado exitosamente',
      client,
    };
  }

  // mejora post-mvp
  // @Post('login')
  // @HttpCode(HttpStatus.OK)
  // @ApiOperation({
  //   summary: 'Login de cliente',
  //   description:
  //     'Cliente con status ACTIVE puede loguearse con DNI y contraseña.',
  // })
  // @ApiBody({ type: ClientLoginDto })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Login exitoso. Retorna JWT del cliente.',
  // })
  // @ApiResponse({
  //   status: 401,
  //   description: 'Credenciales inválidas o cuenta PENDING.',
  // })
  // async loginClient(@Body() dto: ClientLoginDto) {
  //   return this.clientsService.loginClient(dto.dni, dto.password);
  // }

  @Get()
  @UseGuards(AuthGuard('jwt'), CompanyContextGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listar todos los clientes de la empresa',
    description:
      'Retorna la lista completa de clientes asociados a la empresa con sus puntos. Solo para administradores.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de clientes con sus puntos retornada exitosamente.',
  })
  @ApiResponse({
    status: 403,
    description:
      'No tienes permisos. Solo administradores pueden listar clientes.',
  })
  async listClients(@Request() req, @Query('clientId') clientId?: string) {
    const query: any = {};

    if (clientId) {
      query.clientId = clientId;
    }

    return this.clientsService.listClientsByCompany(req.companyId, query);
  }
  // ========== PÚBLICO (SIN JWT) ==========
  @Get(':dni')
  @ApiOperation({
    summary: 'Consultar cliente por DNI (Público - QR Code)',
    description:
      'Endpoint público para QR codes. Permite consultar puntos del cliente y catálogo de premios disponibles usando DNI + companyCode.',
  })
  @ApiParam({
    name: 'dni',
    description: 'DNI del cliente a buscar',
    example: '11223344',
  })
  @ApiResponse({
    status: 200,
    description:
      'Cliente encontrado o estructura base si no existe. Incluye premios con flag canAfford.',
  })
  @ApiResponse({
    status: 404,
    description: 'Empresa no encontrada con el companyCode proporcionado.',
  })
  async getClientByDni(
    @Param('dni') dni: string,
    @Query('companyCode') companyCode: string,
  ) {
    if (!companyCode) {
      throw new NotFoundException(
        'Parámetro companyCode es requerido en query string',
      );
    }

    return this.clientsService.getClientWithRewards(dni, companyCode);
  }
}
