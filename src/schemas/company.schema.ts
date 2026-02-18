import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CompanyDocument = Company & Document;

/**
 * Schema de Empresa (Tenant)
 * Representa a cada empresa que utiliza el sistema de fidelización.
 */
@Schema({ timestamps: true })
export class Company {
  @Prop({ required: true, unique: true, minlength: 3, maxlength: 20 })
  companyCode: string; // Código único de la empresa (ej: "EMP001", "ACME2026")

  @Prop({ required: true, minlength: 2, maxlength: 200 })
  businessName: string; // Razón social de la empresa

  @Prop({
    required: true,
    unique: true,
    match: /^\d{11}$/,
  })
  cuitCuil: string; // CUIT/CUIL - Identificación fiscal (11 dígitos)

  @Prop({ required: false })
  address?: string; // Dirección física de la empresa

  @Prop({
    type: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String, required: true },
    },
    required: true,
  })
  contactInfo: {
    name: string; // Nombre del contacto principal
    phone: string; // Teléfono de contacto
    email: string; // Email de contacto
  };

  @Prop({ default: true })
  isActive: boolean; // Estado activo/suspendido de la empresa

  @Prop({ type: Date, default: null })
  subscriptionEndDate: Date | null; // null = Suscripción ilimitada/vitalicia

  @Prop({ default: 0 })
  maxUsers: number; // Límite de usuarios (0 = ilimitado)

  @Prop({ default: 0 })
  maxClients: number; // Límite de clientes (0 = ilimitado)
}

export const CompanySchema = SchemaFactory.createForClass(Company);

// Índices
CompanySchema.index({ companyCode: 1 }, { unique: true });
CompanySchema.index({ cuitCuil: 1 }, { unique: true });
CompanySchema.index({ isActive: 1 });
