import { describe, it, expect, vi } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import type { AiSystem } from "@prisma/client";

// serializeAiSystem lives in a module that imports the Prisma client; this
// test only calls the pure serializer, so keep it off the database.
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

const { buildOpenApiSpec } = await import("./openapi");
const { serializeAiSystem } = await import("./ai-systems");
const { parseAiSystemFieldInput, CLASSIFICATIONS, DEPLOYMENT_STATUSES } = await import(
  "./ai-system-fields"
);

const spec = buildOpenApiSpec("https://example.test");
const schemas = spec.components.schemas;

function fakeSystem(): AiSystem {
  return {
    id: "system_1",
    name: "Test System",
    description: null,
    businessUnit: null,
    vendorName: null,
    classification: "INTERNAL",
    vendorId: null,
    deploymentStatus: "PILOT",
    statesDeployed: [],
    isAgentic: false,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    archivedAt: null,
    organizationId: "org_1",
    ownerId: "user_1",
  };
}

// These exist to fail the build when the API changes and the spec doesn't
// — the exact drift that left isAgentic out of the hand-written docs.
describe("OpenAPI spec stays in sync with the API", () => {
  it("response schema has exactly the fields serializeAiSystem returns", () => {
    expect(Object.keys(schemas.AiSystem.properties).sort()).toEqual(
      Object.keys(serializeAiSystem(fakeSystem())).sort(),
    );
    expect([...schemas.AiSystem.required].sort()).toEqual(
      Object.keys(serializeAiSystem(fakeSystem())).sort(),
    );
  });

  it("request schema has exactly the fields parseAiSystemFieldInput accepts", () => {
    expect(Object.keys(schemas.AiSystemInput.properties).sort()).toEqual(
      Object.keys(parseAiSystemFieldInput({ name: "x" })).sort(),
    );
    expect(schemas.AiSystemInput.required).toEqual(["name"]);
  });

  it("enums come from the same lists the API validates against", () => {
    expect(schemas.AiSystemInput.properties.classification.enum).toEqual(CLASSIFICATIONS);
    expect(schemas.AiSystemInput.properties.deploymentStatus.enum).toEqual(DEPLOYMENT_STATUSES);
    expect(schemas.AiSystem.properties.classification.enum).toEqual(CLASSIFICATIONS);
    expect(schemas.AiSystem.properties.deploymentStatus.enum).toEqual(DEPLOYMENT_STATUSES);
  });

  it("documents exactly the operations the route files export", () => {
    const exportedMethods = (file: string) =>
      [...readFileSync(join(process.cwd(), file), "utf8").matchAll(
        /export async function (GET|POST|PUT|PATCH|DELETE)\b/g,
      )]
        .map((m) => m[1].toLowerCase())
        .sort();
    const documentedMethods = (path: keyof typeof spec.paths) =>
      Object.keys(spec.paths[path])
        .filter((k) => ["get", "post", "put", "patch", "delete"].includes(k))
        .sort();

    expect(documentedMethods("/api/v1/ai-systems")).toEqual(
      exportedMethods("src/app/api/v1/ai-systems/route.ts"),
    );
    expect(documentedMethods("/api/v1/ai-systems/{id}")).toEqual(
      exportedMethods("src/app/api/v1/ai-systems/[id]/route.ts"),
    );
  });

  it("covers every route file under api/v1 (a new route must be documented)", () => {
    const root = join(process.cwd(), "src/app");
    const routePaths = readdirSync(join(root, "api/v1"), { recursive: true })
      .map(String)
      .filter((f) => f === "route.ts" || f.endsWith("/route.ts"))
      .map((f) => `/api/v1/${f.replace(/\/?route\.ts$/, "")}`.replace(/\/$/, ""))
      .map((p) => p.replace(/\[(\w+)\]/g, "{$1}"))
      .sort();

    expect(Object.keys(spec.paths).sort()).toEqual(routePaths);
  });

  it("uses the server URL it is given", () => {
    expect(spec.servers).toEqual([{ url: "https://example.test" }]);
  });
});
