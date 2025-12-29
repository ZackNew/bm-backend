import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Get, Patch, Delete, Param } from '@nestjs/common';

import { AuthService } from './auth.service';
import {
  LoginPlatformAdminDto,
  CreateAdminDto,
  UpdateAdminDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { User } from 'src/common/decorators/user.decorator';

@Controller('v1/platform/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginPlatformAdminDto) {
    const result = await this.authService.login(dto);
    return {
      success: true,
      data: result,
      message: 'Login successful',
    };
  }

  @Post('admins')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  async createAdmin(@Body() dto: CreateAdminDto) {
    const result = await this.authService.createAdmin(dto);
    return {
      success: true,
      data: result,
      message: 'Admin created successfully',
    };
  }

  @Get('admins')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'user_manager')
  async getAllAdmins() {
    const result = await this.authService.getAllAdmins();
    return {
      success: true,
      data: result,
    };
  }

  @Get('admins/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'user_manager')
  async getAdminById(@Param('id') id: string) {
    const result = await this.authService.getAdminById(id);
    return {
      success: true,
      data: result,
    };
  }

  @Patch('admins/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  async updateAdmin(@Param('id') id: string, @Body() dto: UpdateAdminDto) {
    const result = await this.authService.updateAdmin(id, dto);
    return {
      success: true,
      data: result,
      message: 'Admin updated successfully',
    };
  }

  @Delete('admins/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  async deleteAdmin(@Param('id') id: string) {
    const result = await this.authService.deleteAdmin(id);
    return {
      success: true,
      data: result,
    };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @User() user: { id: string },
    @Body() dto: ChangePasswordDto,
  ) {
    const result = await this.authService.changePassword(user.id, dto);
    return {
      success: true,
      data: result,
    };
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const result = await this.authService.forgotPassword(dto);
    return {
      success: true,
      data: result,
    };
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const result = await this.authService.resetPassword(dto);
    return {
      success: true,
      data: result,
    };
  }
}
