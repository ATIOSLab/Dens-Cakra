-- Add photo attachments to JaringCoachingReport (pembinaan jaring by Gaswil).
--
-- Attachments are limited by the application to 5 photos per report; the
-- file asset itself is already validated (size, checksum, image content,
-- and virus scan) by the file upload flow.

CREATE TABLE "CoachingReportAttachment" (
    "coachingReportId" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "caption" TEXT,

    CONSTRAINT "CoachingReportAttachment_pkey" PRIMARY KEY ("coachingReportId","fileId")
);

CREATE INDEX "CoachingReportAttachment_fileId_idx" ON "CoachingReportAttachment"("fileId");

ALTER TABLE "CoachingReportAttachment" ADD CONSTRAINT "CoachingReportAttachment_coachingReportId_fkey" FOREIGN KEY ("coachingReportId") REFERENCES "JaringCoachingReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CoachingReportAttachment" ADD CONSTRAINT "CoachingReportAttachment_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
