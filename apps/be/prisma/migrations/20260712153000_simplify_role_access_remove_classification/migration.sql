DROP INDEX IF EXISTS "DirectiveVersion_classification_commandDate_idx";

ALTER TABLE "DirectiveVersion"
DROP COLUMN "classification";

ALTER TABLE "Task"
DROP COLUMN "classification";

ALTER TABLE "IntelligenceProduct"
DROP COLUMN "classification";

ALTER TABLE "ProductDistribution"
DROP COLUMN "classification";

DROP TABLE IF EXISTS "RolePermission";

DROP TABLE IF EXISTS "Permission";

DROP TYPE IF EXISTS "Classification";

CREATE INDEX "DirectiveVersion_commandDate_idx" ON "DirectiveVersion"("commandDate");
