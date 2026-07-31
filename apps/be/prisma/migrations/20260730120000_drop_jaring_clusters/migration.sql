ALTER TABLE "Baket" DROP CONSTRAINT IF EXISTS "Baket_jaringClusterId_fkey";
ALTER TABLE "Jaring" DROP CONSTRAINT IF EXISTS "Jaring_clusterId_fkey";

DROP INDEX IF EXISTS "Baket_jaringClusterId_status_idx";
DROP INDEX IF EXISTS "Jaring_clusterId_status_idx";
DROP INDEX IF EXISTS "JaringCluster_isActive_name_idx";
DROP INDEX IF EXISTS "JaringCluster_code_key";
DROP INDEX IF EXISTS "JaringCluster_name_key";

ALTER TABLE "Baket" DROP COLUMN IF EXISTS "jaringClusterId";
ALTER TABLE "Jaring" DROP COLUMN IF EXISTS "clusterId";

DROP TABLE IF EXISTS "JaringCluster";
