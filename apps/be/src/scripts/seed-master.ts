import {
  AdministrativeLevel,
  AreaScopeMode,
  IntegrationStatus,
  CommandRouteType,
  PositionCode,
  RoleCode,
} from '../generated/prisma/client.js';
import { AUTH_ROLE_TO_DOMAIN_ROLE } from '../common/constants/auth-role.js';
import { SYSTEM_ROLE_CATALOG } from '../common/constants/system-role.js';
import { prisma } from '../modules/prisma/prisma.service.js';

const positionAreaPolicies = [
  {
    positionCode: PositionCode.DEPUTI_II,
    administrativeLevel: AdministrativeLevel.COUNTRY,
    scopeMode: AreaScopeMode.NATIONAL,
    minimumAreas: 1,
    maximumAreas: 1,
  },
  {
    positionCode: PositionCode.DIREKTUR_WILAYAH,
    administrativeLevel: AdministrativeLevel.PROVINCE,
    scopeMode: AreaScopeMode.EXPLICIT,
    minimumAreas: 1,
    maximumAreas: null,
  },
  {
    positionCode: PositionCode.KABINDA,
    administrativeLevel: AdministrativeLevel.PROVINCE,
    scopeMode: AreaScopeMode.EXPLICIT,
    minimumAreas: 1,
    maximumAreas: 1,
  },
  {
    positionCode: PositionCode.KASUBDIT,
    administrativeLevel: AdministrativeLevel.PROVINCE,
    scopeMode: AreaScopeMode.EXPLICIT,
    minimumAreas: 1,
    maximumAreas: null,
  },
  {
    positionCode: PositionCode.KABAGOPS,
    administrativeLevel: AdministrativeLevel.PROVINCE,
    scopeMode: AreaScopeMode.INHERIT_UNIT,
    minimumAreas: 1,
    maximumAreas: 1,
  },
  {
    positionCode: PositionCode.STAF_SUBDIT,
    administrativeLevel: AdministrativeLevel.PROVINCE,
    scopeMode: AreaScopeMode.EXPLICIT,
    minimumAreas: 1,
    maximumAreas: null,
  },
  {
    positionCode: PositionCode.STAF_SUBDIT,
    administrativeLevel: AdministrativeLevel.REGENCY,
    scopeMode: AreaScopeMode.EXPLICIT,
    minimumAreas: 1,
    maximumAreas: null,
  },
  {
    positionCode: PositionCode.STAF_SUBDIT,
    administrativeLevel: AdministrativeLevel.CITY,
    scopeMode: AreaScopeMode.EXPLICIT,
    minimumAreas: 1,
    maximumAreas: null,
  },
  {
    positionCode: PositionCode.KORWIL,
    administrativeLevel: AdministrativeLevel.REGENCY,
    scopeMode: AreaScopeMode.EXPLICIT,
    minimumAreas: 1,
    maximumAreas: null,
  },
  {
    positionCode: PositionCode.KORWIL,
    administrativeLevel: AdministrativeLevel.CITY,
    scopeMode: AreaScopeMode.EXPLICIT,
    minimumAreas: 1,
    maximumAreas: null,
  },
  {
    positionCode: PositionCode.PETUGAS_ORGANIK,
    administrativeLevel: AdministrativeLevel.REGENCY,
    scopeMode: AreaScopeMode.EXPLICIT,
    minimumAreas: 1,
    maximumAreas: null,
  },
  {
    positionCode: PositionCode.PETUGAS_ORGANIK,
    administrativeLevel: AdministrativeLevel.CITY,
    scopeMode: AreaScopeMode.EXPLICIT,
    minimumAreas: 1,
    maximumAreas: null,
  },
  {
    positionCode: PositionCode.PETUGAS_ORGANIK,
    administrativeLevel: AdministrativeLevel.DISTRICT,
    scopeMode: AreaScopeMode.EXPLICIT,
    minimumAreas: 1,
    maximumAreas: null,
  },
  {
    positionCode: PositionCode.PETUGAS_ORGANIK,
    administrativeLevel: AdministrativeLevel.VILLAGE,
    scopeMode: AreaScopeMode.EXPLICIT,
    minimumAreas: 1,
    maximumAreas: null,
  },
  {
    positionCode: PositionCode.PETUGAS_ORGANIK,
    administrativeLevel: AdministrativeLevel.URBAN_VILLAGE,
    scopeMode: AreaScopeMode.EXPLICIT,
    minimumAreas: 1,
    maximumAreas: null,
  },
  {
    positionCode: PositionCode.PETUGAS_ORGANIK,
    administrativeLevel: AdministrativeLevel.RW,
    scopeMode: AreaScopeMode.EXPLICIT,
    minimumAreas: 1,
    maximumAreas: null,
  },
  {
    positionCode: PositionCode.PETUGAS_ORGANIK,
    administrativeLevel: AdministrativeLevel.RT,
    scopeMode: AreaScopeMode.EXPLICIT,
    minimumAreas: 1,
    maximumAreas: null,
  },
] as const;

