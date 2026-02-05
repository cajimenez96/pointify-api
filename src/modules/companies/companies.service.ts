import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Company, CompanyDocument } from '../../schemas/company.schema';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { QueryCompaniesDto } from './dto/query-companies.dto';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
  ) {}

  /**
   * Crear nueva empresa
   */
  async create(createCompanyDto: CreateCompanyDto): Promise<CompanyDocument> {
    // Validar unicidad de companyCode
    const existingByCode = await this.companyModel.findOne({
      companyCode: createCompanyDto.companyCode,
    });
    if (existingByCode) {
      throw new ConflictException(
        `El código de empresa "${createCompanyDto.companyCode}" ya está en uso`,
      );
    }

    // Validar unicidad de cuitCuil
    const existingByCuit = await this.companyModel.findOne({
      cuitCuil: createCompanyDto.cuitCuil,
    });
    if (existingByCuit) {
      throw new ConflictException(
        `El CUIT/CUIL "${createCompanyDto.cuitCuil}" ya está registrado`,
      );
    }

    const company = new this.companyModel(createCompanyDto);
    return company.save();
  }

  /**
   * Listar empresas con filtros y paginación
   */
  async findAll(queryDto: QueryCompaniesDto) {
    const { businessName, cuitCuil, isActive, page = 1, limit = 20 } = queryDto;

    const filter: any = {};

    if (businessName) {
      filter.businessName = { $regex: businessName, $options: 'i' };
    }

    if (cuitCuil) {
      filter.cuitCuil = cuitCuil;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.companyModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.companyModel.countDocuments(filter),
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
   * Buscar empresa por ID
   */
  async findOne(id: string): Promise<CompanyDocument> {
    const company = await this.companyModel.findById(id);
    if (!company) {
      throw new NotFoundException(`Empresa con ID "${id}" no encontrada`);
    }
    return company;
  }

  /**
   * Actualizar empresa (edición parcial)
   */
  async update(
    id: string,
    updateCompanyDto: UpdateCompanyDto,
  ): Promise<CompanyDocument> {
    // No permitir cambiar companyCode ni cuitCuil después de creación
    if (updateCompanyDto.companyCode || updateCompanyDto.cuitCuil) {
      throw new BadRequestException(
        'No se permite modificar companyCode ni cuitCuil después de la creación',
      );
    }

    const company = await this.companyModel.findByIdAndUpdate(
      id,
      { $set: updateCompanyDto },
      { new: true, runValidators: true },
    );

    if (!company) {
      throw new NotFoundException(`Empresa con ID "${id}" no encontrada`);
    }

    return company;
  }
}
