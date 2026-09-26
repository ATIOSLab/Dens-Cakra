import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import {
  JaringExportService,
  RecapGranularity,
} from './jaring-export.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { DomainScopeService } from '../access/domain-scope.service.js';
import { LocalStorageService } from '../infrastructure/local-storage.service.js';
import {
  AdministrativeLevel,
  JaringRegistrationStatus,
} from '../../generated/prisma/client.js';

describe('JaringExportService', () => {
  let service: JaringExportService;
  let prisma: {
    jaring: { findMany: jest.Mock<any, any> };
    administrativeArea: { findUnique: jest.Mock<any, any> };
    auditLog: { create: jest.Mock<any, any> };
  };
  let domainScope: { resolve: jest.Mock<any, any> };
  let storage: { resolvePath: jest.Mock<any, any> };

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
      }),
    };
    storage = {
      resolvePath: jest.fn().mockReturnValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JaringExportService,
        { provide: PrismaService, useValue: prisma },
        { provide: DomainScopeService, useValue: domainScope },
        { provide: LocalStorageService, useValue: storage },
      ],
    }).compile();

    service = module.get<JaringExportService>(JaringExportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Template & Hierarchy requirements', () => {
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
        profilePhotoFile: null,
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
      },
    ];

    it('mengekspor PDF dengan judul Deputi, header Kode Jaring, Identitas, dan Foto', async () => {
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

      const result = await service.exportPdf(
        {
          areaId: 'area-city-1',
          includeCover: true,
          includeToc: true,
          includeRecap: true,
        },
        context,
      );

      expect(result).toBeDefined();
      expect(result.contentType).toBe('application/pdf');
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(0);

      // Verifikasi bahwa PDFKit menghasilkan buffer valid yang mengandung header PDF
      const pdfString = result.buffer.toString('utf-8', 0, 300);
      expect(pdfString).toContain('%PDF-');
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

      // 1. Pastikan Jabatan dihapus sama sekali dari daftar baris
      const labels = rows.map((r) => r.label);
      expect(labels).not.toContain('Jabatan');

      // 2. Pastikan Wilayah hanya mencakup Kelurahan dan Kecamatan (tanpa Kota & tanpa Provinsi)
      const wilayahRow = rows.find((r) => r.label === 'Wilayah');
      expect(wilayahRow).toBeDefined();
      expect(wilayahRow?.val).toBe('Pondok Kopi, Duren Sawit');
      expect(wilayahRow?.val).not.toContain('Kota Administrasi Jakarta Timur');
      expect(wilayahRow?.val).not.toContain('Daerah Khusus Ibukota Jakarta');

      // 3. Pastikan identitas lainnya tetap lengkap
      expect(rows.find((r) => r.label === 'NIK')?.val).toBe('3171010101010001');
      expect(rows.find((r) => r.label === 'TTL')?.val).toContain('Jakarta, 09/09/1969');
      expect(rows.find((r) => r.label === 'Alamat')?.val).toBe(
        'Jln. Mawar merah Raya 02/01(34). Pondok kopi Jaktim.',
      );
      expect(rows.find((r) => r.label === 'Pekerjaan')?.val).toBe('Pedagang');
      expect(rows.find((r) => r.label === 'No. HP')?.val).toBe('6281380568989');
      expect(rows.find((r) => r.label === 'Organisasi')?.val).toBe(
        'FKDM Pondok Kopi',
      );
      expect(rows.find((r) => r.label === 'Gaswil')?.val).toBe('Rahmat');
    });

    it('memecah hierarki data sampai Kecamatan dan Kelurahan ketika filter Kota/Kabupaten diterapkan', async () => {
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

      const result = await service.exportPdf(
        {
          areaId: 'area-city-1',
          includeCover: false,
          includeToc: false,
          includeRecap: true,
        },
        context,
      );

      expect(result.buffer.length).toBeGreaterThan(0);
      expect(prisma.jaring.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            registrationStatus: JaringRegistrationStatus.APPROVED,
            areaCoverages: {
              some: {
                validUntil: null,
                areaId: { in: expect.arrayContaining(['area-city-1']) },
              },
            },
          }),
        }),
      );
    });

    it('memecah hierarki data sampai Kelurahan ketika filter Kecamatan diterapkan', async () => {
      prisma.jaring.findMany.mockResolvedValue([mockJarings[0]]);
      prisma.administrativeArea.findUnique.mockResolvedValue({
        id: 'area-dist-1',
        name: 'Kecamatan Gambir',
        level: AdministrativeLevel.DISTRICT,
      });

      const context: any = {
        authRole: 'national_leader',
        userProfileId: 'user-1',
        primaryAssignmentId: 'assign-1',
        organizationUnitId: 'bin-1',
      };

      const result = await service.exportPdf(
        {
          areaId: 'area-dist-1',
          includeCover: true,
          includeToc: true,
          includeRecap: true,
        },
        context,
      );

      expect(result.buffer.length).toBeGreaterThan(0);
    });

    it('memecah hierarki data sampai Kelurahan ketika filter Kelurahan diterapkan', async () => {
      prisma.jaring.findMany.mockResolvedValue([mockJarings[0]]);
      prisma.administrativeArea.findUnique.mockResolvedValue({
        id: 'area-vill-1',
        name: 'Gambir',
        level: AdministrativeLevel.URBAN_VILLAGE,
      });

      const context: any = {
        authRole: 'national_leader',
        userProfileId: 'user-1',
        primaryAssignmentId: 'assign-1',
        organizationUnitId: 'bin-1',
      };

      const result = await service.exportPdf(
        {
          areaId: 'area-vill-1',
          includeCover: true,
          includeToc: true,
          includeRecap: true,
        },
        context,
      );

      expect(result.buffer.length).toBeGreaterThan(0);
    });

    it('menggunakan granularitas Provinsi -> Kota/Kabupaten ketika tanpa filter wilayah', async () => {
      prisma.jaring.findMany.mockResolvedValue(mockJarings);
      prisma.administrativeArea.findUnique.mockResolvedValue(null);

      const context: any = {
        authRole: 'national_leader',
        userProfileId: 'user-1',
        primaryAssignmentId: 'assign-1',
        organizationUnitId: 'bin-1',
      };

      const result = await service.exportPdf(
        {
          includeCover: true,
          includeToc: true,
          includeRecap: true,
        },
        context,
      );

      expect(result.buffer.length).toBeGreaterThan(0);
    });

    it('merender kedua tabel (Persebaran Wilayah hingga Kelurahan dan Klasifikasi Pekerjaan) saat includeRecap aktif', async () => {
      prisma.jaring.findMany.mockResolvedValue(mockJarings);
      prisma.administrativeArea.findUnique.mockResolvedValue({
        id: 'area-prov-1',
        name: 'DKI Jakarta',
        level: AdministrativeLevel.PROVINCE,
      });

      const spyTerritory = jest.spyOn(
        service as any,
        'renderTerritoryRecapPages',
      );
      const spyOccupation = jest.spyOn(service as any, 'renderRecapPages');

      const context: any = {
        authRole: 'national_leader',
        userProfileId: 'user-1',
        primaryAssignmentId: 'assign-1',
        organizationUnitId: 'bin-1',
      };

      const result = await service.exportPdf(
        {
          areaId: 'area-prov-1',
          includeCover: true,
          includeToc: true,
          includeRecap: true,
        },
        context,
      );

      expect(result.buffer.length).toBeGreaterThan(0);
      expect(spyTerritory).toHaveBeenCalledTimes(1);
      expect(spyOccupation).toHaveBeenCalledTimes(1);
    });

    it('memastikan role admin_system / executive tidak membatasi caretakerAssignments dengan assignmentIds kosong ([])', async () => {
      prisma.jaring.findMany.mockResolvedValue(mockJarings);
      domainScope.resolve.mockResolvedValue({
        commandRouteType: 'DIRECTORATE',
        assignmentIds: [],
        areaRootIds: [],
      });

      const context: any = {
        authRole: 'admin_system',
        userProfileId: 'user-admin',
        primaryAssignmentId: 'assign-admin',
        organizationUnitId: 'admin-unit',
      };

      const result = await service.exportPdf(
        {
          includeCover: true,
          includeToc: true,
          includeRecap: true,
        },
        context,
      );

      expect(result.buffer.length).toBeGreaterThan(0);
      expect(prisma.jaring.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            caretakerAssignments: expect.objectContaining({
              some: expect.objectContaining({
                fieldOfficerAssignmentId: { in: [] },
              }),
            }),
          }),
        }),
      );
    });

    it('memastikan ekspor dengan jaringIds spesifik berhasil memfilter ID tanpa batasan gaswil', async () => {
      prisma.jaring.findMany.mockResolvedValue([mockJarings[0]]);
      domainScope.resolve.mockResolvedValue({
        commandRouteType: 'DIRECTORATE',
        assignmentIds: [],
        areaRootIds: [],
      });

      const context: any = {
        authRole: 'executive',
        userProfileId: 'user-exec',
        primaryAssignmentId: 'assign-exec',
        organizationUnitId: 'deputi-2',
      };

      const result = await service.exportPdf(
        {
          jaringIds: 'jaring-1, jaring-2',
          includeCover: false,
          includeToc: false,
          includeRecap: false,
        },
        context,
      );

      expect(result.buffer.length).toBeGreaterThan(0);
      expect(prisma.jaring.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: ['jaring-1', 'jaring-2'] },
            registrationStatus: JaringRegistrationStatus.APPROVED,
          }),
        }),
      );
    });

    it('merender Peta Sebaran DKI Jakarta dan Infografis Jaring saat includeMap dan includeInfographic aktif', async () => {
      prisma.jaring.findMany.mockResolvedValue(mockJarings);
      prisma.administrativeArea.findUnique.mockResolvedValue({
        id: 'area-prov-1',
        name: 'DKI Jakarta',
        level: AdministrativeLevel.PROVINCE,
      });

      const executionOrder: string[] = [];
      const spyMap = jest
        .spyOn(service as any, 'renderMapPage')
        .mockImplementation(async () => {
          executionOrder.push('map');
        });
      const spyInfographic = jest
        .spyOn(service as any, 'renderInfographicPages')
        .mockImplementation(async () => {
          executionOrder.push('infographic');
        });
      const spyRecap = jest
        .spyOn(service as any, 'renderTerritoryRecapPages')
        .mockImplementation(() => {
          executionOrder.push('recap');
        });
      const spyToc = jest.spyOn(service as any, 'renderTocPages');

      const context: any = {
        authRole: 'national_leader',
        userProfileId: 'user-1',
        primaryAssignmentId: 'assign-1',
        organizationUnitId: 'bin-1',
      };

      const result = await service.exportPdf(
        {
          includeCover: true,
          includeMap: true,
          includeToc: true,
          includeRecap: true,
          includeInfographic: true,
        },
        context,
      );

      expect(result.buffer.length).toBeGreaterThan(0);
      expect(spyMap).toHaveBeenCalledTimes(1);
      expect(spyInfographic).toHaveBeenCalledTimes(1);
      expect(spyRecap).toHaveBeenCalledTimes(1);

      // Verifikasi urutan eksekusi: Peta -> Infografis -> Rekapitulasi
      expect(executionOrder).toEqual(['map', 'infographic', 'recap']);

      // Verifikasi indeks halaman pada renderTocPages:
      // Urutan halaman: Peta (mapPageIndex) -> Infografis (infographicPageIndex) -> Rekapitulasi (recapTerritoryPageIndex)
      expect(spyToc).toHaveBeenCalledTimes(1);
      const tocCallArgs = spyToc.mock.calls[0];
      const recapTerritoryPageIndex = tocCallArgs[3];
      const mapPageIndex = tocCallArgs[8];
      const infographicPageIndex = tocCallArgs[9];
      expect(mapPageIndex).toBeGreaterThan(0);
      expect(infographicPageIndex).toBeGreaterThan(mapPageIndex);
      expect(recapTerritoryPageIndex).toBeGreaterThan(infographicPageIndex);
    });

    it('memastikan buildProfilingStatistics konsisten: Wiraswasta tersendiri, Lainnya paling bawah, dan total sinkron', () => {
      const formattedMock = [
        {
          id: '1',
          fullName: 'Ahmad Subardjo',
          aliasName: null,
          nationalIdNumber: null,
          address: null,
          birthPlace: null,
          birthDate: new Date('1998-05-10'), // Gen Z, age ~28
          gender: 'LAKI-LAKI',
          status: 'ACTIVE',
          jobTitle: null,
          workplace: null,
          occupationName: 'Wiraswasta',
          whatsappNumber: '081',
          organizationName: null,
          notes: null,
          provinceName: 'DKI Jakarta',
          cityName: 'Kota Jakarta Timur',
          districtName: 'Jatinegara',
          villageName: 'Bali Mester',
          gaswilName: 'Gaswil',
          profilePhotoStorageKey: null,
        },
        {
          id: '2',
          fullName: 'Siti Rahma',
          aliasName: null,
          nationalIdNumber: null,
          address: null,
          birthPlace: null,
          birthDate: new Date('1988-02-14'), // Milenial, age ~38
          gender: 'PEREMPUAN',
          status: 'INACTIVE',
          jobTitle: 'Karyawan PT Logistik',
          workplace: null,
          occupationName: 'Karyawan Swasta',
          whatsappNumber: '082',
          organizationName: null,
          notes: null,
          provinceName: 'DKI Jakarta',
          cityName: 'Kota Jakarta Selatan',
          districtName: 'Tebet',
          villageName: 'Tebet Barat',
          gaswilName: 'Gaswil',
          profilePhotoStorageKey: null,
        },
        {
          id: '3',
          fullName: 'Bambang Sudiro',
          aliasName: null,
          nationalIdNumber: null,
          address: null,
          birthPlace: null,
          birthDate: new Date('1970-11-20'), // Gen X, age ~56
          gender: 'MALE',
          status: 'ACTIVE',
          jobTitle: 'Pekerjaan Khusus Tak Teridentifikasi',
          workplace: null,
          occupationName: null,
          whatsappNumber: '083',
          organizationName: null,
          notes: null,
          provinceName: 'DKI Jakarta',
          cityName: 'Kota Jakarta Pusat',
          districtName: 'Gambir',
          villageName: 'Kebon Kelapa',
          gaswilName: 'Gaswil',
          profilePhotoStorageKey: null,
        },
      ];

      const stats = (service as any).buildProfilingStatistics(formattedMock);

      expect(stats.summary.total).toBe(3);
      expect(stats.summary.active).toBe(2);
      expect(stats.summary.inactive).toBe(1);
      expect(stats.summary.active + stats.summary.inactive).toBe(
        stats.summary.total,
      );

      // Gender sinkron
      const totalGender = stats.gender.items.reduce(
        (acc: number, item: any) => acc + item.count,
        0,
      );
      expect(totalGender).toBe(3);

      // Usia & Generasi
      const totalAge = stats.ageGroups.items.reduce(
        (acc: number, item: any) => acc + item.count,
        0,
      );
      expect(totalAge).toBe(3);

      const totalGen = stats.generations.items.reduce(
        (acc: number, item: any) => acc + item.count,
        0,
      );
      expect(totalGen).toBe(3);

      // 10 Kategori Pekerjaan
      expect(stats.occupations.topCategories.length).toBe(10);
      // Wiraswasta ada sebagai kategori tersendiri
      const wiraswasta = stats.occupations.topCategories.find(
        (o: any) => o.name === 'Wiraswasta',
      );
      expect(wiraswasta).toBeDefined();
      expect(wiraswasta.count).toBe(1);

      // Lainnya WAJIB berada di urutan paling bawah (index 9)
      const lastCategory = stats.occupations.topCategories[9];
      expect(lastCategory.name).toBe('Lainnya');
      expect(lastCategory.count).toBe(1); // item 3 masuk Lainnya

      // Total seluruh pekerjaan sama dengan total data jaring
      const totalOcc = stats.occupations.topCategories.reduce(
        (acc: number, o: any) => acc + o.count,
        0,
      );
      expect(totalOcc).toBe(3);
    });

    it('menghitung status keaktifan jaring sesuai standar dashboard (berdasarkan laporan 90 hari terakhir)', () => {
      const now = new Date();
      const tenDaysAgo = new Date(Date.now() - 10 * 86_400_000);
      const oneHundredDaysAgo = new Date(Date.now() - 100 * 86_400_000);

      // Jaring 1: Ada pesan dalam 10 hari terakhir -> ACTIVE
      const res1 = (service as any).calculateJaringActivity({
        messages: [{ receivedAt: tenDaysAgo }],
        reportSessions: [],
      });
      expect(res1.status).toBe('ACTIVE');
      expect(res1.lastReportAt).toBeDefined();

      // Jaring 2: Ada report session dalam 10 hari terakhir -> ACTIVE
      const res2 = (service as any).calculateJaringActivity({
        messages: [],
        reportSessions: [{ submittedAt: tenDaysAgo }],
      });
      expect(res2.status).toBe('ACTIVE');

      // Jaring 3: Pesan lama (> 90 hari lalu) dan tanpa session baru -> INACTIVE
      const res3 = (service as any).calculateJaringActivity({
        messages: [{ receivedAt: oneHundredDaysAgo }],
        reportSessions: [],
      });
      expect(res3.status).toBe('INACTIVE');

      // Jaring 4: Belum pernah mengirim laporan atau pesan sama sekali -> INACTIVE
      const res4 = (service as any).calculateJaringActivity({
        messages: [],
        reportSessions: [],
      });
      expect(res4.status).toBe('INACTIVE');
      expect(res4.lastReportAt).toBeNull();

      // Jaring 5: Fallback tanpa relation messages/reportSessions (mock biasa)
      const res5 = (service as any).calculateJaringActivity({
        status: 'ACTIVE',
      });
      expect(res5.status).toBe('ACTIVE');

      const res6 = (service as any).calculateJaringActivity({
        status: 'INACTIVE',
      });
      expect(res6.status).toBe('INACTIVE');
    });
  });
});
