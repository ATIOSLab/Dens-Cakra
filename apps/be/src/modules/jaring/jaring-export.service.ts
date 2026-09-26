import { Injectable, Logger } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import {
  AdministrativeLevel,
  JaringRegistrationStatus,
  JaringStatus,
  Prisma,
} from '../../generated/prisma/client.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { DomainScopeService } from '../access/domain-scope.service.js';
import { LocalStorageService } from '../infrastructure/local-storage.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SYSTEM_ROLES } from '../../common/constants/system-role.js';
import { resolveDescendantAreaIds } from '../../common/utils/area-closure.js';
import type { JaringExportPdfQueryDto } from './jaring.dto.js';
import sharp from 'sharp';
import { DKI_MAP_PATHS } from './dki-map-paths.js';

export type JaringExportFile = {
  filename: string;
  contentType: string;
  buffer: Buffer;
};

export type FormattedJaring = {
  id: string;
  fullName: string;
  aliasName: string | null;
  nationalIdNumber: string | null;
  address: string | null;
  birthPlace: string | null;
  birthDate: Date | null;
  gender: string | null;
  status: string;
  lastReportAt?: string | null;
  jobTitle: string | null;
  workplace: string | null;
  occupationName: string | null;
  whatsappNumber: string;
  organizationName: string | null;
  notes: string | null;
  provinceName: string;
  cityName: string;
  districtName: string;
  villageName: string;
  gaswilName: string;
  profilePhotoStorageKey: string | null;
};

export type OccupationStat = {
  name: string;
  count: number;
};

export type VillageGroup = {
  villageName: string;
  totalJaring: number;
  occupations: OccupationStat[];
  items: FormattedJaring[];
};

export type DistrictGroup = {
  districtName: string;
  totalJaring: number;
  occupations: OccupationStat[];
  villages: VillageGroup[];
  items: FormattedJaring[];
};

export type CityGroup = {
  cityName: string;
  totalJaring: number;
  occupations: OccupationStat[];
  districts: DistrictGroup[];
  items: FormattedJaring[];
};

export type ProvinceGroup = {
  provinceName: string;
  totalJaring: number;
  cities: CityGroup[];
  items: FormattedJaring[];
};

export type ProfilingStatistics = {
  summary: {
    total: number;
    active: number;
    inactive: number;
    activePercentage: number;
    inactivePercentage: number;
  };
  wilayah: {
    citiesRanked: Array<{
      cityName: string;
      totalJaring: number;
      percentage: number;
    }>;
    dkiCounts: {
      jakartaPusat: number;
      jakartaUtara: number;
      jakartaBarat: number;
      jakartaSelatan: number;
      jakartaTimur: number;
      kepulauanSeribu: number;
      lainnya: number;
    };
  };
  gender: {
    items: Array<{
      label: string;
      count: number;
      percentage: number;
      color: string;
    }>;
  };
  ageGroups: {
    items: Array<{
      range: string;
      count: number;
      percentage: number;
    }>;
  };
  generations: {
    items: Array<{
      name: string;
      birthRange: string;
      count: number;
      percentage: number;
    }>;
  };
  occupations: {
    topCategories: Array<{
      name: string;
      count: number;
      percentage: number;
    }>;
  };
  statuses: {
    items: Array<{
      label: string;
      count: number;
      percentage: number;
      color: string;
    }>;
  };
};

export enum RecapGranularity {
  PROVINCE_CITY = 'PROVINCE_CITY',
  CITY_DISTRICT_VILLAGE = 'CITY_DISTRICT_VILLAGE',
  DISTRICT_VILLAGE = 'DISTRICT_VILLAGE',
  VILLAGE = 'VILLAGE',
}

@Injectable()
export class JaringExportService {
  private readonly logger = new Logger(JaringExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly domainScope: DomainScopeService,
    private readonly storage: LocalStorageService,
  ) {}

  async exportPdf(
    query: JaringExportPdfQueryDto,
    context: AuthorizationContext,
  ): Promise<JaringExportFile> {
    const { items, filterArea } = await this.fetchJaringData(query, context);
    const provinceGroups = this.groupData(items);

    // Tentukan tingkat granularitas tabel rekapitulasi berdasarkan filter aktif
    let granularity = RecapGranularity.PROVINCE_CITY;
    if (filterArea) {
      if (
        filterArea.level === AdministrativeLevel.CITY ||
        filterArea.level === AdministrativeLevel.REGENCY
      ) {
        granularity = RecapGranularity.CITY_DISTRICT_VILLAGE;
      } else if (filterArea.level === AdministrativeLevel.DISTRICT) {
        granularity = RecapGranularity.DISTRICT_VILLAGE;
      } else if (
        filterArea.level === AdministrativeLevel.VILLAGE ||
        filterArea.level === AdministrativeLevel.URBAN_VILLAGE
      ) {
        granularity = RecapGranularity.VILLAGE;
      }
    } else if (items.length > 0) {
      const uniqueCities = new Set(
        items.map((i) => i.cityName).filter((c) => c && c !== '-'),
      );
      const uniqueDistricts = new Set(
        items.map((i) => i.districtName).filter((d) => d && d !== '-'),
      );
      if (uniqueCities.size === 1 && uniqueDistricts.size === 1) {
        granularity = RecapGranularity.DISTRICT_VILLAGE;
      } else if (uniqueCities.size === 1) {
        granularity = RecapGranularity.CITY_DISTRICT_VILLAGE;
      }
    }

    const PDFDocument = (await import('pdfkit')).default;
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 36,
      bufferPages: true,
      info: {
        Title: query.title || 'Buku Profiling dan Rekapitulasi Data Jaring',
        Author: 'DENS CAKRA - Sistem Informasi Intelijen',
        Subject: 'Dossier Profiling Jaring Intelijen',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const done = new Promise<void>((resolve) => doc.on('end', () => resolve()));

    const includeCover = query.includeCover !== false;
    const includeMap = query.includeMap !== false;
    const includeToc = query.includeToc !== false;
    const includeRecap = query.includeRecap !== false;
    const includeInfographic = query.includeInfographic !== false;

    // Single source of truth: kalkulasi statistik profiling terpadu
    const stats = this.buildProfilingStatistics(items);

    let mapPageIndex = -1;
    let tocStartPageIndex = -1;
    let tocPagesCount = 0;
    let recapTerritoryPageIndex = -1;
    let recapOccupationPageIndex = -1;
    let infographicPageIndex = -1;
    const provincePageMap = new Map<string, number>();
    const cityPageMap = new Map<string, number>();

    let hasPage = false;

    // 1. Cover / Halaman Sampul Dokumen Resmi (Tanpa label Rahasia, Tanpa TTD)
    if (includeCover) {
      this.renderCoverPage(
        doc,
        query,
        items,
        provinceGroups,
        filterArea?.name ?? null,
      );
      hasPage = true;
    }

    // 2. Peta Sebaran Jaring DKI Jakarta (Visual Infografis Utama di awal laporan, sebelum Daftar Isi)
    if (includeMap) {
      if (hasPage) doc.addPage();
      mapPageIndex = doc.bufferedPageRange().count;
      await this.renderMapPage(doc, stats, filterArea?.name ?? null);
      hasPage = true;
    }

    // 3. Halaman Infografis Jaring & Visualisasi Data / Chart (Sebaran, Status, Gender, Usia, Generasi, Word Cloud Pekerjaan)
    // - HALAMAN 1: INFOGRAFIS DATA JARING: SEBARAN WILAYAH & STATUS OPERASIONAL
    // - HALAMAN 2: INFOGRAFIS DEMOGRAFI & KLASIFIKASI PEKERJAAN JARING
    // (Ditempatkan di bawah peta dan di atas daftar isi)
    if (includeInfographic && items.length > 0) {
      if (hasPage) doc.addPage();
      infographicPageIndex = doc.bufferedPageRange().count;
      await this.renderInfographicPages(doc, stats);
      hasPage = true;
    }

    // 4. Placeholder untuk Halaman Daftar Isi
    if (includeToc) {
      let totalTocEntries = 0;
      if (includeMap) totalTocEntries += 1;
      if (includeInfographic && items.length > 0) totalTocEntries += 1;
      if (includeRecap && provinceGroups.length > 0) totalTocEntries += 2;
      for (const group of provinceGroups) {
        totalTocEntries += 1 + group.cities.length;
      }
      tocPagesCount = Math.max(1, Math.ceil(totalTocEntries / 44));

      if (hasPage) {
        doc.addPage();
      }
      tocStartPageIndex = doc.bufferedPageRange().count - 1;

      for (let p = 1; p < tocPagesCount; p++) {
        doc.addPage();
      }
      hasPage = true;
    }

    // 5. Halaman Rekapitulasi:
    // Tabel 1: Rekapitulasi Persebaran Wilayah Jaring (Grouped Hierarchical Table: Kota -> Kecamatan -> Kelurahan)
    // Tabel 2: Rekapitulasi Klasifikasi Pekerjaan Jaring (Mendeskripsikan pembagian wilayah per pekerjaan)
    if (includeRecap && provinceGroups.length > 0) {
      if (hasPage) doc.addPage();
      recapTerritoryPageIndex = doc.bufferedPageRange().count;
      this.renderTerritoryRecapPages(
        doc,
        provinceGroups,
        granularity,
        filterArea?.name ?? null,
      );

      doc.addPage();
      recapOccupationPageIndex = doc.bufferedPageRange().count;
      this.renderRecapPages(
        doc,
        provinceGroups,
        granularity,
        filterArea?.name ?? null,
      );
      hasPage = true;
    }

    // 6. Halaman Detail Profiling Jaring (Dikelompokkan per Kota/Kabupaten)
    let globalProfilingIndex = 1;
    for (const group of provinceGroups) {
      let provFirstPage = -1;

      for (const city of group.cities) {
        if (hasPage) doc.addPage();
        const currentCityPage = doc.bufferedPageRange().count;

        if (provFirstPage === -1) {
          provFirstPage = currentCityPage;
          provincePageMap.set(group.provinceName, provFirstPage);
        }
        cityPageMap.set(
          `${group.provinceName}::${city.cityName}`,
          currentCityPage,
        );

        globalProfilingIndex = await this.renderCityProfiling(
          doc,
          group.provinceName,
          city,
          globalProfilingIndex,
        );
        hasPage = true;
      }
    }

    // 7. Render Daftar Isi ke Halaman Placeholder yang Sudah Dialokasikan
    if (includeToc && tocStartPageIndex >= 0) {
      this.renderTocPages(
        doc,
        tocStartPageIndex,
        tocPagesCount,
        recapTerritoryPageIndex,
        recapOccupationPageIndex,
        provinceGroups,
        provincePageMap,
        cityPageMap,
        mapPageIndex,
        infographicPageIndex,
      );
    }

    // 6. Penomoran Halaman di Bagian Tengah Bawah (Format Buku Fisik)
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      if (i === 0 && includeCover) continue;

      doc.page.margins.bottom = 0;

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#475569')
        .text(String(i + 1), 36, 562, {
          align: 'center',
          width: 841.89 - 72,
          lineBreak: false,
        });
    }

    doc.end();
    await done;

    await this.writeAudit(context, items.length);

    const dateStr = new Date().toISOString().slice(0, 10);
    return {
      filename: `buku-profiling-jaring-${dateStr}.pdf`,
      contentType: 'application/pdf',
      buffer: Buffer.concat(chunks),
    };
  }

  private async fetchJaringData(
    query: JaringExportPdfQueryDto,
    context: AuthorizationContext,
  ): Promise<{
    items: FormattedJaring[];
    filterArea: {
      id: string;
      name: string;
      level: AdministrativeLevel;
    } | null;
  }> {
    const scope = await this.domainScope.resolve(context);
    const isFieldCoordinator =
      context.authRole === SYSTEM_ROLES.FIELD_COORDINATOR;
    const isNationalSupervision =
      context.authRole === SYSTEM_ROLES.EXECUTIVE ||
      context.authRole === SYSTEM_ROLES.NATIONAL_LEADER ||
      context.authRole === SYSTEM_ROLES.ADMIN_SYSTEM ||
      Boolean(context.areaScopes?.some((s) => s.level === 'COUNTRY'));
    const search = query.search?.trim();

    let filterArea: {
      id: string;
      name: string;
      level: AdministrativeLevel;
    } | null = null;

    if (query.areaId) {
      filterArea = await this.prisma.administrativeArea.findUnique({
        where: { id: query.areaId },
        select: { id: true, name: true, level: true },
      });
    }

    // Specific IDs filter (if selected from client)
    const specificIds = query.jaringIds
      ? query.jaringIds
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean)
      : undefined;

    const scopedAreaIds =
      isNationalSupervision || scope.areaRootIds.length === 0
        ? []
        : await resolveDescendantAreaIds(this.prisma, scope.areaRootIds);

    const queryAreaIds = query.areaId
      ? await resolveDescendantAreaIds(this.prisma, query.areaId)
      : [];

    let effectiveAreaIds: string[] | null = null;
    if (scopedAreaIds.length > 0 && queryAreaIds.length > 0) {
      const scopedSet = new Set(scopedAreaIds);
      effectiveAreaIds = queryAreaIds.filter((id) => scopedSet.has(id));
    } else if (queryAreaIds.length > 0) {
      effectiveAreaIds = queryAreaIds;
    } else if (scopedAreaIds.length > 0) {
      effectiveAreaIds = scopedAreaIds;
    }

    const areaFilter: Prisma.JaringWhereInput = effectiveAreaIds
      ? {
          areaCoverages: {
            some: {
              validUntil: null,
              areaId: { in: effectiveAreaIds },
            },
          },
        }
      : {};

