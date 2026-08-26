import { Injectable } from '@nestjs/common';
import {
  BaketStatus,
  CoordinateSource,
  Prisma,
  RoleCode,
} from '../../generated/prisma/client.js';
import { ApiException } from '../../common/api/api-exception.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import type {
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
import { BaketCoverageService } from './baket-coverage.service.js';
import { BaketQueryService } from './baket-query.service.js';
import { BaketVerificationService } from './baket-verification.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { DomainScopeService } from '../access/domain-scope.service.js';

@Injectable()
export class BaketService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly baketQuery: BaketQueryService,
    private readonly baketCoverage: BaketCoverageService,
    private readonly baketVerification: BaketVerificationService,
    private readonly scope: DomainScopeService,
  ) {}

  private ensureCoordinatePair(latitude?: number, longitude?: number) {
    const count =
      Number(latitude !== undefined) + Number(longitude !== undefined);
    if (count === 1) {
      throw new ApiException(
        'COORDINATE_PAIR_REQUIRED',
        'Latitude and longitude must be provided together.',
        422,
      );
    }
  }

  private async audit(
    context: AuthorizationContext,
    action: string,
    entityType: string,
    entityId: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorUserProfileId: context.userProfileId,
        actorAssignmentId: context.primaryAssignmentId,
        action,
        entityType,
        entityId,
        ...(metadata ? { metadata } : {}),
      },
    });
  }

  private async getEditableVersion(
    versionId: string,
    context: AuthorizationContext,
  ) {
    const version = await this.prisma.baketVersion.findUniqueOrThrow({
      where: { id: versionId },
      include: { baket: true },
    });
    await this.scope.assertBaket(context, version.baketId);
    const editableStatuses: BaketStatus[] = [
      BaketStatus.DRAFT,
      BaketStatus.READY_TO_SEND,
      BaketStatus.NEEDS_DEVELOPMENT,
    ];
    if (
      !editableStatuses.includes(version.baket.status) ||
      version.versionNumber !== version.baket.currentVersionNumber
    ) {
      throw new ApiException(
        'BAKET_VERSION_IMMUTABLE',
        'Only the current editable Baket version can be changed.',
        409,
      );
    }
    if (
      context.positionCode === RoleCode.FIELD_OFFICER &&
      version.baket.createdByFieldOfficerAssignmentId !==
        context.primaryAssignmentId
    ) {
      throw new ApiException('BAKET_NOT_FOUND', 'Baket tidak ditemukan.', 404);
    }
    return version;
  }

  list(query: BaketQuery, context: AuthorizationContext) {
    return this.baketQuery.list(query, context);
  }

  async get(baketId: string, context: AuthorizationContext) {
    await this.scope.assertBaket(context, baketId);
    return this.baketQuery.baketDetail(baketId);
  }

  async updateMetadata(
    baketId: string,
    body: UpdateBaketMetadataDto,
    context: AuthorizationContext,
  ) {
    const baket = await this.prisma.baket.findFirst({
      where: {
        id: baketId,
        deletedAt: null,
        createdByFieldOfficerAssignmentId: context.primaryAssignmentId,
        status: {
          in: [
            BaketStatus.DRAFT,
            BaketStatus.READY_TO_SEND,
            BaketStatus.NEEDS_DEVELOPMENT,
          ],
        },
      },
    });
    if (!baket) {
      throw new ApiException('BAKET_NOT_FOUND', 'Baket tidak ditemukan.', 404);
    }
    const category = await this.prisma.reportCategory.findFirst({
      where: { id: body.reportCategoryId, isActive: true },
    });
    if (!category) {
      throw new ApiException(
        'REPORT_CATEGORY_NOT_FOUND',
        'Kategori laporan tidak aktif atau tidak ditemukan.',
        422,
      );
    }
    if (body.taskAssignmentId) {
      const taskAssignment = await this.prisma.taskAssignment.findFirst({
        where: {
          id: body.taskAssignmentId,
          assigneeAssignmentId: context.primaryAssignmentId,
        },
      });
      if (!taskAssignment) {
        throw new ApiException(
          'TASK_ASSIGNMENT_NOT_FOUND',
          'Tugas terkait tidak ditemukan pada penugasan Petugas Wilayah (Gaswil).',
          404,
        );
      }
    }
    await this.prisma.baket.update({
      where: { id: baketId },
      data: {
        reportCategoryId: category.id,
        ...(body.taskAssignmentId !== undefined
          ? { taskAssignmentId: body.taskAssignmentId }
          : {}),
      },
    });
    await this.audit(context, 'BAKET.METADATA.UPDATE', 'Baket', baketId, {
      reportCategoryId: category.id,
      taskAssignmentId: body.taskAssignmentId,
    });
    return this.baketQuery.baketDetail(baketId);
  }

  async getVersion(versionId: string, context: AuthorizationContext) {
    const version = await this.prisma.baketVersion.findUniqueOrThrow({
      where: { id: versionId },
      select: { baketId: true },
    });
    await this.scope.assertBaket(context, version.baketId);
    return this.baketQuery.baketVersionDetail(versionId);
  }

  async updateVersion(
    versionId: string,
    body: BaketPatchDto,
    context: AuthorizationContext,
  ) {
    this.ensureCoordinatePair(body.latitude, body.longitude);
    const version = await this.getEditableVersion(versionId, context);
    await this.prisma.baketVersion.update({
      where: { id: versionId },
      data: {
        originalContent: body.originalContent,
        normalizedContent: body.normalizedContent,
        ...(body.latitude !== undefined ? { latitude: body.latitude } : {}),
        ...(body.longitude !== undefined ? { longitude: body.longitude } : {}),
        ...(body.urgency ? { urgency: body.urgency } : {}),
        fieldOfficerNote: body.fieldOfficerNote,
        ...(body.latitude !== undefined || body.longitude !== undefined
          ? { coordinateSource: CoordinateSource.CORRECTED_BY_FIELD_OFFICER }
          : {}),
      },
    });
    if (body.latitude !== undefined || body.longitude !== undefined) {
      await this.baketCoverage.resolveAreaForVersion(versionId);
    }
    await this.audit(
      context,
      'BAKET.VERSION.UPDATE',
      'BaketVersion',
      versionId,
      {
        baketId: version.baketId,
      },
    );
    return this.baketQuery.baketVersionDetail(versionId);
  }

  async submit(
    baketId: string,
    body: ConfirmationDto,
    context: AuthorizationContext,
  ) {
    if (body.confirmation !== 'SUBMIT') {
      throw new ApiException(
        'BAKET_SUBMIT_CONFIRMATION_REQUIRED',
        'Confirmation must be SUBMIT.',
        422,
      );
    }
    const baket = await this.baketQuery.baketDetail(baketId);
    const currentVersion = baket.versions.find(
      (item) => item.versionNumber === baket.currentVersionNumber,
    );
    if (!currentVersion) {
      throw new ApiException(
        'BAKET_VERSION_NOT_FOUND',
        'Current Baket version could not be found.',
        404,
      );
    }
    await this.getEditableVersion(currentVersion.id, context);
    if (
      currentVersion.sourceMessages.length === 0 &&
      baket.taskAssignmentId === null
    ) {
      throw new ApiException(
        'BAKET_SOURCE_REQUIRED',
        'Baket requires a source message or task assignment before submission.',
        422,
      );
    }
    if (!currentVersion.originalContent) {
      throw new ApiException(
        'BAKET_INCOMPLETE',
        'Baket current version must contain content.',
        422,
      );
    }
    await this.prisma.baket.update({
      where: { id: baketId },
      data: { status: BaketStatus.SENT_TO_OIM },
    });
    await this.audit(context, 'BAKET.SUBMIT', 'Baket', baketId, {
      versionId: currentVersion.id,
    });
    return this.baketQuery.baketDetail(baketId);
  }

  listVerifications(query: VerificationQuery, context: AuthorizationContext) {
    return this.baketQuery.listVerifications(query, context);
  }

  async createVerification(
    versionId: string,
    body: CreateVerificationDto,
    context: AuthorizationContext,
  ) {
    const result = await this.baketVerification.createVerification(
      versionId,
      body,
      context,
    );
    await this.audit(
      context,
      'VERIFICATION.CREATE',
      'BaketVerification',
      result.verificationId,
      {
        baketId: result.baketId,
      },
    );
    return result.detail;
  }

  async getVerification(verificationId: string, context: AuthorizationContext) {
    const verification =
      await this.baketQuery.verificationDetail(verificationId);
    await this.scope.assertBaket(context, verification.baketVersion.baketId);
    return verification;
  }

  private async assertVerificationScope(
    context: AuthorizationContext,
    verificationId: string,
  ) {
    const verification =
      await this.baketQuery.verificationDetail(verificationId);
    await this.scope.assertBaket(context, verification.baketVersion.baketId);
  }

  async startVerification(
    verificationId: string,
    context: AuthorizationContext,
  ) {
    await this.assertVerificationScope(context, verificationId);
    const detail =
      await this.baketVerification.startVerification(verificationId);
    await this.audit(
      context,
      'VERIFICATION.START',
      'BaketVerification',
      verificationId,
    );
    return detail;
  }

  async updateVerification(
    verificationId: string,
    body: UpdateVerificationDto,
    context: AuthorizationContext,
  ) {
    await this.assertVerificationScope(context, verificationId);
    const detail = await this.baketVerification.updateVerification(
      verificationId,
      body,
    );
    await this.audit(
      context,
      'VERIFICATION.UPDATE',
      'BaketVerification',
      verificationId,
    );
    return detail;
  }

  async completeVerification(
    verificationId: string,
    body: CompleteVerificationDto,
    context: AuthorizationContext,
  ) {
    await this.assertVerificationScope(context, verificationId);
    const detail = await this.baketVerification.completeVerification(
      verificationId,
      body,
    );
    await this.audit(
      context,
      'VERIFICATION.COMPLETE',
      'BaketVerification',
      verificationId,
    );
    return detail;
  }

  async needsDevelopment(
    verificationId: string,
    body: NeedsDevelopmentDto,
    context: AuthorizationContext,
  ) {
    await this.assertVerificationScope(context, verificationId);
    const result = await this.baketVerification.needsDevelopment(
      verificationId,
      body,
      context,
    );
    await this.audit(
      context,
      'VERIFICATION.NEEDS_DEVELOPMENT',
      'BaketVerification',
      verificationId,
      {
        requestId: result.requestId,
      },
    );
    return result.detail;
  }

  async rejectVerification(
    verificationId: string,
    body: RejectVerificationDto,
    context: AuthorizationContext,
  ) {
    await this.assertVerificationScope(context, verificationId);
    const detail = await this.baketVerification.rejectVerification(
      verificationId,
      body,
    );
    await this.audit(
      context,
      'VERIFICATION.REJECT',
      'BaketVerification',
      verificationId,
      {
        reason: body.reason,
      },
    );
    return detail;
  }
}
