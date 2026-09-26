-- AlterTable
ALTER TABLE "WhatsAppReportSession" ADD COLUMN IF NOT EXISTS "readByUserProfileId" UUID;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WhatsAppReportSession_readByUserProfileId_idx" ON "WhatsAppReportSession"("readByUserProfileId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'WhatsAppReportSession_readByUserProfileId_fkey'
      AND conrelid = '"WhatsAppReportSession"'::regclass
  ) THEN
    ALTER TABLE "WhatsAppReportSession" ADD CONSTRAINT "WhatsAppReportSession_readByUserProfileId_fkey" FOREIGN KEY ("readByUserProfileId") REFERENCES "user_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
