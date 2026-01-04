import { Controller, Get, Post, Body, Param, NotFoundException, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { CreateClientDto, ClientResponseDto } from './dto/client.dto';

@ApiTags('Clientes')
@Controller('clients')
export class ClientsController {
  constructor(private clientsService: ClientsService) {}

  @Get(':dni')
  @ApiOperation({ 
    summary: 'Consultar cliente por DNI',
    description: 'Endpoint público que permite consultar los puntos de un cliente usando su DNI. Se usa en el portal del cliente.',
  })
  @ApiParam({ 
    name: 'dni', 
    description: 'DNI del cliente a buscar',
    example: '11223344',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Cliente encontrado. Retorna información completa del cliente.',
    type: ClientResponseDto,
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Cliente no encontrado en la base de datos.',
  })
  async getClientByDni(@Param('dni') dni: string) {
    const client = await this.clientsService.findByDni(dni);
    if (!client) {
      throw new NotFoundException('Cliente no encontrado. Por favor, regístrate primero.');
    }
    return client;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Registrar nuevo cliente',
    description: 'Endpoint público que permite a nuevos clientes registrarse en el sistema de lealtad proporcionando su información básica.',
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
  @ApiOperation({ 
    summary: 'Listar todos los clientes',
    description: 'Retorna la lista completa de clientes registrados. Solo para administradores.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de clientes retornada exitosamente.',
    type: [ClientResponseDto],
  })
  async listClients() {
    return this.clientsService.findAll();
  }
}
