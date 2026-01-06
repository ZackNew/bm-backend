import {
  IsUUID,
  IsDateString,
  IsNumber,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { LeaseStatus } from 'generated/prisma/enums';

export class CreateLeaseDto {
  @IsUUID()
  tenantId: string;

  @IsUUID()
  unitId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsNumber()
  rentAmount: number;

  @IsOptional()
  @IsNumber()
  securityDeposit?: number;

  @IsEnum(LeaseStatus as object)
  @IsOptional()
  status?: LeaseStatus;

  @IsOptional()
  terms?: any;
}
