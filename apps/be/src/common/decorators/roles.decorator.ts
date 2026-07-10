import { SetMetadata } from '@nestjs/common';
import type { SystemRole } from '../constants/system-role.js';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: SystemRole[]) => SetMetadata(ROLES_KEY, roles);
