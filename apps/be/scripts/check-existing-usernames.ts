import pg from 'pg';

const connectionString = 'postgresql://postgres:prdktw9eh2b4ebet@148.230.98.12:5434/postgres';

async function main() {
  const client = new pg.Client({ connectionString });
  await client.connect();

  const res = await client.query(`
    SELECT email, username, name FROM "user" WHERE username IS NOT NULL;
  `);
  console.log('Existing non-null usernames count:', res.rows.length);
  console.table(res.rows);

  await client.end();
}

main().catch(console.error);
