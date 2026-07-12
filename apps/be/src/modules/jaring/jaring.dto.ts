import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
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
import { JaringStatus } from '../../generated/prisma/client.js';

export class JaringQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() status?: JaringStatus;
}

export class CreateJaringDto {
  @IsString() @MaxLength(80) code!: string;
  @IsOptional() @IsString() @MaxLength(150) aliasName?: string;
  @IsString() @MaxLength(30) whatsappNumber!: string;
  @IsUUID() fieldOfficerAssignmentId!: string;
  @IsArray() @ArrayMinSize(1) @IsUUID(undefined, { each: true }) areaIds!: string[];
  @IsOptional() @IsString() @MaxLength(3000) notes?: string;
}

export class UpdateJaringDto {
  @IsOptional() @IsString() @MaxLength(150) aliasName?: string;
  @IsOptional() @IsString() @MaxLength(3000) notes?: string;
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
