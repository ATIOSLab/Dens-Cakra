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
  DirectiveStatus,
} from '../../generated/prisma/client.js';

export class DirectiveQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsEnum(DirectiveStatus) status?: DirectiveStatus;
  @IsOptional() @IsUUID() ownerUnitId?: string;
  @IsOptional() @IsUUID() areaId?: string;
  @IsOptional() @IsEnum(Classification) classification?: Classification;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() assignedToMe?: boolean;
}

export class VersionRecipientDto {
  @IsOptional() @IsUUID() targetUnitId?: string;
  @IsOptional() @IsUUID() targetPositionId?: string;
}

export class DirectiveVersionCreateDto {
  @IsString() @MaxLength(120) commandNumber!: string;
  @IsEnum(Classification) classification!: Classification;
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
  @IsUUID() ownerUnitId!: string;
  @ValidateNested()
  @Type(() => DirectiveVersionCreateDto)
  version!: DirectiveVersionCreateDto;
}

export class DirectiveRevisionPatchDto {
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
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsString() strategicIssue?: string;
  @IsOptional() @IsString() commandDescription?: string;
}

export class ReplaceAreasDto {
  @IsArray() @ArrayMinSize(1) @IsUUID(undefined, { each: true }) areaIds!: string[];
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
