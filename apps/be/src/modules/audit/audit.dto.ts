import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  AUDIT_CATEGORIES,
  AUDIT_OUTCOMES,
  AUDIT_SEVERITIES,
} from '../../common/audit/audit-forensics.js';

function optionalBoolean({ value }: { value: unknown }) {
  if (value === undefined || value === null || value === '') return undefined;
  return value === true || value === 'true' || value === '1';
}

export class AuditQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 25;
  @IsOptional() @IsString() @MaxLength(200) search?: string;
  @IsOptional() @IsUUID() actorUserProfileId?: string;
  @IsOptional() @IsUUID() actorAssignmentId?: string;
  @IsOptional() @IsString() @MaxLength(120) action?: string;
  @IsOptional() @IsIn(AUDIT_CATEGORIES) category?: string;
  @IsOptional() @IsIn(AUDIT_SEVERITIES) severity?: string;
  @IsOptional() @IsIn(AUDIT_OUTCOMES) outcome?: string;
  @IsOptional() @IsString() @MaxLength(120) entityType?: string;
  @IsOptional() @IsString() @MaxLength(120) entityId?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsString() @MaxLength(64) ipAddress?: string;
  @IsOptional() @IsString() @MaxLength(120) requestId?: string;
  @IsOptional() @IsString() @MaxLength(255) sessionId?: string;
  @IsOptional() @IsString() @MaxLength(12) httpMethod?: string;
  @IsOptional() @IsString() @MaxLength(500) requestPath?: string;
  @IsOptional() @IsString() @MaxLength(40) deviceType?: string;
  @IsOptional() @IsString() @MaxLength(80) browser?: string;
  @IsOptional() @IsString() @MaxLength(80) operatingSystem?: string;
  @IsOptional() @IsString() @MaxLength(80) source?: string;
  @IsOptional() @Transform(optionalBoolean) @IsBoolean() isAnomaly?: boolean;
  @IsOptional() @Transform(optionalBoolean) @IsBoolean() isIncident?: boolean;
  @IsOptional()
  @IsIn(['createdAt', 'riskScore', 'durationMs'])
  sortBy: 'createdAt' | 'riskScore' | 'durationMs' = 'createdAt';
  @IsOptional() @IsIn(['asc', 'desc']) sortOrder: 'asc' | 'desc' = 'desc';
}
