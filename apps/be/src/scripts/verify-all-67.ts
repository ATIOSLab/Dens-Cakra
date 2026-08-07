import pg from 'pg';

const connectionString = 'postgresql://postgres:prdktw9eh2b4ebet@148.230.98.12:5434/postgres';
const pool = new pg.Pool({ connectionString });

async function main() {
  const usersRes = await pool.query(`
    SELECT u.id, u.name, u.email, u.username, u.role, up.id as profile_id, r.code as role_code, aa.name as area_name
    FROM "user" u
    LEFT JOIN "user_profile" up ON up."authUserId" = u.id
    LEFT JOIN "UserOperationalAssignment" uoa ON uoa."userProfileId" = up.id
    LEFT JOIN "Role" r ON r.id = uoa."roleId"
    LEFT JOIN "UserAreaScope" uas ON uas."operationalAssignmentId" = uoa.id
    LEFT JOIN "AdministrativeArea" aa ON aa.id = uas."areaId"
    ORDER BY u.name ASC
  `);

  console.log(`Total users in DB: ${usersRes.rows.length}`);
  for (const r of usersRes.rows) {
    console.log(`- Name: ${r.name} | Username: ${r.username || '-'} | Email: ${r.email} | Role: ${r.role} | Scope: ${r.area_name || '-'}`);
  }

  await pool.end();
}

main().catch(console.error);
