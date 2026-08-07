process.env.DATABASE_URL = 'postgresql://postgres:prdktw9eh2b4ebet@148.230.98.12:5434/postgres';

import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });

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

async function main() {
  console.log(`Checking ${imageFOList.length} field officers against production DB...\n`);

  // Query all users with user_profile, operationalAssignment, role, areaScope, administrativeArea
  const dbUsersRes = await pool.query(`
    SELECT
      u.id as user_id,
      u.name as user_name,
      u.email,
      u.username,
      u.role as user_role,
      up.id as profile_id,
      up."fullName",
      r.code as role_code,
      aa.id as area_id,
      aa.name as area_name,
      aa."officialCode" as area_code,
      aa.level as area_level,
      pa.name as parent_area_name
    FROM "user" u
    LEFT JOIN "user_profile" up ON up."authUserId" = u.id
    LEFT JOIN "UserOperationalAssignment" uoa ON uoa."userProfileId" = up.id AND uoa."isActive" = true
    LEFT JOIN "Role" r ON r.id = uoa."roleId"
    LEFT JOIN "UserAreaScope" uas ON uas."operationalAssignmentId" = uoa.id
    LEFT JOIN "AdministrativeArea" aa ON aa.id = uas."areaId"
    LEFT JOIN "AdministrativeArea" pa ON pa.id = aa."parentId"
  `);

  const dbUsers = dbUsersRes.rows;

  const foundInDb: { image: ImageFO; db: any }[] = [];
  const missingInDb: ImageFO[] = [];

  for (const imgFO of imageFOList) {
    const normName = normalize(imgFO.name);

    // Find matching user in DB
    const matches = dbUsers.filter(u => {
      const uNameNorm = normalize(u.user_name || '');
      const uFullNameNorm = normalize(u.fullName || '');
      return uNameNorm === normName || uFullNameNorm === normName;
    });

    if (matches.length > 0) {
      foundInDb.push({ image: imgFO, db: matches[0] });
    } else {
      missingInDb.push(imgFO);
    }
  }

  console.log(`=== ALREADY IN DB: ${foundInDb.length} / ${imageFOList.length} ===`);
  for (const item of foundInDb) {
    console.log(`[#${item.image.no}] ${item.image.name} | DB Name: ${item.db.user_name} | Email: ${item.db.email} | Scope: ${item.db.area_name || 'NO_SCOPE'}`);
  }

  console.log(`\n=== MISSING IN DB: ${missingInDb.length} / ${imageFOList.length} ===`);
  for (const item of missingInDb) {
    console.log(`[#${item.no}] ${item.name} | City: ${item.city} | District: ${item.district}`);
  }

  await pool.end();
}

main().catch(console.error);
