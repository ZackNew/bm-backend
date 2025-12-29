import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginManagerDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
