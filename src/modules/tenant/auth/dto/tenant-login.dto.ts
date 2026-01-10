import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class TenantLoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
