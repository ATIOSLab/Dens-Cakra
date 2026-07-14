ALTER TABLE "JaringCluster"
ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "ReportCategory"
ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
