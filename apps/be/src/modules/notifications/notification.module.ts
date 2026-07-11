import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { NotificationController } from './notification.controller.js';
import { NotificationService } from './notification.service.js';

@Module({
  imports: [AccessModule],
  controllers: [NotificationController],
  providers: [NotificationService],
})
export class NotificationModule {}
