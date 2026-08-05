import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
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
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  BaketStatus,
  CoverageScopeType,
  CoverageValidationStatus,
  InformationCredibility,
  PriorityLevel,
  RevisionRequestStatus,
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

export class BaketVersionPayloadDto {
  @IsString() originalContent!: string;
  @IsOptional() @IsString() normalizedContent?: string;
  @IsOptional() @IsNumber() @Min(-90) @Max(90) latitude?: number;
  @IsOptional() @IsNumber() @Min(-180) @Max(180) longitude?: number;
  @IsOptional() @IsEnum(PriorityLevel) urgency?: PriorityLevel;
  @IsOptional() @IsString() fieldOfficerNote?: string;
}

export class BaketAttachmentDto {
  @IsUUID() fileId!: string;
  @IsOptional() @IsString() caption?: string;
}

export class CreateBaketDto {
  @IsUUID() reportCategoryId!: string;
  @IsOptional() @IsUUID() taskAssignmentId?: string;
  @IsOptional() @IsUUID() primaryJaringId?: string;
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  sourceMessageIds?: string[];
  @ValidateNested()
  @Type(() => BaketVersionPayloadDto)
  version!: BaketVersionPayloadDto;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BaketAttachmentDto)
  attachments?: BaketAttachmentDto[];
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

export class CreateBaketRevisionDto {
  @IsUUID() basedOnVersionId!: string;
  @IsString() @MinLength(2) @MaxLength(2000) revisionReason!: string;
  @ValidateNested() @Type(() => BaketPatchDto) patch!: BaketPatchDto;
}

export class ReplaceMessagesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  messageIds!: string[];
}

export class ReplaceAttachmentsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BaketAttachmentDto)
  attachments!: BaketAttachmentDto[];
}

export class ResolveAreaDto {
  @IsBoolean() force!: boolean;
}

export class ManualAreaOverrideDto {
  @IsUUID() eventAreaId!: string;
  @IsString() @MinLength(2) @MaxLength(2000) reason!: string;
}

export class ValidateCoverageDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(CoverageScopeType, { each: true })
  scopeTypes!: CoverageScopeType[];
}

export class ConfirmationDto {
  @IsString() confirmation!: string;
}

export class ResubmitDto {
  @IsUUID() versionId!: string;
  @IsUUID() revisionRequestId!: string;
}

export class RevisionRequestQuery {
  @IsOptional() @IsEnum(RevisionRequestStatus) status?: RevisionRequestStatus;
}

export class CreateRevisionRequestDto {
  @IsUUID() requestedAgainstVersionId!: string;
  @IsString() @MinLength(2) reason!: string;
  @IsString() @MinLength(2) requiredInformation!: string;
  @IsOptional() @IsDateString() dueDate?: string;
}

export class ResolveRevisionRequestDto {
  @IsUUID() resolvedByVersionId!: string;
  @IsOptional() @IsString() note?: string;
}

export class CancelRevisionRequestDto {
  @IsString() @MinLength(2) reason!: string;
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

export class CrossReferenceDto {
  @IsOptional() @IsUUID() relatedBaketId?: string;
  @IsOptional() @IsString() externalRef?: string;
  @IsOptional() @IsString() description?: string;
}

export class ReplaceCrossReferencesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CrossReferenceDto)
  references!: CrossReferenceDto[];
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
