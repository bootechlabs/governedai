import type { UseCaseTemplate, RiskTier } from "@prisma/client";

export interface RiskQuestionOption {
  label: string;
  weight: 0 | 1 | 2 | 3;
}

export interface RiskQuestion {
  key: string;
  text: string;
  options: RiskQuestionOption[];
}

// Shared across every template — these six questions carry almost all of
// the actual regulatory-trigger logic (employment/consequential-decision/
// EU exposure), so centralizing them here means NYC LL144 / CO SB21-169 /
// EU AI Act detection lives in one place instead of five near-duplicates.
export const CORE_QUESTIONS: RiskQuestion[] = [
  {
    key: "dataSensitivity",
    text: "Does this system access, process, or store PHI or other regulated, sensitive personal data?",
    options: [
      { label: "No", weight: 0 },
      { label: "Indirectly, via de-identified or aggregate data", weight: 1 },
      { label: "Yes, but access is limited and logged", weight: 2 },
      { label: "Yes, broad access to identifiable PHI", weight: 3 },
    ],
  },
  {
    key: "humanOversight",
    text: "How much human oversight is there before this system's output affects a person?",
    options: [
      { label: "Advisory only — a human makes the actual decision independently", weight: 0 },
      { label: "A human reviews every output before it's acted on", weight: 1 },
      { label: "A human reviews only exceptions or low-confidence cases", weight: 2 },
      { label: "Fully automated, no human review", weight: 3 },
    ],
  },
  {
    key: "employmentDecision",
    text: "Is this system used in, or does it influence, an employment or hiring decision (screening, ranking, or evaluating candidates or employees)?",
    options: [
      { label: "No", weight: 0 },
      { label: "Indirectly (e.g., a general productivity tool)", weight: 1 },
      { label: "Yes, for a subset of employment decisions", weight: 2 },
      { label: "Yes, it's a core part of an employment decision", weight: 3 },
    ],
  },
  {
    key: "consequentialDecision",
    text: "Does this system make or materially influence a consequential decision about a person — healthcare, benefits eligibility, financial services, housing, or legal outcomes?",
    options: [
      { label: "No", weight: 0 },
      { label: "It provides general information only, not decision-specific", weight: 1 },
      { label: "It influences a decision a human ultimately makes", weight: 2 },
      { label: "It makes or effectively determines the decision", weight: 3 },
    ],
  },
  {
    key: "euExposure",
    text: "Does this system process data from, or serve users located in, the EU/EEA?",
    options: [
      { label: "No", weight: 0 },
      { label: "Unclear", weight: 1 },
      { label: "Yes, a small subset of users or data", weight: 2 },
      { label: "Yes, it's used broadly across EU/EEA operations", weight: 3 },
    ],
  },
  {
    key: "vendorDependency",
    text: "Is this AI system built in-house, or provided/operated by a third-party vendor?",
    options: [
      { label: "Fully in-house, built and hosted by us", weight: 0 },
      { label: "In-house, but uses a third-party model API", weight: 1 },
      { label: "A vendor product that we deploy and configure", weight: 2 },
      { label: "A vendor product that's fully managed and hosted by the vendor", weight: 3 },
    ],
  },
];

// Shared by PRIOR_AUTH_UM and RCM_BILLING — the 2026 state payer/UM laws
// (Alabama SB 63, Colorado HB 1139, and others; see the STATE_DEPLOYMENT
// RegulationDefinition rows seeded for these) converge on requiring a
// licensed human to review and approve every AI-influenced adverse
// determination before it's finalized. This answer feeds the risk score
// like any other question — it isn't itself what triggers a state law
// (that's states-deployed × template, an objective applicability question,
// not a self-report) — but it's exactly what the compliance checklist for
// each triggered state law is checking for.
const HUMAN_REVIEW_BEFORE_FINALIZATION_QUESTION: RiskQuestion = {
  key: "humanReviewBeforeFinalization",
  text: "Does a licensed human professional review and approve every AI-influenced adverse determination (denial, downcode, delay) before it is finalized?",
  options: [
    { label: "Yes, every determination", weight: 0 },
    { label: "No, or only some determinations", weight: 3 },
  ],
};

