import { Injectable } from '@nestjs/common';
import {
  BaketStatus,
  RevisionRequestStatus,
  VerificationStatus,
} from '../../generated/prisma/client.js';
import { ApiException } from '../../common/api/api-exception.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { DomainScopeService } from '../access/domain-scope.service.js';
import type {
  CompleteVerificationDto,
  CreateVerificationDto,
  NeedsDevelopmentDto,
  RejectVerificationDto,
  ReplaceCrossReferencesDto,
  UpdateVerificationDto,
} from './baket.dto.js';
import { BaketQueryService } from './baket-query.service.js';

@Injectable()
export class BaketVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly baketQuery: BaketQueryService,
    private readonly scope: DomainScopeService,
  ) {}

  async createVerification(
    versionId: string,
    body: CreateVerificationDto,
    context: AuthorizationContext,
  ) {
    const version = await this.prisma.baketVersion.findUniqueOrThrow({
      where: { id: versionId },
      include: { baket: true },
    });
    const verificationReadyStatuses: BaketStatus[] = [
      BaketStatus.SENT_TO_OIM,
      BaketStatus.UNDER_VERIFICATION,
    ];
    if (!verificationReadyStatuses.includes(version.baket.status)) {
      throw new ApiException(
        'VERIFICATION_SOURCE_NOT_READY',
        'Baket must be sent to OIM before canonical verification can be created.',
        409,
      );
    }
    await this.scope.assertBaket(context, version.baketId);
    const existing = await this.prisma.baketVerification.findUnique({
      where: { baketVersionId: versionId },
    });
    if (existing) {
      return {
        verificationId: existing.id,
        baketId: version.baketId,
        detail: await this.baketQuery.verificationDetail(existing.id),
      };
    }
    const verification = await this.prisma.$transaction(async (tx) => {
      const created = await tx.baketVerification.create({
        data: {
          baketVersionId: versionId,
          verifiedByAssignmentId: context.primaryAssignmentId,
          summary: body.summary,
        },
      });
      await tx.baket.update({
        where: { id: version.baketId },
        data: { status: BaketStatus.UNDER_VERIFICATION },
      });
      return created;
    });
    return {
      verificationId: verification.id,
      baketId: version.baketId,
      detail: await this.baketQuery.verificationDetail(verification.id),
    };
  }

  async startVerification(verificationId: string) {
    const verification = await this.prisma.baketVerification.findUniqueOrThrow({
      where: { id: verificationId },
    });
    if (verification.status !== VerificationStatus.DRAFT) {
      return this.baketQuery.verificationDetail(verificationId);
    }
    await this.prisma.baketVerification.update({
      where: { id: verificationId },
      data: {
        status: VerificationStatus.IN_PROGRESS,
        startedAt: verification.startedAt ?? new Date(),
      },
    });
    return this.baketQuery.verificationDetail(verificationId);
  }

  async updateVerification(
    verificationId: string,
    body: UpdateVerificationDto,
  ) {
    const verification = await this.prisma.baketVerification.findUniqueOrThrow({
      where: { id: verificationId },
    });
    const editableVerificationStatuses: VerificationStatus[] = [
      VerificationStatus.DRAFT,
      VerificationStatus.IN_PROGRESS,
    ];
    if (!editableVerificationStatuses.includes(verification.status)) {
      throw new ApiException(
        'VERIFICATION_IMMUTABLE',
        'Completed verification cannot be edited.',
        409,
      );
    }
    await this.prisma.baketVerification.update({
      where: { id: verificationId },
      data: {
        sourceReliability: body.sourceReliability,
        informationCredibility: body.informationCredibility,
        summary: body.summary,
      },
    });
    return this.baketQuery.verificationDetail(verificationId);
  }

  async replaceCrossReferences(
    verificationId: string,
    body: ReplaceCrossReferencesDto,
  ) {
    const verification = await this.prisma.baketVerification.findUniqueOrThrow({
      where: { id: verificationId },
    });
    if (verification.status !== VerificationStatus.IN_PROGRESS) {
      throw new ApiException(
        'VERIFICATION_CROSS_REFERENCE_IMMUTABLE',
        'Verification cross references can only be replaced while in progress.',
        409,
      );
    }
    for (const reference of body.references) {
      if (!reference.relatedBaketId && !reference.externalRef) {
        throw new ApiException(
          'VERIFICATION_CROSS_REFERENCE_TARGET_REQUIRED',
          'Each verification cross reference requires relatedBaketId or externalRef.',
          422,
        );
      }
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.baketVerificationCrossReference.deleteMany({
        where: { verificationId },
      });
      if (body.references.length > 0) {
        await tx.baketVerificationCrossReference.createMany({
          data: body.references.map((reference) => ({
            verificationId,
            relatedBaketId: reference.relatedBaketId,
            externalRef: reference.externalRef,
            description: reference.description,
          })),
        });
      }
    });
    return (await this.baketQuery.verificationDetail(verificationId))
      .crossReferences;
  }

  async completeVerification(
    verificationId: string,
    body: CompleteVerificationDto,
  ) {
    if (body.decision !== 'VERIFIED') {
      throw new ApiException(
        'VERIFICATION_DECISION_INVALID',
        'Decision must be VERIFIED for this endpoint.',
        422,
      );
    }
    const verification =
      await this.baketQuery.verificationDetail(verificationId);
    if (
      verification.status !== VerificationStatus.IN_PROGRESS ||
      !verification.sourceReliability ||
      !verification.informationCredibility
    ) {
      throw new ApiException(
        'VERIFICATION_INCOMPLETE',
        'Verification requires source reliability and information credibility scores before completion.',
        422,
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.baketVerification.update({
        where: { id: verificationId },
        data: {
          status: VerificationStatus.VERIFIED,
          summary: body.summary ?? verification.summary,
          completedAt: new Date(),
        },
      });
      await tx.baket.update({
        where: { id: verification.baketVersion.baketId },
        data: { status: BaketStatus.VERIFIED },
      });
    });
    return this.baketQuery.verificationDetail(verificationId);
  }

  async needsDevelopment(
    verificationId: string,
    body: NeedsDevelopmentDto,
    context: AuthorizationContext,
  ) {
    const verification =
      await this.baketQuery.verificationDetail(verificationId);
    if (verification.status !== VerificationStatus.IN_PROGRESS) {
      throw new ApiException(
        'VERIFICATION_IMMUTABLE',
        'Only an in-progress verification can be completed.',
        409,
      );
    }
    const request = await this.prisma.$transaction(async (tx) => {
      await tx.baketVerification.update({
        where: { id: verificationId },
        data: {
          status: VerificationStatus.NEEDS_DEVELOPMENT,
          completedAt: new Date(),
        },
      });
      await tx.baket.update({
        where: { id: verification.baketVersion.baketId },
        data: { status: BaketStatus.NEEDS_DEVELOPMENT },
      });
      return tx.baketRevisionRequest.create({
        data: {
          baketId: verification.baketVersion.baketId,
          requestedAgainstVersionId: verification.baketVersionId,
          requestedByAssignmentId: context.primaryAssignmentId,
          reason: body.reason,
          requiredInformation: body.requiredInformation,
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
          status: RevisionRequestStatus.OPEN,
        },
      });
    });
    return {
      requestId: request.id,
      detail: await this.baketQuery.verificationDetail(verificationId),
    };
  }

  async rejectVerification(
    verificationId: string,
    body: RejectVerificationDto,
  ) {
    const verification =
      await this.baketQuery.verificationDetail(verificationId);
    if (verification.status !== VerificationStatus.IN_PROGRESS) {
      throw new ApiException(
        'VERIFICATION_IMMUTABLE',
        'Only an in-progress verification can be completed.',
        409,
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.baketVerification.update({
        where: { id: verificationId },
        data: {
          status: VerificationStatus.REJECTED,
          completedAt: new Date(),
          summary: body.reason,
        },
      });
      await tx.baket.update({
        where: { id: verification.baketVersion.baketId },
        data: { status: BaketStatus.REJECTED },
      });
    });
    return this.baketQuery.verificationDetail(verificationId);
  }

  async verificationScore(verificationId: string) {
    const verification = await this.prisma.baketVerification.findUniqueOrThrow({
      where: { id: verificationId },
    });
    const matrixLabel = this.baketQuery.scoreLabel(
      verification.sourceReliability,
      verification.informationCredibility,
    );
    const reliabilityText = {
      A: 'sumber sepenuhnya dapat dipercaya',
      B: 'sumber biasanya dapat dipercaya',
      C: 'sumber cukup dapat dipercaya',
      D: 'keandalan sumber diragukan',
      E: 'sumber tidak dapat dipercaya',
      F: 'keandalan sumber belum dapat dinilai',
    }[verification.sourceReliability ?? 'F'];
    const credibilityText = {
      ONE: 'informasi dikonfirmasi sumber lain',
      TWO: 'informasi sangat mungkin benar',
      THREE: 'informasi mungkin benar',
      FOUR: 'kebenaran informasi diragukan',
      FIVE: 'informasi tidak mungkin benar',
      SIX: 'kebenaran informasi belum dapat dinilai',
    }[verification.informationCredibility ?? 'SIX'];
    return {
      verificationId,
      sourceReliability: verification.sourceReliability,
      informationCredibility: verification.informationCredibility,
      matrixLabel,
      interpretation: matrixLabel
        ? `Neraca ${matrixLabel}: ${reliabilityText}; ${credibilityText}.`
        : 'Neraca penilaian belum lengkap.',
    };
  }
}
