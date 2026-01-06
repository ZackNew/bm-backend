import { IsEnum, IsOptional, IsString } from 'class-validator';
import { MaintenanceRequestStatus } from 'generated/prisma/enums';

export class UpdateMaintenanceRequestDto {
  @IsEnum(MaintenanceRequestStatus as object)
  @IsOptional()
  status?: MaintenanceRequestStatus;

  @IsString()
  @IsOptional()
  note?: string;
}
