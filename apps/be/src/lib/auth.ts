import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin } from 'better-auth/plugins';
import {
  accessControl,
  accessControlRoles,
} from '../common/permissions/access-control.js';
import { SYSTEM_ROLES } from '../common/constants/system-role.js';
import { env } from './env.js';
import {
  createResetPasswordEmail,
  createVerificationEmail,
  queueMail,
} from './email.js';
import { prisma } from '../modules/prisma/prisma.service.js';

export const auth = betterAuth({
  appName: 'DEN CAKRA',
  baseURL: env.betterAuthUrl,
  secret: env.betterAuthSecret,
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  trustedOrigins: env.corsOrigins,
  emailAndPassword: {
    enabled: true,
    disableSignUp: env.authDisableSignUp,
    requireEmailVerification: true,
    autoSignIn: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    customSyntheticUser: ({ coreFields, id }) => ({
      ...coreFields,
      role: SYSTEM_ROLES.FIELD_OFFICER,
      banned: false,
      banReason: null,
      banExpires: null,
      id,
    }),
    sendResetPassword: ({ user, url }) => {
      const payload = createResetPasswordEmail({
        url,
        userName: user.name,
      });

      queueMail({
        to: user.email,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
      });

      return Promise.resolve();
    },
    onPasswordReset: async ({ user }) => {
      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          action: 'auth.password.reset',
          entityType: 'user',
          entityId: user.id,
          metadata: {
            email: user.email,
          },
        },
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: ({ user, url }) => {
      const payload = createVerificationEmail({
        url,
        userName: user.name,
      });

      queueMail({
        to: user.email,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
      });

      return Promise.resolve();
    },
    expiresIn: 60 * 60,
    autoSignInAfterVerification: false,
    afterEmailVerification: async (user) => {
      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          action: 'auth.email.verified',
          entityType: 'user',
          entityId: user.id,
          metadata: {
            email: user.email,
          },
        },
      });
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 12,
  },
  advanced: {
    cookiePrefix: 'denscakra',
  },
  experimental: {
    joins: true,
  },
  plugins: [
    admin({
      ac: accessControl,
      roles: accessControlRoles,
      adminRoles: [SYSTEM_ROLES.ADMIN_SYSTEM],
      defaultRole: SYSTEM_ROLES.FIELD_OFFICER,
    }),
  ],
});
