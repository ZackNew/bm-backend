import {
  IsString,
  IsOptional,
  IsEmail,
  IsObject,
  IsEnum,
} from 'class-validator';
import { UserStatus } from 'generated/prisma/client';

export class UpdateBuildingDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @IsString()
  @IsOptional()
  contactPhone?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;

  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;
}
