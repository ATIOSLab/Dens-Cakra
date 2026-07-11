import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  AdministrativeLevel,
  BoundaryQualityStatus,
} from '../../../generated/prisma/client.js';

export class AreaListQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000) limit = 20;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsEnum(AdministrativeLevel) level?: AdministrativeLevel;
  @IsOptional() @IsUUID() parentId?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
}
export class AreaTreeQueryDto {
  @IsOptional() @IsUUID() rootId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10) maxDepth = 3;
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
export class CreateAreaDto {
  @IsString() @MaxLength(50) code!: string;
  @IsOptional() @IsString() @MaxLength(30) officialCode?: string;
  @IsString() @MaxLength(180) name!: string;
  @IsEnum(AdministrativeLevel) level!: AdministrativeLevel;
  @IsOptional() @IsUUID() parentId?: string;
  @IsOptional() @IsNumber() @Min(-90) @Max(90) centroidLatitude?: number;
  @IsOptional() @IsNumber() @Min(-180) @Max(180) centroidLongitude?: number;
}
export class UpdateAreaDto {
  @IsOptional() @IsString() @MaxLength(180) name?: string;
  @IsOptional() @IsString() @MaxLength(30) officialCode?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsNumber() @Min(-90) @Max(90) centroidLatitude?: number;
  @IsOptional() @IsNumber() @Min(-180) @Max(180) centroidLongitude?: number;
}
export class ResolveCoordinateDto {
  @IsNumber() @Min(-90) @Max(90) latitude!: number;
  @IsNumber() @Min(-180) @Max(180) longitude!: number;
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(AdministrativeLevel, { each: true })
  levels?: AdministrativeLevel[];
  @IsOptional() @IsDateString() effectiveAt?: string;
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
export class MoveAreaDto {
  @IsUUID() newParentId!: string;
  @IsString() @MinLength(2) @MaxLength(1000) reason!: string;
}
export class CreateBoundaryDto {
  @IsObject() geoJson!: Record<string, unknown>;
  @IsOptional() @IsUUID() dataSourceId?: string;
  @IsEnum(BoundaryQualityStatus) qualityStatus!: BoundaryQualityStatus;
  @IsDateString() effectiveFrom!: string;
}
export class BoundaryActionDto {
  @IsString() @MinLength(2) @MaxLength(1000) reason!: string;
  @IsOptional() @IsDateString() effectiveFrom?: string;
}
export class CreateAreaImportDto {
  @IsUUID() fileId!: string;
  @IsString() @MaxLength(200) name!: string;
  @IsString() @MaxLength(80) sourceType!: string;
  @IsOptional() @IsString() @MaxLength(500) referenceUrl?: string;
  @IsOptional() @IsString() @MaxLength(100) versionLabel?: string;
  @IsOptional() @IsDateString() effectiveDate?: string;
  @IsIn(['VALIDATE', 'UPSERT']) mode!: 'VALIDATE' | 'UPSERT';
}
