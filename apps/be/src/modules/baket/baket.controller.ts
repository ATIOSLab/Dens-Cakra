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
  BaketPatchDto,
  BaketQuery,
  CancelRevisionRequestDto,
  CompleteVerificationDto,
  ConfirmationDto,
  CreateBaketDto,
  CreateBaketRevisionDto,
  CreateRevisionRequestDto,
  CreateVerificationDto,
  ManualAreaOverrideDto,
  NeedsDevelopmentDto,
  RejectVerificationDto,
  ReplaceAttachmentsDto,
  ReplaceChecksDto,
  ReplaceCrossReferencesDto,
  ReplaceMessagesDto,
  ResolveAreaDto,
  ResolveRevisionRequestDto,
  ResubmitDto,
  RevisionRequestQuery,
  UpdateVerificationDto,
  ValidateCoverageDto,
  VerificationQuery,
} from './baket.dto.js';
import { BaketService } from './baket.service.js';

@ApiTags('13. Baket', '14. Formal Verification')
@UseGuards(SessionGuard, DomainAccessGuard)
@Controller()
export class BaketController {
  constructor(private readonly baketService: BaketService) {}

  @Get('bakets')
  @ApiContract({
    operationId: 'apiBak001',
    contractId: 'API-BAK-001',
    summary: 'Daftar Baket',
    permission: 'baket.read',
  })
  async list(@Query() query: BaketQuery) {
    return apiResult(await this.baketService.list(query));
  }

