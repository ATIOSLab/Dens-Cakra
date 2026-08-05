import {
  OrganizationType,
  PositionCode,
} from '../../common/constants/legacy-operational-code.js';
import { crc32 } from 'node:zlib';
import { Injectable } from '@nestjs/common';
import {
  AdministrativeLevel,
  BaketStatus,
  CoordinateSource,
  FileLifecycleStatus,
  FileType,
  JaringRegistrationStatus,
  JaringStatus,
  PriorityLevel,
  Prisma,
  RoleCode,
  WhatsAppMessageStatus,
  WhatsAppValidationSummary,
} from '../../generated/prisma/client.js';
import { ApiException } from '../../common/api/api-exception.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { normalizeIndonesianPhoneNumber } from '../../common/utils/phone-normalizer.js';
import { DomainScopeService } from '../access/domain-scope.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreateJaringCoachingReportDto,
  CreateJaringOccupationDto,
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

export function computeCrc32Alias(
  areaCode: string,
  gender: 'MALE' | 'FEMALE' | string | null | undefined,
  sequence: number,
): string {
  const areaHash = crc32(areaCode.trim()).toString(16).toUpperCase().padStart(8, '0');
  const genderCode = gender === 'FEMALE' ? '08' : '01';
  const sequenceStr = String(sequence).padStart(4, '0');
  return `${areaHash}${genderCode}${sequenceStr}`;
}

type AliasAdministrativeArea = {
  id: string;
  code: string;
  officialCode: string | null;
  name: string;
  level: AdministrativeLevel;
  parent: {
    id: string;
    code: string;
    officialCode: string | null;
    name: string;
    level: AdministrativeLevel;
  } | null;
};

type AdministrativeCodeArea = Pick<
  AliasAdministrativeArea,
  'code' | 'officialCode'
>;

type JaringIdentityConflict = {
  id: string;
  aliasName: string | null;
  fullName: string | null;
  caretakerAssignments?: Array<{
    fieldOfficerAssignmentId: string;
  }>;
};

const areaSelectWithParents = {
  id: true,
  code: true,
  officialCode: true,
  name: true,
  level: true,
  parent: {
    select: {
      id: true,
      code: true,
      officialCode: true,
      name: true,
      level: true,
      parent: {
        select: {
          id: true,
          code: true,
          officialCode: true,
          name: true,
          level: true,
          parent: {
            select: {
              id: true,
              code: true,
              officialCode: true,
              name: true,
              level: true,
              parent: {
                select: {
                  id: true,
                  code: true,
                  officialCode: true,
                  name: true,
                  level: true,
                },
              },
            },
          },
        },
      },
    },
  },
};

const jaringReportSessionSelect = {
  id: true,
  jaringId: true,
  jaring: {
    select: {
      id: true,
      aliasName: true,
      fullName: true,
      caretakerAssignments: {
        where: { isActive: true },
        take: 1,
        select: {
          id: true,
          fieldOfficerAssignment: {
            select: {
              id: true,
              userProfile: {
                select: {
                  id: true,
                  fullName: true,
                  username: true,
                },
              },
            },
          },
        },
      },
    },
  },
  currentState: true,
  status: true,
  content: true,
  latitude: true,
  longitude: true,
  locationAccuracyMeters: true,
  locationCapturedAt: true,
  locationMessageId: true,
  locationType: true,
  timezone: true,
  referenceNumber: true,
  startedAt: true,
  lastActivityAt: true,
  expiresAt: true,
  submittedAt: true,
  closedAt: true,
  readAt: true,
  createdAt: true,
  updatedAt: true,
  submittedMessage: {
    select: {
      id: true,
      referenceNumber: true,
      content: true,
      status: true,
      validationSummary: true,
      receivedAt: true,
      category: { select: { id: true, code: true, name: true } },
      resolvedArea: {
        select: areaSelectWithParents,
      },
      convertedBaketId: true,
      media: {
        select: {
          fileId: true,
          caption: true,
          file: {
            select: {
              id: true,
              originalName: true,
              mimeType: true,
              fileType: true,
              lifecycleStatus: true,
            },
          },
        },
      },
      convertedBaket: {
        select: {
          id: true,
          status: true,
          currentVersionNumber: true,
          reportCategory: {
            select: { id: true, code: true, name: true },
          },
          versions: {
            orderBy: { versionNumber: 'desc' },
            take: 1,
            select: {
              id: true,
              versionNumber: true,
              originalContent: true,
              normalizedContent: true,
              urgency: true,
              fieldOfficerNote: true,
              coverageValidationStatus: true,
              eventArea: {
                select: areaSelectWithParents,
              },
            },
          },
        },
      },
      _count: { select: { media: true, reportAmendments: true } },
    },
  },
  amendments: {
    orderBy: { versionNumber: 'asc' },
    select: {
      id: true,
      versionNumber: true,
      amendmentType: true,
      content: true,
      fileId: true,
      metadata: true,
      createdAt: true,
      file: {
        select: {
          id: true,
          originalName: true,
          mimeType: true,
          fileType: true,
          lifecycleStatus: true,
        },
      },
    },
  },
  contentParts: {
    orderBy: { orderNo: 'asc' },
    select: {
      id: true,
      externalMessageId: true,
      content: true,
      orderNo: true,
      createdAt: true,
    },
  },
  media: {
    where: { deletedAt: null },
    orderBy: { orderNo: 'asc' },
    select: {
      id: true,
      externalMessageId: true,
      mediaType: true,
      caption: true,
      orderNo: true,
      createdAt: true,
      fileId: true,
      file: {
        select: {
          id: true,
          originalName: true,
          mimeType: true,
          fileType: true,
          lifecycleStatus: true,
        },
      },
    },
  },
  _count: {
    select: { contentParts: true, media: true, amendments: true },
  },
} satisfies Prisma.WhatsAppReportSessionSelect;

type JaringReportSessionRecord = Prisma.WhatsAppReportSessionGetPayload<{
  select: typeof jaringReportSessionSelect;
}>;

const jaringCoachingReportSelect = {
  id: true,
  jaringId: true,
  fieldOfficerAssignmentId: true,
  title: true,
  content: true,
  reportedAt: true,
  createdAt: true,
  updatedAt: true,
  fieldOfficerAssignment: {
    select: {
      id: true,
      role: { select: { code: true, name: true } },
      userProfile: {
        select: {
          id: true,
          username: true,
          fullName: true,
          phone: true,
        },
      },
    },
  },
} satisfies Prisma.JaringCoachingReportSelect;

type JaringCoachingReportRecord = Prisma.JaringCoachingReportGetPayload<{
  select: typeof jaringCoachingReportSelect;
}>;

