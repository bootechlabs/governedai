# GovernedAI — MVP Scope

Companion to `solo-founder-execution-plan.md`. This doc merges two things that drifted apart: what's actually been built in Claude Code CLI (`~/Projects/work/governedai`), and the v0.1 scope/competitive-positioning doc from the Cowork planning session (`claude/mvp-scope.md` in the claude.ai Project) — see "Reconciliation note" below for how the two were merged.

## Status — 2026-09-15

Live at app.governedai.co (Vercel), real org (Bootech) provisioned.

**Shipped — all six build-sequence slices below, plus platform-admin tooling beyond the original v0.1 scope:**
- **Auth**: Stytch B2B magic-link sign-in, multi-org-aware, plus per-org SSO (SAML/OIDC) at `/systems/sso`. Not yet tested against a real IdP.
- **Multi-tenancy**: real. `Organization` owns `User`/`AiSystem`/`Vendor`/`ApiKey`; every query/mutation is org-scoped server-side.
- **RBAC**: ADMIN/REVIEWER/CONTRIBUTOR, enforced in UI and server actions.
- **Inventory + dashboard**: `/systems` is a real dashboard (counts by deployment/risk tier, vendor BAA attention, pending workflow reviews, recent activity); the list itself lives at `/systems/inventory`.
- **Workflow**: fixed 2-stage (Intake → Risk Review), decisions + rationale, audit-logged.
- **Intake questionnaire + risk classification** (slice 2): use-case-specific templates (ambient scribe, CDS, prior auth/UM, RCM/billing, patient chatbot) + a generic fallback, each a shared core question set plus 2 template-specific questions. Produces a risk tier and flags likely-triggered regulations (NIST AI RMF, EU AI Act, ISO 42001, NYC LL144, CO SB21-169) via `/systems/[id]/risk-assessment`.
- **Vendor registry + evidence-type tagging** (slice 4): admin-managed `Vendor` entity (BAA status, subprocessors, SOC 2/model card links) at `/systems/vendors`, auto-linked to a system when its vendor name matches exactly — additive, not a breaking change to the existing free-text field. Evidence now carries a `category` (BAA, SOC 2 report, model card, bias audit report, etc.).
- **Full governance report** (slice 5): `/systems/[id]/audit?format=pdf` is a real report — system record, risk classification, per-regulation compliance checklists (checked against real attached evidence, not fabricated findings), workflow history, evidence list, audit trail, GovernedAI-branded. CSV export stays a flat audit-log dump — different tool for a different job.
- **Bulk import**: `/systems/import`, CSV or Excel.
- **Public API**: `/api/v1/ai-systems` (list/get/create/update, plus archive-not-delete), per-org API keys at `/systems/api-keys`. `PUT` is a full-replace update that triggers change-event/recertification logic same as the UI; `DELETE` archives (preserves history) rather than hard-deleting — no permanent-delete endpoint exists.
- **Platform-admin layer** (beyond original v0.1 scope): `User.isPlatformAdmin` gates `/platform` — a global dashboard across every org/vertical, and an impersonation flow (view-as any org's user, time-boxed to 1 hour, email + audit-logged, banner + one-click stop). Built because supporting multiple real customers with zero cross-org visibility wasn't viable.
- **Icons + legend**: nav, page headings, and section headings are icon-led; `/systems/legend` explains every one, generated from the same config objects the badges use so it can't drift.
- **UI/UX pass 1**: consistent status-color vocabulary, an action-summary callout on system detail, distinct-weighted review/approval buttons with a server-enforced rationale requirement, dashboard hierarchy + filtered inventory links, self-service profile pictures.
- **UI/UX pass 2**: sortable inventory columns (URL-driven, composes with existing filters), labeled/grouped edit-system form, "Question N of M" on the risk questionnaire, a vendor-list Docs column (SOC 2/model-card/subprocessor presence at a glance). The card-based template picker item from the original review was already built. Inventory grouping and system-detail tabs were scoped out — tabs specifically because it's the first client-side layout-state pattern in the app and deserves its own slice.
- **Change events + recertification** (slice 6): a `ChangeEvent` per governance-relevant field edit (vendor, classification, deployment status, business unit); recertification need is computed (not a stored flag) from whether a change is newer than the last stage decision, and re-opens the decision form on already-decided stages without resetting their status.
- **Root error boundary**: every thrown Server Action error (all deliberately user-facing in this codebase) now renders as a real message instead of a blank crash screen.
- **Portfolio-level report export**: `/systems/portfolio-report?format=csv|pdf` — CSV is one row per active system (risk tier, triggered regulations, missing-evidence count); PDF is an aggregate summary (risk-tier breakdown) plus a compact block per system, entry points on `/systems/inventory`.

**Not yet built:**
- Resend domain verification (impersonation email currently no-ops).

**Deliberately deferred:**
- Stytch Live environment cutover (still on Test) — decision 2026-09-15: stay on Test until the product is more complete rather than cut over now. Functionally identical (real emails, real sessions), so this is a later infra task, not a blocker.

## Reconciliation note

The Cowork planning session's v0.1 doc (2026-09-14) listed SSO and multi-tenancy as explicitly out of scope for v0.1 ("not needed while it's just Tony operating it directly... add before any GA/enterprise push") and CSV import as a deferred fast-follow. By the time that doc was written, all three had already been built, deployed, and live-verified in the Claude Code CLI session — the two planning surfaces (Cowork for strategy, Code CLI for implementation, per the tooling-split decision in `solo-founder-execution-plan.md`) had drifted out of sync.

Decision: keep SSO and multi-tenancy — they're working, cost nothing to maintain, and de-risk the eventual multi-org/design-partner future even though the v0.1 doc's "solo founder, no design partners yet" framing didn't anticipate needing them this early. The v0.1 doc's actual differentiated bet — vendor-AI-first, healthcare-specific, law-aware reporting, operable without a GRC team — was adopted as the forward direction, and as of this update, fully built (slices 1–5). Its non-goals around runtime enforcement/observability, bias-testing engines, and framework-breadth-chasing (the EasyAudit/Fiddler/Zenity/Darktrace lanes) stand as written.

## Design approach

Solo founder + Claude, no design partners feeding requirements yet. Design decisions come from judgment plus the regulatory frameworks already in scope (NIST AI RMF, EU AI Act, ISO/IEC 42001, NYC Local Law 144, Colorado SB21-169). The fastest way to pressure-test the workflow is to run GovernedAI's own or Bootech's actual AI usage through the tool, not to wait on an external reviewer's process to copy. Outreach/design partners, if pursued, are for GTM/sales validation later, not a build gate now.

## Competitive positioning

Per the 2026-09-14 competitive analysis (`competitive-landscape-2026-09.md`) against Fiddler AI, EasyAudit, Credo AI, Zenity, Darktrace, and OneTrust: three of six (Fiddler, Zenity, Darktrace) compete on runtime AI/agent security and observability — capital-intensive, already owned by well-funded players (Zenity alone just closed a $125M Series C). The two closest in shape to this product (Credo AI, OneTrust) share two real weaknesses this scope is built to exploit:

- Neither governs deployed third-party/vendor AI well — Credo AI explicitly "cannot audit deployed third-party AI systems," which is most of what healthcare actually runs.
- Both require enterprise budgets plus a dedicated GRC team to operate (OneTrust setup reportedly takes weeks).

EasyAudit competes on generic compliance-framework breadth, not AI-specific governance, with no healthcare framing. The gap: vendor-AI-first, healthcare-specific, operable by a compliance team of one with no GRC background. The vendor registry, evidence-category tagging, and law-specific compliance checklists (slices 4–5) are the direct build-out of that gap.

## Non-goals (explicitly deferred)

- Deep runtime policy enforcement across model providers (blocking unsafe prompts, live PHI-leak prevention) — Fiddler/Zenity/Darktrace's lane, not this one.
- Full observability on every prompt/response.
- Proprietary fairness/bias testing engine.
- Model serving infrastructure.
- Broad red-teaming suite.
- Chasing framework-checklist breadth for its own sake (SOC 2 + ISO 27001 + ISO 9001 + CMMC-style, à la EasyAudit) — depth on fewer, healthcare-relevant frameworks instead.
- A legal content engine implying it replaces counsel — every regulation checklist/trigger in the app is explicitly framed as advisory, not a legal determination.
- Deep third-party integrations (Jira, Google Workspace/M365, EHR systems) — fast-follows once real usage shows which one matters.
- Self-serve signup, billing, plan tiers — org creation stays admin/seed-provisioned for now.
- Configurable/custom workflow builder — stage shape is fixed, content (names/criteria) is data.
- Email/Slack/notification integrations — the one exception is the impersonation-notice email, a support/security control, not a product notification system.
- Mobile app — responsive web only.

## Core entities (as built)

- **Organization** — id (= Stytch `organization_id`), name, vertical (nullable, platform-admin-set).
- **User** — id (= Stytch `member_id`), organization_id, name, email, role (ADMIN/REVIEWER/CONTRIBUTOR), is_platform_admin.
- **AiSystem** — id, organization_id, name, owner, business_unit, description, vendor_name (free text) + vendor_id (nullable link to Vendor), classification, deployment_status, archived_at.
- **Vendor** — id, organization_id, name, baa_status, subprocessors, soc2_report_url, model_card_url, notes.
- **RiskClassification** — id, ai_system_id (unique — current only, not versioned), use_case_template, answers (JSON), risk_tier, triggered_regulations, completed_by, completed_at.
- **WorkflowStage** — id, ai_system_id, sequence, stage_name, status, owner_user_id, decision_rationale, decided_at. Fixed shape: Intake → Risk Review.
- **EvidenceItem** — id, ai_system_id, type (file/link), category (BAA/SOC2/model card/bias audit/etc.), file_url/link_url, label, uploaded_by, uploaded_at.
- **AuditLogEntry** — id, ai_system_id, actor_id, action, detail (JSON), occurred_at.
- **ApiKey** — id, organization_id, name, key_prefix, key_hash, created_by_id, last_used_at, revoked_at.
- **ImpersonationSession** — id, platform_admin_id, target_user_id, started_at, expires_at, ended_at.
- **ChangeEvent** — id, ai_system_id, field, before_value, after_value, occurred_at, actor_id.

## Core user flow (as built)

1. Add a system — manual form, bulk import, or the API.
2. Run the intake questionnaire (`/systems/[id]/risk-assessment`) — use-case template or generic fallback → risk tier + triggered regulations.
3. Route through workflow — pending review → approve/request changes/reject with a comment.
4. Attach evidence, tagged by category, at any point.
5. Export a report — CSV (flat audit log) or PDF (full governance report: record + risk classification + per-regulation compliance checklist + workflow history + evidence + audit trail).

Every state change in 1–4 writes an audit log entry, which is what makes 5 possible without manual reconstruction.

## Screens (as built)

Dashboard (`/systems`), inventory (`/systems/inventory`), system detail (record + risk classification + workflow + evidence + audit trail, one page), add/edit system form, intake questionnaire, review/approval action (on system detail), report export (CSV/PDF, system-level and portfolio-level), vendor registry + detail, users/SSO/API-keys admin pages, icon legend, platform global dashboard + per-org support view.

## Stack (as built)

- **Next.js (App Router) + TypeScript** — single deployable, frontend+API together.
- **Postgres + Prisma** — Neon in production, local Docker Postgres for dev; migrations tracked in repo.
- **Auth**: Stytch B2B — magic link + per-org SSO (SAML/OIDC), multi-org identity. Production currently runs on Stytch's **Test environment** project (not Live) — functionally identical, real emails sent, but a near-term tradeoff to revisit before scaling past the first org.
- **File storage**: Cloudflare R2 (S3-compatible) for evidence uploads, local-disk fallback for dev.
- **Email**: Resend, added solely for the impersonation-started notice (not auth — Stytch remains the only auth-email channel). Needs a Resend account + verified sending domain to actually deliver; the code no-ops gracefully without it.
- **Hosting**: Vercel, auto-deploys `main`.
- **PDF export**: server-side (pdfkit), branded, with per-regulation compliance sections computed from real evidence data.
- **Testing**: Vitest for units (regulation checklist logic, risk scoring, bulk-import parsing, vendor matching, etc.), Playwright for the auth-gate smoke test.

## Fast-follow candidates (after initial traction)

- Lightweight shadow-AI self-report intake — not technical agent/SaaS discovery (Zenity/Darktrace's lane), but a department-by-department survey feeding the AiSystem entity (bulk CSV/Excel import for this already exists).
- One real third-party integration, prioritized by whatever blocks the first few real users — likely a vendor-list/GRC-tool export before Jira or an EHR system.

## Definition of done for MVP

- 1–5 users can log in, register real AI systems, run at least one through a use-case-specific (or generic) intake questionnaire producing a risk classification, move it through the workflow with a recorded decision, attach at least one real piece of tagged evidence, and export a report — including a law-specific compliance checklist where triggered — credible enough to hand to an actual auditor. **Met.**
- Deployed somewhere reachable without a local dev setup. **Met.**
- No data loss / no manual DB surgery needed to keep it running. **Met.**

## Open questions

- When to move Stytch from Test to Live environment — before the first real (non-Bootech) org is provisioned, at the latest.
- Per-org SSO hasn't been tested against a real IdP yet.
- Resend account/domain verification not yet set up — impersonation emails currently no-op.
- Whether risk classification should gate workflow stage requirements (e.g., a higher-risk system needing an extra review stage) — not decided yet.
