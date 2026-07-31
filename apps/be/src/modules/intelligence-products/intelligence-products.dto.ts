import { Type } from 'class-transformer';
import {
  ArrayMinSize,
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
  ApprovalStage,
  ApprovalStepStatus,
  AlertSeverity,
  BaketStatus,
  Classification,
  CommandRouteType,
  DistributionStatus,
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

export class CreateProductTypeDto {
  @IsString() @MaxLength(80) code!: string;
  @IsString() @MaxLength(180) name!: string;
  @IsOptional() @IsString() @MaxLength(30) formatNo?: string;
  @IsString() @MaxLength(20) numberCode!: string;
  @IsOptional() @IsString() description?: string;
}

export class UpdateProductTypeDto {
  @IsOptional() @IsString() @MaxLength(180) name?: string;
  @IsOptional() @IsString() @MaxLength(30) formatNo?: string;
  @IsOptional() @IsString() @MaxLength(20) numberCode?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
}

export class ProductTemplateListQuery {
  @IsOptional() @Type(() => Boolean) activeOnly = false;
}

export class ProductTemplateFieldDto {
  @IsString() @MaxLength(100) code!: string;
  @IsString() @MaxLength(200) label!: string;
  @IsString() @MaxLength(50) dataType!: string;
  @Type(() => Boolean) @IsBoolean() isRequired!: boolean;
  @IsInt() @Min(1) orderNumber!: number;
  @IsOptional() @IsObject() validation?: Record<string, unknown>;
}

export class ProductTemplateSectionDto {
  @IsString() @MaxLength(100) code!: string;
  @IsString() @MaxLength(200) title!: string;
  @IsInt() @Min(1) orderNumber!: number;
  @Type(() => Boolean) @IsBoolean() isRepeatable!: boolean;
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProductTemplateFieldDto)
  fields!: ProductTemplateFieldDto[];
}

export class CreateProductTemplateDto {
  @IsString() @MaxLength(180) name!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProductTemplateSectionDto)
  sections!: ProductTemplateSectionDto[];
  @IsOptional() @Type(() => Boolean) @IsBoolean() activate?: boolean;
}

export class ActivateTemplateDto {
  @IsString() reason!: string;
}

export class ValidateTemplateContentDto {
  @IsObject() content!: Record<string, unknown>;
}

export class ProductQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
  @IsOptional() @IsEnum(Classification) classification?: Classification;
  @IsOptional() @IsUUID() productTypeId?: string;
  @IsOptional() @IsUUID() ownerUnitId?: string;
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
  @IsOptional() @IsUUID() ownerUnitId?: string;
  @IsOptional() @IsString() @MaxLength(150) productNumber?: string;
  @IsEnum(Classification) classification!: Classification;
  @IsString() @MaxLength(300) title!: string;
  @IsOptional() @IsDateString() periodStart?: string;
  @IsOptional() @IsDateString() periodEnd?: string;
  @ValidateNested()
  @Type(() => ProductVersionPayloadDto)
  version!: ProductVersionPayloadDto;
}

export class UpdateProductDto {
  @IsOptional() @IsString() @MaxLength(300) title?: string;
  @IsOptional() @IsDateString() periodStart?: string;
  @IsOptional() @IsDateString() periodEnd?: string;
  @IsOptional() @IsEnum(Classification) classification?: Classification;
  @IsOptional() @IsString() @MaxLength(150) productNumber?: string;
  @IsOptional() @IsString() @MaxLength(2000) changeReason?: string;
}

export class ProductVersionListQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}

export class CreateProductRevisionDto {
  @IsUUID() basedOnVersionId!: string;
  @IsString() changeReason!: string;
  @ValidateNested()
  @Type(() => ProductVersionPayloadDto)
  patch!: ProductVersionPayloadDto;
}

