import { Injectable, Logger } from '@nestjs/common';
import { LocationRequirement } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import type { UpdateSystemConfigDto } from './system.dto.js';

export const SYSTEM_SETTING_KEYS = {
  COACHING_REPORT_ENABLED: 'features.coaching_report.enabled',
  COACHING_REPORT_ACTIVE_PERIOD: 'features.coaching_report.active_period',
  WHATSAPP_LOCATION_REQUIREMENT: 'whatsapp.report.location_requirement',
} as const;

@Injectable()
export class SystemConfigService {
  private readonly logger = new Logger(SystemConfigService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getConfiguration() {
    const [enabledSetting, periodSetting, locationRequirementSetting] =
      await Promise.all([
        this.prisma.systemSetting.findUnique({
          where: { key: SYSTEM_SETTING_KEYS.COACHING_REPORT_ENABLED },
        }),
        this.prisma.systemSetting.findUnique({
          where: { key: SYSTEM_SETTING_KEYS.COACHING_REPORT_ACTIVE_PERIOD },
        }),
        this.prisma.systemSetting.findUnique({
          where: { key: SYSTEM_SETTING_KEYS.WHATSAPP_LOCATION_REQUIREMENT },
        }),
      ]);

    const coachingReportEnabled =
      enabledSetting?.value === false ? false : true;
    const coachingReportActivePeriod =
      typeof periodSetting?.value === 'number' && periodSetting.value >= 1
        ? Number(periodSetting.value)
        : 1;
    const whatsappLocationRequirement: LocationRequirement =
      locationRequirementSetting?.value === LocationRequirement.OPTIONAL
        ? LocationRequirement.OPTIONAL
        : LocationRequirement.REQUIRED;

    return {
      coachingReportEnabled,
      coachingReportActivePeriod,
      whatsappLocationRequirement,
    };
  }

  async updateConfiguration(
    dto: UpdateSystemConfigDto,
    context: AuthorizationContext,
  ) {
    const updates: Promise<any>[] = [];

    if (dto.coachingReportEnabled !== undefined) {
      updates.push(
        this.prisma.systemSetting.upsert({
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
        }),
      );
    }

    if (dto.coachingReportActivePeriod !== undefined) {
      updates.push(
        this.prisma.systemSetting.upsert({
          where: { key: SYSTEM_SETTING_KEYS.COACHING_REPORT_ACTIVE_PERIOD },
          update: {
            value: dto.coachingReportActivePeriod,
            description:
              'Nomor periode pembinaan aktif berjalan yang diasosiasikan ke laporan baru.',
            isSecret: false,
          },
          create: {
            key: SYSTEM_SETTING_KEYS.COACHING_REPORT_ACTIVE_PERIOD,
            value: dto.coachingReportActivePeriod,
            description:
              'Nomor periode pembinaan aktif berjalan yang diasosiasikan ke laporan baru.',
            isSecret: false,
          },
        }),
      );
    }

    if (dto.whatsappLocationRequirement !== undefined) {
      updates.push(
        this.prisma.systemSetting.upsert({
          where: { key: SYSTEM_SETTING_KEYS.WHATSAPP_LOCATION_REQUIREMENT },
          update: {
            value: dto.whatsappLocationRequirement,
            description:
              'Kewajiban pengiriman Live Location untuk pelaporan jaring via WhatsApp secara global.',
            isSecret: false,
          },
          create: {
            key: SYSTEM_SETTING_KEYS.WHATSAPP_LOCATION_REQUIREMENT,
            value: dto.whatsappLocationRequirement,
            description:
              'Kewajiban pengiriman Live Location untuk pelaporan jaring via WhatsApp secara global.',
            isSecret: false,
          },
        }),
      );
    }

    await Promise.all(updates);

    await this.prisma.auditLog.create({
      data: {
        actorUserProfileId: context.userProfileId,
        actorAssignmentId: context.primaryAssignmentId,
        action: 'SYSTEM_CONFIG.COACHING_REPORT.UPDATE',
        entityType: 'SystemSetting',
        entityId: 'features.coaching_report',
        metadata: {
          coachingReportEnabled: dto.coachingReportEnabled,
          coachingReportActivePeriod: dto.coachingReportActivePeriod,
          whatsappLocationRequirement: dto.whatsappLocationRequirement,
        },
      },
    });

    this.logger.log(
      `Konfigurasi sistem diperbarui: enabled=${dto.coachingReportEnabled}, activePeriod=${dto.coachingReportActivePeriod}, locationRequirement=${dto.whatsappLocationRequirement} oleh ${context.userProfileId}`,
    );

    return this.getConfiguration();
  }
}
