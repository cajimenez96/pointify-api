import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TransactionDocument = Transaction & Document;

/**
 * Schema de Transacción Multi-Tenant con Economía de Puntos
 *
 * BREAKING CHANGE: Ahora soporta dos tipos de transacciones:
 * - EARN: Sumar puntos (compra)
 * - REDEEM: Restar puntos (canje de premio)
 */
@Schema({ timestamps: true })
export class Transaction {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true })
  companyId: Types.ObjectId; // Empresa a la que pertenece

  @Prop({ enum: ['EARN', 'REDEEM'], required: true })
  type: 'EARN' | 'REDEEM'; // Tipo de transacción

  @Prop({ required: true })
  dni: string; // DNI del cliente (para lookup rápido)

  @Prop({ type: Types.ObjectId, ref: 'Client', required: false })
  clientId?: Types.ObjectId; // Referencia al cliente (opcional)

  @Prop({ required: true, min: 0 })
  points: number; // Valor absoluto de puntos (siempre positivo)

  // ========== CAMPOS PARA TYPE='EARN' ==========
  @Prop({ required: false })
  saleCode?: string; // Código único de venta

  @Prop({ required: false })
  productName?: string; // Producto comprado que generó los puntos

  // ========== CAMPOS PARA TYPE='REDEEM' ==========
  @Prop({ type: Types.ObjectId, required: false })
  rewardId?: Types.ObjectId; // ID del premio canjeado (subdocumento en Settings)

  @Prop({ required: false })
  rewardName?: string; // Snapshot del nombre del premio al momento del canje

  // ========== AUDITORÍA ==========
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  userId?: Types.ObjectId; // Usuario (cajero/admin) que registró la transacción
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

// Índices para multi-tenancy y performance
TransactionSchema.index({ companyId: 1, saleCode: 1 }, { unique: true, partialFilterExpression: { saleCode: { $type: 'string' } } }); // saleCode único por empresa (solo EARN)
TransactionSchema.index({ companyId: 1, type: 1, createdAt: -1 }); // Listado por tipo
TransactionSchema.index({ companyId: 1, dni: 1, createdAt: -1 }); // Historial del cliente
TransactionSchema.index({ companyId: 1, createdAt: -1 }); // Listado general
