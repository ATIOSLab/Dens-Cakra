import { Injectable, Logger } from '@nestjs/common';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Prisma } from '../../generated/prisma/client.js';
import { ApiException } from '../../common/api/api-exception.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import {
  defaultSmtpMailConfig,
  sendMail,
  type SendMailOptions,
  type SmtpMailConfig,
} from '../../lib/email.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  SecretVaultService,
  type EncryptedValue,
} from './secret-vault.service.js';

const SMTP_SETTING_KEY = 'email.smtp';

type SmtpSettingsValue = {
  enabled: boolean;
  from: string;
  host: string;
  pass: string;
  port: number;
  secure: boolean;
  user: string;
};

export type SmtpSettingsResponse = {
  enabled: boolean;
  from: string;
  host: string;
  passwordSet: boolean;
  port: number;
  secure: boolean;
  source: 'custom' | 'env';
  user: string;
  updatedAt: Date | null;
};

export class UpdateSmtpSettingsDto {
  @IsBoolean()
  enabled!: boolean;

  @IsString()
  @MaxLength(200)
  from!: string;

  @IsString()
  @MaxLength(200)
  host!: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  port!: number;

  @IsBoolean()
  secure!: boolean;

  @IsString()
  @MaxLength(200)
  user!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  password?: string;
}

export class TestSmtpSettingsDto {
  @IsEmail()
  to!: string;
}

function isEncryptedValue(value: unknown): value is EncryptedValue {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<EncryptedValue>;
  return (
    candidate.algorithm === 'aes-256-gcm' &&
    typeof candidate.iv === 'string' &&
    typeof candidate.authTag === 'string' &&
    typeof candidate.ciphertext === 'string'
  );
}

@Injectable()
export class MailSettingsService {
  private readonly logger = new Logger(MailSettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vault: SecretVaultService,
  ) {}

  async getSettings(): Promise<SmtpSettingsResponse> {
    const row = await this.prisma.systemSetting.findUnique({
      where: { key: SMTP_SETTING_KEY },
    });
    const resolved = this.resolveSettingsValue(row?.value, row?.isSecret);
    const source = row ? 'custom' : 'env';

    return {
      enabled: row ? resolved.enabled : true,
      from: resolved.from,
      host: resolved.host,
      passwordSet: resolved.pass.length > 0,
      port: resolved.port,
      secure: resolved.secure,
      source,
      user: resolved.user,
      updatedAt: row?.updatedAt ?? null,
    };
  }

  async updateSettings(
    body: UpdateSmtpSettingsDto,
    context: AuthorizationContext,
  ): Promise<SmtpSettingsResponse> {
    const before = await this.prisma.systemSetting.findUnique({
      where: { key: SMTP_SETTING_KEY },
    });
    const previous = this.resolveSettingsValue(
      before?.value,
      before?.isSecret,
    );
    const next: SmtpSettingsValue = {
      enabled: body.enabled,
      from: body.from.trim(),
      host: body.host.trim(),
      port: body.port,
      secure: body.secure,
      user: body.user.trim(),
      pass:
        body.password && body.password.trim().length > 0
          ? body.password
          : previous.pass,
    };

    if (next.enabled) {
      this.assertComplete(next);
    }

    const encrypted = this.vault.encrypt(next) as Prisma.InputJsonValue;
    const item = await this.prisma.systemSetting.upsert({
      where: { key: SMTP_SETTING_KEY },
      create: {
        key: SMTP_SETTING_KEY,
        value: encrypted,
        description: 'Konfigurasi SMTP custom untuk notifikasi email sistem.',
        isSecret: true,
      },
      update: {
        value: encrypted,
        description: 'Konfigurasi SMTP custom untuk notifikasi email sistem.',
        isSecret: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserProfileId: context.userProfileId,
        actorAssignmentId: context.primaryAssignmentId,
        action: 'SYSTEM.EMAIL_SMTP.UPDATE',
        entityType: 'SystemSetting',
        entityId: item.id,
        beforeData: before
          ? { key: before.key, isSecret: before.isSecret }
          : Prisma.JsonNull,
        afterData: {
          key: SMTP_SETTING_KEY,
          enabled: next.enabled,
          host: next.host,
          port: next.port,
          secure: next.secure,
          user: next.user,
        },
      },
    });

    return this.getSettings();
  }

