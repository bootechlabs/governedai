# GovernedAI — Solo Founder + Claude Execution Plan

Companion to `GovernedAI-chatGPT.docx` and the investor decks. Answers: how does a one-person founder, working with Claude, actually execute the validation and GTM milestones in the draft business plan?

## Core reframe

With one founder + Claude, research, writing, analysis, and even coding can be produced in bulk. The scarce resource is founder calendar time — calls, relationships, and judgment calls. The plan below routes everything else through async, content-driven, or tool-assisted work so founder hours go only where a human is required.

## Phase 0 (week 1): validation instrument, not a pitch deck — BUILT

Live at https://claude.ai/code/artifact/8ff68103-6db7-4320-a2f3-459f73532120 ("Would You Pass an AI Audit?"). A 20-question, 5-dimension self-scoring AI governance maturity assessment (inventory & discovery, risk classification & regulatory mapping, governance workflows, evidence & audit trail, vendor & third-party oversight), scored client-side against a 5-tier maturity band (Exposed → Reactive → Developing → Managed → Audit-Ready), with a radar chart + per-dimension breakdown + tailored recommendations per dimension/band. No email wall — full report shows immediately, to maximize shares on LinkedIn. A "Download my report" button (via the artifact downloads capability) lets any visitor save a text report regardless of write access. A soft lead-capture panel at the bottom (name, work email, company, role, organization type, open-text "biggest headache") sends results straight to t.bishop@live.com via a mailto link, with a copy-to-clipboard fallback if the visitor's device has no configured mail client — chosen deliberately over the artifact's shared-state capability, since public/anonymous visitors are read-only viewers and can't write to shared artifact state (would silently fail or expose other respondents' contact info in the page's readable HTML). The organization-type field doubles as ICP-signal collection (digital health vendor vs. health system vs. payer/RCM vs. other), directly answering one of the draft plan's open validation questions.

Next: share the link from LinkedIn content (see below); when volume or reliability becomes a bottleneck, connect a real form/CRM backend (Jotform, Cognito Forms, SurveyMonkey, or HubSpot — see connector list below) and move lead capture off mailto.

## Phase 0/1 (parallel, ongoing): authority content over cold outreach

Replace the plan's "20–30 live buyer interviews" with a content-driven funnel better suited to one person's bandwidth: 2–3 LinkedIn posts/week drafted by Claude, built around the plan's sharpest insight ("tools are built for engineers, buyers are compliance") plus real findings from the assessment tool as they accumulate. Founder posts under their own name (no auto-posting — voice/trust matters here). Every post links to the assessment. No native LinkedIn/X posting connector found in the registry as of this writing — posting stays manual; content generation and performance analysis (Similarweb, OpenRush) don't.

## Website

Single page: problem framing, the assessment, a booking link. Candidate connectors: Webflow, WordPress.com, B12 website generator, or Claude-built + Netlify-hosted. Hold off on a full marketing site until there's traction to show.

## Targeted outreach (sparing, surgical)

Reserve live outreach for the 5–8 strongest-signal responders from the assessment/content funnel, not a broad interview campaign. Crustdata or Vibe Prospecting connectors can find the right compliance/CISO contact at target accounts; Claude drafts the personalized note; founder sends it.

## Synthesis loop

Every response (assessment answers, survey data, call notes) feeds back to Claude for synthesis against the open questions already flagged in the draft plan: which buyer has real urgency (compliance/security/vendor risk), vendor-first vs. hospital-first, which pain phrasing recurs. Findings feed the next round of content and the assessment's scoring logic.

## MVP

Given coding tools are available in this environment, build a working (even rough) version of the Phase 1 scope — inventory + workflow + evidence core — rather than a mockup, for design partners to actually use.

## Fundraising material — sequenced last

Once real assessment data, design-partner conversations, and response numbers exist, fill in the still-missing investor material identified in the draft plan/decks: market map (2x2), architecture diagram, bottom-up financial model (reps, deals/rep, ACV, ramp), and a "why you" / proof-of-demand section — all buildable by Claude once real inputs exist.

## Connector options surfaced (none installed as of this writing)

- Surveys/forms: SurveyMonkey, Jotform, Cognito Forms
- Website/CMS: Webflow, WordPress.com, B12, Netlify
- Prospecting/enrichment: Crustdata, Vibe Prospecting
- CRM/email: HubSpot, Attio, Mailchimp
- SEO/traffic: OpenRush, Similarweb
- No direct social-media posting connector found — posting remains manual by design (voice/trust).
