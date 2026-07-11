ALTER TABLE "whatsapp_reports"
  ADD COLUMN "cluster" TEXT,
  ADD COLUMN "category" TEXT,
  ADD COLUMN "occurredAt" TIMESTAMP(3);
