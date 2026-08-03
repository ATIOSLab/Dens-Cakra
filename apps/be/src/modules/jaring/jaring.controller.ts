import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { apiResult } from '../../common/api/api-response.js';
import { ApiContract } from '../../common/decorators/api-contract.decorator.js';
import { CurrentAccessContext } from '../../common/decorators/current-access-context.decorator.js';
import { DomainAccessGuard } from '../../common/guards/domain-access.guard.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import {
  CreateJaringOccupationDto,
  CreateJaringCoachingReportDto,
  CreateReportCategoryDto,
  CoverageDto,
  CreateJaringDto,
  JaringCoachingReportQuery,
  JaringOccupationQuery,
  JaringQuery,
  JaringReportQuery,
  ReportCategoryQuery,
  ReasonDto,
  RejectJaringDto,
  TransferDto,
  UpdateJaringOccupationDto,
  UpdateJaringReportMetadataDto,
  UpdateReportCategoryDto,
  UpdateJaringDto,
  VerifyJaringReportDto,
} from './jaring.dto.js';
import { JaringService } from './jaring.service.js';

@ApiTags('11. Jaring Management')
@UseGuards(SessionGuard, DomainAccessGuard)
@Controller('jaring')
export class JaringController {
  constructor(private readonly jaringService: JaringService) {}

