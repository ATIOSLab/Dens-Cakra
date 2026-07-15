import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
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
  CommandRouteType,
  PositionCode,
  RoleCode,
  UserProfileStatus,
} from '../../../generated/prisma/client.js';

export class UserProfileListQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsEnum(UserProfileStatus) status?: UserProfileStatus;
  @IsOptional() @IsEnum(RoleCode) roleCode?: RoleCode;
  @IsOptional() @IsEnum(CommandRouteType) branch?: CommandRouteType;
  @IsOptional() @IsEnum(PositionCode) positionCode?: PositionCode;
  @IsOptional() @IsUUID() unitId?: string;
  @IsOptional() @IsUUID() areaId?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() includeArchived = false;
}

export class ProvisionAuthDto {
  @IsString() @MinLength(2) @MaxLength(180) name!: string;
  @IsEmail() @MaxLength(250) email!: string;
  @IsOptional() @IsString() @MinLength(8) @MaxLength(128) password?: string;
  @IsOptional() @IsString() @MaxLength(80) role?: string;
}

export class ProvisionProfileDto {
  @IsString() @MinLength(2) @MaxLength(100) username!: string;
  @IsString() @MinLength(2) @MaxLength(180) fullName!: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
}

export class ProvisionAssignmentDto {
  @IsOptional() @IsUUID() organizationUnitId?: string;
  @IsOptional() @IsEnum(CommandRouteType) branch?: CommandRouteType;
  @IsUUID() positionId!: string;
  @IsDateString() validFrom!: string;
}

export class ProvisionUserDto {
  @ValidateNested() @Type(() => ProvisionAuthDto) auth!: ProvisionAuthDto;
  @ValidateNested()
  @Type(() => ProvisionProfileDto)
  profile!: ProvisionProfileDto;
  @ValidateNested()
  @Type(() => ProvisionAssignmentDto)
  assignment!: ProvisionAssignmentDto;
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  areaScopeIds?: string[];
}

export class UpdateUserProfileDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) username?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(180) fullName?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
}

export class ReasonDto {
  @IsString() @MinLength(2) @MaxLength(1000) reason!: string;
}

export class SuspendUserDto extends ReasonDto {
  @IsOptional() @IsDateString() until?: string;
  @IsOptional() @IsBoolean() revokeSessions = true;
}

export class ArchiveUserDto extends ReasonDto {
  @IsDateString() effectiveAt!: string;
}

export class LockUserDto extends ReasonDto {
  @IsOptional() @IsDateString() lockedUntil?: string;
}

export class ChangePrimaryAssignmentDto extends ReasonDto {
  @IsUUID() newPositionId!: string;
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  areaScopeIds?: string[];
  @IsDateString() effectiveAt!: string;
}

export class AssignmentHistoryQueryDto {
  @IsOptional() @Type(() => Boolean) @IsBoolean() activeOnly = false;
}
