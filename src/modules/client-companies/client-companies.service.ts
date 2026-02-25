import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ClientCompany,
  ClientCompanyDocument,
} from '../../schemas/client-company.schema';
import { Client, ClientDocument } from '../../schemas/client.schema';
import { CreateClientCompanyDto } from './dto/create-client-company.dto';
import { UpdateClientCompanyDto } from './dto/update-client-company.dto';
import { QueryClientCompanyDto } from './dto/query-client-company.dto';

@Injectable()
export class ClientCompaniesService {
  constructor(
    @InjectModel(ClientCompany.name)
    private clientCompanyModel: Model<ClientCompanyDocument>,
    @InjectModel(Client.name)
    private clientModel: Model<ClientDocument>, // 👈 AGREGAR
  ) { }

  /**
   * Crear una nueva relación Cliente-Empresa
   */
  async create(
    companyId: Types.ObjectId,
    dto: CreateClientCompanyDto,
  ): Promise<ClientCompanyDocument> {
    try {
      const clientObjectId = new Types.ObjectId(dto.clientId);

      // Crear directamente - el índice único protege contra duplicados
      const relation = await this.clientCompanyModel.create({
        clientId: clientObjectId,
        companyId,
        currentPoints: 0,
        totalAccumulated: 0,
      });

      return relation;
    } catch (error) {
      // MongoDB error E11000 = violación de índice único
      if (error.code === 11000) {
        throw new ConflictException(
          'La relación entre este cliente y empresa ya existe',
        );
      }

      // Cualquier otro error, relanzar
      throw error;
    }
  }

  /**
   * Obtener todas las relaciones de una empresa
   */
  async findAll(
    companyId: Types.ObjectId,
    query: QueryClientCompanyDto,
  ): Promise<ClientCompanyDocument[]> {
    const filter: any = { companyId };

    if (query.clientId) {
      filter.clientId = new Types.ObjectId(query.clientId);
    }

    return this.clientCompanyModel
      .find(filter)
      .populate('clientId', 'dni name email phone')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Obtener una relación específica por ID
   */
  async findOne(
    companyId: Types.ObjectId,
    id: string,
  ): Promise<ClientCompanyDocument> {
    const relation = await this.clientCompanyModel
      .findOne({
        _id: new Types.ObjectId(id),
        companyId,
      })
      .populate('clientId', 'dni name email phone');

    if (!relation) {
      throw new NotFoundException('Relación no encontrada');
    }

    return relation;
  }

  /**
   * Obtener relación por clientId
   */
  async findByClient(
    companyId: Types.ObjectId,
    clientId: string,
  ): Promise<ClientCompanyDocument> {
    const relation = await this.clientCompanyModel
      .findOne({
        clientId: new Types.ObjectId(clientId),
        companyId,
      })
      .populate('clientId', 'dni name email phone');

    if (!relation) {
      throw new NotFoundException(
        'No existe relación entre este cliente y la empresa',
      );
    }

    return relation;
  }

  /**
   * Actualizar una relación (isActive)
   */
  async update(
    companyId: Types.ObjectId,
    id: string,
  ): Promise<ClientCompanyDocument> {
    const relation = await this.findOne(companyId, id);
    return relation.save();
  }

  /**
   * Desactivar relación (soft delete)
   */
  async remove(
    companyId: Types.ObjectId,
    id: string,
  ): Promise<ClientCompanyDocument> {
    const relation = await this.findOne(companyId, id);
    return relation.save();
  }
  /**
   * ========================================
   * MÉTODOS HELPER PARA OTROS SERVICIOS
   * ========================================
   */

  /**
   * Buscar o crear relación automáticamente
   */
  async findOrCreate(
    clientId: Types.ObjectId,
    companyId: Types.ObjectId,
  ): Promise<ClientCompanyDocument> {
    let relation = await this.clientCompanyModel.findOne({
      clientId,
      companyId,
    });

    if (!relation) {
      try {
        relation = await this.clientCompanyModel.create({
          clientId,
          companyId,
          currentPoints: 0,
          totalAccumulated: 0,
        });
      } catch (error) {
        // Si hay race condition, intentar buscar de nuevo
        if (error.code === 11000) {
          relation = await this.clientCompanyModel.findOne({
            clientId,
            companyId,
          });

          // 👇 AGREGAR ESTA VALIDACIÓN
          if (!relation) {
            throw new ConflictException(
              'Error al crear relación: conflicto de concurrencia',
            );
          }
        } else {
          throw error;
        }
      }
    }

    return relation; // ✅ Ahora TypeScript sabe que NUNCA es null
  }
  /**
   * Sumar puntos a la relación
   */
  async addPoints(
    clientId: Types.ObjectId,
    companyId: Types.ObjectId,
    points: number,
  ): Promise<ClientCompanyDocument> {
    const relation = await this.findOrCreate(clientId, companyId);
    relation.currentPoints += points;
    relation.totalAccumulated += points;
    return relation.save();
  }
  /**
   * Restar puntos de la relación
   */
  async deductPoints(
    clientId: Types.ObjectId,
    companyId: Types.ObjectId,
    points: number,
  ): Promise<ClientCompanyDocument> {
    const relation = await this.clientCompanyModel.findOne({
      clientId,
      companyId,
    });

    if (!relation) {
      throw new NotFoundException(
        'No existe relación entre este cliente y la empresa',
      );
    }

    if (relation.currentPoints < points) {
      throw new BadRequestException(
        `Puntos insuficientes. Disponibles: ${relation.currentPoints}, Requeridos: ${points}`,
      );
    }

    relation.currentPoints -= points;
    return relation.save();
  }
  /**
   * Obtener puntos de un cliente en una empresa
   */
  async getPoints(
    clientId: Types.ObjectId,
    companyId: Types.ObjectId,
  ): Promise<{ currentPoints: number; totalAccumulated: number }> {
    const relation = await this.clientCompanyModel.findOne({
      clientId,
      companyId,
    });

    if (!relation) {
      return { currentPoints: 0, totalAccumulated: 0 };
    }

    return {
      currentPoints: relation.currentPoints,
      totalAccumulated: relation.totalAccumulated,
    };
  }

  /**
   * Buscar relación por DNI y companyId
   */
  /**
   * Buscar relación por DNI y companyId
   */
  async findByClientDni(
    dni: string,
    companyId: Types.ObjectId,
  ): Promise<ClientCompanyDocument> {
    // 👈 SIN | null
    const client = await this.clientModel.findOne({ dni });
    console.log('client-companies', client);

    if (!client) {
      throw new NotFoundException('Cliente no encontrado'); // 👈 Tirar error
    }

    const relation = await this.clientCompanyModel
      .findOne({
        clientId: client._id,
        companyId,
      })
      .populate('clientId', 'dni name email phone');

    if (!relation) {
      // 👈 AGREGAR ESTE IF
      throw new NotFoundException(
        'No existe relación entre este cliente y la empresa',
      );
    }

    return relation;
  }
}
