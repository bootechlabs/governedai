# GovernedAI — MVP Scope

Companion to `solo-founder-execution-plan.md`. This doc merges two things that drifted apart: what's actually been built in Claude Code CLI (`~/Projects/work/governedai`), and the v0.1 scope/competitive-positioning doc from the Cowork planning session (`claude/mvp-scope.md` in the claude.ai Project) — see "Reconciliation note" below for how the two were merged.

## Status — 2026-09-14

Live at app.governedai.co (Vercel), real org (Bootech) provisioned.

**Shipped:**
- **Auth**: Stytch B2B magic-link sign-in, multi-org-aware.
- **Multi-tenancy**: real. `Organization` owns `User`/`AiSystem`; every query/mutation is org-scoped server-side.
- **Per-org SSO (SAML/OIDC)**: admins configure a connection per org at `/systems/sso`; sign-in page has a "Continue with SSO" path. Not yet tested against a real IdP.
- **Admin-provisioned users with RBAC**: ADMIN / REVIEWER / CONTRIBUTOR, enforced in UI and server actions.
- **Inventory, fixed 2-stage workflow (Intake → Risk Review), evidence, audit export**: built and live-verified end-to-end.
- **Bulk import**: `/systems/import`, CSV or Excel, live-verified.
- **Public API**: `/api/v1/ai-systems` (list/get/create), per-org API keys at `/systems/api-keys`. No update/delete endpoints yet.

**Not yet built** (the v0.1 vision below — see "Suggested build sequence"):
- Vendor as a first-class entity (BAA status, subprocessor list, vendor SOC 2/model card as structured fields) — currently just a text field on AiSystem.
- Use-case-specific intake questionnaires (ambient scribe, CDS, prior auth/UM, RCM/billing AI, patient-facing chatbot) + a generic fallback ported from the governedai.co assessment.
- Risk classification derived from the questionnaire, including which specific regulations a system likely triggers.
- Law-specific report export sections (e.g., NYC LL144 bias-audit/candidate-notice, CO SB21-169 impact-assessment/consumer-notice).
- Change Event detection + recertification trigger.

## Reconciliation note

The Cowork planning session's v0.1 doc (2026-09-14) listed SSO and multi-tenancy as explicitly out of scope for v0.1 ("not needed while it's just Tony operating it directly... add before any GA/enterprise push") and CSV import as a deferred fast-follow. By the time that doc was written, all three had already been built, deployed, and live-verified in the Claude Code CLI session — the two planning surfaces (Cowork for strategy, Code CLI for implementation, per the tooling-split decision in `solo-founder-execution-plan.md`) had drifted out of sync.

Decision: keep SSO and multi-tenancy — they're working, cost nothing to maintain, and de-risk the eventual multi-org/design-partner future even though the v0.1 doc's "solo founder, no design partners yet" framing didn't anticipate needing them this early. The v0.1 doc's actual differentiated bet — vendor-AI-first, healthcare-specific, law-aware reporting, operable without a GRC team — is adopted as the forward direction for everything not yet built. Its non-goals around runtime enforcement/observability, bias-testing engines, and framework-breadth-chasing (the EasyAudit/Fiddler/Zenity/Darktrace lanes) stand as written.

## Design approach

Solo founder + Claude, no design partners feeding requirements yet. Design decisions come from judgment plus the regulatory frameworks already in scope (NIST AI RMF, EU AI Act, ISO/IEC 42001, NYC Local Law 144, Colorado SB21-169). The fastest way to pressure-test the workflow is to run GovernedAI's own or Bootech's actual AI usage through the tool, not to wait on an external reviewer's process to copy. Outreach/design partners, if pursued, are for GTM/sales validation later, not a build gate now.

## Competitive positioning

Per the 2026-09-14 competitive analysis (`competitive-landscape-2026-09.md`) against Fiddler AI, EasyAudit, Credo AI, Zenity, Darktrace, and OneTrust: three of six (Fiddler, Zenity, Darktrace) compete on runtime AI/agent security and observability — capital-intensive, already owned by well-funded players (Zenity alone just closed a $125M Series C). The two closest in shape to this product (Credo AI, OneTrust) share two real weaknesses this scope is built to exploit:

