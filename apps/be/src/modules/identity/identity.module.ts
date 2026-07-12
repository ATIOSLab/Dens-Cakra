import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { IdentityController } from './identity.controller.js';
import { IdentityService } from './identity.service.js';

@Module({
  imports: [AccessModule],
  controllers: [IdentityController],
  providers: [IdentityService],
})
export class IdentityModule {}
