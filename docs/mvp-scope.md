# GovernedAI — MVP Scope

Companion to `solo-founder-execution-plan.md`. This doc merges two things that drifted apart: what's actually been built in Claude Code CLI (`~/Projects/work/governedai`), and the v0.1 scope/competitive-positioning doc from the Cowork planning session (`claude/mvp-scope.md` in the claude.ai Project) — see "Reconciliation note" below for how the two were merged.

## Status — 2026-09-15

Live at app.governedai.co (Vercel), real org (Bootech) provisioned.

**Shipped — all six build-sequence slices below, plus platform-admin tooling beyond the original v0.1 scope:**
- **Auth**: Stytch B2B magic-link sign-in, multi-org-aware, plus per-org SSO (SAML/OIDC) at `/systems/sso`. Not yet tested against a real IdP.
- **Multi-tenancy**: real. `Organization` owns `User`/`AiSystem`/`Vendor`/`ApiKey`; every query/mutation is org-scoped server-side.
- **RBAC**: ADMIN/REVIEWER/CONTRIBUTOR, enforced in UI and server actions.
- **Inventory + dashboard**: `/systems` is a real dashboard (counts by deployment/risk tier, vendor BAA attention, pending workflow reviews, recent activity capped to the last 5) with a risk-tier donut and a hand-rolled bar chart of on-track status (derived per system from its workflow stages — not a stored field); the list itself lives at `/systems/inventory`.
- **Workflow**: fixed 2-stage (Intake → Risk Review), decisions + rationale, audit-logged.
- **Intake questionnaire + risk classification** (slice 2): use-case-specific templates (ambient scribe, CDS, prior auth/UM, RCM/billing, patient chatbot) + a generic fallback, each a shared core question set plus 2 template-specific questions. Produces a risk tier and flags likely-triggered regulations (NIST AI RMF, EU AI Act, ISO 42001, NYC LL144, CO SB21-169) via `/systems/[id]/risk-assessment`.
- **Vendor registry + evidence-type tagging** (slice 4): admin-managed `Vendor` entity (BAA status, subprocessors, SOC 2/model card links) at `/systems/vendors`, auto-linked to a system when its vendor name matches exactly — additive, not a breaking change to the existing free-text field. Evidence now carries a `category` (BAA, SOC 2 report, model card, bias audit report, etc.).
- **Full governance report** (slice 5): `/systems/[id]/audit?format=pdf` is a real report — system record, risk classification, per-regulation compliance checklists (checked against real attached evidence, not fabricated findings), workflow history, evidence list, audit trail, GovernedAI-branded. CSV export stays a flat audit-log dump — different tool for a different job.
- **Bulk import**: `/systems/import`, CSV or Excel.
- **Public API**: `/api/v1/ai-systems` (list/get/create/update, plus archive-not-delete), per-org API keys at `/systems/api-keys`. `PUT` is a full-replace update that triggers change-event/recertification logic same as the UI; `DELETE` archives (preserves history) rather than hard-deleting — no permanent-delete endpoint exists.
- **Platform-admin layer** (beyond original v0.1 scope): `User.isPlatformAdmin` gates `/platform` — a global dashboard across every org/vertical, and an impersonation flow (view-as any org's user, time-boxed to 1 hour, email + audit-logged, banner + one-click stop). Built because supporting multiple real customers with zero cross-org visibility wasn't viable.
- **Icons + legend**: nav, page headings, and section headings are icon-led; `/systems/legend` explains every one, generated from the same config objects the badges use so it can't drift.
- **UI/UX pass 1**: consistent status-color vocabulary, an action-summary callout on system detail, distinct-weighted review/approval buttons with a server-enforced rationale requirement, dashboard hierarchy + filtered inventory links, self-service profile pictures.
- **UI/UX pass 2**: sortable inventory columns (URL-driven, composes with existing filters), labeled/grouped edit-system form, "Question N of M" on the risk questionnaire, a vendor-list Docs column (SOC 2/model-card/subprocessor presence at a glance). The card-based template picker item from the original review was already built. Inventory grouping was scoped out as low-value at current record counts.
- **System-detail tabs**: Risk classification / Workflow / Evidence / Audit log are now tabs (`?tab=risk|workflow|evidence|audit`), URL-driven and server-rendered — no client component, works without JS, each tab is a real link. The identity block (title, status, needs-attention callout, vendor summary, edit-details) stays above the tabs. "Needs attention" items now link straight to the tab that resolves them.
- **Change events + recertification** (slice 6): a `ChangeEvent` per governance-relevant field edit (vendor, classification, deployment status, business unit); recertification need is computed (not a stored flag) from whether a change is newer than the last stage decision, and re-opens the decision form on already-decided stages without resetting their status.
- **Root error boundary**: every thrown Server Action error (all deliberately user-facing in this codebase) now renders as a real message instead of a blank crash screen.
- **Portfolio-level report export**: `/systems/portfolio-report?format=csv|pdf` — CSV is one row per active system (risk tier, triggered regulations, missing-evidence count); PDF is an aggregate summary (risk-tier breakdown) plus a compact block per system, entry points on `/systems/inventory`.
- **Slice 7 — dynamic regulation engine + payer/UM state-law tracking**: regulations moved from a fixed enum to `RegulationDefinition` database rows with a declarative trigger rule (tier threshold, question-answer threshold, or state-deployment match) — a new regulation is a seed insert, not a migration + deploy. All 5 original regulations were migrated into this model (verified byte-for-byte identical trigger/report behavior against real prod data before anything new was added). On top of it: the 7 states' 2026 AI health-insurance laws (Alabama SB 63, Colorado HB 1139, Georgia SB 444, Illinois SB 3114, Iowa HF 2635, Utah SB 319, Washington SB 5395), a new `AiSystem.statesDeployed` field (edit-form-only, checkbox list driven by whichever states have a seeded law), and a human-review-before-finalization intake question on the prior-auth/UM and RCM/billing templates.
- **Slice 9 — auditor-facing read-only share link**: `ShareLink` (token hashed like an API key, expires_at, revoked_at) backs an unauthenticated `/share/[token]` landing page plus a PDF download, both view-logged via `ShareLinkView` (not `AuditLogEntry`, which requires an authenticated actor). "Share with auditor" lives on system detail's Audit tab, ADMIN-only.
- **Slice 8 — independently-authored secondary risk lens**: `RiskClassification.lifeSafetyTier`/`techDataTier` (reusing `RiskTier`), scored by 6 freshly-written questions independent of the main risk tier. Explicitly not CHAI-branded or CHAI-aligned — built from scratch after CHAI's own tool turned out to be CC BY-NC-ND licensed.
- **Slice 10 — vendor re-attestation reminder**: `Vendor.lastAttestedAt` (null = never tracked) + `attestationCadenceDays` fold into the dashboard's existing vendor "needs attention" count. A daily Vercel Cron job (`vercel.json`, the app's first scheduled job, protected by `CRON_SECRET` since a cron invocation has no user session) emails the org's admins once per overdue cycle. One-click "Mark re-attested today" on the vendor edit page.
- **Slice 11 — risk-domain accountability mapping**: a static risk-domain taxonomy (privacy, bias/discrimination, unsafe overreliance, cybersecurity, misinformation) with a suggested accountable function per domain and a per-use-case-template mapping of which domains apply, surfaced on system detail's Risk tab and in the PDF report. Pure config, no schema change.
- **Slice 12 — incident reporting**: a narrow `Incident` model (category, severity, description, remediation, patient-disclosure flag/date) distinct from `AuditLogEntry` — a new "Incidents" tab on system detail, folded into both the system-level and portfolio PDF/CSV reports. Open/resolved derived from `resolvedAt`, same idiom as `WorkflowStage.decidedAt`/`ShareLink.revokedAt`.

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
- Email/Slack/notification integrations — the exceptions are the impersonation-notice email and (once slice 10 ships) an internal vendor-reattestation-due reminder, both support/operational controls, not a product notification system.
- Mobile app — responsive web only.

