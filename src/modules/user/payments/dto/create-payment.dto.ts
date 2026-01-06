import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsDateString,
  IsNumber,
  IsArray,
} from 'class-validator';
import { PaymentType } from 'generated/prisma/enums';

export class CreatePaymentDto {
  @IsUUID()
  tenantId: string;

  @IsNumber()
  amount: number;

  @IsEnum(PaymentType as object)
  type: PaymentType;

  @IsDateString()
  paymentDate: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  monthsCovered?: string[]; // Format: ["2025-01", "2025-02"]

  @IsOptional()
  @IsString()
  notes?: string;
}
