import { jest } from '@jest/globals';
import {
  SYSTEM_SETTING_KEYS,
  SystemConfigService,
} from './system-config.service.js';

describe('SystemConfigService', () => {
  it('mengembalikan coachingReportEnabled: true secara default jika belum disetel', async () => {
    const prisma = {
      systemSetting: {
        findUnique: jest.fn(() => Promise.resolve(null)),
      },
    };

    const service = new SystemConfigService(prisma as never);
    const config = await service.getConfiguration();

    expect(config).toEqual({ coachingReportEnabled: true });
    expect(prisma.systemSetting.findUnique).toHaveBeenCalledWith({
      where: { key: SYSTEM_SETTING_KEYS.COACHING_REPORT_ENABLED },
    });
  });

  it('mengembalikan coachingReportEnabled: false jika disetel false di database', async () => {
    const prisma = {
      systemSetting: {
        findUnique: jest.fn(() =>
          Promise.resolve({
            key: SYSTEM_SETTING_KEYS.COACHING_REPORT_ENABLED,
            value: false,
          }),
        ),
      },
    };

    const service = new SystemConfigService(prisma as never);
    const config = await service.getConfiguration();

    expect(config).toEqual({ coachingReportEnabled: false });
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
      { coachingReportEnabled: false },
      context as never,
    );

    expect(result).toEqual({ coachingReportEnabled: false });
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
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserProfileId: 'user-admin-1',
        actorAssignmentId: 'assignment-admin-1',
        action: 'SYSTEM_CONFIG.COACHING_REPORT.UPDATE',
        entityType: 'SystemSetting',
        entityId: 'setting-uuid-1',
        metadata: {
          key: SYSTEM_SETTING_KEYS.COACHING_REPORT_ENABLED,
          coachingReportEnabled: false,
        },
      }),
    });
  });
});
