import { RoleCode, CommandRouteType, UserProfileStatus, AdministrativeLevel } from '../generated/prisma/client.js';
import { prisma } from '../modules/prisma/prisma.service.js';
import { auth } from '../lib/auth.js';
import { SYSTEM_ROLES } from '../common/constants/system-role.js';
import { ensureUserProfileForAuthUser } from '../lib/user-profile.js';

const defaultDemoPassword = 'DensCakraDemo123!';

export interface ImageFO {
  no: number;
  name: string;
  city: string;
  district: string;
}

export const imageFOList: ImageFO[] = [
  { no: 1, name: 'Ichwanurrizqi', city: 'Jakarta Selatan', district: 'Kebayoran Baru' },
  { no: 2, name: 'Bimbing Shoyun Maulana', city: 'Jakarta Selatan', district: 'Kebayoran Baru' },
  { no: 3, name: 'Muh Ilham Amry', city: 'Jakarta Selatan', district: 'Kebayoran Baru' },
  { no: 4, name: 'Amirudin', city: 'Jakarta Selatan', district: 'Mampang Prapatan' },
  { no: 5, name: 'Dian Chaironi', city: 'Jakarta Selatan', district: 'Jagakarsa' },
  { no: 6, name: 'Agus Arianto', city: 'Jakarta Selatan', district: 'Pesanggrahan' },
  { no: 7, name: 'Adrian Arya Farrastama', city: 'Jakarta Selatan', district: 'Cilandak' },
  { no: 8, name: 'Joko Lelono Asmanu', city: 'Jakarta Selatan', district: 'Setiabudi' },
  { no: 9, name: 'Ikran', city: 'Jakarta Selatan', district: 'Setiabudi' },
  { no: 10, name: 'Agus Dwi Santoso', city: 'Jakarta Selatan', district: 'Setiabudi' },
  { no: 11, name: 'Irvan Azis', city: 'Jakarta Selatan', district: 'Pancoran' },
  { no: 12, name: 'Sultan Anugrah Yasa', city: 'Jakarta Selatan', district: 'Tebet' },
  { no: 13, name: 'Numora Muchtariady Muchtar', city: 'Jakarta Selatan', district: 'Pasar Minggu' },
  { no: 14, name: 'Eko Pramugito', city: 'Jakarta Selatan', district: 'Kebayoran Lama' },
  { no: 15, name: 'Melani Nurfadilah', city: 'Jakarta Barat', district: 'Kalideres' },
  { no: 16, name: 'Vinousa Millenova Lohjinawi', city: 'Jakarta Barat', district: 'Tambora' },
  { no: 17, name: 'Bagus Pradana Surya Kusuma', city: 'Jakarta Barat', district: 'Taman Sari' },
  { no: 18, name: 'Budi Riadi', city: 'Jakarta Barat', district: 'Taman Sari' },
  { no: 19, name: 'Dimas Sapto Adi', city: 'Jakarta Barat', district: 'Kalideres' },
  { no: 20, name: 'Denis Pratama Busty', city: 'Jakarta Barat', district: 'Kebon Jeruk' },
  { no: 21, name: 'Michael Yosua Justin', city: 'Jakarta Barat', district: 'Palmerah' },
  { no: 22, name: 'Farhan Humam Putra Sandy', city: 'Jakarta Barat', district: 'Kembangan' },
  { no: 23, name: 'Alfandymas Naufal Yogadinanto', city: 'Jakarta Barat', district: 'Cengkareng' },
  { no: 24, name: 'Sudarsono/Gotang', city: 'Jakarta Barat', district: 'Grogol Petamburan' },
  { no: 25, name: 'Fransisco Raya Bungaran', city: 'Jakarta Pusat', district: 'Tanah Abang' },
  { no: 26, name: 'Zidane Faraz Budikusuma', city: 'Jakarta Pusat', district: 'Senen' },
  { no: 27, name: 'Andi Abdillah', city: 'Jakarta Pusat', district: 'Menteng' },
  { no: 28, name: 'Muhammad Rizki Prawira', city: 'Jakarta Pusat', district: 'Gambir' },
  { no: 29, name: 'Dede Syuman Syarif', city: 'Jakarta Pusat', district: 'Cempaka Putih' },
  { no: 30, name: 'Mohammad Satya Nugraha Rizal', city: 'Jakarta Pusat', district: 'Cempaka Putih' },
  { no: 31, name: 'Khoirul Isnan', city: 'Jakarta Pusat', district: 'Gambir' },
  { no: 32, name: 'Bobby Indrawan Yusuf', city: 'Jakarta Pusat', district: 'Kemayoran' },
  { no: 33, name: 'Aldian Ramadhan', city: 'Jakarta Pusat', district: 'Kemayoran' },
  { no: 34, name: 'William Gerald Jonathan Sumampouw', city: 'Jakarta Pusat', district: 'Tanah Abang' },
  { no: 35, name: 'Fauzio Priangkasa', city: 'Jakarta Pusat', district: 'Sawah Besar' },
  { no: 36, name: 'Diyatmoko', city: 'Jakarta Pusat', district: 'Gambir' },
  { no: 37, name: 'Pardiman', city: 'Jakarta Pusat', district: 'Senen' },
  { no: 38, name: 'Sahat Amos Dio', city: 'Jakarta Pusat', district: 'Menteng' },
  { no: 39, name: 'Muhammad Rafif Altariq', city: 'Jakarta Pusat', district: 'Tanah Abang' },
  { no: 40, name: 'Ihin Solihin', city: 'Jakarta Pusat', district: 'Johar Baru' },
  { no: 41, name: 'Ariq Lukman Fadhilah', city: 'Jakarta Pusat', district: 'Johar Baru' },
  { no: 42, name: 'Agung Sepdiarso', city: 'Jakarta Pusat', district: 'Sawah Besar' },
  { no: 43, name: 'Salsabila Syadine Hananty', city: 'Jakarta Pusat', district: 'Gambir' },
  { no: 44, name: 'Air Putri Mengalir', city: 'Jakarta Pusat', district: 'Menteng' },
  { no: 45, name: 'Riandi', city: 'Jakarta Timur', district: 'Pulogadung' },
  { no: 46, name: 'Farid', city: 'Jakarta Timur', district: 'Matraman' },
  { no: 47, name: 'Rafiuddin', city: 'Jakarta Timur', district: 'Pasar Rebo' },
  { no: 48, name: 'Yalin', city: 'Jakarta Timur', district: 'Jatinegara' },
  { no: 49, name: 'Aridona', city: 'Jakarta Timur', district: 'Jatinegara' },
  { no: 50, name: 'Putu Andika', city: 'Jakarta Timur', district: 'Makasar' },
  { no: 51, name: 'Irfan', city: 'Jakarta Timur', district: 'Makasar' },
  { no: 52, name: 'Fayyadh', city: 'Jakarta Timur', district: 'Ciracas' },
  { no: 53, name: 'Rafief', city: 'Jakarta Timur', district: 'Cakung' },
  { no: 54, name: 'Nadia', city: 'Jakarta Timur', district: 'Cakung' },
  { no: 55, name: 'Rahmat', city: 'Jakarta Timur', district: 'Duren Sawit' },
  { no: 56, name: 'Hendi', city: 'Jakarta Timur', district: 'Kramatjati' },
  { no: 57, name: 'Ihfan', city: 'Jakarta Timur', district: 'Cipayung' },
  { no: 58, name: 'Muhammad Taufiq Ramadhan', city: 'Jakarta Utara', district: 'Kelapa Gading' },
  { no: 59, name: 'Ahmad Bayuady', city: 'Jakarta Utara', district: 'Cilincing' },
  { no: 60, name: 'Kemal Pratama', city: 'Jakarta Utara', district: 'Tanjung Priok' },
  { no: 61, name: 'Andi Ahmad RH', city: 'Jakarta Utara', district: 'Tanjung Priok' },
  { no: 62, name: 'Fraditya Ananta', city: 'Jakarta Utara', district: 'Pademangan' },
  { no: 63, name: 'Rinaldi Nudin', city: 'Jakarta Utara', district: 'Penjaringan' },
  { no: 64, name: 'Noan Pradana Suratno', city: 'Jakarta Utara', district: 'Koja' },
  { no: 65, name: 'Ariel Artha A', city: 'Jakarta Utara', district: 'Koja' },
  { no: 66, name: 'Damara Putra M', city: 'Jakarta Utara', district: 'Kepulauan Seribu Utara' },
  { no: 67, name: 'Yuliansah', city: 'Jakarta Utara', district: 'Kepulauan Seribu Selatan' },
];

