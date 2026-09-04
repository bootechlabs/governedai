-- Soft-archive: retiring/removing a system from the active inventory
-- must not lose its workflow/evidence/audit history, so this is a
-- nullable timestamp, not a delete.
ALTER TABLE "AiSystem" ADD COLUMN "archivedAt" TIMESTAMP(3);
