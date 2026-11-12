-- CreateEnum
CREATE TYPE "LocationRequirement" AS ENUM ('REQUIRED', 'OPTIONAL');

-- AlterTable
ALTER TABLE "IntegrationChannel" ADD COLUMN "locationRequirement" "LocationRequirement" NOT NULL DEFAULT 'REQUIRED';
