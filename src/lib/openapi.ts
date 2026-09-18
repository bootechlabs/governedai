import { CLASSIFICATIONS, DEPLOYMENT_STATUSES } from "@/lib/ai-system-fields";

// OpenAPI 3.1 description of the public API (src/app/api/v1). Lives in
// code, not a hand-maintained JSON file, so that src/lib/openapi.test.ts
// can fail the build when a route or a field is added without updating
// it — response fields are checked against serializeAiSystem, request
// fields against parseAiSystemFieldInput, and the operations against the
// route files' exported handlers. Enum values are imported, not retyped.
export function buildOpenApiSpec(serverUrl: string) {
  const errorResponse = (description: string, example: string) => ({
    description,
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/Error" },
        example: { error: example },
      },
    },
  });

  return {
    openapi: "3.1.0",
    info: {
      title: "GovernedAI API",
      version: "1.0.0",
      description: [
        "Register and manage AI systems in your organization's inventory.",
        "",
        "Every request needs an `Authorization: Bearer <key>` header, using a key created on the **API keys** page (admins only). A key is scoped to one organization — you only ever see or change systems within it.",
        "",
        "**Heads up:** the \"Test request\" console sends real requests with the key you enter. `POST`, `PUT`, and `DELETE` change real data — `DELETE` archives the system. Keys entered here are not saved by the browser.",
      ].join("\n"),
    },
    servers: [{ url: serverUrl }],
    security: [{ bearerAuth: [] }],
    tags: [{ name: "AI systems" }],
    paths: {
      "/api/v1/ai-systems": {
        get: {
          tags: ["AI systems"],
          operationId: "listAiSystems",
          summary: "List AI systems",
          description:
            "Returns active systems by default, newest first, up to 500. Pass `archived=1` to list archived systems instead. There is no pagination.",
          parameters: [
            {
              name: "archived",
              in: "query",
              required: false,
              description: "Set to `1` to return archived systems instead of active ones.",
              schema: { type: "string", enum: ["1"] },
            },
          ],
          responses: {
            "200": {
              description: "The organization's systems.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["data"],
                    properties: {
                      data: { type: "array", items: { $ref: "#/components/schemas/AiSystem" } },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "500": { $ref: "#/components/responses/InternalError" },
          },
        },
        post: {
          tags: ["AI systems"],
          operationId: "createAiSystem",
          summary: "Register an AI system",
          description:
            "Only `name` is required. Same defaults as the UI: the system gets the standard Intake → Risk Review workflow stages, and creation is attributed to the API key's creator in the audit log.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AiSystemInput" },
                example: {
                  name: "Claims Triage Assistant",
                  description: "Ambient scribe for claims review",
                  businessUnit: "Claims Ops",
                  vendorName: "Acme AI Inc",
                  classification: "CONFIDENTIAL",
                  deploymentStatus: "PILOT",
                  statesDeployed: ["AL", "GA"],
                  isAgentic: false,
                },
              },
            },
          },
          responses: {
            "201": {
              description: "The created system.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/AiSystemResponse" },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "500": { $ref: "#/components/responses/InternalError" },
          },
        },
      },
      "/api/v1/ai-systems/{id}": {
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "The AI system's id.",
            schema: { type: "string" },
          },
        ],
        get: {
          tags: ["AI systems"],
          operationId: "getAiSystem",
          summary: "Get one AI system",
          description: "Works for archived systems too.",
          responses: {
            "200": {
              description: "The system.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/AiSystemResponse" },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
            "500": { $ref: "#/components/responses/InternalError" },
          },
        },
        put: {
          tags: ["AI systems"],
          operationId: "updateAiSystem",
          summary: "Update an AI system",
          description:
            "**Full replace**, not a partial update: same fields and defaults as registering a system, so any optional field you omit — including `statesDeployed` and `isAgentic` — resets to its default. A change to `vendorName`, `classification`, `deploymentStatus`, `businessUnit`, `statesDeployed`, or `isAgentic` is logged and can trigger recertification, same as editing it in the UI.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AiSystemInput" },
              },
            },
          },
          responses: {
            "200": {
              description: "The updated system.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/AiSystemResponse" },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
            "409": errorResponse(
              "The system is archived. Unarchive it in the UI before updating it.",
              "This AI system is archived — unarchive it before making changes.",
            ),
            "500": { $ref: "#/components/responses/InternalError" },
          },
        },
        delete: {
          tags: ["AI systems"],
          operationId: "archiveAiSystem",
          summary: "Archive an AI system",
          description:
            "Archives the system; it is not removed. Workflow, evidence, and audit history stay intact and reviewable, same as archiving from the UI. There is no endpoint for a permanent delete.",
          responses: {
            "200": {
              description: "The archived system (`archivedAt` is now set).",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/AiSystemResponse" },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
            "500": { $ref: "#/components/responses/InternalError" },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "An API key created on the API keys page, e.g. `gai_...`.",
        },
      },
      schemas: {
        AiSystem: {
          type: "object",
          required: [
            "id",
            "name",
            "description",
            "businessUnit",
            "vendorName",
            "classification",
            "deploymentStatus",
            "statesDeployed",
            "isAgentic",
            "createdAt",
            "updatedAt",
            "archivedAt",
          ],
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            description: { type: ["string", "null"] },
            businessUnit: { type: ["string", "null"] },
            vendorName: {
              type: ["string", "null"],
              description:
                "Free text. A registered vendor with the same name (case-insensitive) is linked automatically.",
            },
            classification: { type: "string", enum: [...CLASSIFICATIONS] },
            deploymentStatus: { type: "string", enum: [...DEPLOYMENT_STATUSES] },
            statesDeployed: {
              type: "array",
              items: { type: "string" },
              description: "2-letter US state codes where the system is deployed/used.",
            },
            isAgentic: {
              type: "boolean",
              description: "Whether the system takes autonomous multi-step actions.",
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            archivedAt: { type: ["string", "null"], format: "date-time" },
          },
        },
        AiSystemResponse: {
          type: "object",
          required: ["data"],
          properties: { data: { $ref: "#/components/schemas/AiSystem" } },
        },
        AiSystemInput: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            businessUnit: { type: "string" },
            vendorName: { type: "string" },
            classification: {
              type: "string",
              enum: [...CLASSIFICATIONS],
              default: "INTERNAL",
              description: "Case-insensitive.",
            },
            deploymentStatus: {
              type: "string",
              enum: [...DEPLOYMENT_STATUSES],
              default: "PLANNED",
              description: "Case-insensitive.",
            },
            statesDeployed: {
              type: "array",
              items: { type: "string" },
              description:
                "2-letter US state codes, e.g. `[\"AL\", \"GA\"]` (a comma-separated string is also accepted). Drives which state-specific regulations show as triggered. Defaults to none.",
            },
            isAgentic: {
              type: "boolean",
              default: false,
              description:
                "Set for systems that take autonomous multi-step actions; it adds the agentic-governance questions to the risk assessment.",
            },
          },
        },
        Error: {
          type: "object",
          required: ["error"],
          properties: { error: { type: "string" } },
        },
      },
      responses: {
        BadRequest: errorResponse(
          "Validation error, e.g. a missing name, an invalid classification, or a body that isn't a JSON object.",
          "Name is required",
        ),
        Unauthorized: errorResponse(
          "Missing, malformed, invalid, or revoked API key.",
          "Invalid or revoked API key",
        ),
        NotFound: errorResponse(
          "No such system, or it belongs to another organization.",
          "AI system not found",
        ),
        InternalError: errorResponse("Unexpected server error.", "Internal error"),
      },
    },
  };
}
