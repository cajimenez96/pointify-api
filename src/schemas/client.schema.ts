import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ClientDocument = Client & Document;

/**
 * Schema de Cliente
 * Aislado por empresa (companyId)
 */
@Schema({ timestamps: true })
export class Client {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true })
  companyId: Types.ObjectId; // Empresa a la que pertenece el cliente

  @Prop({ required: true })
  dni: string; // Ya no es unique global, único por empresa

  @Prop({ default: '' })
  name: string;

  @Prop({ default: '' })
  phone: string;

  @Prop({ default: '' })
  email: string;

  @Prop({ enum: ['PENDING', 'ACTIVE'], default: 'PENDING' })
  status: string; // PENDING = Shadow User, ACTIVE = Registered

  @Prop({ default: 0 })
  currentPoints: number;

  @Prop({ default: 0 })
  totalAccumulated: number; // Historical total

  @Prop({ default: true })
  isActive: boolean;
}

export const ClientSchema = SchemaFactory.createForClass(Client);

// Índices para multi-tenancy
ClientSchema.index({ companyId: 1, dni: 1 }, { unique: true }); // DNI único por empresa
ClientSchema.index({ companyId: 1, isActive: 1 }); // Filtro de clientes activos
ClientSchema.index({ companyId: 1, status: 1 }); // Filtro por status
