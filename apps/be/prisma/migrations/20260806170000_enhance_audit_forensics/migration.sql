ALTER TABLE "AuditLog"
  ADD COLUMN "category" VARCHAR(40) NOT NULL DEFAULT 'ACTIVITY',
  ADD COLUMN "severity" VARCHAR(20) NOT NULL DEFAULT 'INFO',
  ADD COLUMN "outcome" VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
  ADD COLUMN "deviceType" VARCHAR(40),
  ADD COLUMN "browser" VARCHAR(80),
  ADD COLUMN "operatingSystem" VARCHAR(80),
  ADD COLUMN "locationLabel" VARCHAR(255),
  ADD COLUMN "requestId" VARCHAR(120),
  ADD COLUMN "sessionId" VARCHAR(255),
  ADD COLUMN "httpMethod" VARCHAR(12),
  ADD COLUMN "requestPath" VARCHAR(500),
  ADD COLUMN "statusCode" INTEGER,
  ADD COLUMN "durationMs" INTEGER,
  ADD COLUMN "source" VARCHAR(80),
  ADD COLUMN "riskScore" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "isAnomaly" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isIncident" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "riskIndicators" JSONB;

-- The audit table is append-only at runtime. This one-time classification makes
-- historical events immediately usable by the forensic filters and summaries.
ALTER TABLE "AuditLog" DISABLE TRIGGER "trg_prevent_audit_log_mutation";

UPDATE "AuditLog"
SET
  "category" = CASE
    WHEN lower("action") LIKE 'auth.%' OR upper("action") LIKE 'AUTH.%' THEN 'AUTHENTICATION'
    WHEN upper("action") LIKE 'USER.%'
      OR upper("action") LIKE 'RBAC.%'
      OR upper("action") LIKE 'SYSTEM.%'
      OR upper("action") LIKE 'POSITION.%'
      OR upper("action") LIKE 'AREA.%'
      OR upper("action") LIKE 'ORGANIZATION.%' THEN 'ADMINISTRATION'
    WHEN upper("action") LIKE 'INTEGRATION.%'
      OR upper("action") LIKE 'WHATSAPP.%' THEN 'INTEGRATION'
    WHEN upper("action") LIKE 'FILE.%'
      OR upper("action") LIKE 'AUDIT.EXPORT.%' THEN 'DATA_ACCESS'
    WHEN upper("action") LIKE 'JARING.%'
      OR upper("action") LIKE 'BAKET.%'
      OR upper("action") LIKE 'TASK.%'
      OR upper("action") LIKE 'DIRECTIVE.%'
      OR upper("action") LIKE 'UUK.%'
      OR upper("action") LIKE 'ANALYSIS.%'
      OR upper("action") LIKE 'PRODUCT.%' THEN 'INTELLIGENCE_OPERATION'
    ELSE 'ACTIVITY'
  END,
  "severity" = CASE
    WHEN upper("action") LIKE '%PASSWORD%'
      OR upper("action") LIKE '%LOCK%'
      OR upper("action") LIKE '%SUSPEND%'
      OR upper("action") LIKE '%REVOKE%'
      OR upper("action") LIKE '%DELETE%'
      OR upper("action") LIKE 'SYSTEM.SETTING.%'
      OR upper("action") LIKE 'AUDIT.EXPORT.%' THEN 'MEDIUM'
    ELSE 'INFO'
  END;

ALTER TABLE "AuditLog" ENABLE TRIGGER "trg_prevent_audit_log_mutation";

CREATE INDEX "AuditLog_createdAt_id_idx" ON "AuditLog"("createdAt", "id");
CREATE INDEX "AuditLog_category_createdAt_idx" ON "AuditLog"("category", "createdAt");
CREATE INDEX "AuditLog_severity_createdAt_idx" ON "AuditLog"("severity", "createdAt");
CREATE INDEX "AuditLog_outcome_createdAt_idx" ON "AuditLog"("outcome", "createdAt");
CREATE INDEX "AuditLog_isIncident_isAnomaly_createdAt_idx" ON "AuditLog"("isIncident", "isAnomaly", "createdAt");
CREATE INDEX "AuditLog_requestId_idx" ON "AuditLog"("requestId");
CREATE INDEX "AuditLog_ipAddress_createdAt_idx" ON "AuditLog"("ipAddress", "createdAt");
CREATE INDEX "AuditLog_source_createdAt_idx" ON "AuditLog"("source", "createdAt");

CREATE OR REPLACE FUNCTION dens_cakra_classify_audit_log()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."category" = 'ACTIVITY' AND NEW."action" NOT LIKE 'HTTP.%' THEN
    NEW."category" := CASE
      WHEN lower(NEW."action") LIKE 'auth.%' OR upper(NEW."action") LIKE 'AUTH.%' THEN 'AUTHENTICATION'
      WHEN upper(NEW."action") LIKE 'USER.%'
        OR upper(NEW."action") LIKE 'RBAC.%'
        OR upper(NEW."action") LIKE 'SYSTEM.%'
        OR upper(NEW."action") LIKE 'POSITION.%'
        OR upper(NEW."action") LIKE 'AREA.%'
        OR upper(NEW."action") LIKE 'ORGANIZATION.%' THEN 'ADMINISTRATION'
      WHEN upper(NEW."action") LIKE 'INTEGRATION.%'
        OR upper(NEW."action") LIKE 'WHATSAPP.%' THEN 'INTEGRATION'
      WHEN upper(NEW."action") LIKE 'FILE.%'
        OR upper(NEW."action") LIKE 'AUDIT.EXPORT.%' THEN 'DATA_ACCESS'
      WHEN upper(NEW."action") LIKE 'JARING.%'
        OR upper(NEW."action") LIKE 'BAKET.%'
        OR upper(NEW."action") LIKE 'TASK.%'
        OR upper(NEW."action") LIKE 'DIRECTIVE.%'
        OR upper(NEW."action") LIKE 'UUK.%'
        OR upper(NEW."action") LIKE 'ANALYSIS.%'
        OR upper(NEW."action") LIKE 'PRODUCT.%' THEN 'INTELLIGENCE_OPERATION'
      ELSE NEW."category"
    END;
  END IF;

  IF NEW."severity" = 'INFO' AND (
    upper(NEW."action") LIKE '%PASSWORD%'
    OR upper(NEW."action") LIKE '%LOCK%'
    OR upper(NEW."action") LIKE '%SUSPEND%'
    OR upper(NEW."action") LIKE '%REVOKE%'
    OR upper(NEW."action") LIKE '%DELETE%'
    OR upper(NEW."action") LIKE 'SYSTEM.SETTING.%'
    OR upper(NEW."action") LIKE 'AUDIT.EXPORT.%'
  ) THEN
    NEW."severity" := 'MEDIUM';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "trg_classify_audit_log" ON "AuditLog";
CREATE TRIGGER "trg_classify_audit_log"
BEFORE INSERT ON "AuditLog"
FOR EACH ROW
EXECUTE FUNCTION dens_cakra_classify_audit_log();
