import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SettingsService } from './settings.service';
import { CreateProductPointsDto } from './dto/create-product-points.dto';
import { CreateRewardDto } from './dto/create-reward.dto';
import { UpdateRewardDto } from './dto/update-reward.dto';
import { CompanyContextGuard } from '../../guards/company-context.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../guards/roles.decorator';

@Controller('settings')
@UseGuards(AuthGuard('jwt'), CompanyContextGuard, RolesGuard)
@Roles('admin') // Solo administradores pueden gestionar settings
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  // ========== CONFIGURACIÓN GENERAL ==========

  @Get()
  async getSettings(@Request() req) {
    return this.settingsService.getSettings(req.companyId);
  }

  // ========== PRODUCTOS (CONFIGURACIÓN DE PUNTOS) ==========

  @Post('products')
  async addProductPoints(@Request() req, @Body() dto: CreateProductPointsDto) {
    return this.settingsService.addProductPoints(req.companyId, dto);
  }

  @Patch('products/:productName/points')
  async updateProductPoints(
    @Request() req,
    @Param('productName') productName: string,
    @Body('pointsValue') pointsValue: number,
  ) {
    return this.settingsService.updateProductPoints(
      req.companyId,
      productName,
      pointsValue,
    );
  }

  @Delete('products/:productName')
  async removeProductPoints(
    @Request() req,
    @Param('productName') productName: string,
  ) {
    return this.settingsService.removeProductPoints(req.companyId, productName);
  }

  @Get('products/active')
  async getActiveProducts(@Request() req) {
    return this.settingsService.getActiveProducts(req.companyId);
  }

  // ========== PREMIOS (CATÁLOGO) ==========

  @Post('rewards')
  async addReward(@Request() req, @Body() dto: CreateRewardDto) {
    return this.settingsService.addReward(req.companyId, dto);
  }

  @Patch('rewards/:rewardId')
  async updateReward(
    @Request() req,
    @Param('rewardId') rewardId: string,
    @Body() dto: UpdateRewardDto,
  ) {
    return this.settingsService.updateReward(req.companyId, rewardId, dto);
  }

  @Delete('rewards/:rewardId')
  async deleteReward(@Request() req, @Param('rewardId') rewardId: string) {
    return this.settingsService.deleteReward(req.companyId, rewardId);
  }

  @Get('rewards')
  async getAllRewards(@Request() req) {
    return this.settingsService.getAllRewards(req.companyId);
  }

  @Get('rewards/active')
  async getActiveRewards(@Request() req) {
    return this.settingsService.getActiveRewards(req.companyId);
  }
}
