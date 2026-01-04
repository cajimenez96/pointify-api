import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SettingsDocument = Settings & Document;

@Schema({ timestamps: true })
export class Settings {
  @Prop({ required: true, default: 'default' })
  key: string; // Solo un documento con key="default"

  @Prop({ required: true, default: 10 })
  pointsTarget: number; // Puntos necesarios para canjear premio

  @Prop({ required: true, default: 'Café Gratis' })
  rewardName: string; // Nombre del premio

  @Prop({ default: 0 })
  minPurchaseAmount: number; // Monto mínimo de compra (uso futuro)

  // --- CAMPAIGN LOGIC ---
  @Prop({ type: Date, default: null })
  campaignStartDate: Date; // Fecha de inicio de la campaña (null = sin fecha)

  @Prop({ type: Date, default: null })
  campaignEndDate: Date; // Fecha de fin de la campaña (null = sin fecha)

  @Prop({ default: true })
  isActive: boolean; // Si está activa la campaña (manual toggle por admin)
}

export const SettingsSchema = SchemaFactory.createForClass(Settings);
