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
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  CommandRouteType,
  PersonnelGender,
  PersonnelMaritalStatus,
  PersonnelStatus,
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
  @IsOptional() @IsUUID() areaId?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() includeArchived = false;
}

export class ProvisionAuthDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(180) name?: string;
  @IsOptional() @IsEmail() @MaxLength(250) email?: string;
  @IsString() @MinLength(8) @MaxLength(128) password!: string;
  @IsString() @MaxLength(80) role!: string;
}

export class PersonnelPositionHistoryDto {
  @IsString() @MinLength(2) @MaxLength(180) title!: string;
  @IsOptional() @IsString() @MaxLength(180) organizationUnit?: string;
  @IsOptional() @IsString() @MaxLength(180) area?: string;
  @IsDateString() startedAt!: string;
  @IsOptional() @IsDateString() endedAt?: string;
  @IsString() @MaxLength(30) status!: string;
}

export class PersonnelAssignmentHistoryDto {
  @IsString() @MinLength(2) @MaxLength(180) name!: string;
  @IsOptional() @IsString() @MaxLength(180) unit?: string;
  @IsOptional() @IsString() @MaxLength(180) location?: string;
  @IsOptional() @IsString() @MaxLength(120) period?: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
}

export class ProvisionProfileDto {
  @IsString() @MinLength(2) @MaxLength(100) username!: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(180) fullName?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional()
  @IsString()
  @Matches(/^\d{16}$/, {
    message: 'nationalIdNumber must contain exactly 16 digits',
  })
  nationalIdNumber?: string;
  @IsOptional() @IsString() @MaxLength(120) birthPlace?: string;
  @IsOptional() @IsDateString() birthDate?: string;
  @IsOptional() @IsEnum(PersonnelGender) gender?: PersonnelGender;
  @IsOptional() @IsString() @MaxLength(80) religion?: string;
  @IsOptional()
  @IsEnum(PersonnelMaritalStatus)
  maritalStatus?: PersonnelMaritalStatus;
  @IsOptional() @IsString() @MaxLength(5) bloodType?: string;
  @IsOptional() @IsString() @MaxLength(80) personnelNumber?: string;
  @IsOptional() @IsString() @MaxLength(120) rankGrade?: string;
  @IsOptional() @IsEnum(PersonnelStatus) personnelStatus?: PersonnelStatus;
  @IsOptional() @IsDateString() joinedAt?: string;
  @IsOptional() @IsString() @MaxLength(120) lastEducation?: string;
  @IsOptional() @IsString() @MaxLength(180) educationInstitution?: string;
  @IsOptional() @IsString() @MaxLength(150) educationMajor?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  graduationYear?: number;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PersonnelPositionHistoryDto)
  positionHistory?: PersonnelPositionHistoryDto[];
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PersonnelAssignmentHistoryDto)
  assignmentHistory?: PersonnelAssignmentHistoryDto[];
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  competencies?: string[];
}

export class ProvisionAssignmentDto {
  @IsEnum(CommandRouteType) branch!: CommandRouteType;
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
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  areaScopeIds!: string[];
}

export class UpdateUserProfileDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) username?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(180) fullName?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
}

export class ReasonDto {
  @IsString() @MinLength(2) @MaxLength(1000) reason!: string;
}

export class ResetUserPasswordDto {
  @IsString() @MinLength(8) @MaxLength(128) password!: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(1000) reason?: string;
  @IsOptional() @IsBoolean() revokeSessions = true;
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
  @IsEnum(RoleCode) roleCode!: RoleCode;
  @IsEnum(CommandRouteType) branch!: CommandRouteType;
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  areaScopeIds?: string[];
  @IsDateString() effectiveAt!: string;
}

export class AssignmentHistoryQueryDto {
  @IsOptional() @Type(() => Boolean) @IsBoolean() activeOnly = false;
}
