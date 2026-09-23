import { Injectable, Logger } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import {
  AdministrativeLevel,
  JaringRegistrationStatus,
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
    const includeToc = query.includeToc !== false;
    const includeRecap = query.includeRecap !== false;

    let tocStartPageIndex = -1;
    let tocPagesCount = 0;
    let recapTerritoryPageIndex = -1;
    let recapOccupationPageIndex = -1;
    const provincePageMap = new Map<string, number>();
    const cityPageMap = new Map<string, number>();

    // 1. Cover / Halaman Sampul Dokumen Resmi (Tanpa label Rahasia, Tanpa TTD)
    if (includeCover) {
      this.renderCoverPage(
        doc,
        query,
        items,
        provinceGroups,
        filterArea?.name ?? null,
      );
    }

    // 2. Placeholder untuk Halaman Daftar Isi
    if (includeToc) {
      let totalTocEntries = includeRecap && provinceGroups.length > 0 ? 2 : 0;
      for (const group of provinceGroups) {
        totalTocEntries += 1 + group.cities.length;
      }
      tocPagesCount = Math.max(1, Math.ceil(totalTocEntries / 44));

      if (includeCover) {
        doc.addPage();
      }
      tocStartPageIndex = doc.bufferedPageRange().count - 1;

      for (let p = 1; p < tocPagesCount; p++) {
        doc.addPage();
      }
    }

    // 3. Halaman Rekapitulasi:
    // Tabel 1: Rekapitulasi Persebaran Wilayah Jaring (Mendeskripsikan hierarki hingga tingkat Kelurahan)
    // Tabel 2: Rekapitulasi Klasifikasi Pekerjaan Jaring (Mendeskripsikan pembagian wilayah per pekerjaan)
    if (includeRecap && provinceGroups.length > 0) {
      if (includeCover || includeToc) doc.addPage();
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
    }

    // 4. Halaman Detail Profiling Jaring (Dikelompokkan per Kota/Kabupaten)
    let globalProfilingIndex = 1;
    for (const group of provinceGroups) {
      let provFirstPage = -1;

      for (const city of group.cities) {
        doc.addPage();
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
      }
    }

    // 5. Render Daftar Isi ke Halaman Placeholder yang Sudah Dialokasikan
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

    const caretakerWhere: Prisma.JaringWhereInput = query.fieldOfficerAssignmentId
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
                    ? { fieldOfficerAssignmentId: { in: scope.assignmentIds } }
                    : {}),
                isActive: true,
                OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
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
      ...(query.status ? { status: query.status } : {}),
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

      return {
        id: item.id,
        fullName:
          item.fullName?.trim() || item.aliasName?.trim() || 'Tanpa Nama',
        aliasName: item.aliasName?.trim() || null,
        nationalIdNumber: item.nationalIdNumber?.trim() || null,
        address: item.address?.trim() || null,
        birthPlace: item.birthPlace?.trim() || null,
        birthDate: item.birthDate,
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
            if (b.totalJaring !== a.totalJaring) return b.totalJaring - a.totalJaring;
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
          if (b.totalJaring !== a.totalJaring) return b.totalJaring - a.totalJaring;
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
      .text('REKAPITULASI DAN PEMBAGIAN WILAYAH JARING NUSANTARA', 0, 235, {
        align: 'center',
      });

    // Subtitle cakupan wilayah dan status data
    const areaScopeLabel = filterAreaName
      ? filterAreaName.toUpperCase()
      : groups.map((g) => g.provinceName).join(', ').toUpperCase();

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
  ) {
    const pageWidth = 841.89;

    type TocEntry = {
      label: string;
      page: number;
      isSubItem: boolean;
    };

    const entries: TocEntry[] = [];
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
        .text('Rekapitulasi dan Pembagian Wilayah Jaring Nusantara', 0, 74, {
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
    const is3Col = granularity === RecapGranularity.VILLAGE;
    const is4Col = granularity === RecapGranularity.DISTRICT_VILLAGE;
    const is5Col = !is3Col && !is4Col;

    let colWidths: number[];
    let colHeaders: string[];

    if (is5Col) {
      colWidths = [35, 190, 190, 214, 140]; // Total = 769 pt
      colHeaders = [
        'NO.',
        'KOTA / KABUPATEN',
        'KECAMATAN',
        'KELURAHAN',
        'JUMLAH JARING',
      ];
    } else if (is4Col) {
      colWidths = [40, 260, 309, 160]; // Total = 769 pt
      colHeaders = ['NO.', 'KECAMATAN', 'KELURAHAN', 'JUMLAH JARING'];
    } else {
      colWidths = [50, 499, 220]; // Total = 769 pt
      colHeaders = ['NO.', 'KELURAHAN', 'JUMLAH JARING'];
    }

    const rowHeight = 21;
    let currentY = 48;

    let totalAllJaring = 0;
    type FlatTerritoryRow = {
      cityName: string;
      districtName: string;
      villageName: string;
      totalJaring: number;
    };
    const rows: FlatTerritoryRow[] = [];

    for (const prov of groups) {
      totalAllJaring += prov.totalJaring;
      for (const city of prov.cities) {
        for (const dist of city.districts) {
          if (dist.villages.length > 0) {
            for (const vill of dist.villages) {
              rows.push({
                cityName: city.cityName,
                districtName: dist.districtName,
                villageName: vill.villageName,
                totalJaring: vill.totalJaring,
              });
            }
          } else {
            rows.push({
              cityName: city.cityName,
              districtName: dist.districtName,
              villageName: 'Wilayah Belum Ditentukan',
              totalJaring: dist.totalJaring,
            });
          }
        }
      }
    }

    const drawHeader = (isContinued: boolean = false) => {
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
        const align =
          i === 0 || i === colHeaders.length - 1 ? 'center' : 'left';
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

    let pageStartRowY = currentY;

    const closePageBlock = (bottomY: number) => {
      const blockHeight = bottomY - pageStartRowY;
      if (blockHeight <= 0) return;

      doc
        .rect(startX, pageStartRowY, 769, blockHeight)
        .lineWidth(0.75)
        .strokeColor('#94a3b8')
        .stroke();

      let vx = startX;
      for (let c = 0; c < colWidths.length; c++) {
        doc
          .moveTo(vx, pageStartRowY)
          .lineTo(vx, bottomY)
          .strokeColor('#cbd5e1')
          .stroke();
        vx += colWidths[c];
      }
    };

    for (let i = 0; i < rows.length; i++) {
      const item = rows[i];
      const rowNo = i + 1;

      if (535 - currentY < rowHeight) {
        closePageBlock(currentY);
        doc.addPage();
        currentY = 48;
        drawHeader(true);
        pageStartRowY = currentY;
      }

      const rowY = currentY;

      if (rowNo % 2 === 0) {
        doc
          .rect(startX, rowY, 769, rowHeight)
          .fillColor('#f8fafc')
          .fill();
      }

      doc
        .moveTo(startX, rowY + rowHeight)
        .lineTo(startX + 769, rowY + rowHeight)
        .lineWidth(0.5)
        .strokeColor('#e2e8f0')
        .stroke();

      // Kolom 1: NO.
      doc
        .fontSize(8.5)
        .font('Helvetica')
        .fillColor('#475569')
        .text(`${rowNo}.`, startX, rowY + 5.5, {
          width: colWidths[0],
          align: 'center',
          lineBreak: false,
        });

      if (is5Col) {
        // Kolom 2: KOTA / KABUPATEN
        const cityX = startX + colWidths[0];
        doc
          .fontSize(8.5)
          .font('Helvetica')
          .fillColor('#1e293b')
          .text(item.cityName, cityX + 6, rowY + 5.5, {
            width: colWidths[1] - 12,
            lineBreak: false,
          });

        // Kolom 3: KECAMATAN
        const distX = cityX + colWidths[1];
        doc
          .fontSize(8.5)
          .font('Helvetica')
          .fillColor('#1e293b')
          .text(item.districtName, distX + 6, rowY + 5.5, {
            width: colWidths[2] - 12,
            lineBreak: false,
          });

        // Kolom 4: KELURAHAN
        const villX = distX + colWidths[2];
        doc
          .fontSize(8.5)
          .font('Helvetica')
          .fillColor('#1e293b')
          .text(item.villageName, villX + 6, rowY + 5.5, {
            width: colWidths[3] - 12,
            lineBreak: false,
          });

        // Kolom 5: JUMLAH JARING
        const countX = villX + colWidths[3];
        doc
          .fontSize(8.5)
          .font('Helvetica-Bold')
          .fillColor('#0f172a')
          .text(
            `${item.totalJaring.toLocaleString('id-ID')} Orang`,
            countX,
            rowY + 5.5,
            {
              width: colWidths[4],
              align: 'center',
              lineBreak: false,
            },
          );
      } else if (is4Col) {
        // Kolom 2: KECAMATAN
        const distX = startX + colWidths[0];
        doc
          .fontSize(8.5)
          .font('Helvetica')
          .fillColor('#1e293b')
          .text(item.districtName, distX + 6, rowY + 5.5, {
            width: colWidths[1] - 12,
            lineBreak: false,
          });

        // Kolom 3: KELURAHAN
        const villX = distX + colWidths[1];
        doc
          .fontSize(8.5)
          .font('Helvetica')
          .fillColor('#1e293b')
          .text(item.villageName, villX + 6, rowY + 5.5, {
            width: colWidths[2] - 12,
            lineBreak: false,
          });

        // Kolom 4: JUMLAH JARING
        const countX = villX + colWidths[2];
        doc
          .fontSize(8.5)
          .font('Helvetica-Bold')
          .fillColor('#0f172a')
          .text(
            `${item.totalJaring.toLocaleString('id-ID')} Orang`,
            countX,
            rowY + 5.5,
            {
              width: colWidths[3],
              align: 'center',
              lineBreak: false,
            },
          );
      } else {
        // Kolom 2: KELURAHAN
        const villX = startX + colWidths[0];
        doc
          .fontSize(8.5)
          .font('Helvetica')
          .fillColor('#1e293b')
          .text(item.villageName, villX + 8, rowY + 5.5, {
            width: colWidths[1] - 16,
            lineBreak: false,
          });

        // Kolom 3: JUMLAH JARING
        const countX = villX + colWidths[1];
        doc
          .fontSize(8.5)
          .font('Helvetica-Bold')
          .fillColor('#0f172a')
          .text(
            `${item.totalJaring.toLocaleString('id-ID')} Orang`,
            countX,
            rowY + 5.5,
            {
              width: colWidths[2],
              align: 'center',
              lineBreak: false,
            },
          );
      }

      currentY += rowHeight;
    }

    closePageBlock(currentY);

    // Baris Total Keseluruhan
    const totalRowHeight = 24;
    if (540 - currentY < totalRowHeight + 5) {
      doc.addPage();
      currentY = 48;
    }

    doc
      .rect(startX, currentY, 769, totalRowHeight)
      .fillColor('#e2e8f0')
      .fill();
    doc
      .rect(startX, currentY, 769, totalRowHeight)
      .lineWidth(1)
      .strokeColor('#64748b')
      .stroke();

    const labelColSpan = colWidths
      .slice(0, colWidths.length - 1)
      .reduce((a, b) => a + b, 0);
    const lastColWidth = colWidths[colWidths.length - 1];

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text('TOTAL KESELURUHAN JARING', startX + 12, currentY + 6.5, {
        width: labelColSpan - 24,
        align: 'left',
        lineBreak: false,
      });

    doc
      .moveTo(startX + labelColSpan, currentY)
      .lineTo(startX + labelColSpan, currentY + totalRowHeight)
      .strokeColor('#94a3b8')
      .stroke();

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text(
        `${totalAllJaring.toLocaleString('id-ID')} Orang`,
        startX + labelColSpan,
        currentY + 6.5,
        {
          width: lastColWidth,
          align: 'center',
          lineBreak: false,
        },
      );
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
      const areaTitle = filterAreaName ? ` — ${filterAreaName.toUpperCase()}` : '';
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
              const isFirstOfDist =
                occIndex === 0 && vill === dist.villages[0];
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
      const areaTitle = filterAreaName ? ` — ${filterAreaName.toUpperCase()}` : '';
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
              const isFirstOfDist =
                occIndex === 0 && vill === dist.villages[0];
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
        .text(
          city.cityName.toUpperCase(),
          startX + 8,
          currentY + 6,
        );

      currentY += 22;

      doc.rect(startX, currentY, 769, 24).fillColor('#f1f5f9').fill();

      doc
        .rect(startX, currentY, 769, 24)
        .lineWidth(0.75)
        .strokeColor('#94a3b8')
        .stroke();

      let x = startX;
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#0f172a');
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
        .fontSize(10)
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
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text(displayName, codeX, rowTop + 14, {
          width: colWidths[1] - 16,
        });

      if (jaringCode && jaringCode !== '-' && jaringCode !== displayName) {
        doc
          .fontSize(8.5)
          .font('Helvetica')
          .fillColor('#475569')
          .text(`Kode: ${jaringCode}`, codeX, doc.y + 4, {
            width: colWidths[1] - 16,
          });
      }

      // Kolom 3: IDENTITAS (Penyesuaian Butir 5: sebelumnya PROFILING)
      const profX = startX + colWidths[0] + colWidths[1] + 12;
      let profY = rowTop + 12;

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
        { label: 'Jabatan', val: item.jobTitle || 'Anggota Jaring' },
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

      const areaLoc = [item.villageName, item.districtName, item.cityName]
        .filter((s) => s && s !== '-')
        .join(', ');
      if (areaLoc) {
        profilingRows.push({
          label: 'Wilayah',
          val: `${areaLoc} (${provinceName})`,
        });
      }

      if (item.gaswilName && item.gaswilName !== '-') {
        profilingRows.push({
          label: 'Gaswil',
          val: item.gaswilName,
        });
      }

      doc.fontSize(8.5);
      for (const p of profilingRows) {
        doc
          .font('Helvetica-Bold')
          .fillColor('#334155')
          .text(`- ${p.label}`, profX, profY, { width: 88, lineBreak: false });

        doc
          .font('Helvetica')
          .fillColor('#0f172a')
          .text(`: ${p.val}`, profX + 88, profY, {
            width: colWidths[2] - 110,
          });

        profY = doc.y + 2.5;
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
          .fontSize(8)
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
