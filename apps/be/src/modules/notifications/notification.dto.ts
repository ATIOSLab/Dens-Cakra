import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { NotificationType } from '../../generated/prisma/client.js';

export class NotificationQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsEnum(NotificationType) type?: NotificationType;
  @IsOptional() @Type(() => Boolean) unreadOnly = false;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class ReadAllDto {
  @IsOptional() @IsDateString() before?: string;
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationType, { each: true })
  types?: NotificationType[];
}
