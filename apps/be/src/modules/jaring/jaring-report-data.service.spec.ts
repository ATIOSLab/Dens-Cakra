import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { JaringReportDataService } from './jaring-report-data.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { DomainScopeService } from '../access/domain-scope.service.js';
import { AdministrativeLevel } from '../../generated/prisma/client.js';
import { RecapGranularity } from './jaring-report-data.dto.js';

describe('JaringReportDataService', () => {
  let service: JaringReportDataService;
  let prisma: {
    jaring: { findMany: jest.Mock<any, any> };
    administrativeArea: { findUnique: jest.Mock<any, any> };
    auditLog: { create: jest.Mock<any, any> };
  };
  let domainScope: { resolve: jest.Mock<any, any> };

  const mockJarings = [
    {
      id: 'jaring-1',
      fullName: 'Budi Santoso',
      aliasName: 'JAKPUS01001',
      nationalIdNumber: '3171010101010001',
      address: 'Jl. Merdeka No. 1',
      birthPlace: 'Jakarta',
      birthDate: new Date('1990-01-01'),
      jobTitle: 'Anggota Jaring',
      workplace: 'Swasta',
      whatsappNumber: '6281234567890',
      organizationName: 'Ormas Nusantara',
      notes: null,
      occupation: { name: 'Wiraswasta' },
      profilePhotoFile: { id: 'file-1', storageKey: 'photos/j1.jpg' },
      areaCoverages: [
        {
          validUntil: null,
          area: {
            name: 'Gambir',
            level: AdministrativeLevel.URBAN_VILLAGE,
            parent: {
              name: 'Kecamatan Gambir',
              level: AdministrativeLevel.DISTRICT,
              parent: {
                name: 'Kota Jakarta Pusat',
                level: AdministrativeLevel.CITY,
                parent: {
                  name: 'DKI Jakarta',
                  level: AdministrativeLevel.PROVINCE,
                },
              },
            },
          },
        },
      ],
      caretakerAssignments: [
        {
          isActive: true,
          validUntil: null,
          fieldOfficerAssignment: {
            userProfile: { fullName: 'Gaswil Satu', username: 'gaswil1' },
          },
        },
      ],
      messages: [{ receivedAt: new Date() }],
      reportSessions: [],
    },
    {
      id: 'jaring-2',
      fullName: 'Agus Wijaya',
      aliasName: 'JAKPUS01002',
      nationalIdNumber: '3171010101010002',
      address: 'Jl. Sabang No. 5',
      birthPlace: 'Bandung',
      birthDate: new Date('1985-05-05'),
      jobTitle: 'Anggota Jaring',
      workplace: 'Kantor Pengacara',
      whatsappNumber: '6281298765432',
      organizationName: null,
      notes: null,
      occupation: { name: 'Advokat' },
      profilePhotoFile: null,
      areaCoverages: [
        {
          validUntil: null,
          area: {
            name: 'Kebon Kelapa',
            level: AdministrativeLevel.URBAN_VILLAGE,
            parent: {
              name: 'Kecamatan Gambir',
              level: AdministrativeLevel.DISTRICT,
              parent: {
                name: 'Kota Jakarta Pusat',
                level: AdministrativeLevel.CITY,
                parent: {
                  name: 'DKI Jakarta',
                  level: AdministrativeLevel.PROVINCE,
                },
              },
            },
          },
        },
      ],
      caretakerAssignments: [],
      messages: [],
      reportSessions: [],
    },
  ];

  beforeEach(async () => {
    prisma = {
      jaring: { findMany: jest.fn() },
      administrativeArea: { findUnique: jest.fn() },
      auditLog: { create: jest.fn() },
    };
    domainScope = {
      resolve: jest.fn().mockResolvedValue({
        commandRouteType: 'DIRECTORATE',
        assignmentIds: ['assignment-1'],
        areaRootIds: [],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JaringReportDataService,
        { provide: PrismaService, useValue: prisma },
        { provide: DomainScopeService, useValue: domainScope },
      ],
    }).compile();

    service = module.get<JaringReportDataService>(JaringReportDataService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getReportData single source of truth and contract', () => {
    it('menghasilkan report data DTO lengkap dengan statistik dan validasi invarian', async () => {
      prisma.jaring.findMany.mockResolvedValue(mockJarings);
      prisma.administrativeArea.findUnique.mockResolvedValue({
        id: 'area-city-1',
        name: 'Kota Jakarta Pusat',
        level: AdministrativeLevel.CITY,
      });

      const context: any = {
        authRole: 'national_leader',
        userProfileId: 'user-1',
        primaryAssignmentId: 'assign-1',
        organizationUnitId: 'bin-1',
      };

      const result = await service.getReportData(
        {
          areaId: 'area-city-1',
          includeCover: true,
          includeMap: true,
          includeToc: true,
          includeRecap: true,
          includeInfographic: true,
        },
        context,
        true,
      );

      expect(result).toBeDefined();
      expect(result.meta.title).toBe(
        'BUKU PROFILING DAN REKAPITULASI DATA JARING',
      );
      expect(result.meta.granularity).toBe(
        RecapGranularity.CITY_DISTRICT_VILLAGE,
      );
      expect(result.items.length).toBe(2);

      // Invariant 1: total === items.length
      expect(result.summary.total).toBe(result.items.length);

      // Invariant 2: active + inactive === total
      expect(result.summary.active + result.summary.inactive).toBe(
        result.summary.total,
      );

      // Invariant 3: sum of cities totalJaring === total
      const totalInGroups = result.groups.reduce(
        (sum, p) => sum + p.totalJaring,
        0,
      );
      expect(totalInGroups).toBe(result.summary.total);

      // Verify audit was logged
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'JARING.EXPORT_PDF',
            actorUserProfileId: 'user-1',
          }),
        }),
      );
    });

    it('memastikan baris profiling menghapus Jabatan dan membatasi Wilayah hanya Kelurahan dan Kecamatan', () => {
      const mockItem: any = {
        fullName: 'Budi Santoso',
        nationalIdNumber: '3171010101010001',
        birthPlace: 'Jakarta',
        birthDate: new Date('1969-09-09'),
        address: 'Jln. Mawar merah Raya 02/01(34). Pondok kopi Jaktim.',
        occupationName: 'Pedagang',
        whatsappNumber: '6281380568989',
        organizationName: 'FKDM Pondok Kopi',
        jobTitle: 'FKDM Pondok Kopi',
        villageName: 'Pondok Kopi',
        districtName: 'Duren Sawit',
        cityName: 'Kota Administrasi Jakarta Timur',
        provinceName: 'Daerah Khusus Ibukota Jakarta',
        gaswilName: 'Rahmat',
      };

      const rows = service.buildProfilingRows(mockItem);

      const labels = rows.map((r) => r.label);
      expect(labels).not.toContain('Jabatan');

      const wilayahRow = rows.find((r) => r.label === 'Wilayah');
      expect(wilayahRow).toBeDefined();
      expect(wilayahRow?.val).toBe('Pondok Kopi, Duren Sawit');
      expect(wilayahRow?.val).not.toContain('Kota Administrasi Jakarta Timur');
      expect(wilayahRow?.val).not.toContain('Daerah Khusus Ibukota Jakarta');

      expect(rows.find((r) => r.label === 'NIK')?.val).toBe('3171010101010001');
      expect(rows.find((r) => r.label === 'TTL')?.val).toContain(
        'Jakarta, 09/09/1969',
      );
      expect(rows.find((r) => r.label === 'Pekerjaan')?.val).toBe('Pedagang');
      expect(rows.find((r) => r.label === 'No. HP')?.val).toBe('6281380568989');
      expect(rows.find((r) => r.label === 'Organisasi')?.val).toBe(
        'FKDM Pondok Kopi',
      );
      expect(rows.find((r) => r.label === 'Gaswil')?.val).toBe('Rahmat');
    });

    it('menghitung status keaktifan jaring sesuai standar 90 hari', () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 10);

      const activeItem = service.calculateJaringActivity({
        messages: [{ receivedAt: recentDate }],
        reportSessions: [],
      });
      expect(activeItem.status).toBe('ACTIVE');
      expect(activeItem.lastReportAt).toBe(recentDate.toISOString());
      expect(activeItem.isActive30Days).toBe(true);
      expect(activeItem.isActive60Days).toBe(true);
      expect(activeItem.isActive90Days).toBe(true);

      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 120);

      const inactiveItem = service.calculateJaringActivity({
        messages: [{ receivedAt: oldDate }],
        reportSessions: [],
      });
      expect(inactiveItem.status).toBe('INACTIVE');
      expect(inactiveItem.lastReportAt).toBe(oldDate.toISOString());
      expect(inactiveItem.isActive30Days).toBe(false);
      expect(inactiveItem.isActive60Days).toBe(false);
      expect(inactiveItem.isActive90Days).toBe(false);
    });

    it('menghitung status keaktifan jaring untuk jendela 30 hari dan 60 hari', () => {
      // Melapor 45 hari yang lalu: aktif untuk 60 dan 90 hari, tapi tidak aktif untuk 30 hari
      const date45DaysAgo = new Date();
      date45DaysAgo.setDate(date45DaysAgo.getDate() - 45);

      const item45 = service.calculateJaringActivity(
        {
          messages: [{ receivedAt: date45DaysAgo }],
          reportSessions: [],
        },
        30,
      );
      expect(item45.status).toBe('INACTIVE'); // inactive in 30-day window
      expect(item45.isActive30Days).toBe(false);
      expect(item45.isActive60Days).toBe(true);
      expect(item45.isActive90Days).toBe(true);

      const item45With60Window = service.calculateJaringActivity(
        {
          messages: [{ receivedAt: date45DaysAgo }],
          reportSessions: [],
        },
        60,
      );
      expect(item45With60Window.status).toBe('ACTIVE'); // active in 60-day window

      // Melapor 15 hari yang lalu: aktif di semua jendela (30, 60, 90)
      const date15DaysAgo = new Date();
      date15DaysAgo.setDate(date15DaysAgo.getDate() - 15);

      const item15 = service.calculateJaringActivity(
        {
          messages: [{ receivedAt: date15DaysAgo }],
          reportSessions: [],
        },
        30,
      );
      expect(item15.status).toBe('ACTIVE');
      expect(item15.isActive30Days).toBe(true);
      expect(item15.isActive60Days).toBe(true);
      expect(item15.isActive90Days).toBe(true);
    });
  });
});
