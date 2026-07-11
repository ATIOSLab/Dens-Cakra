import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { AuditController } from './audit.controller.js';
@Module({ imports: [AccessModule], controllers: [AuditController] })
export class AuditModule {}
