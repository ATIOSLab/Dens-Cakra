import { Injectable } from '@nestjs/common';
import {
  AdministrativeLevel,
  BaketStatus,
  CoordinateSource,
  CoverageValidationStatus,
  FileLifecycleStatus,
  FileType,
  JaringRegistrationStatus,
  JaringStatus,
  PriorityLevel,
  Prisma,
  RoleCode,
  WhatsAppMessageStatus,
} from '../../generated/prisma/client.js';
import { ApiException } from '../../common/api/api-exception.js';
import { SYSTEM_ROLES } from '../../common/constants/system-role.js';
import { sortReportCategories } from '../../common/report-category-order.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import {
  getIndonesianPhoneSearchVariants,
  normalizeIndonesianPhoneNumber,
} from '../../common/utils/phone-normalizer.js';
import { resolveDescendantAreaIds } from '../../common/utils/area-closure.js';
import { DomainScopeService } from '../access/domain-scope.service.js';
import { ApplicationCacheService } from '../cache/application-cache.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreateJaringCoachingReportDto,
  CreateJaringOccupationDto,
  CreateReportCategoryDto,
  CreateJaringDto,
  JaringCoachingReportQuery,
  JaringOccupationQuery,
  JaringQuery,
  JaringRekapJangkauanQueryDto,
  JaringReportQuery,
  ReportCategoryQuery,
  ReasonDto,
  RejectJaringDto,
  SuspendJaringDto,
  UnsuspendJaringDto,
  UpdateJaringOccupationDto,
  UpdateJaringReportMetadataDto,
  UpdateReportCategoryDto,
  UpdateJaringDto,
} from './jaring.dto.js';

type JaringReportProcessStatus =
  | 'IN_PROGRESS_BY_JARING'
  | 'NOT_SUBMITTED'
  | 'READY_FOR_BAKET'
  | 'BAKET_CREATED';

const JAKARTA_CITY_ALIAS_CODES: Record<string, string> = {
  '31.74': 'Z', // Jakarta Selatan
  '31.73': 'Y', // Jakarta Barat
  '31.75': 'X', // Jakarta Timur
  '31.71': 'W', // Jakarta Pusat
  '31.72': 'V', // Jakarta Utara
  '31.01': 'V', // Kepulauan Seribu
};

