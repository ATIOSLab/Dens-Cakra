import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsObject,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  Classification,
  DirectiveStatus,
  PriorityLevel,
} from '../../generated/prisma/client.js';
import { SortOrder } from '../../common/dto/sort-order.dto.js';

export enum DirectiveSortField {
  UPDATED_AT = 'updatedAt',
  DUE_DATE = 'dueDate',
  EFFECTIVE_DEADLINE = 'effectiveDeadline',
}

export class DirectiveQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsEnum(DirectiveStatus) status?: DirectiveStatus;
  @IsOptional() @IsUUID() ownerAssignmentId?: string;
  @IsOptional() @IsUUID() areaId?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() assignedToMe?: boolean;
  @IsOptional() @IsEnum(DirectiveSortField) sortBy?: DirectiveSortField;
  @IsOptional() @IsEnum(SortOrder) sortOrder?: SortOrder;
}

export enum DirectiveAiScope {
  FULL = 'full',
  EEI = 'eei',
  COLLECTION = 'collection',
  RECOMMENDATION = 'recommendation',
  POLISH = 'polish',
}

export class GenerateDirectiveAiDto {
  @IsEnum(DirectiveAiScope) scope!: DirectiveAiScope;
  @IsString() @MinLength(3) @MaxLength(10000) strategicIssue!: string;
  @IsOptional() @IsString() @MaxLength(500) title?: string;
  @IsOptional() @IsString() @MaxLength(20000) commandNarrative?: string;
  @IsOptional() @IsObject() sections?: Record<string, string>;
  @IsOptional() @IsObject() context?: Record<string, unknown>;
}

export class VersionRecipientDto {
  @IsOptional() @IsUUID() targetAssignmentId?: string;
}

export class DirectiveVersionCreateDto {
  @IsString() @MinLength(3) @MaxLength(120) commandNumber!: string;
  @IsEnum(Classification) classification!: Classification;
  @IsOptional() @IsEnum(PriorityLevel) urgency?: PriorityLevel;
  @IsString() @MaxLength(250) commandSource!: string;
  @IsString() @MaxLength(250) commandIssuer!: string;
  @IsDateString() commandDate!: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsString() strategicIssue?: string;
  @IsString() commandDescription!: string;
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  targetAreaIds!: string[];
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => VersionRecipientDto)
  recipients!: VersionRecipientDto[];
}

export class CreateDirectiveDto {
  @IsUUID() ownerAssignmentId!: string;
  @ValidateNested()
  @Type(() => DirectiveVersionCreateDto)
  version!: DirectiveVersionCreateDto;
}

export class DirectiveRevisionPatchDto {
  @IsOptional() @IsEnum(PriorityLevel) urgency?: PriorityLevel;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsString() strategicIssue?: string;
  @IsOptional() @IsString() commandDescription?: string;
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  targetAreaIds?: string[];
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => VersionRecipientDto)
  recipients?: VersionRecipientDto[];
}

export class CreateDirectiveRevisionDto {
  @IsOptional() @IsUUID() basedOnVersionId?: string;
  @IsString() @MinLength(2) @MaxLength(2000) changeReason!: string;
  @ValidateNested()
  @Type(() => DirectiveRevisionPatchDto)
  patch!: DirectiveRevisionPatchDto;
}

export class UpdateDirectiveVersionDto {
  @IsOptional() @IsEnum(PriorityLevel) urgency?: PriorityLevel;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsString() strategicIssue?: string;
  @IsOptional() @IsString() commandDescription?: string;
}

export class ReplaceAreasDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  areaIds!: string[];
  @IsOptional() @IsUUID() primaryAreaId?: string;
}

export class ReplaceRecipientsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => VersionRecipientDto)
  recipients!: VersionRecipientDto[];
}

export class PublishDirectiveDto {
  @IsString() confirmation!: string;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}

export class DistributeDirectiveDto {
  @IsBoolean() sendNotifications!: boolean;
  @IsOptional() @IsDateString() scheduledAt?: string;
}

export class OptionalNoteDto {
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}

export class RequiredReasonDto {
  @IsString() @MinLength(2) @MaxLength(2000) reason!: string;
}
