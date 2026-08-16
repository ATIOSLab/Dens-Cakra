import { Injectable } from '@nestjs/common';
import {
  AreaResolutionMethod,
  BaketStatus,
  CoordinateSource,
  FileLifecycleStatus,
  Prisma,
  PriorityLevel,
  RevisionRequestStatus,
  RoleCode,
} from '../../generated/prisma/client.js';
import { ApiException } from '../../common/api/api-exception.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import type {
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
  ReplaceCrossReferencesDto,
  ReplaceMessagesDto,
  ResolveAreaDto,
  ResolveRevisionRequestDto,
  ResubmitDto,
  RevisionRequestQuery,
  UpdateVerificationDto,
  UpdateBaketMetadataDto,
  ValidateCoverageDto,
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

  async create(body: CreateBaketDto, context: AuthorizationContext) {
    if (context.positionCode !== RoleCode.FIELD_OFFICER) {
      throw new ApiException(
        'BAKET_CREATOR_MUST_BE_FIELD_OFFICER',
        'Hanya Petugas Wilayah (Gaswil) yang dapat membuat Bahan Keterangan (Baket) secara langsung.',
        403,
      );
    }
    if (
      !body.taskAssignmentId &&
      (!body.sourceMessageIds || body.sourceMessageIds.length === 0)
    ) {
      throw new ApiException(
        'BAKET_SOURCE_REQUIRED',
        'Bahan Keterangan (Baket) membutuhkan penugasan atau minimal satu pesan sumber.',
        422,
      );
    }
    this.ensureCoordinatePair(body.version.latitude, body.version.longitude);

    const [category, primaryJaring] = await Promise.all([
      this.prisma.reportCategory.findFirst({
        where: { id: body.reportCategoryId, isActive: true },
      }),
      body.primaryJaringId
        ? this.prisma.jaring.findFirst({
            where: { id: body.primaryJaringId, deletedAt: null },
          })
        : Promise.resolve(null),
    ]);
    if (!category) {
      throw new ApiException(
        'REPORT_CATEGORY_NOT_FOUND',
        'Kategori laporan tidak aktif atau tidak ditemukan.',
        422,
      );
    }
    if (body.primaryJaringId && !primaryJaring) {
      throw new ApiException(
        'JARING_NOT_FOUND',
        'Jaring tidak ditemukan.',
        404,
      );
    }

    const baket = await this.prisma.$transaction(async (tx) => {
      if (body.attachments?.length) {
        const files = await tx.fileAsset.findMany({
          where: { id: { in: body.attachments.map((item) => item.fileId) } },
        });
        const usableFileStatuses: FileLifecycleStatus[] = [
          FileLifecycleStatus.CLEAN,
          FileLifecycleStatus.UPLOADED,
        ];
        if (
          files.some(
            (file) => !usableFileStatuses.includes(file.lifecycleStatus),
          )
        ) {
          throw new ApiException(
            'BAKET_ATTACHMENT_NOT_USABLE',
            'All Baket attachments must be clean or fully uploaded.',
            422,
          );
        }
      }

      return tx.baket.create({
        data: {
          createdByFieldOfficerAssignmentId: context.primaryAssignmentId,
          taskAssignmentId: body.taskAssignmentId,
          primaryJaringId: body.primaryJaringId,
          reportCategoryId: category.id,
          versions: {
            create: {
              versionNumber: 1,
              originalContent: body.version.originalContent,
              normalizedContent: body.version.normalizedContent,
              latitude: body.version.latitude,
              longitude: body.version.longitude,
              urgency: body.version.urgency ?? PriorityLevel.NORMAL,
              fieldOfficerNote: body.version.fieldOfficerNote,
              coordinateSource:
                body.version.latitude !== undefined
                  ? CoordinateSource.MANUAL_COORDINATE
                  : null,
              createdByAssignmentId: context.primaryAssignmentId,
              sourceMessages: body.sourceMessageIds?.length
                ? {
                    create: body.sourceMessageIds.map((messageId) => ({
                      messageId,
                    })),
                  }
                : undefined,
              attachments: body.attachments?.length
                ? {
                    create: body.attachments.map((attachment) => ({
                      fileId: attachment.fileId,
                      caption: attachment.caption,
                    })),
                  }
                : undefined,
            },
          },
        },
      });
    });

    const currentVersion = await this.prisma.baketVersion.findFirstOrThrow({
      where: { baketId: baket.id, versionNumber: 1 },
    });
    await this.baketCoverage.resolveAreaForVersion(currentVersion.id);
    await this.audit(context, 'BAKET.CREATE', 'Baket', baket.id);
    return this.baketQuery.baketDetail(baket.id);
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

  async versions(baketId: string, context: AuthorizationContext) {
    await this.scope.assertBaket(context, baketId);
    return this.baketQuery.versions(baketId);
  }

  async createVersion(
    baketId: string,
    body: CreateBaketRevisionDto,
    context: AuthorizationContext,
  ) {
    this.ensureCoordinatePair(body.patch.latitude, body.patch.longitude);
    const baket = await this.prisma.baket.findUniqueOrThrow({
      where: { id: baketId },
    });
    const revisionableStatuses: BaketStatus[] = [
      BaketStatus.DRAFT,
      BaketStatus.NEEDS_DEVELOPMENT,
    ];
    if (!revisionableStatuses.includes(baket.status)) {
      throw new ApiException(
        'BAKET_NOT_REVISIONABLE',
        'Baket can only be revised while draft or under development.',
        409,
      );
    }

    const version = await this.prisma.$transaction(async (tx) => {
      const baseVersion = await tx.baketVersion.findUniqueOrThrow({
        where: { id: body.basedOnVersionId },
        include: {
          sourceMessages: true,
          attachments: true,
        },
      });
      const nextVersionNumber = baket.currentVersionNumber + 1;
      const created = await tx.baketVersion.create({
        data: {
          baketId,
          versionNumber: nextVersionNumber,
          originalContent:
            body.patch.originalContent ?? baseVersion.originalContent,
          normalizedContent:
            body.patch.normalizedContent ?? baseVersion.normalizedContent,
          latitude:
            body.patch.latitude !== undefined
              ? body.patch.latitude
              : baseVersion.latitude,
          longitude:
            body.patch.longitude !== undefined
              ? body.patch.longitude
              : baseVersion.longitude,
          urgency: body.patch.urgency ?? baseVersion.urgency,
          fieldOfficerNote:
            body.patch.fieldOfficerNote ?? baseVersion.fieldOfficerNote,
          coordinateSource:
            body.patch.latitude !== undefined ||
            body.patch.longitude !== undefined
              ? CoordinateSource.CORRECTED_BY_FIELD_OFFICER
              : baseVersion.coordinateSource,
          createdByAssignmentId: context.primaryAssignmentId,
          revisionReason: body.revisionReason,
          sourceMessages: {
            create: baseVersion.sourceMessages.map((item) => ({
              messageId: item.messageId,
            })),
          },
          attachments: {
            create: baseVersion.attachments.map((item) => ({
              fileId: item.fileId,
              caption: item.caption,
            })),
          },
        },
      });
      await tx.baket.update({
        where: { id: baketId },
        data: {
          currentVersionNumber: nextVersionNumber,
        },
      });
      return created;
    });
    await this.baketCoverage.resolveAreaForVersion(version.id);
    await this.audit(context, 'BAKET.VERSION.CREATE', 'Baket', baketId, {
      versionId: version.id,
      versionNumber: version.versionNumber,
    });
    return this.baketQuery.baketVersionDetail(version.id);
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

  async replaceMessages(
    baketId: string,
    body: ReplaceMessagesDto,
    context: AuthorizationContext,
  ) {
    const baket = await this.baketQuery.baketDetail(baketId);
    const version = baket.versions.find(
      (item) => item.versionNumber === baket.currentVersionNumber,
    );
    if (!version) {
      throw new ApiException(
        'BAKET_VERSION_NOT_FOUND',
        'Current Baket version could not be found.',
        404,
      );
    }
    await this.getEditableVersion(version.id, context);
    await this.prisma.$transaction(async (tx) => {
      await tx.baketVersionSourceMessage.deleteMany({
        where: { baketVersionId: version.id },
      });
      await tx.baketVersionSourceMessage.createMany({
        data: body.messageIds.map((messageId) => ({
          baketVersionId: version.id,
          messageId,
        })),
      });
    });
    await this.audit(context, 'BAKET.SOURCES.REPLACE', 'Baket', baketId);
    return (
      await this.baketQuery.baketVersionDetail(version.id)
    ).sourceMessages.map((item) => item.message);
  }

  async replaceAttachments(
    baketId: string,
    body: ReplaceAttachmentsDto,
    context: AuthorizationContext,
  ) {
    const baket = await this.baketQuery.baketDetail(baketId);
    const version = baket.versions.find(
      (item) => item.versionNumber === baket.currentVersionNumber,
    );
    if (!version) {
      throw new ApiException(
        'BAKET_VERSION_NOT_FOUND',
        'Current Baket version could not be found.',
        404,
      );
    }
    await this.getEditableVersion(version.id, context);
    const files = await this.prisma.fileAsset.findMany({
      where: { id: { in: body.attachments.map((item) => item.fileId) } },
    });
    const usableFileStatuses: FileLifecycleStatus[] = [
      FileLifecycleStatus.CLEAN,
      FileLifecycleStatus.UPLOADED,
    ];
    if (
      files.some((file) => !usableFileStatuses.includes(file.lifecycleStatus))
    ) {
      throw new ApiException(
        'BAKET_ATTACHMENT_NOT_USABLE',
        'All Baket attachments must be clean or fully uploaded.',
        422,
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.baketVersionAttachment.deleteMany({
        where: { baketVersionId: version.id },
      });
      if (body.attachments.length > 0) {
        await tx.baketVersionAttachment.createMany({
          data: body.attachments.map((attachment) => ({
            baketVersionId: version.id,
            fileId: attachment.fileId,
            caption: attachment.caption,
          })),
        });
      }
    });
    await this.audit(context, 'BAKET.ATTACHMENTS.REPLACE', 'Baket', baketId);
    return (await this.baketQuery.baketVersionDetail(version.id)).attachments;
  }

  async resolveArea(
    versionId: string,
    _body: ResolveAreaDto,
    context: AuthorizationContext,
  ) {
    await this.getEditableVersion(versionId, context);
    const resolution =
      await this.baketCoverage.resolveAreaForVersion(versionId);
    await this.audit(context, 'BAKET.RESOLVE_AREA', 'BaketVersion', versionId);
    return resolution;
  }

  async manualAreaOverride(
    versionId: string,
    body: ManualAreaOverrideDto,
    context: AuthorizationContext,
  ) {
    const version = await this.getEditableVersion(versionId, context);
    await this.baketCoverage.ensurePointInsideArea(
      body.eventAreaId,
      version.latitude,
      version.longitude,
    );
    await this.prisma.baketVersion.update({
      where: { id: versionId },
      data: {
        eventAreaId: body.eventAreaId,
        areaResolutionMethod: AreaResolutionMethod.MANUAL_CONFIRMATION,
        areaResolvedAt: new Date(),
        manualAreaOverrideReason: body.reason,
      },
    });
    await this.audit(
      context,
      'BAKET.MANUAL_AREA_OVERRIDE',
      'BaketVersion',
      versionId,
      {
        baketId: version.baketId,
        eventAreaId: body.eventAreaId,
        reason: body.reason,
      },
    );
    return this.baketQuery.baketVersionDetail(versionId);
  }

  async validateCoverage(
    versionId: string,
    body: ValidateCoverageDto,
    context: AuthorizationContext,
  ) {
    await this.getEditableVersion(versionId, context);
    const result = await this.baketCoverage.validateCoverageForVersion(
      versionId,
      body.scopeTypes,
    );
    await this.audit(
      context,
      'BAKET.VALIDATE_COVERAGE',
      'BaketVersion',
      versionId,
      {
        scopeTypes: body.scopeTypes,
      },
    );
    return {
      summaryStatus: result.coverageValidationStatus,
      checkedAt: result.coverageValidatedAt,
      checks: result.coverageChecks,
    };
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

  async resubmit(
    baketId: string,
    body: ResubmitDto,
    context: AuthorizationContext,
  ) {
    const request = await this.prisma.baketRevisionRequest.findUniqueOrThrow({
      where: { id: body.revisionRequestId },
      include: { requestedAgainstVersion: true },
    });
    const version = await this.prisma.baketVersion.findUniqueOrThrow({
      where: { id: body.versionId },
    });
    if (
      request.baketId !== baketId ||
      version.baketId !== baketId ||
      version.versionNumber <= request.requestedAgainstVersion.versionNumber
    ) {
      throw new ApiException(
        'BAKET_RESUBMIT_INVALID',
        'Resubmission version must belong to the same Baket and be newer than the requested version.',
        422,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.baket.update({
        where: { id: baketId },
        data: {
          status: BaketStatus.SENT_TO_OIM,
          currentVersionNumber: version.versionNumber,
        },
      });
      await tx.baketRevisionRequest.update({
        where: { id: body.revisionRequestId },
        data: {
          status: RevisionRequestStatus.RESUBMITTED,
        },
      });
    });
    await this.audit(context, 'BAKET.RESUBMIT', 'Baket', baketId, {
      versionId: body.versionId,
      revisionRequestId: body.revisionRequestId,
    });
    return this.baketQuery.baketDetail(baketId);
  }

  revisionRequests(baketId: string, query: RevisionRequestQuery) {
    return this.baketQuery.revisionRequests(baketId, query.status);
  }

  async createRevisionRequest(
    baketId: string,
    body: CreateRevisionRequestDto,
    context: AuthorizationContext,
  ) {
    const openRequest = await this.prisma.baketRevisionRequest.findFirst({
      where: {
        baketId,
        status: {
          in: [RevisionRequestStatus.OPEN, RevisionRequestStatus.IN_PROGRESS],
        },
      },
    });
    if (openRequest) {
      throw new ApiException(
        'BAKET_REVISION_REQUEST_ALREADY_OPEN',
        'An open Baket revision request already exists.',
        409,
      );
    }
    const request = await this.prisma.$transaction(async (tx) => {
      const created = await tx.baketRevisionRequest.create({
        data: {
          baketId,
          requestedAgainstVersionId: body.requestedAgainstVersionId,
          requestedByAssignmentId: context.primaryAssignmentId,
          reason: body.reason,
          requiredInformation: body.requiredInformation,
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
        },
      });
      await tx.baket.update({
        where: { id: baketId },
        data: { status: BaketStatus.NEEDS_DEVELOPMENT },
      });
      return created;
    });
    await this.audit(
      context,
      'BAKET.REVISION_REQUEST.CREATE',
      'Baket',
      baketId,
      {
        requestId: request.id,
      },
    );
    return this.baketQuery.revisionRequestDetail(request.id);
  }

  async resolveRevisionRequest(
    requestId: string,
    body: ResolveRevisionRequestDto,
    context: AuthorizationContext,
  ) {
    const request = await this.prisma.baketRevisionRequest.findUniqueOrThrow({
      where: { id: requestId },
      include: { requestedAgainstVersion: true },
    });
    const version = await this.prisma.baketVersion.findUniqueOrThrow({
      where: { id: body.resolvedByVersionId },
    });
    if (
      version.baketId !== request.baketId ||
      version.versionNumber <= request.requestedAgainstVersion.versionNumber
    ) {
      throw new ApiException(
        'BAKET_REVISION_REQUEST_RESOLVE_INVALID',
        'Resolved version must be newer and belong to the same Baket.',
        422,
      );
    }
    await this.prisma.baketRevisionRequest.update({
      where: { id: requestId },
      data: {
        resolvedByVersionId: body.resolvedByVersionId,
        status: RevisionRequestStatus.RESOLVED,
        resolvedAt: new Date(),
      },
    });
    await this.audit(
      context,
      'BAKET.REVISION_REQUEST.RESOLVE',
      'BaketRevisionRequest',
      requestId,
      {
        note: body.note ?? null,
      },
    );
    return this.baketQuery.revisionRequestDetail(requestId);
  }

  async cancelRevisionRequest(
    requestId: string,
    body: CancelRevisionRequestDto,
    context: AuthorizationContext,
  ) {
    const request = await this.prisma.baketRevisionRequest.findUniqueOrThrow({
      where: { id: requestId },
    });
    await this.prisma.$transaction(async (tx) => {
      await tx.baketRevisionRequest.update({
        where: { id: requestId },
        data: { status: RevisionRequestStatus.CANCELLED },
      });
      const remaining = await tx.baketRevisionRequest.count({
        where: {
          baketId: request.baketId,
          status: {
            in: [RevisionRequestStatus.OPEN, RevisionRequestStatus.IN_PROGRESS],
          },
        },
      });
      if (remaining === 0) {
        await tx.baket.update({
          where: { id: request.baketId },
          data: { status: BaketStatus.DRAFT },
        });
      }
    });
    await this.audit(
      context,
      'BAKET.REVISION_REQUEST.CANCEL',
      'BaketRevisionRequest',
      requestId,
      {
        reason: body.reason,
      },
    );
    return this.baketQuery.revisionRequestDetail(requestId);
  }

  async timeline(baketId: string, context: AuthorizationContext) {
    await this.scope.assertBaket(context, baketId);
    return this.baketQuery.timeline(baketId);
  }

  async traceability(baketId: string, context: AuthorizationContext) {
    await this.scope.assertBaket(context, baketId);
    return this.baketQuery.traceability(baketId);
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

  async replaceCrossReferences(
    verificationId: string,
    body: ReplaceCrossReferencesDto,
    context: AuthorizationContext,
  ) {
    await this.assertVerificationScope(context, verificationId);
    const crossReferences = await this.baketVerification.replaceCrossReferences(
      verificationId,
      body,
    );
    await this.audit(
      context,
      'VERIFICATION.CROSS_REFERENCES.REPLACE',
      'BaketVerification',
      verificationId,
    );
    return crossReferences;
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

  async verificationScore(
    verificationId: string,
    context: AuthorizationContext,
  ) {
    await this.assertVerificationScope(context, verificationId);
    return this.baketVerification.verificationScore(verificationId);
  }
}
