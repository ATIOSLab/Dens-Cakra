CREATE TABLE "ReportCategory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportCategory_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "WhatsAppMessage" ADD COLUMN "categoryId" UUID;

CREATE UNIQUE INDEX "ReportCategory_code_key" ON "ReportCategory"("code");
CREATE UNIQUE INDEX "ReportCategory_name_key" ON "ReportCategory"("name");
CREATE INDEX "ReportCategory_isActive_name_idx" ON "ReportCategory"("isActive", "name");
CREATE INDEX "WhatsAppMessage_categoryId_receivedAt_idx" ON "WhatsAppMessage"("categoryId", "receivedAt");

ALTER TABLE "WhatsAppMessage"
ADD CONSTRAINT "WhatsAppMessage_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "ReportCategory"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
