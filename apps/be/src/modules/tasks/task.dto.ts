import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
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
  TaskStatus,
} from '../../generated/prisma/client.js';

export class TaskQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsEnum(TaskStatus) status?: TaskStatus;
  @IsOptional() @IsUUID() ownerUnitId?: string;
  @IsOptional() @IsUUID() areaId?: string;
}

export class CreateTaskDto {
  @IsOptional() @IsUUID() parentTaskId?: string;
  @IsOptional() @IsUUID() directiveVersionId?: string;
  @IsOptional() @IsUUID() uukStrVersionId?: string;
  @IsUUID() ownerUnitId!: string;
  @IsString() @MaxLength(300) title!: string;
  @IsString() @MaxLength(10000) description!: string;
  @IsEnum(Classification) classification!: Classification;
  @IsEnum(PriorityLevel) priority!: PriorityLevel;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  targetAreaIds!: string[];
}

export class UpdateTaskDto {
  @IsOptional() @IsString() @MaxLength(300) title?: string;
  @IsOptional() @IsString() @MaxLength(10000) description?: string;
  @IsOptional() @IsEnum(PriorityLevel) priority?: PriorityLevel;
  @IsOptional() @IsDateString() dueDate?: string;
}

export class TargetAreasDto {
  @IsArray() @ArrayMinSize(1) @IsUUID('4', { each: true }) areaIds!: string[];
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
