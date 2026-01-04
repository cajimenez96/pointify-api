import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  ADMIN = 'admin',
  CASHIER = 'cashier',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  dni: string;

  @Prop({ required: true })
  password: string; // Hashed with bcrypt

  @Prop({ required: true, enum: UserRole })
  role: UserRole;

  @Prop({ required: true })
  name: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
