import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  BaketStatus,
  CoordinateSource,
  JaringGender,
  JaringRegistrationStatus,
  JaringStatus,
  PriorityLevel,
  WhatsAppReportSessionStatus,
} from '../../generated/prisma/client.js';

export class JaringQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(500) limit = 20;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() status?: JaringStatus;
  @IsOptional()
  @IsEnum(JaringRegistrationStatus)
  registrationStatus?: JaringRegistrationStatus;
  @IsOptional() @IsUUID() areaId?: string;
  @IsOptional() @IsUUID() occupationId?: string;
  @IsOptional() @IsUUID() fieldOfficerAssignmentId?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() paginated?: boolean;
}

export class CreateJaringDto {
  @IsOptional() @IsString() @MaxLength(150) aliasName?: string;
  @IsString()
  @Matches(/^\d+$/, { message: 'Nomor WhatsApp hanya boleh berisi angka.' })
  @MaxLength(30)
  whatsappNumber!: string;
  @IsString() @IsNotEmpty() @MaxLength(180) fullName!: string;
  @IsOptional()
  @IsString()
  @Matches(/^\d{16}$/, {
    message: 'NIK harus terdiri dari tepat 16 digit angka.',
  })
  nationalIdNumber?: string;
  @IsString() @IsNotEmpty() @MaxLength(1000) address!: string;
  @IsString() @IsNotEmpty() @MaxLength(120) birthPlace!: string;
  @IsDateString(
    {},
    { message: 'Tanggal lahir harus berupa tanggal yang valid.' },
  )
  birthDate!: string;
  @IsEnum(JaringGender) gender!: JaringGender;
  @IsUUID() occupationId!: string;
  @IsUUID(undefined, { message: 'Foto Jaring wajib diunggah.' })
  profilePhotoFileId!: string;
  @IsOptional() @IsString() @MaxLength(180) workplace?: string;
  @IsOptional() @IsString() @MaxLength(150) jobTitle?: string;
  @IsDateString(
    {},
    { message: 'Tanggal bergabung harus berupa tanggal yang valid.' },
  )
  joinedAt!: string;
  @IsOptional() @IsString() @MaxLength(180) organizationName?: string;
  @IsOptional() @IsString() @MaxLength(180) politicalAffiliation?: string;
  @IsUUID() fieldOfficerAssignmentId!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1, {
    message: 'Satu Jaring hanya boleh memiliki satu Kelurahan/Desa cakupan.',
  })
  @IsUUID(undefined, { each: true })
  areaIds!: string[];
  @IsString() @IsNotEmpty() @MaxLength(3000) notes!: string;
}

export class UpdateJaringDto {
  @IsOptional() @IsString() @MaxLength(150) aliasName?: string;
  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, { message: 'Nomor WhatsApp hanya boleh berisi angka.' })
  @MaxLength(30)
  whatsappNumber?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(180) fullName?: string;
  @IsOptional()
  @IsString()
  @Matches(/^$|^\d{16}$/, {
    message: 'NIK harus kosong atau terdiri dari tepat 16 digit angka.',
  })
  nationalIdNumber?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(1000) address?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(120) birthPlace?: string;
  @IsOptional()
  @IsDateString(
    {},
    { message: 'Tanggal lahir harus berupa tanggal yang valid.' },
  )
  birthDate?: string;
  @IsOptional() @IsEnum(JaringGender) gender?: JaringGender;
  @IsOptional() @IsUUID() occupationId?: string;
  @IsOptional() @IsUUID() profilePhotoFileId?: string;
  @IsOptional() @IsString() @MaxLength(180) workplace?: string;
  @IsOptional() @IsString() @MaxLength(150) jobTitle?: string;
  @IsOptional()
  @IsDateString(
    {},
    { message: 'Tanggal bergabung harus berupa tanggal yang valid.' },
  )
  joinedAt?: string;
  @IsOptional() @IsString() @MaxLength(180) organizationName?: string;
  @IsOptional() @IsString() @MaxLength(180) politicalAffiliation?: string;
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1, {
    message: 'Satu Jaring hanya boleh memiliki satu Kelurahan/Desa cakupan.',
  })
  @IsUUID(undefined, { each: true })
  areaIds?: string[];
  @IsOptional() @IsString() @MaxLength(3000) notes?: string;
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

