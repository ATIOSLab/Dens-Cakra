-- AlterTable
ALTER TABLE "JaringCoachingReport" ADD COLUMN "periodNumber" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "JaringCoachingReport_periodNumber_idx" ON "JaringCoachingReport"("periodNumber");