const TEMPLATE_QUESTIONS: Record<UseCaseTemplate, RiskQuestion[]> = {
  AMBIENT_SCRIBE: [
    {
      key: "noteEntersRecord",
      text: "Does the AI-generated note enter the legal medical record without a clinician reviewing and signing off on it first?",
      options: [
        { label: "No — a clinician always reviews and signs", weight: 0 },
        { label: "A clinician reviews most notes; occasional pass-through", weight: 1 },
        { label: "A clinician spot-checks only", weight: 2 },
        { label: "Notes enter the record automatically, no required review", weight: 3 },
      ],
    },
    {
      key: "audioRetention",
      text: "Are patient audio recordings retained, and if so, how?",
      options: [
        { label: "No audio retained — transcript only, recording deleted immediately", weight: 0 },
        { label: "Audio retained briefly, then deleted per policy", weight: 1 },
        { label: "Audio retained indefinitely by us", weight: 2 },
        { label: "Audio retained indefinitely by the vendor, deletion policy unclear", weight: 3 },
      ],
    },
  ],
  CLINICAL_DECISION_SUPPORT: [
    {
      key: "specificRecommendation",
      text: "Does the system recommend a specific diagnosis or treatment, or only surface general reference information?",
      options: [
        { label: "General reference/information only", weight: 0 },
        { label: "Suggests options among several, clearly labeled as non-directive", weight: 1 },
        { label: "Recommends a specific course of action", weight: 2 },
        { label: "Recommends a specific course of action and is the primary input to the decision", weight: 3 },
      ],
    },
    {
      key: "overrideTracked",
      text: "Is clinician override of, or disagreement with, the system's recommendation tracked?",
      options: [
        { label: "Yes, systematically tracked and reviewed", weight: 0 },
        { label: "Tracked informally", weight: 1 },
        { label: "Not tracked", weight: 2 },
        { label: "Not applicable — clinicians can't see or override the input", weight: 3 },
      ],
    },
  ],
  PRIOR_AUTH_UM: [
    {
      key: "approvesWithoutReview",
      text: "Can this system approve or deny a prior authorization/utilization request without a human reviewing it first?",
      options: [
        { label: "No, a human reviews every determination", weight: 0 },
        { label: "A human reviews denials only", weight: 1 },
        { label: "A human reviews low-confidence cases only", weight: 2 },
        { label: "Fully automated, no required human review", weight: 3 },
      ],
    },
    {
      key: "denialReachesPatient",
      text: "Does a denial reach the patient or provider automatically, without a separate human communication step?",
      options: [
        { label: "No, a human always reviews and sends the denial", weight: 0 },
        { label: "A human approves the denial before it's sent, but the notice itself is automated", weight: 1 },
        { label: "Not sure", weight: 2 },
        { label: "The notice is generated and sent automatically, straight from the system's determination", weight: 3 },
      ],
    },
    HUMAN_REVIEW_BEFORE_FINALIZATION_QUESTION,
  ],
  RCM_BILLING: [
    {
      key: "billingWithoutSignoff",
      text: "Does this system determine what a patient is billed, or flag/deny claims, without human sign-off?",
      options: [
        { label: "No, a human signs off on billing/claims determinations", weight: 0 },
        { label: "A human reviews exceptions or high-dollar cases only", weight: 1 },
        { label: "A human reviews a sample", weight: 2 },
        { label: "Fully automated determination", weight: 3 },
      ],
    },
    {
      key: "automatedAccountAction",
      text: "Can this system take an automated action on a patient's account (e.g., sending to collections, adjusting a balance) without human approval?",
      options: [
        { label: "No, all such actions require human approval", weight: 0 },
        { label: "Only for small-dollar or low-risk actions", weight: 1 },
        { label: "For most actions, with post-hoc human audit", weight: 2 },
        { label: "Yes, fully automated with no required approval", weight: 3 },
      ],
    },
    HUMAN_REVIEW_BEFORE_FINALIZATION_QUESTION,
  ],
  PATIENT_CHATBOT: [
    {
      key: "clinicalAdvice",
      text: "Does this system give clinical advice (symptoms, diagnosis, treatment guidance), or only administrative help (scheduling, billing questions, FAQs)?",
      options: [
        { label: "Administrative/scheduling only, no clinical content", weight: 0 },
        { label: "Provides general health information, clearly non-diagnostic", weight: 1 },
        { label: "Responds to symptom/health questions with guidance", weight: 2 },
        { label: "Provides specific clinical or diagnostic-adjacent advice", weight: 3 },
      ],
    },
    {
      key: "escalationPath",
      text: "Is there a clear, working escalation path to a human for safety-relevant situations (e.g., crisis, emergency symptoms)?",
      options: [
        { label: "Yes, tested and reliable", weight: 0 },
        { label: "Yes, but untested", weight: 1 },
        { label: "Planned but not yet implemented", weight: 2 },
        { label: "No escalation path exists", weight: 3 },
      ],
    },
  ],
  GENERIC: [],
};

export const USE_CASE_TEMPLATE_LABELS: Record<UseCaseTemplate, string> = {
  AMBIENT_SCRIBE: "Ambient clinical scribe",
  CLINICAL_DECISION_SUPPORT: "Clinical decision support",
  PRIOR_AUTH_UM: "Prior authorization / utilization management",
  RCM_BILLING: "RCM / billing AI",
  PATIENT_CHATBOT: "Patient-facing chatbot",
  GENERIC: "Generic / other",
};

