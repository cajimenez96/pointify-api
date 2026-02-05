import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { CreateUserBySuperAdminDto } from './dto/create-user-by-superadmin.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { SuperAdminGuard } from '../../guards/super-admin.guard';

@Controller('superadmin/users')
@UseGuards(AuthGuard('jwt'), SuperAdminGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserBySuperAdminDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll(@Query() queryDto: QueryUsersDto) {
    return this.usersService.findAll(queryDto);
  }
}
