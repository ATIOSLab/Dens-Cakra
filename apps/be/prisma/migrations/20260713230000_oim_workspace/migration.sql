ALTER TABLE "ProductTypeDefinition" ADD COLUMN "numberCode" VARCHAR(20);

UPDATE "ProductTypeDefinition"
SET "numberCode" = CASE "code"
  WHEN 'JURNAL_INFORMASI' THEN 'JI'
  WHEN 'LAPORAN_INFORMASI' THEN 'LI'
  WHEN 'LAPORAN_INTELIJEN' THEN 'LAPINTEL'
  WHEN 'BASIC_DESCRIPTIVE_INTELLIGENCE' THEN 'BDI'
  WHEN 'LAPORAN_HARIAN_INTELIJEN' THEN 'LHI'
  WHEN 'LAPORAN_INTELIJEN_KHUSUS' THEN 'LAPINTELSUS'
  WHEN 'PERKIRAAN_INTELIJEN_SITUASI' THEN 'PIS'
  ELSE LEFT(REGEXP_REPLACE("code", '[^A-Z0-9]', '', 'g'), 20)
END;

ALTER TABLE "ProductTypeDefinition" ALTER COLUMN "numberCode" SET NOT NULL;
CREATE UNIQUE INDEX "ProductTypeDefinition_numberCode_key" ON "ProductTypeDefinition"("numberCode");

ALTER TABLE "IntelligenceProduct" ADD COLUMN "classification" "Classification";
UPDATE "IntelligenceProduct" SET "classification" = 'TERBATAS' WHERE "classification" IS NULL;
ALTER TABLE "IntelligenceProduct" ALTER COLUMN "classification" SET NOT NULL;

CREATE TABLE "ProductNumberSequence" (
  "id" UUID NOT NULL,
  "productTypeId" UUID NOT NULL,
  "year" INTEGER NOT NULL,
  "lastNumber" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductNumberSequence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductNumberSequence_productTypeId_year_key" ON "ProductNumberSequence"("productTypeId", "year");
CREATE INDEX "ProductNumberSequence_year_idx" ON "ProductNumberSequence"("year");
ALTER TABLE "ProductNumberSequence" ADD CONSTRAINT "ProductNumberSequence_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductTypeDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
