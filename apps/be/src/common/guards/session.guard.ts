import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { auth } from '../../lib/auth.js';
import { toWebHeaders } from '../utils/node-headers.js';
import type { AuthenticatedRequest } from '../types/authenticated-request.js';

@Injectable()
export class SessionGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const sessionPayload = await auth.api.getSession({
      headers: toWebHeaders(request.headers),
    });

    if (!sessionPayload?.session || !sessionPayload.user) {
      throw new UnauthorizedException('Session is missing or invalid.');
    }

    request.authSession = sessionPayload.session;
    request.authUser = sessionPayload.user;

    return true;
  }
}
