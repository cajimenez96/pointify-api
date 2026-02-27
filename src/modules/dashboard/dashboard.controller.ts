import { Controller, Get, UseGuards, Request as Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';
import { DashboardStatsDto } from './dto/dashboard.dto';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../guards/roles.decorator';
import { CompanyContextGuard } from '../../guards/company-context.guard';

@ApiTags('Panel de Control')
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  @UseGuards(AuthGuard('jwt'), CompanyContextGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener estadísticas del sistema',
    description:
      'Retorna métricas agregadas del sistema incluyendo total de clientes, transacciones, puntos emitidos y las transacciones recientes. Solo para administradores.',
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas retornadas exitosamente.',
    type: DashboardStatsDto,
  })
  @ApiResponse({
    status: 403,
    description:
      'No tienes permisos. Solo administradores pueden ver las estadísticas.',
  })
  async getStats(@Req() req) {
    return this.dashboardService.getStats(req.companyId);
  }
}
