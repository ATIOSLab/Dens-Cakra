import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import type { UpdateSystemConfigDto } from './system.dto.js';

export const SYSTEM_SETTING_KEYS = {
  COACHING_REPORT_ENABLED: 'features.coaching_report.enabled',
} as const;

@Injectable()
export class SystemConfigService {
  private readonly logger = new Logger(SystemConfigService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getConfiguration() {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: SYSTEM_SETTING_KEYS.COACHING_REPORT_ENABLED },
    });

    const coachingReportEnabled = setting?.value === false ? false : true;

    return {
      coachingReportEnabled,
    };
  }

  async updateConfiguration(
    dto: UpdateSystemConfigDto,
    context: AuthorizationContext,
  ) {
    const updated = await this.prisma.systemSetting.upsert({
      where: { key: SYSTEM_SETTING_KEYS.COACHING_REPORT_ENABLED },
      update: {
        value: dto.coachingReportEnabled,
        description:
          'Status aktif fitur pembuatan laporan pembinaan Jaring oleh Petugas Wilayah (Gaswil).',
        isSecret: false,
      },
      create: {
        key: SYSTEM_SETTING_KEYS.COACHING_REPORT_ENABLED,
        value: dto.coachingReportEnabled,
        description:
          'Status aktif fitur pembuatan laporan pembinaan Jaring oleh Petugas Wilayah (Gaswil).',
        isSecret: false,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserProfileId: context.userProfileId,
        actorAssignmentId: context.primaryAssignmentId,
        action: 'SYSTEM_CONFIG.COACHING_REPORT.UPDATE',
        entityType: 'SystemSetting',
        entityId: updated.id,
        metadata: {
          key: SYSTEM_SETTING_KEYS.COACHING_REPORT_ENABLED,
          coachingReportEnabled: dto.coachingReportEnabled,
        },
      },
    });

    this.logger.log(
      `Konfigurasi sistem diperbarui: coachingReportEnabled=${dto.coachingReportEnabled} oleh ${context.userProfileId}`,
    );

    return {
      coachingReportEnabled: dto.coachingReportEnabled,
    };
  }
}
