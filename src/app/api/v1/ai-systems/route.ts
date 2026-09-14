import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApiRequest, ApiAuthError } from "@/lib/api-auth";
import { parseAiSystemFieldInput } from "@/lib/ai-system-fields";
import { createAiSystemRecord, serializeAiSystem } from "@/lib/ai-systems";

export async function GET(request: NextRequest) {
  try {
    const apiKey = await authenticateApiRequest(request);
    const archived = request.nextUrl.searchParams.get("archived") === "1";

    const systems = await prisma.aiSystem.findMany({
      where: {
        organizationId: apiKey.organizationId,
        archivedAt: archived ? { not: null } : null,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    return NextResponse.json({ data: systems.map(serializeAiSystem) });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/v1/ai-systems failed", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = await authenticateApiRequest(request);

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

    const system = await createAiSystemRecord({
      organizationId: apiKey.organizationId,
      ownerId: apiKey.createdById,
      actorId: apiKey.createdById,
      fields,
      auditDetail: { ...fields, source: "api", apiKeyId: apiKey.id, apiKeyName: apiKey.name },
    });

    return NextResponse.json({ data: serializeAiSystem(system) }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/v1/ai-systems failed", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
