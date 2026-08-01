import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
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
  UukStrSectionType,
  UukStrStatus,
} from '../../generated/prisma/client.js';
import { SortOrder } from '../../common/dto/sort-order.dto.js';

export enum UukSortField {
  UPDATED_AT = 'updatedAt',
  DUE_DATE = 'dueDate',
}

export class UukQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsEnum(UukStrStatus) status?: UukStrStatus;
  @IsOptional() @IsUUID() ownerAssignmentId?: string;
  @IsOptional() @IsUUID() directiveId?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(UukSortField) sortBy?: UukSortField;
  @IsOptional() @IsEnum(SortOrder) sortOrder?: SortOrder;
}

export class SectionItemDto {
  @IsString() @MaxLength(30) itemCode!: string;
  @IsString() content!: string;
  @Type(() => Number) @IsInt() @Min(1) orderNumber!: number;
}

export class SectionDto {
  @IsEnum(UukStrSectionType) sectionType!: UukStrSectionType;
  @IsString() @MaxLength(250) title!: string;
  @Type(() => Number) @IsInt() @Min(1) orderNumber!: number;
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SectionItemDto)
  items!: SectionItemDto[];
}

export class CreateUukDto {
  @IsUUID() directiveVersionId!: string;
  @IsUUID() ownerAssignmentId!: string;
  @IsString() @MaxLength(300) title!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SectionDto)
  sections!: SectionDto[];
}

export class CreateUukRevisionDto {
  @IsOptional() @IsUUID() basedOnVersionId?: string;
  @IsString() @MaxLength(300) title!: string;
  @IsString() @MinLength(2) @MaxLength(2000) changeReason!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SectionDto)
  sections!: SectionDto[];
}

export class UpdateUukVersionDto {
  @IsString() @MaxLength(300) title!: string;
  @IsOptional() @IsString() @MaxLength(2000) changeReason?: string;
}

export class ReplaceSectionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SectionDto)
  sections!: SectionDto[];
}

export class PublishDto {
  @IsString() confirmation!: string;
}

export class CancelDto {
  @IsString() @MinLength(2) @MaxLength(2000) reason!: string;
}