  @Get()
  @ApiContract({
    operationId: 'apiJar001',
    contractId: 'API-JAR-001',
    summary: 'Daftar Jaring',
    roles: ['regional_commander', 'field_coordinator', 'field_officer'],
  })
  async list(
    @Query() query: JaringQuery,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.jaringService.list(query, context));
  }

  @Post()
  @ApiContract({
    operationId: 'apiJar002',
    contractId: 'API-JAR-002',
    summary: 'Buat Jaring',
    roles: ['field_officer'],
    successStatus: 201,
    idempotent: true,
  })
  async create(
    @Body() body: CreateJaringDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.jaringService.create(body, context));
  }

  @Get('occupations')
  @ApiContract({
    operationId: 'apiJarOccupation001',
    contractId: 'API-JAR-OCCUPATION-001',
    summary: 'Daftar pekerjaan Jaring',
    roles: [
      'admin_system',
      'field_officer',
      'operational_intelligence_manager',
    ],
  })
  async listOccupations(@Query() query: JaringOccupationQuery) {
    return apiResult(await this.jaringService.listOccupations(query));
  }

  @Post('occupations')
  @ApiContract({
    operationId: 'apiJarOccupation002',
    contractId: 'API-JAR-OCCUPATION-002',
    summary: 'Buat pekerjaan Jaring',
    roles: ['admin_system'],
    successStatus: 201,
    idempotent: true,
  })
  async createOccupation(
    @Body() body: CreateJaringOccupationDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.jaringService.createOccupation(body, context));
  }

  @Patch('occupations/:occupationId')
  @ApiContract({
    operationId: 'apiJarOccupation003',
    contractId: 'API-JAR-OCCUPATION-003',
    summary: 'Ubah pekerjaan Jaring',
    roles: ['admin_system'],
  })
  async updateOccupation(
    @Param('occupationId', ParseUUIDPipe) id: string,
    @Body() body: UpdateJaringOccupationDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.jaringService.updateOccupation(id, body, context),
    );
  }

  @Get('report-categories')
  @ApiContract({
    operationId: 'apiReportCategory001',
    contractId: 'API-REPORT-CATEGORY-001',
    summary: 'Daftar kategori laporan',
    roles: [
      'admin_system',
      'field_officer',
      'operational_intelligence_manager',
      'field_coordinator',
      'regional_commander',
      'executive',
    ],
  })
  async listReportCategories(@Query() query: ReportCategoryQuery) {
    return apiResult(await this.jaringService.listReportCategories(query));
  }

  @Post('report-categories')
  @ApiContract({
    operationId: 'apiReportCategory002',
    contractId: 'API-REPORT-CATEGORY-002',
    summary: 'Buat kategori laporan',
    roles: ['admin_system'],
    successStatus: 201,
    idempotent: true,
  })
  async createReportCategory(
    @Body() body: CreateReportCategoryDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.jaringService.createReportCategory(body, context),
    );
  }

  @Patch('report-categories/:categoryId')
  @ApiContract({
    operationId: 'apiReportCategory003',
    contractId: 'API-REPORT-CATEGORY-003',
    summary: 'Ubah kategori laporan',
    roles: ['admin_system'],
  })
  async updateReportCategory(
    @Param('categoryId', ParseUUIDPipe) id: string,
    @Body() body: UpdateReportCategoryDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.jaringService.updateReportCategory(id, body, context),
    );
  }

  @Get('reports')
  @ApiContract({
    operationId: 'apiJar015All',
    contractId: 'API-JAR-015-ALL',
    summary: 'Daftar semua laporan Jaring',
    roles: [
      'executive',
      'regional_commander',
      'operational_intelligence_manager',
      'field_coordinator',
      'field_officer',
    ],
  })
  async allReports(
    @Query() query: JaringReportQuery,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.jaringService.allReports(query, context));
  }

  @Get(':jaringId')
  @ApiContract({
    operationId: 'apiJar003',
    contractId: 'API-JAR-003',
    summary: 'Detail Jaring',
    roles: ['regional_commander', 'field_coordinator', 'field_officer'],
  })
  async get(
    @Param('jaringId', ParseUUIDPipe) id: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.jaringService.get(id, context));
  }

  @Post(':jaringId/approve-registration')
  @ApiContract({
    operationId: 'apiJarApproval001',
    contractId: 'API-JAR-APPROVAL-001',
    summary: 'Setujui registrasi Jaring',
    roles: ['field_coordinator'],
    idempotent: true,
  })
  async approveRegistration(
    @Param('jaringId', ParseUUIDPipe) id: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.jaringService.approveRegistration(id, context));
  }

  @Post(':jaringId/reject-registration')
  @ApiContract({
    operationId: 'apiJarApproval002',
    contractId: 'API-JAR-APPROVAL-002',
    summary: 'Tolak registrasi Jaring',
    roles: ['field_coordinator'],
    idempotent: true,
  })
  async rejectRegistration(
    @Param('jaringId', ParseUUIDPipe) id: string,
    @Body() body: RejectJaringDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.jaringService.rejectRegistration(id, body, context),
    );
  }

  @Patch(':jaringId')
  @ApiContract({
    operationId: 'apiJar004',
    contractId: 'API-JAR-004',
    summary: 'Ubah Jaring',
    roles: ['field_officer'],
  })
  async update(
    @Param('jaringId', ParseUUIDPipe) id: string,
    @Body() body: UpdateJaringDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.jaringService.update(id, body, context));
  }

  @Post(':jaringId/activate')
  @ApiContract({
    operationId: 'apiJar005',
    contractId: 'API-JAR-005',
    summary: 'Aktifkan Jaring',
    roles: ['field_officer'],
    idempotent: true,
  })
  async activate(
    @Param('jaringId', ParseUUIDPipe) id: string,
    @Body() body: ReasonDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.jaringService.activate(id, body, context));
  }

  @Post(':jaringId/deactivate')
  @ApiContract({
    operationId: 'apiJar006',
    contractId: 'API-JAR-006',
    summary: 'Nonaktifkan Jaring',
    roles: ['field_officer'],
    idempotent: true,
  })
  async deactivate(
    @Param('jaringId', ParseUUIDPipe) id: string,
    @Body() body: ReasonDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.jaringService.deactivate(id, body, context));
  }

  @Post(':jaringId/delete')
  @ApiContract({
    operationId: 'apiJar007',
    contractId: 'API-JAR-007',
    summary: 'Soft delete Jaring',
    roles: ['field_officer'],
    idempotent: true,
  })
  async softDelete(
    @Param('jaringId', ParseUUIDPipe) id: string,
    @Body() body: ReasonDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.jaringService.softDelete(id, body, context));
  }

  @Post(':jaringId/regenerate-pin')
  @ApiContract({
    operationId: 'apiJar014',
    contractId: 'API-JAR-014',
    summary: 'Buat ulang PIN Jaring',
    roles: ['field_officer'],
    idempotent: true,
  })
  async regeneratePin(
    @Param('jaringId', ParseUUIDPipe) id: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.jaringService.regeneratePin(id, context));
  }

  @Get(':jaringId/caretakers')
  @ApiContract({
    operationId: 'apiJar008',
    contractId: 'API-JAR-008',
    summary: 'Riwayat caretaker',
    roles: ['regional_commander', 'field_coordinator', 'field_officer'],
  })
  async caretakers(
    @Param('jaringId', ParseUUIDPipe) id: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.jaringService.caretakers(id, context));
  }

  @Post(':jaringId/caretaker-transfer')
  @ApiContract({
    operationId: 'apiJar009',
    contractId: 'API-JAR-009',
    summary: 'Transfer caretaker',
    roles: ['field_officer'],
    successStatus: 201,
    idempotent: true,
  })
  async transfer(
    @Param('jaringId', ParseUUIDPipe) id: string,
    @Body() body: TransferDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.jaringService.transfer(id, body, context));
  }

  @Get(':jaringId/area-coverages')
  @ApiContract({
    operationId: 'apiJar010',
    contractId: 'API-JAR-010',
    summary: 'Coverage wilayah Jaring',
    roles: ['regional_commander', 'field_coordinator', 'field_officer'],
  })
  async coverages(
    @Param('jaringId', ParseUUIDPipe) id: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.jaringService.coverages(id, context));
  }

  @Put(':jaringId/area-coverages')
  @ApiContract({
    operationId: 'apiJar011',
    contractId: 'API-JAR-011',
    summary: 'Ganti coverage wilayah Jaring',
    roles: ['field_officer'],
    idempotent: true,
  })
  async coverage(
    @Param('jaringId', ParseUUIDPipe) id: string,
    @Body() body: CoverageDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.jaringService.coverage(id, body, context));
  }

  @Get(':jaringId/messages')
  @ApiContract({
    operationId: 'apiJar012',
    contractId: 'API-JAR-012',
    summary: 'Pesan Jaring',
    roles: ['field_officer'],
  })
  async messages(@Param('jaringId', ParseUUIDPipe) id: string) {
    return apiResult(await this.jaringService.messages(id));
  }

  @Get(':jaringId/coaching-reports')
  @ApiContract({
    operationId: 'apiJarCoachingReport001',
    contractId: 'API-JAR-COACHING-REPORT-001',
    summary: 'Daftar laporan pembinaan Jaring',
    roles: ['regional_commander', 'field_coordinator', 'field_officer'],
  })
  async coachingReports(
    @Param('jaringId', ParseUUIDPipe) id: string,
    @Query() query: JaringCoachingReportQuery,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.jaringService.coachingReports(id, query, context),
    );
  }

  @Post(':jaringId/coaching-reports')
  @ApiContract({
    operationId: 'apiJarCoachingReport002',
    contractId: 'API-JAR-COACHING-REPORT-002',
    summary: 'Buat laporan pembinaan Jaring',
    roles: ['field_officer'],
    successStatus: 201,
    idempotent: true,
  })
  async createCoachingReport(
    @Param('jaringId', ParseUUIDPipe) id: string,
    @Body() body: CreateJaringCoachingReportDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.jaringService.createCoachingReport(id, body, context),
    );
  }

  @Get(':jaringId/coaching-reports/:reportId')
  @ApiContract({
    operationId: 'apiJarCoachingReport003',
    contractId: 'API-JAR-COACHING-REPORT-003',
    summary: 'Detail laporan pembinaan Jaring',
    roles: ['regional_commander', 'field_coordinator', 'field_officer'],
  })
  async coachingReportDetail(
    @Param('jaringId', ParseUUIDPipe) jaringId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.jaringService.coachingReport(jaringId, reportId, context),
    );
  }

  @Get(':jaringId/reports')
  @ApiContract({
    operationId: 'apiJar015',
    contractId: 'API-JAR-015',
    summary: 'Daftar laporan yang dibuat Jaring',
    roles: [
      'executive',
      'regional_commander',
      'operational_intelligence_manager',
      'field_coordinator',
      'field_officer',
    ],
  })
  async reports(
    @Param('jaringId', ParseUUIDPipe) id: string,
    @Query() query: JaringReportQuery,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.jaringService.reports(id, query, context));
  }

  @Get('reports/:reportSessionId')
  @ApiContract({
    operationId: 'apiJar016',
    contractId: 'API-JAR-016',
    summary: 'Detail laporan Jaring',
    roles: [
      'executive',
      'regional_commander',
      'operational_intelligence_manager',
      'field_coordinator',
      'field_officer',
    ],
  })
  async reportDetail(
    @Param('reportSessionId', ParseUUIDPipe) id: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.jaringService.report(id, context));
  }

  @Patch('reports/:reportSessionId/read')
  @ApiContract({
    operationId: 'apiJar016b',
    contractId: 'API-JAR-016B',
    summary: 'Tandai laporan Jaring sebagai sudah dibaca Field Officer',
    roles: ['field_officer'],
  })
  async markReportAsRead(
    @Param('reportSessionId', ParseUUIDPipe) id: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.jaringService.markReportAsRead(id, context));
  }

  @Post('reports/:reportSessionId/verify')
  @ApiContract({
    operationId: 'apiJar017',
    contractId: 'API-JAR-017',
    summary: 'Verifikasi laporan Jaring oleh Field Officer',
    roles: ['field_officer'],
    idempotent: true,
  })
  async verifyReport(
    @Param('reportSessionId', ParseUUIDPipe) id: string,
    @Body() body: VerifyJaringReportDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.jaringService.verifyReport(id, body, context));
  }

  @Patch('reports/:reportSessionId/metadata')
  @ApiContract({
    operationId: 'apiJar018',
    contractId: 'API-JAR-018',
    summary: 'Ubah kategori, urgency, dan isian laporan Jaring',
    roles: ['field_officer'],
  })
  async updateReportMetadata(
    @Param('reportSessionId', ParseUUIDPipe) id: string,
    @Body() body: UpdateJaringReportMetadataDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.jaringService.updateReportMetadata(id, body, context),
    );
  }

  @Get('reports/:reportSessionId/history')
  @ApiContract({
    operationId: 'apiJar019',
    contractId: 'API-JAR-019',
    summary: 'Riwayat perubahan laporan Jaring',
    roles: [
      'executive',
      'regional_commander',
      'operational_intelligence_manager',
      'field_coordinator',
      'field_officer',
    ],
  })
  async reportHistory(
    @Param('reportSessionId', ParseUUIDPipe) id: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.jaringService.reportHistory(id, context));
  }

  @Get(':jaringId/bakets')
  @ApiContract({
    operationId: 'apiJar013',
    contractId: 'API-JAR-013',
    summary: 'Baket Jaring',
    roles: [
      'executive',
      'regional_commander',
      'operational_intelligence_manager',
      'field_coordinator',
      'field_officer',
    ],
  })
  async bakets(
    @Param('jaringId', ParseUUIDPipe) id: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.jaringService.bakets(id, context));
  }
}
