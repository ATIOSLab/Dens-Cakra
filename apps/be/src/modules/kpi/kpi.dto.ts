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
  MaxLength,
  Min,
} from 'class-validator';

export enum KpiPeriod {
  TODAY = 'TODAY',
  YESTERDAY = 'YESTERDAY',
  LAST_7_DAYS = 'LAST_7_DAYS',
  LAST_14_DAYS = 'LAST_14_DAYS',
  LAST_30_DAYS = 'LAST_30_DAYS',
  THIS_WEEK = 'THIS_WEEK',
  PREVIOUS_WEEK = 'PREVIOUS_WEEK',
  THIS_MONTH = 'THIS_MONTH',
  PREVIOUS_MONTH = 'PREVIOUS_MONTH',
  THIS_YEAR = 'THIS_YEAR',
  CUSTOM = 'CUSTOM',
}

export enum KpiRegionLevel {
  PROVINCE = 'PROVINCE',
  REGENCY = 'REGENCY',
  DISTRICT = 'DISTRICT',
}

export enum KpiJaringStatusFilter {
  ALL = 'ALL',
  ACTIVE_VERIFIED = 'ACTIVE_VERIFIED',
  VERIFIED_INACTIVE = 'VERIFIED_INACTIVE',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  REJECTED = 'REJECTED',
  UNVERIFIED = 'UNVERIFIED',
  OTHER = 'OTHER',
  PRODUCTIVE = 'PRODUCTIVE',
  NOT_REPORTING = 'NOT_REPORTING',
}

export enum KpiReportStatusFilter {
  ALL = 'ALL',
  VALID = 'VALID',
  IN_PROGRESS = 'IN_PROGRESS',
  READY_FOR_BAKET = 'READY_FOR_BAKET',
  BAKET_CREATED = 'BAKET_CREATED',
  NOT_BAKET = 'NOT_BAKET',
  FAILED = 'FAILED',
  OTHER = 'OTHER',
}

export enum KpiBaketSourceFilter {
  ALL = 'ALL',
  FROM_REPORT = 'FROM_REPORT',
  MANUAL = 'MANUAL',
  HAS_SOURCE = 'HAS_SOURCE',
  NO_SOURCE = 'NO_SOURCE',
}

export enum KpiKendalaFilter {
  ALL = 'ALL',
  DISCONNECTED = 'DISCONNECTED',
  ERROR = 'ERROR',
  INACTIVE = 'INACTIVE',
  SUSPEND = 'SUSPEND',
  UNKNOWN = 'UNKNOWN',
}

export enum KpiAnomalyFilter {
  ALL = 'ALL',
  PENDING_REPORTING = 'PENDING_REPORTING',
  REJECTED_REPORTING = 'REJECTED_REPORTING',
  UNVERIFIED_REPORTING = 'UNVERIFIED_REPORTING',
  INACTIVE_REPORTING = 'INACTIVE_REPORTING',
  SENDER_MISMATCH = 'SENDER_MISMATCH',
  NOT_WHITELISTED = 'NOT_WHITELISTED',
  DUPLICATE_REPORT = 'DUPLICATE_REPORT',
  REPORT_WITHOUT_JARING = 'REPORT_WITHOUT_JARING',
  JARING_WITHOUT_AREA = 'JARING_WITHOUT_AREA',
  BAKET_WITHOUT_SOURCE = 'BAKET_WITHOUT_SOURCE',
  INVALID_AREA_RELATION = 'INVALID_AREA_RELATION',
  UNMAPPED_STATUS = 'UNMAPPED_STATUS',
  ACTIVE_VERIFIED_FAILED = 'ACTIVE_VERIFIED_FAILED',
  REPORT_FAILED_WHEN_OFFLINE = 'REPORT_FAILED_WHEN_OFFLINE',
}

export class KpiQueryDto {
  @IsOptional() @IsEnum(KpiPeriod) period: KpiPeriod = KpiPeriod.LAST_30_DAYS;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional()
  @IsIn(['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura'])
  timezone: 'Asia/Jakarta' | 'Asia/Makassar' | 'Asia/Jayapura' = 'Asia/Jakarta';

  /** Wilayah terpilih (drill-down). Diperbolehkan hanya bila masih dalam scope. */
  @IsOptional() @IsUUID() areaId?: string;
  /** Level agregasi untuk perbandingan wilayah. */
  @IsOptional() @IsEnum(KpiRegionLevel) childLevel?: KpiRegionLevel;

  @IsOptional()
  @IsEnum(KpiJaringStatusFilter)
  jaringStatus?: KpiJaringStatusFilter;
  @IsOptional()
  @IsEnum(KpiReportStatusFilter)
  reportStatus?: KpiReportStatusFilter;
  @IsOptional()
  @IsEnum(KpiBaketSourceFilter)
  baketSource?: KpiBaketSourceFilter;
  @IsOptional() @IsEnum(KpiKendalaFilter) kendalaType?: KpiKendalaFilter;
  @IsOptional() @IsEnum(KpiAnomalyFilter) anomalyType?: KpiAnomalyFilter;

  @IsOptional() @IsString() @MaxLength(120) search?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit = 20;

  @IsOptional()
  @IsIn(['productivity', 'reports', 'baket', 'notReporting', 'activeVerified'])
  sortBy?:
    'productivity' | 'reports' | 'baket' | 'notReporting' | 'activeVerified';

  @IsOptional() @IsIn(['asc', 'desc']) sortOrder: 'asc' | 'desc' = 'desc';
}

export class KpiDetailQueryDto extends KpiQueryDto {
  @IsOptional() @IsString() dimension: string = 'wilayah';
  @IsOptional() @IsString() metric: string = 'totalReports';
}

export class KpiExportQueryDto extends KpiQueryDto {
  @IsIn(['pdf', 'word', 'excel', 'markdown'])
  format: 'pdf' | 'word' | 'excel' | 'markdown' = 'markdown';
}
