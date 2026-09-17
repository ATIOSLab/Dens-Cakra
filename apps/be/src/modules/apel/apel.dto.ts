import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ApelChannelSelectionMode,
  ApelSessionStatus,
  ApelAttendanceStatus,
} from '../../generated/prisma/client.js';

export class CreateApelConfigDto {
  @IsNotEmpty()
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  targetType?: string = 'AREA'; // "ALL" | "AREA" | "GASWIL" | "JARING"

  @IsOptional()
  @IsUUID()
  areaId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  targetGaswilIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  targetJaringIds?: string[];

  @IsOptional()
  @IsEnum(ApelChannelSelectionMode)
  channelSelectionMode?: ApelChannelSelectionMode = ApelChannelSelectionMode.MANUAL;

  @IsOptional()
  @IsUUID()
  selectedChannelId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  selectedChannelIds?: string[];

  @IsNotEmpty()
  @IsString()
  messageTemplate!: string;

  @IsOptional()
  @IsString()
  attendanceReplyTemplate?: string;

  @IsNotEmpty()
  @IsString()
  scheduleTime!: string; // Format "HH:mm"

  @IsNotEmpty()
  @IsString()
  deadlineTime!: string; // Format "HH:mm"

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(1440)
  deadlineMinutes?: number = 90;

  @IsOptional()
  @IsBoolean()
  requireLocation?: boolean = true;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(3)
  @Max(60)
  minDelaySeconds?: number = 8;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(120)
  maxDelaySeconds?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  batchSize?: number = 5;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(300)
  batchPauseSeconds?: number = 30;
}

export class UpdateApelConfigDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  targetType?: string; // "ALL" | "AREA" | "GASWIL" | "JARING"

  @IsOptional()
  @IsUUID()
  areaId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  targetGaswilIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  targetJaringIds?: string[];

  @IsOptional()
  @IsEnum(ApelChannelSelectionMode)
  channelSelectionMode?: ApelChannelSelectionMode;

  @IsOptional()
  @IsUUID()
  selectedChannelId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  selectedChannelIds?: string[];

  @IsOptional()
  @IsString()
  messageTemplate?: string;

  @IsOptional()
  @IsString()
  attendanceReplyTemplate?: string;

  @IsOptional()
  @IsString()
  scheduleTime?: string;

  @IsOptional()
  @IsString()
  deadlineTime?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(1440)
  deadlineMinutes?: number;

  @IsOptional()
  @IsBoolean()
  requireLocation?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(3)
  @Max(60)
  minDelaySeconds?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(120)
  maxDelaySeconds?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  batchSize?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(300)
  batchPauseSeconds?: number;
}

export class TriggerApelBlastDto {
  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsUUID()
  configId?: string;

  @IsOptional()
  @IsString()
  targetType?: string = 'AREA'; // "ALL" | "AREA" | "GASWIL" | "JARING"

  @IsOptional()
  @IsUUID()
  areaId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  targetGaswilIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  targetJaringIds?: string[];

  @IsOptional()
  @IsUUID()
  channelId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  channelIds?: string[];

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  messageTemplate?: string;

  @IsOptional()
  @IsString()
  attendanceReplyTemplate?: string;

  @IsOptional()
  @IsString()
  deadlineTime?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(1440)
  deadlineMinutes?: number = 90;

  @IsOptional()
  @IsBoolean()
  requireLocation?: boolean;
}

export class ApelMapDataQueryDto {
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsUUID()
  areaId?: string;
}

export class ApelSessionQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsUUID()
  areaId?: string;

  @IsOptional()
  @IsEnum(ApelSessionStatus)
  status?: ApelSessionStatus;
}

export class ApelAttendanceQueryDto {
  @IsOptional()
  @IsEnum(ApelAttendanceStatus)
  status?: ApelAttendanceStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number = 200;
}
