import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";

import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

export const permissionStatements = {
  ...defaultStatements,
  dashboard: ["read"],
  organization: ["read"],
  position: ["read"],
  area: ["read"],
  directive: ["acknowledge", "cancel", "create", "distribute", "publish", "read", "track", "update"],
  uuk: ["cancel", "create", "publish", "read", "update"],
  task: ["assign", "cancel", "create", "execute", "read", "reassign", "update"],
  assignment: ["read"],
} as const;

export const accessControl = createAccessControl(permissionStatements);

const adminSystemAdminPermissions = {
  user: [
    "create",
    "list",
    "set-role",
    "ban",
    "impersonate",
    "impersonate-admins",
    "set-password",
    "set-email",
    "get",
    "update",
  ],
  session: ["list", "revoke", "delete"],
} as const;

export const accessControlRoles = {
  [SYSTEM_ROLES.EXECUTIVE]: accessControl.newRole({
    dashboard: ["read"],
    organization: ["read"],
    position: ["read"],
    area: ["read"],
    directive: ["cancel", "create", "distribute", "publish", "read", "track", "update"],
    uuk: ["read"],
    task: ["read"],
    assignment: ["read"],
  }),
  [SYSTEM_ROLES.REGIONAL_COMMANDER]: accessControl.newRole({
    dashboard: ["read"],
    organization: ["read"],
    position: ["read"],
    area: ["read"],
    directive: ["acknowledge", "read", "track"],
    uuk: ["cancel", "create", "publish", "read", "update"],
    task: ["read"],
    assignment: ["read"],
  }),
  [SYSTEM_ROLES.FIELD_COORDINATOR]: accessControl.newRole({
    dashboard: ["read"],
    organization: ["read"],
    position: ["read"],
    area: ["read"],
    directive: ["acknowledge", "read"],
    uuk: ["read"],
    task: ["assign", "read", "reassign"],
    assignment: ["read"],
  }),
  [SYSTEM_ROLES.FIELD_OFFICER]: accessControl.newRole({
    dashboard: ["read"],
    area: ["read"],
    task: ["execute", "read"],
    assignment: ["read"],
  }),
  [SYSTEM_ROLES.ADMIN_SYSTEM]: accessControl.newRole({
    ...adminSystemAdminPermissions,
  }),
} as const;