## Core entities (as built)

- **Organization** — id (= Stytch `organization_id`), name, vertical (nullable, platform-admin-set).
- **User** — id (= Stytch `member_id`), organization_id, name, email, role (ADMIN/REVIEWER/CONTRIBUTOR), is_platform_admin.
- **AiSystem** — id, organization_id, name, owner, business_unit, description, vendor_name (free text) + vendor_id (nullable link to Vendor), classification, deployment_status, states_deployed (string array, drives state-law regulation triggers), archived_at.
- **Vendor** — id, organization_id, name, baa_status, subprocessors, soc2_report_url, model_card_url, notes, last_attested_at, attestation_cadence_days, last_reattestation_notice_at.
- **RiskClassification** — id, ai_system_id (unique — current only, not versioned), use_case_template, answers (JSON), risk_tier, life_safety_tier, tech_data_tier, completed_by, completed_at. `triggered_regulations` (the old enum array) is deprecated/unused — see `RiskClassificationRegulation`.
- **RegulationDefinition** — id, code (stable slug, e.g. `NIST_AI_RMF`, `AL_SB63`), label, citation, summary, source_url, effective_date, trigger_config (JSON: tier-threshold / question-answer-threshold / state-deployment match), active, sort_order. A regulation is a database row, not a fixed enum — a new one (state law or otherwise) is a seed insert, not a migration + deploy.
- **RegulationArtifactDefinition** — id, regulation_id, label, description, evidence_category, sort_order. The compliance-checklist items shown once a regulation is triggered.
- **RiskClassificationRegulation** — id, risk_classification_id, regulation_id. Join row for "this assessment triggered this regulation," replacing the old enum array.
- **WorkflowStage** — id, ai_system_id, sequence, stage_name, status, owner_user_id, decision_rationale, decided_at. Fixed shape: Intake → Risk Review.
- **EvidenceItem** — id, ai_system_id, type (file/link), category (BAA/SOC2/model card/bias audit/etc.), file_url/link_url, label, uploaded_by, uploaded_at.
- **AuditLogEntry** — id, ai_system_id, actor_id, action, detail (JSON), occurred_at.
- **ApiKey** — id, organization_id, name, key_prefix, key_hash, created_by_id, last_used_at, revoked_at.
- **ImpersonationSession** — id, platform_admin_id, target_user_id, started_at, expires_at, ended_at.
- **ChangeEvent** — id, ai_system_id, field, before_value, after_value, occurred_at, actor_id.
- **ShareLink** — id, ai_system_id, created_by_id, token_hash, token_prefix, expires_at, revoked_at, created_at.
- **ShareLinkView** — id, share_link_id, viewed_at, viewer_ip. Anonymous view log, separate from `AuditLogEntry` since that requires an authenticated actor.
- **Incident** — id, ai_system_id, category, severity (reuses `RiskTier`), occurred_at, description, reported_by_id, disclosed_to_patient, disclosed_at, remediation, resolved_at, resolved_by_id. An adverse AI event, distinct from `AuditLogEntry`'s routine state-change log; open/resolved derived from `resolved_at`.

