import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { prisma } from '../modules/prisma/prisma.service.js';

type FieldOfficerSeed = {
  displayName: string;
  jaring: Array<{
    area: string;
    cluster: string;
    isVerified?: boolean;
    name: string;
    phone: string;
    pin: string;
  }>;
  password: string;
  sector: string;
  username: string;
};

type ReportSeed = {
  category: string;
  cluster: string;
  content: string;
  createdAt: Date;
  locationLatitude: number;
  locationLongitude: number;
  occurredAt: Date;
  photoUrl: string;
  pushName: string;
  status: 'PENDING' | 'VERIFIED' | 'INVALID';
  title: string;
  whatsappId: string;
};

const fieldOfficers: FieldOfficerSeed[] = [
  {
    username: 'fo-bangkinang-001',
    displayName: 'Field Officer Bangkinang',
    password: 'FoBangkinangDemo123!',
    sector: 'Bangkinang Sector',
    jaring: [
      {
        name: 'Jaring Jalan Prof M Yamin',
        area: 'Jalan Prof. M. Yamin, Bangkinang',
        cluster: 'Mahasiswa',
        phone: '6282110010001',
        pin: '101001',
        isVerified: true,
      },
      {
        name: 'Jaring Jalan Ahmad Yani',
        area: 'Jalan Ahmad Yani, Bangkinang',
        cluster: 'Pedagang',
        phone: '6282110010002',
        pin: '101002',
        isVerified: true,
      },
      {
        name: 'Jaring Jalan DI Panjaitan',
        area: 'Jalan DI Panjaitan, Bangkinang',
        cluster: 'Tukang becak',
        phone: '6282110010003',
        pin: '101003',
        isVerified: true,
      },
      {
        name: 'Jaring Jalan Sisingamangaraja',
        area: 'Jalan Sisingamangaraja, Bangkinang',
        cluster: 'Nelayan',
        phone: '6282110010004',
        pin: '101004',
        isVerified: true,
      },
      {
        name: 'Jaring Jalan Datuk Tabano',
        area: 'Jalan Datuk Tabano, Bangkinang',
        cluster: 'Warga lingkungan',
        phone: '6282110010005',
        pin: '101005',
        isVerified: true,
      },
    ],
  },
  {
    username: 'fo-pekanbaru-001',
    displayName: 'Field Officer Pekanbaru',
    password: 'FoPekanbaruDemo123!',
    sector: 'Pekanbaru Sector',
    jaring: [
      {
        name: 'Jaring Jalan Sudirman',
        area: 'Jalan Jenderal Sudirman, Pekanbaru',
        cluster: 'Ojek online',
        phone: '6282110020001',
        pin: '202001',
        isVerified: true,
      },
      {
        name: 'Jaring Jalan HR Soebrantas',
        area: 'Jalan HR Soebrantas, Pekanbaru',
        cluster: 'Mahasiswa',
        phone: '6282110020002',
        pin: '202002',
        isVerified: true,
      },
      {
        name: 'Jaring Jalan Riau',
        area: 'Jalan Riau, Pekanbaru',
        cluster: 'Pedagang',
        phone: '6282110020003',
        pin: '202003',
        isVerified: true,
      },
      {
        name: 'Jaring Jalan Arifin Ahmad',
        area: 'Jalan Arifin Ahmad, Pekanbaru',
        cluster: 'Sopir angkutan',
        phone: '6282110020004',
        pin: '202004',
        isVerified: true,
      },
      {
        name: 'Jaring Jalan Tuanku Tambusai',
        area: 'Jalan Tuanku Tambusai, Pekanbaru',
        cluster: 'Komunitas pemuda',
        phone: '6282110020005',
        pin: '202005',
        isVerified: true,
      },
    ],
  },
];

