# GovernedAI — MVP Scope

Companion to `solo-founder-execution-plan.md`. That doc decided *what* to build next ("Phase 1 scope — inventory + workflow + evidence core") and *where* ("Claude Code CLI, this repo, once real MVP coding starts"). This doc defines *what "done" looks like* for that build.

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
- Multi-tenant self-serve signup, billing, plan tiers.
- Configurable/custom workflow builder — stages are fixed for MVP, configurable later.
- Email/Slack/notification integrations.
- SSO/enterprise auth — simple auth (email+password or magic link) is enough for a single design-partner org.
- Mobile app — responsive web only.

## Core data model (draft)

- **AiSystem** — id, name, owner, business_unit, description, vendor_name (nullable), data_sensitivity, deployment_status, created_at, updated_at
- **WorkflowStage** — id, ai_system_id, stage_name, status (pending/in_review/approved/rejected), owner_user_id, decision_rationale, decided_at
- **EvidenceItem** — id, ai_system_id, workflow_stage_id (nullable), type (file/link), file_url or link_url, uploaded_by, uploaded_at
- **AuditLogEntry** — id, ai_system_id, actor_user_id, action, detail (before/after JSON), occurred_at
- **User** — id, name, email, role (admin/reviewer/contributor)

## Key user flows

1. Admin adds a new AI system to the inventory.
2. Admin/reviewer moves it through workflow stages, recording a decision + rationale at each.
3. Contributor or reviewer attaches evidence at any point.
4. Anyone with access opens the audit log for a system and exports it.
5. Dashboard shows inventory count by status + stages currently pending review, across all systems.

## Proposed stack (open decision — flag before scaffolding)

Solo founder + Claude Code CLI, one design partner, need a fast build/iterate loop over a polished one:
- **Next.js (App Router) + TypeScript** — single deployable, frontend+API together.
- **Postgres + Prisma** — real relational data (systems/stages/evidence/audit all relate), migrations tracked in repo.
- **Auth**: NextAuth/Auth.js with email magic link — no password storage, minimal build.
- **File storage**: local/S3-compatible bucket for evidence uploads (Cloudflare R2 or S3) — flag if a specific provider is already preferred.
- **Hosting**: Vercel (pairs with Next.js, zero-config) or Fly.io if Postgres + file storage should live together — flag for a decision.
- **Testing**: Vitest for units, Playwright for the core flow (create system → move through stages → attach evidence → export audit log) as a smoke test.

This is a proposal, not a decision — confirm before scaffolding, especially hosting/storage provider (execution plan already surfaces Vercel/Netlify/Fly/Cloudflare as considered-not-installed options).

## Definition of done for MVP

- Design partner's 1–5 users can log in, register their real AI systems, move at least one through the full stage sequence with a recorded decision, attach at least one real piece of evidence, and export an audit log that looks credible enough to hand to an actual auditor.
- Deployed somewhere the design partner can reach without a local dev setup.
- No data loss / no manual DB surgery needed to keep it running for the pilot's duration.

## Open questions

- Which design partner, and which ICP (vendor vs. health system vs. payer/RCM) — still unresolved per the execution plan; may shape which fields/workflow stages matter most.
- Storage/hosting provider choice (above).
- Exact workflow stage names/criteria — placeholder (Intake → Risk Review → Approved/Conditional/Rejected) until a design partner's real process is known; keep stage *content* easy to relabel even though the shape is fixed.
