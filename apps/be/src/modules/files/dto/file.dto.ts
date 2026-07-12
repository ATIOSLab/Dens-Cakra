import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { FileType } from '../../../generated/prisma/client.js';
export class PresignFileDto {
  @IsString() @MaxLength(255) originalName!: string;
  @IsString() @MaxLength(120) mimeType!: string;
  @IsEnum(FileType) fileType!: FileType;
  @Type(() => Number) @IsInt() @Min(1) sizeBytes!: number;
  @IsString() @MinLength(64) @MaxLength(64) checksumSha256!: string;
  @IsString() @MaxLength(80) context!: string;
}
export class CompleteFileDto {
  @IsString() uploadToken!: string;
  @IsString() @MaxLength(500) storageKey!: string;
}
export class FileAccessQueryDto {
  @IsOptional() @IsIn(['inline', 'attachment']) disposition:
    'inline' | 'attachment' = 'inline';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(300) ttlSeconds = 300;
}