- Neither governs deployed third-party/vendor AI well — Credo AI explicitly "cannot audit deployed third-party AI systems," which is most of what healthcare actually runs.
- Both require enterprise budgets plus a dedicated GRC team to operate (OneTrust setup reportedly takes weeks).

EasyAudit competes on generic compliance-framework breadth, not AI-specific governance, with no healthcare framing. The gap: vendor-AI-first, healthcare-specific, operable by a compliance team of one with no GRC background.

## Non-goals (explicitly deferred)

- Deep runtime policy enforcement across model providers (blocking unsafe prompts, live PHI-leak prevention) — Fiddler/Zenity/Darktrace's lane, not this one.
- Full observability on every prompt/response.
- Proprietary fairness/bias testing engine.
- Model serving infrastructure.
- Broad red-teaming suite.
- Chasing framework-checklist breadth for its own sake (SOC 2 + ISO 27001 + ISO 9001 + CMMC-style, à la EasyAudit) — depth on fewer, healthcare-relevant frameworks instead.
- A legal content engine implying it replaces counsel.
- Deep third-party integrations (Jira, Google Workspace/M365, EHR systems) — fast-follows once real usage shows which one matters.
- Self-serve signup, billing, plan tiers — org creation stays admin/seed-provisioned for now.
- Configurable/custom workflow builder — stage shape is fixed, content (names/criteria) is data.
- Email/Slack/notification integrations.
- Mobile app — responsive web only.

## Core entities

**Built:**
- **Organization** — id (= Stytch `organization_id`), name, created_at.
- **User** — id (= Stytch `member_id`), organization_id, name, email, role (ADMIN/REVIEWER/CONTRIBUTOR).
- **AiSystem** — id, organization_id, name, owner, business_unit, description, vendor_name (plain text — see below), classification, deployment_status, archived_at.
- **WorkflowStage** — id, ai_system_id, sequence, stage_name, status, owner_user_id, decision_rationale, decided_at. Fixed shape: Intake → Risk Review.
- **EvidenceItem** — id, ai_system_id, type (file/link), file_url/link_url, label, uploaded_by, uploaded_at. No evidence-type tag yet (see below).
- **AuditLogEntry** — id, ai_system_id, actor_id, action, detail (JSON), occurred_at.
- **ApiKey** — id, organization_id, name, key_prefix, key_hash, created_by_id, last_used_at, revoked_at.

**Not yet built, per the v0.1 vision:**
- **Vendor** — linked to systems where external. First-class, not an edge case, since most healthcare AI is vendor SaaS. Captures BAA-on-file status, subprocessor list, and the vendor's own security/model documentation (SOC 2 report, model card) as structured fields, not a free-text link.
- **Risk Classification** — per system, produced by the intake questionnaire: business criticality, data sensitivity, decision-support vs. automation, human oversight level, regulatory implications, vendor dependency.
- **Change Event** — logged when a system's key fields change (model, vendor, use case, data sources) — triggers re-review.
- Evidence-type tagging — so an artifact maps to a specific checklist item ("BAA," "bias audit report," "vendor SOC 2") instead of sitting as an undifferentiated attachment.

## Core user flow (target — partially built)

1. Add a system — manual form, or bulk import (✅ built), or the API (✅ built).
2. Run intake questionnaire (❌ not built) — a small library of pre-scoped question sets for common healthcare AI use cases (ambient clinical scribe, clinical decision support, prior auth/utilization management, RCM/billing AI, patient-facing chatbot), plus a generic fallback ported from the governedai.co assessment's question bank/scoring logic. Produces a risk classification including which regulations the system likely triggers.
3. Route through workflow (✅ built, generic — not yet questionnaire-driven) — pending review → approve/request changes/reject with a comment.
4. Attach evidence (✅ built; evidence-type tagging ❌ not built) — file or link, at any point.
5. Export report (✅ built, generic; law-specific sections ❌ not built) — inventory record + risk classification + approval history + evidence list. Where a risk classification triggered a specific law, the export should include that law's specific artifact (e.g., an NYC LL144-style bias-audit/candidate-notice section, or a CO SB21-169-style impact-assessment/consumer-notice section) rather than only a generic summary. Likely the single highest-value output — direct answer to "you don't have an AI model problem, you have an AI proof problem."

