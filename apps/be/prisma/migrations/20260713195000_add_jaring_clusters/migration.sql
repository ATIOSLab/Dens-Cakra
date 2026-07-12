CREATE TABLE "JaringCluster" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JaringCluster_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Jaring" ADD COLUMN "clusterId" UUID;

CREATE UNIQUE INDEX "JaringCluster_code_key" ON "JaringCluster"("code");
CREATE UNIQUE INDEX "JaringCluster_name_key" ON "JaringCluster"("name");
CREATE INDEX "JaringCluster_isActive_name_idx" ON "JaringCluster"("isActive", "name");
CREATE INDEX "Jaring_clusterId_status_idx" ON "Jaring"("clusterId", "status");

ALTER TABLE "Jaring" ADD CONSTRAINT "Jaring_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "JaringCluster"("id") ON DELETE SET NULL ON UPDATE CASCADE;
