import { Module } from '@nestjs/common';
import { DomainAccessGuard } from '../../common/guards/domain-access.guard.js';
import { AuthModule } from '../auth/auth.module.js';
import { AccessController } from './access.controller.js';
import { AuthorizationService } from './authorization.service.js';
import { DomainScopeService } from './domain-scope.service.js';

@Module({
  imports: [AuthModule],
  controllers: [AccessController],
  providers: [
    AuthorizationService,
    DomainScopeService,
    DomainAccessGuard,
  ],
  exports: [
    AuthorizationService,
    DomainScopeService,
    DomainAccessGuard,
  ],
})
export class AccessModule {}