Every state change in 1–4 already writes an audit log entry, which is what makes 5 possible without manual reconstruction.

## Screens

**Built:** portfolio list, system detail (record + workflow history + evidence + audit trail), add/edit system form, review/approval action (on system detail, no separate queue), report export (CSV/PDF, system-level).

**Not yet built:** intake questionnaire (multi-step, use-case template picker), law-specific export sections, portfolio-level export.

Resist adding a dashboard/analytics view, notifications, or role management beyond owner/reviewer/admin until actual use surfaces the need.

## Stack (as built)

- **Next.js (App Router) + TypeScript** — single deployable, frontend+API together.
- **Postgres + Prisma** — Neon in production, local Docker Postgres for dev; migrations tracked in repo.
- **Auth**: Stytch B2B — magic link + per-org SSO (SAML/OIDC), multi-org identity. Production currently runs on Stytch's **Test environment** project (not Live) — functionally identical, real emails sent, but a near-term tradeoff to revisit before scaling past the first org.
- **File storage**: Cloudflare R2 (S3-compatible) for evidence uploads, local-disk fallback for dev.
- **Hosting**: Vercel, auto-deploys `main`.
- **PDF export**: server-side (pdfkit) off a report template. Not yet restructured for swappable law-specific partials.
- **Testing**: Vitest for units, Playwright for the auth-gate smoke test.

## Suggested build sequence (from here)

Each slice a usable increment; 1 is done, 3–4 partially done under the generic model:

1. ~~Auth + system CRUD + portfolio list~~ — done.
2. **Intake questionnaire + risk classification** — port logic from the governedai.co assessment; include the use-case template picker and regulatory-trigger tagging from the start, since export (slice 5) depends on it. *Recommended next slice.*
3. Workflow states + review/approval + audit log — done generically; may need adjustment once risk classification exists (e.g., stage requirements varying by risk tier).
4. Evidence upload/attach with evidence-type tagging + vendor-specific fields (BAA, subprocessor list, vendor SOC 2/model card) — partially done (upload works), tagging and vendor entity don't exist yet.
5. Report export with law-specific sections for any triggered regulation — CSV/PDF export exists generically, law-specific partials don't.
6. Change-event detection + recertification trigger — only once 1–5 are solid.

## Fast-follow candidates (after initial traction)

- Lightweight shadow-AI self-report intake — not technical agent/SaaS discovery (Zenity/Darktrace's lane), but a department-by-department survey feeding the AiSystem entity, plus a one-time list import if a prospect already has a vendor/SaaS list (bulk CSV/Excel import for this already exists).
- One real third-party integration, prioritized by whatever blocks the first few real users — likely a vendor-list/GRC-tool export before Jira or an EHR system.

## Definition of done for MVP

- 1–5 users can log in, register real AI systems, run at least one through a use-case-specific (or generic) intake questionnaire producing a risk classification, move it through the workflow with a recorded decision, attach at least one real piece of tagged evidence, and export a report — including a law-specific section where triggered — credible enough to hand to an actual auditor.
- Deployed somewhere reachable without a local dev setup.
- No data loss / no manual DB surgery needed to keep it running.

## Open questions

- When to move Stytch from Test to Live environment — before the first real (non-Bootech) org is provisioned, at the latest.
- Per-org SSO hasn't been tested against a real IdP yet.
- Exact question sets for each use-case template (ambient scribe, CDS, prior auth/UM, RCM/billing, patient chatbot) — need drafting against NIST AI RMF / EU AI Act / ISO 42001 / NYC LL144 / CO SB21-169, informed by the governedai.co assessment's existing question bank.
- Exact law-specific export section content/format for NYC LL144 and CO SB21-169 — needs real regulatory-citation-level drafting, not just a placeholder heading.
- Whether risk classification should gate workflow stage requirements (e.g., a higher-risk system needing an extra review stage) — not decided yet.
