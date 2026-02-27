import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  SUPER_ADMIN = 'superadmin',
  ADMIN = 'admin',
  CASHIER = 'cashier',
}

/**
 * Schema de Usuario
 * Soporta multi-tenancy:
 * - SuperAdmin: companyId = null (acceso global)
 * - Tenant Users (admin/cashier): companyId = ObjectId (scope a una empresa)
 */
@Schema({ timestamps: true })
export class User {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: false })
  companyId: Types.ObjectId | null; // null para SuperAdmins, ObjectId para usuarios de empresa

  @Prop({ required: true })
  dni: string; // Identificador de documento (ya no es unique global)

  @Prop({ required: true })
  username: string; // Nombre de usuario para login (unique con lógica por índices)

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

// Índices para multi-tenancy
// 1. Username único para tenant users (companyId + username)
UserSchema.index({ companyId: 1, username: 1 }, { unique: true, sparse: true });

// 2. Username único para SuperAdmins (companyId null)
UserSchema.index(
  { username: 1 },
  {
    unique: true,
    partialFilterExpression: { companyId: null },
  },
);

// 3. DNI único por empresa
UserSchema.index({ companyId: 1, dni: 1 }, { unique: true, sparse: true });

// 4. Búsquedas por empresa y estado
UserSchema.index({ companyId: 1, isActive: 1 });
