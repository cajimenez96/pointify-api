import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Transaction,
  TransactionDocument,
} from '../../schemas/transaction.schema';
import { Settings, SettingsDocument } from '../../schemas/settings.schema';
import { Client, ClientDocument } from '../../schemas/client.schema';
import { EarnPointsDto } from './dto/earn-points.dto';
import { RedeemPointsDto } from './dto/redeem-points.dto';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    @InjectModel(Settings.name) private settingsModel: Model<SettingsDocument>,
    @InjectModel(Client.name) private clientModel: Model<ClientDocument>,
  ) {}

  // ========== EARN (SUMAR PUNTOS) ==========

  /**
   * Sumar puntos por compra de producto
   */
  async earnPoints(
    companyId: string,
    dto: EarnPointsDto,
    userId: string,
  ) {
    // 1. Validar código de venta único por empresa
    const existingTx = await this.transactionModel.findOne({
      companyId,
      saleCode: dto.saleCode,
    });
    if (existingTx) {
      throw new ConflictException('Código de venta ya registrado');
    }

    // 2. Obtener configuración de la empresa
    const settings = await this.settingsModel.findOne({ companyId });
    if (!settings) {
      throw new NotFoundException('Configuración no encontrada');
    }

    // 2.1 Validar campaña activa
    if (!settings.isActive) {
      throw new BadRequestException('Campaña inactiva');
    }

    // 2.2 Validar fechas de campaña
    const now = new Date();
    if (settings.campaignStartDate && now < settings.campaignStartDate) {
      throw new BadRequestException('La campaña aún no ha comenzado');
    }
    if (settings.campaignEndDate && now > settings.campaignEndDate) {
      throw new BadRequestException('La campaña ha finalizado');
    }

    // 3. Buscar configuración del producto
    const productConfig = settings.pointsConfig.find(
      (p) => p.productName === dto.productName && p.isActive,
    );
    if (!productConfig) {
      throw new BadRequestException(
        `Producto "${dto.productName}" no configurado o inactivo`,
      );
    }

    const pointsToAdd = productConfig.pointsValue;

    // 4. Buscar o crear cliente (Shadow User)
    let client = await this.clientModel.findOne({ companyId, dni: dto.dni });
    if (!client) {
      client = await this.clientModel.create({
        companyId,
        dni: dto.dni,
        name: `Cliente ${dto.dni}`,
        phone: '',
        email: '',
        status: 'PENDING',
        currentPoints: 0,
        totalAccumulated: 0,
        isActive: true,
      });
    }

    // 5. SUMAR puntos al cliente
    client.currentPoints += pointsToAdd;
    client.totalAccumulated += pointsToAdd;
    await client.save();

    // 6. Crear transacción EARN
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

    return {
      success: true,
      transaction,
      client: {
        dni: client.dni,
        name: client.name,
        status: client.status,
        currentPoints: client.currentPoints,
        totalAccumulated: client.totalAccumulated,
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
    companyId: string,
    dto: RedeemPointsDto,
    userId: string,
  ) {
    // 1. Buscar cliente
    const client = await this.clientModel.findOne({ companyId, dni: dto.dni });
    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }

    // 2. Obtener configuración y premio
    const settings = await this.settingsModel.findOne({ companyId });
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

    // 4. Validar saldo del cliente
    if (client.currentPoints < reward.pointsCost) {
      throw new BadRequestException(
        `Saldo insuficiente. Necesita ${reward.pointsCost} puntos, tiene ${client.currentPoints}`,
      );
    }

    // 5. TRANSACCIÓN ATÓMICA: Restar puntos + Restar stock + Crear transacción
    const session = await this.transactionModel.db.startSession();
    session.startTransaction();

    try {
      // Restar puntos del cliente
      client.currentPoints -= reward.pointsCost;
      await client.save({ session });

      // Restar stock del premio
      if (reward.stock !== null) {
        reward.stock -= 1;
        await settings.save({ session });
      }

      // Crear transacción REDEEM
      const transaction = await this.transactionModel.create(
        [
          {
            companyId,
            type: 'REDEEM',
            dni: dto.dni,
            clientId: client._id,
            points: reward.pointsCost,
            rewardId: dto.rewardId,
            rewardName: reward.name,
            userId,
          },
        ],
        { session },
      );

      await session.commitTransaction();

      return {
        success: true,
        transaction: transaction[0],
        client: {
          dni: client.dni,
          name: client.name,
          status: client.status,
          currentPoints: client.currentPoints,
          totalAccumulated: client.totalAccumulated,
        },
        reward: {
          name: reward.name,
          pointsCost: reward.pointsCost,
          stockRemaining: reward.stock,
        },
        message: `🎉 Premio "${reward.name}" canjeado exitosamente`,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // ========== HISTORIAL ==========

  /**
   * Obtener historial de transacciones de la empresa
   */
  async findAll(companyId: string, page = 1, limit = 20, type?: 'EARN' | 'REDEEM') {
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
  async findByClient(companyId: string, dni: string) {
    return this.transactionModel
      .find({ companyId, dni })
      .populate('userId', 'username name')
      .sort({ createdAt: -1 })
      .exec();
  }
}
