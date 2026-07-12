import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import {
  AreaScopeMode,
  CommandRouteType,
  RoleCode,
} from '../../../generated/prisma/client.js';

export class RoleListQueryDto {
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
}

export class AreaPolicyQueryDto {
  @IsOptional() @IsEnum(RoleCode) roleCode?: RoleCode;
  @IsOptional() @IsEnum(CommandRouteType) branch?: CommandRouteType;
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
