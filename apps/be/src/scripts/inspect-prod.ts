import pg from 'pg';

const connectionString = 'postgresql://postgres:prdktw9eh2b4ebet@148.230.98.12:5434/postgres';
const pool = new pg.Pool({ connectionString });

async function main() {
  console.log('--- Inspecting Production DB ---');

  // 1. Fetch users
  const usersRes = await pool.query(`
    SELECT u.id, u.name, u.email, u.username, u.role, up.id as profile_id, up."fullName"
    FROM "user" u
    LEFT JOIN "user_profile" up ON up."authUserId" = u.id
    ORDER BY u.name ASC
  `);

  console.log(`Total Users in DB: ${usersRes.rows.length}`);

  // 2. Fetch operational assignments with roles and area scopes
  const foRes = await pool.query(`
    SELECT
      u.id as user_id,
      u.name as user_name,
      u.email,
      u.username,
      u.role as user_role,
      up.id as profile_id,
      r.code as role_code,
      aa.name as area_name,
      aa."officialCode" as area_code,
      aa.level as area_level,
      pa.name as parent_area_name
    FROM "user" u
    JOIN "user_profile" up ON up."authUserId" = u.id
    LEFT JOIN "UserOperationalAssignment" uoa ON uoa."userProfileId" = up.id
    LEFT JOIN "Role" r ON r.id = uoa."roleId"
    LEFT JOIN "UserAreaScope" uas ON uas."operationalAssignmentId" = uoa.id
    LEFT JOIN "AdministrativeArea" aa ON aa.id = uas."areaId"
    LEFT JOIN "AdministrativeArea" pa ON pa.id = aa."parentId"
    ORDER BY u.name ASC
  `);

  console.log('\n--- User Operational Assignments and Area Scopes ---');
  for (const row of foRes.rows) {
    console.log(`Name: ${row.user_name} | Role: ${row.user_role} (${row.role_code || 'No OA'}) | Email: ${row.email} | Username: ${row.username || '-'} | Area: ${row.area_name || '-'} (${row.parent_area_name || '-'})`);
  }

  // 3. Fetch all administrative areas in Jakarta (level = DISTRICT or REGENCY/CITY)
  const jakartaAreasRes = await pool.query(`
    SELECT aa.id, aa.name, aa.level, aa."officialCode", pa.name as parent_name
    FROM "AdministrativeArea" aa
    LEFT JOIN "AdministrativeArea" pa ON pa.id = aa."parentId"
    WHERE aa."officialCode" LIKE '31%'
    ORDER BY aa."officialCode" ASC
  `);

  console.log(`\n--- Jakarta Administrative Areas in DB (${jakartaAreasRes.rows.length}) ---`);
  for (const row of jakartaAreasRes.rows) {
    if (row.level === 'DISTRICT' || row.level === 'CITY' || row.level === 'REGENCY') {
      console.log(`Code: ${row.officialCode} | Level: ${row.level} | Name: ${row.name} | Parent: ${row.parent_name || '-'}`);
    }
  }

  await pool.end();
}

main().catch(console.error);
