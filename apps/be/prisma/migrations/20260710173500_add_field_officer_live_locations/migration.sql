CREATE TABLE "field_officer_live_locations" (
    "id" SERIAL NOT NULL,
    "fieldOfficerId" TEXT NOT NULL,
    "fieldOfficerName" TEXT,
    "title" TEXT,
    "sector" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "altitude" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'browser',
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "field_officer_live_locations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "field_officer_live_locations_fieldOfficerId_key" ON "field_officer_live_locations"("fieldOfficerId");

CREATE INDEX "field_officer_live_locations_updatedAt_idx" ON "field_officer_live_locations"("updatedAt");
