ALTER TABLE "IntegrationChannel"
ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "IntegrationChannel_deletedAt_idx"
ON "IntegrationChannel"("deletedAt");
