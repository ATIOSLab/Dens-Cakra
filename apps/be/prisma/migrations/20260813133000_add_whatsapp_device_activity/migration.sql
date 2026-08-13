-- CreateEnum
CREATE TYPE "WhatsAppDeviceEventType" AS ENUM ('CONNECTING', 'QR_READY', 'PAIRING_CODE_READY', 'LOGIN', 'LOGOUT', 'DISCONNECTED', 'ERROR', 'STATUS_UPDATE');

-- CreateTable
CREATE TABLE "WhatsAppDeviceActivityLog" (
    "id" UUID NOT NULL,
    "channelId" UUID NOT NULL,
    "senderNumberId" UUID,
    "phoneNumber" VARCHAR(30),
    "eventType" "WhatsAppDeviceEventType" NOT NULL,
    "connectionStatus" "WhatsAppBotConnectionStatus" NOT NULL,
    "previousConnectionStatus" "WhatsAppBotConnectionStatus",
    "sessionJid" VARCHAR(160),
    "scopeAreaId" UUID,
    "userProfileId" UUID,
    "operationalAssignmentId" UUID,
    "reason" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppDeviceActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppNotificationRecipient" (
    "id" UUID NOT NULL,
    "email" VARCHAR(250) NOT NULL,
    "label" VARCHAR(160),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnConnected" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnDisconnected" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnError" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppNotificationRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhatsAppDeviceActivityLog_channelId_occurredAt_idx" ON "WhatsAppDeviceActivityLog"("channelId", "occurredAt");

-- CreateIndex
CREATE INDEX "WhatsAppDeviceActivityLog_phoneNumber_occurredAt_idx" ON "WhatsAppDeviceActivityLog"("phoneNumber", "occurredAt");

-- CreateIndex
CREATE INDEX "WhatsAppDeviceActivityLog_connectionStatus_occurredAt_idx" ON "WhatsAppDeviceActivityLog"("connectionStatus", "occurredAt");

-- CreateIndex
CREATE INDEX "WhatsAppDeviceActivityLog_eventType_occurredAt_idx" ON "WhatsAppDeviceActivityLog"("eventType", "occurredAt");

-- CreateIndex
CREATE INDEX "WhatsAppDeviceActivityLog_scopeAreaId_occurredAt_idx" ON "WhatsAppDeviceActivityLog"("scopeAreaId", "occurredAt");

-- CreateIndex
CREATE INDEX "WhatsAppDeviceActivityLog_userProfileId_occurredAt_idx" ON "WhatsAppDeviceActivityLog"("userProfileId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppNotificationRecipient_email_key" ON "WhatsAppNotificationRecipient"("email");

-- CreateIndex
CREATE INDEX "WhatsAppNotificationRecipient_isActive_idx" ON "WhatsAppNotificationRecipient"("isActive");

-- AddForeignKey
ALTER TABLE "WhatsAppDeviceActivityLog" ADD CONSTRAINT "WhatsAppDeviceActivityLog_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "IntegrationChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppDeviceActivityLog" ADD CONSTRAINT "WhatsAppDeviceActivityLog_senderNumberId_fkey" FOREIGN KEY ("senderNumberId") REFERENCES "WhatsAppSenderNumber"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppDeviceActivityLog" ADD CONSTRAINT "WhatsAppDeviceActivityLog_scopeAreaId_fkey" FOREIGN KEY ("scopeAreaId") REFERENCES "AdministrativeArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppDeviceActivityLog" ADD CONSTRAINT "WhatsAppDeviceActivityLog_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "user_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppDeviceActivityLog" ADD CONSTRAINT "WhatsAppDeviceActivityLog_operationalAssignmentId_fkey" FOREIGN KEY ("operationalAssignmentId") REFERENCES "UserOperationalAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
