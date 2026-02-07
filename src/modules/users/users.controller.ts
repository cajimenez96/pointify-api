import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { CreateUserBySuperAdminDto } from './dto/create-user-by-superadmin.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { SuperAdminGuard } from '../../guards/super-admin.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../guards/roles.decorator';
import { UserRole, UserDocument } from '../../schemas/user.schema';

interface RequestWithUser extends Request {
  user: UserDocument;
}

@Controller('superadmin/users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(SuperAdminGuard)
  create(@Body() createUserDto: CreateUserBySuperAdminDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(SuperAdminGuard)
  findAll(@Query() queryDto: QueryUsersDto) {
    return this.usersService.findAll(queryDto);
  }

  /**
   * Actualizar usuario
   * Permite: SuperAdmin (cualquier usuario) o Admin (solo de su empresa)
   */
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: RequestWithUser,
  ) {
    return this.usersService.update(id, updateUserDto, req.user);
  }
}
