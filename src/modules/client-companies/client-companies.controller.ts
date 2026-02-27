import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ClientCompaniesService } from './client-companies.service';
import { CreateClientCompanyDto } from './dto/create-client-company.dto';
import { UpdateClientCompanyDto } from './dto/update-client-company.dto';
import { QueryClientCompanyDto } from './dto/query-client-company.dto';
import { CompanyContextGuard } from '../../guards/company-context.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../guards/roles.decorator';

@ApiTags('Relaciones Cliente-Empresa')
@ApiBearerAuth()
@Controller('client-companies')
@UseGuards(AuthGuard('jwt'), CompanyContextGuard, RolesGuard)
export class ClientCompaniesController {
  constructor(
    private readonly clientCompaniesService: ClientCompaniesService,
  ) { }

  @Post()
  @Roles('admin', 'cashier')
  @ApiOperation({
    summary: 'Crear relación cliente-empresa',
    description:
      'Crea una nueva relación entre un cliente y la empresa actual. ' +
      'Inicializa la relación con 0 puntos y estado PENDING.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Relación creada exitosamente',
    schema: {
      example: {
        _id: '507f1f77bcf86cd799439011',
        clientId: '507f1f77bcf86cd799439022',
        companyId: '507f1f77bcf86cd799439033',
        currentPoints: 0,
        totalAccumulated: 0,
        status: 'PENDING',
        isActive: true,
        createdAt: '2026-02-22T10:00:00.000Z',
        updatedAt: '2026-02-22T10:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'La relación ya existe',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'ID de cliente inválido',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'No tienes permisos para esta acción',
  })
  create(@Req() req, @Body() dto: CreateClientCompanyDto) {
    return this.clientCompaniesService.create(req.companyId, dto);
  }

  @Get()
  @Roles('admin', 'cashier')
  @ApiOperation({
    summary: 'Listar relaciones cliente-empresa',
    description:
      'Obtiene todas las relaciones de la empresa actual. ' +
      'Permite filtrar por status, isActive o clientId específico.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'ACTIVE'],
    description: 'Filtrar por estado de la relación',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filtrar por relaciones activas o inactivas',
  })
  @ApiQuery({
    name: 'clientId',
    required: false,
    type: String,
    description: 'Filtrar por ID de cliente específico',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de relaciones obtenida exitosamente',
    schema: {
      example: [
        {
          _id: '507f1f77bcf86cd799439011',
          clientId: {
            _id: '507f1f77bcf86cd799439022',
            dni: '12345678',
            name: 'Juan Pérez',
            email: 'juan@example.com',
            phone: '1234567890',
          },
          companyId: '507f1f77bcf86cd799439033',
          currentPoints: 150,
          totalAccumulated: 500,
          status: 'ACTIVE',
          isActive: true,
          createdAt: '2026-01-15T10:00:00.000Z',
          updatedAt: '2026-02-22T10:00:00.000Z',
        },
      ],
    },
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'No tienes permisos para esta acción',
  })
  findAll(@Req() req, @Query() query: QueryClientCompanyDto) {
    return this.clientCompaniesService.findAll(req.companyId, query);
  }

  @Get('client/:clientId')
  @Roles('admin', 'cashier')
  @ApiOperation({
    summary: 'Buscar relación por cliente',
    description:
      'Obtiene la relación específica entre un cliente y la empresa actual.',
  })
  @ApiParam({
    name: 'clientId',
    description: 'ID del cliente (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439022',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Relación encontrada',
    schema: {
      example: {
        _id: '507f1f77bcf86cd799439011',
        clientId: {
          _id: '507f1f77bcf86cd799439022',
          dni: '12345678',
          name: 'Juan Pérez',
          email: 'juan@example.com',
          phone: '1234567890',
        },
        companyId: '507f1f77bcf86cd799439033',
        currentPoints: 150,
        totalAccumulated: 500,
        status: 'ACTIVE',
        isActive: true,
        createdAt: '2026-01-15T10:00:00.000Z',
        updatedAt: '2026-02-22T10:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No existe relación entre este cliente y la empresa',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'ID de cliente inválido',
  })
  findByClient(@Req() req, @Param('clientId') clientId: string) {
    return this.clientCompaniesService.findByClient(req.companyId, clientId);
  }

  @Get(':id')
  @Roles('admin', 'cashier')
  @ApiOperation({
    summary: 'Obtener relación por ID',
    description: 'Obtiene una relación específica por su ID único.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la relación (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Relación encontrada',
    schema: {
      example: {
        _id: '507f1f77bcf86cd799439011',
        clientId: {
          _id: '507f1f77bcf86cd799439022',
          dni: '12345678',
          name: 'Juan Pérez',
          email: 'juan@example.com',
          phone: '1234567890',
        },
        companyId: '507f1f77bcf86cd799439033',
        currentPoints: 150,
        totalAccumulated: 500,
        status: 'ACTIVE',
        isActive: true,
        createdAt: '2026-01-15T10:00:00.000Z',
        updatedAt: '2026-02-22T10:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Relación no encontrada',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'ID de relación inválido',
  })
  findOne(@Req() req, @Param('id') id: string) {
    return this.clientCompaniesService.findOne(req.companyId, id);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({
    summary: 'Actualizar relación',
    description:
      'Actualiza el estado (status) o el flag de activación (isActive) de una relación.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la relación (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Relación actualizada exitosamente',
    schema: {
      example: {
        _id: '507f1f77bcf86cd799439011',
        clientId: '507f1f77bcf86cd799439022',
        companyId: '507f1f77bcf86cd799439033',
        currentPoints: 150,
        totalAccumulated: 500,
        status: 'ACTIVE',
        isActive: true,
        createdAt: '2026-01-15T10:00:00.000Z',
        updatedAt: '2026-02-22T10:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Relación no encontrada',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos inválidos',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Solo administradores pueden actualizar relaciones',
  })
  update(@Req() req, @Param('id') id: string,) {
    return this.clientCompaniesService.update(req.companyId, id);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({
    summary: 'Desactivar relación',
    description:
      'Realiza un soft delete de la relación, marcándola como inactiva (isActive = false).',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la relación (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Relación desactivada exitosamente',
    schema: {
      example: {
        _id: '507f1f77bcf86cd799439011',
        clientId: '507f1f77bcf86cd799439022',
        companyId: '507f1f77bcf86cd799439033',
        currentPoints: 150,
        totalAccumulated: 500,
        status: 'ACTIVE',
        isActive: false,
        createdAt: '2026-01-15T10:00:00.000Z',
        updatedAt: '2026-02-22T10:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Relación no encontrada',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Solo administradores pueden eliminar relaciones',
  })
  remove(@Req() req, @Param('id') id: string) {
    return this.clientCompaniesService.remove(req.companyId, id);
  }
}