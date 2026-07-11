import type { Request } from 'express';
import type { Session, User } from 'better-auth';
import type { AuthorizationContext } from './authorization-context.js';

export type AuthenticatedUser = User & {
  role?: string | null;
};

export type AuthenticatedRequest = Request & {
  requestId?: string;
  authSession?: Session | null;
  authUser?: AuthenticatedUser | null;
  authorizationContext?: AuthorizationContext | null;
};
