import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { DashboardStatsDto } from './dto/dashboard.dto';

@ApiTags('Panel de Control')
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ 
    summary: 'Obtener estadísticas del sistema',
    description: 'Retorna métricas agregadas del sistema incluyendo total de clientes, transacciones, puntos emitidos y las transacciones recientes. Solo para administradores.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Estadísticas retornadas exitosamente.',
    type: DashboardStatsDto,
  })
  async getStats() {
    return this.dashboardService.getStats();
  }
}
