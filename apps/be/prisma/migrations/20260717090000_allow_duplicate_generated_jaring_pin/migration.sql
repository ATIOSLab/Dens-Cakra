-- PIN Jaring dibuat otomatis dan tidak menjadi identitas unik.
DROP INDEX IF EXISTS "Jaring_code_key";

CREATE INDEX "Jaring_code_idx" ON "Jaring"("code");
