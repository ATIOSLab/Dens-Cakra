import { randomInt } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  AdministrativeLevel,
  FileLifecycleStatus,
  JaringStatus,
  PositionCode,
  Prisma,
} from '../../generated/prisma/client.js';
import { ApiException } from '../../common/api/api-exception.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { normalizeIndonesianPhoneNumber } from '../../common/utils/phone-normalizer.js';
import { DomainScopeService } from '../access/domain-scope.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreateJaringClusterDto,
  CreateJaringOccupationDto,
  CreateReportCategoryDto,
  CoverageDto,
  CreateJaringDto,
  JaringClusterQuery,
  JaringOccupationQuery,
  JaringQuery,
  ReportCategoryQuery,
  ReasonDto,
  TransferDto,
  UpdateJaringClusterDto,
  UpdateJaringOccupationDto,
  UpdateReportCategoryDto,
  UpdateJaringDto,
} from './jaring.dto.js';

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

@Injectable()
export class JaringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainScope: DomainScopeService,
  ) {}

  private clusterCode(value: string) {
    const normalized = value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80);

    return normalized || `CLUSTER_${Date.now()}`;
  }

  private reportCategoryCode(value: string) {
    const normalized = this.clusterCode(value);
    return normalized.startsWith('CLUSTER_')
      ? `CATEGORY_${Date.now()}`
      : normalized;
  }

  private async ensureActiveCluster(clusterId?: string) {
    if (!clusterId) {
      return;
    }

    const cluster = await this.prisma.jaringCluster.findUnique({
      where: { id: clusterId },
    });

    if (!cluster || !cluster.isActive) {
      throw new ApiException(
        'JARING_CLUSTER_INVALID',
        'Cluster Jaring tidak ditemukan atau tidak aktif.',
        422,
      );
    }
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
    const cityCode = this.administrativeCode(districtArea).split('.').slice(0, -1).join('.');
    if (!cityCode) {
      return null;
    }

    return JAKARTA_CITY_ALIAS_CODES[cityCode] ?? null;
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

    const areaById = new Map(areas.map((area) => [area.id, area]));
    const primaryArea = areaIds.map((areaId) => areaById.get(areaId)).find(Boolean);
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
    const maxSequence = existingAliases.reduce((max, item) => {
      const sequence = item.aliasName?.slice(aliasPrefix.length);
      if (!sequence || !/^\d{3}$/.test(sequence)) {
        return max;
      }
      return Math.max(max, Number(sequence));
    }, 0);
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

  private async ensureProfilePhoto(
    fileId: string | null | undefined,
    context: AuthorizationContext,
  ) {
    if (!fileId) {
      return;
    }

    const file = await this.prisma.fileAsset.findFirst({
      where: {
        id: fileId,
        deletedAt: null,
        createdByAssignmentId: context.primaryAssignmentId,
        fileType: 'PHOTO',
        lifecycleStatus: {
          in: [
            FileLifecycleStatus.UPLOADED,
            FileLifecycleStatus.SCANNING,
            FileLifecycleStatus.CLEAN,
          ],
        },
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

  private detail(id: string, includeDeleted = false) {
    return this.prisma.jaring.findFirstOrThrow({
      where: { id, ...(includeDeleted ? {} : { deletedAt: null }) },
      include: {
        cluster: true,
        occupation: true,
        profilePhotoFile: true,
        caretakerAssignments: {
          include: {
            fieldOfficerAssignment: {
              include: { userProfile: true, position: true },
            },
          },
          orderBy: { validFrom: 'desc' },
        },
        areaCoverages: {
          include: { area: true },
          orderBy: { validFrom: 'desc' },
        },
        _count: { select: { messages: true, primaryBakets: true } },
      },
    });
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

  private async status(
    id: string,
    status: JaringStatus,
    reason: string,
    context: AuthorizationContext,
    auditAction = `JARING.${status}`,
  ) {
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
    return this.prisma.jaring.findMany({
      where: {
        deletedAt: null,
        caretakerAssignments: {
          some: {
            fieldOfficerAssignmentId: { in: scope.assignmentIds },
            isActive: true,
            OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
          },
        },
        ...(query.status ? { status: query.status } : {}),
        ...(query.search
          ? {
              OR: [
                { code: { contains: query.search, mode: 'insensitive' } },
                { aliasName: { contains: query.search, mode: 'insensitive' } },
                { whatsappNumber: { contains: query.search } },
              ],
            }
          : {}),
      },
      take: query.limit,
      orderBy: { createdAt: 'desc' },
      include: {
        cluster: true,
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
          include: { area: true },
        },
      },
    });
  }

  async create(body: CreateJaringDto, context: AuthorizationContext) {
    await this.ensureActiveCluster(body.clusterId);
    await this.ensureActiveOccupation(body.occupationId);
    await this.ensureProfilePhoto(body.profilePhotoFileId, context);

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
    await Promise.all(
      areaIds.map((areaId) => this.domainScope.assertArea(context, areaId)),
    );
    const coverageCount = await this.prisma.administrativeArea.count({
      where: {
        id: { in: areaIds },
        level: {
          in: [
            AdministrativeLevel.DISTRICT,
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
        'JARING_AREA_MUST_BE_DISTRICT_OR_VILLAGE',
        'Wilayah Jaring harus berupa kecamatan atau kelurahan/desa aktif di bawah cakupan Field Officer.',
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
        caretakerAssignments: {
          where: { isActive: true, validUntil: null },
          take: 1,
          select: { fieldOfficerAssignmentId: true },
        },
      },
    });

    if (duplicateNumber) {
      const registeredFieldOfficerId =
        duplicateNumber.caretakerAssignments[0]?.fieldOfficerAssignmentId;

      if (
        registeredFieldOfficerId &&
        registeredFieldOfficerId !== body.fieldOfficerAssignmentId
      ) {
        throw new ApiException(
          'JARING_WHATSAPP_OWNED_BY_OTHER_OFFICER',
          'Nomor Jaring telah terdaftar di bawah Field Officer lain.',
          409,
        );
      }

      throw new ApiException(
        'JARING_WHATSAPP_DUPLICATE',
        'Nomor Jaring telah terdaftar di bawah Field Officer ini.',
        409,
      );
    }

    const officer = await this.prisma.userSeatAssignment.findUniqueOrThrow({
      where: { id: body.fieldOfficerAssignmentId },
      include: { position: true },
    });
    if (
      officer.position.code !== PositionCode.PETUGAS_ORGANIK ||
      !officer.isActive
    ) {
      throw new ApiException(
        'CARETAKER_INVALID',
        'Caretaker must be an active Field Officer.',
        422,
      );
    }
    const aliasName = await this.generateAliasName(areaIds);
    const jaring = await this.prisma.jaring.create({
      data: {
        code: randomInt(100_000, 1_000_000).toString(),
        aliasName,
        whatsappNumber,
        clusterId: body.clusterId,
        fullName: body.fullName.trim(),
        nationalIdNumber: body.nationalIdNumber,
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

  async get(id: string, context: AuthorizationContext) {
    await this.domainScope.assertJaring(context, id);
    return this.detail(id);
  }

  async update(
    id: string,
    body: UpdateJaringDto,
    context: AuthorizationContext,
  ) {
    await this.ensureActiveCluster(body.clusterId);
    await this.prisma.jaring.update({ where: { id }, data: body });
    await this.audit(context, 'JARING.UPDATE', id);
    return this.detail(id);
  }

  async listClusters(query: JaringClusterQuery) {
    return this.prisma.jaringCluster.findMany({
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

  async createCluster(
    body: CreateJaringClusterDto,
    context: AuthorizationContext,
  ) {
    const code = this.clusterCode(body.code ?? body.name);
    const name = body.name.trim();

    const duplicate = await this.prisma.jaringCluster.findFirst({
      where: {
        OR: [
          { code: { equals: code, mode: 'insensitive' } },
          { name: { equals: name, mode: 'insensitive' } },
        ],
      },
    });

    if (duplicate) {
      throw new ApiException(
        'JARING_CLUSTER_DUPLICATE',
        'Kode atau nama cluster Jaring sudah digunakan.',
        409,
      );
    }

    const cluster = await this.prisma.jaringCluster.create({
      data: {
        code,
        name,
        description: body.description?.trim() || null,
      },
    });

    await this.audit(context, 'JARING_CLUSTER.CREATE', cluster.id);
    return cluster;
  }

  async updateCluster(
    id: string,
    body: UpdateJaringClusterDto,
    context: AuthorizationContext,
  ) {
    const patch: Prisma.JaringClusterUpdateInput = {};

    if (body.code !== undefined) {
      patch.code = this.clusterCode(body.code);
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
      const duplicate = await this.prisma.jaringCluster.findFirst({
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
          'JARING_CLUSTER_DUPLICATE',
          'Kode atau nama cluster Jaring sudah digunakan.',
          409,
        );
      }
    }

    const cluster = await this.prisma.jaringCluster.update({
      where: { id },
      data: patch,
      include: { _count: { select: { jaring: true } } },
    });

    await this.audit(context, 'JARING_CLUSTER.UPDATE', id);
    return cluster;
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
    const code = this.clusterCode(body.code ?? body.name);
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
      patch.code = this.clusterCode(body.code);
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
    return this.status(id, JaringStatus.ACTIVE, body.reason, context);
  }

  async deactivate(id: string, body: ReasonDto, context: AuthorizationContext) {
    return this.status(id, JaringStatus.INACTIVE, body.reason, context);
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

  async regeneratePin(id: string, context: AuthorizationContext) {
    await this.domainScope.assertJaring(context, id);
    const code = randomInt(100_000, 1_000_000).toString();

    await this.prisma.jaring.update({
      where: { id },
      data: { code },
    });
    await this.audit(context, 'JARING.PIN_REGENERATE', id);

    return this.detail(id);
  }

  async caretakers(id: string, context: AuthorizationContext) {
    await this.domainScope.assertJaring(context, id);
    return this.prisma.jaringCaretakerAssignment.findMany({
      where: { jaringId: id },
      orderBy: { validFrom: 'desc' },
      include: {
        fieldOfficerAssignment: {
          include: { userProfile: true, position: true },
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

  async bakets(id: string, context: AuthorizationContext) {
    await this.domainScope.assertJaring(context, id);
    return this.prisma.baket.findMany({
      where: { primaryJaringId: id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
    });
  }
}
