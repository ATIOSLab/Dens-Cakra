import pg from 'pg';

const connectionString = 'postgresql://postgres:prdktw9eh2b4ebet@148.230.98.12:5434/postgres';

async function main() {
  const client = new pg.Client({ connectionString });
  await client.connect();

  console.log('--- USERS ---');
  const usersRes = await client.query(`
    SELECT u.id, u.name, u.email, u.role, u.username, up.id as profile_id, up.username as profile_username, up."fullName"
    FROM "user" u
    LEFT JOIN "user_profile" up ON up."authUserId" = u.id
    ORDER BY u.email;
  `);
  console.table(usersRes.rows);

  console.log('--- ROLES ---');
  const rolesRes = await client.query(`SELECT id, code, name FROM "Role";`);
  console.table(rolesRes.rows);

  console.log('--- FIELD OFFICERS WITH AREA SCOPE ---');
  const foRes = await client.query(`
    SELECT 
      uoa.id as assignment_id,
      u.name as user_name,
      u.email,
      u.username,
      up.username as profile_username,
      r.code as role_code,
      aa.name as area_name,
      aa.level as area_level,
      parent_aa.name as parent_area_name
    FROM "UserOperationalAssignment" uoa
    JOIN "user_profile" up ON uoa."userProfileId" = up.id
    JOIN "user" u ON up."authUserId" = u.id
    JOIN "Role" r ON uoa."roleId" = r.id
    LEFT JOIN "UserAreaScope" uas ON uas."operationalAssignmentId" = uoa.id
    LEFT JOIN "AdministrativeArea" aa ON uas."areaId" = aa.id
    LEFT JOIN "AdministrativeArea" parent_aa ON aa."parentId" = parent_aa.id
    WHERE r.code = 'FIELD_OFFICER'
    ORDER BY u.email;
  `);
  console.table(foRes.rows);

  await client.end();
}

main().catch(console.error);
