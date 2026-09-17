-- AlterTable
ALTER TABLE "AuditLogEntry" ADD COLUMN     "hash" TEXT,
ADD COLUMN     "previousHash" TEXT;

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "agentAuditLogExportSupported" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "agentKillSwitchSupported" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "agentPermissionScopingDocumented" BOOLEAN NOT NULL DEFAULT false;