## Core user flow (as built)

1. Add a system — manual form, bulk import, or the API.
2. Run the intake questionnaire (`/systems/[id]/risk-assessment`) — use-case template or generic fallback → risk tier + triggered regulations.
3. Route through workflow — pending review → approve/request changes/reject with a comment.
4. Attach evidence, tagged by category, at any point.
5. Export a report — CSV (flat audit log) or PDF (full governance report: record + risk classification + per-regulation compliance checklist + workflow history + evidence + audit trail).

Every state change in 1–4 writes an audit log entry, which is what makes 5 possible without manual reconstruction.

## Screens (as built)

Dashboard (`/systems`), inventory (`/systems/inventory`), system detail (record always visible, risk classification/workflow/evidence/audit trail as tabs), add/edit system form, intake questionnaire, review/approval action (on system detail), report export (CSV/PDF, system-level and portfolio-level), auditor share links (create/revoke on system detail, unauthenticated `/share/[token]` landing page + PDF), vendor registry + detail, users/SSO/API-keys admin pages, icon legend, platform global dashboard + per-org support view.

## Stack (as built)

- **Next.js (App Router) + TypeScript** — single deployable, frontend+API together.
- **Postgres + Prisma** — Neon in production, local Docker Postgres for dev; migrations tracked in repo.
- **Auth**: Stytch B2B — magic link + per-org SSO (SAML/OIDC), multi-org identity. Production currently runs on Stytch's **Test environment** project (not Live) — functionally identical, real emails sent, but a near-term tradeoff to revisit before scaling past the first org.
- **File storage**: Cloudflare R2 (S3-compatible) for evidence uploads, local-disk fallback for dev.
- **Email**: Resend (not auth — Stytch remains the only auth-email channel). Domain verified and `RESEND_API_KEY`/`EMAIL_FROM` set in production as of 2026-09-15 — the no-op fallback still exists for local dev, where those vars aren't set. Two uses: the impersonation-started notice, and the daily vendor-re-attestation-due internal reminder (slice 10).
- **Scheduled jobs**: Vercel Cron (`vercel.json`) — one daily job (`/api/cron/vendor-reattestation`), protected by a shared `CRON_SECRET` since a cron invocation carries no user session.
- **Hosting**: Vercel, auto-deploys `main`.
- **PDF export**: server-side (pdfkit), branded, with per-regulation compliance sections computed from real evidence data.
- **Testing**: Vitest for units (regulation checklist logic, risk scoring, bulk-import parsing, vendor matching, etc.), Playwright for the auth-gate smoke test.

