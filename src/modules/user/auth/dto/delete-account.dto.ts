import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class DeleteAccountDto {
  @ApiProperty({
    example: 'CurrentPassword123!',
    description: 'Current password, required to confirm account deletion',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
