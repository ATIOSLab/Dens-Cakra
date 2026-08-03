-- Align historical local drift with the current Prisma schema.
ALTER TABLE "WhatsAppReportSession" ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'UserSeatAssignment_pkey'
      AND conrelid = '"UserOperationalAssignment"'::regclass
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'UserOperationalAssignment_pkey'
      AND conrelid = '"UserOperationalAssignment"'::regclass
  ) THEN
    ALTER TABLE "UserOperationalAssignment"
      RENAME CONSTRAINT "UserSeatAssignment_pkey" TO "UserOperationalAssignment_pkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PositionAreaScope_pkey'
      AND conrelid = '"UserAreaScope"'::regclass
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'UserAreaScope_pkey'
      AND conrelid = '"UserAreaScope"'::regclass
  ) THEN
    ALTER TABLE "UserAreaScope"
      RENAME CONSTRAINT "PositionAreaScope_pkey" TO "UserAreaScope_pkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PositionAreaScope_areaId_fkey'
      AND conrelid = '"UserAreaScope"'::regclass
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'UserAreaScope_areaId_fkey'
      AND conrelid = '"UserAreaScope"'::regclass
  ) THEN
    ALTER TABLE "UserAreaScope"
      RENAME CONSTRAINT "PositionAreaScope_areaId_fkey" TO "UserAreaScope_areaId_fkey";
  ELSIF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PositionAreaScope_areaId_fkey'
      AND conrelid = '"UserAreaScope"'::regclass
  ) AND EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'UserAreaScope_areaId_fkey'
      AND conrelid = '"UserAreaScope"'::regclass
  ) THEN
    ALTER TABLE "UserAreaScope" DROP CONSTRAINT "PositionAreaScope_areaId_fkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PositionAreaScope_positionAssignmentId_fkey'
      AND conrelid = '"UserAreaScope"'::regclass
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'UserAreaScope_operationalAssignmentId_fkey'
      AND conrelid = '"UserAreaScope"'::regclass
  ) THEN
    ALTER TABLE "UserAreaScope"
      RENAME CONSTRAINT "PositionAreaScope_positionAssignmentId_fkey" TO "UserAreaScope_operationalAssignmentId_fkey";
  ELSIF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'PositionAreaScope_positionAssignmentId_fkey'
      AND conrelid = '"UserAreaScope"'::regclass
  ) AND EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'UserAreaScope_operationalAssignmentId_fkey'
      AND conrelid = '"UserAreaScope"'::regclass
  ) THEN
    ALTER TABLE "UserAreaScope" DROP CONSTRAINT "PositionAreaScope_positionAssignmentId_fkey";
  END IF;
END $$;
