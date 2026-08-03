import pg from 'pg';

const connectionString = 'postgresql://postgres:prdktw9eh2b4ebet@148.230.98.12:5434/postgres';

async function main() {
  const client = new pg.Client({ connectionString });
  await client.connect();

  console.log('Ensuring all User.username match UserProfile.username in production DB...');
  const res = await client.query(`
    UPDATE "user" u
    SET username = up.username, "displayUsername" = up.username, "updatedAt" = NOW()
    FROM "user_profile" up
    WHERE up."authUserId" = u.id
      AND up.username IS NOT NULL
      AND (u.username IS NULL OR u.username <> up.username);
  `);

  console.log(`Synced rows: ${res.rowCount}`);
  await client.end();
}

main().catch(console.error);
