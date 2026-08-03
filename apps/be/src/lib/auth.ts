import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin } from 'better-auth/plugins';
import type { Prisma } from '../generated/prisma/client.js';
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
import { normalizeIpAddress, resolveIpLocation } from './ip-location.js';
import { prisma } from '../modules/prisma/prisma.service.js';
import {
  ensureUserProfileForAuthUser,
  getUserProfileIdForAuthUser,
  touchUserProfileLastLogin,
} from './user-profile.js';

async function createAuditLogForAuthEvent(input: {
  authUserId: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  deviceInfo?: string | null;
}) {
  const actorUserProfileId = await getUserProfileIdForAuthUser(
    input.authUserId,
  );

  await prisma.auditLog.create({
    data: {
      actorUserProfileId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      ipAddress: input.ipAddress ?? undefined,
      deviceInfo: input.deviceInfo ?? undefined,
      ...(input.metadata ? { metadata: input.metadata } : {}),
    },
  });
}

export const auth = betterAuth({
  appName: 'DENS CAKRA',
  baseURL: env.betterAuthUrl,
  secret: env.betterAuthSecret,
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  trustedOrigins: env.corsOrigins,
  databaseHooks: {
    user: {
      create: {
        before: async (user) => ({
          data: {
            ...user,
            emailVerified: true,
          },
        }),
        after: async (user) => {
          await ensureUserProfileForAuthUser({
            authUserId: user.id,
            fullName: user.name,
          });
        },
      },
      update: {
        after: async (user) => {
          await ensureUserProfileForAuthUser({
            authUserId: user.id,
            fullName: user.name,
          });
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const now = new Date();

          await prisma.session.deleteMany({
            where: {
              userId: session.userId,
              expiresAt: { lte: now },
            },
          });

          const normalizedIpAddress = normalizeIpAddress(session.ipAddress);
          const location = await resolveIpLocation(normalizedIpAddress);

          return {
            data: {
              ipAddress: normalizedIpAddress ?? null,
              locationLabel: location.label,
            },
          };
        },
        after: async (session) => {
          await touchUserProfileLastLogin(session.userId);
          await createAuditLogForAuthEvent({
            authUserId: session.userId,
            action: 'auth.session.created',
            entityType: 'Session',
            entityId: session.id,
            ipAddress: session.ipAddress ?? null,
            deviceInfo: session.userAgent ?? null,
            metadata: {
              locationLabel: session.locationLabel ?? 'Unknown location',
            },
          });
        },
      },
      delete: {
        after: async (session) => {
          await createAuditLogForAuthEvent({
            authUserId: session.userId,
            action: 'auth.session.deleted',
            entityType: 'Session',
            entityId: session.id,
            ipAddress: session.ipAddress ?? null,
            deviceInfo: session.userAgent ?? null,
            metadata: {
              locationLabel: session.locationLabel ?? 'Unknown location',
            },
          });
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: env.authDisableSignUp,
    requireEmailVerification: false,
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
      await createAuditLogForAuthEvent({
        authUserId: user.id,
        action: 'auth.password.reset',
        entityType: 'user',
        entityId: user.id,
        metadata: {
          email: user.email,
        },
      });
    },
  },
  emailVerification: {
    sendOnSignUp: false,
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
      await createAuditLogForAuthEvent({
        authUserId: user.id,
        action: 'auth.email.verified',
        entityType: 'user',
        entityId: user.id,
        metadata: {
          email: user.email,
        },
      });
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 12,
    additionalFields: {
      locationLabel: {
        type: 'string',
        required: false,
        input: false,
      },
    },
    cookieCache: {
      enabled: false,
    },
  },
  rateLimit: {
    enabled: true,
    window: 10,
    max: 100,
    storage: 'memory',
    customRules: {
      '/sign-in/email': { window: 10, max: 3 },
      '/forget-password': { window: 60, max: 3 },
    },
  },
  advanced: {
    cookiePrefix: 'denscakra',
    useSecureCookies: env.nodeEnv === 'production',
    ipAddress: {
      ipAddressHeaders: ['x-real-ip', 'x-forwarded-for'],
    },
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
