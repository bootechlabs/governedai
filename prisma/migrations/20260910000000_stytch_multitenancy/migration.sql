-- Identity moves to Stytch B2B: drop Auth.js/NextAuth-owned tables
-- entirely (sessions, OAuth accounts, email verification tokens are no
-- longer ours to store).
DROP TABLE "Account";
DROP TABLE "Session";
DROP TABLE "VerificationToken";

-- User's primary key is being repurposed from a generated cuid to a
-- Stytch member_id — not an incremental migration, since existing local
-- rows don't correspond to any real Stytch identity. Drop the FKs
-- pointing at the old User table, then the table itself.
ALTER TABLE "AiSystem" DROP CONSTRAINT "AiSystem_ownerId_fkey";
ALTER TABLE "WorkflowStage" DROP CONSTRAINT "WorkflowStage_ownerId_fkey";
ALTER TABLE "EvidenceItem" DROP CONSTRAINT "EvidenceItem_uploadedById_fkey";
ALTER TABLE "AuditLogEntry" DROP CONSTRAINT "AuditLogEntry_actorId_fkey";

DROP TABLE "User";

-- Mirrors a Stytch B2B Organization — id is Stytch's organization_id.
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- Mirrors a Stytch B2B Member — id is Stytch's member_id. Role stays
-- local-only; Stytch doesn't need our app-specific RBAC.
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CONTRIBUTOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_organizationId_email_key" ON "User"("organizationId", "email");

ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AiSystem gains multi-tenant scoping. Existing local rows can't be
-- backfilled with a real organization (none existed before this
-- migration), so they're removed rather than left invalid — local dev
-- data only; cascades to their WorkflowStage/EvidenceItem/AuditLogEntry
-- rows via the existing onDelete: Cascade relations.
DELETE FROM "AiSystem";

ALTER TABLE "AiSystem" ADD COLUMN "organizationId" TEXT NOT NULL;
CREATE INDEX "AiSystem_organizationId_idx" ON "AiSystem"("organizationId");
ALTER TABLE "AiSystem" ADD CONSTRAINT "AiSystem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Re-add the FKs to the new User table (same columns, new identity system).
ALTER TABLE "AiSystem" ADD CONSTRAINT "AiSystem_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkflowStage" ADD CONSTRAINT "WorkflowStage_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EvidenceItem" ADD CONSTRAINT "EvidenceItem_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLogEntry" ADD CONSTRAINT "AuditLogEntry_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