type AliasAdministrativeArea = {
  id: string;
  code: string;
  officialCode: string | null;
  name: string;
  level: AdministrativeLevel;
  parent?: AliasAdministrativeArea | null;
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

type KorwilInfo = {
  id: string;
  name: string;
  assignmentId: string;
};

type KorwilLookup = {
  byAreaId: Map<string, KorwilInfo>;
  byOfficialCode: Map<string, KorwilInfo>;
  allKorwils: KorwilInfo[];
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
      whatsappNumber: true,
      profilePhotoFileId: true,
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
      areaCoverages: {
        where: { validUntil: null },
        orderBy: [{ isPrimary: 'desc' }, { validFrom: 'desc' }],
        select: {
          isPrimary: true,
          area: { select: areaSelectWithParents },
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
  readByUserProfileId: true,
  readByUserProfile: {
    select: {
      id: true,
      fullName: true,
      username: true,
    },
  },
  gaswilReadAt: true,
  gaswilReadByUserProfileId: true,
  gaswilReadByUserProfile: {
    select: {
      id: true,
      fullName: true,
      username: true,
    },
  },
  korwilReadAt: true,
  korwilReadByUserProfileId: true,
  korwilReadByUserProfile: {
    select: {
      id: true,
      fullName: true,
      username: true,
    },
  },
  createdAt: true,
  updatedAt: true,
  submittedMessage: {
    select: {
      id: true,
      referenceNumber: true,
      content: true,
      senderPhone: true,
      jaringId: true,
      latitude: true,
      longitude: true,
      resolvedAreaId: true,
      rawPayload: true,
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

type JaringReportStatusCount = {
  status: string;
  _count: { _all: number };
};

const jaringCoachingReportSelect = {
  id: true,
  jaringId: true,
  fieldOfficerAssignmentId: true,
  title: true,
  content: true,
  reportedAt: true,
  createdAt: true,
  updatedAt: true,
  jaring: {
    select: {
      id: true,
      aliasName: true,
      fullName: true,
      whatsappNumber: true,
      profilePhotoFileId: true,
      areaCoverages: {
        where: { validUntil: null },
        orderBy: [{ isPrimary: 'desc' }, { validFrom: 'desc' }],
        select: {
          isPrimary: true,
          area: { select: areaSelectWithParents },
        },
      },
    },
  },
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
  attachments: {
    select: {
      fileId: true,
      caption: true,
      file: {
        select: {
          id: true,
          originalName: true,
          mimeType: true,
        },
      },
    },
    orderBy: { fileId: 'asc' },
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
    private readonly cache: ApplicationCacheService,
  ) {}

  private korwilCache: { expiresAt: number; lookup: KorwilLookup } | null =
    null;

  private async getKorwilLookup(): Promise<KorwilLookup> {
    if (!this.prisma.userOperationalAssignment?.findMany) {
      return { byAreaId: new Map(), byOfficialCode: new Map(), allKorwils: [] };
    }

    const now = Date.now();
    if (this.korwilCache && this.korwilCache.expiresAt > now) {
      return this.korwilCache.lookup;
    }

    try {
      const assignments = await this.prisma.userOperationalAssignment.findMany({
        where: {
          isActive: true,
          role: { code: RoleCode.FIELD_COORDINATOR },
        },
        select: {
          id: true,
          userProfile: {
            select: {
              id: true,
              fullName: true,
              username: true,
            },
          },
          areaScopes: {
            where: { validUntil: null },
            select: {
              areaId: true,
              area: {
                select: {
                  id: true,
                  officialCode: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      const byAreaId = new Map<string, KorwilInfo>();
      const byOfficialCode = new Map<string, KorwilInfo>();
      const allKorwils: KorwilInfo[] = [];

      for (const assignment of assignments) {
        const name =
          assignment.userProfile?.fullName ??
          assignment.userProfile?.username ??
          'Koordinator Wilayah';
        const info: KorwilInfo = {
          id: assignment.userProfile?.id ?? assignment.id,
          assignmentId: assignment.id,
          name,
        };
        allKorwils.push(info);
        for (const scope of assignment.areaScopes) {
          if (scope.areaId) byAreaId.set(scope.areaId, info);
          if (scope.area?.officialCode)
            byOfficialCode.set(scope.area.officialCode, info);
          if (scope.area?.code) byOfficialCode.set(scope.area.code, info);
        }
      }

      const lookup: KorwilLookup = { byAreaId, byOfficialCode, allKorwils };
      this.korwilCache = { expiresAt: now + 60_000, lookup };
      return lookup;
    } catch {
      return { byAreaId: new Map(), byOfficialCode: new Map(), allKorwils: [] };
    }
  }

  private resolveKorwilForSession(
    session: JaringReportSessionRecord,
    lookup: KorwilLookup,
  ): KorwilInfo | null {
    const primaryCoverage =
      session.jaring?.areaCoverages.find((coverage) => coverage.isPrimary) ??
      session.jaring?.areaCoverages[0] ??
      null;
    const areasToCheck = [
      primaryCoverage?.area,
      session.submittedMessage?.resolvedArea,
    ].filter(Boolean);

    for (const area of areasToCheck) {
      let curr: any = area;
      while (curr) {
        if (curr.id && lookup.byAreaId.has(curr.id)) {
          return lookup.byAreaId.get(curr.id)!;
        }
        if (curr.officialCode && lookup.byOfficialCode.has(curr.officialCode)) {
          return lookup.byOfficialCode.get(curr.officialCode)!;
        }
        if (curr.officialCode) {
          const prefix2 = curr.officialCode.slice(0, 5);
          if (lookup.byOfficialCode.has(prefix2)) {
            return lookup.byOfficialCode.get(prefix2)!;
          }
        }
        curr = curr.parent;
      }
    }

    return null;
  }

  private referenceCode(value: string) {
    const normalized = value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80);

    return normalized || `REFERENCE_${Date.now()}`;
  }

  private currentWibMonthRange(value = new Date()) {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
      })
        .formatToParts(value)
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, part.value]),
    );
    const year = Number(parts.year);
    const monthIndex = Number(parts.month) - 1;

    return {
      from: new Date(Date.UTC(year, monthIndex, 1, -7)),
      to: new Date(Date.UTC(year, monthIndex + 1, 1, -7)),
    };
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

  private districtNumber(area: AdministrativeCodeArea) {
    const lastSegment = this.administrativeCode(area).split('.').at(-1) ?? '';
    const digits = lastSegment.replace(/\D/g, '');
    return digits.padStart(2, '0');
  }

  private cityAliasCodeForDistrict(districtArea: AdministrativeCodeArea) {
    const cityCode = this.administrativeCode(districtArea)
      .split('.')
      .slice(0, -1)
      .join('.');
    return cityCode ? (JAKARTA_CITY_ALIAS_CODES[cityCode] ?? null) : null;
  }

  private async generateAliasName(areaIds: string[]) {
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
    });

    const areaById = new Map<string, any>(
      areas.map((area: any) => [area.id, area]),
    );
    const primaryArea = areaIds
      .map((areaId) => areaById.get(areaId))
      .find(Boolean);
    const district =
      primaryArea?.level === AdministrativeLevel.DISTRICT
        ? primaryArea
        : primaryArea?.parent?.level === AdministrativeLevel.DISTRICT
          ? primaryArea.parent
          : null;
    const cityCode = district ? this.cityAliasCodeForDistrict(district) : null;

    if (!district || !cityCode) {
      throw new ApiException(
        'JARING_ALIAS_AREA_UNSUPPORTED',
        'Alias otomatis hanya dapat dibuat untuk kecamatan di cakupan Jakarta yang sudah memiliki kode kota.',
        422,
      );
    }

    const aliasPrefix = `${cityCode}${this.districtNumber(district)}`;
    const existingAliases = await this.prisma.jaring.findMany({
      where: {
        aliasName: { startsWith: aliasPrefix },
      },
      select: { aliasName: true },
    });
    const maxSequence = existingAliases.reduce(
      (max: number, item: { aliasName: string | null }) => {
        const sequence = item.aliasName?.slice(aliasPrefix.length);
        if (!sequence || !/^\d{3}$/.test(sequence)) {
          return max;
        }
        return Math.max(max, Number(sequence));
      },
      0,
    );
    const nextSequence = maxSequence + 1;

    if (nextSequence > 999) {
      throw new ApiException(
        'JARING_ALIAS_SEQUENCE_EXHAUSTED',
        'Urutan alias Jaring untuk kecamatan ini sudah mencapai batas 999.',
        422,
      );
    }

    return `${aliasPrefix}${String(nextSequence).padStart(3, '0')}`;
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
      `Nomor WhatsApp sama dengan Jaring terdaftar ${existingLabel}. Gunakan nomor berbeda atau tolak pengajuan jika data ini duplikat.`,
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
        'Foto profil Jaring tidak ditemukan, bukan gambar, atau belum menjadi milik Petugas Wilayah (Gaswil) ini.',
        422,
      );
    }
  }

  private calculateJaringReportActivity(item: {
    messages?: Array<{ receivedAt: Date }>;
    reportSessions?: Array<{ submittedAt: Date | null }>;
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

    const hasReportInLast3Months =
      lastReportAt !== null &&
      lastReportAt.getTime() >= threeMonthsAgo.getTime();

    const computedStatus = hasReportInLast3Months
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
                  include: {
                    parent: {
                      include: { parent: true },
                    },
                  },
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

  private jaringReportProcessStatus(
    session: JaringReportSessionRecord,
  ): JaringReportProcessStatus {
    const message = session.submittedMessage;
    if (!message) {
      return session.status === 'ACTIVE'
        ? 'IN_PROGRESS_BY_JARING'
        : 'NOT_SUBMITTED';
    }

    if (message.convertedBaketId) {
      return 'BAKET_CREATED';
    }

    return 'READY_FOR_BAKET';
  }

  private deriveDisplayTitle(content: string | null | undefined) {
    const words =
      content?.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean) ?? [];
    if (words.length === 0) return 'Laporan sedang dibuat';
    const headline = words.slice(0, 6).join(' ');
    return words.length > 6 ? `${headline}…` : headline;
  }

  private serializeJaringReportSession(
    session: JaringReportSessionRecord,
    korwilLookup?: KorwilLookup | null,
  ) {
    const submittedMessage = session.submittedMessage;
    const baket = submittedMessage?.convertedBaket ?? null;
    const latestVersion = baket?.versions[0] ?? null;
    const latitude =
      session.latitude === null ? null : Number(session.latitude);
    const longitude =
      session.longitude === null ? null : Number(session.longitude);
    const processStatus = this.jaringReportProcessStatus(session);
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
        kind:
          item.mediaType === FileType.VIDEO
            ? ('VIDEO' as const)
            : ('IMAGE' as const),
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

    const activeCaretakerAssignment =
      session.jaring?.caretakerAssignments?.[0]?.fieldOfficerAssignment;
    const activeCaretaker = activeCaretakerAssignment?.userProfile;
    const gaswilName =
      activeCaretaker?.fullName ?? activeCaretaker?.username ?? null;
    const primaryCoverage =
      session.jaring?.areaCoverages.find((coverage) => coverage.isPrimary) ??
      session.jaring?.areaCoverages[0] ??
      null;

    const korwil = korwilLookup
      ? this.resolveKorwilForSession(session, korwilLookup)
      : null;
    const regencyArea = (() => {
      let curr: any =
        primaryCoverage?.area ?? session.submittedMessage?.resolvedArea;
      while (curr) {
        if (curr.level === 'REGENCY' || curr.level === 'CITY') return curr;
        curr = curr.parent;
      }
      return null;
    })();
    const korwilName =
      session.korwilReadByUserProfile?.fullName ??
      session.korwilReadByUserProfile?.username ??
      korwil?.name ??
      (regencyArea?.name ? `Korwil ${regencyArea.name}` : null);

    return {
      id: session.id,
      reportSessionId: session.id,
      jaringId: session.jaringId,
      jaringAlias:
        session.jaring?.aliasName ?? session.jaring?.fullName ?? null,
      jaringFullName: session.jaring?.fullName ?? null,
      jaringCode:
        session.jaring?.aliasName ?? session.jaring?.id ?? session.jaringId,
      jaringWhatsAppNumber: session.jaring?.whatsappNumber ?? null,
      jaringProfilePhotoFileId: session.jaring?.profilePhotoFileId ?? null,
      gaswilName,
      gaswilAssignmentId: activeCaretakerAssignment?.id ?? null,
      gaswilUserProfileId: activeCaretaker?.id ?? null,
      korwilName,
      korwilAssignmentId: korwil?.assignmentId ?? null,
      korwilUserProfileId: korwil?.id ?? null,
      placementArea: primaryCoverage?.area ?? null,
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
      processStatus,
      displayStatus: processStatus,
      // Deprecated compatibility alias. New UI/API consumers should use processStatus.
      verificationStatus: processStatus,
      canFillMetadata:
        processStatus === 'READY_FOR_BAKET' ||
        processStatus === 'BAKET_CREATED',
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
      readAt: session.gaswilReadAt ?? session.readAt ?? null,
      readByUserProfileId:
        session.gaswilReadByUserProfileId ??
        session.readByUserProfileId ??
        null,
      readByName:
        session.gaswilReadByUserProfile?.fullName ??
        session.gaswilReadByUserProfile?.username ??
        session.readByUserProfile?.fullName ??
        session.readByUserProfile?.username ??
        null,
      isRead: Boolean(session.gaswilReadAt || session.readAt),
      readStatus:
        session.gaswilReadAt || session.readAt
          ? 'SUDAH_DIBACA'
          : 'BELUM_DIBACA',
      fieldOfficerReadAt: session.gaswilReadAt ?? session.readAt ?? null,
      isReadByFieldOfficer: Boolean(session.gaswilReadAt || session.readAt),
      gaswilReadAt: session.gaswilReadAt ?? null,
      gaswilReadByUserProfileId: session.gaswilReadByUserProfileId ?? null,
      gaswilReadByName:
        session.gaswilReadByUserProfile?.fullName ??
        session.gaswilReadByUserProfile?.username ??
        gaswilName,
      gaswilReadStatus: session.gaswilReadAt ? 'SUDAH_DIBACA' : 'BELUM_DIBACA',
      korwilReadAt: session.korwilReadAt ?? null,
      korwilReadByUserProfileId: session.korwilReadByUserProfileId ?? null,
      korwilReadByName:
        session.korwilReadByUserProfile?.fullName ??
        session.korwilReadByUserProfile?.username ??
        korwilName,
      korwilReadStatus: session.korwilReadAt ? 'SUDAH_DIBACA' : 'BELUM_DIBACA',
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
      reportCategory: baket?.reportCategory ?? null,
      urgency: latestVersion?.urgency ?? null,
      locationSuitabilityStatus:
        latestVersion?.coverageValidationStatus ??
        CoverageValidationStatus.NOT_CHECKED,
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
    const primaryCoverage =
      report.jaring.areaCoverages.find((coverage) => coverage.isPrimary) ??
      report.jaring.areaCoverages[0] ??
      null;

    return {
      id: report.id,
      jaringId: report.jaringId,
      title: report.title,
      content: report.content,
      reportedAt: report.reportedAt,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      jaringCode: report.jaring.aliasName ?? report.jaring.id,
      jaringAlias:
        report.jaring.aliasName ?? report.jaring.fullName ?? report.jaring.id,
      jaringName:
        report.jaring.fullName ?? report.jaring.aliasName ?? report.jaring.id,
      jaringWhatsAppNumber: report.jaring.whatsappNumber,
      jaringProfilePhotoFileId: report.jaring.profilePhotoFileId,
      assignedArea: primaryCoverage?.area ?? null,
      areaCoverages: report.jaring.areaCoverages,
      fieldOfficer: {
        assignmentId: report.fieldOfficerAssignmentId,
        role: report.fieldOfficerAssignment.role,
        userProfile: report.fieldOfficerAssignment.userProfile,
      },
      attachments: report.attachments.map((attachment) => ({
        fileId: attachment.fileId,
        caption: attachment.caption,
        fileName: attachment.file.originalName,
        mimeType: attachment.file.mimeType,
      })),
    };
  }

  private async summarizeReportSessions(
    where: Prisma.WhatsAppReportSessionWhereInput,
  ) {
    const [totalJaringReports, baketReports, reportingJaringGroups] =
      await Promise.all([
        this.prisma.whatsAppReportSession.count({ where }),
        this.prisma.whatsAppReportSession.count({
          where: {
            AND: [
              where,
              {
                submittedMessage: {
                  is: {
                    convertedBaketId: { not: null },
                  },
                },
              },
            ],
          },
        }),
        this.prisma.whatsAppReportSession.groupBy({
          by: ['jaringId'],
          where,
        }),
      ]);

    return {
      totalSessions: totalJaringReports,
      totalJaringReports,
      baketReports,
      reportingJaringCount: reportingJaringGroups.length,
    };
  }

  private completeReportMessageWhere(): Prisma.WhatsAppMessageWhereInput {
    return {
      content: { not: null },
      senderPhone: { not: '' },
      jaringId: { not: null },
      latitude: { not: null },
      longitude: { not: null },
      resolvedAreaId: { not: null },
      OR: [
        { media: { some: {} } },
        {
          rawPayload: {
            path: ['photoMessageId'],
            not: Prisma.AnyNull,
          },
        },
      ],
    };
  }

  private reportOrderBy(
    query: JaringReportQuery,
  ): Prisma.WhatsAppReportSessionOrderByWithRelationInput[] {
    const direction = query.sortOrder ?? 'desc';
    switch (query.sortBy ?? 'reportedAt') {
      case 'createdAt':
        return [{ createdAt: direction }, { id: direction }];
      case 'updatedAt':
        return [
          { updatedAt: direction },
          { createdAt: 'desc' },
          { id: 'desc' },
        ];
      case 'referenceNumber':
        return [
          { referenceNumber: { sort: direction, nulls: 'last' } },
          { submittedAt: { sort: 'desc', nulls: 'last' } },
          { startedAt: 'desc' },
          { id: 'desc' },
        ];
      default:
        return [
          { submittedAt: { sort: direction, nulls: 'last' } },
          { startedAt: direction },
          { createdAt: direction },
          { id: direction },
        ];
    }
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

  private async scopedJaringAreaWhere(
    scope: { areaRootIds: string[] },
    context?: AuthorizationContext,
  ): Promise<Prisma.JaringWhereInput> {
    const isNationalSupervision =
      context &&
      (context.authRole === SYSTEM_ROLES.EXECUTIVE ||
        context.authRole === SYSTEM_ROLES.NATIONAL_LEADER ||
        context.authRole === SYSTEM_ROLES.ADMIN_SYSTEM ||
        (context.areaScopes?.some((s) => s.level === 'COUNTRY') ?? false));

    if (isNationalSupervision || scope.areaRootIds.length === 0) {
      return {};
    }

    const scopedAreaIds = await resolveDescendantAreaIds(
      this.prisma,
      scope.areaRootIds,
    );

    return {
      areaCoverages: {
        some: {
          validUntil: null,
          areaId: { in: scopedAreaIds },
        },
      },
    };
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
    const isNationalSupervision =
      context.authRole === SYSTEM_ROLES.EXECUTIVE ||
      context.authRole === SYSTEM_ROLES.NATIONAL_LEADER ||
      context.authRole === SYSTEM_ROLES.ADMIN_SYSTEM ||
      (context.areaScopes?.some((s) => s.level === 'COUNTRY') ?? false);
    const page = query.page ?? 1;
    const search = query.search?.trim();
    const phoneSearchVariants = search
      ? getIndonesianPhoneSearchVariants(search)
      : [];

    const [scopedAreaWhere, filterAreaIds, matchedAreaIds] = await Promise.all([
      this.scopedJaringAreaWhere(scope, context),
      query.areaId && this.prisma.administrativeAreaClosure
        ? this.prisma.administrativeAreaClosure
            .findMany({
              where: { ancestorId: query.areaId },
              select: { descendantId: true },
            })
            .then((closures) =>
              Array.from(
                new Set([
                  query.areaId as string,
                  ...closures.map((c) => c.descendantId),
                ]),
              ),
            )
        : Promise.resolve(null),
      search && search.length >= 2 && this.prisma.administrativeArea
        ? this.prisma.administrativeArea
            .findMany({
              where: { name: { contains: search, mode: 'insensitive' } },
              select: { id: true },
              take: 50,
            })
            .then(async (matchedAreas) => {
              if (
                matchedAreas.length === 0 ||
                !this.prisma.administrativeAreaClosure
              )
                return [];
              const rawIds = matchedAreas.map((a) => a.id);
              const closures =
                await this.prisma.administrativeAreaClosure.findMany({
                  where: { ancestorId: { in: rawIds } },
                  select: { descendantId: true },
                });
              return Array.from(
                new Set([...rawIds, ...closures.map((c) => c.descendantId)]),
              );
            })
        : Promise.resolve([]),
    ]);

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);

    const baseWhere: Prisma.JaringWhereInput = {
      deletedAt: null,
      AND: [
        scopedAreaWhere,
        ...(filterAreaIds
          ? [
              {
                areaCoverages: {
                  some: {
                    validUntil: null,
                    areaId: { in: filterAreaIds },
                  },
                },
              } satisfies Prisma.JaringWhereInput,
            ]
          : []),
        ...(search
          ? [
              {
                OR: [
                  { aliasName: { contains: search, mode: 'insensitive' } },
                  { fullName: { contains: search, mode: 'insensitive' } },
                  { address: { contains: search, mode: 'insensitive' } },
                  ...phoneSearchVariants.map((phone) => ({
                    whatsappNumber: { contains: phone },
                  })),
                  {
                    caretakerAssignments: {
                      some: {
                        isActive: true,
                        fieldOfficerAssignment: {
                          userProfile: {
                            OR: [
                              {
                                fullName: {
                                  contains: search,
                                  mode: 'insensitive',
                                },
                              },
                              {
                                username: {
                                  contains: search,
                                  mode: 'insensitive',
                                },
                              },
                            ],
                          },
                        },
                      },
                    },
                  },
                  ...(matchedAreaIds.length > 0
                    ? [
                        {
                          areaCoverages: {
                            some: {
                              validUntil: null,
                              areaId: { in: matchedAreaIds },
                            },
                          },
                        },
                      ]
                    : []),
                ],
              } satisfies Prisma.JaringWhereInput,
            ]
          : []),
      ],
      ...(isFieldCoordinator && scope.areaRootIds.length === 0
        ? { id: { in: [] } }
        : {}),
      ...(query.fieldOfficerAssignmentId
        ? {
            caretakerAssignments: {
              some: {
                fieldOfficerAssignmentId: query.fieldOfficerAssignmentId,
                isActive: true,
                OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
              },
            },
          }
        : isNationalSupervision
          ? {}
          : {
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
                  OR: [
                    { validUntil: null },
                    { validUntil: { gt: new Date() } },
                  ],
                },
              },
            }),
      ...(query.occupationId ? { occupationId: query.occupationId } : {}),
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
    };
    const where: Prisma.JaringWhereInput = {
      ...baseWhere,
      ...(query.registrationStatus
        ? { registrationStatus: query.registrationStatus }
        : isFieldOfficer
          ? {}
          : { registrationStatus: JaringRegistrationStatus.APPROVED }),
    };
    const items = await this.prisma.jaring.findMany({
      where,
      ...(page > 1 ? { skip: (page - 1) * query.limit } : {}),
      take: query.limit,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        aliasName: true,
        whatsappNumber: true,
        fullName: true,
        nationalIdNumber: true,
        address: true,
        birthPlace: true,
        birthDate: true,
        gender: true,
        occupationId: true,
        profilePhotoFileId: true,
        workplace: true,
        jobTitle: true,
        joinedAt: true,
        organizationName: true,
        politicalAffiliation: true,
        status: true,
        registrationStatus: true,
        rejectionReason: true,
        reviewedAt: true,
        reviewedByAssignmentId: true,
        createdByAssignmentId: true,
        notes: true,
        registeredAt: true,
        deactivatedAt: true,
        createdAt: true,
        updatedAt: true,
        occupation: {
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
            isActive: true,
          },
        },
        profilePhotoFile: { select: { id: true } },
        caretakerAssignments: {
          where: { isActive: true, validUntil: null },
          select: {
            id: true,
            fieldOfficerAssignmentId: true,
            isActive: true,
            validFrom: true,
            validUntil: true,
            transferReason: true,
            fieldOfficerAssignment: {
              select: {
                id: true,
                userProfile: { select: { id: true, fullName: true } },
              },
            },
          },
        },
        areaCoverages: {
          where: { validUntil: null },
          select: {
            id: true,
            areaId: true,
            isPrimary: true,
            validFrom: true,
            validUntil: true,
            area: {
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
          },
        },
        _count: {
          select: {
            messages: true,
            reportSessions: true,
            coachingReports: true,
            primaryBakets: true,
          },
        },
        messages: {
          take: 1,
          orderBy: { receivedAt: 'desc' },
          select: {
            id: true,
            receivedAt: true,
          },
        },
        reportSessions: {
          take: 1,
          orderBy: { lastActivityAt: 'desc' },
          select: {
            id: true,
            latitude: true,
            longitude: true,
            submittedAt: true,
          },
        },
        coachingReports: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            reportedAt: true,
          },
        },
      },
    });

    const mappedItems = items.map((item: (typeof items)[number]) => {
      const { lastReportAt, computedStatus } =
        this.calculateJaringReportActivity(item);
      return {
        ...item,
        lastReportAt,
        status: computedStatus,
      };
    });
    if (!query.paginated) return mappedItems;

    const summaryWhere: Prisma.JaringWhereInput = {
      ...baseWhere,
      ...(query.registrationStatus
        ? { registrationStatus: query.registrationStatus }
        : isFieldOfficer
          ? {}
          : { registrationStatus: JaringRegistrationStatus.APPROVED }),
    };
    const [total, registrationGroups] = await Promise.all([
      this.prisma.jaring.count({ where }),
      this.prisma.jaring.groupBy({
        by: ['registrationStatus'],
        where: summaryWhere,
        _count: { _all: true },
      }),
    ]);
    const registrationCounts = new Map(
      registrationGroups.map((group: (typeof registrationGroups)[number]) => [
        group.registrationStatus,
        group._count._all,
      ]),
    );
    const summaryTotal = registrationGroups.reduce(
      (sum: number, group: (typeof registrationGroups)[number]) =>
        sum + group._count._all,
      0,
    );
    return {
      items: mappedItems,
      pagination: {
        page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
      summary: {
        total: summaryTotal,
        pending: registrationCounts.get(JaringRegistrationStatus.PENDING) ?? 0,
        approved:
          registrationCounts.get(JaringRegistrationStatus.APPROVED) ?? 0,
        rejected:
          registrationCounts.get(JaringRegistrationStatus.REJECTED) ?? 0,
        suspended:
          registrationCounts.get(JaringRegistrationStatus.SUSPENDED) ?? 0,
      },
    };
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
        'Jaring hanya dapat didaftarkan untuk akun Petugas Wilayah (Gaswil) yang sedang aktif.',
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
        'Wilayah Jaring harus berupa satu Kelurahan/Desa aktif di bawah cakupan Petugas Wilayah (Gaswil).',
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
          `Nomor WhatsApp sama dengan Jaring terdaftar ${existingLabel} di bawah Petugas Wilayah (Gaswil) lain.`,
          409,
        );
      }

      throw new ApiException(
        'JARING_WHATSAPP_DUPLICATE',
        `Nomor WhatsApp sama dengan Jaring terdaftar ${existingLabel} di bawah Petugas Wilayah (Gaswil) ini.`,
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
        'Penanggung jawab Jaring harus Petugas Wilayah (Gaswil) aktif.',
        422,
      );
    }
    await this.ensureProfilePhoto(body.profilePhotoFileId, context);
    const aliasName = await this.generateAliasName(areaIds);
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

  async suspend(
    id: string,
    body: SuspendJaringDto,
    context: AuthorizationContext,
  ) {
    if (context.authRole !== 'executive') {
      throw new ApiException(
        'FORBIDDEN',
        'Hanya role Deputi II yang memiliki kewenangan untuk menangguhkan Jaring.',
        403,
      );
    }
    await this.domainScope.assertJaring(context, id);
    const existing = await this.prisma.jaring.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        registrationStatus: true,
        status: true,
      },
    });
    if (existing.registrationStatus === JaringRegistrationStatus.SUSPENDED) {
      throw new ApiException(
        'JARING_ALREADY_SUSPENDED',
        'Jaring ini sudah dalam status ditangguhkan.',
        409,
      );
    }
    const reason = body.reason.trim();
    await this.prisma.jaring.update({
      where: { id },
      data: {
        registrationStatus: JaringRegistrationStatus.SUSPENDED,
        status: JaringStatus.INACTIVE,
        deactivatedAt: new Date(),
        rejectionReason: reason,
        reviewedAt: new Date(),
        reviewedByAssignmentId: context.primaryAssignmentId,
      },
    });
    await this.audit(context, 'JARING.SUSPEND', id, {
      reason,
      previousRegistrationStatus: existing.registrationStatus,
      previousStatus: existing.status,
    });
    return this.detail(id);
  }

  async unsuspend(
    id: string,
    body: UnsuspendJaringDto,
    context: AuthorizationContext,
  ) {
    if (context.authRole !== 'executive') {
      throw new ApiException(
        'FORBIDDEN',
        'Hanya role Deputi II yang memiliki kewenangan untuk membatalkan penangguhan Jaring.',
        403,
      );
    }
    await this.domainScope.assertJaring(context, id);
    const existing = await this.prisma.jaring.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        registrationStatus: true,
        whatsappNumber: true,
        nationalIdNumber: true,
      },
    });
    if (existing.registrationStatus !== JaringRegistrationStatus.SUSPENDED) {
      throw new ApiException(
        'JARING_NOT_SUSPENDED',
        'Jaring ini tidak dalam status ditangguhkan.',
        409,
      );
    }
    this.assertNoActiveWhatsappConflict(
      await this.findActiveWhatsappConflict(existing.whatsappNumber, id),
    );
    this.assertNoNationalIdConflict(
      await this.findNationalIdConflict(existing.nationalIdNumber, id),
    );
    const reason = body.reason?.trim() || null;
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
    await this.audit(context, 'JARING.UNSUSPEND', id, {
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
    await this.prisma.jaring.findUniqueOrThrow({
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
          'Wilayah Jaring harus berupa satu Kelurahan/Desa aktif di bawah cakupan Petugas Wilayah (Gaswil).',
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
    return this.cache.getOrSet(
      {
        namespace: 'jaring-occupations',
        identity: query,
        ttlMs: 30 * 60_000,
      },
      () =>
        this.prisma.jaringOccupation.findMany({
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
        }),
    );
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
    await this.cache.invalidate('jaring-occupations');
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
    await this.cache.invalidate('jaring-occupations');
    return occupation;
  }

  async listReportCategories(query: ReportCategoryQuery) {
    return this.cache.getOrSet(
      {
        namespace: 'report-categories',
        identity: query,
        ttlMs: 30 * 60_000,
      },
      async () =>
        sortReportCategories(
          await this.prisma.reportCategory.findMany({
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
          }),
        ),
    );
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
        'Kode atau nama kategori Baket sudah digunakan.',
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
    await this.cache.invalidate('report-categories');
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
          'Kode atau nama kategori Baket sudah digunakan.',
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
    await this.cache.invalidate('report-categories');
    return category;
  }

  activate(_id: string, _body: ReasonDto, _context: AuthorizationContext) {
    throw new ApiException(
      'JARING_STATUS_AUTOMATIC',
      'Status aktif/tidak aktif Jaring diatur secara otomatis berdasarkan aktivitas pelaporan 90 hari terakhir.',
      400,
    );
  }

  deactivate(_id: string, _body: ReasonDto, _context: AuthorizationContext) {
    throw new ApiException(
      'JARING_STATUS_AUTOMATIC',
      'Status aktif/tidak aktif Jaring diatur secara otomatis berdasarkan aktivitas pelaporan 90 hari terakhir.',
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

  async coachingReports(
    id: string,
    query: JaringCoachingReportQuery,
    context: AuthorizationContext,
  ) {
    await this.domainScope.assertJaring(context, id);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const fromDate = query.from ? new Date(query.from) : undefined;
    const toDate = query.to ? new Date(query.to) : undefined;
    const search = query.search?.trim();
    const where: Prisma.JaringCoachingReportWhereInput = {
      jaringId: id,
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { content: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(fromDate || toDate
        ? {
            createdAt: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }
        : {}),
    };
    const sortOrder = query.sortOrder ?? 'desc';
    const sortBy = query.sortBy ?? 'createdAt';
    const currentMonth = this.currentWibMonthRange();
    const [reports, total, groupedJaring, thisMonthCount] = await Promise.all([
      this.prisma.jaringCoachingReport.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { [sortBy]: sortOrder },
          ...(sortBy === 'createdAt' ? [] : [{ createdAt: 'desc' as const }]),
          { id: 'desc' },
        ],
        select: jaringCoachingReportSelect,
      }),
      this.prisma.jaringCoachingReport.count({ where }),
      this.prisma.jaringCoachingReport.groupBy({
        by: ['jaringId'],
        where,
      }),
      this.prisma.jaringCoachingReport.count({
        where: {
          AND: [
            where,
            {
              createdAt: {
                gte: currentMonth.from,
                lt: currentMonth.to,
              },
            },
          ],
        },
      }),
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
      summary: {
        total,
        uniqueJaringCount: groupedJaring.length,
        thisMonthCount,
      },
    };
  }

  async allCoachingReports(
    query: JaringCoachingReportQuery,
    context: AuthorizationContext,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const fromDate = query.from ? new Date(query.from) : undefined;
    const toDate = query.to ? new Date(query.to) : undefined;
    const search = query.search?.trim();
    const phoneSearchVariants = search
      ? getIndonesianPhoneSearchVariants(search)
      : [];
    const sortOrder = query.sortOrder ?? 'desc';
    const sortBy = query.sortBy ?? 'createdAt';
    if (query.areaId) {
      await this.domainScope.assertArea(context, query.areaId);
    }
    const scopedJaringWhere = await this.domainScope.jaringWhere(context);
    const isFieldOfficer = context.authRole === SYSTEM_ROLES.FIELD_OFFICER;

    const [filterAreaIds, matchedSearchAreaIds] = await Promise.all([
      query.areaId
        ? resolveDescendantAreaIds(this.prisma, query.areaId)
        : Promise.resolve(null),
      search && search.length >= 2 && this.prisma.administrativeArea
        ? this.prisma.administrativeArea
            .findMany({
              where: { name: { contains: search, mode: 'insensitive' } },
              select: { id: true },
              take: 50,
            })
            .then(async (matchedAreas) => {
              if (matchedAreas.length === 0) return [];
              return resolveDescendantAreaIds(
                this.prisma,
                matchedAreas.map((a) => a.id),
              );
            })
        : Promise.resolve([]),
    ]);

    const jaringWhere: Prisma.JaringWhereInput = {
      AND: [
        scopedJaringWhere,
        ...(query.jaringId ? [{ id: query.jaringId }] : []),
        ...(filterAreaIds
          ? [
              {
                areaCoverages: {
                  some: { validUntil: null, areaId: { in: filterAreaIds } },
                },
              },
            ]
          : []),
      ],
    };
    const where: Prisma.JaringCoachingReportWhereInput = {
      jaring: jaringWhere,
      ...(isFieldOfficer
        ? { fieldOfficerAssignmentId: context.primaryAssignmentId }
        : query.fieldOfficerAssignmentId
          ? { fieldOfficerAssignmentId: query.fieldOfficerAssignmentId }
          : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { content: { contains: search, mode: 'insensitive' } },
              {
                jaring: {
                  OR: [
                    { aliasName: { contains: search, mode: 'insensitive' } },
                    { fullName: { contains: search, mode: 'insensitive' } },
                    ...phoneSearchVariants.map((phone) => ({
                      whatsappNumber: { contains: phone },
                    })),
                    ...(matchedSearchAreaIds.length > 0
                      ? [
                          {
                            areaCoverages: {
                              some: {
                                validUntil: null,
                                areaId: { in: matchedSearchAreaIds },
                              },
                            },
                          },
                        ]
                      : []),
                  ],
                },
              },
              {
                fieldOfficerAssignment: {
                  userProfile: {
                    OR: [
                      { fullName: { contains: search, mode: 'insensitive' } },
                      { username: { contains: search, mode: 'insensitive' } },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
      ...(fromDate || toDate
        ? {
            createdAt: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }
        : {}),
    };

    const currentMonth = this.currentWibMonthRange();
    const [
      reports,
      total,
      groupedJaring,
      thisMonthCount,
      filterJaring,
      configSetting,
    ] = await Promise.all([
      this.prisma.jaringCoachingReport.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { [sortBy]: sortOrder },
          ...(sortBy === 'createdAt' ? [] : [{ createdAt: 'desc' as const }]),
          { id: 'desc' },
        ],
        select: jaringCoachingReportSelect,
      }),
      this.prisma.jaringCoachingReport.count({ where }),
      this.prisma.jaringCoachingReport.groupBy({
        by: ['jaringId'],
        where,
      }),
      this.prisma.jaringCoachingReport.count({
        where: {
          AND: [
            where,
            {
              createdAt: {
                gte: currentMonth.from,
                lt: currentMonth.to,
              },
            },
          ],
        },
      }),
      this.prisma.jaring.findMany({
        where: scopedJaringWhere,
        orderBy: [{ aliasName: 'asc' }, { fullName: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          aliasName: true,
          fullName: true,
          registrationStatus: true,
          caretakerAssignments: {
            where: {
              isActive: true,
              OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
            },
            take: 1,
            select: {
              id: true,
              fieldOfficerAssignmentId: true,
              isActive: true,
              validFrom: true,
              validUntil: true,
              fieldOfficerAssignment: {
                select: {
                  id: true,
                  userProfile: {
                    select: { id: true, fullName: true },
                  },
                },
              },
            },
          },
          areaCoverages: {
            where: { validUntil: null },
            orderBy: [{ isPrimary: 'desc' }, { validFrom: 'desc' }],
            select: {
              id: true,
              areaId: true,
              isPrimary: true,
              validFrom: true,
              validUntil: true,
              area: { select: areaSelectWithParents },
            },
          },
        },
      }),
      this.prisma.systemSetting?.findUnique
        ? this.prisma.systemSetting.findUnique({
            where: { key: 'features.coaching_report.enabled' },
          })
        : Promise.resolve(null),
    ]);

    const isCreationEnabled = configSetting?.value === false ? false : true;

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
      summary: {
        total,
        uniqueJaringCount: groupedJaring.length,
        thisMonthCount,
      },
      isCreationEnabled,
      filterOptions: {
        jaring: filterJaring,
      },
      scope: this.domainScope.scopeSummary(context),
    };
  }

  async getCoachingReportConfig() {
    const config = this.prisma.systemSetting?.findUnique
      ? await this.prisma.systemSetting.findUnique({
          where: { key: 'features.coaching_report.enabled' },
        })
      : null;
    return {
      enabled: config?.value === false ? false : true,
    };
  }

  async createCoachingReport(
    id: string,
    body: CreateJaringCoachingReportDto,
    context: AuthorizationContext,
  ) {
    const config = this.prisma.systemSetting?.findUnique
      ? await this.prisma.systemSetting.findUnique({
          where: { key: 'features.coaching_report.enabled' },
        })
      : null;
    if (config?.value === false) {
      throw new ApiException(
        'JARING_COACHING_REPORT_DISABLED',
        'Fitur pembuatan laporan pembinaan Jaring sedang dinonaktifkan oleh Admin Sistem.',
        403,
      );
    }

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
        'JARING_REGISTRATION_NOT_APPROVED',
        'Laporan pembinaan hanya dapat dibuat untuk Jaring dengan registrasi disetujui.',
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

    const reportedAt = new Date();

    const attachmentFileIds = [...new Set(body.attachmentFileIds ?? [])];
    if (attachmentFileIds.length > 0) {
      const usableAttachments = await this.prisma.fileAsset.findMany({
        where: {
          id: { in: attachmentFileIds },
          fileType: FileType.PHOTO,
          createdByAssignmentId: context.primaryAssignmentId,
          lifecycleStatus: {
            in: [
              FileLifecycleStatus.UPLOADED,
              FileLifecycleStatus.SCANNING,
              FileLifecycleStatus.CLEAN,
            ],
          },
          deletedAt: null,
        },
        select: { id: true },
      });

      if (usableAttachments.length !== attachmentFileIds.length) {
        throw new ApiException(
          'JARING_COACHING_ATTACHMENT_INVALID',
          'Lampiran foto tidak valid, bukan milik Anda, atau belum selesai diunggah.',
          422,
        );
      }
    }

    const report = await this.prisma.$transaction(async (tx) => {
      const created = await tx.jaringCoachingReport.create({
        data: {
          jaringId: id,
          fieldOfficerAssignmentId: context.primaryAssignmentId,
          title,
          content,
          reportedAt,
          ...(attachmentFileIds.length > 0
            ? {
                attachments: {
                  create: attachmentFileIds.map((fileId) => ({ fileId })),
                },
              }
            : {}),
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
            attachmentCount: attachmentFileIds.length,
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
    await Promise.all(
      [query.areaId, query.jaringAreaId]
        .filter((areaId): areaId is string => Boolean(areaId))
        .map((areaId) => this.domainScope.assertArea(context, areaId)),
    );

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const jaringWhere = await this.domainScope.jaringWhere(context);
    const fromDate = query.from ? new Date(query.from) : undefined;
    const toDate = query.to ? new Date(query.to) : undefined;
    const search = query.search?.trim();
    const phoneSearchVariants = search
      ? getIndonesianPhoneSearchVariants(search)
      : [];

    const baseJaringWhere: Prisma.JaringWhereInput = {
      ...jaringWhere,
      ...(query.jaringId ? { id: query.jaringId } : {}),
      ...(query.registrationStatus
        ? { registrationStatus: query.registrationStatus }
        : {}),
    };

    const [filterReportAreaIds, filterJaringAreaIds, matchedSearchAreaIds] =
      await Promise.all([
        query.areaId
          ? resolveDescendantAreaIds(this.prisma, query.areaId)
          : Promise.resolve(null),
        query.jaringAreaId
          ? resolveDescendantAreaIds(this.prisma, query.jaringAreaId)
          : Promise.resolve(null),
        search && search.length >= 2 && this.prisma.administrativeArea
          ? this.prisma.administrativeArea
              .findMany({
                where: { name: { contains: search, mode: 'insensitive' } },
                select: { id: true },
                take: 50,
              })
              .then(async (matchedAreas) => {
                if (matchedAreas.length === 0) return [];
                return resolveDescendantAreaIds(
                  this.prisma,
                  matchedAreas.map((a) => a.id),
                );
              })
          : Promise.resolve([]),
      ]);

    const filters: Prisma.WhatsAppReportSessionWhereInput[] = [
      { jaring: baseJaringWhere },
    ];
    if (query.status) filters.push({ status: query.status });
    if (fromDate || toDate) {
      filters.push({
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
      });
    }
    if (search) {
      filters.push({
        OR: [
          { referenceNumber: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
          {
            jaring: {
              OR: [
                { aliasName: { contains: search, mode: 'insensitive' } },
                { fullName: { contains: search, mode: 'insensitive' } },
                ...phoneSearchVariants.map((phone) => ({
                  whatsappNumber: { contains: phone },
                })),
                {
                  caretakerAssignments: {
                    some: {
                      isActive: true,
                      fieldOfficerAssignment: {
                        userProfile: {
                          OR: [
                            {
                              fullName: {
                                contains: search,
                                mode: 'insensitive',
                              },
                            },
                            {
                              username: {
                                contains: search,
                                mode: 'insensitive',
                              },
                            },
                          ],
                        },
                      },
                    },
                  },
                },
                ...(matchedSearchAreaIds.length > 0
                  ? [
                      {
                        areaCoverages: {
                          some: {
                            validUntil: null,
                            areaId: { in: matchedSearchAreaIds },
                          },
                        },
                      },
                    ]
                  : []),
              ],
            },
          },
          {
            submittedMessage: {
              is: {
                OR: [
                  { content: { contains: search, mode: 'insensitive' } },
                  {
                    referenceNumber: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                  ...(matchedSearchAreaIds.length > 0
                    ? [
                        {
                          resolvedAreaId: { in: matchedSearchAreaIds },
                        },
                      ]
                    : []),
                ],
              },
            },
          },
        ],
      });
    }
    if (query.categoryId) {
      filters.push({
        submittedMessage: {
          is: {
            convertedBaket: {
              is: { reportCategoryId: query.categoryId },
            },
          },
        },
      });
    }
    if (filterReportAreaIds) {
      filters.push({
        submittedMessage: {
          is: {
            resolvedAreaId: { in: filterReportAreaIds },
          },
        },
      });
    }
    if (filterJaringAreaIds) {
      filters.push({
        jaring: {
          ...baseJaringWhere,
          areaCoverages: {
            some: {
              validUntil: null,
              areaId: { in: filterJaringAreaIds },
            },
          },
        },
      });
    }
    if (query.fieldOfficerAssignmentId) {
      filters.push({
        fieldOfficerAssignmentId: query.fieldOfficerAssignmentId,
      });
    }
    if (query.workflowStatus) {
      filters.push({
        submittedMessage: {
          is: {
            convertedBaket: { is: { status: query.workflowStatus } },
          },
        },
      });
    }
    if (query.coordinateSource) {
      filters.push({
        submittedMessage: { is: { coordinateSource: query.coordinateSource } },
      });
    }
    if (query.urgency) {
      filters.push({
        submittedMessage: {
          is: {
            convertedBaket: {
              is: { versions: { some: { urgency: query.urgency } } },
            },
          },
        },
      });
    }
    if (query.hasAttachment === 'true') {
      filters.push({ media: { some: { deletedAt: null } } });
    } else if (query.hasAttachment === 'false') {
      filters.push({ media: { none: { deletedAt: null } } });
    }
    if (query.locationSuitability) {
      const outsideStatuses = [
        CoverageValidationStatus.OUTSIDE_JARING_SCOPE,
        CoverageValidationStatus.OUTSIDE_FIELD_OFFICER_SCOPE,
        CoverageValidationStatus.OUTSIDE_FIELD_COORDINATOR_SCOPE,
        CoverageValidationStatus.OUTSIDE_UNIT_SCOPE,
      ];
      const coverageStatusWhere: Prisma.BaketVersionWhereInput =
        query.locationSuitability === 'WITHIN_SCOPE'
          ? { coverageValidationStatus: CoverageValidationStatus.WITHIN_SCOPE }
          : query.locationSuitability === 'BORDER_AMBIGUOUS'
            ? {
                coverageValidationStatus:
                  CoverageValidationStatus.BORDER_AMBIGUOUS,
              }
            : query.locationSuitability === 'OUTSIDE_SCOPE'
              ? { coverageValidationStatus: { in: outsideStatuses } }
              : {
                  coverageValidationStatus:
                    CoverageValidationStatus.NOT_CHECKED,
                };
      filters.push(
        query.locationSuitability === 'NOT_DETERMINED'
          ? {
              OR: [
                { submittedMessage: { is: null } },
                {
                  submittedMessage: {
                    is: { convertedBaketId: null },
                  },
                },
                {
                  submittedMessage: {
                    is: {
                      convertedBaket: {
                        is: { versions: { some: coverageStatusWhere } },
                      },
                    },
                  },
                },
              ],
            }
          : {
              submittedMessage: {
                is: {
                  convertedBaket: {
                    is: { versions: { some: coverageStatusWhere } },
                  },
                },
              },
            },
      );
    }
    if (query.stage === 'JARING_REPORT') {
      filters.push({
        submittedMessage: { is: { convertedBaketId: null } },
      });
    } else if (query.stage === 'DRAFT_BAKET') {
      filters.push({
        submittedMessage: {
          is: {
            convertedBaket: {
              is: { status: { not: BaketStatus.VERIFIED } },
            },
          },
        },
      });
    } else if (query.stage === 'VALIDATED_BAKET') {
      filters.push({
        submittedMessage: {
          is: {
            convertedBaket: { is: { status: BaketStatus.VERIFIED } },
          },
        },
      });
    }
    const where: Prisma.WhatsAppReportSessionWhereInput = { AND: filters };
    const summaryWhere: Prisma.WhatsAppReportSessionWhereInput = {
      AND: [...filters],
    };

    const [sessions, total, statusCounts, summary, korwilLookup] =
      await Promise.all([
        this.prisma.whatsAppReportSession.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: this.reportOrderBy(query),
          select: jaringReportSessionSelect,
        }),
        this.prisma.whatsAppReportSession.count({ where }),
        this.prisma.whatsAppReportSession.groupBy({
          by: ['status'],
          where,
          _count: { _all: true },
        }),
        this.summarizeReportSessions(summaryWhere),
        this.getKorwilLookup(),
      ]);

    return {
      items: (sessions as JaringReportSessionRecord[]).map((session) =>
        this.serializeJaringReportSession(session, korwilLookup),
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      facets: {
        status: Object.fromEntries(
          (statusCounts as JaringReportStatusCount[]).map((item) => [
            item.status,
            item._count._all,
          ]),
        ),
      },
      summary,
      scope: this.domainScope.scopeSummary(context),
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

    const [sessions, total, statusCounts, korwilLookup] = await Promise.all([
      this.prisma.whatsAppReportSession.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: this.reportOrderBy(query),
        select: jaringReportSessionSelect,
      }),
      this.prisma.whatsAppReportSession.count({ where }),
      this.prisma.whatsAppReportSession.groupBy({
        by: ['status'],
        where: { jaringId: id },
        _count: { _all: true },
      }),
      this.getKorwilLookup(),
    ]);

    return {
      items: (sessions as JaringReportSessionRecord[]).map((session) =>
        this.serializeJaringReportSession(session, korwilLookup),
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      facets: {
        status: Object.fromEntries(
          (statusCounts as JaringReportStatusCount[]).map((item) => [
            item.status,
            item._count._all,
          ]),
        ),
      },
    };
  }

  async report(id: string, context: AuthorizationContext) {
    const [session, korwilLookup] = await Promise.all([
      this.prisma.whatsAppReportSession.findUnique({
        where: { id },
        select: jaringReportSessionSelect,
      }),
      this.getKorwilLookup(),
    ]);
    if (!session) {
      throw new ApiException(
        'JARING_REPORT_NOT_FOUND',
        'Laporan Jaring tidak ditemukan.',
        404,
      );
    }

    await this.domainScope.assertJaring(context, session.jaringId);

    return this.serializeJaringReportSession(session, korwilLookup);
  }

  async markReportAsRead(id: string, context: AuthorizationContext) {
    let [session, korwilLookup] = await Promise.all([
      this.prisma.whatsAppReportSession.findUnique({
        where: { id },
        select: jaringReportSessionSelect,
      }),
      this.getKorwilLookup(),
    ]);
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

    const isGaswil =
      context.roleCode === RoleCode.FIELD_OFFICER ||
      context.authRole === 'field_officer';
    const isKorwil =
      context.roleCode === RoleCode.FIELD_COORDINATOR ||
      context.authRole === 'field_coordinator';

    // Jika yang membuka adalah pimpinan/deputi (bukan gaswil atau korwil),
    // pimpinan hanya memantau status hierarki lapangan tanpa menandai baca untuk gaswil/korwil.
    if (!isGaswil && !isKorwil) {
      return this.serializeJaringReportSession(session, korwilLookup);
    }

    const now = new Date();
    const updateData: {
      gaswilReadAt?: Date;
      gaswilReadByUserProfileId?: string | null;
      korwilReadAt?: Date;
      korwilReadByUserProfileId?: string | null;
      readAt?: Date;
      readByUserProfileId?: string | null;
    } = {};

    if (isGaswil && !session.gaswilReadAt) {
      updateData.gaswilReadAt = now;
      updateData.gaswilReadByUserProfileId = context.userProfileId ?? null;
      if (!session.readAt) {
        updateData.readAt = now;
        updateData.readByUserProfileId = context.userProfileId ?? null;
      }
    }

    if (isKorwil && !session.korwilReadAt) {
      updateData.korwilReadAt = now;
      updateData.korwilReadByUserProfileId = context.userProfileId ?? null;
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.whatsAppReportSession.update({
        where: { id },
        data: updateData,
      });
      session = await this.prisma.whatsAppReportSession.findUniqueOrThrow({
        where: { id },
        select: jaringReportSessionSelect,
      });
    }

    return this.serializeJaringReportSession(session, korwilLookup);
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
    if (!message.resolvedAreaId) {
      throw new ApiException(
        'JARING_REPORT_AREA_UNRESOLVED',
        'Wilayah laporan belum tersimpan. Selesaikan resolusi lokasi sebelum membuat Baket.',
        422,
      );
    }

    const baket = message.convertedBaket;
    const latestVersion = baket?.versions[0] ?? null;
    const categoryId = body.categoryId ?? baket?.reportCategoryId ?? null;
    const urgency = body.urgency ?? latestVersion?.urgency ?? null;

    if (!categoryId || !urgency) {
      throw new ApiException(
        'JARING_REPORT_METADATA_INCOMPLETE',
        'Kategori Baket dan urgensi wajib diisi.',
        422,
      );
    }

    const category = await this.prisma.reportCategory.findFirst({
      where: { id: categoryId, isActive: true },
    });
    if (!category) {
      throw new ApiException(
        'REPORT_CATEGORY_NOT_FOUND',
        'Kategori Baket tidak aktif atau tidak ditemukan.',
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
      categoryId: baket?.reportCategoryId ?? null,
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
      validationSummary: message.validationSummary,
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
      type UsableWhatsAppMedia = (typeof message.media)[number];
      const usableMedia = message.media.filter((item: UsableWhatsAppMedia) =>
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
              create: usableMedia.map((item: UsableWhatsAppMedia) => ({
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
        ...reportHistory.map((item: (typeof reportHistory)[number]) => ({
          id: item.id,
          source: 'report_history',
          action: item.action,
          previousState: item.previousState,
          newState: item.newState,
          externalMessageId: item.externalMessageId,
          metadata: item.metadata,
          createdAt: item.createdAt,
        })),
        ...auditHistory.map((item: (typeof auditHistory)[number]) => ({
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

  async rekapJangkauan(
    query: JaringRekapJangkauanQueryDto,
    context?: AuthorizationContext,
  ) {
    if (context && context.authRole !== 'admin_system') {
      throw new ApiException(
        'FORBIDDEN_ACCESS',
        'Akses rekap jangkauan Jaring hanya diizinkan untuk Admin Sistem.',
        403,
      );
    }

    const now = new Date();
    const nowWib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const curYear = nowWib.getUTCFullYear();
    const curMonth = String(nowWib.getUTCMonth() + 1).padStart(2, '0');
    const curDay = String(nowWib.getUTCDate()).padStart(2, '0');

    const parseDateParam = (input?: string | null): string | null => {
      if (!input) return null;
      const trimmed = String(input).trim();
      if (!trimmed) return null;

      const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (ymdMatch) {
        return `${ymdMatch[1]}-${ymdMatch[2]}-${ymdMatch[3]}`;
      }

      const ymMatch = trimmed.match(/^(\d{4})-(\d{2})$/);
      if (ymMatch) {
        return `${ymMatch[1]}-${ymMatch[2]}-01`;
      }

      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        const wib = new Date(parsed.getTime() + 7 * 60 * 60 * 1000);
        const y = wib.getUTCFullYear();
        const m = String(wib.getUTCMonth() + 1).padStart(2, '0');
        const d = String(wib.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }

      return null;
    };

    let startDateStr: string | null = null;
    let endDateStr: string | null = null;

    if (query.period) {
      const pTrim = String(query.period).trim();
      const ymMatch = pTrim.match(/^(\d{4})-(\d{2})$/);
      if (ymMatch) {
        const year = Number(ymMatch[1]);
        const month = Number(ymMatch[2]);
        startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
        endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      } else {
        const parts = pTrim.split(/[_:.]+|\s+to\s+|\s+s\.d\.\s+/i);
        if (parts.length >= 2) {
          startDateStr = parseDateParam(parts[0]);
          endDateStr = parseDateParam(parts[1]);
        }
      }
    }

    if (!startDateStr) {
      startDateStr = parseDateParam(query.startDate ?? query.start);
    }
    if (!endDateStr) {
      endDateStr = parseDateParam(query.endDate ?? query.end);
    }

    if (!startDateStr) {
      startDateStr = `${curYear}-${curMonth}-01`;
    }
    if (!endDateStr) {
      endDateStr = `${curYear}-${curMonth}-${curDay}`;
    }

    if (startDateStr > endDateStr) {
      const temp = startDateStr;
      startDateStr = endDateStr;
      endDateStr = temp;
    }

    const startPeriod = `${startDateStr} 00:00:00+07`;
    const [eY, eM, eD] = endDateStr.split('-').map(Number);
    const nextDay = new Date(Date.UTC(eY, eM - 1, eD + 1));
    const nextDayStr = `${nextDay.getUTCFullYear()}-${String(nextDay.getUTCMonth() + 1).padStart(2, '0')}-${String(nextDay.getUTCDate()).padStart(2, '0')}`;
    const endPeriodExclusive = `${nextDayStr} 00:00:00+07`;

    let pullDate: Date;
    if (query.pullAt && query.pullAt !== 'now' && query.pullAt !== 'current') {
      pullDate = new Date(query.pullAt);
      if (isNaN(pullDate.getTime())) {
        pullDate = now;
      }
    } else if (query.pullAt === 'now' || query.pullAt === 'current') {
      pullDate = now;
    } else {
      const endOfDay = new Date(`${endDateStr}T23:59:59.999+07:00`);
      if (now.getTime() > endOfDay.getTime()) {
        pullDate = endOfDay;
      } else {
        pullDate = now;
      }
    }

    const ninetyDaysAgo = new Date(
      pullDate.getTime() - 90 * 24 * 60 * 60 * 1000,
    );
    const pullTimeStr = pullDate.toISOString();
    const ninetyDaysStr = ninetyDaysAgo.toISOString();

    const [
      totalApprovedRows,
      activeRows,
      periodReportsRows,
      coachingStatsRows,
      detailsRows,
    ] = await Promise.all([
      this.prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
        SELECT count(*)::int as count 
        FROM "Jaring" 
        WHERE "registrationStatus" = 'APPROVED' AND "deletedAt" IS NULL
      `),
      this.prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
        WITH approved_jaring AS (
          SELECT id FROM "Jaring" WHERE "registrationStatus" = 'APPROVED' AND "deletedAt" IS NULL
        ),
        active_reporters AS (
          SELECT DISTINCT "jaringId" FROM "WhatsAppReportSession"
          WHERE "submittedAt" >= ${ninetyDaysStr}::timestamptz AND "submittedAt" <= ${pullTimeStr}::timestamptz
          UNION
          SELECT DISTINCT "jaringId" FROM "WhatsAppMessage"
          WHERE "receivedAt" >= ${ninetyDaysStr}::timestamptz AND "receivedAt" <= ${pullTimeStr}::timestamptz
        )
        SELECT count(*)::int as count
        FROM approved_jaring j
        JOIN active_reporters a ON j.id = a."jaringId"
      `),
      this.prisma.$queryRaw<
        Array<{ total_reports: number; reporting_jaring: number }>
      >(Prisma.sql`
        SELECT 
          count(*)::int as total_reports,
          count(DISTINCT "jaringId")::int as reporting_jaring
        FROM "WhatsAppReportSession"
        WHERE "submittedAt" >= ${startPeriod}::timestamptz AND "submittedAt" < ${endPeriodExclusive}::timestamptz
      `),
      this.prisma.$queryRaw<
        Array<{
          total_coaching_all: number;
          coached_jaring_all: number;
          total_coaching_approved: number;
          coached_jaring_approved: number;
        }>
      >(Prisma.sql`
        SELECT 
          count(*)::int as total_coaching_all,
          count(DISTINCT "jaringId")::int as coached_jaring_all,
          count(CASE WHEN j."registrationStatus" = 'APPROVED' AND j."deletedAt" IS NULL THEN 1 END)::int as total_coaching_approved,
          count(DISTINCT CASE WHEN j."registrationStatus" = 'APPROVED' AND j."deletedAt" IS NULL THEN c."jaringId" END)::int as coached_jaring_approved
        FROM "JaringCoachingReport" c
        LEFT JOIN "Jaring" j ON c."jaringId" = j.id
        WHERE c."createdAt" >= ${startPeriod}::timestamptz AND c."createdAt" < ${endPeriodExclusive}::timestamptz
      `),
      this.prisma.$queryRaw<
        Array<{
          regency_name: string;
          district_name: string;
          total_jaring: number;
          jaring_aktif: number;
          jaring_tidak_aktif: number;
          laporan_masuk: number;
          pembinaan_jaring: number;
        }>
      >(Prisma.sql`
        WITH ranked_coverage AS (
          SELECT 
            jac."jaringId",
            jac."areaId",
            ROW_NUMBER() OVER (PARTITION BY jac."jaringId" ORDER BY jac."isPrimary" DESC, jac."id" ASC) as rn
          FROM "JaringAreaCoverage" jac
          WHERE jac."validUntil" IS NULL OR jac."validUntil" > NOW()
        ),
        jaring_base AS (
          SELECT 
            j.id as "jaringId",
            j."registrationStatus",
            rc."areaId"
          FROM "Jaring" j
          JOIN ranked_coverage rc ON j.id = rc."jaringId" AND rc.rn = 1
          WHERE j."deletedAt" IS NULL
        ),
        jaring_hierarchy AS (
          SELECT 
            jb."jaringId",
            jb."registrationStatus",
            jb."areaId",
            TRIM((
              SELECT reg.name 
              FROM "AdministrativeAreaClosure" aac
              JOIN "AdministrativeArea" reg ON aac."ancestorId" = reg.id AND reg.level IN ('REGENCY', 'CITY')
              WHERE aac."descendantId" = jb."areaId"
              LIMIT 1
            )) as regency_name,
            TRIM((
              SELECT dist.name 
              FROM "AdministrativeAreaClosure" aac
              JOIN "AdministrativeArea" dist ON aac."ancestorId" = dist.id AND dist.level = 'DISTRICT'
              WHERE aac."descendantId" = jb."areaId"
              LIMIT 1
            )) as district_name
          FROM jaring_base jb
        ),
        active_reporters AS (
          SELECT DISTINCT "jaringId" FROM "WhatsAppReportSession"
          WHERE "submittedAt" >= ${ninetyDaysStr}::timestamptz AND "submittedAt" <= ${pullTimeStr}::timestamptz
          UNION
          SELECT DISTINCT "jaringId" FROM "WhatsAppMessage"
          WHERE "receivedAt" >= ${ninetyDaysStr}::timestamptz AND "receivedAt" <= ${pullTimeStr}::timestamptz
        ),
        period_reports AS (
          SELECT "jaringId", count(*)::int as rep_count
          FROM "WhatsAppReportSession"
          WHERE "submittedAt" >= ${startPeriod}::timestamptz AND "submittedAt" < ${endPeriodExclusive}::timestamptz
          GROUP BY "jaringId"
        ),
        period_coaching AS (
          SELECT "jaringId", count(*)::int as coach_count
          FROM "JaringCoachingReport"
          WHERE "createdAt" >= ${startPeriod}::timestamptz AND "createdAt" < ${endPeriodExclusive}::timestamptz
          GROUP BY "jaringId"
        )
        SELECT 
          jh.regency_name,
          jh.district_name,
          count(DISTINCT CASE WHEN jh."registrationStatus" = 'APPROVED' THEN jh."jaringId" END)::int as total_jaring,
          count(DISTINCT CASE WHEN jh."registrationStatus" = 'APPROVED' AND ar."jaringId" IS NOT NULL THEN jh."jaringId" END)::int as jaring_aktif,
          (count(DISTINCT CASE WHEN jh."registrationStatus" = 'APPROVED' THEN jh."jaringId" END) - count(DISTINCT CASE WHEN jh."registrationStatus" = 'APPROVED' AND ar."jaringId" IS NOT NULL THEN jh."jaringId" END))::int as jaring_tidak_aktif,
          COALESCE(sum(pr.rep_count), 0)::int as laporan_masuk,
          COALESCE(sum(pc.coach_count), 0)::int as pembinaan_jaring
        FROM jaring_hierarchy jh
        LEFT JOIN active_reporters ar ON jh."jaringId" = ar."jaringId"
        LEFT JOIN period_reports pr ON jh."jaringId" = pr."jaringId"
        LEFT JOIN period_coaching pc ON jh."jaringId" = pc."jaringId"
        WHERE jh.regency_name IS NOT NULL AND jh.district_name IS NOT NULL
        GROUP BY jh.regency_name, jh.district_name
        ORDER BY jh.regency_name, jh.district_name
      `),
    ]);

    const total = Number(totalApprovedRows[0]?.count ?? 0);
    const active = Number(activeRows[0]?.count ?? 0);
    const inactive = total - active;
    const reports = Number(periodReportsRows[0]?.total_reports ?? 0);
    const reporters = Number(periodReportsRows[0]?.reporting_jaring ?? 0);

    const cStats = coachingStatsRows[0] ?? {
      total_coaching_all: 0,
      coached_jaring_all: 0,
      total_coaching_approved: 0,
      coached_jaring_approved: 0,
    };
    const coachingActivities = Number(cStats.total_coaching_approved ?? 0);
    const coachingActivitiesAll = Number(cStats.total_coaching_all ?? 0);
    const coachedUnique = Number(cStats.coached_jaring_approved ?? 0);
    const coachedUniqueAll = Number(cStats.coached_jaring_all ?? 0);

    const coaching = {
      activities: coachingActivitiesAll,
      activitiesIncludingPending: coachingActivitiesAll,
      uniqueJaring: coachedUniqueAll,
      uniqueJaringIncludingPending: coachedUniqueAll,
      approvedActivities: coachingActivities,
      approvedJaring: coachedUnique,
      pendingActivities: coachingActivitiesAll - coachingActivities,
      pendingJaring: coachedUniqueAll - coachedUnique,
    };

    const regencyMap = new Map<
      string,
      {
        name: string;
        fullName: string;
        total: number;
        active: number;
        inactive: number;
        reports: number;
        coaching: number;
      }
    >();

    for (const d of detailsRows) {
      if (!regencyMap.has(d.regency_name)) {
        const shortName = d.regency_name
          .replace('Kota Administrasi ', '')
          .replace('Kabupaten Administrasi ', '');
        regencyMap.set(d.regency_name, {
          name: shortName,
          fullName: d.regency_name,
          total: 0,
          active: 0,
          inactive: 0,
          reports: 0,
          coaching: 0,
        });
      }
      const r = regencyMap.get(d.regency_name)!;
      r.total += Number(d.total_jaring ?? 0);
      r.active += Number(d.jaring_aktif ?? 0);
      r.inactive += Number(d.jaring_tidak_aktif ?? 0);
      r.reports += Number(d.laporan_masuk ?? 0);
      r.coaching += Number(d.pembinaan_jaring ?? 0);
    }

    const regionOrder = [
      'Jakarta Selatan',
      'Jakarta Timur',
      'Jakarta Pusat',
      'Jakarta Barat',
      'Jakarta Utara',
      'Kepulauan Seribu',
    ];

    const roundToTwo = (val: number): number =>
      Math.round((val + Number.EPSILON) * 100) / 100;

    const regions = Array.from(regencyMap.values())
      .map((r) => {
        const activeRate =
          r.total > 0 ? roundToTwo((r.active / r.total) * 100) : 0;
        const inactiveRate =
          r.total > 0 ? roundToTwo((r.inactive / r.total) * 100) : 0;
        const reportsPerActive =
          r.active > 0 ? roundToTwo(r.reports / r.active) : 0;
        const coachingShare =
          coaching.activities > 0
            ? roundToTwo((r.coaching / coaching.activities) * 100)
            : 0;
        return {
          ...r,
          activeRate,
          inactiveRate,
          reportsPerActive,
          coachingShare,
        };
      })
      .sort((a, b) => {
        const idxA = regionOrder.indexOf(a.name);
        const idxB = regionOrder.indexOf(b.name);
        return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
      });

    const districts = detailsRows.map((d) => {
      const shortRegion = d.regency_name
        .replace('Kota Administrasi ', '')
        .replace('Kabupaten Administrasi ', '');
      const reg = regencyMap.get(d.regency_name);
      const regReports = reg ? reg.reports : 0;

      const dTotal = Number(d.total_jaring ?? 0);
      const dActive = Number(d.jaring_aktif ?? 0);
      const dInactive = Number(d.jaring_tidak_aktif ?? 0);
      const dReports = Number(d.laporan_masuk ?? 0);
      const dCoaching = Number(d.pembinaan_jaring ?? 0);

      const activeRate = dTotal > 0 ? roundToTwo((dActive / dTotal) * 100) : 0;
      const inactiveRate =
        dTotal > 0 ? roundToTwo((dInactive / dTotal) * 100) : 0;
      const reportsPerActive = dActive > 0 ? roundToTwo(dReports / dActive) : 0;
      const reportConcentration =
        regReports > 0 ? roundToTwo((dReports / regReports) * 100) : 0;

      return {
        region: shortRegion,
        regionFullName: d.regency_name,
        name: d.district_name,
        total: dTotal,
        active: dActive,
        inactive: dInactive,
        reports: dReports,
        coaching: dCoaching,
        activeRate,
        inactiveRate,
        reportsPerActive,
        reportConcentration,
      };
    });

    const indonesianMonthNames = [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ];

    const formatWibDate = (date: Date): string => {
      const wibTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
      const day = wibTime.getUTCDate();
      const month = indonesianMonthNames[wibTime.getUTCMonth()];
      const year = wibTime.getUTCFullYear();
      const hours = String(wibTime.getUTCHours()).padStart(2, '0');
      const minutes = String(wibTime.getUTCMinutes()).padStart(2, '0');
      return `${day} ${month} ${year}, ${hours}.${minutes} WIB`;
    };

    const formatPeriodLabel = (sStr: string, eStr: string): string => {
      const [sY, sM, sD] = sStr.split('-').map(Number);
      const [eY, eM, eD] = eStr.split('-').map(Number);

      if (sY === eY && sM === eM && sD === eD) {
        return `${sD} ${indonesianMonthNames[sM - 1]} ${sY}`;
      }
      if (sY === eY && sM === eM) {
        return `${sD}-${eD} ${indonesianMonthNames[sM - 1]} ${sY}`;
      }
      if (sY === eY) {
        return `${sD} ${indonesianMonthNames[sM - 1]} - ${eD} ${indonesianMonthNames[eM - 1]} ${sY}`;
      }
      return `${sD} ${indonesianMonthNames[sM - 1]} ${sY} - ${eD} ${indonesianMonthNames[eM - 1]} ${eY}`;
    };

    const sDate = new Date(`${startDateStr}T00:00:00+07:00`);
    const eDate = new Date(`${endDateStr}T00:00:00+07:00`);
    const periodDays =
      Math.round((eDate.getTime() - sDate.getTime()) / (24 * 60 * 60 * 1000)) +
      1;

    const highestActiveRegion =
      [...regions].sort((a, b) => b.activeRate - a.activeRate)[0]?.name ?? '';
    const highestReportRegion =
      [...regions].sort((a, b) => b.reports - a.reports)[0]?.name ?? '';
    const mostProductiveRegion =
      [...regions].sort((a, b) => b.reportsPerActive - a.reportsPerActive)[0]
        ?.name ?? '';
    const districtsWithoutReports = districts.filter(
      (d) => d.reports === 0,
    ).length;
    const topDistricts = [...districts]
      .sort((a, b) => b.reports - a.reports)
      .slice(0, 10)
      .map((d, index) => ({
        rank: index + 1,
        name: d.name,
        region: d.region,
        reports: d.reports,
        active: d.active,
        total: d.total,
        activeRate: d.activeRate,
      }));

    return {
      metadata: {
        periodStart: startDateStr,
        periodEnd: endDateStr,
        periodLabel: formatPeriodLabel(startDateStr, endDateStr),
        pullAt: formatWibDate(pullDate),
        activityWindowStart: formatWibDate(ninetyDaysAgo),
        periodDays,
      },
      summary: {
        total,
        active,
        inactive,
        reporters,
        reports,
      },
      coaching,
      regions,
      districts,
      highlights: {
        highestActiveRegion,
        highestReportRegion,
        mostProductiveRegion,
        districtsWithoutReports,
        topDistricts,
      },
    };
  }
}