export class UpdateProductVersionDto {
  @IsOptional() @IsString() routingTo?: string;
  @IsOptional() @IsString() routingFrom?: string;
  @IsOptional() @IsString() routingCc?: string;
  @IsOptional() @IsString() @MaxLength(500) subject?: string;
  @IsOptional() @IsObject() content?: Record<string, unknown>;
}

export class ReplaceSourceVerificationsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  verificationIds!: string[];
}

export class ReplaceSourceAnalysesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  analysisVersionIds!: string[];
}

export class ReplaceProductAttachmentsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVersionAttachmentDto)
  attachments!: ProductVersionAttachmentDto[];
}

export class SubmitProductDto {
  @IsUUID() versionId!: string;
  @IsString() confirmation!: string;
}

export class ArchiveProductDto {
  @IsString() reason!: string;
}

export class ApprovalInboxQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsEnum(ApprovalStage) stage?: ApprovalStage;
  @IsOptional() @IsEnum(ApprovalStepStatus) status?: ApprovalStepStatus;
  @IsOptional() @IsEnum(CommandRouteType) routeType?: CommandRouteType;
  @IsOptional() @IsUUID() areaId?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class CreateApprovalWorkflowDto {
  @IsEnum(CommandRouteType) routeType!: CommandRouteType;
  @IsUUID() regionalTargetPositionId!: string;
  @IsOptional() @IsUUID() executiveTargetPositionId?: string;
}

export class ApprovalWorkflowQuery {
  @IsOptional() @IsString() include?: string;
}

export class DecisionNoteDto {
  @IsOptional() @IsString() note?: string;
}

export class RequestRevisionDto {
  @IsString() note!: string;
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  requiredChanges!: string[];
}

export class RejectApprovalDto {
  @IsString() note!: string;
  @IsString() confirmation!: string;
}

export class ClarificationDto {
  @IsString() note!: string;
  @IsOptional() @IsDateString() dueAt?: string;
}

export class CancelWorkflowDto {
  @IsString() reason!: string;
}

export class DistributionQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsUUID() productId?: string;
  @IsOptional() @IsEnum(DistributionStatus) status?: DistributionStatus;
  @IsOptional() @IsUUID() targetUnitId?: string;
  @IsOptional() @IsUUID() targetPositionId?: string;
  @IsOptional() @IsUUID() targetUserProfileId?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class DistributionTargetDto {
  @IsOptional() @IsUUID() targetUnitId?: string;
  @IsOptional() @IsUUID() targetPositionId?: string;
  @IsOptional() @IsUUID() targetUserProfileId?: string;
}

export class CreateDistributionDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DistributionTargetDto)
  targets!: DistributionTargetDto[];
  @IsOptional() @IsString() message?: string;
}

export class MarkDeliveredDto {
  @IsDateString() deliveredAt!: string;
  @IsOptional() @IsString() providerReceipt?: string;
}

export class RetryDistributionDto {
  @IsString() reason!: string;
}

export class RevokeDistributionDto {
  @IsString() reason!: string;
}

export class DashboardQuery {
  @IsOptional() @IsUUID() areaId?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsUUID() ownerUnitId?: string;
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

export class DashboardTrendQuery extends DashboardQuery {
  @IsString() metric!: string;
  @IsString() interval!: string;
  @IsOptional() @IsString() groupBy?: string;
}

export class DashboardAreaBreakdownQuery extends DashboardQuery {
  @IsString() metric!: string;
  @IsUUID() declare areaId: string;
  @IsOptional() @IsString() childLevel?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000) limit = 100;
}

export class DashboardTaskPerformanceQuery extends DashboardQuery {
  @IsOptional() @IsUUID() unitId?: string;
  @IsString() groupBy!: string;
}

export class DashboardDirectiveProgressQuery extends DashboardQuery {
  @IsOptional() @IsUUID() directiveId?: string;
  @IsOptional() @IsUUID() unitId?: string;
}

