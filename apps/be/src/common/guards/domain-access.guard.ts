import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
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
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.authUser?.id) {
      throw new UnauthorizedException(
        'SessionGuard must run before DomainAccessGuard.',
      );
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
}
