-- CreateEnum
CREATE TYPE "PersonnelGender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "PersonnelMaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED');

-- CreateEnum
CREATE TYPE "PersonnelStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'RETIRED', 'CONTRACT');

-- AlterTable
ALTER TABLE "user_profile" ADD COLUMN     "assignmentHistory" JSONB,
ADD COLUMN     "birthDate" DATE,
ADD COLUMN     "birthPlace" VARCHAR(120),
ADD COLUMN     "bloodType" VARCHAR(5),
ADD COLUMN     "competencies" JSONB,
ADD COLUMN     "educationInstitution" VARCHAR(180),
ADD COLUMN     "educationMajor" VARCHAR(150),
ADD COLUMN     "gender" "PersonnelGender",
ADD COLUMN     "graduationYear" INTEGER,
ADD COLUMN     "joinedAt" DATE,
ADD COLUMN     "lastEducation" VARCHAR(120),
ADD COLUMN     "maritalStatus" "PersonnelMaritalStatus",
ADD COLUMN     "nationalIdNumber" CHAR(16),
ADD COLUMN     "personnelNumber" VARCHAR(80),
ADD COLUMN     "personnelStatus" "PersonnelStatus",
ADD COLUMN     "positionHistory" JSONB,
ADD COLUMN     "rankGrade" VARCHAR(120),
ADD COLUMN     "religion" VARCHAR(80);

-- CreateIndex
CREATE INDEX "user_profile_nationalIdNumber_idx" ON "user_profile"("nationalIdNumber");

-- CreateIndex
CREATE INDEX "user_profile_personnelStatus_idx" ON "user_profile"("personnelStatus");
