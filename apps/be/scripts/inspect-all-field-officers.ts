import pg from 'pg';
import fs from 'fs';

const connectionString = 'postgresql://postgres:prdktw9eh2b4ebet@148.230.98.12:5434/postgres';

async function main() {
  const client = new pg.Client({ connectionString });
  await client.connect();

  const query = `
    SELECT 
      u.id as user_id,
      up.id as profile_id,
      u.email,
      u.name as current_user_name,
      u.username as current_user_username,
      u."displayUsername" as current_display_username,
      up."fullName" as current_profile_fullname,
      up.username as current_profile_username,
      aa.id as district_id,
      aa.name as district_name,
      aa.code as district_code,
      parent_aa.name as regency_name
    FROM "UserOperationalAssignment" uoa
    JOIN "user_profile" up ON uoa."userProfileId" = up.id
    JOIN "user" u ON up."authUserId" = u.id
    JOIN "Role" r ON uoa."roleId" = r.id
    LEFT JOIN "UserAreaScope" uas ON uas."operationalAssignmentId" = uoa.id
    LEFT JOIN "AdministrativeArea" aa ON uas."areaId" = aa.id
    LEFT JOIN "AdministrativeArea" parent_aa ON aa."parentId" = parent_aa.id
    WHERE r.code = 'FIELD_OFFICER'
    ORDER BY parent_aa.name, aa.name;
  `;

  const res = await client.query(query);
  fs.writeFileSync('scripts/field-officers-prod.json', JSON.stringify(res.rows, null, 2));
  console.log(`Saved ${res.rows.length} records to scripts/field-officers-prod.json`);

  await client.end();
}

main().catch(console.error);
