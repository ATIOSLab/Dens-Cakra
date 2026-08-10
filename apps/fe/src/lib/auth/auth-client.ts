import { adminClient, usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { accessControl, accessControlRoles } from "./access-control";

export const authClient = createAuthClient({
  basePath: "/api/auth",
  fetchOptions: {
    credentials: "include",
  },
  plugins: [
    adminClient({
      ac: accessControl,
      roles: accessControlRoles,
    }),
    usernameClient(),
  ],
});

export const { useSession } = authClient;
