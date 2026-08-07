import pg from 'pg';
import { imageFOList, ImageFO } from './check-fo-list.js';

const connectionString = 'postgresql://postgres:prdktw9eh2b4ebet@148.230.98.12:5434/postgres';
const pool = new pg.Pool({ connectionString });

function normalize(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function makeUsername(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

async function main() {
  // Fetch DB users
  const dbUsersRes = await pool.query(`SELECT id, name, email, username FROM "user"`);
  const dbUsers = dbUsersRes.rows;

  // Fetch Jakarta Districts
  const districtsRes = await pool.query(`
    SELECT aa.id, aa.name, aa."officialCode", pa.name as city_name
    FROM "AdministrativeArea" aa
    JOIN "AdministrativeArea" pa ON pa.id = aa."parentId"
    WHERE aa."officialCode" LIKE '31%' AND aa.level = 'DISTRICT'
  `);
  const districts = districtsRes.rows;

  const missingList: ImageFO[] = [];
  for (const item of imageFOList) {
    const normName = normalize(item.name);
    const exists = dbUsers.some(u => normalize(u.name) === normName);
    if (!exists) {
      missingList.push(item);
    }
  }

  console.log(`Mapping ${missingList.length} missing field officers to DB districts...\n`);

  const missingWithDistricts = missingList.map(item => {
    // Find district by name match
    const normDist = normalize(item.district);
    const distMatch = districts.find(d => normalize(d.name) === normDist || normalize(d.name).includes(normDist) || normDist.includes(normalize(d.name)));
    return {
      ...item,
      username: makeUsername(item.name),
      districtRecord: distMatch || null
    };
  });

  for (const m of missingWithDistricts) {
    console.log(`No. ${m.no} | Name: ${m.name} | Username: ${m.username} | District: ${m.district} -> DB District: ${m.districtRecord?.name} (${m.districtRecord?.officialCode || 'NOT FOUND'})`);
  }

  await pool.end();
}

main().catch(console.error);
