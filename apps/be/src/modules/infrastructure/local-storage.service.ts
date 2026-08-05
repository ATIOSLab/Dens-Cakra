import {
  createHash,
  createHmac,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { env } from '../../lib/env.js';
import { ApiException } from '../../common/api/api-exception.js';

type StorageTokenPayload = {
  purpose: 'upload' | 'download';
  storageKey: string;
  expiresAt: number;
};

@Injectable()
export class LocalStorageService implements OnModuleInit {
  private readonly root = path.resolve(env.storage.root);

  async onModuleInit(): Promise<void> {
    await mkdir(this.root, { recursive: true });
  }

  createStorageKey(context: string, originalName: string): string {
    const extension = path
      .extname(originalName)
      .toLowerCase()
      .replace(/[^.a-z0-9]/g, '');
    const date = new Date().toISOString().slice(0, 10);
    const safeContext = context.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    return `${safeContext}/${date}/${randomUUID()}${extension}`;
  }

  createToken(payload: StorageTokenPayload): string {
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac('sha256', env.storage.signingSecret)
      .update(encoded)
      .digest('base64url');
    return `${encoded}.${signature}`;
  }

  verifyToken(
    token: string,
    purpose: StorageTokenPayload['purpose'],
  ): StorageTokenPayload {
    const [encoded, suppliedSignature] = token.split('.');
    if (!encoded || !suppliedSignature) {
      throw new ApiException(
        'SIGNED_URL_INVALID',
        'Storage token is invalid.',
        401,
      );
    }

    const expected = createHmac('sha256', env.storage.signingSecret)
      .update(encoded)
      .digest();
    const supplied = Buffer.from(suppliedSignature, 'base64url');
    if (
      expected.length !== supplied.length ||
      !timingSafeEqual(expected, supplied)
    ) {
      throw new ApiException(
        'SIGNED_URL_INVALID',
        'Storage token is invalid.',
        401,
      );
    }

    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8'),
    ) as StorageTokenPayload;
    if (payload.purpose !== purpose || payload.expiresAt <= Date.now()) {
      throw new ApiException(
        'SIGNED_URL_EXPIRED',
        'Storage token has expired.',
        401,
      );
    }
    this.resolvePath(payload.storageKey);
    return payload;
  }

  async write(storageKey: string, body: Buffer): Promise<void> {
    if (body.length > env.storage.maxFileSizeBytes) {
      throw new ApiException(
        'FILE_TOO_LARGE',
        'File exceeds the configured limit.',
        422,
      );
    }
    const filePath = this.resolvePath(storageKey);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, body, { flag: 'wx' });
  }

  async remove(storageKey: string): Promise<void> {
    await rm(this.resolvePath(storageKey), { force: true });
  }

  async inspect(
    storageKey: string,
  ): Promise<{ sizeBytes: bigint; checksumSha256: string }> {
    const filePath = this.resolvePath(storageKey);
    const [metadata, body] = await Promise.all([
      stat(filePath),
      readFile(filePath),
    ]);
    return {
      sizeBytes: BigInt(metadata.size),
      checksumSha256: createHash('sha256').update(body).digest('hex'),
    };
  }

  openReadStream(storageKey: string) {
    return createReadStream(this.resolvePath(storageKey));
  }

  private resolvePath(storageKey: string): string {
    const resolved = path.resolve(this.root, storageKey);
    if (
      resolved !== this.root &&
      !resolved.startsWith(`${this.root}${path.sep}`)
    ) {
      throw new ApiException(
        'STORAGE_KEY_INVALID',
        'Storage key is invalid.',
        400,
      );
    }
    return resolved;
  }
}
