import { jest } from '@jest/globals';
import {
  SYSTEM_SETTING_KEYS,
  SystemConfigService,
} from './system-config.service.js';

describe('SystemConfigService', () => {
  it('mengembalikan coachingReportEnabled: true dan activePeriod: 1 secara default jika belum disetel', async () => {
    const prisma = {
      systemSetting: {
        findUnique: jest.fn(() => Promise.resolve(null)),
      },
    };

    const service = new SystemConfigService(prisma as never);
    const config = await service.getConfiguration();

    expect(config).toEqual({
      coachingReportEnabled: true,
      coachingReportActivePeriod: 1,
    });
    expect(prisma.systemSetting.findUnique).toHaveBeenCalledWith({
      where: { key: SYSTEM_SETTING_KEYS.COACHING_REPORT_ENABLED },
    });
    expect(prisma.systemSetting.findUnique).toHaveBeenCalledWith({
      where: { key: SYSTEM_SETTING_KEYS.COACHING_REPORT_ACTIVE_PERIOD },
    });
  });

  it('mengembalikan coachingReportEnabled: false dan activePeriod sesuai yang disetel di database', async () => {
    const prisma = {
      systemSetting: {
        findUnique: jest.fn((args: { where: { key: string } }) => {
          if (args.where.key === SYSTEM_SETTING_KEYS.COACHING_REPORT_ENABLED) {
            return Promise.resolve({
              key: SYSTEM_SETTING_KEYS.COACHING_REPORT_ENABLED,
              value: false,
            });
          }
          if (
            args.where.key === SYSTEM_SETTING_KEYS.COACHING_REPORT_ACTIVE_PERIOD
          ) {
            return Promise.resolve({
              key: SYSTEM_SETTING_KEYS.COACHING_REPORT_ACTIVE_PERIOD,
              value: 2,
            });
          }
          return Promise.resolve(null);
        }),
      },
    };

    const service = new SystemConfigService(prisma as never);
    const config = await service.getConfiguration();

    expect(config).toEqual({
      coachingReportEnabled: false,
      coachingReportActivePeriod: 2,
    });
  });

  it('memperbarui konfigurasi sistem dan mencatat log audit', async () => {
    const prisma = {
      systemSetting: {
        upsert: jest.fn(() =>
          Promise.resolve({
            id: 'setting-uuid-1',
            key: SYSTEM_SETTING_KEYS.COACHING_REPORT_ENABLED,
            value: false,
          }),
        ),
        findUnique: jest.fn((args: { where: { key: string } }) => {
          if (args.where.key === SYSTEM_SETTING_KEYS.COACHING_REPORT_ENABLED) {
            return Promise.resolve({
              key: SYSTEM_SETTING_KEYS.COACHING_REPORT_ENABLED,
              value: false,
            });
          }
          if (
            args.where.key === SYSTEM_SETTING_KEYS.COACHING_REPORT_ACTIVE_PERIOD
          ) {
            return Promise.resolve({
              key: SYSTEM_SETTING_KEYS.COACHING_REPORT_ACTIVE_PERIOD,
              value: 2,
            });
          }
          return Promise.resolve(null);
        }),
      },
      auditLog: {
        create: jest.fn(() => Promise.resolve({})),
      },
    };

    const service = new SystemConfigService(prisma as never);
    const context = {
      userProfileId: 'user-admin-1',
      primaryAssignmentId: 'assignment-admin-1',
    };

    const result = await service.updateConfiguration(
      { coachingReportEnabled: false, coachingReportActivePeriod: 2 },
      context as never,
    );

    expect(result).toEqual({
      coachingReportEnabled: false,
      coachingReportActivePeriod: 2,
    });
    expect(prisma.systemSetting.upsert).toHaveBeenCalledWith({
      where: { key: SYSTEM_SETTING_KEYS.COACHING_REPORT_ENABLED },
      update: expect.objectContaining({
        value: false,
      }),
      create: expect.objectContaining({
        key: SYSTEM_SETTING_KEYS.COACHING_REPORT_ENABLED,
        value: false,
      }),
    });
    expect(prisma.systemSetting.upsert).toHaveBeenCalledWith({
      where: { key: SYSTEM_SETTING_KEYS.COACHING_REPORT_ACTIVE_PERIOD },
      update: expect.objectContaining({
        value: 2,
      }),
      create: expect.objectContaining({
        key: SYSTEM_SETTING_KEYS.COACHING_REPORT_ACTIVE_PERIOD,
        value: 2,
      }),
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserProfileId: 'user-admin-1',
        actorAssignmentId: 'assignment-admin-1',
        action: 'SYSTEM_CONFIG.COACHING_REPORT.UPDATE',
        entityType: 'SystemSetting',
        entityId: 'features.coaching_report',
        metadata: {
          coachingReportEnabled: false,
          coachingReportActivePeriod: 2,
        },
      }),
    });
  });
});