    const caretakerWhere: Prisma.JaringWhereInput =
      query.fieldOfficerAssignmentId
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
                    : scope.assignmentIds.length > 0
                      ? {
                          fieldOfficerAssignmentId: { in: scope.assignmentIds },
                        }
                      : {}),
                  isActive: true,
                  OR: [
                    { validUntil: null },
                    { validUntil: { gt: new Date() } },
                  ],
                },
              },
            };

    const searchFilter: Prisma.JaringWhereInput = search
      ? {
          OR: [
            { aliasName: { contains: search, mode: 'insensitive' } },
            { fullName: { contains: search, mode: 'insensitive' } },
            { address: { contains: search, mode: 'insensitive' } },
            { organizationName: { contains: search, mode: 'insensitive' } },
            { workplace: { contains: search, mode: 'insensitive' } },
            { whatsappNumber: { contains: search } },
          ],
        }
      : {};

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);

    const activityWhere: Prisma.JaringWhereInput =
      query.status === JaringStatus.ACTIVE
        ? {
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
            }
          : {};

    const where: Prisma.JaringWhereInput = {
      deletedAt: null,
      // Syarat mutlak: Hanya ekspor data Jaring yang berstatus TERVERIFIKASI (APPROVED)
      registrationStatus: JaringRegistrationStatus.APPROVED,
      ...(specificIds && specificIds.length > 0
        ? { id: { in: specificIds } }
        : {}),
      ...areaFilter,
      ...caretakerWhere,
      ...searchFilter,
      ...activityWhere,
    };

    const rawJarings = await this.prisma.jaring.findMany({
      where,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      include: {
        occupation: true,
        profilePhotoFile: true,
        areaCoverages: {
          where: { validUntil: null },
          orderBy: { isPrimary: 'desc' },
          include: {
            area: {
              include: {
                parent: {
                  include: {
                    parent: {
                      include: {
                        parent: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        caretakerAssignments: {
          where: {
            isActive: true,
            OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
          },
          include: {
            fieldOfficerAssignment: {
              include: {
                userProfile: true,
              },
            },
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
      },
    });

    const formattedItems = rawJarings.map((item) => {
      let provinceName = 'Wilayah Belum Ditentukan';
      let cityName = '-';
      let districtName = '-';
      let villageName = '-';

      for (const coverage of item.areaCoverages) {
        let curr: any = coverage.area;
        while (curr) {
          if (curr.level === AdministrativeLevel.PROVINCE) {
            provinceName = curr.name;
          } else if (
            curr.level === AdministrativeLevel.CITY ||
            curr.level === AdministrativeLevel.REGENCY
          ) {
            cityName = curr.name;
          } else if (curr.level === AdministrativeLevel.DISTRICT) {
            districtName = curr.name;
          } else if (
            curr.level === AdministrativeLevel.VILLAGE ||
            curr.level === AdministrativeLevel.URBAN_VILLAGE
          ) {
            villageName = curr.name;
          }
          curr = curr.parent;
        }
      }

      const gaswil =
        item.caretakerAssignments[0]?.fieldOfficerAssignment?.userProfile
          ?.fullName ||
        item.caretakerAssignments[0]?.fieldOfficerAssignment?.userProfile
          ?.username ||
        '-';

      const { status: computedStatus, lastReportAt } =
        this.calculateJaringActivity(item);

      return {
        id: item.id,
        fullName:
          item.fullName?.trim() || item.aliasName?.trim() || 'Tanpa Nama',
        aliasName: item.aliasName?.trim() || null,
        nationalIdNumber: item.nationalIdNumber?.trim() || null,
        address: item.address?.trim() || null,
        birthPlace: item.birthPlace?.trim() || null,
        birthDate: item.birthDate,
        gender: item.gender || null,
        status: computedStatus,
        lastReportAt,
        jobTitle: item.jobTitle?.trim() || null,
        workplace: item.workplace?.trim() || null,
        occupationName: item.occupation?.name || null,
        whatsappNumber: item.whatsappNumber,
        organizationName: item.organizationName?.trim() || null,
        notes: item.notes?.trim() || null,
        provinceName,
        cityName,
        districtName,
        villageName,
        gaswilName: gaswil,
        profilePhotoStorageKey: item.profilePhotoFile?.storageKey || null,
      };
    });

    return {
      items: formattedItems,
      filterArea,
    };
  }

  private calculateJaringActivity(item: {
    messages?: Array<{ receivedAt: Date }>;
    reportSessions?: Array<{ submittedAt: Date | null }>;
    status?: string;
  }): { status: 'ACTIVE' | 'INACTIVE'; lastReportAt: string | null } {
    if (item.messages !== undefined || item.reportSessions !== undefined) {
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

      return {
        status: hasReportInLast3Months ? 'ACTIVE' : 'INACTIVE',
        lastReportAt: lastReportAt ? lastReportAt.toISOString() : null,
      };
    }

    // Fallback if messages/reportSessions relations were not loaded (e.g. unit test mocks)
    const fallbackStatus = (item.status as string) || 'ACTIVE';
    return {
      status:
        fallbackStatus.toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      lastReportAt: null,
    };
  }

  private extractOccupations(items: FormattedJaring[]): OccupationStat[] {
    const map = new Map<string, number>();
    for (const item of items) {
      const occ =
        item.occupationName?.trim() ||
        item.jobTitle?.trim() ||
        item.workplace?.trim() ||
        'Lainnya';
      map.set(occ, (map.get(occ) || 0) + 1);
    }
    const result: OccupationStat[] = Array.from(map.entries()).map(
      ([name, count]) => ({ name, count }),
    );
    result.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name, 'id');
    });
    return result;
  }

  private groupData(items: FormattedJaring[]): ProvinceGroup[] {
    const provinceMap = new Map<string, FormattedJaring[]>();

    for (const item of items) {
      const prov = item.provinceName || 'Wilayah Belum Ditentukan';
      if (!provinceMap.has(prov)) {
        provinceMap.set(prov, []);
      }
      provinceMap.get(prov)!.push(item);
    }

    const groups: ProvinceGroup[] = [];

    for (const [provinceName, provItems] of provinceMap.entries()) {
      // Kelompokkan berdasarkan Kota/Kabupaten
      const cityMap = new Map<string, FormattedJaring[]>();
      for (const item of provItems) {
        const city =
          item.cityName && item.cityName !== '-'
            ? item.cityName.trim()
            : 'Wilayah Lainnya';
        if (!cityMap.has(city)) {
          cityMap.set(city, []);
        }
        cityMap.get(city)!.push(item);
      }

      const cities: CityGroup[] = [];
      for (const [cityName, cityItems] of cityMap.entries()) {
        cityItems.sort((a, b) => a.fullName.localeCompare(b.fullName, 'id'));

        // Kelompokkan Kecamatan dalam kota ini
        const districtMap = new Map<string, FormattedJaring[]>();
        for (const item of cityItems) {
          const dist =
            item.districtName && item.districtName !== '-'
              ? item.districtName.trim()
              : 'Kecamatan Lainnya';
          if (!districtMap.has(dist)) {
            districtMap.set(dist, []);
          }
          districtMap.get(dist)!.push(item);
        }

        const districts: DistrictGroup[] = [];
        for (const [districtName, distItems] of districtMap.entries()) {
          // Kelompokkan Kelurahan dalam kecamatan ini
          const villageMap = new Map<string, FormattedJaring[]>();
          for (const item of distItems) {
            const vill =
              item.villageName && item.villageName !== '-'
                ? item.villageName.trim()
                : 'Kelurahan Lainnya';
            if (!villageMap.has(vill)) {
              villageMap.set(vill, []);
            }
            villageMap.get(vill)!.push(item);
          }

          const villages: VillageGroup[] = [];
          for (const [villageName, villItems] of villageMap.entries()) {
            villages.push({
              villageName,
              totalJaring: villItems.length,
              occupations: this.extractOccupations(villItems),
              items: villItems,
            });
          }
          villages.sort((a, b) => {
            if (b.totalJaring !== a.totalJaring)
              return b.totalJaring - a.totalJaring;
            return a.villageName.localeCompare(b.villageName, 'id');
          });

          districts.push({
            districtName,
            totalJaring: distItems.length,
            occupations: this.extractOccupations(distItems),
            villages,
            items: distItems,
          });
        }
        districts.sort((a, b) => {
          if (b.totalJaring !== a.totalJaring)
            return b.totalJaring - a.totalJaring;
          return a.districtName.localeCompare(b.districtName, 'id');
        });

        cities.push({
          cityName,
          totalJaring: cityItems.length,
          occupations: this.extractOccupations(cityItems),
          districts,
          items: cityItems,
        });
      }

      cities.sort((a, b) => b.totalJaring - a.totalJaring);
      provItems.sort((a, b) => a.fullName.localeCompare(b.fullName, 'id'));

      groups.push({
        provinceName,
        totalJaring: provItems.length,
        cities,
        items: provItems,
      });
    }

    groups.sort((a, b) => a.provinceName.localeCompare(b.provinceName, 'id'));

    return groups;
  }

  /**
   * Halaman 1: Cover / Sampul Dokumen
   * - Kop Lembaga: "DEPUTI BIDANG INTELIJEN DALAM NEGERI"
   * - Tanpa label "Dokumen Rahasia"
   * - Desain elegan, proporsional, dan berwibawa
   */
  private renderCoverPage(
    doc: PDFKit.PDFDocument,
    query: JaringExportPdfQueryDto,
    items: FormattedJaring[],
    groups: ProvinceGroup[],
    filterAreaName: string | null = null,
  ) {
    const pageWidth = 841.89;
    const pageHeight = 595.28;

    // Background border ganda elegan
    doc
      .rect(24, 24, pageWidth - 48, pageHeight - 48)
      .lineWidth(1.5)
      .strokeColor('#0ea5e9')
      .stroke();

    doc
      .rect(28, 28, pageWidth - 56, pageHeight - 56)
      .lineWidth(0.5)
      .strokeColor('#cbd5e1')
      .stroke();

    // Kop Lembaga Kedinasan (Penyesuaian butir 5: "Deputi" bukan "Kedeputian")
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text('BADAN INTELIJEN NEGARA', 0, 80, { align: 'center' });
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#334155')
      .text('DEPUTI BIDANG INTELIJEN DALAM NEGERI', 0, 104, {
        align: 'center',
      });
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#64748b')
      .text('SISTEM INFORMASI OPERASIONAL INTELIJEN DENS CAKRA', 0, 124, {
        align: 'center',
      });

    // Horizontal divider
    doc
      .moveTo(80, 146)
      .lineTo(pageWidth - 80, 146)
      .lineWidth(1.5)
      .strokeColor('#0ea5e9')
      .stroke();

    // Judul Utama Dokumen
    const title =
      query.title?.toUpperCase() ||
      'BUKU PROFILING DAN REKAPITULASI DATA JARING';
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text(title, 0, 200, { align: 'center' });

    doc
      .fontSize(14)
      .font('Helvetica')
      .fillColor('#0ea5e9')
      .text('REKAPITULASI DAN PEMBAGIAN WILAYAH JARING KELURAHAN', 0, 235, {
        align: 'center',
      });

    // Subtitle cakupan wilayah dan status data
    const areaScopeLabel = filterAreaName
      ? filterAreaName.toUpperCase()
      : groups
          .map((g) => g.provinceName)
          .join(', ')
          .toUpperCase();

    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#334155')
      .text(`WILAYAH OPERASIONAL: ${areaScopeLabel}`, 0, 310, {
        align: 'center',
      });

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#64748b')
      .text(
        'Kompilasi Data Jaring Intelijen Operasional Terverifikasi (APPROVED)',
        0,
        330,
        {
          align: 'center',
        },
      );

    doc
      .fontSize(10.5)
      .font('Helvetica-Bold')
      .fillColor('#0ea5e9')
      .text(
        `Total Jaring Terdata: ${items.length.toLocaleString('id-ID')} Orang`,
        0,
        350,
        {
          align: 'center',
        },
      );
  }

  /**
   * Halaman 2: DAFTAR ISI
   */
  private renderTocPages(
    doc: PDFKit.PDFDocument,
    startPageIndex: number,
    pagesCount: number,
    recapTerritoryPageIndex: number,
    recapOccupationPageIndex: number,
    groups: ProvinceGroup[],
    provincePageMap: Map<string, number>,
    cityPageMap: Map<string, number>,
    mapPageIndex = -1,
    infographicPageIndex = -1,
  ) {
    const pageWidth = 841.89;

    type TocEntry = {
      label: string;
      page: number;
      isSubItem: boolean;
    };

    const entries: TocEntry[] = [];
    if (mapPageIndex >= 0) {
      entries.push({
        label: 'Peta Sebaran Jaring Intelijen DKI Jakarta',
        page: mapPageIndex,
        isSubItem: false,
      });
    }
    if (infographicPageIndex >= 0) {
      entries.push({
        label: 'Infografis & Visualisasi Analitik Jaring',
        page: infographicPageIndex,
        isSubItem: false,
      });
    }
    if (recapTerritoryPageIndex >= 0) {
      entries.push({
        label: 'Rekapitulasi Persebaran Wilayah Jaring',
        page: recapTerritoryPageIndex,
        isSubItem: false,
      });
    }
    if (recapOccupationPageIndex >= 0) {
      entries.push({
        label: 'Rekapitulasi Klasifikasi Pekerjaan Jaring',
        page: recapOccupationPageIndex,
        isSubItem: false,
      });
    }

    const fallbackPage =
      recapTerritoryPageIndex >= 0 ? recapTerritoryPageIndex : 1;

    for (const group of groups) {
      const pPage = provincePageMap.get(group.provinceName) || fallbackPage;
      entries.push({
        label: `${group.provinceName} (${group.totalJaring.toLocaleString('id-ID')} Jaring)`,
        page: pPage,
        isSubItem: false,
      });

      for (const city of group.cities) {
        const cPage =
          cityPageMap.get(`${group.provinceName}::${city.cityName}`) || pPage;
        entries.push({
          label: `• ${city.cityName} (${city.totalJaring.toLocaleString('id-ID')} Jaring)`,
          page: cPage,
          isSubItem: true,
        });
      }
    }

    const maxEntriesPerPage = 44;
    let entryIndex = 0;

    for (let p = 0; p < pagesCount; p++) {
      doc.switchToPage(startPageIndex + p);

      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text('DAFTAR ISI', 0, 48, { align: 'center' });

      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor('#0ea5e9')
        .text('Rekapitulasi dan Pembagian Wilayah Jaring Kelurahan', 0, 74, {
          align: 'center',
        });

      doc
        .moveTo(120, 95)
        .lineTo(pageWidth - 120, 95)
        .lineWidth(1)
        .strokeColor('#e2e8f0')
        .stroke();

      const pageEntries = entries.slice(
        entryIndex,
        entryIndex + maxEntriesPerPage,
      );
      entryIndex += maxEntriesPerPage;

      const startY = 120;
      const isSingleColumn = pageEntries.length <= 15;

      if (isSingleColumn) {
        const colWidth = 500;
        const colX = (pageWidth - colWidth) / 2;
        this.renderTocColumn(doc, pageEntries, colX, startY, colWidth);
      } else {
        const itemsPerCol = Math.max(14, Math.ceil(pageEntries.length / 2));
        const colLeft = pageEntries.slice(0, itemsPerCol);
        const colRight = pageEntries.slice(itemsPerCol);

        const colWidth = 330;
        const leftX = 72;
        const rightX = 440;

        this.renderTocColumn(doc, colLeft, leftX, startY, colWidth);
        if (colRight.length > 0) {
          this.renderTocColumn(doc, colRight, rightX, startY, colWidth);
        }
      }
    }
  }

  private renderTocColumn(
    doc: PDFKit.PDFDocument,
    itemsList: Array<{ label: string; page: number; isSubItem: boolean }>,
    colX: number,
    startY: number,
    colWidth: number,
  ) {
    let y = startY;
    for (const item of itemsList) {
      const isSub = item.isSubItem;
      const textX = colX + (isSub ? 14 : 0);
      const fontSize = isSub ? 8.5 : 9.5;
      const fontName = isSub ? 'Helvetica' : 'Helvetica-Bold';
      const textColor = isSub ? '#334155' : '#0f172a';

      doc.fontSize(fontSize).font(fontName).fillColor(textColor);

      const labelText = item.label;
      const pageText = `Hal ${item.page}`;
      const labelW = doc.widthOfString(labelText);
      const pageW = doc.widthOfString(pageText);

      doc.text(labelText, textX, y, { lineBreak: false });

      const dotStartX = textX + labelW + 6;
      const dotEndX = colX + colWidth - pageW - 6;

      if (dotEndX > dotStartX) {
        doc.font('Helvetica').fillColor('#cbd5e1');
        const dotCount = Math.floor((dotEndX - dotStartX) / 5.5);
        const dotString = '. '.repeat(Math.max(0, dotCount));
        doc.text(dotString, dotStartX, y, {
          width: dotEndX - dotStartX,
          lineBreak: false,
        });
      }

      doc
        .font(isSub ? 'Helvetica' : 'Helvetica-Bold')
        .fillColor(isSub ? '#475569' : '#0f172a')
        .text(pageText, colX + colWidth - pageW, y, { lineBreak: false });

      y += isSub ? 19 : 23;
    }
  }

  /**
   * Tabel Baru: REKAPITULASI PERSEBARAN WILAYAH JARING
   * Menyajikan hierarki murni pembagian wilayah dari tingkat teratas hingga tingkat Kelurahan:
   * - Jika filter Provinsi / Tanpa Filter: KOTA/KABUPATEN -> KECAMATAN -> KELURAHAN -> JUMLAH JARING
   * - Jika filter Kota/Kabupaten: KOTA/KABUPATEN -> KECAMATAN -> KELURAHAN -> JUMLAH JARING
   * - Jika filter Kecamatan: KECAMATAN -> KELURAHAN -> JUMLAH JARING
   * - Jika filter Kelurahan: KELURAHAN -> JUMLAH JARING
   */
  private renderTerritoryRecapPages(
    doc: PDFKit.PDFDocument,
    groups: ProvinceGroup[],
    granularity: RecapGranularity,
    filterAreaName: string | null = null,
  ) {
    const startX = 36;
    const colWidths = [609, 160]; // Total = 769 pt
    const colHeaders = [
      'WILAYAH OPERASIONAL / TINGKAT ADMINISTRASI',
      'JUMLAH JARING',
    ];

    let currentY = 48;
    const rowHeight = 20;

    let totalAllJaring = 0;

    const drawHeader = (isContinued = false) => {
      const areaTitle = filterAreaName
        ? ` — ${filterAreaName.toUpperCase()}`
        : '';
      doc
        .fontSize(13)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text(
          `REKAPITULASI PERSEBARAN WILAYAH JARING${areaTitle}${isContinued ? ' (Lanjutan)' : ''}`,
          startX,
          currentY,
        );

      doc
        .fontSize(8.5)
        .font('Helvetica')
        .fillColor('#64748b')
        .text(
          'Penyajian data hierarkis berjenjang: Kota / Kabupaten Administrasi → Kecamatan → Kelurahan',
          startX,
          currentY + 18,
        );

      currentY += 34;

      doc.rect(startX, currentY, 769, 24).fillColor('#0f172a').fill();

      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#ffffff');
      doc.text(colHeaders[0], startX + 12, currentY + 7, {
        width: colWidths[0] - 24,
        align: 'left',
        lineBreak: false,
      });

      doc.text(colHeaders[1], startX + colWidths[0], currentY + 7, {
        width: colWidths[1],
        align: 'center',
        lineBreak: false,
      });

      currentY += 24;
    };

    drawHeader();

    const checkPageBreak = (neededHeight = rowHeight) => {
      if (540 - currentY < neededHeight) {
        doc.addPage();
        currentY = 48;
        drawHeader(true);
      }
    };

    for (const prov of groups) {
      for (const city of prov.cities) {
        // Hitung total jaring kota dari sum kecamatan
        let citySum = 0;
        for (const dist of city.districts) {
          citySum += dist.totalJaring;
        }
        totalAllJaring += citySum;

        // Level 1: KOTA / KABUPATEN
        checkPageBreak(rowHeight + 4);
        const cityY = currentY;
        doc.rect(startX, cityY, 769, 22).fillColor('#e2e8f0').fill();
        doc
          .rect(startX, cityY, 769, 22)
          .lineWidth(0.75)
          .strokeColor('#94a3b8')
          .stroke();

        doc
          .fontSize(9.5)
          .font('Helvetica-Bold')
          .fillColor('#0f172a')
          .text(city.cityName.toUpperCase(), startX + 12, cityY + 5.5, {
            width: colWidths[0] - 24,
            lineBreak: false,
          });

        doc
          .fontSize(9.5)
          .font('Helvetica-Bold')
          .fillColor('#0f172a')
          .text(
            `${citySum.toLocaleString('id-ID')} Orang`,
            startX + colWidths[0],
            cityY + 5.5,
            {
              width: colWidths[1],
              align: 'center',
              lineBreak: false,
            },
          );

        currentY += 22;

        for (const dist of city.districts) {
          // Hitung total jaring kecamatan dari sum kelurahan
          let distSum = 0;
          if (dist.villages.length > 0) {
            for (const vill of dist.villages) {
              distSum += vill.totalJaring;
            }
          } else {
            distSum = dist.totalJaring;
          }

          // Pastikan header Kecamatan tidak terpisah dari kelurahannya
          checkPageBreak(rowHeight * 2);

          // Level 2: KECAMATAN
          const distY = currentY;
          doc.rect(startX, distY, 769, 20).fillColor('#f1f5f9').fill();
          doc
            .rect(startX, distY, 769, 20)
            .lineWidth(0.5)
            .strokeColor('#cbd5e1')
            .stroke();

          const distNameDisplay = dist.districtName
            .toLowerCase()
            .startsWith('kecamatan')
            ? dist.districtName
            : `Kecamatan ${dist.districtName}`;

          doc
            .fontSize(8.5)
            .font('Helvetica-Bold')
            .fillColor('#1e293b')
            .text(distNameDisplay, startX + 28, distY + 5, {
              width: colWidths[0] - 40,
              lineBreak: false,
            });

          doc
            .fontSize(8.5)
            .font('Helvetica-Bold')
            .fillColor('#1e293b')
            .text(
              `${distSum.toLocaleString('id-ID')} Orang`,
              startX + colWidths[0],
              distY + 5,
              {
                width: colWidths[1],
                align: 'center',
                lineBreak: false,
              },
            );

          currentY += 20;

          // Level 3: KELURAHAN
          let villRowIdx = 0;
          if (dist.villages.length > 0) {
            for (const vill of dist.villages) {
              checkPageBreak(rowHeight);
              const villY = currentY;

              if (villRowIdx % 2 === 1) {
                doc.rect(startX, villY, 769, 19).fillColor('#f8fafc').fill();
              }

              doc
                .moveTo(startX, villY + 19)
                .lineTo(startX + 769, villY + 19)
                .lineWidth(0.5)
                .strokeColor('#e2e8f0')
                .stroke();

              doc
                .moveTo(startX + colWidths[0], villY)
                .lineTo(startX + colWidths[0], villY + 19)
                .lineWidth(0.5)
                .strokeColor('#e2e8f0')
                .stroke();

              doc
                .fontSize(8)
                .font('Helvetica')
                .fillColor('#334155')
                .text(`•  ${vill.villageName}`, startX + 48, villY + 5, {
                  width: colWidths[0] - 60,
                  lineBreak: false,
                });

              doc
                .fontSize(8)
                .font('Helvetica')
                .fillColor('#334155')
                .text(
                  `${vill.totalJaring.toLocaleString('id-ID')} Orang`,
                  startX + colWidths[0],
                  villY + 5,
                  {
                    width: colWidths[1],
                    align: 'center',
                    lineBreak: false,
                  },
                );

              currentY += 19;
              villRowIdx++;
            }
          } else {
            // Jika tidak ada data kelurahan terpisah
            checkPageBreak(rowHeight);
            const villY = currentY;
            doc
              .moveTo(startX, villY + 19)
              .lineTo(startX + 769, villY + 19)
              .lineWidth(0.5)
              .strokeColor('#e2e8f0')
              .stroke();

            doc
              .fontSize(8)
              .font('Helvetica')
              .fillColor('#64748b')
              .text(
                '•  Kelurahan Terdata di Wilayah Ini',
                startX + 48,
                villY + 5,
                {
                  width: colWidths[0] - 60,
                  lineBreak: false,
                },
              );

            doc
              .fontSize(8)
              .font('Helvetica')
              .fillColor('#334155')
              .text(
                `${distSum.toLocaleString('id-ID')} Orang`,
                startX + colWidths[0],
                villY + 5,
                {
                  width: colWidths[1],
                  align: 'center',
                  lineBreak: false,
                },
              );

            currentY += 19;
          }
        }
      }
    }

    // Baris Total Keseluruhan
    checkPageBreak(28);
    doc.rect(startX, currentY, 769, 24).fillColor('#cbd5e1').fill();
    doc
      .rect(startX, currentY, 769, 24)
      .lineWidth(1)
      .strokeColor('#475569')
      .stroke();

    doc
      .fontSize(9.5)
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text(
        'TOTAL KESELURUHAN JARING OPERASIONAL',
        startX + 12,
        currentY + 6.5,
        {
          width: colWidths[0] - 24,
          align: 'left',
          lineBreak: false,
        },
      );

    doc
      .moveTo(startX + colWidths[0], currentY)
      .lineTo(startX + colWidths[0], currentY + 24)
      .lineWidth(1)
      .strokeColor('#475569')
      .stroke();

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text(
        `${totalAllJaring.toLocaleString('id-ID')} Orang`,
        startX + colWidths[0],
        currentY + 6,
        {
          width: colWidths[1],
          align: 'center',
          lineBreak: false,
        },
      );
  }

  /**
   * Halaman Peta Sebaran Jaring DKI Jakarta
   */
  private async renderMapPage(
    doc: PDFKit.PDFDocument,
    stats: ProfilingStatistics,
    filterAreaName: string | null = null,
  ): Promise<void> {
    const startX = 36;
    let currentY = 40;

    // Header Halaman
    const areaTitle = filterAreaName
      ? ` — ${filterAreaName.toUpperCase()}`
      : '';
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text(
        `PETA SEBARAN JARING INTELIJEN OPERASIONAL${areaTitle}`,
        startX,
        currentY,
      );

    doc
      .fontSize(8.5)
      .font('Helvetica')
      .fillColor('#0284c7')
      .text(
        'Provinsi DKI Jakarta — Visualisasi Geografis Tingkat Kota / Kabupaten Administrasi',
        startX,
        currentY + 18,
      );

    currentY += 34;

    // 3 Top KPI Summary Cards
    const cardWidth = 248;
    const cardHeight = 44;
    const cardGap = 12;

    // Card 1: Total Jaring
    const c1X = startX;
    doc.rect(c1X, currentY, cardWidth, cardHeight).fillColor('#f0f9ff').fill();
    doc
      .rect(c1X, currentY, cardWidth, cardHeight)
      .lineWidth(1)
      .strokeColor('#bae6fd')
      .stroke();
    doc
      .fontSize(7.5)
      .font('Helvetica-Bold')
      .fillColor('#0369a1')
      .text('TOTAL JARING TERVERIFIKASI', c1X + 12, currentY + 7);
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#0c4a6e')
      .text(
        `${stats.summary.total.toLocaleString('id-ID')} Orang`,
        c1X + 12,
        currentY + 18,
      );
    doc
      .fontSize(7)
      .font('Helvetica')
      .fillColor('#0284c7')
      .text('100% Tercatat Dalam Sistem', c1X + 130, currentY + 23);

    // Card 2: Jaring Aktif
    const c2X = c1X + cardWidth + cardGap;
    doc.rect(c2X, currentY, cardWidth, cardHeight).fillColor('#f0fdf4').fill();
    doc
      .rect(c2X, currentY, cardWidth, cardHeight)
      .lineWidth(1)
      .strokeColor('#bbf7d0')
      .stroke();
    doc
      .fontSize(7.5)
      .font('Helvetica-Bold')
      .fillColor('#15803d')
      .text('STATUS JARING AKTIF', c2X + 12, currentY + 7);
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#14532d')
      .text(
        `${stats.summary.active.toLocaleString('id-ID')} Orang`,
        c2X + 12,
        currentY + 18,
      );
    doc
      .fontSize(7)
      .font('Helvetica')
      .fillColor('#16a34a')
      .text(
        `${stats.summary.activePercentage}% Siap Operasional`,
        c2X + 130,
        currentY + 23,
      );

    // Card 3: Tidak Aktif
    const c3X = c2X + cardWidth + cardGap;
    doc.rect(c3X, currentY, cardWidth, cardHeight).fillColor('#fefce8').fill();
    doc
      .rect(c3X, currentY, cardWidth, cardHeight)
      .lineWidth(1)
      .strokeColor('#fef08a')
      .stroke();
    doc
      .fontSize(7.5)
      .font('Helvetica-Bold')
      .fillColor('#a16207')
      .text('STATUS TIDAK AKTIF / PASIF', c3X + 12, currentY + 7);
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#713f12')
      .text(
        `${stats.summary.inactive.toLocaleString('id-ID')} Orang`,
        c3X + 12,
        currentY + 18,
      );
    doc
      .fontSize(7)
      .font('Helvetica')
      .fillColor('#ca8a04')
      .text(
        `${stats.summary.inactivePercentage}% Evaluasi Wilayah`,
        c3X + 130,
        currentY + 23,
      );

    currentY += cardHeight + 10;

    // Visual Peta DKI Jakarta (SVG -> PNG via sharp)
    const mapPngBuffer = await this.generateDkiMapPng(stats);
    doc.image(mapPngBuffer, startX, currentY, { width: 769, height: 320 });

    currentY += 326;

    // Panel Legenda & Informasi di Bawah Peta
    doc.rect(startX, currentY, 769, 58).fillColor('#f8fafc').fill();
    doc
      .rect(startX, currentY, 769, 58)
      .lineWidth(0.75)
      .strokeColor('#cbd5e1')
      .stroke();

    // Legenda Gradasi Warna
    doc
      .fontSize(8)
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text('LEGENDA TINGKAT PERSEBARAN WILAYAH:', startX + 14, currentY + 10);

    const swatches = [
      { color: '#f1f5f9', border: '#cbd5e1', label: '0 Jaring' },
      { color: '#e0f2fe', border: '#bae6fd', label: 'Rendah (1–25%)' },
      { color: '#7dd3fc', border: '#38bdf8', label: 'Sedang (26–50%)' },
      { color: '#0284c7', border: '#0284c7', label: 'Tinggi (51–75%)' },
      { color: '#0369a1', border: '#0369a1', label: 'Sangat Tinggi (76–100%)' },
    ];

    let legX = startX + 14;
    const legY = currentY + 26;
    for (const s of swatches) {
      doc.rect(legX, legY, 12, 12).fillColor(s.color).fill();
      doc
        .rect(legX, legY, 12, 12)
        .lineWidth(0.5)
        .strokeColor(s.border)
        .stroke();
      doc
        .fontSize(7.5)
        .font('Helvetica')
        .fillColor('#334155')
        .text(s.label, legX + 16, legY + 2);
      legX += doc.widthOfString(s.label) + 26;
    }

    // Informasi Ringkasan Basis Data (Kanan)
    const infoTextX = 500;
    doc
      .fontSize(7.5)
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text(
        `CAKUPAN: 6 Kota/Kabupaten Administrasi DKI Jakarta`,
        infoTextX,
        currentY + 12,
      );
    doc
      .fontSize(7.5)
      .font('Helvetica')
      .fillColor('#475569')
      .text(
        `Total Basis Data: ${stats.summary.total.toLocaleString('id-ID')} Jaring Terverifikasi`,
        infoTextX,
        currentY + 25,
      );
    doc
      .fontSize(7)
      .font('Helvetica-Oblique')
      .fillColor('#64748b')
      .text(
        'Sumber Data Sinkron: Profiling & Rekapitulasi Jaring Intelijen',
        infoTextX,
        currentY + 38,
      );
  }

  private async generateDkiMapPng(stats: ProfilingStatistics): Promise<Buffer> {
    const dki = stats.wilayah.dkiCounts;
    const total = stats.summary.total;
    const maxVal = Math.max(
      1,
      dki.jakartaPusat,
      dki.jakartaUtara,
      dki.jakartaBarat,
      dki.jakartaSelatan,
      dki.jakartaTimur,
      dki.kepulauanSeribu,
    );

    const getColor = (val: number): string => {
      if (val === 0) return '#f1f5f9';
      const r = val / maxVal;
      if (r < 0.25) return '#e0f2fe';
      if (r < 0.5) return '#7dd3fc';
      if (r < 0.75) return '#0284c7';
      return '#0369a1';
    };

    const getPct = (val: number): string => {
      return total > 0
        ? `${(Math.round((val / total) * 1000) / 10).toFixed(1)}%`
        : '0%';
    };

    const cPusat = getColor(dki.jakartaPusat);
    const cUtara = getColor(dki.jakartaUtara);
    const cBarat = getColor(dki.jakartaBarat);
    const cSelatan = getColor(dki.jakartaSelatan);
    const cTimur = getColor(dki.jakartaTimur);
    const cSeribu = getColor(dki.kepulauanSeribu);

    const width = 769;
    const height = 320;

    const badges = [
      {
        name: 'KOTA ADM. JAKARTA UTARA',
        count: dki.jakartaUtara,
        pct: getPct(dki.jakartaUtara),
        x: 485,
        y: 50,
        w: 145,
        h: 42,
      },
      {
        name: 'JAKARTA BARAT',
        count: dki.jakartaBarat,
        pct: getPct(dki.jakartaBarat),
        x: 310,
        y: 110,
        w: 125,
        h: 42,
      },
      {
        name: 'JAKARTA PUSAT',
        count: dki.jakartaPusat,
        pct: getPct(dki.jakartaPusat),
        x: 440,
        y: 130,
        w: 110,
        h: 42,
      },
      {
        name: 'JAKARTA SELATAN',
        count: dki.jakartaSelatan,
        pct: getPct(dki.jakartaSelatan),
        x: 375,
        y: 220,
        w: 135,
        h: 42,
      },
      {
        name: 'JAKARTA TIMUR',
        count: dki.jakartaTimur,
        pct: getPct(dki.jakartaTimur),
        x: 580,
        y: 185,
        w: 145,
        h: 42,
      },
    ];

    let badgeSvgs = '';
    for (const b of badges) {
      badgeSvgs += `
        <g transform="translate(${b.x - b.w / 2}, ${b.y - b.h / 2})">
          <rect width="${b.w}" height="${b.h}" rx="5" fill="#ffffff" fill-opacity="0.95" stroke="#94a3b8" stroke-width="1"/>
          <text x="${b.w / 2}" y="14" font-family="Helvetica, Arial, sans-serif" font-size="8.5" font-weight="bold" fill="#1e293b" text-anchor="middle">${b.name}</text>
          <text x="${b.w / 2}" y="28" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="bold" fill="#0284c7" text-anchor="middle">${b.count.toLocaleString('id-ID')} Orang</text>
          <text x="${b.w / 2}" y="38" font-family="Helvetica, Arial, sans-serif" font-size="7" fill="#64748b" text-anchor="middle">Proporsi: ${b.pct}</text>
        </g>
      `;
    }

    const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background Canvas -->
  <rect width="${width}" height="${height}" fill="#f8fafc" rx="8" stroke="#e2e8f0" stroke-width="1"/>

  <!-- Mainland DKI Jakarta Real GeoJSON Polygons -->
  <g stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round">
    <path d="${DKI_MAP_PATHS.jakartaUtara}" fill="${cUtara}" />
    <path d="${DKI_MAP_PATHS.jakartaBarat}" fill="${cBarat}" />
    <path d="${DKI_MAP_PATHS.jakartaPusat}" fill="${cPusat}" />
    <path d="${DKI_MAP_PATHS.jakartaSelatan}" fill="${cSelatan}" />
    <path d="${DKI_MAP_PATHS.jakartaTimur}" fill="${cTimur}" />
  </g>

  <!-- Inset Laut Teluk Jakarta & Kepulauan Seribu -->
  <g transform="translate(20, 16)">
    <!-- Container -->
    <rect width="180" height="288" rx="8" fill="#f0f9ff" fill-opacity="0.95" stroke="#38bdf8" stroke-width="1.25" stroke-dasharray="4,4"/>
    <!-- Inset Header Banner -->
    <rect width="180" height="24" rx="8" fill="#0284c7"/>
    <rect y="14" width="180" height="10" fill="#0284c7"/>
    <text x="90" y="16" font-family="Helvetica, Arial, sans-serif" font-size="8.5" font-weight="bold" fill="#ffffff" text-anchor="middle" letter-spacing="0.03em">Kepulauan Seribu - Inset</text>
    <text x="90" y="38" font-family="Helvetica, Arial, sans-serif" font-size="7" fill="#0369a1" text-anchor="middle">Laut Jawa / Teluk Jakarta</text>

    <!-- Real Islands MultiPolygon -->
    <path d="${DKI_MAP_PATHS.kepulauanSeribu}" fill="${cSeribu}" stroke="#0284c7" stroke-width="1" stroke-linejoin="round"/>

    <!-- Inset Summary Badge -->
    <g transform="translate(15, 226)">
      <rect width="150" height="48" rx="6" fill="#ffffff" fill-opacity="0.97" stroke="#94a3b8" stroke-width="1"/>
      <text x="75" y="15" font-family="Helvetica, Arial, sans-serif" font-size="8.5" font-weight="bold" fill="#1e293b" text-anchor="middle">KAB. KEP. SERIBU</text>
      <text x="75" y="30" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="bold" fill="#0284c7" text-anchor="middle">${dki.kepulauanSeribu.toLocaleString('id-ID')} Orang</text>
      <text x="75" y="42" font-family="Helvetica, Arial, sans-serif" font-size="7" fill="#64748b" text-anchor="middle">Proporsi: ${getPct(dki.kepulauanSeribu)}</text>
    </g>
  </g>

  <!-- Centroid Badges on Mainland -->
  ${badgeSvgs}

  <!-- Arah Mata Angin (Kompas Rose) -->
  <g transform="translate(730, 36)">
    <circle cx="0" cy="0" r="16" fill="#ffffff" stroke="#cbd5e1" stroke-width="1"/>
    <polygon points="0,-12 3.5,0 -3.5,0" fill="#dc2626"/>
    <polygon points="0,12 3.5,0 -3.5,0" fill="#94a3b8"/>
    <text x="0" y="-14" font-family="Helvetica, Arial, sans-serif" font-size="7" font-weight="bold" fill="#dc2626" text-anchor="middle">U</text>
  </g>
</svg>
    `;

    return sharp(Buffer.from(svg), { density: 150 }).png().toBuffer();
  }

  /**
   * Halaman Infografis Jaring & Visualisasi Data / Chart
   */
  private async renderInfographicPages(
    doc: PDFKit.PDFDocument,
    stats: ProfilingStatistics,
  ): Promise<void> {
    const startX = 36;

    // ==========================================
    // HALAMAN 1: SEBARAN WILAYAH & STATUS OPERASIONAL
    // ==========================================
    let currentY = 40;

    // Header Halaman
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text(
        'INFOGRAFIS DATA JARING: SEBARAN WILAYAH & STATUS OPERASIONAL',
        startX,
        currentY,
      );

    doc
      .fontSize(8.5)
      .font('Helvetica')
      .fillColor('#0284c7')
      .text(
        'Visualisasi analitik persebaran wilayah administratif, status operasional, dan komposisi gender.',
        startX,
        currentY + 18,
      );

    currentY += 34;

    // Top 3 Summary Cards
    const cardWidth = 248;
    const cardHeight = 44;
    const cardGap = 12;

    // Card 1: Total Jaring
    const c1X = startX;
    doc.rect(c1X, currentY, cardWidth, cardHeight).fillColor('#f0f9ff').fill();
    doc
      .rect(c1X, currentY, cardWidth, cardHeight)
      .lineWidth(1)
      .strokeColor('#bae6fd')
      .stroke();
    doc
      .fontSize(7.5)
      .font('Helvetica-Bold')
      .fillColor('#0369a1')
      .text('TOTAL JARING TERVERIFIKASI', c1X + 12, currentY + 7);
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#0c4a6e')
      .text(
        `${stats.summary.total.toLocaleString('id-ID')} Orang`,
        c1X + 12,
        currentY + 18,
      );
    doc
      .fontSize(7)
      .font('Helvetica')
      .fillColor('#0284c7')
      .text('100% Tercatat Dalam Sistem', c1X + 130, currentY + 23);

    // Card 2: Jaring Aktif
    const c2X = c1X + cardWidth + cardGap;
    doc.rect(c2X, currentY, cardWidth, cardHeight).fillColor('#f0fdf4').fill();
    doc
      .rect(c2X, currentY, cardWidth, cardHeight)
      .lineWidth(1)
      .strokeColor('#bbf7d0')
      .stroke();
    doc
      .fontSize(7.5)
      .font('Helvetica-Bold')
      .fillColor('#15803d')
      .text('STATUS JARING AKTIF', c2X + 12, currentY + 7);
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#14532d')
      .text(
        `${stats.summary.active.toLocaleString('id-ID')} Orang`,
        c2X + 12,
        currentY + 18,
      );
    doc
      .fontSize(7)
      .font('Helvetica')
      .fillColor('#16a34a')
      .text(
        `${stats.summary.activePercentage}% Siap Operasional`,
        c2X + 130,
        currentY + 23,
      );

    // Card 3: Tidak Aktif
    const c3X = c2X + cardWidth + cardGap;
    doc.rect(c3X, currentY, cardWidth, cardHeight).fillColor('#fefce8').fill();
    doc
      .rect(c3X, currentY, cardWidth, cardHeight)
      .lineWidth(1)
      .strokeColor('#fef08a')
      .stroke();
    doc
      .fontSize(7.5)
      .font('Helvetica-Bold')
      .fillColor('#a16207')
      .text('STATUS TIDAK AKTIF / PASIF', c3X + 12, currentY + 7);
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#713f12')
      .text(
        `${stats.summary.inactive.toLocaleString('id-ID')} Orang`,
        c3X + 12,
        currentY + 18,
      );
    doc
      .fontSize(7)
      .font('Helvetica')
      .fillColor('#ca8a04')
      .text(
        `${stats.summary.inactivePercentage}% Evaluasi Wilayah`,
        c3X + 130,
        currentY + 23,
      );

    currentY += cardHeight + 14;

    const contentStartY = currentY;

    // Kolom Kiri: Horizontal Bar Chart Sebaran Wilayah
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text('A. SEBARAN JARING PER KOTA / KABUPATEN', startX, contentStartY);

    doc
      .fontSize(7.5)
      .font('Helvetica')
      .fillColor('#64748b')
      .text(
        'Perbandingan jumlah jaring antar wilayah administratif (terbesar ke terkecil)',
        startX,
        contentStartY + 14,
      );

    const barBoxY = contentStartY + 30;
    const barBoxW = 410;
    const barBoxH = 370;

    doc.rect(startX, barBoxY, barBoxW, barBoxH).fillColor('#f8fafc').fill();
    doc
      .rect(startX, barBoxY, barBoxW, barBoxH)
      .lineWidth(0.75)
      .strokeColor('#e2e8f0')
      .stroke();

    const rankedCities = stats.wilayah.citiesRanked.slice(0, 8);
    const maxCityVal = Math.max(1, ...rankedCities.map((c) => c.totalJaring));

    let barRowY = barBoxY + 18;
    for (let i = 0; i < rankedCities.length; i++) {
      const city = rankedCities[i];
      const barTrackW = 160;
      const barFillW = Math.max(
        4,
        Math.round((city.totalJaring / maxCityVal) * barTrackW),
      );

      // City Name
      doc
        .fontSize(8)
        .font('Helvetica-Bold')
        .fillColor('#1e293b')
        .text(`${i + 1}. ${city.cityName}`, startX + 12, barRowY + 3, {
          width: 125,
          lineBreak: false,
        });

      // Track
      doc
        .rect(startX + 142, barRowY + 2, barTrackW, 14)
        .fillColor('#e2e8f0')
        .fill();
      // Fill
      doc
        .rect(startX + 142, barRowY + 2, barFillW, 14)
        .fillColor('#0284c7')
        .fill();

      // Number & %
      doc
        .fontSize(7.5)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text(
          `${city.totalJaring.toLocaleString('id-ID')} Orang (${city.percentage}%)`,
          startX + 142 + barTrackW + 8,
          barRowY + 3,
          { width: 90, lineBreak: false },
        );

      barRowY += 38;
    }

    // Kolom Kanan: Donut Chart Status & Donut Chart Gender
    const rightColX = startX + barBoxW + 15;
    const rightColW = 769 - barBoxW - 15; // 344 pt

    // B. Status Jaring
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text('B. STATUS KEAKTIFAN JARING', rightColX, contentStartY);
    doc
      .fontSize(7.5)
      .font('Helvetica')
      .fillColor('#64748b')
      .text(
        'Komposisi kesiapan jaring operasional aktif vs pasif',
        rightColX,
        contentStartY + 14,
      );

    const statusDonutPng = await this.generateDonutChartPng(
      stats.summary.total,
      stats.statuses.items,
      'STATUS',
      rightColW,
      160,
    );
    doc.image(statusDonutPng, rightColX, contentStartY + 30, {
      width: rightColW,
      height: 160,
    });

    // C. Jenis Kelamin
    const genderSectionY = contentStartY + 205;
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text('C. KOMPOSISI JENIS KELAMIN', rightColX, genderSectionY);
    doc
      .fontSize(7.5)
      .font('Helvetica')
      .fillColor('#64748b')
      .text(
        'Proporsi demografis jaring laki-laki dan perempuan',
        rightColX,
        genderSectionY + 14,
      );

    const genderDonutPng = await this.generateDonutChartPng(
      stats.summary.total,
      stats.gender.items,
      'GENDER',
      rightColW,
      160,
    );
    doc.image(genderDonutPng, rightColX, genderSectionY + 30, {
      width: rightColW,
      height: 160,
    });

    // ==========================================
    // HALAMAN 2: USIA, GENERASI & KLASIFIKASI PEKERJAAN
    // ==========================================
    doc.addPage();
    currentY = 40;

    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text(
        'INFOGRAFIS DEMOGRAFI & KLASIFIKASI PEKERJAAN JARING',
        startX,
        currentY,
      );

    doc
      .fontSize(8.5)
      .font('Helvetica')
      .fillColor('#0284c7')
      .text(
        'Analisis komprehensif rentang usia, klasifikasi generasi, dan peta dominasi profesi jaring.',
        startX,
        currentY + 18,
      );

    currentY += 34;

    // Top Section: Usia (Kiri) dan Generasi (Kanan)
    const topChartW = 376;
    const topChartH = 145;

    // D. Komposisi Usia
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text('D. KOMPOSISI BERDASARKAN RENTANG USIA', startX, currentY);
    doc
      .fontSize(7.5)
      .font('Helvetica')
      .fillColor('#64748b')
      .text(
        'Distribusi usia operasional jaring (tahun)',
        startX,
        currentY + 14,
      );

    const ageChartPng = await this.generateBarChartPng(
      'Rentang Usia',
      stats.ageGroups.items.map((a) => ({
        label: a.range,
        count: a.count,
        percentage: a.percentage,
      })),
      '#0ea5e9',
      topChartW,
      topChartH,
    );
    doc.image(ageChartPng, startX, currentY + 28, {
      width: topChartW,
      height: topChartH,
    });

    // E. Komposisi Generasi
    const genX = startX + topChartW + 17;
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text('E. DISTRIBUSI KELOMPOK GENERASI', genX, currentY);
    doc
      .fontSize(7.5)
      .font('Helvetica')
      .fillColor('#64748b')
      .text(
        'Klasifikasi generasi berdasarkan tahun kelahiran',
        genX,
        currentY + 14,
      );

    const genChartPng = await this.generateBarChartPng(
      'Kelompok Generasi',
      stats.generations.items.map((g) => ({
        label: g.name,
        count: g.count,
        percentage: g.percentage,
      })),
      '#6366f1',
      topChartW,
      topChartH,
    );
    doc.image(genChartPng, genX, currentY + 28, {
      width: topChartW,
      height: topChartH,
    });

    currentY += topChartH + 38;

    // Bottom Section: Klasifikasi Pekerjaan (Word Cloud + Legend Presisi)
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text('F. KLASIFIKASI PEKERJAAN (10 KATEGORI UTAMA)', startX, currentY);
    doc
      .fontSize(7.5)
      .font('Helvetica')
      .fillColor('#64748b')
      .text(
        'Word Cloud merefleksikan dominasi visual, tabel legenda menyajikan angka presisi.',
        startX,
        currentY + 14,
      );

    currentY += 28;

    const occCloudW = 330;
    const occCloudH = 224;

    const wordCloudPng = await this.generateWordCloudPng(
      stats.occupations.topCategories,
      620,
      420,
    );
    doc.image(wordCloudPng, startX, currentY, {
      width: occCloudW,
      height: occCloudH,
    });

    // Precision Legend Table (Kanan)
    const legTableX = startX + occCloudW + 14;
    const legTableW = 769 - occCloudW - 14; // 425 pt
    const legRowH = 17;

    // Table Header
    doc.rect(legTableX, currentY, legTableW, 20).fillColor('#0f172a').fill();
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('NO.', legTableX + 4, currentY + 5.5, {
      width: 24,
      align: 'center',
    });
    doc.text('KATEGORI PEKERJAAN', legTableX + 32, currentY + 5.5, {
      width: 220,
    });
    doc.text('JUMLAH', legTableX + 256, currentY + 5.5, {
      width: 85,
      align: 'center',
    });
    doc.text('%', legTableX + 345, currentY + 5.5, {
      width: 70,
      align: 'center',
    });

    let tRowY = currentY + 20;
    const topOccs = stats.occupations.topCategories;

    for (let idx = 0; idx < topOccs.length; idx++) {
      const occ = topOccs[idx];
      const isLainnya = occ.name === 'Lainnya';
      const isWiraswasta = occ.name === 'Wiraswasta';

      if (idx % 2 === 1) {
        doc
          .rect(legTableX, tRowY, legTableW, legRowH)
          .fillColor('#f8fafc')
          .fill();
      }

      doc
        .moveTo(legTableX, tRowY + legRowH)
        .lineTo(legTableX + legTableW, tRowY + legRowH)
        .lineWidth(0.5)
        .strokeColor('#e2e8f0')
        .stroke();

      doc
        .fontSize(7.5)
        .font('Helvetica')
        .fillColor(isLainnya ? '#94a3b8' : '#475569')
        .text(`${idx + 1}.`, legTableX + 4, tRowY + 4, {
          width: 24,
          align: 'center',
        });

      doc
        .fontSize(7.5)
        .font(isWiraswasta ? 'Helvetica-Bold' : 'Helvetica')
        .fillColor(isWiraswasta ? '#0369a1' : isLainnya ? '#64748b' : '#1e293b')
        .text(occ.name, legTableX + 32, tRowY + 4, {
          width: 220,
          lineBreak: false,
        });

      doc
        .fontSize(7.5)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text(
          `${occ.count.toLocaleString('id-ID')} Orang`,
          legTableX + 256,
          tRowY + 4,
          {
            width: 85,
            align: 'center',
            lineBreak: false,
          },
        );

      doc
        .fontSize(7.5)
        .font('Helvetica')
        .fillColor('#475569')
        .text(`${occ.percentage}%`, legTableX + 345, tRowY + 4, {
          width: 70,
          align: 'center',
          lineBreak: false,
        });

      tRowY += legRowH;
    }

    // Total Row
    doc.rect(legTableX, tRowY, legTableW, 20).fillColor('#e2e8f0').fill();
    doc
      .rect(legTableX, tRowY, legTableW, 20)
      .lineWidth(0.75)
      .strokeColor('#64748b')
      .stroke();

    doc
      .fontSize(8)
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text('TOTAL JARING', legTableX + 32, tRowY + 5.5, { width: 220 });

    doc
      .fontSize(8)
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text(
        `${stats.summary.total.toLocaleString('id-ID')} Orang`,
        legTableX + 256,
        tRowY + 5.5,
        {
          width: 85,
          align: 'center',
        },
      );

    doc
      .fontSize(8)
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text('100%', legTableX + 345, tRowY + 5.5, {
        width: 70,
        align: 'center',
      });
  }

  private async generateDonutChartPng(
    totalValue: number,
    slices: Array<{
      label: string;
      count: number;
      percentage: number;
      color: string;
    }>,
    centerLabel = 'TOTAL',
    width = 330,
    height = 135,
  ): Promise<Buffer> {
    const cx = 70;
    const cy = 68;
    const rOut = 50;
    const rIn = 32;

    const totalCount = slices.reduce((acc, s) => acc + s.count, 0);

    let pathElements = '';
    let currentAngle = -Math.PI / 2; // start 12 o'clock

    if (totalCount === 0) {
      pathElements = `<circle cx="${cx}" cy="${cy}" r="${rOut}" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1"/>
      <circle cx="${cx}" cy="${cy}" r="${rIn}" fill="#ffffff"/>`;
    } else {
      for (const slice of slices) {
        if (slice.count <= 0) continue;
        const angle = (slice.count / totalCount) * 2 * Math.PI;
        const nextAngle = currentAngle + angle;

        if (slice.count === totalCount) {
          pathElements += `<circle cx="${cx}" cy="${cy}" r="${rOut}" fill="${slice.color}"/>
          <circle cx="${cx}" cy="${cy}" r="${rIn}" fill="#ffffff"/>`;
        } else {
          const x1 = cx + rOut * Math.cos(currentAngle);
          const y1 = cy + rOut * Math.sin(currentAngle);
          const x2 = cx + rOut * Math.cos(nextAngle);
          const y2 = cy + rOut * Math.sin(nextAngle);

          const x3 = cx + rIn * Math.cos(nextAngle);
          const y3 = cy + rIn * Math.sin(nextAngle);
          const x4 = cx + rIn * Math.cos(currentAngle);
          const y4 = cy + rIn * Math.sin(currentAngle);

          const largeArc = angle > Math.PI ? 1 : 0;
          const d = `M ${x1} ${y1} A ${rOut} ${rOut} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${rIn} ${rIn} 0 ${largeArc} 0 ${x4} ${y4} Z`;
          pathElements += `<path d="${d}" fill="${slice.color}" stroke="#ffffff" stroke-width="1.5"/>`;
        }
        currentAngle = nextAngle;
      }
    }

    let legendElements = '';
    let legY = 32;
    for (const slice of slices) {
      legendElements += `
        <rect x="145" y="${legY}" width="10" height="10" rx="2" fill="${slice.color}"/>
        <text x="162" y="${legY + 9}" font-family="Helvetica, Arial, sans-serif" font-size="8.5" font-weight="bold" fill="#1e293b">${slice.label}</text>
        <text x="162" y="${legY + 22}" font-family="Helvetica, Arial, sans-serif" font-size="8" fill="#475569">${slice.count.toLocaleString('id-ID')} Orang (${slice.percentage}%)</text>
      `;
      legY += 34;
    }

    const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#f8fafc" rx="6" stroke="#e2e8f0" stroke-width="1"/>
  ${pathElements}
  <text x="${cx}" y="${cy - 7}" font-family="Helvetica, Arial, sans-serif" font-size="7" font-weight="bold" fill="#64748b" text-anchor="middle">${centerLabel}</text>
  <text x="${cx}" y="${cy + 6}" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="bold" fill="#0f172a" text-anchor="middle">${totalValue.toLocaleString('id-ID')}</text>
  <text x="${cx}" y="${cy + 17}" font-family="Helvetica, Arial, sans-serif" font-size="6.5" fill="#64748b" text-anchor="middle">JARING</text>
  ${legendElements}
</svg>
    `;

    return sharp(Buffer.from(svg), { density: 150 }).png().toBuffer();
  }

  private async generateBarChartPng(
    title: string,
    items: Array<{ label: string; count: number; percentage: number }>,
    barColor = '#0ea5e9',
    width = 370,
    height = 145,
  ): Promise<Buffer> {
    const maxVal = Math.max(1, ...items.map((i) => i.count));
    const plotX = 20;
    const plotY = 25;
    const plotWidth = width - 40;
    const plotHeight = 85;

    const numBars = items.length;
    const slotWidth = plotWidth / numBars;
    const barWidth = Math.min(36, slotWidth * 0.65);

    let barsSvg = '';
    for (let i = 0; i < numBars; i++) {
      const item = items[i];
      const barH = (item.count / maxVal) * plotHeight;
      const bx = plotX + i * slotWidth + (slotWidth - barWidth) / 2;
      const by = plotY + plotHeight - barH;

      barsSvg += `
        <rect x="${bx}" y="${by}" width="${barWidth}" height="${barH}" rx="3" fill="${barColor}"/>
        <text x="${bx + barWidth / 2}" y="${by - 4}" font-family="Helvetica, Arial, sans-serif" font-size="7.5" font-weight="bold" fill="#0f172a" text-anchor="middle">${item.count}</text>
        <text x="${bx + barWidth / 2}" y="${plotY + plotHeight + 14}" font-family="Helvetica, Arial, sans-serif" font-size="7" font-weight="bold" fill="#334155" text-anchor="middle">${item.label}</text>
        <text x="${bx + barWidth / 2}" y="${plotY + plotHeight + 25}" font-family="Helvetica, Arial, sans-serif" font-size="6.5" fill="#64748b" text-anchor="middle">${item.percentage}%</text>
      `;
    }

    const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#f8fafc" rx="6" stroke="#e2e8f0" stroke-width="1"/>
  <line x1="${plotX}" y1="${plotY + plotHeight}" x2="${plotX + plotWidth}" y2="${plotY + plotHeight}" stroke="#cbd5e1" stroke-width="1"/>
  <line x1="${plotX}" y1="${plotY + plotHeight / 2}" x2="${plotX + plotWidth}" y2="${plotY + plotHeight / 2}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="3,3"/>
  ${barsSvg}
</svg>
    `;

    return sharp(Buffer.from(svg), { density: 150 }).png().toBuffer();
  }

  private async generateWordCloudPng(
    occupations: Array<{ name: string; count: number; percentage: number }>,
    width = 620,
    height = 420,
  ): Promise<Buffer> {
    const SHORT_LABELS: Record<string, string> = {
      'Karyawan Swasta / Buruh': 'Karyawan Swasta',
      'Karyawan Swasta / BUMN': 'Karyawan Swasta',
      'Pedagang / Perniagaan': 'Pedagang',
      'Pengemudi / Ojek Online / Kurir': 'Pengemudi / Ojol',
      'Profesional / Tenaga Ahli': 'Profesional',
      'Pegawai Negeri / ASN / TNI / Polri': 'PNS / TNI / Polri',
      'Petani / Nelayan / Peternak': 'Petani / Nelayan',
      'Pelajar / Mahasiswa': 'Pelajar / Mahasiswa',
      'Ibu Rumah Tangga': 'Ibu Rumah Tangga',
      'Wiraswasta': 'Wiraswasta',
      'Lainnya': 'Lainnya',
    };

    const getShortLabel = (fullName: string): string => {
      if (SHORT_LABELS[fullName]) return SHORT_LABELS[fullName];
      for (const [key, val] of Object.entries(SHORT_LABELS)) {
        if (
          fullName.toLowerCase().includes(key.toLowerCase()) ||
          key.toLowerCase().includes(fullName.toLowerCase())
        ) {
          return val;
        }
      }
      return fullName;
    };

    const PALETTE = [
      { color: '#0c4a6e', weight: 'bold' },
      { color: '#0369a1', weight: 'bold' },
      { color: '#1e293b', weight: 'bold' },
      { color: '#0284c7', weight: 'bold' },
      { color: '#0d9488', weight: 'bold' },
      { color: '#334155', weight: '600' },
      { color: '#475569', weight: '600' },
      { color: '#0891b2', weight: '600' },
      { color: '#64748b', weight: '600' },
      { color: '#94a3b8', weight: '600' },
    ];

    const minVal = Math.min(...occupations.map((o) => o.count));
    const maxVal = Math.max(1, ...occupations.map((o) => o.count));

    // Sort descending so the most dominant occupations are placed first in the center
    const sorted = [...occupations].sort((a, b) => b.count - a.count);

    const cx = width / 2;
    const cy = height / 2;
    const padding = 3;

    interface PlacedWord {
      x: number;
      y: number;
      text: string;
      fontSize: number;
      color: string;
      weight: string;
      x1: number;
      x2: number;
      y1: number;
      y2: number;
    }

    const placed: PlacedWord[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const item = sorted[i];
      const text = getShortLabel(item.name);
      const style = PALETTE[i % PALETTE.length];

      // scaleSqrt font sizing (min 15px, max 38px)
      const ratio = Math.sqrt(
        (item.count - minVal) / Math.max(1, maxVal - minVal),
      );
      const fontSize = Math.round(15 + ratio * (38 - 15));

      // Font bounding box approximation in Helvetica/Arial
      const textWidth = text.length * fontSize * 0.58;
      const textHeight = fontSize * 0.85;

      // Archimedean spiral parameters for center-weighted elliptical cloud
      const ex = 1.35; // horizontal ellipse factor
      const ey = 0.88; // vertical ellipse factor
      const spiralStep = 0.08; // angle step in radians
      const a = 2.4; // radial expansion rate

      // Golden angle phase offset for deterministic radial dispersion
      const startPhase = (i * 2.399963) % (2 * Math.PI);

      for (let theta = 0; theta < 60 * Math.PI; theta += spiralStep) {
        const currentTheta = startPhase + theta;
        const r = a * theta;
        const x = cx + r * Math.cos(currentTheta) * ex;
        const y = cy + r * Math.sin(currentTheta) * ey;

        const box = {
          x1: x - textWidth / 2 - padding,
          x2: x + textWidth / 2 + padding,
          y1: y - textHeight / 2 - padding,
          y2: y + textHeight / 2 + padding,
        };

        // Boundary constraint with margin
        if (
          box.x1 < 16 ||
          box.x2 > width - 16 ||
          box.y1 < 16 ||
          box.y2 > height - 16
        ) {
          continue;
        }

        // AABB collision detection
        let collide = false;
        for (const p of placed) {
          if (
            box.x1 < p.x2 &&
            box.x2 > p.x1 &&
            box.y1 < p.y2 &&
            box.y2 > p.y1
          ) {
            collide = true;
            break;
          }
        }

        if (!collide) {
          placed.push({
            x,
            y,
            text,
            fontSize,
            color: style.color,
            weight: style.weight,
            ...box,
          });
          break;
        }
      }
    }

    let textElements = '';
    for (const p of placed) {
      textElements += `  <text x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" font-family="Helvetica, Arial, sans-serif" font-size="${p.fontSize}" font-weight="${p.weight}" fill="${p.color}" text-anchor="middle" dominant-baseline="central" letter-spacing="-0.01em">${p.text}</text>\n`;
    }

    const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#f8fafc" rx="8" stroke="#e2e8f0" stroke-width="1.5"/>
${textElements}
</svg>
    `;

    return sharp(Buffer.from(svg), { density: 150 }).png().toBuffer();
  }

  private buildProfilingStatistics(
    items: FormattedJaring[],
  ): ProfilingStatistics {
    const total = items.length;
    let active = 0;
    let male = 0;
    let female = 0;

    const ageMap = {
      '17–25': 0,
      '26–35': 0,
      '36–45': 0,
      '46–55': 0,
      '56–65': 0,
      '> 65': 0,
    };

    const genMap = {
      'Gen Z': { birthRange: '1997–2012', count: 0 },
      Milenial: { birthRange: '1981–1996', count: 0 },
      'Gen X': { birthRange: '1965–1980', count: 0 },
      'Baby Boomer': { birthRange: '1946–1964', count: 0 },
      Lainnya: { birthRange: '< 1946 / > 2012', count: 0 },
    };

    const occMap = new Map<string, number>();
    const STANDARD_OCCUPATIONS = [
      'Wiraswasta',
      'Karyawan Swasta / Buruh',
      'Pedagang / Perniagaan',
      'Pengemudi / Ojek Online / Kurir',
      'Pegawai Negeri / ASN / TNI / Polri',
      'Ibu Rumah Tangga',
      'Profesional / Tenaga Ahli',
      'Petani / Nelayan / Peternak',
      'Pelajar / Mahasiswa',
      'Lainnya',
    ];
    for (const cat of STANDARD_OCCUPATIONS) {
      occMap.set(cat, 0);
    }

    const cityMap = new Map<string, number>();

    const dkiCounts = {
      jakartaPusat: 0,
      jakartaUtara: 0,
      jakartaBarat: 0,
      jakartaSelatan: 0,
      jakartaTimur: 0,
      kepulauanSeribu: 0,
      lainnya: 0,
    };

    const currentYear = new Date().getFullYear();

    for (const item of items) {
      // 1. Status
      const st = (item.status || '').toUpperCase();
      if (st === 'ACTIVE' || st === 'AKTIF') {
        active++;
      }

      // 2. Gender
      const g = (item.gender || '').toUpperCase();
      if (
        g === 'MALE' ||
        g === 'L' ||
        g.includes('LAKI') ||
        g.includes('PRIA')
      ) {
        male++;
      } else if (
        g === 'FEMALE' ||
        g === 'P' ||
        g.includes('PEREMPUAN') ||
        g.includes('WANITA')
      ) {
        female++;
      } else {
        male++;
      }

      // 3. Age & Generation
      if (item.birthDate) {
        const bDate = new Date(item.birthDate);
        const bYear = bDate.getFullYear();
        const age = currentYear - bYear;

        if (age <= 25) ageMap['17–25']++;
        else if (age <= 35) ageMap['26–35']++;
        else if (age <= 45) ageMap['36–45']++;
        else if (age <= 55) ageMap['46–55']++;
        else if (age <= 65) ageMap['56–65']++;
        else ageMap['> 65']++;

        if (bYear >= 1997 && bYear <= 2012) genMap['Gen Z'].count++;
        else if (bYear >= 1981 && bYear <= 1996) genMap['Milenial'].count++;
        else if (bYear >= 1965 && bYear <= 1980) genMap['Gen X'].count++;
        else if (bYear >= 1946 && bYear <= 1964) genMap['Baby Boomer'].count++;
        else genMap['Lainnya'].count++;
      } else {
        ageMap['36–45']++;
        genMap['Milenial'].count++;
      }

      // 4. Occupation
      const normOcc = this.normalizeOccupationCategory(item);
      occMap.set(normOcc, (occMap.get(normOcc) || 0) + 1);

      // 5. Wilayah
      const city =
        item.cityName && item.cityName !== '-'
          ? item.cityName.trim()
          : 'Wilayah Lainnya';
      cityMap.set(city, (cityMap.get(city) || 0) + 1);

      const cityLower = city.toLowerCase();
      if (cityLower.includes('pusat')) dkiCounts.jakartaPusat++;
      else if (cityLower.includes('utara')) dkiCounts.jakartaUtara++;
      else if (cityLower.includes('barat')) dkiCounts.jakartaBarat++;
      else if (cityLower.includes('selatan')) dkiCounts.jakartaSelatan++;
      else if (cityLower.includes('timur')) dkiCounts.jakartaTimur++;
      else if (cityLower.includes('seribu')) dkiCounts.kepulauanSeribu++;
      else dkiCounts.lainnya++;
    }

    const inactive = total - active;
    const activePercentage =
      total > 0 ? Math.round((active / total) * 1000) / 10 : 0;
    const inactivePercentage =
      total > 0 ? Math.round((100 - activePercentage) * 10) / 10 : 0;

    const malePercentage =
      total > 0 ? Math.round((male / total) * 1000) / 10 : 0;
    const femalePercentage =
      total > 0 ? Math.round((100 - malePercentage) * 10) / 10 : 0;

    const citiesRanked = Array.from(cityMap.entries())
      .map(([cityName, totalJaring]) => ({
        cityName,
        totalJaring,
        percentage:
          total > 0 ? Math.round((totalJaring / total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.totalJaring - a.totalJaring);

    const occEntries = Array.from(occMap.entries());
    const mainOccs = occEntries
      .filter(([name]) => name !== 'Lainnya')
      .map(([name, count]) => ({
        name,
        count,
        percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.name.localeCompare(b.name, 'id');
      });

    const lainnyaCount = occMap.get('Lainnya') || 0;
    const topCategories = [
      ...mainOccs,
      {
        name: 'Lainnya',
        count: lainnyaCount,
        percentage:
          total > 0 ? Math.round((lainnyaCount / total) * 1000) / 10 : 0,
      },
    ];

    return {
      summary: {
        total,
        active,
        inactive,
        activePercentage,
        inactivePercentage,
      },
      wilayah: {
        citiesRanked,
        dkiCounts,
      },
      gender: {
        items: [
          {
            label: 'Laki-laki',
            count: male,
            percentage: malePercentage,
            color: '#0284c7',
          },
          {
            label: 'Perempuan',
            count: female,
            percentage: femalePercentage,
            color: '#ec4899',
          },
        ],
      },
      ageGroups: {
        items: Object.entries(ageMap).map(([range, count]) => ({
          range: `${range} Thn`,
          count,
          percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
        })),
      },
      generations: {
        items: Object.entries(genMap).map(([name, data]) => ({
          name,
          birthRange: data.birthRange,
          count: data.count,
          percentage:
            total > 0 ? Math.round((data.count / total) * 1000) / 10 : 0,
        })),
      },
      occupations: {
        topCategories,
      },
      statuses: {
        items: [
          {
            label: 'Aktif',
            count: active,
            percentage: activePercentage,
            color: '#059669',
          },
          {
            label: 'Tidak Aktif',
            count: inactive,
            percentage: inactivePercentage,
            color: '#d97706',
          },
        ],
      },
    };
  }

  private normalizeOccupationCategory(item: FormattedJaring): string {
    const raw = (
      (item.occupationName || '') +
      ' ' +
      (item.jobTitle || '') +
      ' ' +
      (item.workplace || '')
    ).toLowerCase();

    if (!raw.trim()) return 'Lainnya';

    if (
      raw.includes('wiraswasta') ||
      raw.includes('pengusaha') ||
      raw.includes('entrepreneur') ||
      raw.includes('bisnis mandiri')
    ) {
      return 'Wiraswasta';
    }

    if (
      raw.includes('pedagang') ||
      raw.includes('dagang') ||
      raw.includes('toko') ||
      raw.includes('warung') ||
      raw.includes('pasar') ||
      raw.includes('jualan')
    ) {
      return 'Pedagang / Perniagaan';
    }

    if (
      raw.includes('ojek') ||
      raw.includes('driver') ||
      raw.includes('sopir') ||
      raw.includes('supir') ||
      raw.includes('kurir') ||
      raw.includes('pengemudi') ||
      raw.includes('gojek') ||
      raw.includes('grab') ||
      raw.includes('maxim')
    ) {
      return 'Pengemudi / Ojek Online / Kurir';
    }

    if (
      raw.includes('asn') ||
      raw.includes('pns') ||
      raw.includes('tni') ||
      raw.includes('polri') ||
      raw.includes('polisi') ||
      raw.includes('pemerintah') ||
      raw.includes('kelurahan') ||
      raw.includes('kecamatan')
    ) {
      return 'Pegawai Negeri / ASN / TNI / Polri';
    }

    if (
      raw.includes('ibu rumah tangga') ||
      raw.includes('irt') ||
      raw.includes('rumah tangga')
    ) {
      return 'Ibu Rumah Tangga';
    }

    if (
      raw.includes('advokat') ||
      raw.includes('pengacara') ||
      raw.includes('dokter') ||
      raw.includes('perawat') ||
      raw.includes('guru') ||
      raw.includes('dosen') ||
      raw.includes('notaris') ||
      raw.includes('konsultan') ||
      raw.includes('akuntan') ||
      raw.includes('arsitek') ||
      raw.includes('wartawan') ||
      raw.includes('jurnalis') ||
      raw.includes('hukum') ||
      raw.includes('tenaga ahli')
    ) {
      return 'Profesional / Tenaga Ahli';
    }

    if (
      raw.includes('petani') ||
      raw.includes('tani') ||
      raw.includes('nelayan') ||
      raw.includes('peternak') ||
      raw.includes('kebun')
    ) {
      return 'Petani / Nelayan / Peternak';
    }

    if (
      raw.includes('pelajar') ||
      raw.includes('mahasiswa') ||
      raw.includes('santri') ||
      raw.includes('siswa')
    ) {
      return 'Pelajar / Mahasiswa';
    }

    if (
      raw.includes('swasta') ||
      raw.includes('karyawan') ||
      raw.includes('buruh') ||
      /\bpekerja\b/.test(raw) ||
      raw.includes('staff') ||
      raw.includes('satpam') ||
      raw.includes('security') ||
      raw.includes('teknisi') ||
      raw.includes('kantor')
    ) {
      return 'Karyawan Swasta / Buruh';
    }

    return 'Lainnya';
  }

  /**
   * Router Rekapitulasi Klasifikasi Pekerjaan Jaring
   */
  private renderRecapPages(
    doc: PDFKit.PDFDocument,
    groups: ProvinceGroup[],
    granularity: RecapGranularity,
    filterAreaName: string | null = null,
  ) {
    if (granularity === RecapGranularity.CITY_DISTRICT_VILLAGE) {
      this.renderRecapCityDistrictVillage(doc, groups, filterAreaName);
    } else if (
      granularity === RecapGranularity.DISTRICT_VILLAGE ||
      granularity === RecapGranularity.VILLAGE
    ) {
      this.renderRecapDistrictVillage(doc, groups, filterAreaName);
    } else {
      this.renderRecapProvinceCity(doc, groups);
    }
  }

  /**
   * Tabel Rekapitulasi Granularitas Standar: PROVINSI -> KOTA / KABUPATEN -> PEKERJAAN
   */
  private renderRecapProvinceCity(
    doc: PDFKit.PDFDocument,
    groups: ProvinceGroup[],
  ) {
    const startX = 36;
    const colWidths = [35, 140, 185, 279, 130]; // Total = 769 pt
    const colHeaders = [
      'NO.',
      'PROVINSI',
      'KOTA / KABUPATEN',
      'PEKERJAAN',
      'JUMLAH JARING',
    ];
    const rowHeight = 20;

    let currentY = 48;

    const drawHeader = (isContinued: boolean = false) => {
      doc
        .fontSize(13)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text(
          `REKAPITULASI KLASIFIKASI PEKERJAAN JARING${isContinued ? ' (Lanjutan)' : ''}`,
          startX,
          currentY,
        );

      currentY += 22;

      doc.rect(startX, currentY, 769, 25).fillColor('#e2e8f0').fill();
      doc
        .rect(startX, currentY, 769, 25)
        .lineWidth(0.75)
        .strokeColor('#94a3b8')
        .stroke();

      let x = startX;
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#0f172a');
      for (let i = 0; i < colHeaders.length; i++) {
        const align = i === 0 || i === 4 ? 'center' : 'left';
        doc.text(colHeaders[i], x + 6, currentY + 7, {
          width: colWidths[i] - 12,
          align,
          lineBreak: false,
        });

        if (i > 0) {
          doc
            .moveTo(x, currentY)
            .lineTo(x, currentY + 25)
            .strokeColor('#94a3b8')
            .stroke();
        }
        x += colWidths[i];
      }

      currentY += 25;
    };

    drawHeader();

    let provNo = 1;

    for (const prov of groups) {
      for (const city of prov.cities) {
        let occIndex = 0;
        const occList =
          city.occupations.length > 0
            ? city.occupations
            : [{ name: 'Belum Terklasifikasi', count: city.totalJaring }];

        while (occIndex < occList.length) {
          const remainingSpace = 540 - currentY;
          const maxRowsFit = Math.floor(remainingSpace / rowHeight);

          if (maxRowsFit < 1) {
            doc.addPage();
            currentY = 48;
            drawHeader(true);
            continue;
          }

          const chunk = occList.slice(occIndex, occIndex + maxRowsFit);
          const chunkHeight = chunk.length * rowHeight;
          const blockTopY = currentY;

          for (let r = 0; r < chunk.length; r++) {
            const occ = chunk[r];
            const rowY = currentY;

            const occStartX =
              startX + colWidths[0] + colWidths[1] + colWidths[2];
            const occWidth = colWidths[3] + colWidths[4];

            if ((occIndex + r) % 2 === 1) {
              doc
                .rect(occStartX, rowY, occWidth, rowHeight)
                .fillColor('#f8fafc')
                .fill();
            }

            doc
              .moveTo(occStartX, rowY + rowHeight)
              .lineTo(startX + 769, rowY + rowHeight)
              .lineWidth(0.5)
              .strokeColor('#e2e8f0')
              .stroke();

            // Kolom 4: PEKERJAAN
            const occX = startX + colWidths[0] + colWidths[1] + colWidths[2];
            doc
              .fontSize(8.5)
              .font('Helvetica')
              .fillColor('#1e293b')
              .text(occ.name, occX + 8, rowY + 5, {
                width: colWidths[3] - 16,
                lineBreak: false,
              });

            // Kolom 5: JUMLAH JARING
            const countX = occX + colWidths[3];
            doc
              .fontSize(8.5)
              .font('Helvetica-Bold')
              .fillColor('#0f172a')
              .text(
                `${occ.count.toLocaleString('id-ID')} Orang`,
                countX,
                rowY + 5,
                {
                  width: colWidths[4],
                  align: 'center',
                  lineBreak: false,
                },
              );

            currentY += rowHeight;
          }

          doc
            .rect(startX, blockTopY, 769, chunkHeight)
            .lineWidth(0.75)
            .strokeColor('#94a3b8')
            .stroke();

          let vx = startX;
          for (let c = 0; c < colWidths.length; c++) {
            doc
              .moveTo(vx, blockTopY)
              .lineTo(vx, blockTopY + chunkHeight)
              .strokeColor('#cbd5e1')
              .stroke();
            vx += colWidths[c];
          }

          const isFirstChunkOfCity = occIndex === 0;

          // NO. (Tingkat Provinsi)
          if (isFirstChunkOfCity && city === prov.cities[0]) {
            doc
              .fontSize(9)
              .font('Helvetica-Bold')
              .fillColor('#0f172a')
              .text(`${provNo}.`, startX, blockTopY + chunkHeight / 2 - 5, {
                width: colWidths[0],
                align: 'center',
                lineBreak: false,
              });
          }

          // Kolom 2: PROVINSI
          const provLabel =
            isFirstChunkOfCity && city === prov.cities[0]
              ? `${prov.provinceName}\n(Total: ${prov.totalJaring.toLocaleString('id-ID')} Jaring)`
              : '';
          if (provLabel) {
            doc
              .fontSize(8.5)
              .font('Helvetica-Bold')
              .fillColor('#0f172a')
              .text(
                provLabel,
                startX + colWidths[0] + 6,
                blockTopY + chunkHeight / 2 - 10,
                { width: colWidths[1] - 12, lineBreak: true },
              );
          }

          // Kolom 3: KOTA / KABUPATEN
          const cityLabel = isFirstChunkOfCity
            ? `${city.cityName}\n(${city.totalJaring.toLocaleString('id-ID')} Jaring)`
            : `${city.cityName} (Lanjutan)`;
          doc
            .fontSize(8.5)
            .font('Helvetica-Bold')
            .fillColor('#1e293b')
            .text(
              cityLabel,
              startX + colWidths[0] + colWidths[1] + 6,
              blockTopY + chunkHeight / 2 - (isFirstChunkOfCity ? 10 : 5),
              { width: colWidths[2] - 12, lineBreak: true },
            );

          occIndex += chunk.length;
        }
      }
      provNo++;
    }
  }

  /**
   * Tabel Rekapitulasi Granularitas Filter Kota/Kabupaten:
   * KOTA / KABUPATEN -> KECAMATAN -> KELURAHAN -> PEKERJAAN
   */
  private renderRecapCityDistrictVillage(
    doc: PDFKit.PDFDocument,
    groups: ProvinceGroup[],
    filterAreaName: string | null = null,
  ) {
    const startX = 36;
    // 6 Kolom: NO (30), KOTA/KAB (125), KECAMATAN (135), KELURAHAN (140), PEKERJAAN (219), JUMLAH JARING (120) = Total 769 pt
    const colWidths = [30, 125, 135, 140, 219, 120];
    const colHeaders = [
      'NO.',
      'KOTA / KABUPATEN',
      'KECAMATAN',
      'KELURAHAN',
      'PEKERJAAN',
      'JUMLAH JARING',
    ];
    const rowHeight = 20;

    let currentY = 48;

    const drawHeader = (isContinued: boolean = false) => {
      const areaTitle = filterAreaName
        ? ` — ${filterAreaName.toUpperCase()}`
        : '';
      doc
        .fontSize(13)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text(
          `REKAPITULASI KLASIFIKASI PEKERJAAN JARING${areaTitle}${isContinued ? ' (Lanjutan)' : ''}`,
          startX,
          currentY,
        );

      currentY += 22;

      doc.rect(startX, currentY, 769, 25).fillColor('#e2e8f0').fill();
      doc
        .rect(startX, currentY, 769, 25)
        .lineWidth(0.75)
        .strokeColor('#94a3b8')
        .stroke();

      let x = startX;
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a');
      for (let i = 0; i < colHeaders.length; i++) {
        const align = i === 0 || i === 5 ? 'center' : 'left';
        doc.text(colHeaders[i], x + 5, currentY + 7, {
          width: colWidths[i] - 10,
          align,
          lineBreak: false,
        });

        if (i > 0) {
          doc
            .moveTo(x, currentY)
            .lineTo(x, currentY + 25)
            .strokeColor('#94a3b8')
            .stroke();
        }
        x += colWidths[i];
      }

      currentY += 25;
    };

    drawHeader();

    let rowNo = 1;

    for (const prov of groups) {
      for (const city of prov.cities) {
        for (const dist of city.districts) {
          for (const vill of dist.villages) {
            const occList =
              vill.occupations.length > 0
                ? vill.occupations
                : [{ name: 'Belum Terklasifikasi', count: vill.totalJaring }];

            let occIndex = 0;
            while (occIndex < occList.length) {
              const remainingSpace = 540 - currentY;
              const maxRowsFit = Math.floor(remainingSpace / rowHeight);

              if (maxRowsFit < 1) {
                doc.addPage();
                currentY = 48;
                drawHeader(true);
                continue;
              }

              const chunk = occList.slice(occIndex, occIndex + maxRowsFit);
              const chunkHeight = chunk.length * rowHeight;
              const blockTopY = currentY;

              for (let r = 0; r < chunk.length; r++) {
                const occ = chunk[r];
                const rowY = currentY;

                const occStartX =
                  startX +
                  colWidths[0] +
                  colWidths[1] +
                  colWidths[2] +
                  colWidths[3];
                const occWidth = colWidths[4] + colWidths[5];

                if ((occIndex + r) % 2 === 1) {
                  doc
                    .rect(occStartX, rowY, occWidth, rowHeight)
                    .fillColor('#f8fafc')
                    .fill();
                }

                doc
                  .moveTo(occStartX, rowY + rowHeight)
                  .lineTo(startX + 769, rowY + rowHeight)
                  .lineWidth(0.5)
                  .strokeColor('#e2e8f0')
                  .stroke();

                // Kolom 5: PEKERJAAN
                const occX =
                  startX +
                  colWidths[0] +
                  colWidths[1] +
                  colWidths[2] +
                  colWidths[3];
                doc
                  .fontSize(8)
                  .font('Helvetica')
                  .fillColor('#1e293b')
                  .text(occ.name, occX + 6, rowY + 5, {
                    width: colWidths[4] - 12,
                    lineBreak: false,
                  });

                // Kolom 6: JUMLAH JARING
                const countX = occX + colWidths[4];
                doc
                  .fontSize(8)
                  .font('Helvetica-Bold')
                  .fillColor('#0f172a')
                  .text(
                    `${occ.count.toLocaleString('id-ID')} Orang`,
                    countX,
                    rowY + 5,
                    {
                      width: colWidths[5],
                      align: 'center',
                      lineBreak: false,
                    },
                  );

                currentY += rowHeight;
              }

              doc
                .rect(startX, blockTopY, 769, chunkHeight)
                .lineWidth(0.75)
                .strokeColor('#94a3b8')
                .stroke();

              let vx = startX;
              for (let c = 0; c < colWidths.length; c++) {
                doc
                  .moveTo(vx, blockTopY)
                  .lineTo(vx, blockTopY + chunkHeight)
                  .strokeColor('#cbd5e1')
                  .stroke();
                vx += colWidths[c];
              }

              const isFirstChunkOfVill = occIndex === 0;

              // Kolom 1: NO.
              if (isFirstChunkOfVill) {
                doc
                  .fontSize(8.5)
                  .font('Helvetica-Bold')
                  .fillColor('#0f172a')
                  .text(`${rowNo}.`, startX, blockTopY + chunkHeight / 2 - 5, {
                    width: colWidths[0],
                    align: 'center',
                    lineBreak: false,
                  });
              }

              // Kolom 2: KOTA / KABUPATEN
              const isFirstOfCity =
                occIndex === 0 &&
                dist === city.districts[0] &&
                vill === dist.villages[0];
              const cityLabel = isFirstOfCity
                ? `${city.cityName}\n(${city.totalJaring.toLocaleString('id-ID')} Jaring)`
                : isFirstChunkOfVill
                  ? `${city.cityName}`
                  : '';
              if (cityLabel) {
                doc
                  .fontSize(8)
                  .font('Helvetica-Bold')
                  .fillColor('#0f172a')
                  .text(
                    cityLabel,
                    startX + colWidths[0] + 5,
                    blockTopY + chunkHeight / 2 - 8,
                    { width: colWidths[1] - 10, lineBreak: true },
                  );
              }

              // Kolom 3: KECAMATAN
              const isFirstOfDist = occIndex === 0 && vill === dist.villages[0];
              const distLabel = isFirstOfDist
                ? `${dist.districtName}\n(${dist.totalJaring.toLocaleString('id-ID')} Jaring)`
                : isFirstChunkOfVill
                  ? `${dist.districtName}`
                  : '';
              if (distLabel) {
                doc
                  .fontSize(8)
                  .font('Helvetica-Bold')
                  .fillColor('#1e293b')
                  .text(
                    distLabel,
                    startX + colWidths[0] + colWidths[1] + 5,
                    blockTopY + chunkHeight / 2 - 8,
                    { width: colWidths[2] - 10, lineBreak: true },
                  );
              }

              // Kolom 4: KELURAHAN
              const villLabel = isFirstChunkOfVill
                ? `${vill.villageName}\n(${vill.totalJaring.toLocaleString('id-ID')} Jaring)`
                : `${vill.villageName} (Lanjutan)`;
              doc
                .fontSize(8)
                .font('Helvetica-Bold')
                .fillColor('#334155')
                .text(
                  villLabel,
                  startX + colWidths[0] + colWidths[1] + colWidths[2] + 5,
                  blockTopY + chunkHeight / 2 - 8,
                  { width: colWidths[3] - 10, lineBreak: true },
                );

              occIndex += chunk.length;
            }
            rowNo++;
          }
        }
      }
    }
  }

  /**
   * Tabel Rekapitulasi Granularitas Filter Kecamatan / Kelurahan:
   * KECAMATAN -> KELURAHAN -> PEKERJAAN
   */
  private renderRecapDistrictVillage(
    doc: PDFKit.PDFDocument,
    groups: ProvinceGroup[],
    filterAreaName: string | null = null,
  ) {
    const startX = 36;
    // 5 Kolom: NO (35), KECAMATAN (170), KELURAHAN (170), PEKERJAAN (264), JUMLAH JARING (130) = Total 769 pt
    const colWidths = [35, 170, 170, 264, 130];
    const colHeaders = [
      'NO.',
      'KECAMATAN',
      'KELURAHAN',
      'PEKERJAAN',
      'JUMLAH JARING',
    ];
    const rowHeight = 20;

    let currentY = 48;

    const drawHeader = (isContinued: boolean = false) => {
      const areaTitle = filterAreaName
        ? ` — ${filterAreaName.toUpperCase()}`
        : '';
      doc
        .fontSize(13)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text(
          `REKAPITULASI KLASIFIKASI PEKERJAAN JARING${areaTitle}${isContinued ? ' (Lanjutan)' : ''}`,
          startX,
          currentY,
        );

      currentY += 22;

      doc.rect(startX, currentY, 769, 25).fillColor('#e2e8f0').fill();
      doc
        .rect(startX, currentY, 769, 25)
        .lineWidth(0.75)
        .strokeColor('#94a3b8')
        .stroke();

      let x = startX;
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#0f172a');
      for (let i = 0; i < colHeaders.length; i++) {
        const align = i === 0 || i === 4 ? 'center' : 'left';
        doc.text(colHeaders[i], x + 6, currentY + 7, {
          width: colWidths[i] - 12,
          align,
          lineBreak: false,
        });

        if (i > 0) {
          doc
            .moveTo(x, currentY)
            .lineTo(x, currentY + 25)
            .strokeColor('#94a3b8')
            .stroke();
        }
        x += colWidths[i];
      }

      currentY += 25;
    };

    drawHeader();

    let rowNo = 1;

    for (const prov of groups) {
      for (const city of prov.cities) {
        for (const dist of city.districts) {
          for (const vill of dist.villages) {
            const occList =
              vill.occupations.length > 0
                ? vill.occupations
                : [{ name: 'Belum Terklasifikasi', count: vill.totalJaring }];

            let occIndex = 0;
            while (occIndex < occList.length) {
              const remainingSpace = 540 - currentY;
              const maxRowsFit = Math.floor(remainingSpace / rowHeight);

              if (maxRowsFit < 1) {
                doc.addPage();
                currentY = 48;
                drawHeader(true);
                continue;
              }

              const chunk = occList.slice(occIndex, occIndex + maxRowsFit);
              const chunkHeight = chunk.length * rowHeight;
              const blockTopY = currentY;

              for (let r = 0; r < chunk.length; r++) {
                const occ = chunk[r];
                const rowY = currentY;

                const occStartX =
                  startX + colWidths[0] + colWidths[1] + colWidths[2];
                const occWidth = colWidths[3] + colWidths[4];

                if ((occIndex + r) % 2 === 1) {
                  doc
                    .rect(occStartX, rowY, occWidth, rowHeight)
                    .fillColor('#f8fafc')
                    .fill();
                }

                doc
                  .moveTo(occStartX, rowY + rowHeight)
                  .lineTo(startX + 769, rowY + rowHeight)
                  .lineWidth(0.5)
                  .strokeColor('#e2e8f0')
                  .stroke();

                // Kolom 4: PEKERJAAN
                const occX =
                  startX + colWidths[0] + colWidths[1] + colWidths[2];
                doc
                  .fontSize(8.5)
                  .font('Helvetica')
                  .fillColor('#1e293b')
                  .text(occ.name, occX + 8, rowY + 5, {
                    width: colWidths[3] - 16,
                    lineBreak: false,
                  });

                // Kolom 5: JUMLAH JARING
                const countX = occX + colWidths[3];
                doc
                  .fontSize(8.5)
                  .font('Helvetica-Bold')
                  .fillColor('#0f172a')
                  .text(
                    `${occ.count.toLocaleString('id-ID')} Orang`,
                    countX,
                    rowY + 5,
                    {
                      width: colWidths[4],
                      align: 'center',
                      lineBreak: false,
                    },
                  );

                currentY += rowHeight;
              }

              doc
                .rect(startX, blockTopY, 769, chunkHeight)
                .lineWidth(0.75)
                .strokeColor('#94a3b8')
                .stroke();

              let vx = startX;
              for (let c = 0; c < colWidths.length; c++) {
                doc
                  .moveTo(vx, blockTopY)
                  .lineTo(vx, blockTopY + chunkHeight)
                  .strokeColor('#cbd5e1')
                  .stroke();
                vx += colWidths[c];
              }

              const isFirstChunkOfVill = occIndex === 0;

              // Kolom 1: NO.
              if (isFirstChunkOfVill) {
                doc
                  .fontSize(9)
                  .font('Helvetica-Bold')
                  .fillColor('#0f172a')
                  .text(`${rowNo}.`, startX, blockTopY + chunkHeight / 2 - 5, {
                    width: colWidths[0],
                    align: 'center',
                    lineBreak: false,
                  });
              }

              // Kolom 2: KECAMATAN
              const isFirstOfDist = occIndex === 0 && vill === dist.villages[0];
              const distLabel = isFirstOfDist
                ? `${dist.districtName}\n(${dist.totalJaring.toLocaleString('id-ID')} Jaring)`
                : isFirstChunkOfVill
                  ? `${dist.districtName}`
                  : '';
              if (distLabel) {
                doc
                  .fontSize(8.5)
                  .font('Helvetica-Bold')
                  .fillColor('#0f172a')
                  .text(
                    distLabel,
                    startX + colWidths[0] + 6,
                    blockTopY + chunkHeight / 2 - 10,
                    { width: colWidths[1] - 12, lineBreak: true },
                  );
              }

              // Kolom 3: KELURAHAN
              const villLabel = isFirstChunkOfVill
                ? `${vill.villageName}\n(${vill.totalJaring.toLocaleString('id-ID')} Jaring)`
                : `${vill.villageName} (Lanjutan)`;
              doc
                .fontSize(8.5)
                .font('Helvetica-Bold')
                .fillColor('#1e293b')
                .text(
                  villLabel,
                  startX + colWidths[0] + colWidths[1] + 6,
                  blockTopY + chunkHeight / 2 - (isFirstChunkOfVill ? 10 : 5),
                  { width: colWidths[2] - 12, lineBreak: true },
                );

              occIndex += chunk.length;
            }
            rowNo++;
          }
        }
      }
    }
  }

  buildProfilingRows(item: FormattedJaring): Array<{ label: string; val: string }> {
    const birthDateFormatted = item.birthDate
      ? new Intl.DateTimeFormat('id-ID', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }).format(new Date(item.birthDate))
      : null;

    const ttlString =
      item.birthPlace && birthDateFormatted
        ? `${item.birthPlace}, ${birthDateFormatted}`
        : item.birthPlace || birthDateFormatted || '-';

    const profilingRows: Array<{ label: string; val: string }> = [
      { label: 'NIK', val: item.nationalIdNumber || '-' },
      { label: 'TTL', val: ttlString },
      { label: 'Alamat', val: item.address || '-' },
      {
        label: 'Pekerjaan',
        val: item.occupationName || item.workplace || '-',
      },
      { label: 'No. HP', val: item.whatsappNumber || '-' },
    ];

    if (item.organizationName) {
      profilingRows.push({
        label: 'Organisasi',
        val: item.organizationName,
      });
    }

    // Bagian wilayah hanya mendeskripsikan kelurahan dan kecamatan (tanpa kota/kabupaten dan provinsi)
    const areaLoc = [item.villageName, item.districtName]
      .filter((s) => s && s !== '-')
      .join(', ');
    if (areaLoc) {
      profilingRows.push({
        label: 'Wilayah',
        val: areaLoc,
      });
    }

    if (item.gaswilName && item.gaswilName !== '-') {
      profilingRows.push({
        label: 'Gaswil',
        val: item.gaswilName,
      });
    }

    return profilingRows;
  }

  /**
   * Halaman Profiling Detail Jaring per Kota/Kabupaten
   * - Banner navigasi wilayah per Kota/Kabupaten
   * - Penyesuaian Butir 5:
   *   * Kolom 2: KODE JARING (kode jaring bold + nama di bawahnya)
   *   * Kolom 3: IDENTITAS
   *   * Kolom 4: FOTO
   */
  private async renderCityProfiling(
    doc: PDFKit.PDFDocument,
    provinceName: string,
    city: CityGroup,
    startIndex: number,
  ): Promise<number> {
    const startX = 36;
    const colWidths = [40, 150, 430, 149]; // Total = 769 pt
    const colHeaders = ['NO', 'NAMA (KODE JARING)', 'IDENTITAS', 'FOTO'];
    const cardHeight = 224;

    let currentY = 48;
    let currentIndex = startIndex;

    const drawHeader = () => {
      doc.rect(startX, currentY, 769, 22).fillColor('#0f172a').fill();

      doc
        .fontSize(10.5)
        .font('Helvetica-Bold')
        .fillColor('#ffffff')
        .text(city.cityName.toUpperCase(), startX + 8, currentY + 6);

      currentY += 22;

      doc.rect(startX, currentY, 769, 24).fillColor('#f1f5f9').fill();

      doc
        .rect(startX, currentY, 769, 24)
        .lineWidth(0.75)
        .strokeColor('#94a3b8')
        .stroke();

      let x = startX;
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a');
      for (let i = 0; i < colHeaders.length; i++) {
        const align = i === 0 || i === 3 ? 'center' : 'left';
        doc.text(colHeaders[i], x + 4, currentY + 6, {
          width: colWidths[i] - 8,
          align,
        });

        if (i > 0) {
          doc
            .moveTo(x, currentY)
            .lineTo(x, currentY + 24)
            .strokeColor('#94a3b8')
            .stroke();
        }
        x += colWidths[i];
      }

      currentY += 24;
    };

    drawHeader();

    for (const item of city.items) {
      if (currentY + cardHeight > 545) {
        doc.addPage();
        currentY = 48;
        drawHeader();
      }

      const rowTop = currentY;

      if (currentIndex % 2 === 0) {
        doc.rect(startX, rowTop, 769, cardHeight).fillColor('#f8fafc').fill();
      }

      doc
        .rect(startX, rowTop, 769, cardHeight)
        .lineWidth(0.5)
        .strokeColor('#94a3b8')
        .stroke();

      let cx = startX;
      for (let c = 0; c < colWidths.length; c++) {
        doc
          .moveTo(cx, rowTop)
          .lineTo(cx, rowTop + cardHeight)
          .lineWidth(0.5)
          .strokeColor('#cbd5e1')
          .stroke();
        cx += colWidths[c];
      }

      // Kolom 1: NO
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text(String(currentIndex), startX, rowTop + 14, {
          width: colWidths[0],
          align: 'center',
        });

      // Kolom 2: NAMA (KODE JARING) (Nama bold di atas, Kode Jaring di bawahnya)
      const codeX = startX + colWidths[0] + 8;
      const displayName = item.fullName || item.aliasName || '-';
      const jaringCode = item.aliasName || '-';
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text(displayName, codeX, rowTop + 14, {
          width: colWidths[1] - 16,
        });

      if (jaringCode && jaringCode !== '-' && jaringCode !== displayName) {
        doc
          .fontSize(9.5)
          .font('Helvetica')
          .fillColor('#475569')
          .text(`Kode: ${jaringCode}`, codeX, doc.y + 4, {
            width: colWidths[1] - 16,
          });
      }

      // Kolom 3: IDENTITAS (Penyesuaian Butir 5: sebelumnya PROFILING)
      const profX = startX + colWidths[0] + colWidths[1] + 12;
      let profY = rowTop + 14;

      const profilingRows = this.buildProfilingRows(item);

      doc.fontSize(10);
      for (const p of profilingRows) {
        doc
          .font('Helvetica-Bold')
          .fillColor('#334155')
          .text(`- ${p.label}`, profX, profY, { width: 92, lineBreak: false });

        doc
          .font('Helvetica')
          .fillColor('#0f172a')
          .text(`: ${p.val}`, profX + 92, profY, {
            width: colWidths[2] - 105,
          });

        profY = doc.y + 3;
      }

      // Kolom 4: FOTO (Penyesuaian Butir 5: sebelumnya DOKUMENTASI)
      const docX = startX + colWidths[0] + colWidths[1] + colWidths[2];
      const photoBoxSize = 110;
      const imgX = docX + (colWidths[3] - photoBoxSize) / 2;
      const imgY = rowTop + (cardHeight - photoBoxSize) / 2;

      let imageRendered = false;
      if (item.profilePhotoStorageKey) {
        try {
          const rawBuf = await this.readStorageFile(
            item.profilePhotoStorageKey,
          );
          if (rawBuf && rawBuf.length > 0) {
            const jpegBuf = await sharp(rawBuf)
              .resize(220, 220, { fit: 'cover' })
              .jpeg({ quality: 85 })
              .toBuffer();

            doc.image(jpegBuf, imgX, imgY, {
              fit: [photoBoxSize, photoBoxSize],
              align: 'center',
              valign: 'center',
            });
            imageRendered = true;
          }
        } catch (err) {
          this.logger.warn(
            `Failed to render photo for Jaring ${item.fullName}: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        }
      }

      doc
        .rect(imgX, imgY, photoBoxSize, photoBoxSize)
        .lineWidth(1)
        .strokeColor('#cbd5e1')
        .stroke();

      if (!imageRendered) {
        doc
          .rect(imgX, imgY, photoBoxSize, photoBoxSize)
          .fillColor('#f1f5f9')
          .fill();

        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#94a3b8')
          .text('Belum ada foto', imgX, imgY + photoBoxSize / 2 - 6, {
            width: photoBoxSize,
            align: 'center',
          });
      }

      currentY += cardHeight;
      currentIndex++;
    }

    return currentIndex;
  }

  private async readStorageFile(storageKey: string): Promise<Buffer | null> {
    try {
      const resolved = (this.storage as any).resolvePath?.(storageKey);
      if (resolved) {
        return await readFile(resolved);
      }
      return null;
    } catch {
      return null;
    }
  }

  private async writeAudit(context: AuthorizationContext, count: number) {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserProfileId: context.userProfileId,
          actorAssignmentId: context.primaryAssignmentId,
          action: 'JARING.EXPORT_PDF',
          category: 'DATA_ACCESS',
          severity: 'INFO',
          entityType: 'Jaring',
          entityId: context.organizationUnitId,
          metadata: { totalItems: count, format: 'pdf_landscape' },
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to record audit log for Jaring PDF export: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
