import pg from 'pg';

const connectionString = 'postgresql://postgres:prdktw9eh2b4ebet@148.230.98.12:5434/postgres';
const pool = new pg.Pool({ connectionString });

async function main() {
  console.log('=== FULL TABLE ROW COUNTS IN PROD DB ===\n');

  const reportTables = [
    // Baket-related tables
    'BaketVerificationCrossReference',
    'BaketVerificationCheck',
    'BaketCoverageCheck',
    'BaketVerification',
    'BaketRevisionRequest',
    'BaketVersionAttachment',
    'BaketVersionSourceMessage',
    'BaketVersion',
    'Baket',

    // WhatsApp / Jaring report tables
    'WhatsAppReportAmendment',
    'WhatsAppReportMedia',
    'WhatsAppReportContentPart',
    'WhatsAppReportHistory',
    'WhatsAppReportSession',
    'WhatsAppValidationIssue',
    'WhatsAppMessageMedia',
    'WhatsAppRoutingLog',
    'WhatsAppMessage',
    'WhatsAppReportReferenceCounter',

    // Coaching reports
    'JaringCoachingReport',

    // File Assets linked to media/attachments if needed
    'FileAsset'
  ];

  const results: { Table: string; Count: number }[] = [];

  for (const table of reportTables) {
    try {
      const res = await pool.query(`SELECT COUNT(*)::int as cnt FROM "${table}"`);
      results.push({ Table: table, Count: res.rows[0].cnt });
    } catch (err: any) {
      console.log(`Table ${table} error: ${err.message}`);
    }
  }

  console.table(results);

  await pool.end();
}

main().catch(console.error);
