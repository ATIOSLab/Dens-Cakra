import { Injectable, Logger } from '@nestjs/common';
import {
  AdministrativeLevel,
  JaringRegistrationStatus,
  JaringStatus,
  Prisma,
} from '../../generated/prisma/client.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { DomainScopeService } from '../access/domain-scope.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SYSTEM_ROLES } from '../../common/constants/system-role.js';
import { resolveDescendantAreaIds } from '../../common/utils/area-closure.js';
import type { JaringExportPdfQueryDto } from './jaring.dto.js';
import {
  type CityGroup,
  type DistrictGroup,
  type FormattedJaring,
  type JaringReportDataDto,
  type OccupationStat,
  type ProfilingStatistics,
  type ProvinceGroup,
  RecapGranularity,
  type VillageGroup,
} from './jaring-report-data.dto.js';

@Injectable()
export class JaringReportDataService {
  private readonly logger = new Logger(JaringReportDataService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly domainScope: DomainScopeService,
  ) {}

  /**
   * Mengambil data terstruktur, tersaring, terhitung, dan teragregasi
   * untuk laporan buku profiling dan rekapitulasi data Jaring.
   */
  async getReportData(
    query: JaringExportPdfQueryDto,
    context: AuthorizationContext,
    recordAudit = true,
  ): Promise<JaringReportDataDto> {
    const { items, filterArea } = await this.fetchJaringData(query, context);
    const groups = this.groupData(items);
    const statistics = this.buildProfilingStatistics(items);
    const granularity = this.determineGranularity(filterArea, items);

    if (recordAudit) {
      await this.writeAudit(context, items.length);
    }

    return {
      meta: {
        title:
          query.title || 'BUKU PROFILING DAN REKAPITULASI DATA JARING',
        generatedAt: new Date().toISOString(),
        area: filterArea,
        granularity,
        options: {
          includeCover: query.includeCover !== false,
          includeMap: query.includeMap !== false,
          includeToc: query.includeToc !== false,
          includeRecap: query.includeRecap !== false,
          includeInfographic: query.includeInfographic !== false,
        },
      },
      summary: statistics.summary,
      wilayah: statistics.wilayah,
      gender: statistics.gender,
      ageGroups: statistics.ageGroups,
      generations: statistics.generations,
      occupations: statistics.occupations,
      statuses: statistics.statuses,
      groups,
      items,
    };
  }

  determineGranularity(
    filterArea: {
      id: string;
      name: string;
      level: AdministrativeLevel;
    } | null,
    items: FormattedJaring[],
  ): RecapGranularity {
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
    return granularity;
  }

  async fetchJaringData(
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

    const formattedItems: FormattedJaring[] = rawJarings.map((item) => {
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

      const formatted: FormattedJaring = {
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
        profilePhotoFileId: item.profilePhotoFile?.id || null,
        profilePhotoStorageKey: item.profilePhotoFile?.storageKey || null,
      };

      formatted.profilingRows = this.buildProfilingRows(formatted);
      return formatted;
    });

    return {
      items: formattedItems,
      filterArea,
    };
  }

  calculateJaringActivity(item: {
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

  extractOccupations(items: FormattedJaring[]): OccupationStat[] {
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

  groupData(items: FormattedJaring[]): ProvinceGroup[] {
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

  buildProfilingStatistics(
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

  normalizeOccupationCategory(item: FormattedJaring): string {
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

  async writeAudit(context: AuthorizationContext, count: number) {
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
