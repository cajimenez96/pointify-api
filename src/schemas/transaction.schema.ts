import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TransactionDocument = Transaction & Document;

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ type: Types.ObjectId, ref: 'Client', required: true })
  clientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  cashierId: Types.ObjectId;

  @Prop({ required: true })
  saleCode: string; // Unique identifier for the purchase

  @Prop({ default: 1 })
  pointsAdded: number; // Default: 1 purchase = 1 point

  @Prop()
  date: Date;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

// Index for preventing duplicate transactions
TransactionSchema.index({ saleCode: 1 }, { unique: true });
