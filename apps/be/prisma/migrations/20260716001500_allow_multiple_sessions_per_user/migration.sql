DROP INDEX IF EXISTS "session_userId_key";
CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session"("userId");
