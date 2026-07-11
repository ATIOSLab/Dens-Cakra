CREATE TYPE "FileLifecycleStatus" AS ENUM (
  'PENDING_UPLOAD', 'UPLOADED', 'SCANNING', 'CLEAN',
  'QUARANTINED', 'REJECTED', 'DELETED'
);

CREATE TYPE "AsyncJobStatus" AS ENUM (
  'QUEUED', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'DEAD_LETTER', 'CANCELLED'
);

CREATE TYPE "OutboxEventStatus" AS ENUM (
  'PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED', 'DEAD_LETTER'
);

CREATE TYPE "IdempotencyStatus" AS ENUM ('PROCESSING', 'SUCCEEDED', 'FAILED');

CREATE TYPE "ApprovalEventType" AS ENUM (
  'ACTIVATED', 'APPROVED', 'REVISION_REQUESTED', 'REJECTED',
  'CLARIFICATION_REQUESTED', 'CANCELLED', 'COMMENT'
);

ALTER TABLE "Position" ADD COLUMN "seatCode" VARCHAR(100);
UPDATE "Position"
SET "seatCode" = "code"::text || '-' || upper(substr(replace("id"::text, '-', ''), 1, 12));
ALTER TABLE "Position" ALTER COLUMN "seatCode" SET NOT NULL;
CREATE UNIQUE INDEX "Position_seatCode_key" ON "Position"("seatCode");

ALTER TABLE "FileAsset"
  ADD COLUMN "lifecycleStatus" "FileLifecycleStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
  ADD COLUMN "scanResult" JSONB,
  ADD COLUMN "scannedAt" TIMESTAMP(3),
  ADD COLUMN "quarantineReason" TEXT,
  ADD COLUMN "retentionUntil" TIMESTAMP(3);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "DirectiveVersion"
    GROUP BY "directiveId"
    HAVING count(DISTINCT "commandNumber") > 1
  ) THEN
    RAISE EXCEPTION 'Cannot move commandNumber: a Directive has inconsistent values across versions';
  END IF;
END $$;

ALTER TABLE "Directive" ADD COLUMN "commandNumber" VARCHAR(120);
UPDATE "Directive" AS directive
SET "commandNumber" = source."commandNumber"
FROM (
  SELECT DISTINCT ON ("directiveId") "directiveId", "commandNumber"
  FROM "DirectiveVersion"
  ORDER BY "directiveId", "versionNumber" ASC
) AS source
WHERE source."directiveId" = directive."id";
ALTER TABLE "Directive" ALTER COLUMN "commandNumber" SET NOT NULL;
CREATE UNIQUE INDEX "Directive_commandNumber_key" ON "Directive"("commandNumber");
DROP INDEX IF EXISTS "DirectiveVersion_commandNumber_versionNumber_key";
ALTER TABLE "DirectiveVersion" DROP COLUMN "commandNumber";

