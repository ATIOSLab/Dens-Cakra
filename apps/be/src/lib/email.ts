import { createDecipheriv, createHash } from 'node:crypto';
import nodemailer from 'nodemailer';
import { prisma } from '../modules/prisma/prisma.service.js';
import { env } from './env.js';

const SMTP_SETTING_KEY = 'email.smtp';

export type SmtpMailConfig = {
  from: string;
  host: string;
  pass: string;
  port: number;
  secure: boolean;
  user: string;
};

export type SendMailOptions = {
  html: string;
  subject: string;
  text: string;
  to: string;
};

type StoredSmtpSettings = {
  enabled?: boolean;
  from?: string;
  host?: string;
  pass?: string;
  port?: number;
  secure?: boolean;
  user?: string;
};

type EncryptedSmtpSettings = {
  algorithm: 'aes-256-gcm';
  authTag: string;
  ciphertext: string;
  iv: string;
  keyVersion: 1;
};

export function defaultSmtpMailConfig(): SmtpMailConfig {
  return {
    from: env.email.from,
    host: env.email.smtp.host,
    port: env.email.smtp.port,
    secure: env.email.smtp.secure,
    user: env.email.smtp.user,
    pass: env.email.smtp.pass,
  };
}

function isEncryptedValue(value: unknown): value is EncryptedSmtpSettings {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<EncryptedSmtpSettings>;
  return (
    candidate.algorithm === 'aes-256-gcm' &&
    typeof candidate.iv === 'string' &&
    typeof candidate.authTag === 'string' &&
    typeof candidate.ciphertext === 'string'
  );
}

function decryptStoredSettings(value: EncryptedSmtpSettings) {
  const key = createHash('sha256').update(env.encryptionKey).digest();
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(value.iv, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(value.authTag, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(value.ciphertext, 'base64')),
    decipher.final(),
  ]);
  return JSON.parse(plaintext.toString('utf8')) as StoredSmtpSettings;
}

function completeStoredSettings(
  value: StoredSmtpSettings,
): SmtpMailConfig | null {
  if (value.enabled !== true) return null;
  if (
    !value.from?.trim() ||
    !value.host?.trim() ||
    !value.user?.trim() ||
    !value.pass
  ) {
    return null;
  }

  return {
    from: value.from,
    host: value.host,
    port: typeof value.port === 'number' ? value.port : 587,
    secure: value.secure === true,
    user: value.user,
    pass: value.pass,
  };
}

export async function resolveSmtpMailConfig(): Promise<SmtpMailConfig> {
  const fallback = defaultSmtpMailConfig();

  try {
    const row = await prisma.systemSetting.findUnique({
      where: { key: SMTP_SETTING_KEY },
    });
    const value = row?.isSecret
      ? isEncryptedValue(row.value)
        ? decryptStoredSettings(row.value)
        : null
      : (row?.value as StoredSmtpSettings | null | undefined);
    return (value ? completeStoredSettings(value) : null) ?? fallback;
  } catch {
    return fallback;
  }
}

export async function sendMail({
  html,
  subject,
  text,
  to,
}: SendMailOptions, config?: SmtpMailConfig): Promise<void> {
  const resolvedConfig = config ?? (await resolveSmtpMailConfig());
  const transporter = nodemailer.createTransport({
    host: resolvedConfig.host,
    port: resolvedConfig.port,
    secure: resolvedConfig.secure,
    auth: {
      user: resolvedConfig.user,
      pass: resolvedConfig.pass,
    },
  });

  await transporter.sendMail({
    from: resolvedConfig.from,
    to,
    subject,
    text,
    html,
  });
}

export function queueMail(
  options: SendMailOptions,
  config?: SmtpMailConfig,
): void {
  void sendMail(options, config).catch((error: unknown) => {
    console.error('Failed to send email notification.', error);
  });
}

function createActionEmailTemplate(options: {
  actionLabel: string;
  buttonLabel: string;
  intro: string;
  outro: string;
  title: string;
  url: string;
  userName?: string | null;
}): string {
  const safeName = options.userName?.trim() || 'Pengguna DEN CAKRA';

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827; max-width: 640px; margin: 0 auto; padding: 24px;">
      <p>Halo ${safeName},</p>
      <h2 style="margin: 0 0 16px;">${options.title}</h2>
      <p>${options.intro}</p>
      <p style="margin: 24px 0;">
        <a href="${options.url}" style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 8px;">
          ${options.buttonLabel}
        </a>
      </p>
      <p>Jika tombol tidak berfungsi, buka tautan berikut:</p>
      <p><a href="${options.url}">${options.url}</a></p>
      <p>${options.outro}</p>
      <p style="margin-top: 24px; color: #6b7280; font-size: 12px;">
        Email ini dikirim otomatis oleh sistem DEN CAKRA untuk proses ${options.actionLabel}.
      </p>
    </div>
  `;
}

export function createVerificationEmail(options: {
  url: string;
  userName?: string | null;
}): { html: string; subject: string; text: string } {
  const subject = 'Verifikasi email akun DEN CAKRA';
  const text = `Verifikasi email akun Anda melalui tautan berikut: ${options.url}`;

  return {
    subject,
    text,
    html: createActionEmailTemplate({
      actionLabel: 'verifikasi email',
      buttonLabel: 'Verifikasi Email',
      intro:
        'Silakan verifikasi alamat email Anda untuk mengaktifkan akses login DEN CAKRA.',
      outro:
        'Jika Anda tidak merasa membuat akun ini, abaikan email ini dan jangan bagikan tautan kepada siapa pun.',
      title: 'Verifikasi Email Anda',
      url: options.url,
      userName: options.userName,
    }),
  };
}

export function createResetPasswordEmail(options: {
  url: string;
  userName?: string | null;
}): { html: string; subject: string; text: string } {
  const subject = 'Reset password akun DEN CAKRA';
  const text = `Reset password akun Anda melalui tautan berikut: ${options.url}`;

  return {
    subject,
    text,
    html: createActionEmailTemplate({
      actionLabel: 'reset password',
      buttonLabel: 'Reset Password',
      intro:
        'Kami menerima permintaan reset password untuk akun DEN CAKRA Anda.',
      outro:
        'Jika Anda tidak meminta reset password, abaikan email ini. Tautan akan kedaluwarsa otomatis.',
      title: 'Reset Password Anda',
      url: options.url,
      userName: options.userName,
    }),
  };
}