export class DashboardVerificationQualityQuery extends DashboardQuery {
  @IsOptional() @IsUUID() unitId?: string;
}

export class MapReportQuery extends DashboardQuery {
  @IsString() bbox!: string;
  @Type(() => Number) @IsInt() zoom!: number;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() urgency?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5000) limit = 500;
}

export class MapHeatmapQuery extends MapReportQuery {
  @IsOptional() @IsString() metric?: string;
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

export class CreateEmergencyIncidentDto {
  @IsString() @MaxLength(300) title!: string;
  @IsEnum(AlertSeverity) severity!: AlertSeverity;
  @Type(() => Number) latitude!: number;
  @Type(() => Number) longitude!: number;
  @IsString() situation!: string;
  @IsOptional() @IsString() actionTaken?: string;
  @IsOptional() @IsString() needs?: string;
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  attachmentFileIds?: string[];
}

export class UpdateEmergencyIncidentDto {
  @IsOptional() @IsString() situation?: string;
  @IsOptional() @IsString() actionTaken?: string;
  @IsOptional() @IsString() needs?: string;
  @IsOptional() @IsEnum(AlertSeverity) severity?: AlertSeverity;
}

export class VerifyEmergencyIncidentDto {
  @IsString() note!: string;
  @IsEnum(AlertSeverity) verifiedSeverity!: AlertSeverity;
}

export class StartResponseDto {
  @IsOptional() @IsString() actionPlan?: string;
}

export class MarkControlledDto {
  @IsString() note!: string;
}

export class ResolveEmergencyIncidentDto {
  @IsString() resolution!: string;
  @IsOptional() @IsDateString() resolvedAt?: string;
}

export class CancelEmergencyIncidentDto {
  @IsString() reason!: string;
}

export class AlertQuery {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsEnum(AlertSeverity) severity?: AlertSeverity;
  @IsOptional() @IsUUID() areaId?: string;
  @IsOptional() @IsUUID() assignedPositionId?: string;
  @IsOptional() @IsUUID() sourceBaketId?: string;
  @IsOptional() @IsUUID() sourceIncidentId?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class CreateAlertDto {
  @IsString() @MaxLength(300) title!: string;
  @IsString() description!: string;
  @IsEnum(AlertSeverity) severity!: AlertSeverity;
  @IsOptional() @IsUUID() areaId?: string;
  @IsOptional() @Type(() => Number) latitude?: number;
  @IsOptional() @Type(() => Number) longitude?: number;
  @IsOptional() @IsUUID() sourceBaketId?: string;
  @IsOptional() @IsUUID() sourceIncidentId?: string;
  @IsOptional() @IsUUID() assignedPositionId?: string;
}

export class UpdateAlertDto {
  @IsOptional() @IsString() @MaxLength(300) title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(AlertSeverity) severity?: AlertSeverity;
}

export class AssignAlertDto {
  @IsUUID() positionId!: string;
  @IsOptional() @IsString() note?: string;
}

export class ResolveAlertDto {
  @IsString() resolution!: string;
}

export class CancelAlertDto {
  @IsString() reason!: string;
}

export class AlertSummaryQuery {
  @IsOptional() @IsUUID() areaId?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class CreateLocationPingDto {
  @IsUUID() positionAssignmentId!: string;
  @Type(() => Number) @IsNumber() latitude!: number;
  @Type(() => Number) @IsNumber() longitude!: number;
  @IsOptional() @Type(() => Number) @IsNumber() gpsAccuracyMeters?: number;
  @IsString() coordinateSource!: string;
  @IsDateString() capturedAt!: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isStealth?: boolean;
}

export class LocationHistoryQuery {
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000) limit = 100;
}

export class PersonnelLocationMapQuery {
  @IsOptional() @IsUUID() areaId?: string;
  @IsOptional() @IsUUID() unitId?: string;
  @IsOptional() @IsDateString() capturedAfter?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() includeStealth = false;
}
