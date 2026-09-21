-- Additive performance indexes for page queries and filters
CREATE INDEX IF NOT EXISTS "Jaring_whatsappNumber_idx" ON "Jaring"("whatsappNumber");
CREATE INDEX IF NOT EXISTS "Jaring_registeredAt_idx" ON "Jaring"("registeredAt" DESC);
CREATE INDEX IF NOT EXISTS "Jaring_createdByAssignmentId_status_idx" ON "Jaring"("createdByAssignmentId", "status");
CREATE INDEX IF NOT EXISTS "JaringAreaCoverage_jaringId_validUntil_idx" ON "JaringAreaCoverage"("jaringId", "validUntil");
CREATE INDEX IF NOT EXISTS "WhatsAppMessage_status_receivedAt_idx" ON "WhatsAppMessage"("status", "receivedAt" DESC);
CREATE INDEX IF NOT EXISTS "Baket_status_createdAt_idx" ON "Baket"("status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Baket_createdAt_idx" ON "Baket"("createdAt" DESC);
