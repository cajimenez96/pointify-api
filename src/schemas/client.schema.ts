import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ClientDocument = Client & Document;

/**
 * Schema de Cliente (Global)
 * Un cliente puede estar asociado a múltiples empresas.
 * La relación con empresas se maneja en ClientCompany.
 * Los puntos y status se manejan por empresa en ClientCompany.
 */
@Schema({ timestamps: true })
export class Client {
  @Prop({ required: true })
  dni: string; // DNI único global

  @Prop({ default: '' })
  name: string;

  @Prop({ default: '' })
  phone: string;

  @Prop({ default: '' })
  email: string;

  @Prop({ enum: ['PENDING', 'ACTIVE'], default: 'PENDING' })
  status: string; // PENDING = Shadow User, ACTIVE = Registered

  // @Prop({ default: true })
  // isActive: boolean;

  @Prop({ type: String, default: null })
  password: string | null;
}

export const ClientSchema = SchemaFactory.createForClass(Client);

// Índices para multi-tenancy
ClientSchema.index({ dni: 1 }, { unique: true }); // DNI único
ClientSchema.index({ isActive: 1 }); // Filtro de clientes activos
ClientSchema.index({ email: 1 }); // Filtro de clientes email
ClientSchema.index({ status: 1 }); // Filtro por status
