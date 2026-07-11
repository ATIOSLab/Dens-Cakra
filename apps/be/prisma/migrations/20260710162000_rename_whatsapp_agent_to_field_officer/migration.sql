-- Rename WhatsApp ownership terminology from Agent to Field Officer.
ALTER TYPE "WhatsappRole" RENAME VALUE 'AGENT' TO 'FIELD_OFFICER';

ALTER TABLE "whatsapp_allowed_users"
  RENAME COLUMN "agentUsername" TO "fieldOfficerUsername";

ALTER TABLE "whatsapp_allowed_users"
  RENAME COLUMN "agentPassword" TO "fieldOfficerPassword";

ALTER TABLE "whatsapp_allowed_users"
  RENAME COLUMN "agentPasswordPlain" TO "fieldOfficerPasswordPlain";

ALTER TABLE "whatsapp_allowed_users"
  RENAME COLUMN "agentId" TO "fieldOfficerId";

ALTER INDEX "whatsapp_allowed_users_agentUsername_key"
  RENAME TO "whatsapp_allowed_users_fieldOfficerUsername_key";

ALTER TABLE "whatsapp_allowed_users"
  RENAME CONSTRAINT "whatsapp_allowed_users_agentId_fkey"
  TO "whatsapp_allowed_users_fieldOfficerId_fkey";
