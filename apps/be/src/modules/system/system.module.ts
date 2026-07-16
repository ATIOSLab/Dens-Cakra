import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { SecurityController } from './security.controller.js';
import { SystemController } from './system.controller.js';
@Module({
  imports: [AccessModule],
  controllers: [SystemController, SecurityController],
})
export class SystemModule {}
