import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SettingsDocument = Settings & Document;

/**
 * Configuración de Puntos por Producto
 */
export class ProductPointsConfig {
  @Prop({ required: true })
  productName: string; // Ej: "Café Espresso", "Hamburguesa Classic"

  @Prop({ required: true, min: 1 })
  pointsValue: number; // Cuántos puntos otorga este producto

  @Prop({ default: true })
  isActive: boolean; // Si está activo para registrar puntos
}

/**
 * Premio del Catálogo
 */
export class Reward {
  @Prop({ required: true })
  name: string; // Ej: "Café Gratis", "Taza Personalizada"

  @Prop({ default: '' })
  description: string; // Descripción del premio

  @Prop({ required: true, min: 1 })
  pointsCost: number; // Cuántos puntos cuesta canjear

  @Prop({ type: Number, default: null })
  stock: number | null; // null = infinito, 0 = agotado, N = disponibles

  @Prop({ default: true })
  isActive: boolean; // Si está disponible para canje

  @Prop({ type: String, default: null })
  imageUrl: string | null; // URL de imagen del premio (opcional)
}

/**
 * Schema de Configuración de Campaña Multi-Tenant
 * Una configuración por empresa (companyId es unique)
 *
 * BREAKING CHANGE: Migrado de "meta única" a "economía de puntos"
 * - Eliminado: rewardName, pointsTarget, minPurchaseAmount, maxWinners, currentWinners
 * - Agregado: pointsConfig (productos), rewards (catálogo)
 */
@Schema({ timestamps: true })
export class Settings {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, unique: true })
  companyId: Types.ObjectId; // Una configuración por empresa

  // ========== CONFIGURACIÓN DE PUNTOS POR PRODUCTO ==========
  @Prop({
    type: [
      {
        productName: { type: String, required: true },
        pointsValue: { type: Number, required: true, min: 1 },
        isActive: { type: Boolean, default: true },
      },
    ],
    default: [],
  })
  pointsConfig: ProductPointsConfig[]; // Productos y sus valores en puntos

  // ========== CATÁLOGO DE PREMIOS ==========
  @Prop({
    type: [
      {
        name: { type: String, required: true },
        description: { type: String, default: '' },
        pointsCost: { type: Number, required: true, min: 1 },
        stock: { type: Number, default: null },
        isActive: { type: Boolean, default: true },
        imageUrl: { type: String, default: null },
      },
    ],
    default: [],
  })
  rewards: Reward[]; // Catálogo de premios canjeables

  // ========== CONFIGURACIÓN DE CAMPAÑA ==========
  @Prop({ type: Date, default: null })
  campaignStartDate: Date | null; // Fecha de inicio (null = sin fecha)

  @Prop({ type: Date, default: null })
  campaignEndDate: Date | null; // Fecha de fin (null = sin fecha)

  @Prop({ default: true })
  isActive: boolean; // Toggle manual de campaña
}

export const SettingsSchema = SchemaFactory.createForClass(Settings);

// Índice único: una configuración por empresa
SettingsSchema.index({ companyId: 1 }, { unique: true });
