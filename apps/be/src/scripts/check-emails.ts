import pg from 'pg';

const connectionString = 'postgresql://postgres:prdktw9eh2b4ebet@148.230.98.12:5434/postgres';
const pool = new pg.Pool({ connectionString });

async function main() {
  const res = await pool.query(`SELECT email, username, name FROM "user" ORDER BY email ASC`);
  console.log("All emails in DB:");
  for (const row of res.rows) {
    console.log(`- Email: ${row.email} | Username: ${row.username} | Name: ${row.name}`);
  }
  await pool.end();
}

main().catch(console.error);