const productTypeSeeds = [
  ['JURNAL_INFORMASI', 'Jurnal Informasi', '1', 'JI', ['Items']],
  [
    'LAPORAN_INFORMASI',
    'Laporan Informasi',
    '2',
    'LI',
    ['Fakta', 'Catatan', 'Lampiran'],
  ],
  [
    'LAPORAN_INTELIJEN',
    'Laporan Intelijen',
    '4',
    'LAPINTEL',
    ['Indikasi', 'Analisis', 'Dampak', 'Upaya', 'Saran Tindak'],
  ],
  [
    'BASIC_DESCRIPTIVE_INTELLIGENCE',
    'Basic Descriptive Intelligence',
    '6',
    'BDI',
    ['Pendahuluan', 'Kedalaman', 'Anteseden', 'Spot Intelijen', 'Pustaka'],
  ],
  [
    'LAPORAN_HARIAN_INTELIJEN',
    'Laporan Harian Intelijen',
    '8',
    'LHI',
    ['Situasi Dalam Negeri', 'Situasi Luar Negeri'],
  ],
  [
    'LAPORAN_INTELIJEN_KHUSUS',
    'Laporan Intelijen Khusus',
    '9',
    'LAPINTELSUS',
    ['Indikasi', 'Analisis', 'Dampak', 'Upaya', 'Saran Tindak'],
  ],
  [
    'PERKIRAAN_INTELIJEN_SITUASI',
    'Perkiraan Intelijen Situasi',
    '20',
    'PIS',
    ['Indikasi', 'Analisis', 'Upaya', 'Saran Tindak'],
  ],
] as const;

const verificationCheckCodes = [
  'SOURCE_IDENTITY',
  'TITLE_COMPLETENESS',
  'PHOTO_VALIDITY',
  'GPS_VALIDITY',
  'CONTENT_COMPLETENESS',
  'TASK_RELEVANCE',
  'UUK_RELEVANCE',
  'DUPLICATE_CHECK',
  'TIME_CONSISTENCY',
  'LOCATION_CONSISTENCY',
  'CROSS_REFERENCE',
] as const;

const jaringClusterSeeds = [
  [
    'POLITICAL_SECURITY',
    'Politik dan Keamanan',
    'Jaring pada isu politik, pemerintahan, dan stabilitas keamanan.',
  ],
  [
    'ECONOMY_FINANCE',
    'Ekonomi dan Keuangan',
    'Jaring pada aktivitas ekonomi, perdagangan, dan keuangan.',
  ],
  [
    'SOCIAL_CULTURE',
    'Sosial dan Budaya',
    'Jaring pada dinamika sosial, komunitas, pendidikan, dan budaya.',
  ],
  [
    'DEFENSE_SECURITY',
    'Pertahanan dan Keamanan',
    'Jaring pada objek vital, pertahanan, dan keamanan wilayah.',
  ],
  [
    'CYBER_INFORMATION',
    'Siber dan Informasi',
    'Jaring pada ruang siber, media, dan ekosistem informasi.',
  ],
  [
    'TRANSNATIONAL',
    'Kejahatan Transnasional',
    'Jaring pada lintas batas, penyelundupan, dan jaringan transnasional.',
  ],
  [
    'NATURAL_RESOURCES',
    'Sumber Daya Alam',
    'Jaring pada energi, pangan, lingkungan, dan sumber daya alam.',
  ],
  [
    'STRATEGIC_INFRASTRUCTURE',
    'Infrastruktur Strategis',
    'Jaring pada transportasi, telekomunikasi, dan infrastruktur vital.',
  ],
] as const;

