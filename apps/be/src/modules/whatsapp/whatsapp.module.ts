import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { WhatsappController } from './whatsapp.controller.js';
import { WhatsappService } from './whatsapp.service.js';

@Module({
  controllers: [WhatsappController],
  imports: [PrismaModule],
  providers: [WhatsappService],
})
export class WhatsappModule {}
