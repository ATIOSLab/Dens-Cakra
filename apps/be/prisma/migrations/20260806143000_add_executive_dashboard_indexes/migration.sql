-- Additive indexes for the executive dashboard period and Gaswil filters.
-- No data or existing constraint is changed by this migration.
CREATE INDEX IF NOT EXISTS "WhatsAppReportSession_submittedAt_id_idx"
  ON "WhatsAppReportSession" ("submittedAt" DESC, "id" DESC);

CREATE INDEX IF NOT EXISTS "WhatsAppReportSession_fieldOfficerAssignmentId_submittedAt_idx"
  ON "WhatsAppReportSession" ("fieldOfficerAssignmentId", "submittedAt" DESC);
