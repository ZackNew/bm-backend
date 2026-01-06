import { IsString, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { MaintenanceRequestPriority } from 'generated/prisma/enums';

export class CreateMaintenanceRequestDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsEnum(MaintenanceRequestPriority as object)
  @IsOptional()
  priority?: MaintenanceRequestPriority;

  @IsOptional()
  @IsUUID()
  tenantId?: string;
}
