import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ClientCompany,
  ClientCompanyDocument,
} from '../../schemas/client-company.schema';
import { CreateClientCompanyDto } from './dto/create-client-company.dto';
import { UpdateClientCompanyDto } from './dto/update-client-company.dto';
import { QueryClientCompanyDto } from './dto/query-client-company.dto';

@Injectable()
export class ClientCompaniesService {
  constructor(
    @InjectModel(ClientCompany.name)
    private clientCompanyModel: Model<ClientCompanyDocument>,
  ) {}

  /**
   * Crear una nueva relación Cliente-Empresa
   */
  async create(
    companyId: Types.ObjectId,
    dto: CreateClientCompanyDto,
  ): Promise<ClientCompanyDocument> {
    const clientObjectId = new Types.ObjectId(dto.clientId);

    // Verificar si ya existe la relación
    const existing = await this.clientCompanyModel.findOne({
      clientId: clientObjectId,
      companyId,
    });

    if (existing) {
      throw new ConflictException(
        'La relación entre este cliente y empresa ya existe',
      );
    }

    // Crear nueva relación
    const relation = await this.clientCompanyModel.create({
      clientId: clientObjectId,
      companyId,
      currentPoints: 0,
      totalAccumulated: 0,
      status: 'PENDING',
      isActive: true,
    });

    return relation;
  }

  /**
   * Obtener todas las relaciones de una empresa
   */
  async findAll(
    companyId: Types.ObjectId,
    query: QueryClientCompanyDto,
  ): Promise<ClientCompanyDocument[]> {
    const filter: any = { companyId };

    if (query.status) {
      filter.status = query.status;
    }

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive;
    }

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
   * Actualizar una relación (status o isActive)
   */
  async update(
    companyId: Types.ObjectId,
    id: string,
    dto: UpdateClientCompanyDto,
  ): Promise<ClientCompanyDocument> {
    const relation = await this.findOne(companyId, id);

    if (dto.status !== undefined) {
      relation.status = dto.status;
    }

    if (dto.isActive !== undefined) {
      relation.isActive = dto.isActive;
    }

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
    relation.isActive = false;
    return relation.save();
  }
}
