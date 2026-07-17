ALTER TABLE "session"
ADD COLUMN "lastSeenAt" TIMESTAMP(3);

CREATE INDEX "session_lastSeenAt_idx" ON "session"("lastSeenAt");
