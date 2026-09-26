-- AlterTable
ALTER TABLE "WhatsAppReportSession" ADD COLUMN "gaswilReadAt" TIMESTAMP(3),
ADD COLUMN "gaswilReadByUserProfileId" UUID,
ADD COLUMN "korwilReadAt" TIMESTAMP(3),
ADD COLUMN "korwilReadByUserProfileId" UUID;

-- CreateIndex
CREATE INDEX "WhatsAppReportSession_gaswilReadByUserProfileId_idx" ON "WhatsAppReportSession"("gaswilReadByUserProfileId");

-- CreateIndex
CREATE INDEX "WhatsAppReportSession_korwilReadByUserProfileId_idx" ON "WhatsAppReportSession"("korwilReadByUserProfileId");

-- AddForeignKey
ALTER TABLE "WhatsAppReportSession" ADD CONSTRAINT "WhatsAppReportSession_gaswilReadByUserProfileId_fkey" FOREIGN KEY ("gaswilReadByUserProfileId") REFERENCES "user_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppReportSession" ADD CONSTRAINT "WhatsAppReportSession_korwilReadByUserProfileId_fkey" FOREIGN KEY ("korwilReadByUserProfileId") REFERENCES "user_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Clean up any previous test read status from executive user
UPDATE "WhatsAppReportSession" SET "readAt" = NULL, "readByUserProfileId" = NULL;
