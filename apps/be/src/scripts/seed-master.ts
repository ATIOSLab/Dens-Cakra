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
  ['JURNAL_INFORMASI', 'Jurnal Informasi', '1', ['Items']],
  [
    'LAPORAN_INFORMASI',
    'Laporan Informasi',
    '2',
    ['Fakta', 'Catatan', 'Lampiran'],
  ],
  [
    'LAPORAN_INTELIJEN',
    'Laporan Intelijen',
    '4',
    ['Indikasi', 'Analisis', 'Dampak', 'Upaya', 'Saran Tindak'],
  ],
  [
    'BASIC_DESCRIPTIVE_INTELLIGENCE',
    'Basic Descriptive Intelligence',
    '6',
    ['Pendahuluan', 'Kedalaman', 'Anteseden', 'Spot Intelijen', 'Pustaka'],
  ],
  [
    'LAPORAN_HARIAN_INTELIJEN',
    'Laporan Harian Intelijen',
    '8',
    ['Situasi Dalam Negeri', 'Situasi Luar Negeri'],
  ],
  [
    'LAPORAN_INTELIJEN_KHUSUS',
    'Laporan Intelijen Khusus',
    '9',
    ['Indikasi', 'Analisis', 'Dampak', 'Upaya', 'Saran Tindak'],
  ],
  [
    'PERKIRAAN_INTELIJEN_SITUASI',
    'Perkiraan Intelijen Situasi',
    '20',
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
      return { roleCode: RoleCode.EXECUTIVE, branch: null };
    case PositionCode.DIREKTUR_WILAYAH:
      return { roleCode: RoleCode.REGIONAL_COMMANDER, branch: CommandRouteType.DIRECTORATE };
    case PositionCode.KABINDA:
      return { roleCode: RoleCode.REGIONAL_COMMANDER, branch: CommandRouteType.BINDA };
    case PositionCode.KASUBDIT:
      return { roleCode: RoleCode.OPERATIONAL_INTELLIGENCE_MANAGER, branch: CommandRouteType.DIRECTORATE };
    case PositionCode.KABAGOPS:
      return { roleCode: RoleCode.OPERATIONAL_INTELLIGENCE_MANAGER, branch: CommandRouteType.BINDA };
    case PositionCode.STAF_SUBDIT:
      return { roleCode: RoleCode.FIELD_COORDINATOR, branch: CommandRouteType.DIRECTORATE };
    case PositionCode.KORWIL:
      return { roleCode: RoleCode.FIELD_COORDINATOR, branch: CommandRouteType.BINDA };
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
  for (const [code, name, formatNo, sections] of productTypeSeeds) {
    const productType = await prisma.productTypeDefinition.upsert({
      where: {
        code,
      },
      update: {
        name,
        formatNo,
        isActive: true,
      },
      create: {
        code,
        name,
        formatNo,
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
        isActive: true,
      },
      create: {
        productTypeId: productType.id,
        versionNumber: 1,
        name: `${name} Template v1`,
        isActive: true,
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
