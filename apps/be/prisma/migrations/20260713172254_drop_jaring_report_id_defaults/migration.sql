DO $$
BEGIN
  IF to_regclass('"JaringCluster"') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE "JaringCluster" ALTER COLUMN "id" DROP DEFAULT';
  END IF;

  IF to_regclass('"ReportCategory"') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE "ReportCategory" ALTER COLUMN "id" DROP DEFAULT';
  END IF;
END $$;
