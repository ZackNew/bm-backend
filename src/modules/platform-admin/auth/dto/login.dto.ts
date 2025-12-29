import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginPlatformAdminDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
