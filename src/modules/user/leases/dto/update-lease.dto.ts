import { IsDateString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { LeaseStatus } from 'generated/prisma/enums';

export class UpdateLeaseDto {
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsNumber()
  @IsOptional()
  rentAmount?: number;

  @IsOptional()
  @IsNumber()
  securityDeposit?: number;

  @IsEnum(LeaseStatus as object)
  @IsOptional()
  status?: LeaseStatus;

  @IsOptional()
  terms?: any;
}
