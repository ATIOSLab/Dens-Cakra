import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { env } from '../../lib/env.js';

export type EncryptedValue = {
  algorithm: 'aes-256-gcm';
  keyVersion: 1;
  iv: string;
  authTag: string;
  ciphertext: string;
};

@Injectable()
export class SecretVaultService {
  private readonly key = createHash('sha256')
    .update(env.encryptionKey)
    .digest();

  encrypt(value: unknown): EncryptedValue {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(value), 'utf8'),
      cipher.final(),
    ]);

    return {
      algorithm: 'aes-256-gcm',
      keyVersion: 1,
      iv: iv.toString('base64'),
      authTag: cipher.getAuthTag().toString('base64'),
      ciphertext: ciphertext.toString('base64'),
    };
  }

  decrypt<T>(value: EncryptedValue): T {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.key,
      Buffer.from(value.iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(value.authTag, 'base64'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(value.ciphertext, 'base64')),
      decipher.final(),
    ]);
    return JSON.parse(plaintext.toString('utf8')) as T;
  }
}
