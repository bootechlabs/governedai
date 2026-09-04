-- Replace DataSensitivity (NONE/PII/PHI) with DataClassification
-- (PUBLIC/INTERNAL/CONFIDENTIAL/RESTRICTED) on AiSystem.classification.
-- Existing rows are mapped PHI->CONFIDENTIAL, PII->INTERNAL, NONE->INTERNAL
-- (no historical PUBLIC/RESTRICTED signal to infer from).

CREATE TYPE "DataClassification" AS ENUM ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED');

ALTER TABLE "AiSystem" ADD COLUMN "classification" "DataClassification" NOT NULL DEFAULT 'INTERNAL';

UPDATE "AiSystem"
SET "classification" = CASE "dataSensitivity"
  WHEN 'PHI' THEN 'CONFIDENTIAL'
  WHEN 'PII' THEN 'INTERNAL'
  ELSE 'INTERNAL'
END::"DataClassification";

ALTER TABLE "AiSystem" DROP COLUMN "dataSensitivity";

DROP TYPE "DataSensitivity";
