CREATE TYPE "JaringRegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "Jaring"
ADD COLUMN "registrationStatus" "JaringRegistrationStatus" NOT NULL DEFAULT 'APPROVED',
ADD COLUMN "rejectionReason" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewedByAssignmentId" UUID;

ALTER TABLE "Jaring"
ADD CONSTRAINT "Jaring_reviewedByAssignmentId_fkey"
FOREIGN KEY ("reviewedByAssignmentId") REFERENCES "UserSeatAssignment"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Jaring_registrationStatus_createdAt_idx"
ON "Jaring"("registrationStatus", "createdAt");

CREATE INDEX "Jaring_reviewedByAssignmentId_idx"
ON "Jaring"("reviewedByAssignmentId");
