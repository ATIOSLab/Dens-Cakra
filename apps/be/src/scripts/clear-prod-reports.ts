import pg from 'pg';

const connectionString = 'postgresql://postgres:prdktw9eh2b4ebet@148.230.98.12:5434/postgres';
const pool = new pg.Pool({ connectionString });

async function main() {
  console.log('=== CLEARING ALL REPORT DATA FROM PROD DB ===\n');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Clear Baket child tables and Baket
    console.log('Clearing Baket tables...');
    await client.query(`
      TRUNCATE TABLE
        "BaketVerificationCrossReference",
        "BaketVerificationCheck",
        "BaketCoverageCheck",
        "BaketVerification",
        "BaketRevisionRequest",
        "BaketVersionAttachment",
        "BaketVersionSourceMessage",
        "BaketVersion",
        "Baket"
      CASCADE;
    `);

    // 2. Clear WhatsApp Report Session detail tables & WhatsApp Report Sessions
    console.log('Clearing WhatsApp Report Session tables...');
    await client.query(`
      TRUNCATE TABLE
        "WhatsAppReportAmendment",
        "WhatsAppReportMedia",
        "WhatsAppReportContentPart",
        "WhatsAppReportHistory",
        "WhatsAppReportSession",
        "WhatsAppValidationIssue",
        "WhatsAppMessageMedia",
        "WhatsAppRoutingLog",
        "WhatsAppReportReferenceCounter"
      CASCADE;
    `);

    // 3. Clear WhatsApp Messages
    console.log('Clearing WhatsAppMessage table...');
    await client.query(`
      TRUNCATE TABLE
        "WhatsAppMessage"
      CASCADE;
    `);

    // 4. Clear Jaring Coaching Reports
    console.log('Clearing JaringCoachingReport table...');
    await client.query(`
      TRUNCATE TABLE
        "JaringCoachingReport"
      CASCADE;
    `);

    await client.query('COMMIT');
    console.log('\n✅ ALL REPORT DATA SUCCESSFULLY CLEARED FROM PRODUCTION DATABASE!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ ERROR CLEARING REPORTS:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
