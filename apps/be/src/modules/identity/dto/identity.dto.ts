import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIP,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AdministrativeLevel } from '../../../generated/prisma/client.js';

export class AreaScopeQueryDto {
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeDescendants = false;

  @IsOptional()
  @IsEnum(AdministrativeLevel)
  level?: AdministrativeLevel;
}

export class RevokeOtherSessionsDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class UpdateSessionNetworkDto {
  @IsString()
  @IsIP()
  @MaxLength(64)
  ipAddress!: string;
}
