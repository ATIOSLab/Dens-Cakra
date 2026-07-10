import nodemailer from 'nodemailer';
import { env } from './env.js';

const transporter = nodemailer.createTransport({
  host: env.email.smtp.host,
  port: env.email.smtp.port,
  secure: env.email.smtp.secure,
  auth: {
    user: env.email.smtp.user,
    pass: env.email.smtp.pass,
  },
});

type SendMailOptions = {
  html: string;
  subject: string;
  text: string;
  to: string;
};

export async function sendMail({
  html,
  subject,
  text,
  to,
}: SendMailOptions): Promise<void> {
  await transporter.sendMail({
    from: env.email.from,
    to,
    subject,
    text,
    html,
  });
}

export function queueMail(options: SendMailOptions): void {
  void sendMail(options).catch((error: unknown) => {
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