const reportCategorySeeds = [
  [
    'SITUATION_UPDATE',
    'Perkembangan Situasi',
    'Laporan perkembangan kondisi wilayah secara periodik.',
  ],
  [
    'INCIDENT_REPORT',
    'Kejadian Menonjol',
    'Laporan kejadian lapangan yang memerlukan perhatian.',
  ],
  [
    'EARLY_WARNING',
    'Peringatan Dini',
    'Laporan indikasi awal dan potensi eskalasi.',
  ],
  [
    'PERSONNEL_MOVEMENT',
    'Pergerakan Orang dan Kelompok',
    'Laporan mobilitas aktor, kelompok, atau massa.',
  ],
  [
    'COMMUNITY_DYNAMICS',
    'Dinamika Masyarakat',
    'Laporan aspirasi, respons, dan dinamika komunitas.',
  ],
  [
    'ECONOMIC_ACTIVITY',
    'Aktivitas Ekonomi',
    'Laporan aktivitas ekonomi dan distribusi komoditas.',
  ],
  [
    'CYBER_INFORMATION',
    'Informasi Siber dan Media',
    'Laporan isu siber, disinformasi, dan media digital.',
  ],
  [
    'BORDER_MARITIME',
    'Perbatasan dan Maritim',
    'Laporan aktivitas perbatasan, pelabuhan, dan wilayah maritim.',
  ],
] as const;

async function seedRoles() {
  for (const role of SYSTEM_ROLE_CATALOG) {
    await prisma.role.upsert({
      where: {
        code: AUTH_ROLE_TO_DOMAIN_ROLE[role.key],
      },
      update: {
        name: role.label,
        description: role.summary,
        isActive: true,
      },
      create: {
        code: AUTH_ROLE_TO_DOMAIN_ROLE[role.key],
        name: role.label,
        description: role.summary,
        isActive: true,
      },
    });
  }
}

async function seedPositionAreaPolicies() {
  for (const policy of positionAreaPolicies) {
    const mapped = mapRoleAreaPolicy(policy.positionCode);
    const existing = await prisma.roleAreaPolicy.findFirst({
      where: {
        roleCode: mapped.roleCode,
        administrativeLevel: policy.administrativeLevel,
        ...(mapped.branch ? { branch: mapped.branch } : { branch: null }),
      },
      select: { id: true },
    });
    if (existing) {
      await prisma.roleAreaPolicy.update({
        where: { id: existing.id },
        data: {
          scopeMode: policy.scopeMode,
          minimumAreas: policy.minimumAreas,
          maximumAreas: policy.maximumAreas,
          isActive: true,
        },
      });
      continue;
    }
    await prisma.roleAreaPolicy.create({
      data: {
        roleCode: mapped.roleCode,
        ...(mapped.branch ? { branch: mapped.branch } : {}),
        administrativeLevel: policy.administrativeLevel,
        scopeMode: policy.scopeMode,
        minimumAreas: policy.minimumAreas,
        maximumAreas: policy.maximumAreas,
        isActive: true,
      },
    });
  }
}

function mapRoleAreaPolicy(positionCode: PositionCode): {
  roleCode: RoleCode;
  branch: CommandRouteType | null;
} {
  switch (positionCode) {
    case PositionCode.DEPUTI_II:
      return { roleCode: RoleCode.EXECUTIVE, branch: CommandRouteType.PUSAT };
    case PositionCode.DIREKTUR_WILAYAH:
      return {
        roleCode: RoleCode.REGIONAL_COMMANDER,
        branch: CommandRouteType.DIRECTORATE,
      };
    case PositionCode.KABINDA:
      return {
        roleCode: RoleCode.REGIONAL_COMMANDER,
        branch: CommandRouteType.BINDA,
      };
    case PositionCode.KASUBDIT:
      return {
        roleCode: RoleCode.OPERATIONAL_INTELLIGENCE_MANAGER,
        branch: CommandRouteType.DIRECTORATE,
      };
    case PositionCode.KABAGOPS:
      return {
        roleCode: RoleCode.OPERATIONAL_INTELLIGENCE_MANAGER,
        branch: CommandRouteType.BINDA,
      };
    case PositionCode.STAF_SUBDIT:
      return {
        roleCode: RoleCode.FIELD_COORDINATOR,
        branch: CommandRouteType.DIRECTORATE,
      };
    case PositionCode.KORWIL:
      return {
        roleCode: RoleCode.FIELD_COORDINATOR,
        branch: CommandRouteType.BINDA,
      };
    case PositionCode.PETUGAS_ORGANIK:
      return { roleCode: RoleCode.FIELD_OFFICER, branch: null };
    case PositionCode.ADMIN:
      return { roleCode: RoleCode.ADMIN_SYSTEM, branch: null };
  }
}

