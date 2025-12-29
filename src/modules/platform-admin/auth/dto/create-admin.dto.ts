import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsEnum,
  IsArray,
} from 'class-validator';
import { PlatformAdminRole } from 'generated/prisma/enums';

export class CreateAdminDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsArray()
  @IsEnum(PlatformAdminRole, { each: true })
  roles: PlatformAdminRole[];
}
