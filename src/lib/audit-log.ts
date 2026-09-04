import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// Every mutation in src/app/systems/actions.ts writes one of these —
// centralized so the shape (and the "insert-only, never edit" contract
// from the schema comment) stays consistent as more actions are added.
export function logAuditEntry(entry: {
  aiSystemId: string;
  actorId: string;
  action: string;
  detail: Prisma.InputJsonValue;
}) {
  return prisma.auditLogEntry.create({ data: entry });
}
