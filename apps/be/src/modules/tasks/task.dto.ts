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
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  Classification,
  PriorityLevel,
  TaskAssignmentStatus,
  TaskStatus,
} from '../../generated/prisma/client.js';
import { SortOrder } from '../../common/dto/sort-order.dto.js';

export enum TaskSortField {
  DUE_DATE = 'dueDate',
  EFFECTIVE_DUE_DATE = 'effectiveDueDate',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export class TaskQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsEnum(TaskStatus) status?: TaskStatus;
  @IsOptional() @IsEnum(PriorityLevel) priority?: PriorityLevel;
  @IsOptional() @IsString() @MaxLength(200) search?: string;
  @IsOptional() @IsEnum(Classification) classification?: Classification;
  @IsOptional() @IsEnum(PriorityLevel) sourceUrgency?: PriorityLevel;
  @IsOptional() @IsUUID() ownerAssignmentId?: string;
  @IsOptional() @IsUUID() assigneeAssignmentId?: string;
  @IsOptional() @IsUUID() relatedAssignmentId?: string;
  @IsOptional() @IsEnum(TaskAssignmentStatus) assignmentStatus?: TaskAssignmentStatus;
  @IsOptional() @IsUUID() areaId?: string;
  @IsOptional() @IsDateString() dueBefore?: string;
  @IsOptional() @IsDateString() dueAfter?: string;
  @IsOptional() @IsDateString() effectiveDueBefore?: string;
  @IsOptional() @IsDateString() effectiveDueAfter?: string;
  @IsOptional() @IsUUID() parentTaskId?: string;
  @IsOptional() @IsUUID() directiveId?: string;
  @IsOptional() @IsUUID() uukStrId?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() overdue?: boolean;
  @IsOptional() @IsEnum(TaskSortField) sortBy?: TaskSortField;
  @IsOptional() @IsEnum(SortOrder) sortOrder?: SortOrder;
  @IsOptional() @Type(() => Boolean) @IsBoolean() paginated?: boolean;
}

export class CreateTaskDto {
  @IsOptional() @IsUUID() parentTaskId?: string;
  @IsOptional() @IsUUID() directiveVersionId?: string;
  @IsOptional() @IsUUID() uukStrVersionId?: string;
  @IsUUID() ownerAssignmentId!: string;
  @IsString() @MaxLength(300) title!: string;
  @IsString() @MaxLength(10000) description!: string;
  @IsEnum(PriorityLevel) priority!: PriorityLevel;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  targetAreaIds!: string[];
}

export class UpdateTaskDto {
  @IsOptional() @IsString() @MaxLength(300) title?: string;
  @IsOptional() @IsString() @MaxLength(10000) description?: string;
  @IsOptional() @IsEnum(PriorityLevel) priority?: PriorityLevel;
  @IsOptional() @IsDateString() dueDate?: string;
}

export class TargetAreasDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  areaIds!: string[];
  @IsOptional() @IsUUID() primaryAreaId?: string;
}

export class AssignmentItem {
  @IsUUID() assigneeAssignmentId!: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsString() @MaxLength(2000) assignmentNote?: string;
}

export class AssignTaskDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AssignmentItem)
  assignments!: AssignmentItem[];
}

export class ProgressDto {
  @Type(() => Number) @IsInt() @Min(0) @Max(100) progressPercent!: number;
  @IsOptional() @IsString() @MaxLength(3000) note?: string;
}

export class NoteDto {
  @IsOptional() @IsString() @MaxLength(3000) note?: string;
}

export class ReasonDto {
  @IsString() @MinLength(2) @MaxLength(3000) reason!: string;
}

export class ReassignDto extends ReasonDto {
  @IsUUID() assigneeAssignmentId!: string;
  @IsOptional() @IsDateString() dueDate?: string;
}

export class ForwardJaringInstructionDto {
  @IsString() @MinLength(2) @MaxLength(5000) instruction!: string;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  jaringIds?: string[];
}
