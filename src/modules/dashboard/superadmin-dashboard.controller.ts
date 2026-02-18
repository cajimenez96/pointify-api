import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SuperAdminGuard } from '../../guards/super-admin.guard';
import { SuperAdminDashboardService } from './superadmin-dashboard.service';

@ApiTags('SuperAdmin - Dashboard')
@Controller('superadmin/dashboard')
@UseGuards(AuthGuard('jwt'), SuperAdminGuard)
export class SuperAdminDashboardController {
  constructor(
    private readonly superAdminDashboardService: SuperAdminDashboardService,
  ) {}

  @Get('stats')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener estadísticas globales del sistema',
    description:
      'Retorna métricas agregadas de todas las empresas, usuarios, clientes y transacciones. Solo para SuperAdmins.',
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas globales retornadas exitosamente.',
  })
  @ApiResponse({
    status: 403,
    description: 'Se requieren permisos de SuperAdmin.',
  })
  async getStats() {
    return this.superAdminDashboardService.getStats();
  }
}
