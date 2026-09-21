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

type CachedSessionEntry = {
  session: NonNullable<AuthenticatedRequest['authSession']>;
  user: NonNullable<AuthenticatedRequest['authUser']>;
  cachedUntil: number;
};

const sessionCache = new Map<string, CachedSessionEntry>();
const SESSION_CACHE_TTL_MS = 20_000;
const SESSION_CACHE_MAX_ENTRIES = 1_000;

export function invalidateSessionCache(tokenOrHeader?: string): void {
  if (tokenOrHeader) {
    sessionCache.delete(tokenOrHeader);
  } else {
    sessionCache.clear();
  }
}

function extractSessionCookieKey(cookieHeader?: string): string | null {
  if (!cookieHeader) return null;
  const match =
    /(?:^|;\s*)(?:denscakra|better-auth)\.session_token=([^;]+)/.exec(
      cookieHeader,
    );
  if (match) {
    return match[1];
  }
  return cookieHeader;
}

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

    const cookieHeader = request.headers.cookie;
    const cacheKey = extractSessionCookieKey(cookieHeader);

    if (cacheKey) {
      const cached = sessionCache.get(cacheKey);
      const now = Date.now();
      if (
        cached &&
        cached.cachedUntil > now &&
        (!cached.session.expiresAt ||
          new Date(cached.session.expiresAt).getTime() > now)
      ) {
        request.authSession = cached.session;
        request.authUser = cached.user;
        return true;
      }
    }

    const sessionPayload = await auth.api.getSession({
      headers: toWebHeaders(request.headers),
    });

    if (!sessionPayload?.session || !sessionPayload.user) {
      if (cacheKey) {
        sessionCache.delete(cacheKey);
      }
      throw new UnauthorizedException('Session is missing or invalid.');
    }

    request.authSession = sessionPayload.session;
    request.authUser = sessionPayload.user;

    if (cacheKey) {
      if (sessionCache.size >= SESSION_CACHE_MAX_ENTRIES) {
        for (const key of sessionCache.keys()) {
          sessionCache.delete(key);
          break;
        }
      }
      sessionCache.set(cacheKey, {
        session: sessionPayload.session,
        user: sessionPayload.user,
        cachedUntil: Date.now() + SESSION_CACHE_TTL_MS,
      });
    }

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
