import {
  Controller,
  Get,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { apiResult } from '../../common/api/api-response.js';
import { ApiContract } from '../../common/decorators/api-contract.decorator.js';
import { CurrentAccessContext } from '../../common/decorators/current-access-context.decorator.js';
import { DomainAccessGuard } from '../../common/guards/domain-access.guard.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import {
  KpiDetailQueryDto,
  KpiExportQueryDto,
  KpiQueryDto,
} from './kpi.dto.js';
import { KpiExportService } from './kpi-export.service.js';
import { KpiService } from './kpi.service.js';

const KPI_ROLES = [
  'executive',
  'national_leader',
  'regional_commander',
  'field_coordinator',
  'field_officer',
] as const;

@ApiTags('KPI & Evaluasi')
@UseGuards(SessionGuard, DomainAccessGuard)
@Controller('dashboard/kpi')
export class KpiController {
  constructor(
    private readonly service: KpiService,
    private readonly exports: KpiExportService,
  ) {}

  @Get('summary')
  @ApiContract({
    operationId: 'apiKpi001',
    contractId: 'API-KPI-001',
    summary: 'Ringkasan KPI Jaring nasional sesuai scope',
    roles: [...KPI_ROLES],
  })
  async summary(
    @Query() query: KpiQueryDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.service.summary(query, context));
  }

  @Get('filters')
  @ApiContract({
    operationId: 'apiKpi010',
    contractId: 'API-KPI-010',
    summary: 'Pilihan filter KPI (pohon wilayah dan scope)',
    roles: [...KPI_ROLES],
  })
  async filters(@CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.filterOptions(context));
  }

  @Get('productivity')
  @ApiContract({
    operationId: 'apiKpi002',
    contractId: 'API-KPI-002',
    summary: 'Produktivitas Jaring Aktif Terverifikasi',
    roles: [...KPI_ROLES],
  })
  async productivity(
    @Query() query: KpiQueryDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.service.productivity(query, context));
  }

  @Get('region-comparison')
  @ApiContract({
    operationId: 'apiKpi003',
    contractId: 'API-KPI-003',
    summary: 'Perbandingan wilayah berjenjang',
    roles: [...KPI_ROLES],
  })
  async regionComparison(
    @Query() query: KpiQueryDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.service.regionComparison(query, context));
  }

  @Get('reports-baket')
  @ApiContract({
    operationId: 'apiKpi004',
    contractId: 'API-KPI-004',
    summary: 'Alur Laporan Jaring menjadi Baket',
    roles: [...KPI_ROLES],
  })
  async reportsBaket(
    @Query() query: KpiQueryDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.service.reportsBaket(query, context));
  }

  @Get('whatsapp-center')
  @ApiContract({
    operationId: 'apiKpi005',
    contractId: 'API-KPI-005',
    summary: 'Kendala WhatsApp Center',
    roles: [...KPI_ROLES],
  })
  async whatsappCenter(
    @Query() query: KpiQueryDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.service.whatsappCenter(query, context));
  }

  @Get('anomalies')
  @ApiContract({
    operationId: 'apiKpi006',
    contractId: 'API-KPI-006',
    summary: 'Deteksi anomali pelaporan',
    roles: [...KPI_ROLES],
  })
  async anomalies(
    @Query() query: KpiQueryDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.service.anomalies(query, context));
  }

  @Get('trends')
  @ApiContract({
    operationId: 'apiKpi007',
    contractId: 'API-KPI-007',
    summary: 'Tren dan perbandingan periode',
    roles: [...KPI_ROLES],
  })
  async trends(
    @Query() query: KpiQueryDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.service.trends(query, context));
  }

  @Get('detail')
  @ApiContract({
    operationId: 'apiKpi008',
    contractId: 'API-KPI-008',
    summary: 'Tabel detail agregat dimensi x metrik',
    roles: [...KPI_ROLES],
  })
  async detail(
    @Query() query: KpiDetailQueryDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.service.detail(query, context));
  }

  @Get('leaderboard')
  @ApiContract({
    operationId: 'apiKpi011',
    contractId: 'API-KPI-011',
    summary: 'Peringkat (leaderboard) Petugas Wilayah dan Jaring',
    roles: [...KPI_ROLES],
  })
  async leaderboard(
    @Query() query: KpiQueryDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.service.leaderboard(query, context));
  }

  @Get('export')
  @ApiContract({
    operationId: 'apiKpi009',
    contractId: 'API-KPI-009',
    summary: 'Ekspor laporan KPI (PDF/Word/Excel/Markdown)',
    roles: [...KPI_ROLES],
  })
  async export(
    @Query() query: KpiExportQueryDto,
    @CurrentAccessContext() context: AuthorizationContext,
    @Res({ passthrough: true }) response: Response,
  ) {
    const file = await this.exports.export(query, context, this.service);
    response.setHeader('Content-Type', file.contentType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );
    return new StreamableFile(file.buffer);
  }
}
