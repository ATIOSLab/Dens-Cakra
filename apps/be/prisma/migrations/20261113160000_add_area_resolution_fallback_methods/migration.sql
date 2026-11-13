-- Fallback area resolution methods for WhatsApp reports submitted without a
-- live location. The reporting area is then derived from the jaring coverage
-- or the field officer operational scope instead of polygon matching.
ALTER TYPE "AreaResolutionMethod" ADD VALUE IF NOT EXISTS 'JARING_COVERAGE';
ALTER TYPE "AreaResolutionMethod" ADD VALUE IF NOT EXISTS 'FIELD_OFFICER_SCOPE';
