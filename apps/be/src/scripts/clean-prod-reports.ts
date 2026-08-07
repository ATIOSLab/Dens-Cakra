import pg from 'pg';

const connectionString = 'postgresql://postgres:prdktw9eh2b4ebet@148.230.98.12:5434/postgres';
const pool = new pg.Pool({ connectionString });

async function main() {
  const client = await pool.connect();

  try {
    console.log('=== STARTING PRODUCTION DATABASE CLEANUP FOR REPORTS & BAKET ===\n');

    await client.query('BEGIN');

    // 1. Collect FileAsset IDs associated with report media before deleting media
    const reportMediaFiles = await client.query('SELECT "fileId" FROM "WhatsAppReportMedia" WHERE "fileId" IS NOT NULL');
    const msgMediaFiles = await client.query('SELECT "fileId" FROM "WhatsAppMessageMedia" WHERE "fileId" IS NOT NULL');
    const fileIdsToDelete = [
      ...reportMediaFiles.rows.map(r => r.fileId),
      ...msgMediaFiles.rows.map(r => r.fileId)
    ].filter(Boolean);

    console.log(`Found ${fileIdsToDelete.length} FileAsset record(s) linked to report media.`);

    // 2. Clear Baket child tables & Baket
    await client.query('DELETE FROM "BaketVerificationCrossReference"');
    await client.query('DELETE FROM "BaketVerificationCheck"');
    await client.query('DELETE FROM "BaketCoverageCheck"');
    await client.query('DELETE FROM "BaketVerification"');
    await client.query('DELETE FROM "BaketRevisionRequest"');
    await client.query('DELETE FROM "BaketVersionAttachment"');
    await client.query('DELETE FROM "BaketVersionSourceMessage"');
    await client.query('DELETE FROM "BaketVersion"');
    await client.query('DELETE FROM "Baket"');

    // 3. Clear WhatsApp report session child tables
    await client.query('DELETE FROM "WhatsAppReportAmendment"');
    await client.query('DELETE FROM "WhatsAppReportMedia"');
    await client.query('DELETE FROM "WhatsAppReportContentPart"');
    await client.query('DELETE FROM "WhatsAppReportHistory"');

    // Break circular FK references on WhatsAppReportSession
    await client.query('UPDATE "WhatsAppReportSession" SET "submittedMessageId" = NULL, "pendingFileId" = NULL');

    // Clear WhatsApp report sessions
    await client.query('DELETE FROM "WhatsAppReportSession"');

    // 4. Clear WhatsApp message child tables
    await client.query('DELETE FROM "WhatsAppValidationIssue"');
    await client.query('DELETE FROM "WhatsAppMessageMedia"');
    await client.query('DELETE FROM "WhatsAppRoutingLog"');

    // 5. Temporarily disable deletion guard trigger on WhatsAppMessage
    console.log('Temporarily disabling guard trigger on WhatsAppMessage...');
    await client.query('ALTER TABLE "WhatsAppMessage" DISABLE TRIGGER "trg_guard_whatsapp_message_mutation"');

    // Delete WhatsAppMessage records
    const resMsg = await client.query('DELETE FROM "WhatsAppMessage"');
    console.log(`Deleted ${resMsg.rowCount} WhatsAppMessage record(s).`);

    // Re-enable guard trigger on WhatsAppMessage
    console.log('Re-enabling guard trigger on WhatsAppMessage...');
    await client.query('ALTER TABLE "WhatsAppMessage" ENABLE TRIGGER "trg_guard_whatsapp_message_mutation"');

    // Clear Reference Counter
    await client.query('DELETE FROM "WhatsAppReportReferenceCounter"');

    // 6. Clear Coaching reports
    await client.query('DELETE FROM "JaringCoachingReport"');

    // 7. Clear linked FileAssets
    if (fileIdsToDelete.length > 0) {
      const resFile = await client.query('DELETE FROM "FileAsset" WHERE id = ANY($1)', [fileIdsToDelete]);
      console.log(`Deleted ${resFile.rowCount} linked FileAsset record(s).`);
    }

    await client.query('COMMIT');
    console.log('\n✅ Cleanup transaction successfully committed!');
  } catch (err: any) {
    await client.query('ROLLBACK');
    // Ensure trigger is re-enabled even if rollback occurs
    try {
      await pool.query('ALTER TABLE "WhatsAppMessage" ENABLE TRIGGER "trg_guard_whatsapp_message_mutation"');
    } catch {}
    console.error('\n❌ Cleanup transaction failed and rolled back:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
