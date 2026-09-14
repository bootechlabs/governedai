import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApiRequest, ApiAuthError } from "@/lib/api-auth";
import { serializeAiSystem } from "@/lib/ai-systems";

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
