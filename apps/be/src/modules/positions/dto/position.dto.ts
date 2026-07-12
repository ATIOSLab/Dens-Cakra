import { Transform, Type } from 'class-transformer';
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
import { PositionCode, RoleCode } from '../../../generated/prisma/client.js';

export class PositionListQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsEnum(PositionCode) code?: PositionCode;
  @IsOptional() @IsEnum(RoleCode) roleCode?: RoleCode;
  @IsOptional() @IsUUID() unitId?: string;
  @IsOptional() @IsUUID() reportsToPositionId?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
}

export class CreatePositionDto {
  @IsString() @MinLength(2) @MaxLength(100) seatCode!: string;
  @IsEnum(PositionCode) code!: PositionCode;
  @IsString() @MinLength(2) @MaxLength(180) title!: string;
  @IsUUID() roleId!: string;
  @IsUUID() organizationUnitId!: string;
  @IsOptional() @IsUUID() reportsToPositionId?: string;
}

export class UpdatePositionDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(180) title?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class ChangeReportingLineDto {
  @IsUUID() reportsToPositionId!: string;
  @IsString() @MinLength(2) @MaxLength(1000) reason!: string;
}

export class SubordinateQueryDto {
  @IsOptional() @Type(() => Boolean) @IsBoolean() recursive = false;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(20) depth?: number;
}

export class AssignmentListQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsUUID() userProfileId?: string;
  @IsOptional() @IsUUID() positionId?: string;
  @Transform(({ value }) => {
      if (Array.isArray(value)) {
        return value;
      }

      return value ? [value] : undefined;
  })
  @IsOptional() @IsArray() @IsUUID(undefined, { each: true }) positionIds?: string[];
  @IsOptional() @IsUUID() unitId?: string;
  @IsOptional() @IsEnum(RoleCode) roleCode?: RoleCode;
  @IsOptional() @IsEnum(PositionCode) positionCode?: PositionCode;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
  @IsOptional() @IsDateString() validAt?: string;
}

export class CreatePositionAssignmentDto {
  @IsUUID() userProfileId!: string;
  @IsUUID() positionId!: string;
  @IsBoolean() isPrimary!: boolean;
  @IsDateString() validFrom!: string;
  @IsOptional() @IsDateString() validUntil?: string;
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  areaScopeIds!: string[];
}

export class CloseAssignmentDto {
  @IsDateString() validUntil!: string;
  @IsString() @MinLength(2) @MaxLength(1000) reason!: string;
}

export class ReasonDto {
  @IsString() @MinLength(2) @MaxLength(1000) reason!: string;
}

export class AssignmentScopeAreaDto {
  @IsUUID() areaId!: string;
  @IsBoolean() isPrimary!: boolean;
}

export class ReplaceAssignmentScopesDto extends ReasonDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AssignmentScopeAreaDto)
  areas!: AssignmentScopeAreaDto[];
  @IsDateString() effectiveAt!: string;
}

export class ValidateAssignmentScopesDto {
  @IsArray() @ArrayMinSize(1) @IsUUID(undefined, { each: true }) areaIds!: string[];
}
