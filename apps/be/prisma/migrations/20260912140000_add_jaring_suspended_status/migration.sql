-- AlterEnum
-- Add SUSPENDED to JaringRegistrationStatus to allow Deputi II to suspend jaring
ALTER TYPE "JaringRegistrationStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';
