import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AccessController } from './access.controller.js';

@Module({
  imports: [AuthModule],
  controllers: [AccessController],
})
export class AccessModule {}
