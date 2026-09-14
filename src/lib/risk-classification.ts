import type { UseCaseTemplate, RiskTier, Regulation } from "@prisma/client";

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

export const REGULATION_LABELS: Record<Regulation, string> = {
  NIST_AI_RMF: "NIST AI Risk Management Framework",
  EU_AI_ACT: "EU AI Act",
  ISO_42001: "ISO/IEC 42001",
  NYC_LL144: "NYC Local Law 144",
  CO_SB21_169: "Colorado SB21-169",
};

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

// weight >= 2 on these three core questions is what actually drives each
// regulation's advisory trigger — see the plan doc / mvp-scope.md for the
// reasoning. This is a heuristic, not a legal determination: the UI must
// always frame these as "likely applies — verify with counsel."
const REGULATION_TRIGGER_QUESTIONS: Record<string, Regulation> = {
  employmentDecision: "NYC_LL144",
  consequentialDecision: "CO_SB21_169",
  euExposure: "EU_AI_ACT",
};

export function computeRiskClassification(
  template: UseCaseTemplate,
  answers: Record<string, number>,
): { riskTier: RiskTier; triggeredRegulations: Regulation[] } {
  const questions = getQuestionsForTemplate(template);
  const maxPossible = questions.length * 3;
  const total = questions.reduce((sum, q) => sum + (answers[q.key] ?? 0), 0);
  const pct = maxPossible === 0 ? 0 : Math.round((total / maxPossible) * 100);
  const riskTier = tierFromPercent(pct);

  const triggeredRegulations = new Set<Regulation>();
  for (const [key, regulation] of Object.entries(REGULATION_TRIGGER_QUESTIONS)) {
    if ((answers[key] ?? 0) >= 2) {
      triggeredRegulations.add(regulation);
    }
  }
  if (riskTier === "MODERATE" || riskTier === "HIGH" || riskTier === "CRITICAL") {
    triggeredRegulations.add("NIST_AI_RMF");
  }
  if (riskTier === "HIGH" || riskTier === "CRITICAL") {
    triggeredRegulations.add("ISO_42001");
  }

  return { riskTier, triggeredRegulations: [...triggeredRegulations] };
}
