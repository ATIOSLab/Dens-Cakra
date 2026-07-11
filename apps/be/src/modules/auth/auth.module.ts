import { Module } from '@nestjs/common';
import { RoleGuard } from '../../common/guards/role.guard.js';
import { SessionGuard } from '../../common/guards/session.guard.js';

@Module({
  providers: [SessionGuard, RoleGuard],
  exports: [SessionGuard, RoleGuard],
})
export class AuthModule {}