@Injectable()
export class JaringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainScope: DomainScopeService,
  ) {}

  private referenceCode(value: string) {
    const normalized = value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80);

    return normalized || `REFERENCE_${Date.now()}`;
  }

  private reportCategoryCode(value: string) {
    const normalized = this.referenceCode(value);
    return normalized.startsWith('REFERENCE_')
      ? `CATEGORY_${Date.now()}`
      : normalized;
  }

  private async ensureActiveOccupation(occupationId: string) {
    const occupation = await this.prisma.jaringOccupation.findUnique({
      where: { id: occupationId },
    });

    if (!occupation || !occupation.isActive) {
      throw new ApiException(
        'JARING_OCCUPATION_INVALID',
        'Pekerjaan tidak ditemukan atau tidak aktif.',
        422,
      );
    }
  }

  private administrativeCode(area: AdministrativeCodeArea) {
    return area.officialCode?.trim() || area.code.trim();
  }

  private async generateAliasName(areaIds: string[], gender?: string | null) {
    const areas = await this.prisma.administrativeArea.findMany({
      where: {
        id: { in: areaIds },
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        code: true,
        officialCode: true,
        name: true,
        level: true,
      },
    });

    const areaById = new Map<string, any>(
      areas.map((area: any) => [area.id, area]),
    );
    const primaryArea = areaIds
      .map((areaId) => areaById.get(areaId))
      .find(Boolean);

    if (!primaryArea) {
      throw new ApiException(
        'JARING_ALIAS_AREA_UNSUPPORTED',
        'Wilayah Jaring tidak ditemukan untuk pembuatan alias.',
        422,
      );
    }

    const areaCode = this.administrativeCode(primaryArea);

    const existingCount = await this.prisma.jaringAreaCoverage.count({
      where: {
        areaId: primaryArea.id,
      },
    });

    let sequence = existingCount + 1;
    let aliasName = computeCrc32Alias(areaCode, gender, sequence);

    let attempts = 0;
    while (
      await this.prisma.jaring.findFirst({
        where: { aliasName },
        select: { id: true },
      })
    ) {
      sequence++;
      attempts++;
      aliasName = computeCrc32Alias(areaCode, gender, sequence);
      if (attempts > 100) {
        break;
      }
    }

    return aliasName;
  }

  private formatJaringIdentityConflict(jaring: JaringIdentityConflict) {
    const label =
      jaring.fullName?.trim() || jaring.aliasName?.trim() || 'Jaring lain';
    const alias = jaring.aliasName?.trim();

    return alias && alias !== label ? `${label} (alias ${alias})` : label;
  }

  private async findActiveWhatsappConflict(
    whatsappNumber: string,
    exceptJaringId?: string,
  ) {
    return this.prisma.jaring.findFirst({
      where: {
        whatsappNumber,
        status: JaringStatus.ACTIVE,
        deletedAt: null,
        ...(exceptJaringId ? { id: { not: exceptJaringId } } : {}),
      },
      select: {
        id: true,
        aliasName: true,
        fullName: true,
      },
    });
  }

  private async findNationalIdConflict(
    nationalIdNumber: string | null | undefined,
    exceptJaringId?: string,
  ) {
    if (!nationalIdNumber) {
      return null;
    }

    return this.prisma.jaring.findFirst({
      where: {
        nationalIdNumber,
        deletedAt: null,
        ...(exceptJaringId ? { id: { not: exceptJaringId } } : {}),
      },
      select: {
        id: true,
        aliasName: true,
        fullName: true,
      },
    });
  }

  private assertNoActiveWhatsappConflict(
    conflict: JaringIdentityConflict | null,
  ) {
    if (!conflict) {
      return;
    }

    const existingLabel = this.formatJaringIdentityConflict(conflict);
    throw new ApiException(
      'JARING_WHATSAPP_ACTIVE_DUPLICATE',
      `Nomor WhatsApp sama dengan Jaring aktif ${existingLabel}. Gunakan nomor berbeda atau tolak pengajuan jika data ini duplikat.`,
      409,
      [
        {
          field: 'whatsappNumber',
          code: 'DUPLICATE_ACTIVE_JARING',
          message: `Nomor WhatsApp sudah dipakai oleh ${existingLabel}.`,
        },
      ],
      {
        duplicateJaringId: conflict.id,
        duplicateJaringLabel: existingLabel,
      },
    );
  }

  private assertNoNationalIdConflict(conflict: JaringIdentityConflict | null) {
    if (!conflict) {
      return;
    }

    const existingLabel = this.formatJaringIdentityConflict(conflict);
    throw new ApiException(
      'JARING_NIK_DUPLICATE',
      `NIK sama dengan Jaring ${existingLabel}. Gunakan NIK berbeda atau tolak pengajuan jika data ini duplikat.`,
      409,
      [
        {
          field: 'nationalIdNumber',
          code: 'DUPLICATE_JARING_NIK',
          message: `NIK sudah dipakai oleh ${existingLabel}.`,
        },
      ],
      {
        duplicateJaringId: conflict.id,
        duplicateJaringLabel: existingLabel,
      },
    );
  }

  private async ensureProfilePhoto(
    fileId: string | null | undefined,
    context: AuthorizationContext,
  ) {
    if (!fileId) {
      throw new ApiException(
        'JARING_PROFILE_PHOTO_REQUIRED',
        'Foto Jaring wajib diunggah.',
        422,
      );
    }

    const ownershipWhere = context.userProfileId
      ? {
          OR: [
            { createdByAssignmentId: context.primaryAssignmentId },
            {
              createdByAssignment: {
                is: {
                  userProfileId: context.userProfileId,
                  isActive: true,
                },
              },
            },
          ],
        }
      : { createdByAssignmentId: context.primaryAssignmentId };

    const file = await this.prisma.fileAsset.findFirst({
      where: {
        id: fileId,
        deletedAt: null,
        fileType: 'PHOTO',
        lifecycleStatus: {
          in: [
            FileLifecycleStatus.UPLOADED,
            FileLifecycleStatus.SCANNING,
            FileLifecycleStatus.CLEAN,
          ],
        },
        ...ownershipWhere,
      },
      select: { id: true, mimeType: true },
    });

    if (!file || !file.mimeType.startsWith('image/')) {
      throw new ApiException(
        'JARING_PROFILE_PHOTO_INVALID',
        'Foto profil Jaring tidak ditemukan, bukan gambar, atau belum menjadi milik Field Officer ini.',
        422,
      );
    }
  }

  private calculateJaringReportActivity(item: {
    messages?: Array<{ receivedAt: Date }>;
    reportSessions?: Array<{ submittedAt: Date | null }>;
    registrationStatus?: JaringRegistrationStatus;
    status?: JaringStatus;
  }) {
    const latestMessageDate = item.messages?.[0]?.receivedAt
      ? new Date(item.messages[0].receivedAt).getTime()
      : null;
    const latestSessionDate = item.reportSessions?.[0]?.submittedAt
      ? new Date(item.reportSessions[0].submittedAt).getTime()
      : null;

    let lastReportAt: Date | null = null;
    if (latestMessageDate && latestSessionDate) {
      lastReportAt = new Date(Math.max(latestMessageDate, latestSessionDate));
    } else if (latestMessageDate) {
      lastReportAt = new Date(latestMessageDate);
    } else if (latestSessionDate) {
      lastReportAt = new Date(latestSessionDate);
    }

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);

    const isApproved =
      item.registrationStatus === JaringRegistrationStatus.APPROVED;
    const hasReportInLast3Months =
      lastReportAt !== null && lastReportAt.getTime() >= threeMonthsAgo.getTime();

    const computedStatus =
      isApproved && hasReportInLast3Months
        ? JaringStatus.ACTIVE
        : JaringStatus.INACTIVE;

    return {
      lastReportAt: lastReportAt ? lastReportAt.toISOString() : null,
      computedStatus,
    };
  }

  private async detail(id: string, includeDeleted = false) {
    const item = await this.prisma.jaring.findFirstOrThrow({
      where: { id, ...(includeDeleted ? {} : { deletedAt: null }) },
      include: {
        occupation: true,
        profilePhotoFile: true,
        caretakerAssignments: {
          include: {
            fieldOfficerAssignment: {
              include: { userProfile: true, role: true },
            },
          },
          orderBy: { validFrom: 'desc' },
        },
        areaCoverages: {
          include: {
            area: {
              include: {
                parent: {
                  include: { parent: true },
                },
              },
            },
          },
          orderBy: { validFrom: 'desc' },
        },
        _count: {
          select: { messages: true, primaryBakets: true, reportSessions: true },
        },
        messages: {
          take: 1,
          orderBy: { receivedAt: 'desc' },
          select: { receivedAt: true },
        },
        reportSessions: {
          take: 1,
          orderBy: { submittedAt: 'desc' },
          select: { submittedAt: true },
        },
      },
    });

    const { lastReportAt, computedStatus } =
      this.calculateJaringReportActivity(item);

    return {
      ...item,
      lastReportAt,
      status: computedStatus,
    };
  }

  private audit(
    context: AuthorizationContext,
    action: string,
    id: string,
    data?: Prisma.InputJsonValue,
  ) {
    return this.prisma.auditLog.create({
      data: {
        actorUserProfileId: context.userProfileId,
        actorAssignmentId: context.primaryAssignmentId,
        action,
        entityType: 'Jaring',
        entityId: id,
        ...(data ? { metadata: data } : {}),
      },
    });
  }

  private jaringReportVerificationStatus(session: JaringReportSessionRecord) {
    const message = session.submittedMessage;
    if (!message) {
      return session.status === 'ACTIVE'
        ? 'IN_PROGRESS_BY_JARING'
        : 'NOT_SUBMITTED';
    }

    if (message.convertedBaketId) {
      return 'METADATA_RECORDED';
    }

    if (
      message.validationSummary === WhatsAppValidationSummary.VALID &&
      message.status === WhatsAppMessageStatus.READY_FOR_BAKET
    ) {
      return 'VERIFIED_BY_FIELD_OFFICER';
    }

    if (
      message.validationSummary === WhatsAppValidationSummary.INVALID ||
      message.status === WhatsAppMessageStatus.UNDER_REVIEW
    ) {
      return 'NEEDS_FIELD_OFFICER_REVIEW';
    }

    return 'WAITING_FIELD_OFFICER_VERIFICATION';
  }

  private deriveDisplayTitle(content: string | null | undefined) {
    const words = content?.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean) ?? [];
    if (words.length === 0) return 'Laporan sedang dibuat';
    const headline = words.slice(0, 6).join(' ');
    return words.length > 6 ? `${headline}…` : headline;
  }

  private serializeJaringReportSession(session: JaringReportSessionRecord) {
    const submittedMessage = session.submittedMessage;
    const baket = submittedMessage?.convertedBaket ?? null;
    const latestVersion = baket?.versions[0] ?? null;
    const latitude =
      session.latitude === null ? null : Number(session.latitude);
    const longitude =
      session.longitude === null ? null : Number(session.longitude);
    const verificationStatus = this.jaringReportVerificationStatus(session);
    const currentReportVersion = session.amendments?.at(-1)?.versionNumber ?? 1;
    const content =
      latestVersion?.originalContent ??
      session.content ??
      submittedMessage?.content ??
      null;
    const sessionMedia = session.media ?? [];
    const contentParts = session.contentParts ?? [];
    const mediaMessageIds = new Set(
      sessionMedia.map((item) => item.externalMessageId),
    );
    const messages = [
      ...contentParts
        .filter((part) => !mediaMessageIds.has(part.externalMessageId))
        .map((part) => ({
          id: part.id,
          kind: 'TEXT' as const,
          text: part.content,
          sentAt: part.createdAt,
        })),
      ...sessionMedia.map((item) => ({
        id: item.id,
        kind: item.mediaType === FileType.VIDEO ? ('VIDEO' as const) : ('IMAGE' as const),
        fileId: item.fileId,
        caption: item.caption,
        fileName: item.file.originalName ?? 'berkas_lampiran',
        mimeType: item.file.mimeType,
        sentAt: item.createdAt,
      })),
      ...(latitude !== null && longitude !== null && session.locationCapturedAt
        ? [
            {
              id: session.locationMessageId ?? `location:${session.id}`,
              kind: 'LIVE_LOCATION' as const,
              latitude,
              longitude,
              accuracyMeters:
                session.locationAccuracyMeters === null
                  ? null
                  : Number(session.locationAccuracyMeters),
              sentAt: session.locationCapturedAt,
            },
          ]
        : []),
    ].sort((left, right) => left.sentAt.getTime() - right.sentAt.getTime());

    const activeCaretaker = session.jaring?.caretakerAssignments?.[0]?.fieldOfficerAssignment?.userProfile;
    const gaswilName =
      activeCaretaker?.fullName ??
      activeCaretaker?.username ??
      null;

    return {
      id: session.id,
      reportSessionId: session.id,
      jaringId: session.jaringId,
      jaringAlias:
        session.jaring?.aliasName ??
        session.jaring?.fullName ??
        null,
      gaswilName,
      referenceNumber:
        session.referenceNumber ?? submittedMessage?.referenceNumber ?? null,
      currentReportVersion,
      reportVersions: [
        {
          versionNumber: 1,
          amendmentType: 'ORIGINAL',
          content: session.content ?? submittedMessage?.content ?? null,
          fileId: null,
          file: null,
          createdAt:
            session.submittedAt ??
            submittedMessage?.receivedAt ??
            session.createdAt,
        },
        ...(session.amendments ?? []).map((amendment) => ({
          id: amendment.id,
          versionNumber: amendment.versionNumber,
          amendmentType: amendment.amendmentType,
          content: amendment.content,
          fileId: amendment.fileId,
          file: amendment.file,
          metadata: amendment.metadata,
          createdAt: amendment.createdAt,
        })),
      ],
      status: session.status,
      currentState: session.currentState,
      verificationStatus,
      displayStatus: verificationStatus,
      canFillMetadata: [
        'VERIFIED_BY_FIELD_OFFICER',
        'METADATA_RECORDED',
      ].includes(verificationStatus),
      displayTitle: this.deriveDisplayTitle(content),
      content,
      normalizedContent: latestVersion?.normalizedContent ?? null,
      reportedAt: session.submittedAt ?? session.startedAt,
      messages,
      startedAt: session.startedAt,
      lastActivityAt: session.lastActivityAt,
      expiresAt: session.expiresAt,
      submittedAt: session.submittedAt,
      closedAt: session.closedAt,
      readAt: session.readAt,
      isRead: Boolean(session.readAt),
      fieldOfficerReadAt: session.readAt,
      isReadByFieldOfficer: Boolean(session.readAt),
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      timezone: session.timezone,
      location:
        latitude === null || longitude === null
          ? null
          : {
              latitude,
              longitude,
              accuracyMeters:
                session.locationAccuracyMeters === null
                  ? null
                  : Number(session.locationAccuracyMeters),
              capturedAt: session.locationCapturedAt,
              type: session.locationType,
            },
      reportCategory:
        submittedMessage?.category ?? baket?.reportCategory ?? null,
      urgency: latestVersion?.urgency ?? null,
      fieldOfficerNote: latestVersion?.fieldOfficerNote ?? null,
      resolvedArea:
        submittedMessage?.resolvedArea ?? latestVersion?.eventArea ?? null,
      media:
        sessionMedia.map((item) => ({
          id: item.id,
          fileId: item.fileId,
          caption: item.caption ?? null,
          fileName: item.file?.originalName ?? 'berkas_lampiran',
          mimeType: item.file?.mimeType ?? null,
        })) ?? [],
      submittedMessage: submittedMessage
        ? {
            id: submittedMessage.id,
            referenceNumber: submittedMessage.referenceNumber,
            status: submittedMessage.status,
            validationSummary: submittedMessage.validationSummary,
            receivedAt: submittedMessage.receivedAt,
            convertedBaketId: submittedMessage.convertedBaketId,
            mediaCount: submittedMessage._count.media,
            amendmentCount: submittedMessage._count.reportAmendments,
          }
        : null,
      baket: baket
        ? {
            id: baket.id,
            status: baket.status,
            currentVersionNumber: baket.currentVersionNumber,
            latestVersion,
          }
        : null,
      counts: {
        contentParts: session._count.contentParts,
        media: session._count.media,
        amendments: session._count.amendments,
      },
    };
  }

  private serializeJaringCoachingReport(report: JaringCoachingReportRecord) {
    return {
      id: report.id,
      jaringId: report.jaringId,
      title: report.title,
      content: report.content,
      reportedAt: report.reportedAt,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      fieldOfficer: {
        assignmentId: report.fieldOfficerAssignmentId,
        role: report.fieldOfficerAssignment.role,
        userProfile: report.fieldOfficerAssignment.userProfile,
      },
    };
  }

  private validateReportMessageForFieldOfficer(message: {
    content: string | null;
    senderPhone: string;
    jaringId: string | null;
    receivedAt: Date;
    latitude: Prisma.Decimal | null;
    longitude: Prisma.Decimal | null;
    resolvedAreaId: string | null;
    rawPayload: Prisma.JsonValue;
    media: Array<unknown>;
  }) {
    const rawPayload =
      message.rawPayload &&
      typeof message.rawPayload === 'object' &&
      !Array.isArray(message.rawPayload)
        ? (message.rawPayload as Record<string, unknown>)
        : null;
    const hasPhotoEvidence =
      message.media.length > 0 ||
      (typeof rawPayload?.photoMessageId === 'string' &&
        rawPayload.photoMessageId.length > 0);

    return [
      ...(!message.content ? [['MISSING_CONTENT', 'Isi wajib tersedia']] : []),
      ...(!message.senderPhone
        ? [['MISSING_SOURCE', 'Identitas pengirim wajib tersedia']]
        : []),
      ...(!message.jaringId
        ? [['MISSING_JARING', 'Sumber Jaring wajib tersedia']]
        : []),
      ...(!message.receivedAt
        ? [['MISSING_TIME', 'Waktu penerimaan wajib tersedia']]
        : []),
      ...(message.latitude === null || message.longitude === null
        ? [['MISSING_GPS', 'GPS wajib tersedia']]
        : []),
      ...(message.latitude !== null &&
      message.longitude !== null &&
      !message.resolvedAreaId
        ? [
            [
              'UNRESOLVED_AREA',
              'Wilayah administratif dari koordinat belum berhasil ditentukan',
            ],
          ]
        : []),
      ...(!hasPhotoEvidence ? [['MISSING_PHOTO', 'Foto wajib tersedia']] : []),
    ];
  }

  private reportFieldSnapshot(input: {
    categoryId?: string | null;
    urgency?: PriorityLevel | null;
    content?: string | null;
    normalizedContent?: string | null;
    fieldOfficerNote?: string | null;
    taskAssignmentId?: string | null;
    baketId?: string | null;
    baketVersionId?: string | null;
    messageStatus?: string | null;
    validationSummary?: string | null;
  }) {
    return {
      categoryId: input.categoryId ?? null,
      urgency: input.urgency ?? null,
      content: input.content ?? null,
      normalizedContent: input.normalizedContent ?? null,
      fieldOfficerNote: input.fieldOfficerNote ?? null,
      taskAssignmentId: input.taskAssignmentId ?? null,
      baketId: input.baketId ?? null,
      baketVersionId: input.baketVersionId ?? null,
      messageStatus: input.messageStatus ?? null,
      validationSummary: input.validationSummary ?? null,
    };
  }

  private scopedJaringAreaWhere(scope: { areaRootIds: string[] }) {
    if (scope.areaRootIds.length === 0) {
      return {};
    }

    return {
      areaCoverages: {
        some: {
          validUntil: null,
          area: {
            OR: [
              { id: { in: scope.areaRootIds } },
              {
                descendantLinks: {
                  some: { ancestorId: { in: scope.areaRootIds } },
                },
              },
            ],
          },
        },
      },
    } satisfies Prisma.JaringWhereInput;
  }

  private async status(
    id: string,
    status: JaringStatus,
    reason: string,
    context: AuthorizationContext,
    auditAction = `JARING.${status}`,
  ) {
    const existing = await this.prisma.jaring.findUniqueOrThrow({
      where: { id },
      select: { registrationStatus: true },
    });
    if (
      status === JaringStatus.ACTIVE &&
      existing.registrationStatus === JaringRegistrationStatus.REJECTED
    ) {
      throw new ApiException(
        'JARING_REGISTRATION_REJECTED',
        'Jaring yang ditolak/revisi tidak dapat diaktifkan sebelum diajukan ulang dan disetujui.',
        409,
      );
    }
    const data: Prisma.JaringUpdateInput = {
      status,
      ...(status === JaringStatus.INACTIVE
        ? { deactivatedAt: new Date() }
        : {}),
      ...(status === JaringStatus.ACTIVE
        ? { deactivatedAt: null, deletedAt: null }
        : {}),
      ...(status === JaringStatus.ARCHIVED ? { deletedAt: new Date() } : {}),
    };
    await this.prisma.jaring.update({ where: { id }, data });
    await this.audit(context, auditAction, id, { reason });
    return this.detail(id, status === JaringStatus.ARCHIVED);
  }

  async list(query: JaringQuery, context: AuthorizationContext) {
    const scope = await this.domainScope.resolve(context);
    const isFieldOfficer = context.authRole === 'field_officer';
    const isFieldCoordinator = context.authRole === 'field_coordinator';
    const page = query.page ?? 1;

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);

    const items = await this.prisma.jaring.findMany({
      where: {
        deletedAt: null,
        ...(isFieldCoordinator && scope.areaRootIds.length === 0
          ? { id: { in: [] } }
          : {}),
        caretakerAssignments: {
          some: {
            ...(isFieldCoordinator
              ? {
                  fieldOfficerAssignment: {
                    branch: scope.commandRouteType,
                  },
                }
              : {
                  fieldOfficerAssignmentId: { in: scope.assignmentIds },
                }),
            isActive: true,
            OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
          },
        },
        ...this.scopedJaringAreaWhere(scope),
        ...(query.status === JaringStatus.ACTIVE
          ? {
              registrationStatus: JaringRegistrationStatus.APPROVED,
              OR: [
                {
                  reportSessions: {
                    some: { submittedAt: { gte: threeMonthsAgo } },
                  },
                },
                {
                  messages: {
                    some: { receivedAt: { gte: threeMonthsAgo } },
                  },
                },
              ],
            }
          : query.status === JaringStatus.INACTIVE
            ? {
                OR: [
                  {
                    registrationStatus: {
                      not: JaringRegistrationStatus.APPROVED,
                    },
                  },
                  {
                    AND: [
                      {
                        reportSessions: {
                          none: { submittedAt: { gte: threeMonthsAgo } },
                        },
                      },
                      {
                        messages: {
                          none: { receivedAt: { gte: threeMonthsAgo } },
                        },
                      },
                    ],
                  },
                ],
              }
            : query.status === JaringStatus.ARCHIVED
              ? { deletedAt: { not: null } }
              : {}),
        ...(query.registrationStatus
          ? { registrationStatus: query.registrationStatus }
          : isFieldOfficer
            ? {}
            : { registrationStatus: JaringRegistrationStatus.APPROVED }),
        ...(query.search
          ? {
              OR: [
                { aliasName: { contains: query.search, mode: 'insensitive' } },
                { fullName: { contains: query.search, mode: 'insensitive' } },
                { whatsappNumber: { contains: query.search } },
                { address: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      ...(page > 1 ? { skip: (page - 1) * query.limit } : {}),
      take: query.limit,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        occupation: true,
        profilePhotoFile: true,
        caretakerAssignments: {
          where: { isActive: true, validUntil: null },
          include: {
            fieldOfficerAssignment: { include: { userProfile: true } },
          },
        },
        areaCoverages: {
          where: { validUntil: null },
          include: {
            area: {
              include: {
                parent: {
                  include: { parent: true },
                },
              },
            },
          },
        },
        _count: {
          select: {
            messages: true,
            reportSessions: true,
            coachingReports: true,
          },
        },
        messages: {
          take: 1,
          orderBy: { receivedAt: 'desc' },
          select: {
            id: true,
            content: true,
            latitude: true,
            longitude: true,
            receivedAt: true,
          },
        },
        reportSessions: {
          take: 1,
          orderBy: { lastActivityAt: 'desc' },
          select: {
            id: true,
            content: true,
            latitude: true,
            longitude: true,
            submittedAt: true,
            startedAt: true,
            status: true,
          },
        },
      },
    });

    return items.map((item) => {
      const { lastReportAt, computedStatus } =
        this.calculateJaringReportActivity(item);
      return {
        ...item,
        lastReportAt,
        status: computedStatus,
      };
    });
  }

  async create(body: CreateJaringDto, context: AuthorizationContext) {
    await this.ensureActiveOccupation(body.occupationId);

    const birthDate = new Date(body.birthDate);
    if (Number.isNaN(birthDate.getTime()) || birthDate > new Date()) {
      throw new ApiException(
        'JARING_BIRTH_DATE_INVALID',
        'Tanggal lahir Jaring harus berupa tanggal valid dan tidak boleh di masa depan.',
        422,
      );
    }

    const joinedAt = new Date(body.joinedAt);
    if (
      Number.isNaN(joinedAt.getTime()) ||
      joinedAt > new Date() ||
      joinedAt < birthDate
    ) {
      throw new ApiException(
        'JARING_JOIN_DATE_INVALID',
        'Tanggal bergabung harus valid, tidak boleh sebelum tanggal lahir, dan tidak boleh di masa depan.',
        422,
      );
    }

    if (body.fieldOfficerAssignmentId !== context.primaryAssignmentId) {
      throw new ApiException(
        'JARING_CARETAKER_SCOPE_INVALID',
        'Jaring hanya dapat didaftarkan untuk akun Field Officer yang sedang aktif.',
        403,
      );
    }

    const areaIds = [...new Set(body.areaIds)];
    if (areaIds.length !== 1) {
      throw new ApiException(
        'JARING_AREA_MUST_BE_SINGLE_VILLAGE',
        'Satu Jaring hanya boleh memiliki satu Kelurahan/Desa cakupan.',
        422,
      );
    }
    await Promise.all(
      areaIds.map((areaId) => this.domainScope.assertArea(context, areaId)),
    );
    const coverageCount = await this.prisma.administrativeArea.count({
      where: {
        id: { in: areaIds },
        level: {
          in: [AdministrativeLevel.VILLAGE, AdministrativeLevel.URBAN_VILLAGE],
        },
        isActive: true,
        deletedAt: null,
      },
    });
    if (coverageCount !== areaIds.length) {
      throw new ApiException(
        'JARING_AREA_MUST_BE_VILLAGE',
        'Wilayah Jaring harus berupa satu kelurahan/desa aktif di bawah cakupan Field Officer.',
        422,
      );
    }

    const whatsappNumber = normalizeIndonesianPhoneNumber(body.whatsappNumber);
    const duplicateNumber = await this.prisma.jaring.findFirst({
      where: {
        whatsappNumber,
        status: JaringStatus.ACTIVE,
        deletedAt: null,
      },
      select: {
        id: true,
        aliasName: true,
        fullName: true,
        caretakerAssignments: {
          where: { isActive: true, validUntil: null },
          take: 1,
          select: { fieldOfficerAssignmentId: true },
        },
      },
    });

    if (duplicateNumber) {
      const existingLabel = this.formatJaringIdentityConflict(duplicateNumber);
      const registeredFieldOfficerId =
        duplicateNumber.caretakerAssignments[0]?.fieldOfficerAssignmentId;

      if (
        registeredFieldOfficerId &&
        registeredFieldOfficerId !== body.fieldOfficerAssignmentId
      ) {
        throw new ApiException(
          'JARING_WHATSAPP_OWNED_BY_OTHER_OFFICER',
          `Nomor WhatsApp sama dengan Jaring aktif ${existingLabel} di bawah Field Officer lain.`,
          409,
        );
      }

      throw new ApiException(
        'JARING_WHATSAPP_DUPLICATE',
        `Nomor WhatsApp sama dengan Jaring aktif ${existingLabel} di bawah Field Officer ini.`,
        409,
      );
    }

    const nationalIdNumber = body.nationalIdNumber?.trim() || null;
    this.assertNoNationalIdConflict(
      await this.findNationalIdConflict(nationalIdNumber),
    );

    const officer =
      await this.prisma.userOperationalAssignment.findUniqueOrThrow({
        where: { id: body.fieldOfficerAssignmentId },
        include: { role: true },
      });
    if (officer.role.code !== RoleCode.FIELD_OFFICER || !officer.isActive) {
      throw new ApiException(
        'CARETAKER_INVALID',
        'Caretaker must be an active Field Officer.',
        422,
      );
    }
    await this.ensureProfilePhoto(body.profilePhotoFileId, context);
    const aliasName = await this.generateAliasName(areaIds, body.gender);
    const jaring = await this.prisma.jaring.create({
      data: {
        aliasName,
        whatsappNumber,
        fullName: body.fullName.trim(),
        nationalIdNumber: nationalIdNumber ?? undefined,
        address: body.address.trim(),
        birthPlace: body.birthPlace.trim(),
        birthDate,
        gender: body.gender,
        occupationId: body.occupationId,
        profilePhotoFileId: body.profilePhotoFileId,
        workplace: body.workplace?.trim() || undefined,
        jobTitle: body.jobTitle?.trim() || undefined,
        joinedAt,
        organizationName: body.organizationName?.trim() || undefined,
        politicalAffiliation: body.politicalAffiliation?.trim() || undefined,
        status: JaringStatus.INACTIVE,
        deactivatedAt: new Date(),
        registrationStatus: JaringRegistrationStatus.PENDING,
        rejectionReason: null,
        reviewedAt: null,
        reviewedByAssignmentId: null,
        createdByAssignmentId: context.primaryAssignmentId,
        notes: body.notes.trim(),
        caretakerAssignments: {
          create: { fieldOfficerAssignmentId: body.fieldOfficerAssignmentId },
        },
        areaCoverages: {
          create: areaIds.map((areaId, index) => ({
            areaId,
            isPrimary: index === 0,
          })),
        },
      },
    });
    await this.audit(context, 'JARING.CREATE', jaring.id);
    return this.detail(jaring.id);
  }

  async approveRegistration(id: string, context: AuthorizationContext) {
    await this.domainScope.assertJaring(context, id);
    const existing = await this.prisma.jaring.findUniqueOrThrow({
      where: { id },
      select: {
        registrationStatus: true,
        whatsappNumber: true,
        nationalIdNumber: true,
      },
    });
    if (existing.registrationStatus === JaringRegistrationStatus.APPROVED) {
      return this.detail(id);
    }
    this.assertNoActiveWhatsappConflict(
      await this.findActiveWhatsappConflict(existing.whatsappNumber, id),
    );
    this.assertNoNationalIdConflict(
      await this.findNationalIdConflict(existing.nationalIdNumber, id),
    );
    await this.prisma.jaring.update({
      where: { id },
      data: {
        registrationStatus: JaringRegistrationStatus.APPROVED,
        status: JaringStatus.ACTIVE,
        deactivatedAt: null,
        rejectionReason: null,
        reviewedAt: new Date(),
        reviewedByAssignmentId: context.primaryAssignmentId,
      },
    });
    await this.audit(context, 'JARING.REGISTRATION.APPROVE', id);
    return this.detail(id);
  }

  async rejectRegistration(
    id: string,
    body: RejectJaringDto,
    context: AuthorizationContext,
  ) {
    await this.domainScope.assertJaring(context, id);
    const existing = await this.prisma.jaring.findUniqueOrThrow({
      where: { id },
      select: { registrationStatus: true },
    });
    if (existing.registrationStatus === JaringRegistrationStatus.APPROVED) {
      throw new ApiException(
        'JARING_REGISTRATION_ALREADY_APPROVED',
        'Jaring yang sudah disetujui tidak dapat ditolak.',
        409,
      );
    }
    const reason = body.reason?.trim() || null;
    await this.prisma.jaring.update({
      where: { id },
      data: {
        registrationStatus: JaringRegistrationStatus.REJECTED,
        status: JaringStatus.INACTIVE,
        deactivatedAt: new Date(),
        rejectionReason: reason,
        reviewedAt: new Date(),
        reviewedByAssignmentId: context.primaryAssignmentId,
      },
    });
    await this.audit(context, 'JARING.REGISTRATION.REJECT', id, {
      reason,
    });
    return this.detail(id);
  }

  async get(id: string, context: AuthorizationContext) {
    await this.domainScope.assertJaring(context, id);
    return this.detail(id);
  }

  async update(
    id: string,
    body: UpdateJaringDto,
    context: AuthorizationContext,
  ) {
    await this.domainScope.assertJaring(context, id);
    if (body.occupationId) {
      await this.ensureActiveOccupation(body.occupationId);
    }
    if (body.profilePhotoFileId) {
      await this.ensureProfilePhoto(body.profilePhotoFileId, context);
    }
    const existing = await this.prisma.jaring.findUniqueOrThrow({
      where: { id },
      select: { registrationStatus: true },
    });
    const whatsappNumber = body.whatsappNumber
      ? normalizeIndonesianPhoneNumber(body.whatsappNumber)
      : null;
    if (whatsappNumber) {
      this.assertNoActiveWhatsappConflict(
        await this.findActiveWhatsappConflict(whatsappNumber, id),
      );
    }
    const nationalIdNumber =
      body.nationalIdNumber !== undefined
        ? body.nationalIdNumber?.trim() || null
        : undefined;
    if (nationalIdNumber) {
      this.assertNoNationalIdConflict(
        await this.findNationalIdConflict(nationalIdNumber, id),
      );
    }
    const areaIds = body.areaIds ? [...new Set(body.areaIds)] : null;
    if (areaIds) {
      if (areaIds.length !== 1) {
        throw new ApiException(
          'JARING_AREA_MUST_BE_SINGLE_VILLAGE',
          'Satu Jaring hanya boleh memiliki satu Kelurahan/Desa cakupan.',
          422,
        );
      }
      await Promise.all(
        areaIds.map((areaId) => this.domainScope.assertArea(context, areaId)),
      );
      const coverageCount = await this.prisma.administrativeArea.count({
        where: {
          id: { in: areaIds },
          level: {
            in: [
              AdministrativeLevel.VILLAGE,
              AdministrativeLevel.URBAN_VILLAGE,
            ],
          },
          isActive: true,
          deletedAt: null,
        },
      });
      if (coverageCount !== areaIds.length) {
        throw new ApiException(
          'JARING_AREA_MUST_BE_VILLAGE',
          'Wilayah Jaring harus berupa satu kelurahan/desa aktif di bawah cakupan Field Officer.',
          422,
        );
      }
    }
    const { areaIds: _areaIds, ...patch } = body;
    await this.prisma.jaring.update({
      where: { id },
      data: {
        ...patch,
        ...(whatsappNumber ? { whatsappNumber } : {}),
        ...(body.fullName ? { fullName: body.fullName.trim() } : {}),
        ...(body.nationalIdNumber !== undefined ? { nationalIdNumber } : {}),
        ...(body.address !== undefined ? { address: body.address.trim() } : {}),
        ...(body.birthPlace ? { birthPlace: body.birthPlace.trim() } : {}),
        ...(body.birthDate ? { birthDate: new Date(body.birthDate) } : {}),
        ...(body.joinedAt ? { joinedAt: new Date(body.joinedAt) } : {}),
        ...(body.workplace !== undefined
          ? { workplace: body.workplace?.trim() || null }
          : {}),
        ...(body.jobTitle !== undefined
          ? { jobTitle: body.jobTitle?.trim() || null }
          : {}),
        ...(body.organizationName !== undefined
          ? { organizationName: body.organizationName?.trim() || null }
          : {}),
        ...(body.politicalAffiliation !== undefined
          ? { politicalAffiliation: body.politicalAffiliation?.trim() || null }
          : {}),
        registrationStatus: JaringRegistrationStatus.PENDING,
        status: JaringStatus.INACTIVE,
        deactivatedAt: new Date(),
        rejectionReason: null,
        reviewedAt: null,
        reviewedByAssignmentId: null,
      },
    });
    if (areaIds) {
      await this.prisma.jaringAreaCoverage.deleteMany({
        where: { jaringId: id },
      });
      await this.prisma.jaringAreaCoverage.create({
        data: { jaringId: id, areaId: areaIds[0], isPrimary: true },
      });
    }
    await this.audit(context, 'JARING.UPDATE', id);
    return this.detail(id);
  }

  async listOccupations(query: JaringOccupationQuery) {
    return this.prisma.jaringOccupation.findMany({
      where: {
        ...(query.includeInactive ? {} : { isActive: true }),
        ...(query.search
          ? {
              OR: [
                { code: { contains: query.search, mode: 'insensitive' } },
                { name: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      take: query.limit,
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      include: {
        _count: { select: { jaring: true } },
      },
    });
  }

  async createOccupation(
    body: CreateJaringOccupationDto,
    context: AuthorizationContext,
  ) {
    const code = this.referenceCode(body.code ?? body.name);
    const name = body.name.trim();

    const duplicate = await this.prisma.jaringOccupation.findFirst({
      where: {
        OR: [
          { code: { equals: code, mode: 'insensitive' } },
          { name: { equals: name, mode: 'insensitive' } },
        ],
      },
    });

    if (duplicate) {
      throw new ApiException(
        'JARING_OCCUPATION_DUPLICATE',
        'Kode atau nama pekerjaan sudah digunakan.',
        409,
      );
    }

    const occupation = await this.prisma.jaringOccupation.create({
      data: {
        code,
        name,
        description: body.description?.trim() || null,
      },
    });

    await this.audit(context, 'JARING_OCCUPATION.CREATE', occupation.id);
    return occupation;
  }

  async updateOccupation(
    id: string,
    body: UpdateJaringOccupationDto,
    context: AuthorizationContext,
  ) {
    const patch: Prisma.JaringOccupationUpdateInput = {};

    if (body.code !== undefined) {
      patch.code = this.referenceCode(body.code);
    }

    if (body.name !== undefined) {
      patch.name = body.name.trim();
    }

    if (body.description !== undefined) {
      patch.description = body.description.trim() || null;
    }

    if (body.isActive !== undefined) {
      patch.isActive = body.isActive;
    }

    if (patch.code || patch.name) {
      const duplicate = await this.prisma.jaringOccupation.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(typeof patch.code === 'string'
              ? [{ code: { equals: patch.code, mode: 'insensitive' as const } }]
              : []),
            ...(typeof patch.name === 'string'
              ? [{ name: { equals: patch.name, mode: 'insensitive' as const } }]
              : []),
          ],
        },
      });

      if (duplicate) {
        throw new ApiException(
          'JARING_OCCUPATION_DUPLICATE',
          'Kode atau nama pekerjaan sudah digunakan.',
          409,
        );
      }
    }

    const occupation = await this.prisma.jaringOccupation.update({
      where: { id },
      data: patch,
      include: { _count: { select: { jaring: true } } },
    });

    await this.audit(context, 'JARING_OCCUPATION.UPDATE', id);
    return occupation;
  }

  async listReportCategories(query: ReportCategoryQuery) {
    return this.prisma.reportCategory.findMany({
      where: {
        ...(query.includeInactive ? {} : { isActive: true }),
        ...(query.search
          ? {
              OR: [
                { code: { contains: query.search, mode: 'insensitive' } },
                { name: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      take: query.limit,
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      include: {
        _count: { select: { whatsAppMessages: true } },
      },
    });
  }

  async createReportCategory(
    body: CreateReportCategoryDto,
    context: AuthorizationContext,
  ) {
    const code = this.reportCategoryCode(body.code ?? body.name);
    const name = body.name.trim();

    const duplicate = await this.prisma.reportCategory.findFirst({
      where: {
        OR: [
          { code: { equals: code, mode: 'insensitive' } },
          { name: { equals: name, mode: 'insensitive' } },
        ],
      },
    });

    if (duplicate) {
      throw new ApiException(
        'REPORT_CATEGORY_DUPLICATE',
        'Kode atau nama kategori laporan sudah digunakan.',
        409,
      );
    }

    const category = await this.prisma.reportCategory.create({
      data: {
        code,
        name,
        description: body.description?.trim() || null,
      },
    });

    await this.audit(context, 'REPORT_CATEGORY.CREATE', category.id);
    return category;
  }

  async updateReportCategory(
    id: string,
    body: UpdateReportCategoryDto,
    context: AuthorizationContext,
  ) {
    const patch: Prisma.ReportCategoryUpdateInput = {};

    if (body.code !== undefined) {
      patch.code = this.reportCategoryCode(body.code);
    }

    if (body.name !== undefined) {
      patch.name = body.name.trim();
    }

    if (body.description !== undefined) {
      patch.description = body.description.trim() || null;
    }

    if (body.isActive !== undefined) {
      patch.isActive = body.isActive;
    }

    if (patch.code || patch.name) {
      const duplicate = await this.prisma.reportCategory.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(typeof patch.code === 'string'
              ? [{ code: { equals: patch.code, mode: 'insensitive' as const } }]
              : []),
            ...(typeof patch.name === 'string'
              ? [{ name: { equals: patch.name, mode: 'insensitive' as const } }]
              : []),
          ],
        },
      });

      if (duplicate) {
        throw new ApiException(
          'REPORT_CATEGORY_DUPLICATE',
          'Kode atau nama kategori laporan sudah digunakan.',
          409,
        );
      }
    }

    const category = await this.prisma.reportCategory.update({
      where: { id },
      data: patch,
      include: { _count: { select: { whatsAppMessages: true } } },
    });

    await this.audit(context, 'REPORT_CATEGORY.UPDATE', id);
    return category;
  }

  async activate(id: string, body: ReasonDto, context: AuthorizationContext) {
    throw new ApiException(
      'JARING_STATUS_AUTOMATIC',
      'Status aktif/tidak aktif Jaring diatur secara otomatis berdasarkan aktivitas pelaporan 3 bulan terakhir.',
      400,
    );
  }

  async deactivate(id: string, body: ReasonDto, context: AuthorizationContext) {
    throw new ApiException(
      'JARING_STATUS_AUTOMATIC',
      'Status aktif/tidak aktif Jaring diatur secara otomatis berdasarkan aktivitas pelaporan 3 bulan terakhir.',
      400,
    );
  }

  async softDelete(id: string, body: ReasonDto, context: AuthorizationContext) {
    return this.status(
      id,
      JaringStatus.ARCHIVED,
      body.reason,
      context,
      'JARING.DELETE',
    );
  }

  async caretakers(id: string, context: AuthorizationContext) {
    await this.domainScope.assertJaring(context, id);
    return this.prisma.jaringCaretakerAssignment.findMany({
      where: { jaringId: id },
      orderBy: { validFrom: 'desc' },
      include: {
        fieldOfficerAssignment: {
          include: { userProfile: true, role: true },
        },
      },
    });
  }

  async transfer(id: string, body: TransferDto, context: AuthorizationContext) {
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.jaringCaretakerAssignment.updateMany({
        where: { jaringId: id, isActive: true, validUntil: null },
        data: { isActive: false, validUntil: now, transferReason: body.reason },
      });
      await tx.jaringCaretakerAssignment.create({
        data: {
          jaringId: id,
          fieldOfficerAssignmentId: body.fieldOfficerAssignmentId,
          validFrom: now,
          transferReason: body.reason,
        },
      });
    });
    await this.audit(context, 'JARING.TRANSFER', id, { reason: body.reason });
    return this.detail(id);
  }

  async coverages(id: string, context?: AuthorizationContext) {
    if (context) await this.domainScope.assertJaring(context, id);
    return this.prisma.jaringAreaCoverage.findMany({
      where: { jaringId: id, validUntil: null },
      include: { area: true },
    });
  }

  async coverage(id: string, body: CoverageDto, context: AuthorizationContext) {
    if (body.areas.filter((item) => item.isPrimary).length !== 1) {
      throw new ApiException(
        'PRIMARY_AREA_REQUIRED',
        'Exactly one primary area is required.',
        422,
      );
    }
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.jaringAreaCoverage.updateMany({
        where: { jaringId: id, validUntil: null },
        data: { validUntil: now },
      });
      await tx.jaringAreaCoverage.createMany({
        data: body.areas.map((item) => ({
          jaringId: id,
          areaId: item.areaId,
          isPrimary: item.isPrimary,
          validFrom: now,
        })),
      });
    });
    await this.audit(context, 'JARING.COVERAGE.REPLACE', id, {
      reason: body.reason,
    });
    return this.coverages(id);
  }

  async messages(id: string) {
    return this.prisma.whatsAppMessage.findMany({
      where: { jaringId: id },
      orderBy: { receivedAt: 'desc' },
      include: {
        category: true,
        resolvedArea: true,
        validationIssues: true,
        media: {
          include: {
            file: {
              select: {
                id: true,
                originalName: true,
                mimeType: true,
                fileType: true,
                lifecycleStatus: true,
              },
            },
          },
        },
      },
    });
  }

  async coachingReports(
    id: string,
    query: JaringCoachingReportQuery,
    context: AuthorizationContext,
  ) {
    await this.domainScope.assertJaring(context, id);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = { jaringId: id };
    const [reports, total] = await Promise.all([
      this.prisma.jaringCoachingReport.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ reportedAt: 'desc' }, { createdAt: 'desc' }],
        select: jaringCoachingReportSelect,
      }),
      this.prisma.jaringCoachingReport.count({ where }),
    ]);

    return {
      items: reports.map((report) =>
        this.serializeJaringCoachingReport(report),
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async createCoachingReport(
    id: string,
    body: CreateJaringCoachingReportDto,
    context: AuthorizationContext,
  ) {
    await this.domainScope.assertJaring(context, id);

    const targetJaring = await this.prisma.jaring.findUnique({
      where: { id },
      select: { registrationStatus: true },
    });

    if (
      !targetJaring ||
      targetJaring.registrationStatus !== JaringRegistrationStatus.APPROVED
    ) {
      throw new ApiException(
        'JARING_NOT_VERIFIED',
        'Laporan pembinaan hanya dapat dibuat untuk Jaring yang sudah terverifikasi (disetujui).',
        422,
      );
    }

    const title = body.title.trim();
    const content = body.content.trim();
    if (!title || !content) {
      throw new ApiException(
        'JARING_COACHING_REPORT_REQUIRED',
        'Judul dan isi laporan pembinaan wajib diisi.',
        422,
      );
    }

    const reportedAt = new Date(body.reportedAt);
    if (Number.isNaN(reportedAt.getTime())) {
      throw new ApiException(
        'JARING_COACHING_REPORT_TIME_INVALID',
        'Tanggal dan waktu laporan pembinaan harus valid.',
        422,
      );
    }

    const report = await this.prisma.$transaction(async (tx) => {
      const created = await tx.jaringCoachingReport.create({
        data: {
          jaringId: id,
          fieldOfficerAssignmentId: context.primaryAssignmentId,
          title,
          content,
          reportedAt,
        },
        select: jaringCoachingReportSelect,
      });
      await tx.auditLog.create({
        data: {
          actorUserProfileId: context.userProfileId,
          actorAssignmentId: context.primaryAssignmentId,
          action: 'JARING_COACHING_REPORT.CREATE',
          entityType: 'JaringCoachingReport',
          entityId: created.id,
          metadata: {
            jaringId: id,
            reportedAt: reportedAt.toISOString(),
          },
        },
      });
      return created;
    });

    return this.serializeJaringCoachingReport(report);
  }

  async coachingReport(
    jaringId: string,
    reportId: string,
    context: AuthorizationContext,
  ) {
    await this.domainScope.assertJaring(context, jaringId);

    const report = await this.prisma.jaringCoachingReport.findFirst({
      where: { id: reportId, jaringId },
      select: jaringCoachingReportSelect,
    });
    if (!report) {
      throw new ApiException(
        'JARING_COACHING_REPORT_NOT_FOUND',
        'Laporan pembinaan Jaring tidak ditemukan.',
        404,
      );
    }

    return this.serializeJaringCoachingReport(report);
  }

  async allReports(query: JaringReportQuery, context: AuthorizationContext) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const jaringWhere = await this.domainScope.jaringWhere(context);
    const fromDate = query.from ? new Date(query.from) : undefined;
    const toDate = query.to ? new Date(query.to) : undefined;

    const baseJaringWhere: Prisma.JaringWhereInput = {
      ...jaringWhere,
      ...(query.jaringId ? { id: query.jaringId } : {}),
      ...(query.registrationStatus
        ? { registrationStatus: query.registrationStatus }
        : {}),
    };

    const where: Prisma.WhatsAppReportSessionWhereInput = {
      jaring: baseJaringWhere,
      ...(query.status ? { status: query.status } : {}),
      ...(fromDate || toDate
        ? {
            OR: [
              {
                submittedAt: {
                  ...(fromDate ? { gte: fromDate } : {}),
                  ...(toDate ? { lte: toDate } : {}),
                },
              },
              {
                submittedAt: null,
                startedAt: {
                  ...(fromDate ? { gte: fromDate } : {}),
                  ...(toDate ? { lte: toDate } : {}),
                },
              },
            ],
          }
        : {}),
    };

    const [sessions, total, statusCounts] = await Promise.all([
      this.prisma.whatsAppReportSession.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { submittedAt: 'desc' },
          { updatedAt: 'desc' },
          { id: 'desc' },
        ],
        select: jaringReportSessionSelect,
      }),
      this.prisma.whatsAppReportSession.count({ where }),
      this.prisma.whatsAppReportSession.groupBy({
        by: ['status'],
        where: {
          jaring: baseJaringWhere,
          ...(fromDate || toDate
            ? {
                OR: [
                  {
                    submittedAt: {
                      ...(fromDate ? { gte: fromDate } : {}),
                      ...(toDate ? { lte: toDate } : {}),
                    },
                  },
                  {
                    submittedAt: null,
                    startedAt: {
                      ...(fromDate ? { gte: fromDate } : {}),
                      ...(toDate ? { lte: toDate } : {}),
                    },
                  },
                ],
              }
            : {}),
        },
        _count: { _all: true },
      }),
    ]);

    return {
      items: sessions.map((session) =>
        this.serializeJaringReportSession(session),
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      facets: {
        status: Object.fromEntries(
          statusCounts.map((item) => [item.status, item._count._all]),
        ),
      },
    };
  }

  async reports(
    id: string,
    query: JaringReportQuery,
    context: AuthorizationContext,
  ) {
    await this.domainScope.assertJaring(context, id);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.WhatsAppReportSessionWhereInput = {
      jaringId: id,
      ...(query.status ? { status: query.status } : {}),
    };

    const [sessions, total, statusCounts] = await Promise.all([
      this.prisma.whatsAppReportSession.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { submittedAt: 'desc' },
          { updatedAt: 'desc' },
          { id: 'desc' },
        ],
        select: jaringReportSessionSelect,
      }),
      this.prisma.whatsAppReportSession.count({ where }),
      this.prisma.whatsAppReportSession.groupBy({
        by: ['status'],
        where: { jaringId: id },
        _count: { _all: true },
      }),
    ]);

    return {
      items: sessions.map((session) =>
        this.serializeJaringReportSession(session),
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      facets: {
        status: Object.fromEntries(
          statusCounts.map((item) => [item.status, item._count._all]),
        ),
      },
    };
  }

  async report(id: string, context: AuthorizationContext) {
    const session = await this.prisma.whatsAppReportSession.findUnique({
      where: { id },
      select: jaringReportSessionSelect,
    });
    if (!session) {
      throw new ApiException(
        'JARING_REPORT_NOT_FOUND',
        'Laporan Jaring tidak ditemukan.',
        404,
      );
    }

    await this.domainScope.assertJaring(context, session.jaringId);

    return this.serializeJaringReportSession(session);
  }

  async markReportAsRead(id: string, context: AuthorizationContext) {
    if (context.roleCode !== RoleCode.FIELD_OFFICER) {
      throw new ApiException(
        'JARING_REPORT_READ_FORBIDDEN',
        'Hanya Field Officer yang dapat menandai laporan Jaring sebagai sudah dibaca petugas.',
        403,
      );
    }

    let session = await this.prisma.whatsAppReportSession.findUnique({
      where: { id },
      select: jaringReportSessionSelect,
    });
    if (!session) {
      throw new ApiException(
        'JARING_REPORT_NOT_FOUND',
        'Laporan Jaring tidak ditemukan.',
        404,
      );
    }

    await this.domainScope.assertJaring(context, session.jaringId);

    if (!session.submittedMessage) {
      throw new ApiException(
        'JARING_REPORT_NOT_SUBMITTED',
        'Laporan Jaring yang masih disusun belum dapat ditandai sudah dibaca.',
        422,
      );
    }

    if (!session.readAt) {
      const now = new Date();
      await this.prisma.whatsAppReportSession.update({
        where: { id },
        data: { readAt: now },
      });
      session = { ...session, readAt: now };
    }

    return this.serializeJaringReportSession(session);
  }

  async verifyReport(
    id: string,
    body: VerifyJaringReportDto,
    context: AuthorizationContext,
  ) {
    const session = await this.prisma.whatsAppReportSession.findUnique({
      where: { id },
      include: {
        submittedMessage: {
          include: {
            media: true,
            validationIssues: true,
          },
        },
      },
    });
    if (!session) {
      throw new ApiException(
        'JARING_REPORT_NOT_FOUND',
        'Laporan Jaring tidak ditemukan.',
        404,
      );
    }
    await this.domainScope.assertJaring(context, session.jaringId);

    const message = session.submittedMessage;
    if (!message) {
      throw new ApiException(
        'JARING_REPORT_NOT_SUBMITTED',
        'Laporan Jaring belum dikirim sehingga belum dapat diverifikasi Field Officer.',
        422,
      );
    }

    if (message.convertedBaketId) {
      return this.report(id, context);
    }

    const issues = this.validateReportMessageForFieldOfficer(message);
    const before = this.reportFieldSnapshot({
      categoryId: message.categoryId,
      content: message.content,
      messageStatus: message.status,
      validationSummary: message.validationSummary,
    });
    const nextValidationSummary = issues.length
      ? WhatsAppValidationSummary.INVALID
      : WhatsAppValidationSummary.VALID;
    const nextMessageStatus = issues.length
      ? WhatsAppMessageStatus.UNDER_REVIEW
      : WhatsAppMessageStatus.READY_FOR_BAKET;
    const after = {
      ...before,
      messageStatus: nextMessageStatus,
      validationSummary: nextValidationSummary,
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.whatsAppValidationIssue.deleteMany({
        where: { messageId: message.id },
      });
      if (issues.length) {
        await tx.whatsAppValidationIssue.createMany({
          data: issues.map(([code, issueMessage]) => ({
            messageId: message.id,
            code,
            message: issueMessage,
          })),
        });
      }
      await tx.whatsAppMessage.update({
        where: { id: message.id },
        data: {
          validationSummary: nextValidationSummary,
          status: nextMessageStatus,
        },
      });
      await tx.whatsAppReportHistory.create({
        data: {
          reportSessionId: session.id,
          action: issues.length
            ? 'FIELD_OFFICER_VERIFICATION_FAILED'
            : 'FIELD_OFFICER_VERIFIED',
          previousState: session.currentState,
          newState: session.currentState,
          metadata: {
            note: body.note ?? null,
            actorAssignmentId: context.primaryAssignmentId,
            issues: issues.map(([code, issueMessage]) => ({
              code,
              message: issueMessage,
            })),
            before,
            after,
          },
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserProfileId: context.userProfileId,
          actorAssignmentId: context.primaryAssignmentId,
          action: issues.length
            ? 'JARING_REPORT.VERIFICATION_FAILED'
            : 'JARING_REPORT.VERIFIED',
          entityType: 'WhatsAppReportSession',
          entityId: session.id,
          beforeData: before,
          afterData: after,
          metadata: {
            messageId: message.id,
            note: body.note ?? null,
          },
        },
      });
    });

    return this.report(id, context);
  }

  async updateReportMetadata(
    id: string,
    body: UpdateJaringReportMetadataDto,
    context: AuthorizationContext,
  ) {
    const session = await this.prisma.whatsAppReportSession.findUnique({
      where: { id },
      include: {
        submittedMessage: {
          include: {
            media: {
              include: {
                file: { select: { lifecycleStatus: true } },
              },
            },
            convertedBaket: {
              include: {
                versions: {
                  orderBy: { versionNumber: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });
    if (!session) {
      throw new ApiException(
        'JARING_REPORT_NOT_FOUND',
        'Laporan Jaring tidak ditemukan.',
        404,
      );
    }
    await this.domainScope.assertJaring(context, session.jaringId);

    const message = session.submittedMessage;
    if (!message) {
      throw new ApiException(
        'JARING_REPORT_NOT_SUBMITTED',
        'Laporan Jaring belum dikirim sehingga belum dapat diisi metadata.',
        422,
      );
    }
    if (
      message.validationSummary !== WhatsAppValidationSummary.VALID ||
      ![
        WhatsAppMessageStatus.READY_FOR_BAKET,
        WhatsAppMessageStatus.PROCESSED,
      ].includes(message.status)
    ) {
      throw new ApiException(
        'JARING_REPORT_NOT_VERIFIED',
        'Laporan Jaring harus diverifikasi Field Officer sebelum kategori dan urgency diisi.',
        422,
      );
    }
    if (!message.resolvedAreaId) {
      throw new ApiException(
        'JARING_REPORT_AREA_UNRESOLVED',
        'Wilayah laporan belum tersimpan. Selesaikan resolusi lokasi sebelum mengisi metadata.',
        422,
      );
    }

    const baket = message.convertedBaket;
    const latestVersion = baket?.versions[0] ?? null;
    const categoryId =
      body.categoryId ?? message.categoryId ?? baket?.reportCategoryId ?? null;
    const urgency = body.urgency ?? latestVersion?.urgency ?? null;

    if (!categoryId || !urgency) {
      throw new ApiException(
        'JARING_REPORT_METADATA_INCOMPLETE',
        'Kategori laporan dan urgency wajib diisi.',
        422,
      );
    }

    const category = await this.prisma.reportCategory.findFirst({
      where: { id: categoryId, isActive: true },
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
          'Tugas terkait tidak ditemukan pada assignment Field Officer.',
          404,
        );
      }
    }

    const nextContent =
      body.content !== undefined
        ? body.content.trim()
        : (latestVersion?.originalContent ?? message.content ?? '');
    if (!nextContent) {
      throw new ApiException(
        'JARING_REPORT_CONTENT_REQUIRED',
        'Isi laporan wajib tersedia.',
        422,
      );
    }
    const nextNormalizedContent =
      body.normalizedContent !== undefined
        ? body.normalizedContent.trim()
        : (latestVersion?.normalizedContent ?? nextContent);
    const nextFieldOfficerNote =
      body.fieldOfficerNote !== undefined
        ? body.fieldOfficerNote.trim()
        : (latestVersion?.fieldOfficerNote ?? null);
    const nextTaskAssignmentId =
      body.taskAssignmentId ?? baket?.taskAssignmentId ?? null;

    const before = this.reportFieldSnapshot({
      categoryId: message.categoryId ?? baket?.reportCategoryId ?? null,
      urgency: latestVersion?.urgency ?? null,
      content: latestVersion?.originalContent ?? message.content,
      normalizedContent: latestVersion?.normalizedContent,
      fieldOfficerNote: latestVersion?.fieldOfficerNote,
      taskAssignmentId: baket?.taskAssignmentId ?? null,
      baketId: baket?.id ?? null,
      baketVersionId: latestVersion?.id ?? null,
      messageStatus: message.status,
      validationSummary: message.validationSummary,
    });
    const after = this.reportFieldSnapshot({
      categoryId: category.id,
      urgency,
      content: nextContent,
      normalizedContent: nextNormalizedContent,
      fieldOfficerNote: nextFieldOfficerNote,
      taskAssignmentId: nextTaskAssignmentId,
      baketId: baket?.id ?? null,
      baketVersionId: latestVersion?.id ?? null,
      messageStatus: WhatsAppMessageStatus.PROCESSED,
      validationSummary: WhatsAppValidationSummary.VALID,
    });
    const versionChanged =
      !latestVersion ||
      before.urgency !== after.urgency ||
      before.content !== after.content ||
      before.normalizedContent !== after.normalizedContent ||
      before.fieldOfficerNote !== after.fieldOfficerNote;

    await this.prisma.$transaction(async (tx) => {
      const usableFileStatuses: FileLifecycleStatus[] = [
        FileLifecycleStatus.CLEAN,
        FileLifecycleStatus.UPLOADED,
      ];
      const usableMedia = message.media.filter((item) =>
        usableFileStatuses.includes(item.file.lifecycleStatus),
      );
      const versionPayload = {
        originalContent: nextContent,
        normalizedContent: nextNormalizedContent || nextContent,
        eventAreaId: message.resolvedAreaId,
        latitude: message.latitude,
        longitude: message.longitude,
        gpsAccuracyMeters: message.gpsAccuracyMeters,
        locationCapturedAt: message.locationCapturedAt,
        coordinateSource:
          message.coordinateSource ?? CoordinateSource.WHATSAPP_LOCATION,
        areaResolutionMethod: message.areaResolutionMethod,
        areaResolutionConfidence: message.areaResolutionConfidence,
        areaResolvedAt: message.areaResolvedAt,
        urgency,
        fieldOfficerNote: nextFieldOfficerNote,
        createdByAssignmentId: context.primaryAssignmentId,
        sourceMessages: { create: { messageId: message.id } },
        attachments: usableMedia.length
          ? {
              create: usableMedia.map((item) => ({
                fileId: item.fileId,
                caption: item.caption,
              })),
            }
          : undefined,
      };

      const nextBaket = baket
        ? await tx.baket.update({
            where: { id: baket.id },
            data: {
              reportCategoryId: category.id,
              taskAssignmentId: nextTaskAssignmentId,
              ...(versionChanged
                ? {
                    currentVersionNumber: { increment: 1 },
                    versions: {
                      create: {
                        versionNumber: baket.currentVersionNumber + 1,
                        ...versionPayload,
                      },
                    },
                  }
                : {}),
            },
            include: {
              reportCategory: true,
              primaryJaring: true,
              versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
            },
          })
        : await tx.baket.create({
            data: {
              status: BaketStatus.READY_TO_SEND,
              createdByFieldOfficerAssignmentId: context.primaryAssignmentId,
              taskAssignmentId: nextTaskAssignmentId,
              primaryJaringId: message.jaringId,
              reportCategoryId: category.id,
              versions: {
                create: {
                  versionNumber: 1,
                  ...versionPayload,
                },
              },
            },
            include: {
              reportCategory: true,
              primaryJaring: true,
              versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
            },
          });
      const latestBaketVersion = nextBaket.versions[0];
      const afterWithBaket = {
        ...after,
        baketId: nextBaket.id,
        baketVersionId: latestBaketVersion?.id ?? after.baketVersionId,
      };

      await tx.whatsAppMessage.update({
        where: { id: message.id },
        data: {
          convertedBaketId: nextBaket.id,
          categoryId: category.id,
          status: WhatsAppMessageStatus.PROCESSED,
          processedAt: new Date(),
        },
      });
      await tx.whatsAppReportHistory.create({
        data: {
          reportSessionId: session.id,
          action: baket
            ? 'FIELD_OFFICER_METADATA_UPDATED'
            : 'FIELD_OFFICER_METADATA_CREATED',
          previousState: session.currentState,
          newState: session.currentState,
          metadata: {
            actorAssignmentId: context.primaryAssignmentId,
            messageId: message.id,
            versionChanged,
            before,
            after: afterWithBaket,
          },
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserProfileId: context.userProfileId,
          actorAssignmentId: context.primaryAssignmentId,
          action: baket
            ? 'JARING_REPORT.METADATA.UPDATE'
            : 'JARING_REPORT.METADATA.CREATE',
          entityType: 'WhatsAppReportSession',
          entityId: session.id,
          beforeData: before,
          afterData: afterWithBaket,
          metadata: {
            messageId: message.id,
            baketId: nextBaket.id,
            versionChanged,
          },
        },
      });
    });

    return this.report(id, context);
  }

  async reportHistory(id: string, context: AuthorizationContext) {
    const session = await this.prisma.whatsAppReportSession.findUnique({
      where: { id },
      select: { id: true, jaringId: true },
    });
    if (!session) {
      throw new ApiException(
        'JARING_REPORT_NOT_FOUND',
        'Laporan Jaring tidak ditemukan.',
        404,
      );
    }
    await this.domainScope.assertJaring(context, session.jaringId);

    const [reportHistory, auditHistory] = await Promise.all([
      this.prisma.whatsAppReportHistory.findMany({
        where: { reportSessionId: id },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.findMany({
        where: {
          entityType: 'WhatsAppReportSession',
          entityId: id,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      reportSessionId: id,
      events: [
        ...reportHistory.map((item) => ({
          id: item.id,
          source: 'report_history',
          action: item.action,
          previousState: item.previousState,
          newState: item.newState,
          externalMessageId: item.externalMessageId,
          metadata: item.metadata,
          createdAt: item.createdAt,
        })),
        ...auditHistory.map((item) => ({
          id: item.id,
          source: 'audit_log',
          action: item.action,
          actorUserProfileId: item.actorUserProfileId,
          actorAssignmentId: item.actorAssignmentId,
          beforeData: item.beforeData,
          afterData: item.afterData,
          metadata: item.metadata,
          createdAt: item.createdAt,
        })),
      ].sort(
        (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
      ),
    };
  }

  async bakets(id: string, context: AuthorizationContext) {
    await this.domainScope.assertJaring(context, id);
    return this.prisma.baket.findMany({
      where: { primaryJaringId: id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
    });
  }
}
