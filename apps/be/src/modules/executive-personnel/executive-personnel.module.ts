import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ExecutivePersonnelController } from './executive-personnel.controller.js';
import { ExecutivePersonnelService } from './executive-personnel.service.js';

@Module({
  imports: [AccessModule, PrismaModule],
  controllers: [ExecutivePersonnelController],
  providers: [ExecutivePersonnelService],
})
export class ExecutivePersonnelModule {}
