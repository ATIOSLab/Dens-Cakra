UPDATE "session" SET "lastSeenAt" = NULL;

ALTER TABLE "session"
ALTER COLUMN "lastSeenAt" TYPE TIMESTAMPTZ(3)
USING "lastSeenAt" AT TIME ZONE 'UTC';