const reports: ReportSeed[] = [
  {
    whatsappId: '6282110010001',
    pushName: 'Jaring Jalan Prof M Yamin',
    cluster: 'Mahasiswa',
    category: 'Aktivitas Kendaraan',
    title: 'Aktivitas Kendaraan Box Dekat Pasar Bangkinang',
    content:
      'Terlihat kendaraan box berhenti cukup lama dekat akses pasar. Dua orang memindahkan paket ke kendaraan roda dua tanpa membuka identitas.',
    photoUrl: '/uploads/demo/bangkinang-prof-yamin.svg',
    locationLatitude: 0.33555,
    locationLongitude: 101.03082,
    status: 'PENDING',
    occurredAt: new Date('2026-07-11T01:45:00.000Z'),
    createdAt: new Date('2026-07-11T02:15:00.000Z'),
  },
  {
    whatsappId: '6282110010002',
    pushName: 'Jaring Jalan Ahmad Yani',
    cluster: 'Pedagang',
    category: 'Pertemuan Tertutup',
    title: 'Pertemuan Singkat di Koridor Ahmad Yani',
    content:
      'Tiga orang melakukan pertemuan singkat di depan ruko tertutup. Satu orang membawa map coklat dan langsung bergerak ke arah terminal.',
    photoUrl: '/uploads/demo/bangkinang-ahmad-yani.svg',
    locationLatitude: 0.33812,
    locationLongitude: 101.02491,
    status: 'PENDING',
    occurredAt: new Date('2026-07-11T02:45:00.000Z'),
    createdAt: new Date('2026-07-11T03:05:00.000Z'),
  },
  {
    whatsappId: '6282110010003',
    pushName: 'Jaring Jalan DI Panjaitan',
    cluster: 'Tukang becak',
    category: 'Kendaraan Mencurigakan',
    title: 'Motor Berganti Plat di Area DI Panjaitan',
    content:
      'Sumber melihat motor berganti plat nomor di halaman bangunan kosong. Aktivitas berlangsung sekitar sepuluh menit.',
    photoUrl: '/uploads/demo/bangkinang-panjaitan.svg',
    locationLatitude: 0.34318,
    locationLongitude: 101.03245,
    status: 'VERIFIED',
    occurredAt: new Date('2026-07-10T10:20:00.000Z'),
    createdAt: new Date('2026-07-10T10:40:00.000Z'),
  },
  {
    whatsappId: '6282110010004',
    pushName: 'Jaring Jalan Sisingamangaraja',
    cluster: 'Nelayan',
    category: 'Pemindahan Barang',
    title: 'Paket Kecil Dipindah ke Mobil Hitam',
    content:
      'Ada pemindahan paket kecil dari motor ke mobil hitam di sisi jalan. Nomor kendaraan tidak terbaca jelas karena hujan.',
    photoUrl: '/uploads/demo/bangkinang-sisingamangaraja.svg',
    locationLatitude: 0.33184,
    locationLongitude: 101.0275,
    status: 'PENDING',
    occurredAt: new Date('2026-07-11T04:10:00.000Z'),
    createdAt: new Date('2026-07-11T04:35:00.000Z'),
  },
  {
    whatsappId: '6282110010005',
    pushName: 'Jaring Jalan Datuk Tabano',
    cluster: 'Warga lingkungan',
    category: 'Kerumunan',
    title: 'Informasi Kerumunan Tidak Terbukti',
    content:
      'Laporan awal menyebut ada kerumunan mencurigakan, namun setelah dicek hanya antrean warga di warung kopi.',
    photoUrl: '/uploads/demo/bangkinang-datuk-tabano.svg',
    locationLatitude: 0.32978,
    locationLongitude: 101.02166,
    status: 'INVALID',
    occurredAt: new Date('2026-07-10T07:50:00.000Z'),
    createdAt: new Date('2026-07-10T08:10:00.000Z'),
  },
  {
    whatsappId: '6282110020001',
    pushName: 'Jaring Jalan Sudirman',
    cluster: 'Ojek online',
    category: 'Surveillance Area',
    title: 'Mobil Rental Berputar di Sudirman',
    content:
      'Mobil rental putih berulang kali melewati titik yang sama di Jalan Sudirman. Pengemudi tampak mengambil foto area perkantoran.',
    photoUrl: '/uploads/demo/pekanbaru-sudirman.svg',
    locationLatitude: 0.51626,
    locationLongitude: 101.44758,
    status: 'PENDING',
    occurredAt: new Date('2026-07-11T01:30:00.000Z'),
    createdAt: new Date('2026-07-11T01:50:00.000Z'),
  },
  {
    whatsappId: '6282110020002',
    pushName: 'Jaring Jalan HR Soebrantas',
    cluster: 'Mahasiswa',
    category: 'Pemindahan Barang',
    title: 'Aktivitas Bongkar Tas di HR Soebrantas',
    content:
      'Dua orang membongkar tas besar di dekat halte, lalu memindahkan isinya ke kardus kecil sebelum naik kendaraan online.',
    photoUrl: '/uploads/demo/pekanbaru-soebrantas.svg',
    locationLatitude: 0.46665,
    locationLongitude: 101.38894,
    status: 'PENDING',
    occurredAt: new Date('2026-07-11T02:30:00.000Z'),
    createdAt: new Date('2026-07-11T02:55:00.000Z'),
  },
  {
    whatsappId: '6282110020003',
    pushName: 'Jaring Jalan Riau',
    cluster: 'Pedagang',
    category: 'Aktivitas Gudang',
    title: 'Gudang Kecil Aktif di Jalan Riau',
    content:
      'Gudang kecil yang biasanya tutup terlihat aktif sejak subuh. Ada tiga sepeda motor keluar masuk membawa kardus tertutup.',
    photoUrl: '/uploads/demo/pekanbaru-riau.svg',
    locationLatitude: 0.53891,
    locationLongitude: 101.43283,
    status: 'VERIFIED',
    occurredAt: new Date('2026-07-10T23:00:00.000Z'),
    createdAt: new Date('2026-07-10T23:25:00.000Z'),
  },
  {
    whatsappId: '6282110020004',
    pushName: 'Jaring Jalan Arifin Ahmad',
    cluster: 'Sopir angkutan',
    category: 'Pertukaran Barang',
    title: 'Pertukaran Amplop di Area Parkir',
    content:
      'Terlihat pertukaran amplop antara dua orang di area parkir minimarket. Keduanya langsung berpisah ke arah berbeda.',
    photoUrl: '/uploads/demo/pekanbaru-arifin-ahmad.svg',
    locationLatitude: 0.48127,
    locationLongitude: 101.44402,
    status: 'PENDING',
    occurredAt: new Date('2026-07-11T05:00:00.000Z'),
    createdAt: new Date('2026-07-11T05:20:00.000Z'),
  },
  {
    whatsappId: '6282110020005',
    pushName: 'Jaring Jalan Tuanku Tambusai',
    cluster: 'Komunitas pemuda',
    category: 'Klarifikasi Teknis',
    title: 'Laporan Salah Identifikasi Kendaraan',
    content:
      'Kendaraan yang dilaporkan mencurigakan ternyata milik teknisi jaringan yang sedang melakukan perbaikan kabel.',
    photoUrl: '/uploads/demo/pekanbaru-tambusai.svg',
    locationLatitude: 0.50744,
    locationLongitude: 101.41893,
    status: 'INVALID',
    occurredAt: new Date('2026-07-10T09:00:00.000Z'),
    createdAt: new Date('2026-07-10T09:30:00.000Z'),
  },
];

