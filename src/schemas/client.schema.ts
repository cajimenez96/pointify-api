import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ClientDocument = Client & Document;

@Schema({ timestamps: true })
export class Client {
  @Prop({ required: true, unique: true })
  dni: string;

  @Prop({ required: true })
  name: string;

  @Prop({ default: '' })
  phone: string;

  @Prop({ default: '' })
  email: string;

  @Prop({ default: 0 })
  currentPoints: number;

  @Prop({ default: 0 })
  totalAccumulated: number; // Historical total

  @Prop({ default: true })
  isActive: boolean;
}

export const ClientSchema = SchemaFactory.createForClass(Client);
