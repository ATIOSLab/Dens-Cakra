import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { OrganizationType } from '../../../generated/prisma/client.js';

export class OrganizationListQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsEnum(OrganizationType) type?: OrganizationType;
  @IsOptional() @IsUUID() parentId?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
}

export class CreateOrganizationUnitDto {
  @IsString() @MinLength(2) @MaxLength(80) code!: string;
  @IsString() @MinLength(2) @MaxLength(180) name!: string;
  @IsEnum(OrganizationType) type!: OrganizationType;
  @IsOptional() @IsUUID() parentId?: string;
}

export class UpdateOrganizationUnitDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(180) name?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class MoveOrganizationUnitDto {
  @IsUUID() newParentId!: string;
  @IsString() @MinLength(2) @MaxLength(1000) reason!: string;
}

export class OrganizationHierarchyQueryDto {
  @IsOptional() @Type(() => Boolean) @IsBoolean() includeSelf = false;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(20) depth?: number;
  @IsOptional() @IsEnum(OrganizationType) type?: OrganizationType;
}

export class OrganizationTreeQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10) maxDepth = 5;
  @IsOptional() @Type(() => Boolean) @IsBoolean() includePositions = false;
}

export class CoverageAreaDto {
  @IsUUID() areaId!: string;
  @IsBoolean() isPrimary!: boolean;
}

export class ReplaceOrganizationCoverageDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CoverageAreaDto)
  areas!: CoverageAreaDto[];
  @IsString() @MinLength(2) @MaxLength(1000) reason!: string;
}
