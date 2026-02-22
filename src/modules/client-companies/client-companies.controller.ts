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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClientCompaniesService } from './client-companies.service';
import { CreateClientCompanyDto } from './dto/create-client-company.dto';
import { UpdateClientCompanyDto } from './dto/update-client-company.dto';
import { QueryClientCompanyDto } from './dto/query-client-company.dto';
import { CompanyContextGuard } from '../../guards/company-context.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../guards/roles.decorator';

@Controller('client-companies')
@UseGuards(AuthGuard('jwt'), CompanyContextGuard, RolesGuard)
export class ClientCompaniesController {
  constructor(
    private readonly clientCompaniesService: ClientCompaniesService,
  ) {}

  /**
   * POST /client-companies
   * Crear una nueva relación cliente-empresa
   */
  @Post()
  @Roles('admin', 'cashier')
  create(@Req() req, @Body() dto: CreateClientCompanyDto) {
    return this.clientCompaniesService.create(req.companyId, dto);
  }

  /**
   * GET /client-companies
   * Listar todas las relaciones de la empresa
   */
  @Get()
  @Roles('admin', 'cashier')
  findAll(@Req() req, @Query() query: QueryClientCompanyDto) {
    return this.clientCompaniesService.findAll(req.companyId, query);
  }

  /**
   * GET /client-companies/client/:clientId
   * Buscar relación por clientId
   */
  @Get('client/:clientId')
  @Roles('admin', 'cashier')
  findByClient(@Req() req, @Param('clientId') clientId: string) {
    return this.clientCompaniesService.findByClient(req.companyId, clientId);
  }

  /**
   * GET /client-companies/:id
   * Obtener una relación específica por ID
   */
  @Get(':id')
  @Roles('admin', 'cashier')
  findOne(@Req() req, @Param('id') id: string) {
    return this.clientCompaniesService.findOne(req.companyId, id);
  }

  /**
   * PATCH /client-companies/:id
   * Actualizar una relación (status o isActive)
   */
  @Patch(':id')
  @Roles('admin')
  update(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateClientCompanyDto,
  ) {
    return this.clientCompaniesService.update(req.companyId, id, dto);
  }

  /**
   * DELETE /client-companies/:id
   * Desactivar una relación (soft delete)
   */
  @Delete(':id')
  @Roles('admin')
  remove(@Req() req, @Param('id') id: string) {
    return this.clientCompaniesService.remove(req.companyId, id);
  }
}