async function seedCountryRoot() {
  const rootCountry = await prisma.administrativeArea.upsert({
    where: {
      officialCode: 'IDN',
    },
    update: {
      code: 'ID',
      name: 'Indonesia',
      level: AdministrativeLevel.COUNTRY,
      isActive: true,
      deletedAt: null,
    },
    create: {
      code: 'ID',
      officialCode: 'IDN',
      name: 'Indonesia',
      level: AdministrativeLevel.COUNTRY,
      isActive: true,
    },
  });

  await prisma.administrativeAreaClosure.upsert({
    where: {
      ancestorId_descendantId: {
        ancestorId: rootCountry.id,
        descendantId: rootCountry.id,
      },
    },
    update: {
      depth: 0,
    },
    create: {
      ancestorId: rootCountry.id,
      descendantId: rootCountry.id,
      depth: 0,
    },
  });
}

async function seedProductTypesAndTemplates() {
  for (const [code, name, formatNo, numberCode, sections] of productTypeSeeds) {
    const productType = await prisma.productTypeDefinition.upsert({
      where: {
        code,
      },
      update: {
        name,
        formatNo,
        numberCode,
        isActive: true,
      },
      create: {
        code,
        name,
        formatNo,
        numberCode,
        description: `Seeded from DENS CAKRA v1.1 baseline for ${name}.`,
        isActive: true,
      },
    });

    const template = await prisma.productTemplate.upsert({
      where: {
        productTypeId_versionNumber: {
          productTypeId: productType.id,
          versionNumber: 1,
        },
      },
      update: {
        name: `${name} Template v1`,
        isActive: false,
      },
      create: {
        productTypeId: productType.id,
        versionNumber: 1,
        name: `${name} Template v1`,
        isActive: false,
      },
    });

    for (const [index, sectionTitle] of sections.entries()) {
      const sectionCode = sectionTitle
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_|_$/g, '');

      const section = await prisma.productTemplateSection.upsert({
        where: {
          templateId_code: {
            templateId: template.id,
            code: sectionCode,
          },
        },
        update: {
          title: sectionTitle,
          orderNumber: index + 1,
        },
        create: {
          templateId: template.id,
          code: sectionCode,
          title: sectionTitle,
          orderNumber: index + 1,
          isRepeatable: false,
        },
      });

      await prisma.productTemplateField.upsert({
        where: {
          sectionId_code: {
            sectionId: section.id,
            code: 'CONTENT',
          },
        },
        update: {
          label: `${sectionTitle} Content`,
          dataType: 'TEXT',
          isRequired: true,
          orderNumber: 1,
        },
        create: {
          sectionId: section.id,
          code: 'CONTENT',
          label: `${sectionTitle} Content`,
          dataType: 'TEXT',
          isRequired: true,
          orderNumber: 1,
        },
      });
    }

    const officialSections = [
      ...sections,
      ...([
        'LAPORAN_INTELIJEN',
        'LAPORAN_INTELIJEN_KHUSUS',
        'PERKIRAAN_INTELIJEN_SITUASI',
      ].includes(code)
        ? ['Lampiran']
        : []),
    ].map((title) => (title === 'Pustaka' ? 'Daftar Pustaka' : title));
    const officialTemplate = await prisma.productTemplate.upsert({
      where: {
        productTypeId_versionNumber: {
          productTypeId: productType.id,
          versionNumber: 2,
        },
      },
      update: { name: `${name} Format Resmi v2`, isActive: true },
      create: {
        productTypeId: productType.id,
        versionNumber: 2,
        name: `${name} Format Resmi v2`,
        isActive: true,
      },
    });

    for (const [index, sectionTitle] of officialSections.entries()) {
      const sectionCode = sectionTitle
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
      const isJournalRows =
        code === 'JURNAL_INFORMASI' && sectionTitle === 'Items';
      const section = await prisma.productTemplateSection.upsert({
        where: {
          templateId_code: {
            templateId: officialTemplate.id,
            code: sectionCode,
          },
        },
        update: {
          title: sectionTitle,
          orderNumber: index + 1,
          isRepeatable: isJournalRows,
        },
        create: {
          templateId: officialTemplate.id,
          code: sectionCode,
          title: sectionTitle,
          orderNumber: index + 1,
          isRepeatable: isJournalRows,
        },
      });
      const fields = isJournalRows
        ? ([
            ['NO_URUT', 'Nomor Urut', 'NUMBER', true],
            ['PERMASALAHAN_AGENDA', 'Permasalahan dan Agenda', 'TEXT', true],
            ['DAERAH_KEJADIAN', 'Daerah Kejadian', 'TEXT', true],
            ['MATERI_SUMBER', 'Materi Informasi dan Sumber', 'TEXT', true],
          ] as const)
        : ([
            [
              'CONTENT',
              code === 'LAPORAN_HARIAN_INTELIJEN'
                ? `${sectionTitle} (uraian 5W+1H)`
                : sectionTitle,
              'RICH_TEXT',
              sectionTitle !== 'Lampiran',
            ],
          ] as const);
      for (const [fieldIndex, field] of fields.entries()) {
        await prisma.productTemplateField.upsert({
          where: { sectionId_code: { sectionId: section.id, code: field[0] } },
          update: {
            label: field[1],
            dataType: field[2],
            isRequired: field[3],
            orderNumber: fieldIndex + 1,
          },
          create: {
            sectionId: section.id,
            code: field[0],
            label: field[1],
            dataType: field[2],
            isRequired: field[3],
            orderNumber: fieldIndex + 1,
          },
        });
      }
    }
  }
}

