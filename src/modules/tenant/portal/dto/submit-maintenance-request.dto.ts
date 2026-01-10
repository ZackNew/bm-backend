import { IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { MaintenanceRequestPriority } from 'generated/prisma/client';

export class SubmitMaintenanceRequestDto {
  @IsNotEmpty()
  title: string;

  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsEnum(MaintenanceRequestPriority)
  priority?: MaintenanceRequestPriority;
}
