import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UnitType, UnitStatus } from 'generated/prisma/client';

export class CreateUnitDto {
  @IsString()
  @IsNotEmpty()
  unitNumber: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  floor?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  size?: number;

  @IsOptional()
  @IsEnum(UnitType)
  type?: UnitType;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  @Type(() => Number)
  rentPrice: number;

  @IsOptional()
  @IsEnum(UnitStatus)
  status?: UnitStatus;
}
