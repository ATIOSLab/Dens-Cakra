-- CreateTable
CREATE TABLE "JaringCoachingReport" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "jaringId" UUID NOT NULL,
    "fieldOfficerAssignmentId" UUID NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "content" TEXT NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JaringCoachingReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JaringCoachingReport_jaringId_reportedAt_idx" ON "JaringCoachingReport"("jaringId", "reportedAt");

-- CreateIndex
CREATE INDEX "JaringCoachingReport_fieldOfficerAssignmentId_reportedAt_idx" ON "JaringCoachingReport"("fieldOfficerAssignmentId", "reportedAt");

-- CreateIndex
CREATE INDEX "JaringCoachingReport_createdAt_idx" ON "JaringCoachingReport"("createdAt");

-- AddForeignKey
ALTER TABLE "JaringCoachingReport" ADD CONSTRAINT "JaringCoachingReport_jaringId_fkey" FOREIGN KEY ("jaringId") REFERENCES "Jaring"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JaringCoachingReport" ADD CONSTRAINT "JaringCoachingReport_fieldOfficerAssignmentId_fkey" FOREIGN KEY ("fieldOfficerAssignmentId") REFERENCES "UserOperationalAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
