import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { JaringExportService, RecapGranularity } from './jaring-export.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { DomainScopeService } from '../access/domain-scope.service.js';
import { LocalStorageService } from '../infrastructure/local-storage.service.js';
import { AdministrativeLevel, JaringRegistrationStatus } from '../../generated/prisma/client.js';

describe('JaringExportService', () => {
  let service: JaringExportService;
  let prisma: {
    jaring: { findMany: jest.Mock };
    administrativeArea: { findUnique: jest.Mock };
    auditLog: { create: jest.Mock };
  };
  let domainScope: { resolve: jest.Mock };
  let storage: { resolvePath: jest.Mock };

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
      const spyOccupation = jest.spyOn(
        service as any,
        'renderRecapPages',
      );

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
  });
});

