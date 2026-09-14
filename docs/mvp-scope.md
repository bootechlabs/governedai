# GovernedAI — MVP Scope

Companion to `solo-founder-execution-plan.md`. That doc decided *what* to build next ("Phase 1 scope — inventory + workflow + evidence core") and *where* ("Claude Code CLI, this repo, once real MVP coding starts"). This doc defines *what "done" looks like* for that build.

## Status — 2026-09-14

Live at app.governedai.co (Vercel), real design-partner org (Bootech) provisioned. Shipped, beyond original scope:

- **Auth**: Stytch B2B magic-link sign-in (not NextAuth/Auth.js as originally planned — see stack section).
- **Multi-tenancy**: real, not deferred. `Organization` owns `User`/`AiSystem`; every query/mutation is org-scoped server-side. Pulled forward from "later" because Stytch made it close to free once magic-link auth was in place.
- **Admin-provisioned users with RBAC**: ADMIN / REVIEWER / CONTRIBUTOR roles, enforced both in UI and server actions. Live-tested end-to-end for all three roles.
- **Inventory, workflow, evidence, audit export**: all three original pillars built and live-verified (create system → stage decisions → evidence upload to R2 → CSV/PDF audit export).
- **Per-org SSO (SAML/OIDC)**: admins configure a connection per org at `/systems/sso` (create pending → fill in IdP values → active); sign-in page has a "Continue with SSO" path alongside magic link. Not yet tested against a real IdP (Okta/Entra/etc.) — only the create/configure UI is live-verified so far.
- **Bulk import**: `/systems/import` accepts CSV or Excel, live-verified. Per-row validation — bad rows are skipped and reported, not a whole-file failure.
- **Public API**: `/api/v1/ai-systems` (list/get/create), authenticated via per-org, admin-generated API keys (`/systems/api-keys`). Scoped to create+read for this pass — no update/delete endpoints yet.

Not yet built (still open):
- Update/delete via the public API.
- Auto-discovery (still explicitly deferred, see below).
- Stytch project is still **Test environment** in production (a deliberate near-term tradeoff, not an oversight — see stack section).

## Context

Phase 0 shipped a self-scoring assessment (live artifact + governedai.co), scored across 5 dimensions: inventory & discovery, risk classification & regulatory mapping, governance workflows, evidence & audit trail, vendor & third-party oversight. It's a lead-gen instrument, not the product — it tells a visitor how exposed they are but does nothing to fix it.

The MVP is the first slice of the actual product: a tool a design partner can put real AI systems into and get real governance value out, not a mockup.

## Target user for MVP

