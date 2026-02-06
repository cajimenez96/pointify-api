import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
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
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listar todos los clientes',
    description:
      'Retorna la lista completa de clientes registrados. Solo para administradores.',
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
  async listClients() {
    return this.clientsService.findAll();
  }

  @Post('complete-profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Completar perfil de Shadow User',
    description:
      'Permite que un cliente con status PENDING complete su registro proporcionando su información personal.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        dni: { type: 'string', example: '11223344' },
        name: { type: 'string', example: 'Juan Pérez' },
        email: { type: 'string', example: 'juan@example.com' },
        phone: { type: 'string', example: '1234567890' },
      },
      required: ['dni', 'name', 'email', 'phone'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil completado exitosamente. Status cambiado a ACTIVE.',
  })
  @ApiResponse({
    status: 404,
    description: 'Cliente no encontrado o ya tiene perfil completo.',
  })
  async completeProfile(
    @Body() body: { dni: string; name: string; email: string; phone: string },
  ) {
    const client = await this.clientsService.updateProfile(body.dni, {
      name: body.name,
      email: body.email,
      phone: body.phone,
    });

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
