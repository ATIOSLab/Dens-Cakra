import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
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
import { JaringGender, JaringStatus } from '../../generated/prisma/client.js';

export class JaringQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() status?: JaringStatus;
}

export class CreateJaringDto {
  @IsOptional() @IsString() @MaxLength(150) aliasName?: string;
  @IsString()
  @Matches(/^\d+$/, { message: 'Nomor WhatsApp hanya boleh berisi angka.' })
  @MaxLength(30)
  whatsappNumber!: string;
  @IsUUID() clusterId!: string;
  @IsString() @IsNotEmpty() @MaxLength(180) fullName!: string;
  @IsString()
  @Matches(/^\d{16}$/, { message: 'NIK harus terdiri dari tepat 16 digit angka.' })
  nationalIdNumber!: string;
  @IsString() @IsNotEmpty() @MaxLength(120) birthPlace!: string;
  @IsDateString({}, { message: 'Tanggal lahir harus berupa tanggal yang valid.' })
  birthDate!: string;
  @IsEnum(JaringGender) gender!: JaringGender;
  @IsUUID() occupationId!: string;
  @IsOptional() @IsUUID() profilePhotoFileId?: string;
  @IsOptional() @IsString() @MaxLength(180) workplace?: string;
  @IsOptional() @IsString() @MaxLength(150) jobTitle?: string;
  @IsDateString({}, { message: 'Tanggal bergabung harus berupa tanggal yang valid.' })
  joinedAt!: string;
  @IsOptional() @IsString() @MaxLength(180) organizationName?: string;
  @IsOptional() @IsString() @MaxLength(180) politicalAffiliation?: string;
  @IsUUID() fieldOfficerAssignmentId!: string;
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  areaIds!: string[];
  @IsString() @IsNotEmpty() @MaxLength(3000) notes!: string;
}

export class UpdateJaringDto {
  @IsOptional() @IsString() @MaxLength(150) aliasName?: string;
  @IsOptional() @IsUUID() clusterId?: string;
  @IsOptional() @IsString() @MaxLength(3000) notes?: string;
}

export class JaringClusterQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit = 100;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsBoolean() @Type(() => Boolean) includeInactive = false;
}

export class CreateJaringClusterDto {
  @IsOptional() @IsString() @MaxLength(80) code?: string;
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
}

export class UpdateJaringClusterDto {
  @IsOptional() @IsString() @MaxLength(80) code?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class JaringOccupationQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit = 100;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsBoolean() @Type(() => Boolean) includeInactive = false;
}

export class CreateJaringOccupationDto {
  @IsOptional() @IsString() @MaxLength(80) code?: string;
  @IsString() @MinLength(2) @MaxLength(150) name!: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
}

export class UpdateJaringOccupationDto {
  @IsOptional() @IsString() @MaxLength(80) code?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(150) name?: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class ReportCategoryQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit = 100;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsBoolean() @Type(() => Boolean) includeInactive = false;
}

export class CreateReportCategoryDto {
  @IsOptional() @IsString() @MaxLength(80) code?: string;
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
}

export class UpdateReportCategoryDto {
  @IsOptional() @IsString() @MaxLength(80) code?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class ReasonDto {
  @IsString() @MinLength(2) @MaxLength(1000) reason!: string;
}

export class TransferDto extends ReasonDto {
  @IsUUID() fieldOfficerAssignmentId!: string;
}

export class CoverageItem {
  @IsUUID() areaId!: string;
  @IsBoolean() isPrimary!: boolean;
}

export class CoverageDto extends ReasonDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CoverageItem)
  areas!: CoverageItem[];
}
