import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Settings, SettingsDocument } from '../../schemas/settings.schema';
import { CreateProductPointsDto } from './dto/create-product-points.dto';
import { CreateRewardDto } from './dto/create-reward.dto';
import { UpdateRewardDto } from './dto/update-reward.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(Settings.name) private settingsModel: Model<SettingsDocument>,
  ) {}

  /**
   * Obtener configuración de la empresa o crearla si no existe
   */
  async findOrCreate(companyId: string): Promise<SettingsDocument> {
    let settings = await this.settingsModel.findOne({ companyId });
    
    if (!settings) {
      settings = new this.settingsModel({
        companyId,
        pointsConfig: [],
        rewards: [],
        isActive: true,
      });
      await settings.save();
    }
    
    return settings;
  }

  /**
   * Obtener configuración de la empresa
   */
  async getSettings(companyId: string): Promise<SettingsDocument> {
    return this.findOrCreate(companyId);
  }

  /**
   * Actualizar configuración de campaña (isActive, fechas)
   */
  async updateCampaignSettings(
    companyId: string,
    dto: { isActive?: boolean; campaignStartDate?: string | null; campaignEndDate?: string | null },
  ): Promise<SettingsDocument> {
    const settings = await this.findOrCreate(companyId);

    if (dto.isActive !== undefined) settings.isActive = dto.isActive;
    if (dto.campaignStartDate !== undefined) {
      settings.campaignStartDate = dto.campaignStartDate ? new Date(dto.campaignStartDate) : null;
    }
    if (dto.campaignEndDate !== undefined) {
      settings.campaignEndDate = dto.campaignEndDate ? new Date(dto.campaignEndDate) : null;
    }

    return settings.save();
  }

  // ========== PRODUCTOS (CONFIGURACIÓN DE PUNTOS) ==========

  /**
   * Agregar producto con su configuración de puntos
   */
  async addProductPoints(companyId: string, dto: CreateProductPointsDto): Promise<SettingsDocument> {
    const settings = await this.findOrCreate(companyId);

    // Validar que no exista ya un producto con ese nombre
    const exists = settings.pointsConfig.find(
      (p) => p.productName.toLowerCase() === dto.productName.toLowerCase(),
    );
    if (exists) {
      throw new ConflictException(
        `El producto "${dto.productName}" ya está configurado`,
      );
    }

    settings.pointsConfig.push({
      productName: dto.productName,
      pointsValue: dto.pointsValue,
      isActive: true,
    });

    return settings.save();
  }

  /**
   * Actualizar puntos de un producto existente
   */
  async updateProductPoints(
    companyId: string,
    productName: string,
    pointsValue: number,
  ): Promise<SettingsDocument> {
    const settings = await this.findOrCreate(companyId);

    const product = settings.pointsConfig.find(
      (p) => p.productName === productName,
    );
    if (!product) {
      throw new NotFoundException(
        `Producto "${productName}" no encontrado`,
      );
    }

    product.pointsValue = pointsValue;
    return settings.save();
  }

  /**
   * Desactivar producto (soft delete)
   */
  async removeProductPoints(
    companyId: string,
    productName: string,
  ): Promise<SettingsDocument> {
    const settings = await this.findOrCreate(companyId);

    const productIndex = settings.pointsConfig.findIndex(
      (p) => p.productName === productName,
    );
    if (productIndex === -1) {
      throw new NotFoundException(
        `Producto "${productName}" no encontrado`,
      );
    }

    // Eliminar el producto del array
    settings.pointsConfig.splice(productIndex, 1);
    return settings.save();
  }

  /**
   * Listar productos activos
   */
  async getActiveProducts(companyId: string) {
    const settings = await this.findOrCreate(companyId);
    return settings.pointsConfig.filter((p) => p.isActive);
  }

  // ========== PREMIOS (CATÁLOGO) ==========

  /**
   * Agregar premio al catálogo
   */
  async addReward(companyId: string, dto: CreateRewardDto): Promise<SettingsDocument> {
    const settings = await this.findOrCreate(companyId);

    settings.rewards.push({
      name: dto.name,
      description: dto.description || '',
      pointsCost: dto.pointsCost,
      stock: dto.stock ?? null,
      isActive: true,
      imageUrl: dto.imageUrl || null,
    });

    return settings.save();
  }

  /**
   * Actualizar premio existente
   */
  async updateReward(
    companyId: string,
    rewardId: string,
    dto: UpdateRewardDto,
  ): Promise<SettingsDocument> {
    const settings = await this.findOrCreate(companyId);

    const reward = settings.rewards.find((r: any) => r._id.toString() === rewardId);
    if (!reward) {
      throw new NotFoundException('Premio no encontrado');
    }

    // Actualizar campos si están presentes en el DTO
    if (dto.name !== undefined) reward.name = dto.name;
    if (dto.description !== undefined) reward.description = dto.description;
    if (dto.pointsCost !== undefined) reward.pointsCost = dto.pointsCost;
    if (dto.stock !== undefined) reward.stock = dto.stock;
    if (dto.isActive !== undefined) reward.isActive = dto.isActive;
    if (dto.imageUrl !== undefined) reward.imageUrl = dto.imageUrl;

    return settings.save();
  }

  /**
   * Eliminar premio (soft delete)
   */
  async deleteReward(companyId: string, rewardId: string): Promise<SettingsDocument> {
    const settings = await this.findOrCreate(companyId);

    const reward = settings.rewards.find((r: any) => r._id.toString() === rewardId);
    if (!reward) {
      throw new NotFoundException('Premio no encontrado');
    }

    reward.isActive = false;
    return settings.save();
  }

  /**
   * Listar premios activos y con stock disponible
   */
  async getActiveRewards(companyId: string) {
    const settings = await this.findOrCreate(companyId);
    return settings.rewards.filter(
      (r) => r.isActive && (r.stock === null || r.stock > 0),
    );
  }

  /**
   * Listar todos los premios (incluyendo inactivos)
   */
  async getAllRewards(companyId: string) {
    const settings = await this.findOrCreate(companyId);
    return settings.rewards;
  }

  /**
   * Obtener premio por ID (para validación en transacciones)
   */
  async getRewardById(companyId: string, rewardId: string) {
    const settings = await this.findOrCreate(companyId);
    const reward = settings.rewards.find((r: any) => r._id.toString() === rewardId);
    
    if (!reward) {
      throw new NotFoundException('Premio no encontrado');
    }
    
    return reward;
  }
}
