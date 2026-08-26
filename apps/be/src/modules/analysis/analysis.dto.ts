import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { AnalysisStatus } from '../../generated/prisma/client.js';
import { SortOrder } from '../../common/dto/sort-order.dto.js';

export enum AnalysisSortField {
  UPDATED_AT = 'updatedAt',
}

export class AnalysisQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsEnum(AnalysisStatus) status?: AnalysisStatus;
  @IsOptional() @IsUUID() ownerAssignmentId?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(AnalysisSortField) sortBy?: AnalysisSortField;
  @IsOptional() @IsEnum(SortOrder) sortOrder?: SortOrder;
}

export class CreateAnalysisCaseDto {
  @IsOptional() @IsUUID() ownerAssignmentId?: string;
  @IsString() @MaxLength(300) title!: string;
  @IsOptional() @IsDateString() periodStart?: string;
  @IsOptional() @IsDateString() periodEnd?: string;
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  verificationIds?: string[];
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
