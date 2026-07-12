-- CreateEnum
CREATE TYPE "WhatsAppBotConnectionStatus" AS ENUM ('DISCONNECTED', 'CONNECTING', 'QR_READY', 'PAIRING_CODE_READY', 'CONNECTED', 'ERROR');

-- DropIndex
DROP INDEX "AdministrativeAreaBoundary_boundary_gist";

-- DropIndex
DROP INDEX "Alert_locationPoint_gist";

-- DropIndex
DROP INDEX "BaketVersion_locationPoint_gist";

-- DropIndex
DROP INDEX "EmergencyIncident_locationPoint_gist";

-- DropIndex
DROP INDEX "PersonnelLocationPing_locationPoint_gist";

-- DropIndex
DROP INDEX "WhatsAppMessage_locationPoint_gist";

-- CreateTable
CREATE TABLE "WhatsAppBotChannelState" (
    "id" UUID NOT NULL,
    "integrationChannelId" UUID NOT NULL,
    "connectionStatus" "WhatsAppBotConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "qrCodeText" TEXT,
    "qrCodeDataUrl" TEXT,
    "pairingCode" VARCHAR(64),
    "authStatePath" VARCHAR(300),
    "botPhoneNumber" VARCHAR(30),
    "sessionJid" VARCHAR(120),
    "lastConnectedAt" TIMESTAMP(3),
    "lastDisconnectedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppBotChannelState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppSenderNumber" (
    "id" UUID NOT NULL,
    "integrationChannelId" UUID NOT NULL,
    "phoneNumber" VARCHAR(30) NOT NULL,
    "label" VARCHAR(120),
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppSenderNumber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppBotChannelState_integrationChannelId_key" ON "WhatsAppBotChannelState"("integrationChannelId");

-- CreateIndex
CREATE INDEX "WhatsAppBotChannelState_connectionStatus_updatedAt_idx" ON "WhatsAppBotChannelState"("connectionStatus", "updatedAt");

-- CreateIndex
CREATE INDEX "WhatsAppSenderNumber_integrationChannelId_isActive_idx" ON "WhatsAppSenderNumber"("integrationChannelId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppSenderNumber_integrationChannelId_phoneNumber_key" ON "WhatsAppSenderNumber"("integrationChannelId", "phoneNumber");

-- AddForeignKey
ALTER TABLE "WhatsAppBotChannelState" ADD CONSTRAINT "WhatsAppBotChannelState_integrationChannelId_fkey" FOREIGN KEY ("integrationChannelId") REFERENCES "IntegrationChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppSenderNumber" ADD CONSTRAINT "WhatsAppSenderNumber_integrationChannelId_fkey" FOREIGN KEY ("integrationChannelId") REFERENCES "IntegrationChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
