UPDATE "session"
SET
  "ipAddress" = '127.0.0.1',
  "locationLabel" = 'Localhost / private network'
WHERE "ipAddress" IN (
  '::',
  '0:0:0:0:0:0:0:0',
  '0000:0000:0000:0000:0000:0000:0000:0000'
);

UPDATE "session"
SET "locationLabel" = 'Localhost / private network'
WHERE
  "locationLabel" IS NULL
  AND (
    "ipAddress" = '127.0.0.1'
    OR "ipAddress" = '::1'
    OR "ipAddress" LIKE '10.%'
    OR "ipAddress" LIKE '192.168.%'
  );
