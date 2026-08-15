import { Module } from '@nestjs/common';
import { SessionGuard } from '../../common/guards/session.guard.js';

@Module({
  providers: [SessionGuard],
  exports: [SessionGuard],
})
export class AuthModule {}
