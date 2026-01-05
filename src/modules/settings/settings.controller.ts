import { Controller, Get, Put, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto, SettingsResponseDto } from './dto/settings.dto';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../guards/roles.decorator';

@ApiTags('Configuración')
@Controller('settings')
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Obtener configuración actual',
    description: 'Retorna la configuración actual del sistema de recompensas (meta de puntos y nombre del premio). Endpoint público.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Configuración retornada exitosamente.',
    type: SettingsResponseDto,
  })
  async getSettings() {
    return this.settingsService.getSettings();
  }

  @Put()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Actualizar configuración',
    description: 'Permite modificar la configuración del sistema (meta de puntos, nombre del premio, monto mínimo). Solo para administradores.',
  })
  @ApiBody({ type: UpdateSettingsDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Configuración actualizada exitosamente.',
    type: SettingsResponseDto,
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Datos inválidos. Verifica los valores enviados.',
  })
  @ApiResponse({ 
    status: 403, 
    description: 'No tienes permisos. Solo administradores pueden actualizar la configuración.',
  })
  async updateSettings(@Body() dto: UpdateSettingsDto) {
    return this.settingsService.updateSettings(dto);
  }
}
