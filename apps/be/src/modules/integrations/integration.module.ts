import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { FileModule } from '../files/file.module.js';
import { InfrastructureModule } from '../infrastructure/infrastructure.module.js';
import { SpatialModule } from '../spatial/spatial.module.js';
import { WhatsAppChannelScopeService } from '../whatsapp/whatsapp-channel-scope.service.js';
import { IntegrationController } from './integration.controller.js';
import { IntegrationService } from './integration.service.js';
import { WhatsappBotRuntimeService } from './whatsapp-bot-runtime.service.js';
import { WhatsAppReportFlowService } from './whatsapp-report-flow.service.js';

@Module({
  imports: [AccessModule, FileModule, InfrastructureModule, SpatialModule],
  controllers: [IntegrationController],
  providers: [
    IntegrationService,
    WhatsappBotRuntimeService,
    WhatsAppReportFlowService,
    WhatsAppChannelScopeService,
  ],
})
export class IntegrationModule {}