CREATE TABLE "BaketVersionSourceMessage" (
  "baketVersionId" UUID NOT NULL,
  "messageId" UUID NOT NULL,
  CONSTRAINT "BaketVersionSourceMessage_pkey" PRIMARY KEY ("baketVersionId", "messageId"),
  CONSTRAINT "BaketVersionSourceMessage_baketVersionId_fkey"
    FOREIGN KEY ("baketVersionId") REFERENCES "BaketVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BaketVersionSourceMessage_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "WhatsAppMessage"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "BaketVersionSourceMessage" ("baketVersionId", "messageId")
SELECT version."id", source."messageId"
FROM "BaketSourceMessage" AS source
JOIN "Baket" AS baket ON baket."id" = source."baketId"
JOIN "BaketVersion" AS version
  ON version."baketId" = baket."id"
 AND version."versionNumber" = baket."currentVersionNumber";

CREATE INDEX "BaketVersionSourceMessage_messageId_idx"
ON "BaketVersionSourceMessage"("messageId");
DROP TABLE "BaketSourceMessage";

CREATE TABLE "BaketVersionAttachment" (
  "baketVersionId" UUID NOT NULL,
  "fileId" UUID NOT NULL,
  "caption" TEXT,
  CONSTRAINT "BaketVersionAttachment_pkey" PRIMARY KEY ("baketVersionId", "fileId"),
  CONSTRAINT "BaketVersionAttachment_baketVersionId_fkey"
    FOREIGN KEY ("baketVersionId") REFERENCES "BaketVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BaketVersionAttachment_fileId_fkey"
    FOREIGN KEY ("fileId") REFERENCES "FileAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "BaketVersionAttachment" ("baketVersionId", "fileId", "caption")
SELECT version."id", attachment."fileId", attachment."caption"
FROM "BaketAttachment" AS attachment
JOIN "Baket" AS baket ON baket."id" = attachment."baketId"
JOIN "BaketVersion" AS version
  ON version."baketId" = baket."id"
 AND version."versionNumber" = baket."currentVersionNumber";

CREATE INDEX "BaketVersionAttachment_fileId_idx" ON "BaketVersionAttachment"("fileId");
DROP TABLE "BaketAttachment";

ALTER TABLE "PersonnelLocationPing"
DROP CONSTRAINT IF EXISTS "PersonnelLocationPing_positionAssignmentId_fkey";
ALTER TABLE "PersonnelLocationPing"
ADD CONSTRAINT "PersonnelLocationPing_positionAssignmentId_fkey"
FOREIGN KEY ("positionAssignmentId") REFERENCES "PositionAssignment"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ApiIdempotencyRecord" (
  "id" UUID NOT NULL,
  "scopeKey" VARCHAR(180) NOT NULL,
  "operationId" VARCHAR(80) NOT NULL,
  "idempotencyKey" VARCHAR(180) NOT NULL,
  "requestHash" VARCHAR(64) NOT NULL,
  "status" "IdempotencyStatus" NOT NULL DEFAULT 'PROCESSING',
  "responseStatus" INTEGER,
  "responseBody" JSONB,
  "resourceType" VARCHAR(120),
  "resourceId" VARCHAR(120),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApiIdempotencyRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ApiIdempotencyRecord_scopeKey_operationId_idempotencyKey_key"
ON "ApiIdempotencyRecord"("scopeKey", "operationId", "idempotencyKey");
CREATE INDEX "ApiIdempotencyRecord_expiresAt_idx" ON "ApiIdempotencyRecord"("expiresAt");

CREATE TABLE "AsyncJob" (
  "id" UUID NOT NULL,
  "type" VARCHAR(120) NOT NULL,
  "status" "AsyncJobStatus" NOT NULL DEFAULT 'QUEUED',
  "payload" JSONB NOT NULL,
  "result" JSONB,
  "progress" INTEGER NOT NULL DEFAULT 0,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMP(3),
  "lockedBy" VARCHAR(120),
  "lastError" TEXT,
  "requestedById" UUID,
  "correlationId" VARCHAR(120),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AsyncJob_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "chk_async_job_progress" CHECK ("progress" BETWEEN 0 AND 100),
  CONSTRAINT "chk_async_job_attempts" CHECK ("attempts" >= 0 AND "maxAttempts" > 0)
);
CREATE INDEX "AsyncJob_status_availableAt_idx" ON "AsyncJob"("status", "availableAt");
CREATE INDEX "AsyncJob_type_createdAt_idx" ON "AsyncJob"("type", "createdAt");
CREATE INDEX "AsyncJob_correlationId_idx" ON "AsyncJob"("correlationId");

CREATE TABLE "OutboxEvent" (
  "id" UUID NOT NULL,
  "topic" VARCHAR(120) NOT NULL,
  "aggregateType" VARCHAR(120) NOT NULL,
  "aggregateId" VARCHAR(120) NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "OutboxEventStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMP(3),
  "lockedBy" VARCHAR(120),
  "lastError" TEXT,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OutboxEvent_status_availableAt_idx" ON "OutboxEvent"("status", "availableAt");
CREATE INDEX "OutboxEvent_aggregateType_aggregateId_createdAt_idx"
ON "OutboxEvent"("aggregateType", "aggregateId", "createdAt");

CREATE TABLE "FileUploadReservation" (
  "id" UUID NOT NULL,
  "storageKey" VARCHAR(500) NOT NULL,
  "originalName" VARCHAR(255) NOT NULL,
  "mimeType" VARCHAR(120) NOT NULL,
  "fileType" "FileType" NOT NULL,
  "sizeBytes" BIGINT NOT NULL,
  "checksumSha256" VARCHAR(64) NOT NULL,
  "context" VARCHAR(80) NOT NULL,
  "uploadTokenHash" VARCHAR(64) NOT NULL,
  "createdByAssignmentId" UUID NOT NULL,
  "fileAssetId" UUID,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FileUploadReservation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FileUploadReservation_fileAssetId_fkey"
    FOREIGN KEY ("fileAssetId") REFERENCES "FileAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "FileUploadReservation_storageKey_key" ON "FileUploadReservation"("storageKey");
CREATE UNIQUE INDEX "FileUploadReservation_uploadTokenHash_key" ON "FileUploadReservation"("uploadTokenHash");
CREATE UNIQUE INDEX "FileUploadReservation_fileAssetId_key" ON "FileUploadReservation"("fileAssetId");
CREATE INDEX "FileUploadReservation_createdByAssignmentId_createdAt_idx"
ON "FileUploadReservation"("createdByAssignmentId", "createdAt");
CREATE INDEX "FileUploadReservation_expiresAt_idx" ON "FileUploadReservation"("expiresAt");

CREATE TABLE "ProductApprovalEvent" (
  "id" UUID NOT NULL,
  "workflowId" UUID NOT NULL,
  "stepId" UUID,
  "eventType" "ApprovalEventType" NOT NULL,
  "actorAssignmentId" UUID,
  "note" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductApprovalEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductApprovalEvent_workflowId_fkey"
    FOREIGN KEY ("workflowId") REFERENCES "ProductApprovalWorkflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ProductApprovalEvent_stepId_fkey"
    FOREIGN KEY ("stepId") REFERENCES "ProductApprovalStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "ProductApprovalEvent_workflowId_createdAt_idx"
ON "ProductApprovalEvent"("workflowId", "createdAt");
CREATE INDEX "ProductApprovalEvent_stepId_createdAt_idx"
ON "ProductApprovalEvent"("stepId", "createdAt");
CREATE INDEX "ProductApprovalEvent_actorAssignmentId_createdAt_idx"
ON "ProductApprovalEvent"("actorAssignmentId", "createdAt");

CREATE OR REPLACE FUNCTION dens_cakra_prevent_product_approval_event_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'ProductApprovalEvent is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_product_approval_event_append_only
BEFORE UPDATE OR DELETE ON "ProductApprovalEvent"
FOR EACH ROW EXECUTE FUNCTION dens_cakra_prevent_product_approval_event_mutation();
