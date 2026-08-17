import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  AreaScopeMode,
  CommandRouteType,
  RoleCode,
  SupervisionType,
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

export class PermissionUpsertDto {
  @IsString() @MinLength(2) @MaxLength(80) code!: string;
  @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsBoolean() isSystem?: boolean;
}

export class PositionUpsertDto {
  @IsString() @MinLength(2) @MaxLength(80) code!: string;
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsUUID() roleId!: string;
  @IsOptional() @IsString() @MaxLength(60) organizationLevel?: string;
  @IsOptional() @IsBoolean() isSystem?: boolean;
}

export class SupervisionAssignmentUpsertDto {
  @IsUUID() directorateAssignmentId!: string;
  @IsUUID() targetRegionId!: string;
  @IsEnum(SupervisionType) supervisionType!: SupervisionType;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class OrganizationUnitUpsertDto {
  @IsString() @MinLength(2) @MaxLength(80) code!: string;
  @IsString() @MinLength(2) @MaxLength(160) name!: string;
  @IsString() @MaxLength(60) type!: string;
  @IsOptional() @IsString() @MaxLength(60) level?: string;
  @IsOptional() @IsUUID() parentId?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class SetRolePermissionsDto {
  @IsArray() @IsUUID(undefined, { each: true }) permissionIds!: string[];
}
