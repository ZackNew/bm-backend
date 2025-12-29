import {
  IsEmail,
  IsString,
  MinLength,
  IsEnum,
  IsArray,
  IsOptional,
} from 'class-validator';
import { PlatformAdminRole, AdminStatus } from 'generated/prisma/client';

export class UpdateAdminDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(8)
  @IsOptional()
  password?: string;

  @IsArray()
  @IsEnum(PlatformAdminRole, { each: true })
  @IsOptional()
  roles?: PlatformAdminRole[];

  @IsEnum(AdminStatus)
  @IsOptional()
  status?: AdminStatus;
}
