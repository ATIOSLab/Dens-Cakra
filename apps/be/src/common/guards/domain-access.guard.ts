import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import type { SystemRole } from '../constants/system-role.js';
import type { AuthenticatedRequest } from '../types/authenticated-request.js';
import { AuthorizationService } from '../../modules/access/authorization.service.js';

@Injectable()
export class DomainAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.isPublic(context)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.authUser?.id) {
      throw new UnauthorizedException(
        'SessionGuard must run before DomainAccessGuard.',
      );
    }

    if (request.authorizationContext) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<SystemRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    request.authorizationContext = await this.authorizationService.authorize({
      authUserId: request.authUser.id,
      authRole: request.authUser.role ?? null,
      allowedRoles: requiredRoles,
    });

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
