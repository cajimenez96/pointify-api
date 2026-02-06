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
import { CompanyContextGuard } from '../../guards/company-context.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../guards/roles.decorator';

@ApiTags('Clientes')
@Controller('clients')
export class ClientsController {
  constructor(private clientsService: ClientsService) {}

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

  // ========== PROTEGIDOS (CON JWT) ==========

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registrar nuevo cliente',
    description:
      'Endpoint público que permite a nuevos clientes registrarse en el sistema de lealtad proporcionando su información básica.',
  })
  @ApiBody({ type: CreateClientDto })
  @ApiResponse({
    status: 201,
    description: 'Cliente registrado exitosamente. Comienza con 0 puntos.',
    type: ClientResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos. Verifica que el DNI no esté ya registrado.',
  })
  async createClient(@Body() dto: CreateClientDto) {
    return this.clientsService.createClient(dto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), CompanyContextGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listar todos los clientes',
    description:
      'Retorna la lista completa de clientes de la empresa. Solo para administradores.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de clientes retornada exitosamente.',
    type: [ClientResponseDto],
  })
  @ApiResponse({
    status: 403,
    description:
      'No tienes permisos. Solo administradores pueden listar todos los clientes.',
  })
  async listClients(@Request() req) {
    return this.clientsService.findAll(req.companyId);
  }

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
    description: 'Empresa o cliente no encontrado, o el cliente ya tiene perfil completo.',
  })
  async completeProfile(@Body() dto: CompleteProfileDto) {
    const client = await this.clientsService.completeProfileByCompanyCode(dto);

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
}
