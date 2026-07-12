import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { SpatialModule } from '../spatial/spatial.module.js';
import { WhatsAppController } from './whatsapp.controller.js';
import { WhatsAppProcessor } from './whatsapp.processor.js';
import { WhatsAppService } from './whatsapp.service.js';
@Module({
  imports: [AccessModule, SpatialModule],
  controllers: [WhatsAppController],
  providers: [WhatsAppProcessor, WhatsAppService],
})
export class WhatsAppModule {}
