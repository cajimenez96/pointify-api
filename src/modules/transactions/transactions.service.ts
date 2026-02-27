import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Transaction,
  TransactionDocument,
} from '../../schemas/transaction.schema';
import { Settings, SettingsDocument } from '../../schemas/settings.schema';
import { Client, ClientDocument } from '../../schemas/client.schema';
import { EarnPointsDto } from './dto/earn-points.dto';
import { RedeemPointsDto } from './dto/redeem-points.dto';

import { ClientCompaniesService } from '../client-companies/client-companies.service';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    @InjectModel(Settings.name) private settingsModel: Model<SettingsDocument>,
    @InjectModel(Client.name) private clientModel: Model<ClientDocument>,
    private clientCompaniesService: ClientCompaniesService, // 👈 AGREGAR
  ) {}

  // ========== EARN (SUMAR PUNTOS) ==========

  /**
   * Sumar puntos por compra de producto
   */
  async earnPoints(
    companyId: Types.ObjectId,
    dto: EarnPointsDto,
    userId: string,
  ) {
    // 1. Obtener configuración de la empresa
    const settings = await this.settingsModel.findOne({
      $or: [{ companyId: companyId }, { companyId: companyId.toString() }],
    });
    if (!settings) {
      throw new NotFoundException('Configuración no encontrada');
    }

    // 1.1 Validar campaña activa
    if (!settings.isActive) {
      throw new BadRequestException('Campaña inactiva');
    }

    // 1.2 Validar fechas de campaña
    const now = new Date();
    if (settings.campaignStartDate && now < settings.campaignStartDate) {
      throw new BadRequestException('La campaña aún no ha comenzado');
    }
    if (settings.campaignEndDate && now > settings.campaignEndDate) {
      throw new BadRequestException('La campaña ha finalizado');
    }

    // 2. Buscar configuración del producto
    const productConfig = settings.pointsConfig.find(
      (p) => p.productName === dto.productName && p.isActive,
    );
    if (!productConfig) {
      throw new BadRequestException(
        `Producto "${dto.productName}" no configurado o inactivo`,
      );
    }

    const pointsToAdd = productConfig.pointsValue;
    // 3. Buscar o crear cliente (sin companyId)
    let client = await this.clientModel.findOne({ dni: dto.dni });
    if (!client) {
      client = await this.clientModel.create({
        dni: dto.dni,
        name: `Cliente ${dto.dni}`,
        phone: '',
        email: '',
        status: 'PENDING',
      });
    }

    // 5. Crear transacción EARN
    const transaction = await this.transactionModel.create({
      companyId,
      type: 'EARN',
      dni: dto.dni,
      clientId: client._id,
      points: pointsToAdd,
      saleCode: dto.saleCode,
      productName: dto.productName,
      userId,
    });

    if (!transaction) {
      throw new ConflictException('Error al crear la transacción');
    }
    // 4. SUMAR puntos en ClientCompany (no en Client)
    const relation = await this.clientCompaniesService.addPoints(
      client._id,
      companyId,
      pointsToAdd,
    );

    return {
      success: true,
      transaction,
      client: {
        dni: client.dni,
        name: client.name,
        status: client.status,
        currentPoints: relation.currentPoints,
        totalAccumulated: relation.totalAccumulated,
      },
      pointsAdded: pointsToAdd,
      message: `+${pointsToAdd} puntos por ${dto.productName}`,
    };
  }

  // ========== REDEEM (CANJEAR PUNTOS) ==========

  /**
   * Canjear puntos por premio
   */
  async redeemPoints(
    companyId: Types.ObjectId,
    dto: RedeemPointsDto,
    userId: string,
  ) {
    // 1. Buscar cliente
    const client = await this.clientModel.findOne({ dni: dto.dni });
    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }

    // 2. Obtener configuración y premio
    const settings = await this.settingsModel.findOne({
      $or: [{ companyId: companyId }, { companyId: companyId.toString() }],
    });
    if (!settings) {
      throw new NotFoundException('Configuración no encontrada');
    }

    const reward = settings.rewards.find(
      (r: any) => r._id.toString() === dto.rewardId,
    );
    if (!reward || !reward.isActive) {
      throw new NotFoundException('Premio no encontrado o inactivo');
    }

    // 3. Validar stock
    if (reward.stock !== null && reward.stock <= 0) {
      throw new BadRequestException(
        `Premio "${reward.name}" sin stock disponible`,
      );
    }

    // 4. Validar saldo del cliente en ClientCompany
    const relation = await this.clientCompaniesService.findOrCreate(
      client._id,
      companyId,
    );

    if (relation.currentPoints < reward.pointsCost) {
      throw new BadRequestException(
        `Saldo insuficiente. Necesita ${reward.pointsCost} puntos, tiene ${relation.currentPoints}`,
      );
    }

    // 5. Restar puntos

    await this.clientCompaniesService.deductPoints(
      client._id,
      companyId,
      reward.pointsCost,
    );

    // 5.1 Restar stock del premio
    if (reward.stock !== null) {
      const settingsToUpdate = await this.settingsModel.findOne({
        $or: [{ companyId: companyId }, { companyId: companyId.toString() }],
      });

      if (settingsToUpdate) {
        const rewardToUpdate = settingsToUpdate.rewards.find(
          (r: any) => r._id.toString() === dto.rewardId,
        );
        if (rewardToUpdate && rewardToUpdate.stock !== null) {
          rewardToUpdate.stock -= 1;
          await settingsToUpdate.save();
        }
      }
    }

    // 5.2 Crear transacción REDEEM
    const transaction = await this.transactionModel.create({
      companyId,
      type: 'REDEEM',
      dni: dto.dni,
      clientId: client._id,
      points: reward.pointsCost,
      rewardId: dto.rewardId,
      rewardName: reward.name,
      userId,
    });

    // Obtener puntos actualizados
    const updatedRelation = await this.clientCompaniesService.getPoints(
      client._id,
      companyId,
    );

    return {
      success: true,
      transaction,
      client: {
        dni: client.dni,
        name: client.name,
        status: client.status,
        currentPoints: updatedRelation.currentPoints,
        totalAccumulated: updatedRelation.totalAccumulated,
      },
      reward: {
        name: reward.name,
        pointsCost: reward.pointsCost,
        stockRemaining: reward.stock !== null ? reward.stock - 1 : null,
      },
      message: `🎉 Premio "${reward.name}" canjeado exitosamente`,
    };
  }

  // ========== HISTORIAL ==========

  /**
   * Obtener historial de transacciones de la empresa
   */
  async findAll(
    companyId: Types.ObjectId,
    page = 1,
    limit = 20,
    type?: 'EARN' | 'REDEEM',
  ) {
    const filter: any = { companyId };
    if (type) {
      filter.type = type;
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.transactionModel
        .find(filter)
        .populate('clientId', 'dni name')
        .populate('userId', 'username name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.transactionModel.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtener historial de un cliente específico
   */
  async findByClient(companyId: Types.ObjectId, dni: string) {
    return this.transactionModel
      .find({ companyId, dni })
      .populate('userId', 'username name')
      .sort({ createdAt: -1 })
      .exec();
  }
}