function evidenceSvg(title: string, area: string, accent: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#020617"/>
      <stop offset="0.54" stop-color="#082f49"/>
      <stop offset="1" stop-color="#020617"/>
    </linearGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="1280" height="720" fill="url(#bg)"/>
  <path d="M0 110H1280M0 230H1280M0 350H1280M0 470H1280M0 590H1280M160 0V720M380 0V720M600 0V720M820 0V720M1040 0V720" stroke="#22d3ee" stroke-opacity=".08"/>
  <rect x="84" y="78" width="1112" height="564" rx="34" fill="#020617" fill-opacity=".58" stroke="${accent}" stroke-opacity=".65" stroke-width="2"/>
  <circle cx="216" cy="214" r="68" fill="${accent}" fill-opacity=".18" stroke="${accent}" stroke-width="3" filter="url(#glow)"/>
  <path d="M181 227h70l-17-36-18 25-13-15-22 26Z" fill="${accent}"/>
  <circle cx="237" cy="190" r="12" fill="#e0f2fe"/>
  <text x="324" y="190" fill="#67e8f9" font-family="Consolas, monospace" font-size="24" letter-spacing="6">DENS CAKRA EVIDENCE</text>
  <text x="324" y="250" fill="#f8fafc" font-family="Arial, sans-serif" font-size="44" font-weight="700">${escapeSvg(title)}</text>
  <text x="324" y="310" fill="#bae6fd" font-family="Arial, sans-serif" font-size="28">${escapeSvg(area)}</text>
  <rect x="324" y="372" width="520" height="8" fill="${accent}" fill-opacity=".8"/>
  <text x="324" y="444" fill="#cbd5e1" font-family="Consolas, monospace" font-size="24">Dummy image for seeded Jaring report</text>
  <text x="324" y="490" fill="#94a3b8" font-family="Consolas, monospace" font-size="20">Generated locally by seed-whatsapp-demo</text>
  <rect x="936" y="396" width="170" height="170" rx="22" fill="${accent}" fill-opacity=".12" stroke="${accent}" stroke-opacity=".55"/>
  <path d="M990 510l36-92 36 92m-58-28h44" stroke="${accent}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>
`;
}

function escapeSvg(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function writeEvidenceImages() {
  const uploadDir = join(process.cwd(), 'uploads', 'demo');
  await mkdir(uploadDir, { recursive: true });

  for (const [index, report] of reports.entries()) {
    const filename = report.photoUrl.split('/').at(-1);
    if (!filename) continue;

    const accent = index % 2 === 0 ? '#22d3ee' : '#34d399';
    await writeFile(join(uploadDir, filename), evidenceSvg(report.title, report.pushName, accent), 'utf8');
  }
}

async function upsertFieldOfficer(seed: FieldOfficerSeed) {
  return prisma.whatsappAllowedUser.create({
    data: {
      whatsappId: `field-officer:${seed.username}`,
      name: seed.displayName,
      role: 'FIELD_OFFICER',
      authPin: '000000',
      fieldOfficerUsername: seed.username,
      fieldOfficerPassword: seed.password,
      fieldOfficerPasswordPlain: seed.password,
      isVerified: true,
    },
  });
}

async function clearWhatsappDemoData() {
  await prisma.whatsappReport.deleteMany({});
  await prisma.fieldOfficerLiveLocation.deleteMany({});
  await prisma.whatsappAllowedUser.deleteMany({
    where: {
      role: 'JARING',
    },
  });
  await prisma.whatsappAllowedUser.deleteMany({
    where: {
      role: 'FIELD_OFFICER',
    },
  });
}

async function seedWhatsappDemo() {
  await clearWhatsappDemoData();
  await writeEvidenceImages();

  for (const fieldOfficer of fieldOfficers) {
    const owner = await upsertFieldOfficer(fieldOfficer);

    for (const jaring of fieldOfficer.jaring) {
      await prisma.whatsappAllowedUser.create({
        data: {
          whatsappId: jaring.phone,
          name: jaring.name,
          role: 'JARING',
          authPin: jaring.pin,
          cluster: jaring.cluster,
          isVerified: jaring.isVerified ?? true,
          fieldOfficerId: owner.id,
        },
      });
    }
  }

  await prisma.whatsappReport.createMany({
    data: reports.map((report) => ({
      ...report,
      informationStatus: report.status,
      baketId: report.status === 'VERIFIED' ? `BAK-DEMO-${report.whatsappId.slice(-4)}` : null,
      closedAt: report.status === 'INVALID' ? new Date(report.createdAt.getTime() + 60 * 60 * 1000) : null,
    })),
  });

  const fieldOfficerCount = await prisma.whatsappAllowedUser.count({
    where: {
      role: 'FIELD_OFFICER',
    },
  });
  const jaringCount = await prisma.whatsappAllowedUser.count({
    where: {
      role: 'JARING',
    },
  });
  const reportCount = await prisma.whatsappReport.count();
  const liveLocationCount = await prisma.fieldOfficerLiveLocation.count();

  console.log('Seeded WhatsApp demo data:');
  console.log(`- Field Officer rows: ${fieldOfficerCount}`);
  console.log(`- Jaring rows: ${jaringCount}`);
  console.log(`- WhatsApp report rows: ${reportCount}`);
  console.log(`- Field Officer live location rows: ${liveLocationCount}`);
  console.log('- Active FE scopes: fo-bangkinang-001, fo-pekanbaru-001');
}

void seedWhatsappDemo()
  .catch((error: unknown) => {
    console.error('Failed to seed WhatsApp demo data.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
