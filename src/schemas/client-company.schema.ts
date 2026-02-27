import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ClientCompanyDocument = ClientCompany & Document;

/**
 * Schema de Relación Cliente-Empresa (Tabla Intermedia)
 * Gestiona la relación muchos a muchos entre clientes y empresas.
 * Un cliente puede estar asociado a múltiples empresas y cada empresa
 * puede tener múltiples clientes.
 * Esta colección almacena información acumulativa por cliente dentro
 * de cada empresa (puntos, estado, actividad, etc.).
 */
@Schema({ timestamps: true })
export class ClientCompany {
  @Prop({ type: Types.ObjectId, ref: 'Client', required: true })
  clientId: Types.ObjectId; // Referencia al cliente

  @Prop({ type: Types.ObjectId, ref: 'Company', required: true })
  companyId: Types.ObjectId; // Referencia a la empresa

  @Prop({ default: 0, min: 0 })
  currentPoints: number; // Puntos actuales disponibles para canjear

  @Prop({ default: 0, min: 0 })
  totalAccumulated: number; // Total histórico de puntos acumulados
}

export const ClientCompanySchema = SchemaFactory.createForClass(ClientCompany);

// Índices para integridad y performance
// Índice único compuesto: Un cliente solo puede estar una vez en una empresa
ClientCompanySchema.index({ clientId: 1, companyId: 1 }, { unique: true });

// Índices para consultas frecuentes
ClientCompanySchema.index({ companyId: 1, currentPoints: -1 }); // Top clientes por puntos
ClientCompanySchema.index({ companyId: 1, totalAccumulated: -1 }); // Top clientes históricos
