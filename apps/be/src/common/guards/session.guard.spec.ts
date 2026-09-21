import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { jest } from '@jest/globals';
import { SessionGuard, invalidateSessionCache } from './session.guard.js';
import { auth } from '../../lib/auth.js';
import type { AuthenticatedRequest } from '../types/authenticated-request.js';

describe('SessionGuard', () => {
  let guard: SessionGuard;
  let reflector: Reflector;

  beforeEach(() => {
    invalidateSessionCache();
    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    guard = new SessionGuard(reflector);
  });

  afterEach(() => {
    invalidateSessionCache();
    jest.restoreAllMocks();
  });

  it('bypasses public endpoints', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);
    const mockContext = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
      }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(mockContext);
    expect(result).toBe(true);
  });

  it('uses in-memory fast-path cache on subsequent requests with identical cookie', async () => {
    const mockSession = {
      id: 'session-1',
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    };
    const mockUser = {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'executive',
    };

    const getSessionSpy = jest.spyOn(auth.api, 'getSession').mockResolvedValue({
      session: mockSession as never,
      user: mockUser as never,
    });

    const request1 = {
      headers: {
        cookie: 'denscakra.session_token=valid-token-123',
      },
    } as unknown as AuthenticatedRequest;
    const context1 = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => request1,
      }),
    } as unknown as ExecutionContext;

    const result1 = await guard.canActivate(context1);
    expect(result1).toBe(true);
    expect(request1.authUser).toEqual(mockUser);
    expect(request1.authSession).toEqual(mockSession);
    expect(getSessionSpy).toHaveBeenCalledTimes(1);

    // Second request with same cookie
    const request2 = {
      headers: {
        cookie: 'denscakra.session_token=valid-token-123',
      },
    } as unknown as AuthenticatedRequest;
    const context2 = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => request2,
      }),
    } as unknown as ExecutionContext;

    const result2 = await guard.canActivate(context2);
    expect(result2).toBe(true);
    expect(request2.authUser).toEqual(mockUser);
    expect(request2.authSession).toEqual(mockSession);
    // getSession was NOT called a second time — cache HIT!
    expect(getSessionSpy).toHaveBeenCalledTimes(1);
  });

  it('throws UnauthorizedException when session is missing and clears cache', async () => {
    jest.spyOn(auth.api, 'getSession').mockResolvedValue(null);

    const request = {
      headers: {
        cookie: 'denscakra.session_token=invalid-token',
      },
    } as unknown as AuthenticatedRequest;
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
