import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TransactionsService } from './transactions.service';
import { EarnPointsDto } from './dto/earn-points.dto';
import { RedeemPointsDto } from './dto/redeem-points.dto';
import { CompanyContextGuard } from '../../guards/company-context.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../guards/roles.decorator';

@Controller('transactions')
@UseGuards(AuthGuard('jwt'), CompanyContextGuard, RolesGuard)
export class TransactionsController {
  constructor(private transactionsService: TransactionsService) {}

  // ========== EARN (SUMAR PUNTOS) ==========

  @Post('earn')
  @Roles('admin', 'cashier')
  async earnPoints(@Request() req, @Body() dto: EarnPointsDto) {
    return this.transactionsService.earnPoints(
      req.companyId,
      dto,
      req.user.userId,
    );
  }

  // ========== REDEEM (CANJEAR PUNTOS) ==========

  @Post('redeem')
  @Roles('admin', 'cashier')
  async redeemPoints(@Request() req, @Body() dto: RedeemPointsDto) {
    return this.transactionsService.redeemPoints(
      req.companyId,
      dto,
      req.user.userId,
    );
  }

  // ========== HISTORIAL ==========

  @Get()
  @Roles('admin')
  async findAll(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('type') type?: 'EARN' | 'REDEEM',
  ) {
    return this.transactionsService.findAll(req.companyId, page, limit, type);
  }

  @Get('client/:dni')
  @Roles('admin', 'cashier')
  async findByClient(@Request() req, @Query('dni') dni: string) {
    return this.transactionsService.findByClient(req.companyId, dni);
  }
}
