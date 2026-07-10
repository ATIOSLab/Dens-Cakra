import type { Request } from 'express';
import type { Session, User } from 'better-auth';

export type AuthenticatedUser = User & {
  role?: string | null;
};

export type AuthenticatedRequest = Request & {
  authSession?: Session | null;
  authUser?: AuthenticatedUser | null;
};