async function seedBaketMasterData() {
  for (const [code, name, description] of jaringClusterSeeds) {
    await prisma.jaringCluster.upsert({
      where: { code },
      update: { name, description, isActive: true },
      create: { code, name, description, isActive: true },
    });
  }

  for (const [code, name, description] of reportCategorySeeds) {
    await prisma.reportCategory.upsert({
      where: { code },
      update: { name, description, isActive: true },
      create: { code, name, description, isActive: true },
    });
  }
}

async function seedSystemSettingsAndIntegration() {
  const settings = [
    {
      key: 'app.name',
      value: 'DENS CAKRA',
      description: 'Application display name.',
    },
    {
      key: 'geo.defaultCountryCode',
      value: 'IDN',
      description: 'Default root country for area hierarchy.',
    },
    {
      key: 'verification.checkCodes',
      value: verificationCheckCodes,
      description: 'Formal verification checklist baseline.',
    },
    {
      key: 'seed.rwrtStatus',
      value: {
        status: 'pending_source',
        note: 'RW/RT schema ready; seed deferred until official source is available.',
      },
      description: 'Tracks RW/RT seed readiness.',
    },
  ] as const;

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: {
        key: setting.key,
      },
      update: {
        value: setting.value,
        description: setting.description,
        isSecret: false,
      },
      create: {
        key: setting.key,
        value: setting.value,
        description: setting.description,
        isSecret: false,
      },
    });
  }

  await prisma.integrationChannel.upsert({
    where: {
      code: 'WA_CENTER_MAIN',
    },
    update: {
      name: 'WA Center Main',
      channelType: 'WHATSAPP',
      status: IntegrationStatus.INACTIVE,
      config: {
        provider: 'whatsapp',
        mode: 'webhook',
        seeded: true,
      },
    },
    create: {
      code: 'WA_CENTER_MAIN',
      name: 'WA Center Main',
      channelType: 'WHATSAPP',
      status: IntegrationStatus.INACTIVE,
      config: {
        provider: 'whatsapp',
        mode: 'webhook',
        seeded: true,
      },
    },
  });
}

async function seedMaster() {
  await seedRoles();
  await seedPositionAreaPolicies();
  await seedCountryRoot();
  await seedBaketMasterData();
  await seedProductTypesAndTemplates();
  await seedSystemSettingsAndIntegration();

  console.log('Seeded master data baseline.');
}

void seedMaster()
  .catch((error: unknown) => {
    console.error('Failed to seed master data.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
