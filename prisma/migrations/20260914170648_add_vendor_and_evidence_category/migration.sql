-- CreateEnum
CREATE TYPE "BaaStatus" AS ENUM ('NOT_APPLICABLE', 'REQUIRED_NOT_ON_FILE', 'ON_FILE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "EvidenceCategory" AS ENUM ('GENERAL', 'BAA', 'SOC2_REPORT', 'MODEL_CARD', 'BIAS_AUDIT_REPORT', 'TEST_RESULT', 'APPROVAL_RECORD', 'POLICY_DOCUMENT', 'SUBPROCESSOR_LIST', 'OTHER');

-- AlterTable
ALTER TABLE "AiSystem" ADD COLUMN     "vendorId" TEXT;

-- AlterTable
ALTER TABLE "EvidenceItem" ADD COLUMN     "category" "EvidenceCategory" NOT NULL DEFAULT 'GENERAL';

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baaStatus" "BaaStatus" NOT NULL DEFAULT 'REQUIRED_NOT_ON_FILE',
    "subprocessors" TEXT[],
    "soc2ReportUrl" TEXT,
    "modelCardUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Vendor_organizationId_idx" ON "Vendor"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_organizationId_name_key" ON "Vendor"("organizationId", "name");

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiSystem" ADD CONSTRAINT "AiSystem_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
