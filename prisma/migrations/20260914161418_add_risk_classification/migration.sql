-- CreateEnum
CREATE TYPE "UseCaseTemplate" AS ENUM ('AMBIENT_SCRIBE', 'CLINICAL_DECISION_SUPPORT', 'PRIOR_AUTH_UM', 'RCM_BILLING', 'PATIENT_CHATBOT', 'GENERIC');

-- CreateEnum
CREATE TYPE "RiskTier" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "Regulation" AS ENUM ('NIST_AI_RMF', 'EU_AI_ACT', 'ISO_42001', 'NYC_LL144', 'CO_SB21_169');

-- CreateTable
CREATE TABLE "RiskClassification" (
    "id" TEXT NOT NULL,
    "useCaseTemplate" "UseCaseTemplate" NOT NULL,
    "answers" JSONB NOT NULL,
    "riskTier" "RiskTier" NOT NULL,
    "triggeredRegulations" "Regulation"[],
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aiSystemId" TEXT NOT NULL,
    "completedById" TEXT NOT NULL,

    CONSTRAINT "RiskClassification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RiskClassification_aiSystemId_key" ON "RiskClassification"("aiSystemId");

-- AddForeignKey
ALTER TABLE "RiskClassification" ADD CONSTRAINT "RiskClassification_aiSystemId_fkey" FOREIGN KEY ("aiSystemId") REFERENCES "AiSystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskClassification" ADD CONSTRAINT "RiskClassification_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
