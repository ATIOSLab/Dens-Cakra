import { Global, Module } from '@nestjs/common';
import { LocalStorageService } from './local-storage.service.js';
import { RedisService } from './redis.service.js';
import { SecretVaultService } from './secret-vault.service.js';
import { StorageTransportController } from './storage-transport.controller.js';

@Global()
@Module({
  controllers: [StorageTransportController],
  providers: [LocalStorageService, RedisService, SecretVaultService],
  exports: [LocalStorageService, RedisService, SecretVaultService],
})
export class InfrastructureModule {}
