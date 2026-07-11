import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  AreaScopeMode,
  PositionCode,
} from '../../../generated/prisma/client.js';

export class RoleListQueryDto {
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
}

export class PermissionListQueryDto {
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsString() @MaxLength(80) module?: string;
}

export class ReplaceRolePermissionsDto {
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissionCodes!: string[];
}

export class AreaPolicyQueryDto {
  @IsOptional() @IsEnum(PositionCode) positionCode?: PositionCode;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
}

export class UpdateAreaPolicyDto {
  @IsEnum(AreaScopeMode) scopeMode!: AreaScopeMode;
  @Type(() => Number) @IsInt() @Min(0) minimumAreas!: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  maximumAreas?: number;
  @IsBoolean() isActive!: boolean;
}
