ALTER TABLE "session"
ADD COLUMN IF NOT EXISTS "locationLabel" VARCHAR(255);

-- Keep the newest session for each account before enforcing one session per user.
WITH ranked_sessions AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "userId"
      ORDER BY "createdAt" DESC, "id" DESC
    ) AS row_number
  FROM "session"
)
DELETE FROM "session"
WHERE "id" IN (
  SELECT "id"
  FROM ranked_sessions
  WHERE row_number > 1
);

DROP INDEX IF EXISTS "session_userId_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "session_userId_key" ON "session"("userId");
