import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  AlertSeverity,
  BaketStatus,
  Classification,
  JaringRegistrationStatus,
  JaringStatus,
  PriorityLevel,
  ProductStatus,
} from '../../generated/prisma/client.js';
import { SortOrder } from '../../common/dto/sort-order.dto.js';
import {
  FieldIntelligencePeriod,
  JaringActivityLevel,
} from './field-intelligence.util.js';

export enum ProductSortField {
  UPDATED_AT = 'updatedAt',
  PERIOD_START = 'periodStart',
}

export class ProductTypeQuery {
  @IsOptional() @Type(() => Boolean) isActive?: boolean;
}

export class ProductTemplateListQuery {
  @IsOptional() @Type(() => Boolean) activeOnly = false;
}

export class ProductQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
  @IsOptional() @IsEnum(Classification) classification?: Classification;
  @IsOptional() @IsUUID() productTypeId?: string;
  @IsOptional() @IsUUID() ownerAssignmentId?: string;
  @IsOptional() @IsUUID() areaId?: string;
  @IsOptional() @IsDateString() periodFrom?: string;
  @IsOptional() @IsDateString() periodTo?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsUUID() createdByAssignmentId?: string;
  @IsOptional() @IsEnum(ProductSortField) sortBy?: ProductSortField;
  @IsOptional() @IsEnum(SortOrder) sortOrder?: SortOrder;
}

export class ProductVersionAttachmentDto {
  @IsUUID() fileId!: string;
  @IsOptional() @IsString() caption?: string;
}

export class ProductVersionPayloadDto {
  @IsUUID() templateId!: string;
  @IsOptional() @IsString() routingTo?: string;
  @IsOptional() @IsString() routingFrom?: string;
  @IsOptional() @IsString() routingCc?: string;
  @IsOptional() @IsString() @MaxLength(500) subject?: string;
  @IsObject() content!: Record<string, unknown>;
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  sourceVerificationIds?: string[];
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  sourceAnalysisVersionIds?: string[];
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVersionAttachmentDto)
  attachmentFileIds?: ProductVersionAttachmentDto[];
}

export class CreateProductDto {
  @IsUUID() productTypeId!: string;
  @IsOptional() @IsUUID() ownerAssignmentId?: string;
  @IsOptional() @IsString() @MaxLength(150) productNumber?: string;
  @IsEnum(Classification) classification!: Classification;
  @IsString() @MaxLength(300) title!: string;
  @IsOptional() @IsDateString() periodStart?: string;
  @IsOptional() @IsDateString() periodEnd?: string;
  @ValidateNested()
  @Type(() => ProductVersionPayloadDto)
  version!: ProductVersionPayloadDto;
}

export class SubmitProductDto {
  @IsUUID() versionId!: string;
  @IsString() confirmation!: string;
}

export class ApprovalWorkflowQuery {
  @IsOptional() @IsString() include?: string;
}

export class DashboardQuery {
  @IsOptional() @IsUUID() areaId?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsUUID() ownerAssignmentId?: string;
}

export class FieldIntelligenceDashboardQuery extends DashboardQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 12;
  @IsOptional() @IsString() @MaxLength(120) search?: string;
  @IsOptional() @IsEnum(JaringStatus) jaringStatus?: JaringStatus;
  @IsOptional()
  @IsEnum(JaringRegistrationStatus)
  registrationStatus?: JaringRegistrationStatus;
  @IsOptional() @IsEnum(BaketStatus) baketStatus?: BaketStatus;
  @IsOptional() @IsEnum(PriorityLevel) urgency?: PriorityLevel;
  @IsOptional() @IsEnum(JaringActivityLevel) activity?: JaringActivityLevel;
  @IsOptional()
  @IsEnum(FieldIntelligencePeriod)
  period: FieldIntelligencePeriod = FieldIntelligencePeriod.DAYS_30;
}

export class MapReportQuery extends DashboardQuery {
  @IsString() bbox!: string;
  @Type(() => Number) @IsInt() zoom!: number;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() urgency?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5000) limit = 500;
}

export class MapAreaSummaryQuery {
  @IsUUID() areaId!: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class EmergencyQuery {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsEnum(AlertSeverity) severity?: AlertSeverity;
  @IsOptional() @IsUUID() areaId?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsUUID() reportedByAssignmentId?: string;
}

export class AlertQuery {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsEnum(AlertSeverity) severity?: AlertSeverity;
  @IsOptional() @IsUUID() areaId?: string;
  @IsOptional() @IsUUID() assignedAssignmentId?: string;
  @IsOptional() @IsUUID() sourceBaketId?: string;
  @IsOptional() @IsUUID() sourceIncidentId?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class CreateLocationPingDto {
  @IsUUID() operationalAssignmentId!: string;
  @Type(() => Number) @IsNumber() latitude!: number;
  @Type(() => Number) @IsNumber() longitude!: number;
  @IsOptional() @Type(() => Number) @IsNumber() gpsAccuracyMeters?: number;
  @IsString() coordinateSource!: string;
  @IsDateString() capturedAt!: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isStealth?: boolean;
}

export class PersonnelLocationMapQuery {
  @IsOptional() @IsUUID() areaId?: string;
  @IsOptional() @IsUUID() unitId?: string;
  @IsOptional() @IsDateString() capturedAfter?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() includeStealth = false;
}
