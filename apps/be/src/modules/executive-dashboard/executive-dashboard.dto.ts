import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import {
  BaketStatus,
  CoordinateSource,
  PriorityLevel,
  VerificationStatus,
  WhatsAppReportSessionStatus,
} from '../../generated/prisma/client.js';

export enum ExecutiveDashboardPeriod {
  TODAY = 'TODAY',
  LAST_7_DAYS = 'LAST_7_DAYS',
  LAST_30_DAYS = 'LAST_30_DAYS',
  CURRENT_MONTH = 'CURRENT_MONTH',
  CURRENT_YEAR = 'CURRENT_YEAR',
  CUSTOM = 'CUSTOM',
}

export class ExecutiveDashboardQueryDto {
  @IsOptional()
  @IsEnum(ExecutiveDashboardPeriod)
  period: ExecutiveDashboardPeriod = ExecutiveDashboardPeriod.LAST_30_DAYS;

  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsIn(['Asia/Jakarta']) timezone = 'Asia/Jakarta';

  @IsOptional() @IsUUID() areaId?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsUUID() productTypeId?: string;
  @IsOptional() @IsUUID() jaringId?: string;
  @IsOptional() @IsUUID() fieldOfficerAssignmentId?: string;

  @IsOptional() @IsEnum(PriorityLevel) urgency?: PriorityLevel;
  @IsOptional()
  @IsEnum(WhatsAppReportSessionStatus)
  reportStatus?: WhatsAppReportSessionStatus;
  @IsOptional() @IsEnum(BaketStatus) workflowStatus?: BaketStatus;
  @IsOptional()
  @IsEnum(VerificationStatus)
  validationStatus?: VerificationStatus;
  @IsOptional() @IsEnum(CoordinateSource) coordinateSource?: CoordinateSource;
  @IsOptional() @IsIn(['WHATSAPP']) source?: 'WHATSAPP';

  @IsOptional()
  @IsIn(['COMPLETE', 'INCOMPLETE'])
  completeness?: 'COMPLETE' | 'INCOMPLETE';

  @IsOptional()
  @IsIn(['WAITING', 'NEEDS_REVIEW', 'VERIFIED'])
  verificationStatus?: 'WAITING' | 'NEEDS_REVIEW' | 'VERIFIED';

  @IsOptional() @IsIn(['true', 'false']) hasAttachment?: 'true' | 'false';

  @IsOptional()
  @IsIn(['WITHIN_SCOPE', 'OUTSIDE_SCOPE', 'BORDER_AMBIGUOUS', 'NOT_CHECKED'])
  locationSuitability?:
    'WITHIN_SCOPE' | 'OUTSIDE_SCOPE' | 'BORDER_AMBIGUOUS' | 'NOT_CHECKED';
}

export class ExecutiveDashboardFilterQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsUUID() areaId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit = 100;
}
