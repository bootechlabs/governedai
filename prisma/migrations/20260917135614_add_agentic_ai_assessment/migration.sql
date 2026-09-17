-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EvidenceCategory" ADD VALUE 'OVERRIDE_REVOCATION_PROCEDURE';
ALTER TYPE "EvidenceCategory" ADD VALUE 'ACCESS_LIFECYCLE_POLICY';

-- AlterTable
ALTER TABLE "AiSystem" ADD COLUMN     "isAgentic" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "RiskClassification" ADD COLUMN     "agenticRiskTier" "RiskTier";
