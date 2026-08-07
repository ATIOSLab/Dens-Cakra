-- DropIndex
DROP INDEX "AdministrativeAreaBoundary_boundary_gist_idx";

-- DropIndex
DROP INDEX "Alert_locationPoint_gist_idx";

-- DropIndex
DROP INDEX "BaketVersion_locationPoint_gist_idx";

-- DropIndex
DROP INDEX "EmergencyIncident_locationPoint_gist_idx";

-- DropIndex
DROP INDEX "Jaring_address_trgm_idx";

-- DropIndex
DROP INDEX "Jaring_aliasName_trgm_idx";

-- DropIndex
DROP INDEX "Jaring_fullName_trgm_idx";

-- DropIndex
DROP INDEX "Jaring_whatsappNumber_trgm_idx";

-- DropIndex
DROP INDEX "PersonnelLocationPing_locationPoint_gist_idx";

-- DropIndex
DROP INDEX "WhatsAppMessage_locationPoint_gist_idx";

-- DropIndex
DROP INDEX "WhatsAppMessage_senderPhone_trgm_idx";

-- DropIndex
DROP INDEX "WhatsAppReportSession_fieldOfficerAssignmentId_submittedAt_idx";

-- DropIndex
DROP INDEX "WhatsAppReportSession_submittedAt_id_idx";

-- CreateIndex
CREATE INDEX "WhatsAppReportSession_submittedAt_id_idx" ON "WhatsAppReportSession"("submittedAt", "id");

-- CreateIndex
CREATE INDEX "WhatsAppReportSession_fieldOfficerAssignmentId_submittedAt_idx" ON "WhatsAppReportSession"("fieldOfficerAssignmentId", "submittedAt");