## Fast-follow candidates (after initial traction)

- Lightweight shadow-AI self-report intake — not technical agent/SaaS discovery (Zenity/Darktrace's lane), but a department-by-department survey feeding the AiSystem entity (bulk CSV/Excel import for this already exists).
- One real third-party integration, prioritized by whatever blocks the first few real users — likely a vendor-list/GRC-tool export before Jira or an EHR system.

## Differentiation roadmap — v1.1+ (regulatory/accreditation-driven, added 2026-09-15)

Status as of 2026-09-15: all four slices shipped — 7, 9, and 10 as originally scoped; slice 8 rebuilt independently after CHAI's tool turned out to be non-commercially licensed (see below). All four scoped and shipped in one day.

Three mid-2026 regulatory/accreditation developments sharpen the existing wedge (vendor-AI-first, healthcare-specific, state-law-aware, mid-market-operable) and are concrete enough to scope as build slices, continuing the numbering from the original six. None push into the deferred lanes above (runtime enforcement, framework-breadth-chasing) — they extend the existing risk-classification/evidence/report machinery rather than adding new product categories.

**Slice 7 — Payer/UM human-review compliance tracking.** Shipped (see "Shipped" above) — built as a two-stage dynamic regulation engine rather than a bolt-on `StateHealthAiLaw` table, so the 7 state laws share one mechanism with the original 5 regulations instead of running as a second parallel system.

**Slice 8 — secondary risk lens. Shipped (2026-09-15), independently authored, not CHAI-aligned.** Originally scoped against CHAI's Risk Categorization Tool v3; blocked once its actual license was read (CC BY-NC-ND 4.0 — non-commercial, no derivatives — confirmed to apply across CHAI's other published documents too, not just that one PDF). Decision: build the underlying idea (a secondary risk view split across two domains) from scratch instead. Six freshly-written questions (3 per domain — Life & Patient Safety, Technology & Data), grounded in generic, widely-published risk-analysis concepts (proximity to patient care, harm severity, monitorability, data provenance, security exposure, change-management rigor) rather than any single proprietary framework. `RiskClassification.lifeSafetyTier`/`techDataTier` (reusing the existing `RiskTier` enum), scored independently of the main risk tier via `computeSecondaryRiskTiers`. Rendered as a badge pair + explicit non-affiliation note on system detail's Risk tab and in the PDF report — deliberately not added to the inventory table (already 7 columns).

**Slice 9 — Auditor-facing read-only share link.** Shipped. `ShareLink` (token hashed like an API key, expires_at, revoked_at) backs an unauthenticated `/share/[token]` landing page (summary + a one-click PDF download reusing the existing report renderer unchanged) plus `/share/[token]/pdf`. Anonymous views are tracked via a new `ShareLinkView` table rather than `AuditLogEntry`, since `AuditLogEntry.actorId` is `NOT NULL` and every other write path assumes an authenticated actor. "Share with auditor" lives on system detail's Audit tab (7/30/90-day expiration, one-time-shown URL, one-click revoke), gated ADMIN-only.

