-- CreateEnum
CREATE TYPE "JaringGender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "JaringEmploymentStatus" AS ENUM ('ASN', 'PRIVATE_EMPLOYEE', 'SELF_EMPLOYED', 'UNIVERSITY_STUDENT', 'SCHOOL_STUDENT', 'UNEMPLOYED', 'OTHER');

-- AlterTable
ALTER TABLE "Jaring" ADD COLUMN     "birthDate" DATE,
ADD COLUMN     "birthPlace" VARCHAR(120),
ADD COLUMN     "employmentStatus" "JaringEmploymentStatus",
ADD COLUMN     "fullName" VARCHAR(180),
ADD COLUMN     "gender" "JaringGender",
ADD COLUMN     "jobTitle" VARCHAR(150),
ADD COLUMN     "nationalIdNumber" CHAR(16),
ADD COLUMN     "occupation" VARCHAR(150),
ADD COLUMN     "workplace" VARCHAR(180);
