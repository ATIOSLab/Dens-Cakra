import { Module } from '@nestjs/common';
import { DomainAccessGuard } from '../../common/guards/domain-access.guard.js';
import { AuthModule } from '../auth/auth.module.js';
import { AccessController } from './access.controller.js';
import { AuthorizationService } from './authorization.service.js';
import { OrganizationService } from './organization.service.js';

@Module({
  imports: [AuthModule],
  controllers: [AccessController],
  providers: [OrganizationService, AuthorizationService, DomainAccessGuard],
  exports: [OrganizationService, AuthorizationService, DomainAccessGuard],
})
export class AccessModule {}
