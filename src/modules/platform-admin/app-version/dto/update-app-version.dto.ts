import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class UpdateAppVersionDto {
  @ApiPropertyOptional({
    example: '1.0.0',
    description: 'Minimum Android version still allowed to run',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  androidMinimumVersion?: string;

  @ApiPropertyOptional({
    example: '1.4.0',
    description: 'Latest available Android version',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  androidLatestVersion?: string;

  @ApiPropertyOptional({
    example: '1.0.0',
    description: 'Minimum iOS version still allowed to run',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  iosMinimumVersion?: string;

  @ApiPropertyOptional({
    example: '1.4.0',
    description: 'Latest available iOS version',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  iosLatestVersion?: string;

  @ApiPropertyOptional({
    example: 'Bug fixes and performance improvements',
    description: 'Changelog text shown in the update prompt',
  })
  @IsOptional()
  @IsString()
  versionDescription?: string;

  @ApiPropertyOptional({
    example: '1.2.0',
    description: 'Last version that required a forced update',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  lastForceUpdateVersion?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the update prompt is dismissible',
  })
  @IsOptional()
  @IsBoolean()
  isOptional?: boolean;
}