// Secondary, independently-authored risk lens (slice 8) — asked on every
// assessment alongside the core/template questions above, but scored
// separately (see computeSecondaryRiskTiers below) and never folded into
// the main risk-tier percentage, so adding these doesn't change the
// meaning of an existing riskTier. Two domains, a generic split used
// across published AI risk-management literature (not any one
// organization's proprietary taxonomy): how close this gets to patient
// care/safety, and how sound the underlying technology/data practices
// are. Original wording — not derived from or aligned to any external
// certification or proprietary framework.
export const LIFE_SAFETY_QUESTIONS: RiskQuestion[] = [
  {
    key: "patientProximity",
    text: "How directly does this system's output reach a patient care encounter?",
    options: [
      { label: "No direct patient-care involvement — administrative or population-level only", weight: 0 },
      { label: "Indirectly informs patient care support (e.g., scheduling, non-clinical communication)", weight: 1 },
      { label: "Directly informs a clinician's patient-specific decision", weight: 2 },
      { label: "Directly interacts with or acts on a patient without a clinician intermediary", weight: 3 },
    ],
  },
  {
    key: "harmSeverityIfWrong",
    text: "If this system produces an incorrect output, what's the worst realistic harm to a patient?",
    options: [
      { label: "No plausible harm", weight: 0 },
      { label: "Minor, reversible inconvenience or delay", weight: 1 },
      { label: "Harm requiring clinical intervention to correct", weight: 2 },
      { label: "Permanent harm, disability, or death", weight: 3 },
    ],
  },
  {
    key: "monitoringMaturity",
    text: "How mature is your ability to detect a safety-relevant failure of this system in real time?",
    options: [
      { label: "Automated, real-time monitoring in place", weight: 0 },
      { label: "Periodic manual review", weight: 1 },
      { label: "Only reviewed after a complaint or incident", weight: 2 },
      { label: "No monitoring process exists", weight: 3 },
    ],
  },
];

export const TECH_DATA_QUESTIONS: RiskQuestion[] = [
  {
    key: "dataProvenanceConfidence",
    text: "How well-documented and trustworthy is the origin of this system's training or operating data?",
    options: [
      { label: "Fully documented, from reputable, audited sources", weight: 0 },
      { label: "Mostly documented, with minor gaps", weight: 1 },
      { label: "Limited documentation of data origin", weight: 2 },
      { label: "Unknown or undocumented provenance", weight: 3 },
    ],
  },
  {
    key: "externalExposure",
    text: "What is this system's network or deployment exposure?",
    options: [
      { label: "Fully isolated, no external interfaces", weight: 0 },
      { label: "Internal network only", weight: 1 },
      { label: "Exposed to the internet with meaningful controls", weight: 2 },
      { label: "Directly internet-facing with minimal controls", weight: 3 },
    ],
  },
  {
    key: "changeManagementRigor",
    text: "How controlled is the process for updating or retraining this system?",
    options: [
      { label: "Formal, versioned pipeline with rollback capability", weight: 0 },
      { label: "Controlled but partially manual", weight: 1 },
      { label: "Ad hoc, undocumented updates", weight: 2 },
      { label: "Continuous or unsupervised learning in production", weight: 3 },
    ],
  },
];

// Slice 14 — gated to templates where the AI takes autonomous action
// (prior auth/UM, RCM/billing, patient chatbot); ambient scribe and CDS
// inform a human rather than act, so the question doesn't apply there.
// Feeds techDataTier as an extra TECH_DATA_QUESTIONS entry rather than a
// new taxonomy — see getTechDataQuestions below.
export const ADVERSARIAL_TESTING_QUESTION: RiskQuestion = {
  key: "adversarialTestingCompleted",
  text: "Has this AI system undergone third-party adversarial testing for jailbreak/prompt-injection/unsafe-output resistance?",
  options: [
    { label: "Yes, tested by a qualified third party with results on file", weight: 0 },
    { label: "Yes, tested internally only", weight: 1 },
    { label: "Planned but not yet completed", weight: 2 },
    { label: "No testing has been performed", weight: 3 },
  ],
};

const AUTONOMOUS_ACTION_TEMPLATES: UseCaseTemplate[] = ["PRIOR_AUTH_UM", "RCM_BILLING", "PATIENT_CHATBOT"];

export function getTechDataQuestions(template: UseCaseTemplate): RiskQuestion[] {
  return AUTONOMOUS_ACTION_TEMPLATES.includes(template)
    ? [...TECH_DATA_QUESTIONS, ADVERSARIAL_TESTING_QUESTION]
    : TECH_DATA_QUESTIONS;
}