export class JaringReportQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional()
  @IsEnum(WhatsAppReportSessionStatus)
  status?: WhatsAppReportSessionStatus;
  @IsOptional() @IsUUID() jaringId?: string;
  @IsOptional() @IsUUID() fieldOfficerAssignmentId?: string;
  @IsOptional()
  @IsEnum(JaringRegistrationStatus)
  registrationStatus?: JaringRegistrationStatus;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsString() @MaxLength(200) search?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsUUID() areaId?: string;
  @IsOptional() @IsUUID() jaringAreaId?: string;
  @IsOptional() @IsEnum(BaketStatus) workflowStatus?: BaketStatus;
  @IsOptional() @IsEnum(CoordinateSource) coordinateSource?: CoordinateSource;
  @IsOptional() @IsEnum(PriorityLevel) urgency?: PriorityLevel;
  @IsOptional()
  @IsIn([
    'IN_PROGRESS_BY_JARING',
    'NOT_SUBMITTED',
    'READY_FOR_BAKET',
    'BAKET_CREATED',
  ])
  verificationStatus?: string;
  @IsOptional() @IsIn(['true', 'false']) hasAttachment?: 'true' | 'false';
  @IsOptional()
  @IsIn(['WITHIN_SCOPE', 'OUTSIDE_SCOPE', 'BORDER_AMBIGUOUS', 'NOT_DETERMINED'])
  locationSuitability?:
    'WITHIN_SCOPE' | 'OUTSIDE_SCOPE' | 'BORDER_AMBIGUOUS' | 'NOT_DETERMINED';
  @IsOptional()
  @IsIn(['reportedAt', 'createdAt', 'updatedAt', 'referenceNumber'])
  sortBy?: 'reportedAt' | 'createdAt' | 'updatedAt' | 'referenceNumber';
  @IsOptional() @IsIn(['asc', 'desc']) sortOrder?: 'asc' | 'desc';
  @IsOptional()
  @IsIn(['ALL', 'JARING_REPORT', 'DRAFT_BAKET', 'VALIDATED_BAKET'])
  stage?: 'ALL' | 'JARING_REPORT' | 'DRAFT_BAKET' | 'VALIDATED_BAKET';
}

export class JaringCoachingReportQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsString() @MaxLength(200) search?: string;
  @IsOptional() @IsUUID() jaringId?: string;
  @IsOptional() @IsUUID() fieldOfficerAssignmentId?: string;
  @IsOptional() @IsUUID() areaId?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional()
  @IsIn(['reportedAt', 'createdAt', 'updatedAt', 'title'])
  sortBy?: 'reportedAt' | 'createdAt' | 'updatedAt' | 'title';
  @IsOptional() @IsIn(['asc', 'desc']) sortOrder?: 'asc' | 'desc';
}

export class CreateJaringCoachingReportDto {
  @IsString() @IsNotEmpty() @MaxLength(300) title!: string;
  @IsString() @IsNotEmpty() @MaxLength(10000) content!: string;
  @IsDateString(
    {},
    { message: 'Tanggal dan waktu laporan pembinaan harus valid.' },
  )
  reportedAt!: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5, { message: 'Maksimal 5 foto dapat dilampirkan.' })
  @IsUUID('4', { each: true })
  attachmentFileIds?: string[];
}

export class UpdateJaringReportMetadataDto {
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsEnum(PriorityLevel) urgency?: PriorityLevel;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsString() normalizedContent?: string;
  @IsOptional() @IsString() @MaxLength(3000) fieldOfficerNote?: string;
  @IsOptional() @IsUUID() taskAssignmentId?: string;
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

export class RejectJaringDto {
  @IsOptional() @IsString() @MaxLength(1000) reason?: string;
}
