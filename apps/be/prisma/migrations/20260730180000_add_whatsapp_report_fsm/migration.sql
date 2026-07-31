CREATE TYPE "WhatsAppReportSessionState" AS ENUM (
  'AWAITING_CODE',
  'TITLE',
  'TITLE_CONFIRMATION',
  'CONTENT',
  'CONTENT_CONFIRMATION',
  'LOCATION',
  'LOCATION_CONFIRMATION',
  'TIME',
  'TIME_CONFIRMATION',
  'MEDIA',
  'MEDIA_CONFIRMATION',
  'MEDIA_DELETE_CONFIRMATION',
  'REVIEW',
  'EXISTING_SESSION_CHOICE',
  'CANCEL_CONFIRMATION',
  'POST_SUBMIT_TEXT_CONFIRMATION',
  'POST_SUBMIT_MEDIA_PURPOSE',
  'SUBMITTED',
  'CLOSED'
);

CREATE TYPE "WhatsAppReportSessionStatus" AS ENUM (
  'ACTIVE',
  'SUBMITTED',
  'EXPIRED',
  'CANCELLED',
  'CLOSED'
);

CREATE TYPE "WhatsAppReportAmendmentType" AS ENUM (
  'CONTENT_ADDITION',
  'MEDIA_ADDITION',
  'LOCATION_UPDATE',
  'TIME_UPDATE',
  'TITLE_UPDATE',
  'OTHER'
);

ALTER TABLE "WhatsAppMessage"
ADD COLUMN "referenceNumber" VARCHAR(24);

