import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
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

export class PermissionQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  resourceType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  resourceId?: string;
}

export class RevokeOtherSessionsDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