export function getSecondaryQuestions(template: UseCaseTemplate): RiskQuestion[] {
  return [...LIFE_SAFETY_QUESTIONS, ...getTechDataQuestions(template)];
}

export function getQuestionsForTemplate(template: UseCaseTemplate): RiskQuestion[] {
  return [...CORE_QUESTIONS, ...TEMPLATE_QUESTIONS[template]];
}

const TIER_THRESHOLDS: { max: number; tier: RiskTier }[] = [
  { max: 25, tier: "LOW" },
  { max: 50, tier: "MODERATE" },
  { max: 75, tier: "HIGH" },
  { max: Infinity, tier: "CRITICAL" },
];

function tierFromPercent(pct: number): RiskTier {
  return TIER_THRESHOLDS.find((t) => pct <= t.max)!.tier;
}

function scoreQuestions(questions: RiskQuestion[], answers: Record<string, number>): RiskTier {
  const maxPossible = questions.length * 3;
  const total = questions.reduce((sum, q) => sum + (answers[q.key] ?? 0), 0);
  const pct = maxPossible === 0 ? 0 : Math.round((total / maxPossible) * 100);
  return tierFromPercent(pct);
}

// Independent of computeRiskClassification's main riskTier — same
// answers bag, but scored over only the LIFE_SAFETY_QUESTIONS /
// TECH_DATA_QUESTIONS keys, so adding these questions never changes the
// main tier's meaning for existing or future assessments.
export function computeSecondaryRiskTiers(
  template: UseCaseTemplate,
  answers: Record<string, number>,
): { lifeSafetyTier: RiskTier; techDataTier: RiskTier } {
  return {
    lifeSafetyTier: scoreQuestions(LIFE_SAFETY_QUESTIONS, answers),
    techDataTier: scoreQuestions(getTechDataQuestions(template), answers),
  };
}

// A regulation is a RegulationDefinition row (see prisma/schema.prisma),
// not a fixed enum — a new state law is a seed-data insert, not a code
// change. Each row's `triggerConfig` JSON is one of these three shapes,
// interpreted generically below. This is a heuristic, not a legal
// determination: the UI must always frame these as "likely applies —
// verify with counsel."
export type RegulationTriggerRule =
  | { kind: "TIER_AT_LEAST"; tier: RiskTier }
  | { kind: "QUESTION_WEIGHT_AT_LEAST"; questionKey: string; weight: number }
  | { kind: "STATE_DEPLOYMENT"; state: string; templates: UseCaseTemplate[] };

export interface RegulationTriggerInput {
  id: string;
  triggerConfig: unknown;
}

const TIER_RANK: Record<RiskTier, number> = { LOW: 0, MODERATE: 1, HIGH: 2, CRITICAL: 3 };

function isRegulationTriggered(
  rule: RegulationTriggerRule,
  context: {
    riskTier: RiskTier;
    answers: Record<string, number>;
    template: UseCaseTemplate;
    statesDeployed: string[];
  },
): boolean {
  switch (rule.kind) {
    case "TIER_AT_LEAST":
      return TIER_RANK[context.riskTier] >= TIER_RANK[rule.tier];
    case "QUESTION_WEIGHT_AT_LEAST":
      return (context.answers[rule.questionKey] ?? 0) >= rule.weight;
    case "STATE_DEPLOYMENT":
      return rule.templates.includes(context.template) && context.statesDeployed.includes(rule.state);
  }
}

// The set of states a STATE_DEPLOYMENT regulation actually tracks —
// drives the edit form's "which states does this deploy in" checkbox
// list, so the UI only ever offers states with a real seeded law instead
// of a full 50-state picker. Adding an 8th state law (a seed insert) is
// enough for it to show up here with no UI code change.
export function getTrackedStates(regulations: RegulationTriggerInput[]): string[] {
  const states = new Set<string>();
  for (const reg of regulations) {
    const rule = reg.triggerConfig as RegulationTriggerRule;
    if (rule.kind === "STATE_DEPLOYMENT") {
      states.add(rule.state);
    }
  }
  return [...states].sort();
}

export function computeRiskClassification(
  template: UseCaseTemplate,
  answers: Record<string, number>,
  statesDeployed: string[],
  regulations: RegulationTriggerInput[],
): { riskTier: RiskTier; triggeredRegulationIds: string[] } {
  const riskTier = scoreQuestions(getQuestionsForTemplate(template), answers);

  const context = { riskTier, answers, template, statesDeployed };
  const triggeredRegulationIds = regulations
    .filter((reg) => isRegulationTriggered(reg.triggerConfig as RegulationTriggerRule, context))
    .map((reg) => reg.id);

  return { riskTier, triggeredRegulationIds };
}
