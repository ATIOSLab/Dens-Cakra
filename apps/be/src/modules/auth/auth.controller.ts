import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentSession } from '../../common/decorators/current-session.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { SessionGuard } from '../../common/guards/session.guard.js';

@Controller('auth')
export class AuthController {
  @Get('me')
  @UseGuards(SessionGuard)
  getCurrentPrincipal(
    @CurrentUser() user: unknown,
    @CurrentSession() session: unknown,
  ) {
    return {
      user,
      session,
    };
  }
}
