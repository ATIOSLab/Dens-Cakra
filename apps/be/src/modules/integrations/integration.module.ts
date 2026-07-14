import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { InfrastructureModule } from '../infrastructure/infrastructure.module.js';
import { SpatialModule } from '../spatial/spatial.module.js';
import { IntegrationController } from './integration.controller.js';
import { IntegrationService } from './integration.service.js';
import { WhatsappBotRuntimeService } from './whatsapp-bot-runtime.service.js';

@Module({
  imports: [AccessModule, InfrastructureModule, SpatialModule],
  controllers: [IntegrationController],
  providers: [IntegrationService, WhatsappBotRuntimeService],
})
export class IntegrationModule {}
