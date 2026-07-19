import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  AnalysisStatus,
  IntelEntityType,
} from '../../generated/prisma/client.js';
import { SortOrder } from '../../common/dto/sort-order.dto.js';

export enum AnalysisSortField {
  UPDATED_AT = 'updatedAt',
}

export class AnalysisQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsEnum(AnalysisStatus) status?: AnalysisStatus;
  @IsOptional() @IsUUID() ownerUnitId?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(AnalysisSortField) sortBy?: AnalysisSortField;
  @IsOptional() @IsEnum(SortOrder) sortOrder?: SortOrder;
}

export class CreateAnalysisCaseDto {
  @IsOptional() @IsUUID() ownerUnitId?: string;
  @IsString() @MaxLength(300) title!: string;
  @IsOptional() @IsDateString() periodStart?: string;
  @IsOptional() @IsDateString() periodEnd?: string;
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  verificationIds?: string[];
}

export class UpdateAnalysisCaseDto {
  @IsOptional() @IsString() @MaxLength(300) title?: string;
  @IsOptional() @IsDateString() periodStart?: string;
  @IsOptional() @IsDateString() periodEnd?: string;
}

export class ReplaceSourcesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  verificationIds!: string[];
}

export class CreateAnalysisVersionDto {
  @IsOptional() @IsUUID() basedOnVersionId?: string;
  @IsOptional() @IsString() indications?: string;
  @IsOptional() @IsString() analysis?: string;
  @IsOptional() @IsString() impact?: string;
  @IsOptional() @IsString() efforts?: string;
  @IsOptional() @IsString() recommendations?: string;
}

export class UpdateAnalysisVersionDto extends CreateAnalysisVersionDto {}

export class FinalizeAnalysisDto extends CreateAnalysisVersionDto {}

export class SubmitAnalysisReviewDto {
  @IsOptional() @IsString() note?: string;
}

export class AnalysisEntityDto {
  @IsEnum(IntelEntityType) entityType!: IntelEntityType;
  @IsString() @MaxLength(250) name!: string;
  @IsOptional() @IsString() @MaxLength(250) normalizedName?: string;
  @IsOptional() metadata?: Record<string, unknown>;
}

export class ReplaceEntitiesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnalysisEntityDto)
  entities!: AnalysisEntityDto[];
}

export class AnalysisRelationshipDto {
  @IsUUID() fromEntityId!: string;
  @IsUUID() toEntityId!: string;
  @IsString() @MaxLength(120) relationshipType!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(100) confidence?: number;
}

export class ReplaceRelationshipsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnalysisRelationshipDto)
  relationships!: AnalysisRelationshipDto[];
}

export class ValidateAnalysisDto {
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}

export class ArchiveAnalysisDto {
  @IsOptional() @IsString() @MaxLength(1000) reason?: string;
}
