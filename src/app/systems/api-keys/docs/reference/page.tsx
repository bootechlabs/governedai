import Link from "next/link";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/current-user";
import { buildOpenApiSpec } from "@/lib/openapi";
import { getRequestOrigin } from "@/lib/request-origin";
import { subtleLinkClass } from "@/lib/ui";
import { ReferenceViewer } from "./reference-viewer";

export const dynamic = "force-dynamic";

// Interactive OpenAPI reference. Readable by any signed-in user, same as the
// prose docs page. Layouts and pages render in parallel, so this checks the
// session itself rather than relying on /systems/layout.tsx alone.
export default async function ApiReferencePage() {
  await getCurrentUser();
  const spec = buildOpenApiSpec(getRequestOrigin(await headers()));

  return (
    // Scalar sticks its own sidebar to the top; keep it below the app's sticky
    // 3.5rem top bar (see src/app/systems/layout.tsx).
    <div style={{ "--scalar-custom-header-height": "3.5rem" } as React.CSSProperties}>
      <div className="border-b border-zinc-200 px-6 py-2 text-sm dark:border-zinc-800">
        <Link href="/systems/api-keys/docs" className={subtleLinkClass}>
          ← API docs
        </Link>
      </div>
      <ReferenceViewer spec={spec} />
    </div>
  );
}
