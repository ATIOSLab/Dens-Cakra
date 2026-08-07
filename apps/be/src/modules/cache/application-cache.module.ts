import { CacheModule } from '@nestjs/cache-manager';
import { Global, Module } from '@nestjs/common';
import { createKeyv } from '@keyv/redis';
import { env } from '../../lib/env.js';
import { ApplicationCacheService } from './application-cache.service.js';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: () => ({
        ttl: env.cache.defaultTtlMs,
        ...(env.cache.enabled && env.cache.redisUrl
          ? {
              stores: [
                createKeyv(env.cache.redisUrl, {
                  namespace: env.cache.prefix,
                  connectionTimeout: env.cache.connectTimeoutMs,
                  throwOnConnectError: true,
                  throwOnErrors: true,
                  useUnlink: true,
                }) as never,
              ],
            }
          : {}),
      }),
    }),
  ],
  providers: [ApplicationCacheService],
  exports: [ApplicationCacheService],
})
export class ApplicationCacheModule {}
