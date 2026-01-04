import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../../schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) {}

  async login(dni: string, password: string) {
    const user = await this.userModel.findOne({ dni, isActive: true });
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = { sub: user._id, dni: user.dni, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        dni: user.dni,
        name: user.name,
        role: user.role,
      },
    };
  }

  async createUser(dni: string, password: string, name: string, role: string) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new this.userModel({
      dni,
      password: hashedPassword,
      name,
      role,
    });
    return user.save();
  }
}
