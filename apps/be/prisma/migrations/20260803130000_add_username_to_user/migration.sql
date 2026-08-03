-- AlterTable
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "displayUsername" TEXT;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "username" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "user_username_key" ON "user"("username");
