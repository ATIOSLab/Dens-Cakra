import { Module } from '@nestjs/common';
import { DomainAccessGuard } from '../../common/guards/domain-access.guard.js';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationService } from './authorization.service.js';
import { OrganizationService } from './organization.service.js';

@Module({
  imports: [AuthModule],
  providers: [OrganizationService, AuthorizationService, DomainAccessGuard],
  exports: [OrganizationService, AuthorizationService, DomainAccessGuard],
})
export class AccessModule {}
