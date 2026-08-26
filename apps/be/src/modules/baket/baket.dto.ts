import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import {
  BaketStatus,
  CoverageValidationStatus,
  InformationCredibility,
  PriorityLevel,
  SourceReliability,
  VerificationStatus,
} from '../../generated/prisma/client.js';
import { SortOrder } from '../../common/dto/sort-order.dto.js';

export enum BaketSortField {
  UPDATED_AT = 'updatedAt',
}

export class BaketQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsEnum(BaketStatus) status?: BaketStatus;
  @IsOptional() @IsString() statuses?: string;
  @IsOptional() @IsEnum(PriorityLevel) urgency?: PriorityLevel;
  @IsOptional() @IsUUID() createdByAssignmentId?: string;
  @IsOptional() @IsUUID() taskAssignmentId?: string;
  @IsOptional() @IsUUID() jaringId?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsUUID() areaId?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional()
  @IsEnum(CoverageValidationStatus)
  coverageStatus?: CoverageValidationStatus;
  @IsOptional() @IsEnum(BaketSortField) sortBy?: BaketSortField;
  @IsOptional() @IsEnum(SortOrder) sortOrder?: SortOrder;
}

export class UpdateBaketMetadataDto {
  @IsUUID() reportCategoryId!: string;
  @IsOptional() @IsUUID() taskAssignmentId?: string | null;
}

export class BaketPatchDto {
  @IsOptional() @IsString() originalContent?: string;
  @IsOptional() @IsString() normalizedContent?: string;
  @IsOptional() @IsNumber() @Min(-90) @Max(90) latitude?: number;
  @IsOptional() @IsNumber() @Min(-180) @Max(180) longitude?: number;
  @IsOptional() @IsEnum(PriorityLevel) urgency?: PriorityLevel;
  @IsOptional() @IsString() fieldOfficerNote?: string;
}

export class ConfirmationDto {
  @IsString() confirmation!: string;
}

export class VerificationQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsEnum(VerificationStatus) status?: VerificationStatus;
  @IsOptional() @IsUUID() verifiedByAssignmentId?: string;
  @IsOptional() @IsUUID() baketId?: string;
  @IsOptional() @IsUUID() areaId?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsEnum(SourceReliability) reliability?: SourceReliability;
  @IsOptional()
  @IsEnum(InformationCredibility)
  credibility?: InformationCredibility;
}

export class CreateVerificationDto {
  @IsOptional() @IsString() summary?: string;
}

export class UpdateVerificationDto {
  @IsOptional()
  @IsEnum(SourceReliability)
  sourceReliability?: SourceReliability;
  @IsOptional()
  @IsEnum(InformationCredibility)
  informationCredibility?: InformationCredibility;
  @IsOptional() @IsString() summary?: string;
}

export class CompleteVerificationDto {
  @IsString() decision!: string;
  @IsOptional() @IsString() summary?: string;
}

export class NeedsDevelopmentDto {
  @IsString() @MinLength(2) reason!: string;
  @IsString() @MinLength(2) requiredInformation!: string;
  @IsOptional() @IsDateString() dueDate?: string;
}

export class RejectVerificationDto {
  @IsString() @MinLength(2) reason!: string;
}
