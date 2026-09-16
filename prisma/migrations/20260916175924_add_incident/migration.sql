-- CreateEnum
CREATE TYPE "IncidentCategory" AS ENUM ('INCORRECT_DENIAL', 'HALLUCINATED_OUTPUT', 'BIAS_FINDING', 'PRIVACY_BREACH', 'SECURITY_INCIDENT', 'OTHER');

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "category" "IncidentCategory" NOT NULL,
    "severity" "RiskTier" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disclosedToPatient" BOOLEAN NOT NULL DEFAULT false,
    "disclosedAt" TIMESTAMP(3),
    "remediation" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "aiSystemId" TEXT NOT NULL,
    "reportedById" TEXT NOT NULL,
    "resolvedById" TEXT,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Incident_aiSystemId_idx" ON "Incident"("aiSystemId");

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_aiSystemId_fkey" FOREIGN KEY ("aiSystemId") REFERENCES "AiSystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