**Slice 10 — Vendor re-attestation reminder.** Shipped — the last slice in this roadmap. `Vendor.lastAttestedAt` (null = never tracked, not overdue) + `attestationCadenceDays` (default 365) fold into the existing dashboard "needs attention" count alongside BAA status. A daily Vercel Cron job (the app's first scheduled job) emails the org's admins once per overdue cycle (`lastReattestationNoticeAt` sentinel, cleared on re-attestation) — internal nudge only, vendor-facing outreach stays out of scope. One-click "Mark re-attested today" on the vendor edit page.

**Not yet scoped — needs research first:** Joint Commission "Responsible Use of AI in Healthcare Certification" (launched May 2026, building on Joint Commission/CHAI joint guidance) — potentially the highest-leverage item here since it's an accreditation body rather than a state law, but the certification's actual scoring criteria haven't been pulled yet. Research the real criteria before scoping as a slice.

## Differentiation roadmap — v1.2 (governance-framework gap analysis, added 2026-09-16)

Triggered by an independent gap analysis against two unattributed LinkedIn/marketing graphics (a healthcare-AI risk-domain table citing a real MIT FutureTech Delphi study, and a generic "6 layers of AI governance" framework). Full analysis: `governance-framework-gap-analysis-2026-09-16.md`. Bottom line: both frameworks validate the existing non-goals as written — zero coverage on runtime enforcement/observability ("Defend" layer) is correct, not a gap — but surfaced two real, small additions to the existing risk-classification/incident machinery.

**Slice 11 — Risk-domain accountability mapping ("who must own it").** Shipped (2026-09-16). Today `owner` on `AiSystem` is free text with no structured link to *which kind* of risk a system carries. Adds a fixed, non-persisted `RiskDomain` taxonomy (privacy, bias/discrimination, unsafe overreliance, cybersecurity, misinformation) with a static suggested-accountable-function per domain (e.g., privacy → Operations, bias → Compliance, overreliance → Clinical leadership, cybersecurity → IT security, misinformation → Board oversight), and a static per-use-case-template mapping of which domains typically apply (e.g., patient chatbot → misinformation/privacy/overreliance; RCM/billing → cybersecurity/privacy). Pure derived/config data, no schema migration — surfaced on system detail's Risk tab and in the PDF report, framed as advisory (suggested owner, not an organizational or legal assignment), same posture as the existing regulation-checklist disclaimers.

**Slice 12 — Incident reporting.** Shipped (2026-09-16). No entity today distinct from `AuditLogEntry` for an adverse AI event (wrong denial, hallucinated note, bias finding) — `AuditLogEntry` is a generic system-state-change log, not built for incident fields (severity, remediation, disclosure status). A natural companion to Slice 7's state payer/UM laws, several of which require disclosure of AI-driven adverse determinations: a new `Incident` model (category, severity, description, remediation, disclosed-to-patient flag/date, resolved status) attached to an `AiSystem`, listed on system detail alongside the audit trail and rolled into the PDF report and portfolio report. Real schema change (new model + migration) — bigger lift than Slice 11. Independently reinforced by a follow-on OneTrust-platform deep dive (`onetrust-deep-dive-2026-09-16.md`, see below) — OneTrust's Incident & Breach Response is the general-purpose version of the same gap, and that doc's disclosure-tracking idea (Utah SB 319/Colorado HB 1139-style "was disclosure made, to whom, when") folds into this same `Incident` model via `disclosedToPatient`/`disclosedAt` rather than needing a separate entity.

## Differentiation roadmap — v1.3 (OneTrust full-platform deep dive, added 2026-09-16)

`competitive-landscape-2026-09.md` only compared OneTrust's AI Governance module head-to-head. A follow-on look at OneTrust's other five solution areas (Third-Party Management, Tech Risk & Compliance, Privacy Automation, Data Mapping, Consent & Preferences, ESG) against GovernedAI's actual entity model — full analysis in `onetrust-deep-dive-2026-09-16.md`. Bottom line: mostly confirms existing scope decisions (general third-party risk, IT-compliance-framework breadth, automated data discovery, consent/cookie management, and ESG all point at markets already correctly ruled out) rather than revealing a large missed opportunity. One new concrete addition:

**Slice 13 — AI-use policy + attestation (scoped, needs research before building).** GovernedAI tracks external regulations (`RegulationDefinition`) but has no entity for an organization's *own* internal AI-use policy — which tools staff may use for what, with a clinician/staff attestation log. A lightweight `Policy` entity (document + version + linked systems/use-cases + attestation log) would plug into the existing evidence/audit-trail pattern the same way `Incident` (Slice 12) does. Deliberately not scoped further yet: this is also the natural groundwork for the Joint Commission "Responsible Use of AI in Healthcare Certification" research item already flagged as not-yet-scoped in the v1.1+ roadmap above, and building `Policy`'s shape before that research is done risks guessing wrong about what a certification review actually expects (versioning granularity, attestation cadence, linkage model). Research the Joint Commission criteria first; scope `Policy` alongside that, not before it.

**Explicitly not pursued (reaffirmed, not new):** general third-party risk management beyond AI vendors (bigger, more contested market — ProcessUnity/Prevalent/Vanta/Whistic/OneTrust itself — dilutes the AI-specific wedge; watch for real customer signal rather than build speculatively), regulatory horizon scanning automation (manual curation of state AI-health laws is the right call at this stage), vendor-facing self-service evidence profiles reused across a vendor's multiple GovernedAI customer orgs (a genuinely interesting network-effect idea unique to the vendor-first model and worth taking seriously later, but a real build — auth, vendor-side accounts, cross-org data-sharing consent — not something to scope casually alongside everything else here), Consent & Preferences, ESG, and full IT-compliance-framework breadth (EasyAudit's lane, already a non-goal).

