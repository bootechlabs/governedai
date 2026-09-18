import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApiRequest, ApiAuthError } from "@/lib/api-auth";
import { assertSystemEditable, resolveVendorId, serializeAiSystem } from "@/lib/ai-systems";
import { parseAiSystemFieldInput } from "@/lib/ai-system-fields";
import { logAuditEntry } from "@/lib/audit-log";
import { detectChanges, keyChangeValues } from "@/lib/change-events";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const apiKey = await authenticateApiRequest(request);
    const { id } = await params;

    const system = await prisma.aiSystem.findUnique({
      where: { id, organizationId: apiKey.organizationId },
    });
    if (!system) {
      return NextResponse.json({ error: "AI system not found" }, { status: 404 });
    }

    return NextResponse.json({ data: serializeAiSystem(system) });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/v1/ai-systems/[id] failed", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const apiKey = await authenticateApiRequest(request);
    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
    }
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
    }

    let fields;
    try {
      fields = parseAiSystemFieldInput(body as Record<string, unknown>);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid request body";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    let before;
    try {
      before = await assertSystemEditable(id, apiKey.organizationId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI system not found";
      // "Not found" (org mismatch) and Prisma's own not-found both read as
      // 404; an archived system is a real system that exists, just not
      // editable right now, so that gets its own 409 with the real message.
      if (message.includes("is archived")) {
        return NextResponse.json({ error: message }, { status: 409 });
      }
      return NextResponse.json({ error: "AI system not found" }, { status: 404 });
    }

    const vendorId = await resolveVendorId(apiKey.organizationId, fields.vendorName);
    const system = await prisma.aiSystem.update({ where: { id }, data: { ...fields, vendorId } });

    await logAuditEntry({
      aiSystemId: id,
      actorId: apiKey.createdById,
      action: "system_updated",
      detail: {
        before: {
          name: before.name,
          businessUnit: before.businessUnit,
          vendorName: before.vendorName,
          classification: before.classification,
          deploymentStatus: before.deploymentStatus,
          statesDeployed: before.statesDeployed,
          isAgentic: before.isAgentic,
        },
        after: { ...fields },
        source: "api",
        apiKeyId: apiKey.id,
        apiKeyName: apiKey.name,
      },
    });

    const changes = detectChanges(keyChangeValues(before), keyChangeValues(fields));
    if (changes.length > 0) {
      await prisma.changeEvent.createMany({
        data: changes.map((change) => ({
          aiSystemId: id,
          actorId: apiKey.createdById,
          field: change.field,
          beforeValue: change.beforeValue,
          afterValue: change.afterValue,
        })),
      });
    }

    return NextResponse.json({ data: serializeAiSystem(system) });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("PUT /api/v1/ai-systems/[id] failed", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// Archives rather than hard-deletes — keeps workflow/evidence/audit history
// intact, matching archiveAiSystem's (the UI action's) own rationale. A
// public API is a higher-blast-radius surface than the UI (a leaked key,
// a bad integration) to hand irreversible deletion to.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const apiKey = await authenticateApiRequest(request);
    const { id } = await params;

    const system = await prisma.aiSystem.findUnique({
      where: { id, organizationId: apiKey.organizationId },
    });
    if (!system) {
      return NextResponse.json({ error: "AI system not found" }, { status: 404 });
    }

    const updated = await prisma.aiSystem.update({
      where: { id },
      data: { archivedAt: new Date() },
    });

    await logAuditEntry({
      aiSystemId: id,
      actorId: apiKey.createdById,
      action: "system_archived",
      detail: { source: "api", apiKeyId: apiKey.id, apiKeyName: apiKey.name },
    });

    return NextResponse.json({ data: serializeAiSystem(updated) });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("DELETE /api/v1/ai-systems/[id] failed", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
