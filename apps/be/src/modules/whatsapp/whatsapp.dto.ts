import { Type } from 'class-transformer';
import {
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
} from 'class-validator';
import {
  PriorityLevel,
  WhatsAppMessageStatus,
} from '../../generated/prisma/client.js';

export class WebhookDto {
  @IsString() externalEventId!: string;
  @IsString() externalMessageId!: string;
  @IsString() senderPhone!: string;
  @IsDateString() receivedAt!: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsNumber() @Min(-90) @Max(90) latitude?: number;
  @IsOptional() @IsNumber() @Min(-180) @Max(180) longitude?: number;
  @IsOptional() @IsNumber() gpsAccuracyMeters?: number;
  @IsOptional() @IsObject() rawPayload?: Record<string, unknown>;
}

export class MessageQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 50;
  @IsOptional() @IsString() status?: WhatsAppMessageStatus;
  @IsOptional() @IsUUID() jaringId?: string;
}

export class LinkDto {
  @IsUUID() jaringId!: string;
}

export class AssignCategoryDto {
  @IsUUID() categoryId!: string;
}

export class CreateBaketFromMessageDto {
  @IsUUID() categoryId!: string;
  @IsEnum(PriorityLevel) urgency!: PriorityLevel;
  @IsOptional() @IsString() normalizedContent?: string;
  @IsOptional() @IsString() @MaxLength(3000) fieldOfficerNote?: string;
  @IsOptional() @IsUUID() taskAssignmentId?: string;
}

export class ResolveDto {
  @IsOptional() @IsUUID() areaId?: string;
  @IsOptional() @IsString() reason?: string;
}

export class ReasonDto {
  @IsOptional() @IsString() @MaxLength(1000) reason?: string;
}

export class DuplicateDto extends ReasonDto {
  @IsUUID() duplicateOfMessageId!: string;
}
