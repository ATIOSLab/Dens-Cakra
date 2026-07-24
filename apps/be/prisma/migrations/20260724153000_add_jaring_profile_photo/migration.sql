ALTER TABLE "Jaring"
  ADD COLUMN "profilePhotoFileId" UUID;

CREATE INDEX "Jaring_profilePhotoFileId_idx" ON "Jaring"("profilePhotoFileId");

ALTER TABLE "Jaring"
  ADD CONSTRAINT "Jaring_profilePhotoFileId_fkey"
  FOREIGN KEY ("profilePhotoFileId") REFERENCES "FileAsset"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
