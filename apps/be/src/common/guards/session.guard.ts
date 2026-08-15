import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { auth } from '../../lib/auth.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { toWebHeaders } from '../utils/node-headers.js';
import type { AuthenticatedRequest } from '../types/authenticated-request.js';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.isPublic(context)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (request.authUser?.id) {
      return true;
    }

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

  private isPublic(context: ExecutionContext): boolean {
    return (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) === true
    );
  }
}
