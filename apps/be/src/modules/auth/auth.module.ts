import { Module } from '@nestjs/common';
import { RoleGuard } from '../../common/guards/role.guard.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import { AuthController } from './auth.controller.js';

@Module({
  controllers: [AuthController],
  providers: [SessionGuard, RoleGuard],
  exports: [SessionGuard, RoleGuard],
})
export class AuthModule {}
