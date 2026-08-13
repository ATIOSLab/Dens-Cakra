import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiTags } from '@nestjs/swagger';
import * as PrismaEnums from '../../generated/prisma/enums.js';
import { Prisma } from '../../generated/prisma/client.js';
import { apiResult } from '../../common/api/api-response.js';
import { ApiContract } from '../../common/decorators/api-contract.decorator.js';
import { CurrentAccessContext } from '../../common/decorators/current-access-context.decorator.js';
import { DomainAccessGuard } from '../../common/guards/domain-access.guard.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { SecretVaultService } from '../infrastructure/secret-vault.service.js';
import {
  MailSettingsService,
  TestSmtpSettingsDto,
  UpdateSmtpSettingsDto,
} from '../infrastructure/mail-settings.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
class EnumQuery {
  @IsOptional() @IsString() names?: string;
}
class SettingQuery {
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsBoolean() includeSecrets = false;
}
class UpsertSettingDto {
  @IsObject() value!: Record<string, unknown>;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsBoolean() isSecret!: boolean;
}
@ApiTags('27. System Administration & Reference Data')
@UseGuards(SessionGuard, DomainAccessGuard)
@Controller()
export class SystemController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vault: SecretVaultService,
    private readonly mailSettings: MailSettingsService,
  ) {}
  @Get('reference-data/enums')
  @ApiContract({
    operationId: 'apiSys001',
    contractId: 'API-SYS-001',
    summary: 'Enum/reference untuk UI',
  })
  enums(@Query() q: EnumQuery) {
    const allowlist = new Set([
      'RoleCode',
      'PositionCode',
      'OrganizationType',
      'AdministrativeLevel',
      'PriorityLevel',
      'DirectiveStatus',
      'TaskStatus',
      'TaskAssignmentStatus',
      'JaringStatus',
      'BaketStatus',
      'VerificationStatus',
      'ProductStatus',
      'ApprovalStage',
      'DistributionStatus',
      'EmergencyStatus',
      'AlertSeverity',
      'AlertStatus',
    ]);
    const names = (
      q.names
        ?.split(',')
        .map((x) => x.trim())
        .filter(Boolean) ?? [...allowlist]
    ).filter((x) => allowlist.has(x));
    const data = Object.fromEntries(
      names.map((name) => [
        name,
        PrismaEnums[name as keyof typeof PrismaEnums],
      ]),
    );
    return apiResult(data);
  }
  @Get('system/settings')
  @ApiContract({
    operationId: 'apiSys002',
    contractId: 'API-SYS-002',
    summary: 'Daftar settings',
    roles: ['admin_system'],
  })
  async settings(@Query() q: SettingQuery) {
    const items = await this.prisma.systemSetting.findMany({
      where: q.search
        ? {
            OR: [
              { key: { contains: q.search, mode: 'insensitive' } },
              { description: { contains: q.search, mode: 'insensitive' } },
            ],
          }
        : {},
      orderBy: { key: 'asc' },
    });
    return apiResult(
      items.map((i) => ({
        ...i,
        value: i.isSecret ? { redacted: true } : i.value,
      })),
    );
  }
  @Get('system/email-settings')
  @ApiContract({
    operationId: 'apiSys008',
    contractId: 'API-SYS-008',
    summary: 'Pengaturan SMTP email',
    roles: ['admin_system'],
  })
  async emailSettings() {
    return apiResult(await this.mailSettings.getSettings());
  }
  @Put('system/email-settings')
  @ApiContract({
    operationId: 'apiSys009',
    contractId: 'API-SYS-009',
    summary: 'Ubah pengaturan SMTP email',
    roles: ['admin_system'],
    idempotent: true,
  })
  async updateEmailSettings(
    @Body() body: UpdateSmtpSettingsDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.mailSettings.updateSettings(body, context));
  }
  @Post('system/email-settings/test')
  @ApiContract({
    operationId: 'apiSys010',
    contractId: 'API-SYS-010',
    summary: 'Kirim tes SMTP email',
    roles: ['admin_system'],
  })
  async testEmailSettings(
    @Body() body: TestSmtpSettingsDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.mailSettings.sendTest(body, context));
  }
  @Get('system/settings/:key')
  @ApiContract({
    operationId: 'apiSys003',
    contractId: 'API-SYS-003',
    summary: 'Detail setting',
    roles: ['admin_system'],
  })
  async setting(@Param('key') key: string) {
    const i = await this.prisma.systemSetting.findUniqueOrThrow({
      where: { key },
    });
    return apiResult({
      ...i,
      value: i.isSecret ? { redacted: true } : i.value,
    });
  }
  @Put('system/settings/:key')
  @ApiContract({
    operationId: 'apiSys004',
    contractId: 'API-SYS-004',
    summary: 'Upsert setting',
    roles: ['admin_system'],
    idempotent: true,
  })
  async upsert(
    @Param('key') key: string,
    @Body() b: UpsertSettingDto,
    @CurrentAccessContext() a: AuthorizationContext,
  ) {
    const before = await this.prisma.systemSetting.findUnique({
      where: { key },
    });
    const value = (
      b.isSecret ? this.vault.encrypt(b.value) : b.value
    ) as Prisma.InputJsonValue;
    const item = await this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value, description: b.description, isSecret: b.isSecret },
      update: { value, description: b.description, isSecret: b.isSecret },
    });
    await this.prisma.auditLog.create({
      data: {
        actorUserProfileId: a.userProfileId,
        actorAssignmentId: a.primaryAssignmentId,
        action: 'SYSTEM.SETTING.UPSERT',
        entityType: 'SystemSetting',
        entityId: item.id,
        beforeData: before
          ? { key: before.key, isSecret: before.isSecret }
          : Prisma.JsonNull,
        afterData: { key: item.key, isSecret: item.isSecret },
      },
    });
    return apiResult({
      ...item,
      value: item.isSecret ? { redacted: true } : item.value,
    });
  }
  @Get('system/diagnostics')
  @ApiContract({
    operationId: 'apiSys007',
    contractId: 'API-SYS-007',
    summary: 'Diagnostics administratif',
    roles: ['admin_system'],
  })
  async diagnostics() {
    const [databaseVersion, migrationCount, deadJobs, failedWebhooks] =
      await Promise.all([
        this.prisma.$queryRaw<Array<{ version: string }>>`SELECT version()`,
        this.prisma.$queryRaw<
          Array<{ count: bigint }>
        >`SELECT count(*) AS count FROM "_prisma_migrations" WHERE "finished_at" IS NOT NULL`,
        this.prisma.asyncJob.count({ where: { status: 'DEAD_LETTER' } }),
        this.prisma.integrationWebhookEvent.count({
          where: { success: false },
        }),
      ]);
    return apiResult({
      database: {
        version: databaseVersion[0]?.version,
        migrations: Number(migrationCount[0]?.count ?? 0),
      },
      jobs: { deadLetter: deadJobs },
      integrations: { failedWebhooks },
    });
  }
}
