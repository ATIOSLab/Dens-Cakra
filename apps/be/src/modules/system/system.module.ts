import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { SystemController } from './system.controller.js';
@Module({ imports: [AccessModule], controllers: [SystemController] })
export class SystemModule {}
