import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { AdministrativeLevel } from '../../../generated/prisma/client.js';

export class AreaListQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000) limit = 20;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsEnum(AdministrativeLevel) level?: AdministrativeLevel;
  @IsOptional() @IsUUID() parentId?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
}
export class AreaHierarchyQueryDto {
  @IsOptional() @IsEnum(AdministrativeLevel) level?: AdministrativeLevel;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(20) maxDepth?: number;
  @IsOptional() @Type(() => Boolean) @IsBoolean() includeSelf = false;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000) limit = 100;
}
export class AreaSearchQueryDto {
  @IsString() @MinLength(2) @MaxLength(100) q!: string;
  @IsOptional() @IsEnum(AdministrativeLevel) level?: AdministrativeLevel;
  @IsOptional() @IsUUID() parentId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 20;
}
export class ViewportBoundaryQueryDto {
  @IsString() bbox!: string;
  @IsEnum(AdministrativeLevel) level!: AdministrativeLevel;
  @Type(() => Number) @IsInt() @Min(0) @Max(24) zoom!: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000) limit = 200;
}
export class BoundaryQueryDto {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) simplifyMeters = 0;
}
