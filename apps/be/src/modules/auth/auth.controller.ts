import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentSession } from '../../common/decorators/current-session.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { SessionGuard } from '../../common/guards/session.guard.js';

type AuthMeUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role?: string | null;
  emailVerified?: boolean;
};

type AuthMeSession = {
  id: string;
  expiresAt: Date | string;
  ipAddress?: string | null;
  userAgent?: string | null;
};

@Controller('auth')
export class AuthController {
  @Get('me')
  @UseGuards(SessionGuard)
  getCurrentPrincipal(
    @CurrentUser() user: AuthMeUser,
    @CurrentSession() session: AuthMeSession,
  ) {
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image ?? null,
        role: user.role ?? null,
        emailVerified: Boolean(user.emailVerified),
      },
      session: {
        id: session.id,
        expiresAt:
          session.expiresAt instanceof Date
            ? session.expiresAt.toISOString()
            : session.expiresAt,
        ipAddress: session.ipAddress ?? null,
        userAgent: session.userAgent ?? null,
      },
    };
  }
}
