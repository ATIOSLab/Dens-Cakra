import { Global, Module } from '@nestjs/common';
import { LocalStorageService } from './local-storage.service.js';
import { MailSettingsService } from './mail-settings.service.js';
import { SecretVaultService } from './secret-vault.service.js';
import { StorageTransportController } from './storage-transport.controller.js';

@Global()
@Module({
  controllers: [StorageTransportController],
  providers: [LocalStorageService, MailSettingsService, SecretVaultService],
  exports: [LocalStorageService, MailSettingsService, SecretVaultService],
})
export class InfrastructureModule {}