One design partner org (health system, digital health vendor, or payer/RCM — per the execution plan's still-open ICP question), compliance/security-adjacent buyer, small number of named users (1–5) on their side. Not building for self-serve signup or scale yet — building for a handful of hands-on users we can watch and interview.

## In scope — three pillars

### 1. AI system inventory
- Register an AI system/use case: name, owner, business unit, description, vendor (if third-party) or internal (if built in-house), data sensitivity (PHI/PII/none), deployment status (planned/pilot/production/retired).
- List/search/filter the inventory.
- Each system has a detail page that becomes the anchor for workflow and evidence (below).
- No auto-discovery (crawling SaaS/cloud for shadow AI) in MVP — manual entry only. Auto-discovery is a clear v2 feature, not an MVP one.

### 2. Governance workflow
- A fixed, small set of review stages per AI system (e.g., Intake → Risk Review → Approved / Conditionally Approved / Rejected). Stage names/criteria should be configurable content, not hardcoded copy, but the workflow *shape* (linear stage progression with one owner and one status per stage) is fixed for MVP — no custom workflow builder.
- Assign a reviewer/owner per stage, capture a decision + rationale, timestamp every transition.
- Basic notification is out of scope for MVP (no email/Slack integration) — a shared dashboard view of "what's pending, who owns it" substitutes for push notifications initially.

### 3. Evidence & audit trail
- Attach evidence to an AI system or a workflow stage: file upload (policy doc, vendor DPA, model card, test results) or a link.
- Every state change (system created/edited, stage transitioned, evidence added) writes an immutable audit log entry: who, what, when, before/after where applicable.
- An audit log view per AI system, exportable (CSV or PDF) — this is the artifact a design partner would actually hand an auditor, and the clearest "value delivered" proof point for the design-partner conversation.

## Explicitly out of scope for MVP

- Risk classification & regulatory mapping automation (mapping a system to specific regulations/frameworks) — dimension 2 of the assessment, deferred.
- Vendor & third-party oversight as a distinct module (beyond recording "vendor" as a field on a system) — dimension 5, deferred.
- Auto-discovery/scanning of AI usage.
- Self-serve signup, billing, plan tiers — multi-tenant *data isolation* shipped (see Status), but org creation is still admin/seed-provisioned, not self-serve.
- Configurable/custom workflow builder — stages are fixed for MVP, configurable later.
- Email/Slack/notification integrations.
- Mobile app — responsive web only.

## Core data model (as built)

- **Organization** — id (= Stytch `organization_id`), name, created_at. Owns all Users and AiSystems.
- **User** — id (= Stytch `member_id`), organization_id, name (nullable), email, role (ADMIN/REVIEWER/CONTRIBUTOR), created_at. Identity/session/SSO ownership lives in Stytch; this row mirrors display fields + app-specific RBAC role.
- **AiSystem** — id, organization_id, name, owner, business_unit, description, vendor_name (nullable), classification (data sensitivity), deployment_status, archived_at (nullable), created_at, updated_at
- **WorkflowStage** — id, ai_system_id, sequence, stage_name, status (pending/in_review/approved/conditionally_approved/rejected), owner_user_id, decision_rationale, decided_at
- **EvidenceItem** — id, ai_system_id, type (file/link), file_url or link_url, label, uploaded_by, uploaded_at
- **AuditLogEntry** — id, ai_system_id, actor_id, action, detail (JSON), occurred_at
- **ApiKey** — id, organization_id, name, key_prefix (display-only), key_hash (sha256, never the plaintext), created_by_id, created_at, last_used_at, revoked_at (nullable)

## Key user flows

1. Admin adds a new AI system to the inventory.
2. Admin/reviewer moves it through workflow stages, recording a decision + rationale at each.
3. Contributor or reviewer attaches evidence at any point.
4. Anyone with access opens the audit log for a system and exports it.
5. Dashboard shows inventory count by status + stages currently pending review, across all systems.

## Stack (as built)

- **Next.js (App Router) + TypeScript** — single deployable, frontend+API together.
- **Postgres + Prisma** — Neon in production, local Docker Postgres for dev; migrations tracked in repo.
- **Auth**: originally scoped as NextAuth/Auth.js email magic link, replaced with **Stytch B2B** — same magic-link UX, but adds real multi-org identity (organizations/members/sessions) and a path to per-org SSO without another migration later. Tradeoff taken deliberately: production currently runs on Stytch's **Test environment** project (not Live) — functionally identical, real emails sent, but meant as a near-term start, not a permanent choice; revisit before scaling past the first design partner.
- **File storage**: Cloudflare R2 (S3-compatible) for evidence uploads, local-disk fallback for dev.
- **Hosting**: Vercel, auto-deploys `main`.
- **Testing**: Vitest for units, Playwright for the auth-gate smoke test.

## Definition of done for MVP

- Design partner's 1–5 users can log in, register their real AI systems, move at least one through the full stage sequence with a recorded decision, attach at least one real piece of evidence, and export an audit log that looks credible enough to hand to an actual auditor.
- Deployed somewhere the design partner can reach without a local dev setup.
- No data loss / no manual DB surgery needed to keep it running for the pilot's duration.

## Open questions

- Which design partner, and which ICP (vendor vs. health system vs. payer/RCM) — still unresolved per the execution plan; may shape which fields/workflow stages matter most.
- Exact workflow stage names/criteria — placeholder (Intake → Risk Review → Approved/Conditional/Rejected) until a design partner's real process is known; keep stage *content* easy to relabel even though the shape is fixed.
- When to move Stytch from Test to Live environment — before the first real (non-Bootech) design partner org is provisioned, at the latest.
- Per-org SSO hasn't been tested against a real IdP yet — worth doing before pitching it as a real capability to a design partner.