CREATE TABLE "WhatsAppReportSession" (
  "id" UUID NOT NULL,
  "integrationChannelId" UUID NOT NULL,
  "senderPhone" VARCHAR(30) NOT NULL,
  "remoteJid" VARCHAR(160) NOT NULL,
  "activeSenderKey" VARCHAR(30),
  "jaringId" UUID NOT NULL,
  "fieldOfficerAssignmentId" UUID NOT NULL,
  "currentState" "WhatsAppReportSessionState" NOT NULL,
  "status" "WhatsAppReportSessionStatus" NOT NULL DEFAULT 'ACTIVE',
  "title" VARCHAR(150),
  "content" TEXT,
  "latitude" DECIMAL(10,7),
  "longitude" DECIMAL(10,7),
  "locationAccuracyMeters" DECIMAL(10,2),
  "locationCapturedAt" TIMESTAMP(3),
  "locationMessageId" VARCHAR(255),
  "locationType" VARCHAR(40),
  "incidentAt" TIMESTAMP(3),
  "timezone" VARCHAR(60) NOT NULL DEFAULT 'Asia/Jakarta',
  "returnToReview" BOOLEAN NOT NULL DEFAULT false,
  "resumeState" "WhatsAppReportSessionState",
  "pendingAmendmentText" TEXT,
  "pendingFileId" UUID,
  "submittedMessageId" UUID,
  "referenceNumber" VARCHAR(24),
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "submittedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WhatsAppReportSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WhatsAppReportContentPart" (
  "id" UUID NOT NULL,
  "reportSessionId" UUID NOT NULL,
  "externalMessageId" VARCHAR(255) NOT NULL,
  "content" TEXT NOT NULL,
  "orderNo" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WhatsAppReportContentPart_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WhatsAppReportMedia" (
  "id" UUID NOT NULL,
  "reportSessionId" UUID NOT NULL,
  "fileId" UUID NOT NULL,
  "externalMessageId" VARCHAR(255) NOT NULL,
  "mediaType" "FileType" NOT NULL,
  "caption" TEXT,
  "orderNo" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "WhatsAppReportMedia_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WhatsAppReportAmendment" (
  "id" UUID NOT NULL,
  "reportSessionId" UUID NOT NULL,
  "whatsappMessageId" UUID NOT NULL,
  "amendmentType" "WhatsAppReportAmendmentType" NOT NULL,
  "content" TEXT,
  "fileId" UUID,
  "metadata" JSONB,
  "senderPhone" VARCHAR(30) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WhatsAppReportAmendment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WhatsAppReportHistory" (
  "id" UUID NOT NULL,
  "reportSessionId" UUID NOT NULL,
  "action" VARCHAR(120) NOT NULL,
  "previousState" "WhatsAppReportSessionState",
  "newState" "WhatsAppReportSessionState",
  "externalMessageId" VARCHAR(255),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WhatsAppReportHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WhatsAppReportReferenceCounter" (
  "dateKey" CHAR(8) NOT NULL,
  "lastValue" INTEGER NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WhatsAppReportReferenceCounter_pkey" PRIMARY KEY ("dateKey")
);

CREATE UNIQUE INDEX "WhatsAppMessage_referenceNumber_key"
ON "WhatsAppMessage"("referenceNumber");

CREATE UNIQUE INDEX "WhatsAppReportSession_activeSenderKey_key"
ON "WhatsAppReportSession"("activeSenderKey");

CREATE UNIQUE INDEX "WhatsAppReportSession_submittedMessageId_key"
ON "WhatsAppReportSession"("submittedMessageId");

CREATE UNIQUE INDEX "WhatsAppReportSession_referenceNumber_key"
ON "WhatsAppReportSession"("referenceNumber");

CREATE INDEX "WhatsAppReportSession_senderPhone_status_updatedAt_idx"
ON "WhatsAppReportSession"("senderPhone", "status", "updatedAt");

CREATE INDEX "WhatsAppReportSession_integrationChannelId_status_updatedAt_idx"
ON "WhatsAppReportSession"("integrationChannelId", "status", "updatedAt");

CREATE INDEX "WhatsAppReportSession_jaringId_status_updatedAt_idx"
ON "WhatsAppReportSession"("jaringId", "status", "updatedAt");

CREATE INDEX "WhatsAppReportSession_expiresAt_status_idx"
ON "WhatsAppReportSession"("expiresAt", "status");

CREATE UNIQUE INDEX "WhatsAppReportContentPart_reportSessionId_externalMessageId_key"
ON "WhatsAppReportContentPart"("reportSessionId", "externalMessageId");

CREATE UNIQUE INDEX "WhatsAppReportContentPart_reportSessionId_orderNo_key"
ON "WhatsAppReportContentPart"("reportSessionId", "orderNo");

CREATE UNIQUE INDEX "WhatsAppReportMedia_reportSessionId_externalMessageId_key"
ON "WhatsAppReportMedia"("reportSessionId", "externalMessageId");

CREATE UNIQUE INDEX "WhatsAppReportMedia_reportSessionId_orderNo_key"
ON "WhatsAppReportMedia"("reportSessionId", "orderNo");

CREATE INDEX "WhatsAppReportMedia_reportSessionId_deletedAt_orderNo_idx"
ON "WhatsAppReportMedia"("reportSessionId", "deletedAt", "orderNo");

CREATE INDEX "WhatsAppReportAmendment_whatsappMessageId_createdAt_idx"
ON "WhatsAppReportAmendment"("whatsappMessageId", "createdAt");

CREATE INDEX "WhatsAppReportAmendment_reportSessionId_createdAt_idx"
ON "WhatsAppReportAmendment"("reportSessionId", "createdAt");

CREATE INDEX "WhatsAppReportHistory_reportSessionId_createdAt_idx"
ON "WhatsAppReportHistory"("reportSessionId", "createdAt");

CREATE INDEX "WhatsAppReportHistory_externalMessageId_idx"
ON "WhatsAppReportHistory"("externalMessageId");

ALTER TABLE "WhatsAppReportSession"
ADD CONSTRAINT "WhatsAppReportSession_integrationChannelId_fkey"
FOREIGN KEY ("integrationChannelId") REFERENCES "IntegrationChannel"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WhatsAppReportSession"
ADD CONSTRAINT "WhatsAppReportSession_jaringId_fkey"
FOREIGN KEY ("jaringId") REFERENCES "Jaring"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WhatsAppReportSession"
ADD CONSTRAINT "WhatsAppReportSession_fieldOfficerAssignmentId_fkey"
FOREIGN KEY ("fieldOfficerAssignmentId") REFERENCES "UserSeatAssignment"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WhatsAppReportSession"
ADD CONSTRAINT "WhatsAppReportSession_submittedMessageId_fkey"
FOREIGN KEY ("submittedMessageId") REFERENCES "WhatsAppMessage"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WhatsAppReportSession"
ADD CONSTRAINT "WhatsAppReportSession_pendingFileId_fkey"
FOREIGN KEY ("pendingFileId") REFERENCES "FileAsset"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WhatsAppReportContentPart"
ADD CONSTRAINT "WhatsAppReportContentPart_reportSessionId_fkey"
FOREIGN KEY ("reportSessionId") REFERENCES "WhatsAppReportSession"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WhatsAppReportMedia"
ADD CONSTRAINT "WhatsAppReportMedia_reportSessionId_fkey"
FOREIGN KEY ("reportSessionId") REFERENCES "WhatsAppReportSession"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WhatsAppReportMedia"
ADD CONSTRAINT "WhatsAppReportMedia_fileId_fkey"
FOREIGN KEY ("fileId") REFERENCES "FileAsset"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WhatsAppReportAmendment"
ADD CONSTRAINT "WhatsAppReportAmendment_reportSessionId_fkey"
FOREIGN KEY ("reportSessionId") REFERENCES "WhatsAppReportSession"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WhatsAppReportAmendment"
ADD CONSTRAINT "WhatsAppReportAmendment_whatsappMessageId_fkey"
FOREIGN KEY ("whatsappMessageId") REFERENCES "WhatsAppMessage"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WhatsAppReportAmendment"
ADD CONSTRAINT "WhatsAppReportAmendment_fileId_fkey"
FOREIGN KEY ("fileId") REFERENCES "FileAsset"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WhatsAppReportHistory"
ADD CONSTRAINT "WhatsAppReportHistory_reportSessionId_fkey"
FOREIGN KEY ("reportSessionId") REFERENCES "WhatsAppReportSession"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
