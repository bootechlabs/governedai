-- CreateEnum
CREATE TYPE "RegulatoryUpdateKind" AS ENUM ('ENACTED', 'EFFECTIVE_DATE_CHANGE', 'GUIDANCE', 'ENFORCEMENT', 'PROPOSED', 'ACCREDITATION', 'OTHER');

-- CreateEnum
CREATE TYPE "RegulatoryReviewOutcome" AS ENUM ('NO_ACTION_NEEDED', 'REASSESSMENT_FLAGGED');

-- CreateTable
CREATE TABLE "RegulatoryUpdate" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "whyItMatters" TEXT,
    "kind" "RegulatoryUpdateKind" NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "effectiveDate" TIMESTAMP(3),
    "useCaseTemplates" "UseCaseTemplate"[],
    "vertical" TEXT,
    "actionRequired" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "revisedAt" TIMESTAMP(3),
    "revisionNote" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegulatoryUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegulatoryUpdateRegulation" (
    "id" TEXT NOT NULL,
    "updateId" TEXT NOT NULL,
    "regulationId" TEXT NOT NULL,

    CONSTRAINT "RegulatoryUpdateRegulation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegulatoryUpdateReview" (
    "id" TEXT NOT NULL,
    "outcome" "RegulatoryReviewOutcome" NOT NULL,
    "note" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedById" TEXT NOT NULL,
    "updateId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "RegulatoryUpdateReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RegulatoryUpdate_slug_key" ON "RegulatoryUpdate"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "RegulatoryUpdateRegulation_updateId_regulationId_key" ON "RegulatoryUpdateRegulation"("updateId", "regulationId");

-- CreateIndex
CREATE INDEX "RegulatoryUpdateReview_organizationId_idx" ON "RegulatoryUpdateReview"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "RegulatoryUpdateReview_updateId_organizationId_key" ON "RegulatoryUpdateReview"("updateId", "organizationId");

-- AddForeignKey
ALTER TABLE "RegulatoryUpdateRegulation" ADD CONSTRAINT "RegulatoryUpdateRegulation_updateId_fkey" FOREIGN KEY ("updateId") REFERENCES "RegulatoryUpdate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegulatoryUpdateRegulation" ADD CONSTRAINT "RegulatoryUpdateRegulation_regulationId_fkey" FOREIGN KEY ("regulationId") REFERENCES "RegulationDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegulatoryUpdateReview" ADD CONSTRAINT "RegulatoryUpdateReview_updateId_fkey" FOREIGN KEY ("updateId") REFERENCES "RegulatoryUpdate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegulatoryUpdateReview" ADD CONSTRAINT "RegulatoryUpdateReview_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
