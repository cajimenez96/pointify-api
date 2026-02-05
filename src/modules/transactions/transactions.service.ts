import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Transaction,
  TransactionDocument,
} from '../../schemas/transaction.schema';
import { Settings, SettingsDocument } from '../../schemas/settings.schema';
import { ClientsService } from '../clients/clients.service';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    @InjectModel(Settings.name) private settingsModel: Model<SettingsDocument>,
    private clientsService: ClientsService,
  ) {}

  async addPoints(dni: string, saleCode: string, cashierId: string) {
    // 1. Verificar código de venta duplicado PRIMERO (evita duplicados antes de validar cliente)
    const existingTransaction = await this.transactionModel.findOne({
      saleCode,
    });
    if (existingTransaction) {
      throw new BadRequestException(
        'Código de venta ya procesado anteriormente',
      );
    }

    // 2. Obtener configuración actual y validar campaña
    const settings = await this.settingsModel.findOne({ key: 'default' });
    if (!settings) {
      throw new BadRequestException(
        'No hay configuración del sistema. Contacta al administrador.',
      );
    }

    // 2.1. Validar si la campaña está activa manualmente
    if (!settings.isActive) {
      throw new BadRequestException(
        'La campaña no está activa. Contacta al administrador.',
      );
    }

    // 2.2. Validar fechas de campaña (si están definidas)
    const now = new Date();
    if (
      settings.campaignStartDate &&
      now < new Date(settings.campaignStartDate)
    ) {
      throw new BadRequestException('La campaña aún no ha comenzado.');
    }
    if (settings.campaignEndDate && now > new Date(settings.campaignEndDate)) {
      throw new BadRequestException('La campaña ha finalizado.');
    }

    const pointsTarget = settings.pointsTarget || 10;

    // 3. Buscar o crear cliente (SHADOW CLIENT LOGIC)
    let client = await this.clientsService.findByDni(dni);

    if (!client) {
      // Cliente no existe -> Crear "Shadow Client" (sin nombre completo)
      // Esto permite agregar puntos sin bloquear la fila de caja
      client = await this.clientsService.createClient({
        dni,
        name: '', // Nombre vacío para Shadow User
        phone: '',
        email: '',
        status: 'PENDING', // Marcado como pendiente de registro
      });
    }

    // 4. Crear transacción
    const transaction = new this.transactionModel({
      clientId: client._id,
      cashierId,
      saleCode,
      pointsAdded: 1,
      date: new Date(),
    });
    await transaction.save();

    // 5. Incrementar puntos
    const updatedClient = await this.clientsService.incrementPoints(dni, 1);
    if (!updatedClient) {
      throw new NotFoundException('Error al actualizar puntos del cliente');
    }

    // 6. Verificar si alcanzó la meta de puntos
    const rewardReached = updatedClient.currentPoints >= pointsTarget;

    // 7. Si alcanzó la meta, validar stock de ganadores
    if (rewardReached) {
      // 7.1. Verificar si hay límite de ganadores configurado
      if (settings.maxWinners > 0) {
        // Hay límite de stock
        if (settings.currentWinners >= settings.maxWinners) {
          // Stock agotado - NO entregar premio
          return {
            success: true,
            client: {
              name: updatedClient.name || `Cliente ${updatedClient.dni}`,
              dni: updatedClient.dni,
              status: updatedClient.status,
              currentPoints: updatedClient.currentPoints,
              totalAccumulated: updatedClient.totalAccumulated,
            },
            rewardReached: false, // No se entrega premio
            stockAvailable: false,
            message: `Alcanzaste ${pointsTarget} puntos pero no hay premios disponibles. Total acumulado: ${updatedClient.totalAccumulated}`,
          };
        }

        // Hay stock disponible -> Incrementar contador de ganadores
        await this.settingsModel.findOneAndUpdate(
          { key: 'default' },
          { $inc: { currentWinners: 1 } },
        );
      }

      // 7.2. RESETEAR puntos a 0 (redención automática)
      await this.clientsService.redeemReward(dni);

      return {
        success: true,
        client: {
          name: updatedClient.name || `Cliente ${updatedClient.dni}`,
          dni: updatedClient.dni,
          status: updatedClient.status,
          currentPoints: 0, // Mostrar 0 porque se reseteó
          totalAccumulated: updatedClient.totalAccumulated,
        },
        rewardReached: true,
        stockAvailable: true,
        rewardName: settings.rewardName || 'Premio',
        message: `🎉 ¡PREMIO GANADO! Entregar ${settings.rewardName} a ${updatedClient.name || 'Cliente'}`,
      };
    }

    // 8. No alcanzó la meta - respuesta normal
    return {
      success: true,
      client: {
        name: updatedClient.name || `Cliente ${updatedClient.dni}`,
        dni: updatedClient.dni,
        status: updatedClient.status,
        currentPoints: updatedClient.currentPoints,
        totalAccumulated: updatedClient.totalAccumulated,
      },
      rewardReached: false,
      message: 'Puntos agregados exitosamente',
    };
  }
}
