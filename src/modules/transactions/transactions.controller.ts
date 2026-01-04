import { Controller, Post, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { TransactionsService } from './transactions.service';
import { AddPointsDto, AddPointsResponseDto } from './dto/transaction.dto';

@ApiTags('Transacciones')
@Controller('transactions')
export class TransactionsController {
  constructor(private transactionsService: TransactionsService) {}

  @Post('add')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Agregar puntos a un cliente',
    description: 'Endpoint protegido que permite a cajeros y administradores agregar puntos a un cliente tras una compra. Requiere autenticación JWT. Valida que el código de venta sea único y detecta automáticamente si el cliente alcanzó la meta de puntos.',
  })
  @ApiBody({ type: AddPointsDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Puntos agregados exitosamente. Retorna información actualizada del cliente y si alcanzó el premio.',
    type: AddPointsResponseDto,
  })
  @ApiResponse({ 
    status: 401, 
    description: 'No autorizado. Token JWT inválido o expirado.',
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Cliente no encontrado. El cliente debe registrarse primero.',
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Código de venta duplicado. Este código ya fue procesado anteriormente.',
  })
  async addPoints(@Body() dto: AddPointsDto, @Request() req) {
    return this.transactionsService.addPoints(
      dto.dni,
      dto.saleCode,
      req.user.userId,
    );
  }
}