function normalize(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function makeUsername(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

async function main() {
  console.log('=== SEEDING MISSING FIELD OFFICERS TO PRODUCTION DB ===\n');

  // Find Role for FIELD_OFFICER
  const foRole = await prisma.role.findUniqueOrThrow({
    where: { code: RoleCode.FIELD_OFFICER }
  });

  // Fetch all Jakarta Districts
  const districts = await prisma.administrativeArea.findMany({
    where: {
      officialCode: { startsWith: '31' },
      level: AdministrativeLevel.DISTRICT
    }
  });

  let createdCount = 0;
  let skippedCount = 0;

  for (const item of imageFOList) {
    const normName = normalize(item.name);
    const username = makeUsername(item.name);

    // Check if user already exists in production DB
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: username },
          { name: { equals: item.name, mode: 'insensitive' } }
        ]
      },
      include: {
        profile: {
          include: {
            operationalAssignments: {
              include: {
                areaScopes: true
              }
            }
          }
        }
      }
    });

    if (existingUser) {
      console.log(`[EXISTING] #${item.no} ${item.name} (${existingUser.username || existingUser.email}) -> Skipped creation.`);
      skippedCount++;
      continue;
    }

    // Find District
    const normDist = normalize(item.district);
    const district = districts.find(d =>
      normalize(d.name) === normDist ||
      normalize(d.name).includes(normDist) ||
      normDist.includes(normalize(d.name))
    );

    if (!district) {
      console.error(`[ERROR] #${item.no} ${item.name}: District "${item.district}" not found in DB!`);
      continue;
    }

    const email = `agent.${username}@denscakra.local`;

    console.log(`[CREATING] #${item.no} ${item.name} | Username: ${username} | Email: ${email} | District: ${district.name} (${district.officialCode})`);

    // 1. Sign up user via Better Auth
    await auth.api.signUpEmail({
      body: {
        email: email,
        password: defaultDemoPassword,
        name: item.name,
      }
    });

    // 2. Update user attributes
    const user = await prisma.user.update({
      where: { email: email },
      data: {
        name: item.name,
        username: username,
        displayUsername: username,
        role: SYSTEM_ROLES.FIELD_OFFICER,
        emailVerified: true,
        banned: false,
        banReason: null,
        banExpires: null,
      }
    });

    // 3. Ensure UserProfile
    const profile = await ensureUserProfileForAuthUser({
      authUserId: user.id,
      fullName: item.name,
      status: UserProfileStatus.ACTIVE,
    });

    // 4. Ensure Operational Assignment
    let assignment = await prisma.userOperationalAssignment.findFirst({
      where: {
        userProfileId: profile.id,
        roleId: foRole.id,
        isPrimary: true,
        isActive: true,
        validUntil: null,
      }
    });

    if (!assignment) {
      assignment = await prisma.userOperationalAssignment.create({
        data: {
          userProfileId: profile.id,
          roleId: foRole.id,
          branch: CommandRouteType.BINDA,
          isPrimary: true,
          isActive: true,
          validFrom: new Date('2026-01-01T00:00:00.000Z'),
        }
      });
    }

    // 5. Ensure Area Scope
    const areaScope = await prisma.userAreaScope.findFirst({
      where: {
        operationalAssignmentId: assignment.id,
        areaId: district.id,
        validUntil: null,
      }
    });

    if (!areaScope) {
      await prisma.userAreaScope.create({
        data: {
          operationalAssignmentId: assignment.id,
          areaId: district.id,
          isPrimary: true,
          validFrom: new Date('2026-01-01T00:00:00.000Z'),
        }
      });
    }

    createdCount++;
    console.log(`[SUCCESS] #${item.no} ${item.name} created successfully.`);
  }

  console.log(`\n=== SEEDING SUMMARY ===`);
  console.log(`Total List: ${imageFOList.length}`);
  console.log(`Existing (Skipped): ${skippedCount}`);
  console.log(`Newly Created: ${createdCount}`);
}

main().catch(console.error);
