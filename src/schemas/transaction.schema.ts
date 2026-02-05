import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TransactionDocument = Transaction & Document;

/**
 * Schema de Transacción
 * Aislado por empresa (companyId)
 */
@Schema({ timestamps: true })
export class Transaction {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true })
  companyId: Types.ObjectId; // Empresa a la que pertenece la transacción

  @Prop({ type: Types.ObjectId, ref: 'Client', required: true })
  clientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  cashierId: Types.ObjectId;

  @Prop({ required: true })
  saleCode: string; // Ya no es unique global, único por empresa

  @Prop({ default: 1 })
  pointsAdded: number; // Default: 1 purchase = 1 point

  @Prop()
  date: Date;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

// Índices para multi-tenancy
TransactionSchema.index({ companyId: 1, saleCode: 1 }, { unique: true }); // saleCode único por empresa
TransactionSchema.index({ companyId: 1, date: -1 }); // Listado de transacciones recientes
TransactionSchema.index({ clientId: 1, companyId: 1 }); // Historial del cliente