## Differentiation roadmap — v1.4 (Gray Swan AI market-signal deep dive, added 2026-09-16)

Full profile: `gray-swan-deep-dive-2026-09-16.md`, a companion to `competitive-landscape-2026-09.md`. Gray Swan (Shade — pre-deployment adversarial red-teaming; Cygnal — runtime inline defense; $40M Series A, 15,000+ red-teamers, design partnerships with every frontier lab) is functionally a seventh entry in the same runtime-security/red-teaming bucket as Fiddler/Zenity/Darktrace — already correctly excluded by the existing non-goals ("deep runtime policy enforcement," "broad red-teaming suite"). No healthcare-vertical or state-AI-law framing anywhere on their site, so no encroachment on the actual wedge. One real signal, independent of Gray Swan specifically: Shade is explicitly marketed to the GRC/compliance buyer as "third-party adversarial evidence for audits and regulatory frameworks" — meaning "adversarial/red-team test result" is becoming a recognized evidence type in AI governance workflows generally, and GovernedAI's evidence model has no place for it today.

**Slice 14 — Adversarial/red-team security evaluation as a first-class evidence type.** Building next. Three small, additive pieces, all extending existing machinery rather than crossing into the excluded runtime-enforcement/red-teaming-suite lanes:
- New `EvidenceCategory` value (`SECURITY_EVALUATION` or similar) alongside BAA/SOC2/model card/bias audit — lets a system record reference a red-team report (Gray Swan's or anyone else's) as attached evidence.
- A parallel `Vendor.securityEvalUrl` field, mirroring the existing `soc2ReportUrl`/`modelCardUrl` pattern — a vendor's adversarial-testing posture recorded once, reused across every system linked to that vendor rather than re-attached per system.
- A new intake question, gated to use-case templates where the AI takes autonomous action (prior-auth/UM, RCM/billing, patient chatbot — not ambient scribe or CDS, which inform a human rather than act): "Has this AI system undergone third-party adversarial testing for jailbreak/prompt-injection/unsafe-output resistance?" Feeds the existing Technology & Data Safety tier (slice 8's `techDataTier`) as a natural input, not a new taxonomy.

**Logged for later, not a build item now:** a `competitive-landscape-2026-09.md` addendum naming Gray Swan as the best-funded example of the runtime-security bucket, and an outbound-content angle ("if you've already commissioned a red-team report from Gray Swan, Fiddler, or anyone else, GovernedAI is where that evidence gets mapped to what your regulators actually ask for") — complementary framing, similar to the existing Clearwater Security angle. No red-teaming, runtime classification, or agent-behavior monitoring — that would contest a $40M-funded technical moat on its own turf, correctly excluded.

## Definition of done for MVP

- 1–5 users can log in, register real AI systems, run at least one through a use-case-specific (or generic) intake questionnaire producing a risk classification, move it through the workflow with a recorded decision, attach at least one real piece of tagged evidence, and export a report — including a law-specific compliance checklist where triggered — credible enough to hand to an actual auditor. **Met.**
- Deployed somewhere reachable without a local dev setup. **Met.**
- No data loss / no manual DB surgery needed to keep it running. **Met.**

## Open questions

- When to move Stytch from Test to Live environment — deliberately deferred (2026-09-15), before the first real (non-Bootech) org is provisioned, at the latest.
- Per-org SSO hasn't been tested against a real IdP yet.
- Whether risk classification should gate workflow stage requirements (e.g., a higher-risk system needing an extra review stage) — not decided yet.
- Need to pull the Joint Commission AI certification's actual scoring criteria before scoping a certification-readiness feature (see Differentiation roadmap above).
- Whether vendor re-attestation (slice 10) should eventually become vendor-facing (an outreach/portal flow) rather than just an internal reminder — deliberately deferred, not decided against.
