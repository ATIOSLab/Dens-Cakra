import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { RbacController } from './rbac.controller.js';
import { RbacService } from './rbac.service.js';

@Module({
  imports: [AccessModule],
  controllers: [RbacController],
  providers: [RbacService],
})
export class RbacModule {}