  async sendTest(
    body: TestSmtpSettingsDto,
    context: AuthorizationContext,
  ): Promise<{ to: string; sent: true }> {
    const config = await this.resolveTransportConfig();
    if (!config) {
      throw new ApiException(
        'EMAIL_DISABLED',
        'Pengiriman email dinonaktifkan melalui pengaturan SMTP. Aktifkan terlebih dahulu untuk menguji SMTP.',
        409,
      );
    }

    await sendMail(
      {
        to: body.to,
        subject: '[DENS CAKRA] Tes konfigurasi SMTP',
        text: 'Tes konfigurasi SMTP DENS CAKRA berhasil dikirim.',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827; max-width: 640px; margin: 0 auto; padding: 24px;">
            <h2 style="margin: 0 0 16px;">Tes Konfigurasi SMTP</h2>
            <p>Email ini dikirim otomatis untuk memastikan konfigurasi SMTP DENS CAKRA dapat digunakan.</p>
          </div>
        `,
      },
      config,
    );

    await this.prisma.auditLog.create({
      data: {
        actorUserProfileId: context.userProfileId,
        actorAssignmentId: context.primaryAssignmentId,
        action: 'SYSTEM.EMAIL_SMTP.TEST',
        entityType: 'SystemSetting',
        entityId: SMTP_SETTING_KEY,
        beforeData: Prisma.JsonNull,
        afterData: { to: body.to },
      },
    });

    return { to: body.to, sent: true };
  }

  async sendMail(options: SendMailOptions): Promise<void> {
    const config = await this.resolveTransportConfig();
    if (!config) {
      this.logger.warn(
        'Pengiriman email dinonaktifkan melalui pengaturan SMTP; pesan dilewati.',
      );
      return;
    }

    await sendMail(options, config);
  }

  queueMail(options: SendMailOptions): void {
    void this.sendMail(options).catch((error: unknown) => {
      this.logger.error(
        'Failed to send email notification.',
        error instanceof Error ? error.stack : undefined,
      );
    });
  }

  private async resolveTransportConfig(): Promise<SmtpMailConfig | null> {
    const row = await this.prisma.systemSetting.findUnique({
      where: { key: SMTP_SETTING_KEY },
    });

    if (!row) {
      return defaultSmtpMailConfig();
    }

    const resolved = this.resolveSettingsValue(row.value, row.isSecret);

    if (!resolved.enabled) {
      return null;
    }

    this.assertComplete(resolved);

    return {
      from: resolved.from,
      host: resolved.host,
      port: resolved.port,
      secure: resolved.secure,
      user: resolved.user,
      pass: resolved.pass,
    };
  }

  private resolveSettingsValue(
    value: unknown,
    isSecret?: boolean,
  ): SmtpSettingsValue {
    if (value && isSecret && isEncryptedValue(value)) {
      return this.normalizeValue(this.vault.decrypt<SmtpSettingsValue>(value));
    }

    if (value && !isSecret) {
      return this.normalizeValue(value);
    }

    const envConfig = defaultSmtpMailConfig();
    return {
      enabled: false,
      from: envConfig.from,
      host: envConfig.host,
      port: envConfig.port,
      secure: envConfig.secure,
      user: envConfig.user,
      pass: envConfig.pass,
    };
  }

  private normalizeValue(value: unknown): SmtpSettingsValue {
    const source = value && typeof value === 'object' ? value : {};
    const item = source as Partial<SmtpSettingsValue>;
    const envConfig = defaultSmtpMailConfig();

    return {
      enabled: item.enabled === true,
      from: typeof item.from === 'string' ? item.from : envConfig.from,
      host: typeof item.host === 'string' ? item.host : envConfig.host,
      port: typeof item.port === 'number' ? item.port : envConfig.port,
      secure: item.secure === true,
      user: typeof item.user === 'string' ? item.user : envConfig.user,
      pass: typeof item.pass === 'string' ? item.pass : envConfig.pass,
    };
  }

  private assertComplete(value: SmtpSettingsValue) {
    const missing = [
      ['from', value.from],
      ['host', value.host],
      ['user', value.user],
      ['password', value.pass],
    ].flatMap(([key, field]) => (String(field).trim() ? [] : [key]));

    if (missing.length > 0) {
      throw new ApiException(
        'SMTP_SETTINGS_INCOMPLETE',
        `Konfigurasi SMTP belum lengkap: ${missing.join(', ')}.`,
        400,
      );
    }
  }
}
