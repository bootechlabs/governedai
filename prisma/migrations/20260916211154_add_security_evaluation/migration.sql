-- AlterEnum
ALTER TYPE "EvidenceCategory" ADD VALUE 'SECURITY_EVALUATION';

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "securityEvalUrl" TEXT;
