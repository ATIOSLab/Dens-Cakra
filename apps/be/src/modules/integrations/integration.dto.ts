import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { IntegrationStatus } from '../../generated/prisma/client.js';

export class IntegrationQuery {
  @IsOptional() @IsEnum(IntegrationStatus) status?: IntegrationStatus;
  @IsOptional() @IsString() @MaxLength(80) channelType?: string;
}

export class CreateIntegrationDto {
  @IsString() @MaxLength(80) code!: string;
  @IsString() @MaxLength(180) name!: string;
  @IsString() @MaxLength(80) channelType!: string;
  @IsObject() config!: Record<string, unknown>;
  @IsEnum(IntegrationStatus) status!: IntegrationStatus;
}

export class UpdateIntegrationDto {
  @IsOptional() @IsString() @MaxLength(180) name?: string;
  @IsOptional() @IsObject() configPatch?: Record<string, unknown>;
}

export class UpdateWhatsappControlDto {
  @IsOptional() @IsString() @MaxLength(180) name?: string;
  @IsOptional() @IsString() @MaxLength(180) botLabel?: string;
  @IsOptional() @IsString() @MaxLength(120) provider?: string;
  @IsOptional() @IsString() @MaxLength(30) botPhoneNumber?: string;
  @IsOptional() @IsUUID() userId?: string;
  @IsOptional() @IsIn(['qr', 'code']) pairingMethod?: 'qr' | 'code';
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Matches(/^\+?\d[\d\s-]{7,30}$/, { each: true })
  senderNumbers?: string[];
}

export class ReasonDto {
  @IsString() @MinLength(2) @MaxLength(1000) reason!: string;
}

export class TestIntegrationDto {
  @IsIn(['HEALTH', 'SEND_TEST']) mode!: 'HEALTH' | 'SEND_TEST';
  @IsOptional() @IsString() @MaxLength(200) target?: string;
}

export class WebhookQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 50;
  @IsOptional() @IsString() eventType?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() success?: boolean;
}
