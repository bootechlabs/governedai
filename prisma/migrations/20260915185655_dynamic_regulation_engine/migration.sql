-- CreateTable
CREATE TABLE "RegulationDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "citation" TEXT,
    "summary" TEXT,
    "sourceUrl" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "triggerConfig" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RegulationDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegulationArtifactDefinition" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidenceCategory" "EvidenceCategory" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "regulationId" TEXT NOT NULL,

    CONSTRAINT "RegulationArtifactDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskClassificationRegulation" (
    "id" TEXT NOT NULL,
    "riskClassificationId" TEXT NOT NULL,
    "regulationId" TEXT NOT NULL,

    CONSTRAINT "RiskClassificationRegulation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RegulationDefinition_code_key" ON "RegulationDefinition"("code");

-- CreateIndex
CREATE INDEX "RegulationArtifactDefinition_regulationId_idx" ON "RegulationArtifactDefinition"("regulationId");

-- CreateIndex
CREATE INDEX "RiskClassificationRegulation_riskClassificationId_idx" ON "RiskClassificationRegulation"("riskClassificationId");

-- CreateIndex
CREATE UNIQUE INDEX "RiskClassificationRegulation_riskClassificationId_regulatio_key" ON "RiskClassificationRegulation"("riskClassificationId", "regulationId");

-- AddForeignKey
ALTER TABLE "RegulationArtifactDefinition" ADD CONSTRAINT "RegulationArtifactDefinition_regulationId_fkey" FOREIGN KEY ("regulationId") REFERENCES "RegulationDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskClassificationRegulation" ADD CONSTRAINT "RiskClassificationRegulation_riskClassificationId_fkey" FOREIGN KEY ("riskClassificationId") REFERENCES "RiskClassification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskClassificationRegulation" ADD CONSTRAINT "RiskClassificationRegulation_regulationId_fkey" FOREIGN KEY ("regulationId") REFERENCES "RegulationDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
