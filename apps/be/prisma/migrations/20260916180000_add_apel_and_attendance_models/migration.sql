-- CreateEnum
CREATE TYPE "ApelSessionStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'BLASTING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApelAttendanceStatus" AS ENUM ('PENDING', 'PRESENT', 'LATE', 'ABSENT');

-- CreateEnum
CREATE TYPE "ApelSentStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "ApelChannelSelectionMode" AS ENUM ('MANUAL', 'LOAD_BALANCE');

-- CreateTable
CREATE TABLE "ApelConfig" (
    "id" UUID NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "description" TEXT,
    "areaId" UUID,
    "channelSelectionMode" "ApelChannelSelectionMode" NOT NULL DEFAULT 'MANUAL',
    "selectedChannelId" UUID,
    "selectedChannelIds" JSONB,
    "messageTemplate" TEXT NOT NULL,
    "scheduleTime" VARCHAR(10) NOT NULL DEFAULT '07:00',
    "deadlineTime" VARCHAR(10) NOT NULL DEFAULT '08:30',
    "deadlineMinutes" INTEGER NOT NULL DEFAULT 90,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "minDelaySeconds" INTEGER NOT NULL DEFAULT 8,
    "maxDelaySeconds" INTEGER NOT NULL DEFAULT 20,
    "batchSize" INTEGER NOT NULL DEFAULT 5,
    "batchPauseSeconds" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApelConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApelSession" (
    "id" UUID NOT NULL,
    "configId" UUID,
    "title" VARCHAR(200) NOT NULL,
    "sessionDate" DATE NOT NULL,
    "areaId" UUID,
    "status" "ApelSessionStatus" NOT NULL DEFAULT 'DRAFT',
    "messageTemplateUsed" TEXT NOT NULL,
    "blastedAt" TIMESTAMP(3),
    "blastingCompletedAt" TIMESTAMP(3),
    "deadlineAt" TIMESTAMP(3) NOT NULL,
    "totalTarget" INTEGER NOT NULL DEFAULT 0,
    "totalSent" INTEGER NOT NULL DEFAULT 0,
    "totalFailed" INTEGER NOT NULL DEFAULT 0,
    "totalAttended" INTEGER NOT NULL DEFAULT 0,
    "totalAbsent" INTEGER NOT NULL DEFAULT 0,
    "createdByUserId" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApelSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApelAttendance" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "jaringId" UUID NOT NULL,
    "channelId" UUID,
    "phoneNumber" VARCHAR(30) NOT NULL,
    "sentStatus" "ApelSentStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "deliveryError" TEXT,
    "attendanceStatus" "ApelAttendanceStatus" NOT NULL DEFAULT 'PENDING',
    "attendedAt" TIMESTAMP(3),
    "replyContent" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "coordinateSource" "CoordinateSource",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApelAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApelConfig_areaId_isActive_idx" ON "ApelConfig"("areaId", "isActive");

-- CreateIndex
CREATE INDEX "ApelConfig_selectedChannelId_idx" ON "ApelConfig"("selectedChannelId");

-- CreateIndex
CREATE INDEX "ApelSession_sessionDate_status_idx" ON "ApelSession"("sessionDate", "status");

-- CreateIndex
CREATE INDEX "ApelSession_areaId_sessionDate_idx" ON "ApelSession"("areaId", "sessionDate");

-- CreateIndex
CREATE UNIQUE INDEX "ApelAttendance_sessionId_jaringId_key" ON "ApelAttendance"("sessionId", "jaringId");

-- CreateIndex
CREATE INDEX "ApelAttendance_sessionId_attendanceStatus_idx" ON "ApelAttendance"("sessionId", "attendanceStatus");

-- CreateIndex
CREATE INDEX "ApelAttendance_jaringId_idx" ON "ApelAttendance"("jaringId");

-- CreateIndex
CREATE INDEX "ApelAttendance_phoneNumber_idx" ON "ApelAttendance"("phoneNumber");

-- AddForeignKey
ALTER TABLE "ApelConfig" ADD CONSTRAINT "ApelConfig_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "AdministrativeArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApelConfig" ADD CONSTRAINT "ApelConfig_selectedChannelId_fkey" FOREIGN KEY ("selectedChannelId") REFERENCES "IntegrationChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApelSession" ADD CONSTRAINT "ApelSession_configId_fkey" FOREIGN KEY ("configId") REFERENCES "ApelConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApelSession" ADD CONSTRAINT "ApelSession_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "AdministrativeArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApelAttendance" ADD CONSTRAINT "ApelAttendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ApelSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApelAttendance" ADD CONSTRAINT "ApelAttendance_jaringId_fkey" FOREIGN KEY ("jaringId") REFERENCES "Jaring"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApelAttendance" ADD CONSTRAINT "ApelAttendance_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "IntegrationChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
