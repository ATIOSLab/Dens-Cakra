import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Tandai route/controller sebagai publik sehingga SessionGuard dan
 * DomainAccessGuard (yang terdaftar sebagai APP_GUARD global) melewatinya.
 * Gunakan hanya untuk endpoint yang memang publik (health probe, signed URL,
 * webhook terverifikasi). Endpoint lain default-deny.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
