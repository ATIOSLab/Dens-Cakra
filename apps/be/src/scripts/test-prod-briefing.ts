import pg from 'pg';

const connectionString = 'postgresql://postgres:prdktw9eh2b4ebet@148.230.98.12:5434/postgres';
const pool = new pg.Pool({ connectionString });

async function main() {
  console.log('=== TESTING PROD DB DASHBOARD QUERIES ===\n');

  try {
    // 1. Test Baket count query
    const baketCount = await pool.query('SELECT COUNT(*)::int as cnt FROM "Baket" WHERE "deletedAt" IS NULL');
    console.log('Baket count:', baketCount.rows[0].cnt);

    // 2. Test Task count
    const taskCount = await pool.query('SELECT COUNT(*)::int as cnt FROM "Task" WHERE "deletedAt" IS NULL');
    console.log('Task count:', taskCount.rows[0].cnt);

    // 3. Test BaketVerification groupBy status
    const verifGroup = await pool.query('SELECT status, COUNT(*)::int as cnt FROM "BaketVerification" GROUP BY status');
    console.log('Verification grouped:', verifGroup.rows);

    // 4. Test ProductApprovalStep count
    const approvalCount = await pool.query("SELECT COUNT(*)::int as cnt FROM \"ProductApprovalStep\" WHERE status = 'ACTIVE'");
    console.log('Approval backlog count:', approvalCount.rows[0].cnt);

    // 5. Test Alert count
    const alertCount = await pool.query('SELECT COUNT(*)::int as cnt FROM "Alert"');
    console.log('Alert count:', alertCount.rows[0].cnt);

    // 6. Test Emergency Incident count
    const emergencyCount = await pool.query('SELECT COUNT(*)::int as cnt FROM "EmergencyIncident"');
    console.log('Emergency count:', emergencyCount.rows[0].cnt);

    // 7. Test IntelligenceProduct count
    const productCount = await pool.query('SELECT COUNT(*)::int as cnt FROM "IntelligenceProduct" WHERE "deletedAt" IS NULL');
    console.log('Intelligence Product count:', productCount.rows[0].cnt);

    // 8. Test listAlerts
    const alertsList = await pool.query('SELECT id, title, severity, status FROM "Alert" LIMIT 5');
    console.log('Alerts list:', alertsList.rows);

    // 9. Test listEmergencyIncidents
    const emergencyList = await pool.query('SELECT id, title, status FROM "EmergencyIncident" LIMIT 5');
    console.log('Emergency list:', emergencyList.rows);

  } catch (err: any) {
    console.error('PROD DB QUERY ERROR:', err);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
