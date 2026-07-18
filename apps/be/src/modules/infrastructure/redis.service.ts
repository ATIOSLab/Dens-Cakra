import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { env } from '../../lib/env.js';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client = new Redis(env.redis.url, {
    enableReadyCheck: true,
    lazyConnect: true,
    maxRetriesPerRequest: 2,
    retryStrategy: (times: number) => Math.min(times * 200, 2_000),
  });
  private connectPromise?: Promise<void>;

  constructor() {
    this.client.on('error', (error: Error) => {
      this.logger.warn(`Redis connection error: ${error.message}`);
    });
  }

  async onModuleDestroy() {
    this.client.disconnect();
  }

  async get(key: string) {
    await this.ensureConnected();
    return this.client.get(this.key(key));
  }

  async setJson(key: string, value: unknown, ttlSeconds: number) {
    await this.ensureConnected();
    await this.client.set(
      this.key(key),
      JSON.stringify(value),
      'EX',
      ttlSeconds,
    );
  }

  async setIfAbsent(key: string, value: string, ttlSeconds: number) {
    await this.ensureConnected();
    const result = await this.client.set(
      this.key(key),
      value,
      'EX',
      ttlSeconds,
      'NX',
    );
    return result === 'OK';
  }

  async delete(key: string) {
    await this.ensureConnected();
    await this.client.del(this.key(key));
  }

  async acquireLock(key: string, token: string, ttlMs: number) {
    await this.ensureConnected();
    const result = await this.client.set(this.key(key), token, 'PX', ttlMs, 'NX');
    return result === 'OK';
  }

  async releaseLock(key: string, token: string) {
    await this.ensureConnected();
    await this.client.eval(
      "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
      1,
      this.key(key),
      token,
    );
  }

  private key(key: string) {
    return `${env.redis.keyPrefix}:${key}`;
  }

  private async ensureConnected() {
    if (this.client.status === 'ready') {
      return;
    }

    if (!this.connectPromise) {
      this.connectPromise = this.client.connect().finally(() => {
        this.connectPromise = undefined;
      });
    }

    await this.connectPromise;
  }
}
