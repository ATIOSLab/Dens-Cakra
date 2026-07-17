import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
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
import { JaringStatus } from '../../generated/prisma/client.js';

export class JaringQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() status?: JaringStatus;
}

export class CreateJaringDto {
  @IsOptional() @IsString() @MaxLength(150) aliasName?: string;
  @IsString() @MaxLength(30) whatsappNumber!: string;
  @IsOptional() @IsUUID() clusterId?: string;
  @IsUUID() fieldOfficerAssignmentId!: string;
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  areaIds!: string[];
  @IsOptional() @IsString() @MaxLength(3000) notes?: string;
}

export class UpdateJaringDto {
  @IsOptional() @IsString() @MaxLength(150) aliasName?: string;
  @IsOptional() @IsUUID() clusterId?: string;
  @IsOptional() @IsString() @MaxLength(3000) notes?: string;
}

export class JaringClusterQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit = 100;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsBoolean() @Type(() => Boolean) includeInactive = false;
}

export class CreateJaringClusterDto {
  @IsOptional() @IsString() @MaxLength(80) code?: string;
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
}

export class UpdateJaringClusterDto {
  @IsOptional() @IsString() @MaxLength(80) code?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class ReportCategoryQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit = 100;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsBoolean() @Type(() => Boolean) includeInactive = false;
}

export class CreateReportCategoryDto {
  @IsOptional() @IsString() @MaxLength(80) code?: string;
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
}

export class UpdateReportCategoryDto {
  @IsOptional() @IsString() @MaxLength(80) code?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class ReasonDto {
  @IsString() @MinLength(2) @MaxLength(1000) reason!: string;
}

export class TransferDto extends ReasonDto {
  @IsUUID() fieldOfficerAssignmentId!: string;
}

export class CoverageItem {
  @IsUUID() areaId!: string;
  @IsBoolean() isPrimary!: boolean;
}

export class CoverageDto extends ReasonDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CoverageItem)
  areas!: CoverageItem[];
}