  @Post('bakets')
  @ApiContract({
    operationId: 'apiBak002',
    contractId: 'API-BAK-002',
    summary: 'Buat Baket manual/from task',
    permission: 'baket.create',
    successStatus: 201,
    idempotent: true,
  })
  async create(
    @Body() body: CreateBaketDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.baketService.create(body, context));
  }

  @Get('bakets/:baketId')
  @ApiContract({
    operationId: 'apiBak003',
    contractId: 'API-BAK-003',
    summary: 'Detail Baket current version',
    permission: 'baket.read',
  })
  async get(@Param('baketId', ParseUUIDPipe) baketId: string) {
    return apiResult(await this.baketService.get(baketId));
  }

  @Get('bakets/:baketId/versions')
  @ApiContract({
    operationId: 'apiBak004',
    contractId: 'API-BAK-004',
    summary: 'Riwayat versi Baket',
    permission: 'baket.read',
  })
  async versions(@Param('baketId', ParseUUIDPipe) baketId: string) {
    return apiResult(await this.baketService.versions(baketId));
  }

  @Post('bakets/:baketId/versions')
  @ApiContract({
    operationId: 'apiBak005',
    contractId: 'API-BAK-005',
    summary: 'Buat versi revisi Baket',
    permission: 'baket.update',
    successStatus: 201,
    idempotent: true,
  })
  async createVersion(
    @Param('baketId', ParseUUIDPipe) baketId: string,
    @Body() body: CreateBaketRevisionDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.baketService.createVersion(baketId, body, context),
    );
  }

  @Get('baket-versions/:versionId')
  @ApiContract({
    operationId: 'apiBak006',
    contractId: 'API-BAK-006',
    summary: 'Detail versi Baket',
    permission: 'baket.read',
  })
  async getVersion(@Param('versionId', ParseUUIDPipe) versionId: string) {
    return apiResult(await this.baketService.getVersion(versionId));
  }

  @Patch('baket-versions/:versionId')
  @ApiContract({
    operationId: 'apiBak007',
    contractId: 'API-BAK-007',
    summary: 'Edit versi draft',
    permission: 'baket.update',
  })
  async updateVersion(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() body: BaketPatchDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.baketService.updateVersion(versionId, body, context),
    );
  }

  @Put('bakets/:baketId/source-messages')
  @ApiContract({
    operationId: 'apiBak008',
    contractId: 'API-BAK-008',
    summary: 'Ganti/tambah sumber pesan draft',
    permission: 'baket.update',
    idempotent: true,
  })
  async replaceMessages(
    @Param('baketId', ParseUUIDPipe) baketId: string,
    @Body() body: ReplaceMessagesDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.baketService.replaceMessages(baketId, body, context),
    );
  }

  @Put('bakets/:baketId/attachments')
  @ApiContract({
    operationId: 'apiBak009',
    contractId: 'API-BAK-009',
    summary: 'Ganti lampiran draft',
    permission: 'baket.update',
    idempotent: true,
  })
  async replaceAttachments(
    @Param('baketId', ParseUUIDPipe) baketId: string,
    @Body() body: ReplaceAttachmentsDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.baketService.replaceAttachments(baketId, body, context),
    );
  }

  @Post('baket-versions/:versionId/resolve-area')
  @ApiContract({
    operationId: 'apiBak010',
    contractId: 'API-BAK-010',
    summary: 'Resolve ulang area Baket',
    permission: 'baket.update',
    idempotent: true,
  })
  async resolveArea(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() body: ResolveAreaDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.baketService.resolveArea(versionId, body, context),
    );
  }

  @Post('baket-versions/:versionId/manual-area-override')
  @ApiContract({
    operationId: 'apiBak011',
    contractId: 'API-BAK-011',
    summary: 'Override area hasil spatial',
    permission: 'baket.update',
    idempotent: true,
  })
  async manualAreaOverride(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() body: ManualAreaOverrideDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.baketService.manualAreaOverride(versionId, body, context),
    );
  }

  @Post('baket-versions/:versionId/validate-coverage')
  @ApiContract({
    operationId: 'apiBak012',
    contractId: 'API-BAK-012',
    summary: 'Validasi coverage berlapis',
    permission: 'baket.update',
    idempotent: true,
  })
  async validateCoverage(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() body: ValidateCoverageDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.baketService.validateCoverage(versionId, body, context),
    );
  }

  @Post('bakets/:baketId/submit')
  @ApiContract({
    operationId: 'apiBak013',
    contractId: 'API-BAK-013',
    summary: 'Kirim Baket ke OIM',
    permission: 'baket.submit',
    idempotent: true,
  })
  async submit(
    @Param('baketId', ParseUUIDPipe) baketId: string,
    @Body() body: ConfirmationDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.baketService.submit(baketId, body, context));
  }

  @Post('bakets/:baketId/resubmit')
  @ApiContract({
    operationId: 'apiBak014',
    contractId: 'API-BAK-014',
    summary: 'Kirim ulang setelah revisi',
    permission: 'baket.submit',
    idempotent: true,
  })
  async resubmit(
    @Param('baketId', ParseUUIDPipe) baketId: string,
    @Body() body: ResubmitDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.baketService.resubmit(baketId, body, context));
  }

  @Get('bakets/:baketId/revision-requests')
  @ApiContract({
    operationId: 'apiBak015',
    contractId: 'API-BAK-015',
    summary: 'Daftar permintaan revisi',
    permission: 'baket.read',
  })
  async revisionRequests(
    @Param('baketId', ParseUUIDPipe) baketId: string,
    @Query() query: RevisionRequestQuery,
  ) {
    return apiResult(await this.baketService.revisionRequests(baketId, query));
  }

  @Post('bakets/:baketId/revision-requests')
  @ApiContract({
    operationId: 'apiBak016',
    contractId: 'API-BAK-016',
    summary: 'Minta pengembangan/revisi',
    permission: 'baket.request-development',
    successStatus: 201,
    idempotent: true,
  })
  async createRevisionRequest(
    @Param('baketId', ParseUUIDPipe) baketId: string,
    @Body() body: CreateRevisionRequestDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.baketService.createRevisionRequest(baketId, body, context),
    );
  }

  @Post('baket-revision-requests/:requestId/resolve')
  @ApiContract({
    operationId: 'apiBak017',
    contractId: 'API-BAK-017',
    summary: 'Tutup permintaan revisi',
    permission: 'baket.request-development',
    idempotent: true,
  })
  async resolveRevisionRequest(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() body: ResolveRevisionRequestDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.baketService.resolveRevisionRequest(requestId, body, context),
    );
  }

  @Post('baket-revision-requests/:requestId/cancel')
  @ApiContract({
    operationId: 'apiBak018',
    contractId: 'API-BAK-018',
    summary: 'Batalkan permintaan revisi',
    permission: 'baket.request-development',
    idempotent: true,
  })
  async cancelRevisionRequest(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() body: CancelRevisionRequestDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.baketService.cancelRevisionRequest(requestId, body, context),
    );
  }

  @Get('bakets/:baketId/timeline')
  @ApiContract({
    operationId: 'apiBak019',
    contractId: 'API-BAK-019',
    summary: 'Timeline Baket',
    permission: 'baket.read',
  })
  async timeline(@Param('baketId', ParseUUIDPipe) baketId: string) {
    return apiResult(await this.baketService.timeline(baketId));
  }

  @Get('bakets/:baketId/traceability')
  @ApiContract({
    operationId: 'apiBak020',
    contractId: 'API-BAK-020',
    summary: 'Traceability sumber-ke-produk',
    permission: 'baket.read',
  })
  async traceability(@Param('baketId', ParseUUIDPipe) baketId: string) {
    return apiResult(await this.baketService.traceability(baketId));
  }

  @Get('verifications')
  @ApiContract({
    operationId: 'apiVer001',
    contractId: 'API-VER-001',
    summary: 'Daftar verification',
    permission: 'verification.read',
  })
  async listVerifications(@Query() query: VerificationQuery) {
    return apiResult(await this.baketService.listVerifications(query));
  }

  @Post('baket-versions/:versionId/verification')
  @ApiContract({
    operationId: 'apiVer002',
    contractId: 'API-VER-002',
    summary: 'Buat canonical verification',
    permission: 'verification.create',
    successStatus: 201,
    idempotent: true,
  })
  async createVerification(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() body: CreateVerificationDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.baketService.createVerification(versionId, body, context),
    );
  }

  @Get('verifications/:verificationId')
  @ApiContract({
    operationId: 'apiVer003',
    contractId: 'API-VER-003',
    summary: 'Detail verification',
    permission: 'verification.read',
  })
  async getVerification(
    @Param('verificationId', ParseUUIDPipe) verificationId: string,
  ) {
    return apiResult(await this.baketService.getVerification(verificationId));
  }

  @Post('verifications/:verificationId/start')
  @ApiContract({
    operationId: 'apiVer004',
    contractId: 'API-VER-004',
    summary: 'Mulai verification',
    permission: 'verification.update',
    idempotent: true,
  })
  async startVerification(
    @Param('verificationId', ParseUUIDPipe) verificationId: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.baketService.startVerification(verificationId, context),
    );
  }

  @Patch('verifications/:verificationId')
  @ApiContract({
    operationId: 'apiVer005',
    contractId: 'API-VER-005',
    summary: 'Edit draft/in-progress verification',
    permission: 'verification.update',
  })
  async updateVerification(
    @Param('verificationId', ParseUUIDPipe) verificationId: string,
    @Body() body: UpdateVerificationDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.baketService.updateVerification(verificationId, body, context),
    );
  }

  @Put('verifications/:verificationId/checks')
  @ApiContract({
    operationId: 'apiVer006',
    contractId: 'API-VER-006',
    summary: 'Ganti verification checklist',
    permission: 'verification.update',
    idempotent: true,
  })
  async replaceChecks(
    @Param('verificationId', ParseUUIDPipe) verificationId: string,
    @Body() body: ReplaceChecksDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.baketService.replaceChecks(verificationId, body, context),
    );
  }

  @Put('verifications/:verificationId/cross-references')
  @ApiContract({
    operationId: 'apiVer007',
    contractId: 'API-VER-007',
    summary: 'Ganti cross references',
    permission: 'verification.update',
    idempotent: true,
  })
  async replaceCrossReferences(
    @Param('verificationId', ParseUUIDPipe) verificationId: string,
    @Body() body: ReplaceCrossReferencesDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.baketService.replaceCrossReferences(
        verificationId,
        body,
        context,
      ),
    );
  }

  @Post('verifications/:verificationId/complete')
  @ApiContract({
    operationId: 'apiVer008',
    contractId: 'API-VER-008',
    summary: 'Selesaikan verification valid',
    permission: 'verification.complete',
    idempotent: true,
  })
  async completeVerification(
    @Param('verificationId', ParseUUIDPipe) verificationId: string,
    @Body() body: CompleteVerificationDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.baketService.completeVerification(
        verificationId,
        body,
        context,
      ),
    );
  }

  @Post('verifications/:verificationId/needs-development')
  @ApiContract({
    operationId: 'apiVer009',
    contractId: 'API-VER-009',
    summary: 'Kembalikan untuk pengembangan',
    permission: 'verification.complete',
    idempotent: true,
  })
  async needsDevelopment(
    @Param('verificationId', ParseUUIDPipe) verificationId: string,
    @Body() body: NeedsDevelopmentDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.baketService.needsDevelopment(verificationId, body, context),
    );
  }

  @Post('verifications/:verificationId/reject')
  @ApiContract({
    operationId: 'apiVer010',
    contractId: 'API-VER-010',
    summary: 'Tolak Baket',
    permission: 'verification.complete',
    idempotent: true,
  })
  async rejectVerification(
    @Param('verificationId', ParseUUIDPipe) verificationId: string,
    @Body() body: RejectVerificationDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.baketService.rejectVerification(verificationId, body, context),
    );
  }

  @Get('verifications/:verificationId/score')
  @ApiContract({
    operationId: 'apiVer011',
    contractId: 'API-VER-011',
    summary: 'Ringkasan Neraca Penilaian',
    permission: 'verification.read',
  })
  async verificationScore(
    @Param('verificationId', ParseUUIDPipe) verificationId: string,
  ) {
    return apiResult(await this.baketService.verificationScore(verificationId));
  }
}
