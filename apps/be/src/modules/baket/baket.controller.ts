import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
  CompleteVerificationDto,
  ConfirmationDto,
  CreateVerificationDto,
  NeedsDevelopmentDto,
  RejectVerificationDto,
  UpdateVerificationDto,
  UpdateBaketMetadataDto,
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
    roles: [
      'executive',
      'regional_commander',
      'executive',
      'regional_commander',
      'field_coordinator',
      'field_officer',
    ],
  })
  async list(
    @Query() query: BaketQuery,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.baketService.list(query, context), undefined, {
      availableActions: ['baket.open', 'verification.start'],
      appliedScope: {
        areaIds: context.areaScopes.map((scope) => scope.areaId),
        routeType: context.commandRouteType,
      },
    });
  }

  @Get('bakets/:baketId')
  @ApiContract({
    operationId: 'apiBak003',
    contractId: 'API-BAK-003',
    summary: 'Detail Baket current version',
    roles: [
      'executive',
      'regional_commander',
      'executive',
      'regional_commander',
      'field_coordinator',
      'field_officer',
    ],
  })
  async get(
    @Param('baketId', ParseUUIDPipe) baketId: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.baketService.get(baketId, context));
  }

  @Patch('bakets/:baketId')
  @ApiContract({
    operationId: 'apiBak003b',
    contractId: 'API-BAK-003B',
    summary: 'Ubah metadata kategori Baket draft',
    roles: ['field_officer'],
  })
  async updateMetadata(
    @Param('baketId', ParseUUIDPipe) baketId: string,
    @Body() body: UpdateBaketMetadataDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.baketService.updateMetadata(baketId, body, context),
    );
  }

  @Get('baket-versions/:versionId')
  @ApiContract({
    operationId: 'apiBak006',
    contractId: 'API-BAK-006',
    summary: 'Detail versi Baket',
    roles: [
      'executive',
      'regional_commander',
      'executive',
      'regional_commander',
      'field_coordinator',
      'field_officer',
    ],
  })
  async getVersion(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.baketService.getVersion(versionId, context));
  }

  @Patch('baket-versions/:versionId')
  @ApiContract({
    operationId: 'apiBak007',
    contractId: 'API-BAK-007',
    summary: 'Edit versi draft',
    roles: ['field_officer'],
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

  @Post('bakets/:baketId/submit')
  @ApiContract({
    operationId: 'apiBak013',
    contractId: 'API-BAK-013',
    summary: 'Kirim Baket ke Manajer Intelijen Operasional (OIM)',
    roles: ['field_officer'],
    idempotent: true,
  })
  async submit(
    @Param('baketId', ParseUUIDPipe) baketId: string,
    @Body() body: ConfirmationDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.baketService.submit(baketId, body, context));
  }

  @Get('verifications')
  @ApiContract({
    operationId: 'apiVer001',
    contractId: 'API-VER-001',
    summary: 'Daftar verification',
    roles: [
      'executive',
      'regional_commander',
      'executive',
      'regional_commander',
    ],
  })
  async listVerifications(
    @Query() query: VerificationQuery,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.baketService.listVerifications(query, context));
  }

  @Post('baket-versions/:versionId/verification')
  @ApiContract({
    operationId: 'apiVer002',
    contractId: 'API-VER-002',
    summary: 'Buat canonical verification',
    roles: ['executive', 'regional_commander'],
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
    roles: [
      'executive',
      'regional_commander',
      'executive',
      'regional_commander',
    ],
  })
  async getVerification(
    @Param('verificationId', ParseUUIDPipe) verificationId: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.baketService.getVerification(verificationId, context),
    );
  }

  @Post('verifications/:verificationId/start')
  @ApiContract({
    operationId: 'apiVer004',
    contractId: 'API-VER-004',
    summary: 'Mulai verification',
    roles: ['executive', 'regional_commander'],
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
    roles: ['executive', 'regional_commander'],
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

  @Post('verifications/:verificationId/complete')
  @ApiContract({
    operationId: 'apiVer008',
    contractId: 'API-VER-008',
    summary: 'Selesaikan verification valid',
    roles: ['executive', 'regional_commander'],
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
    roles: ['executive', 'regional_commander'],
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
    roles: ['executive', 'regional_commander'],
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
}
