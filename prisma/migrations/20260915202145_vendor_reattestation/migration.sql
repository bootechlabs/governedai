-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "attestationCadenceDays" INTEGER NOT NULL DEFAULT 365,
ADD COLUMN     "lastAttestedAt" TIMESTAMP(3),
ADD COLUMN     "lastReattestationNoticeAt" TIMESTAMP(3);
