# GovernedAI — Solo Founder + Claude Execution Plan

Companion to `GovernedAI-chatGPT.docx` and the investor decks. Answers: how does a one-person founder, working with Claude, actually execute the validation and GTM milestones in the draft business plan?

## Ownership & branding — CORRECTED

GovernedAI is a **Bootech-owned and Bootech-communicated** project. All public-facing references — the assessment tool, outbound contact, future website/content — point to Bootech, not an individual. Primary contact: **bootech.labs@gmail.com** (replaces the earlier t.bishop@live.com used before this correction). The "founder posts under their own name" tactic further down is a GTM voice choice (personal LinkedIn credibility reads well for a compliance audience), not an ownership statement — revisit if that should be a Bootech-branded account instead.

## Core reframe

With one founder + Claude, research, writing, analysis, and even coding can be produced in bulk. The scarce resource is founder calendar time — calls, relationships, and judgment calls. The plan below routes everything else through async, content-driven, or tool-assisted work so founder hours go only where a human is required.

## Tooling split: Cowork vs. Claude Code CLI — DECIDED (hybrid)

Repo work (github.com/bootechlabs/governedai) surfaced a real constraint: this Cowork session has no GitHub credentials (no connector available in the registry, and a direct API/clone attempt returns a 403 gated behind an "add_repo" mechanism not self-serviceable from chat), and the device bridge to Tony's Mac runs in an isolated VM that also has no git/GitHub auth — pushes have to happen from Tony's own terminal. Claude Code CLI running natively on his Mac wouldn't hit this: it inherits his already-configured git/gh credentials directly, no bridging layer.

Decision: hybrid split, not a full move.
- **Stays in Cowork / this project**: planning docs, GTM/content strategy, research, and anything that benefits from the claude.ai Project (this doc, the business plan) or the Artifact hosting (the live assessment tool). This is where the work has lived so far and it's the better fit for it.
- **Moves to Claude Code CLI** (Tony's terminal, `~/Projects/work/governedai`): once real MVP code-building starts (the inventory + workflow + evidence core scope). A local Claude Code session gets a tight edit → test → commit → push → PR loop with no credential hop.
- **GitHub Actions / the `@claude` bot**: setting up the actual Claude GitHub App integration (so `@claude` mentions in issues/PRs trigger Claude, or a scheduled workflow runs Claude in CI) is a separate one-time step — run `/install-github-app` from a local Claude Code CLI session (needs the `gh` CLI authenticated + admin access to the repo). Independent of which surface handles day-to-day work afterward.

Until MVP coding starts, repo changes made from this session get committed locally via the device bridge and Tony runs `git push` himself, one command, from his own terminal.

## Phase 0 (week 1): validation instrument, not a pitch deck — BUILT

Live at https://claude.ai/code/artifact/8ff68103-6db7-4320-a2f3-459f73532120 ("Would You Pass an AI Audit?"). A 20-question, 5-dimension self-scoring AI governance maturity assessment (inventory & discovery, risk classification & regulatory mapping, governance workflows, evidence & audit trail, vendor & third-party oversight), scored client-side against a 5-tier maturity band (Exposed → Reactive → Developing → Managed → Audit-Ready), with a radar chart + per-dimension breakdown + tailored recommendations per dimension/band. No email wall — full report shows immediately, to maximize shares on LinkedIn. A "Download my report" button (via the artifact downloads capability) lets any visitor save a text report regardless of write access. A soft lead-capture panel at the bottom (name, work email, company, role, organization type, open-text "biggest headache") sends results straight to **bootech.labs@gmail.com** via a mailto link, with a copy-to-clipboard fallback if the visitor's device has no configured mail client — chosen deliberately over the artifact's shared-state capability, since public/anonymous visitors are read-only viewers and can't write to shared artifact state (would silently fail or expose other respondents' contact info in the page's readable HTML). The footer now reads "GovernedAI by Bootech" to make ownership explicit to visitors. The organization-type field doubles as ICP-signal collection (digital health vendor vs. health system vs. payer/RCM vs. other), directly answering one of the draft plan's open validation questions.

Next: share the link from LinkedIn content (see below); when volume or reliability becomes a bottleneck, connect a real form/CRM backend (Jotform, Cognito Forms, SurveyMonkey, or HubSpot — see connector list below) and move lead capture off mailto.

## Phase 0/1 (parallel, ongoing): authority content over cold outreach

Replace the plan's "20–30 live buyer interviews" with a content-driven funnel better suited to one person's bandwidth: 2–3 LinkedIn posts/week drafted by Claude, built around the plan's sharpest insight ("tools are built for engineers, buyers are compliance") plus real findings from the assessment tool as they accumulate. Founder posts under their own name (no auto-posting — voice/trust matters here; revisit whether this should be a Bootech-branded account per the ownership correction above). Every post links to the assessment. No native LinkedIn/X posting connector found in the registry as of this writing — posting stays manual; content generation and performance analysis (Similarweb, OpenRush) don't.

## Website

Single page: problem framing, the assessment, a booking link. Candidate connectors: Webflow, WordPress.com, B12 website generator, or Claude-built + Netlify-hosted. Hold off on a full marketing site until there's traction to show. Contact/ownership on the site should match the Bootech branding above.

## Targeted outreach (sparing, surgical)

Reserve live outreach for the 5–8 strongest-signal responders from the assessment/content funnel, not a broad interview campaign. Crustdata or Vibe Prospecting connectors can find the right compliance/CISO contact at target accounts; Claude drafts the personalized note; founder sends it.

## Synthesis loop

Every response (assessment answers, survey data, call notes) feeds back to Claude for synthesis against the open questions already flagged in the draft plan: which buyer has real urgency (compliance/security/vendor risk), vendor-first vs. hospital-first, which pain phrasing recurs. Findings feed the next round of content and the assessment's scoring logic.

## MVP

Given coding tools are available in this environment, build a working (even rough) version of the Phase 1 scope — inventory + workflow + evidence core — rather than a mockup, for design partners to actually use. Per the tooling-split decision above, the actual build happens via Claude Code CLI in the local repo once this phase starts.

## Fundraising material — sequenced last

Once real assessment data, design-partner conversations, and response numbers exist, fill in the still-missing investor material identified in the draft plan/decks: market map (2x2), architecture diagram, bottom-up financial model (reps, deals/rep, ACV, ramp), and a "why you" / proof-of-demand section — all buildable by Claude once real inputs exist.

## Connector options surfaced (none installed as of this writing)

- Surveys/forms: SurveyMonkey, Jotform, Cognito Forms
- Website/CMS: Webflow, WordPress.com, B12, Netlify
- Prospecting/enrichment: Crustdata, Vibe Prospecting
- CRM/email: HubSpot, Attio, Mailchimp
- SEO/traffic: OpenRush, Similarweb
- No direct social-media posting connector found — posting remains manual by design (voice/trust).
- No GitHub connector found in the registry (checked twice) — repo access from Cowork would need the "add_repo" grant mentioned in a 403 response, which isn't self-serviceable from chat as of this writing.
