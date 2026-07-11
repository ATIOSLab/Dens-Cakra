-- CreateEnum
CREATE TYPE "WhatsappRole" AS ENUM ('AGENT', 'JARING');

-- CreateTable
CREATE TABLE "whatsapp_allowed_users" (
    "id" SERIAL NOT NULL,
    "whatsappId" TEXT NOT NULL,
    "name" TEXT,
    "role" "WhatsappRole" NOT NULL DEFAULT 'JARING',
    "authPin" TEXT NOT NULL,
    "agentUsername" TEXT,
    "agentPassword" TEXT,
    "agentPasswordPlain" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agentId" INTEGER,

    CONSTRAINT "whatsapp_allowed_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_reports" (
    "id" SERIAL NOT NULL,
    "whatsappId" TEXT NOT NULL,
    "pushName" TEXT,
    "content" TEXT NOT NULL,
    "photoUrl" TEXT,
    "locationLatitude" DOUBLE PRECISION,
    "locationLongitude" DOUBLE PRECISION,
    "locationLivePeriod" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "informationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "baketId" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_allowed_users_whatsappId_key" ON "whatsapp_allowed_users"("whatsappId");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_allowed_users_agentUsername_key" ON "whatsapp_allowed_users"("agentUsername");

-- AddForeignKey
ALTER TABLE "whatsapp_allowed_users" ADD CONSTRAINT "whatsapp_allowed_users_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "whatsapp_allowed_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
