/* ═══════════════════════════════════════════════════════════════
   MEMBER 360 — V2 DATA LAYER
   5 claims for Sarah Mitchell — multi-context advocacy
   ═══════════════════════════════════════════════════════════════ */

const MEMBER_V2 = {
  name: "Sarah Mitchell", id: "SFP-882401-A",
  plan: "2026 Self-Funded Health Plan", group: "Acme Industries, Inc.",
  deductible: { used: 620, max: 1500 },
  oop: { used: 820, max: 4500 },
};

const CLAIMS_V2 = [
  {
    id: "SFP-01", status: "DENIED", urgency: "high", icon: "🚫",
    service: "MRI — Right Knee", provider: "Dr. James Whitfield",
    dos: "2026-03-10", billed: "$1,250.00", allowed: "$0.00",
    planPaid: "$0.00", memberOwes: "$1,250.00",
    code: "CO-197", codeLabel: "Prior Auth Absent",
    facility: "Outpatient Clinic", npi: "1234567890",
  },
  {
    id: "SFP-02", status: "APPROVED", urgency: "none", icon: "✅",
    service: "Annual Wellness Visit", provider: "Dr. Linda Chen",
    dos: "2026-02-14", billed: "$320.00", allowed: "$320.00",
    planPaid: "$320.00", memberOwes: "$0.00",
    code: null, codeLabel: null,
    facility: "Primary Care Office", npi: "2345678901",
  },
  {
    id: "SFP-03", status: "PARTIAL", urgency: "low", icon: "⚠️",
    service: "Physical Therapy (6 sessions)", provider: "PT Associates of Chicago",
    dos: "2026-02-01 – 03-08", billed: "$900.00", allowed: "$600.00",
    planPaid: "$380.00", memberOwes: "$220.00",
    code: "CO-45", codeLabel: "Exceeds Contracted Rate",
    facility: "Outpatient PT Clinic", npi: "3456789012",
  },
  {
    id: "SFP-04", status: "PENDING", urgency: "low", icon: "⏳",
    service: "Dermatology Specialist Visit", provider: "Dr. Rachel Torres",
    dos: "2026-03-20", billed: "$450.00", allowed: "Pending",
    planPaid: "Pending", memberOwes: "TBD",
    code: null, codeLabel: null,
    facility: "Dermatology Associates", npi: "9876543210",
  },
  {
    id: "SFP-05", status: "DENIED", urgency: "high", icon: "🚫",
    service: "Emergency Room Visit", provider: "City General Hospital",
    dos: "2026-03-01", billed: "$2,800.00", allowed: "$0.00",
    planPaid: "$0.00", memberOwes: "$2,800.00",
    code: "CO-97", codeLabel: "Out-of-Network ER",
    facility: "City General Hospital (OON)", npi: "5678901234",
  },
];

const STATUS_COLORS_V2 = {
  DENIED:   { bg: "rgba(244,63,94,0.08)",   border: "rgba(244,63,94,0.25)",   text: "#F43F5E" },
  APPROVED: { bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.25)",  text: "#10B981" },
  PARTIAL:  { bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.25)",  text: "#F59E0B" },
  PENDING:  { bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.25)", text: "#94A3B8" },
};

/* ── Tool shorthand builders ── */
const T = {
  eob:        (d) => ({ name: "read_eob",              label: "Reading EOB",              detail: d, duration: 1100 }),
  denial:     (d) => ({ name: "lookup_denial_code",    label: "Denial Code Lookup",       detail: d, duration: 900  }),
  rag:        (d) => ({ name: "query_sbc_rag",         label: "RAG: Plan Document Search", detail: d, duration: 1300 }),
  reconcile:  (d) => ({ name: "reconcile",             label: "Reconciliation Engine",    detail: d, duration: 800  }),
  action:     (d) => ({ name: "determine_action_path", label: "Action Path Analysis",     detail: d, duration: 700  }),
  timeline:   (d) => ({ name: "check_timeline",        label: "Deadline Check",           detail: d, duration: 900  }),
  script:     (d) => ({ name: "generate_script",       label: "Building Call Script",     detail: d, duration: 600  }),
  accum:      (d) => ({ name: "fetch_accumulators",    label: "Fetching Accumulators",    detail: d, duration: 800  }),
  network:    (d) => ({ name: "check_network",         label: "Network Status Check",     detail: d, duration: 700  }),
  escalation: (d) => ({ name: "escalation_paths",      label: "Escalation Analysis",      detail: d, duration: 900  }),
  pending:    (d) => ({ name: "check_claim_status",    label: "Claim Status Check",       detail: d, duration: 750  }),
};

/* ═══════════════════════════════════════════════════════════════
   CONVERSATION FLOWS — keyed by claim ID
   ═══════════════════════════════════════════════════════════════ */
const FLOWS_BY_CLAIM = {

  /* ── SFP-01: MRI Knee — DENIED CO-197 ── */
  "SFP-01": {
    welcome: {
      tools: [T.eob("SFP-01 · CO-197 · MRI Right Knee · DOS 2026-03-10 · Billed $1,250"), T.denial("CO-197 → Prior Authorization Absent · SBC § Advanced Imaging"), T.reconcile("Outpatient Clinic ≠ ER → ER exception does NOT apply → denial CONSISTENT")],
      response: { type: "explanation", headline: "Denied — prior authorization was not obtained. This is your provider's error.",
        details: ["Your MRI on March 10th was denied under **CO-197 — Prior Authorization Absent**. Your plan requires all advanced imaging to be pre-approved at least 5 business days in advance.", "The ER exception (which waives prior auth) does NOT apply — this was done at an Outpatient Clinic.", "The good news: **this is the provider's administrative failure**, not yours. You should not owe $1,250."],
        card: { type: "denial_card", code: "CO-197", reason: "Prior Auth Absent", service: "MRI Right Knee", amount: "$1,250.00", owner: "Provider", consistent: true, sbcRef: "§ Advanced Imaging" },
      },
      suggestions: ["How do I fix this?", "What should I say to the provider?", "Can I appeal myself?", "What do I owe right now?"],
    },
    "how do i fix this?": {
      tools: [T.action("Action owner = Provider · Retro-auth path available · Standard appeal: 168 days remaining"), T.timeline("DOS 2026-03-10 · Denial 2026-03-14 · Appeal deadline 2026-09-10 · 168 days left"), T.script("Personalizing script · SFP-882401-A · DOS 03-10 · NPI 1234567890")],
      response: { type: "action_plan", headline: "3-step plan to resolve this denial.",
        steps: [
          { num: 1, title: "Call Dr. Whitfield's billing office", detail: "Ask them to submit a **retroactive authorization** or a **corrected claim**. As an in-network provider, obtaining prior auth was their contractual duty.", time: "~10 min" },
          { num: 2, title: "Reference your key details", detail: "Member ID **SFP-882401-A**, date of service **03/10/2026**, denial code **CO-197**. Use the script I'll prepare.", time: "During call" },
          { num: 3, title: "Follow up in 14 business days", detail: "Allow 14 days after resubmission for reprocessing. No updated EOB by then? Come back and I'll escalate.", time: "Set reminder" },
        ],
        card: { type: "timeline_card", deadlineLabel: "Appeal Deadline", deadline: "September 10, 2026", daysRemaining: 168 },
      },
      suggestions: ["What should I say to the provider?", "What if they refuse?", "Can I appeal myself?"],
    },
    "what should i say to the provider?": {
      tools: [T.script("Inserting: Member SFP-882401-A · DOS 03/10/2026 · NPI 1234567890 · CO-197")],
      response: { type: "script", headline: "Ready-to-use script — ask for the billing department.",
        intro: "Call Dr. Whitfield's office, ask for **billing**, and say:",
        script: `"Hi, I'm calling about a denied claim for Sarah Mitchell, Member ID SFP-882401-A. Date of service was March 10th, 2026 for an MRI of the right knee.\n\nThe claim was denied under code CO-197 because prior authorization was not obtained. My plan requires prior auth for all advanced imaging at outpatient facilities.\n\nAs my in-network provider, could you please submit a retroactive authorization or a corrected claim with the auth on record? My appeal window is open through September 2026."`,
        tips: ["Ask for a **call reference number**", "Request fax confirmation once they resubmit", "If they resist, mention you'll file a formal grievance with the plan"],
      },
      suggestions: ["What if they refuse?", "What do I owe right now?"],
    },
    "what do i owe right now?": {
      tools: [T.accum("Deductible: $620/$1,500 · OOP: $820/$4,500 · As of 2026-03-26")],
      response: { type: "financial_summary", headline: "The $1,250 shouldn't be yours — your real share is ~$74 if resolved.",
        details: ["Currently the denied MRI shows as **$1,250 member responsibility** — but this is incorrect pending resolution.", "If the provider resubmits and the plan approves: remaining deductible is $880 applied first, then plan pays **80% coinsurance**. Your real share drops to roughly **$74**.", "Potential savings if resolved: **$1,176.00**."],
        card: { type: "financial_card", deductible: { used: 620, max: 1500 }, oop: { used: 820, max: 4500 }, potentialSavings: "$1,176.00" },
      },
      suggestions: ["How do I fix this?", "What should I say to the provider?"],
    },
    "can i appeal myself?": {
      tools: [T.rag("§ Claims Procedures · Member Appeal Rights · 180-day window from denial"), T.action("Member appeal vs provider retro-auth — comparing effort and timeline")],
      response: { type: "explanation", headline: "You can — but start with the provider first, it's faster.",
        details: ["You have **180 days from the denial date** to file a member appeal — until approximately **September 10, 2026**.", "Since CO-197 is a **provider administrative failure**, starting there is more direct. They have a clear path via retroactive authorization.", "If the provider doesn't act within **30 days**, then file your own appeal documenting their failure to obtain required auth as an in-network participant."],
      },
      suggestions: ["How do I fix this?", "What if they refuse?"],
    },
    "what if they refuse?": {
      tools: [T.escalation("3 paths: formal grievance vs plan, member appeal with negligence docs, state insurance dept")],
      response: { type: "explanation", headline: "Three escalation paths if the provider won't act.",
        details: ["**Option 1 — Formal Grievance:** File against the provider with your plan for failing their prior-auth obligation. Creates a documented record — often prompts immediate action.", "**Option 2 — Member Appeal:** Submit your own appeal noting the provider was in-network and failed to obtain required auth. Include call date and reference number.", "**Option 3 — State Insurance Dept:** File a complaint if both routes stall. Providers take state-level complaints very seriously."],
      },
      suggestions: ["What should I say to the provider?", "What do I owe right now?"],
    },
  },

  /* ── SFP-02: Wellness — APPROVED ── */
  "SFP-02": {
    welcome: {
      tools: [T.eob("SFP-02 · Annual Wellness · Dr. Chen · DOS 2026-02-14 · Plan paid: $320"), T.rag("§ Preventive Care · ACA §2713 · $0 cost-sharing confirmed")],
      response: { type: "explanation", headline: "Great news — this claim was fully approved. You owe $0.",
        details: ["Your Annual Wellness Visit with **Dr. Linda Chen** on February 14th was paid in full — $320 billed, $320 allowed, **$320 paid by plan**.", "Under ACA preventive care mandates, annual wellness visits with an in-network PCP are **100% covered** — no deductible, no copay, no coinsurance.", "No action required. This is a win."],
      },
      suggestions: ["What's covered under preventive care?", "Do other screenings qualify for $0?"],
    },
    "what's covered under preventive care?": {
      tools: [T.rag("§ Preventive Care · ACA §2713 · USPSTF A/B recommendations · ACIP vaccines · Women's Health")],
      response: { type: "explanation", headline: "Preventive care covers a wide range of services at $0 cost-sharing.",
        details: ["**Annual physicals & wellness visits** — 100% covered, no deductible.", "**Cancer screenings** — mammograms (annually 40+), colonoscopies (every 10 years 45+), cervical cancer screening.", "**All ACIP-recommended vaccines** — flu, COVID, shingles, RSV, pneumonia — $0 at in-network providers.", "**⚠️ Important caveat:** If your doctor addresses a **specific condition** during a preventive visit, that portion may be billed separately and hit your deductible."],
      },
      suggestions: ["Do other screenings qualify for $0?"],
    },
    "do other screenings qualify for $0?": {
      tools: [T.rag("USPSTF Grade A/B list · Women's preventive services · Behavioral health screenings 2024+")],
      response: { type: "explanation", headline: "Yes — many additional screenings qualify at $0.",
        details: ["Always $0 in-network: **depression screening, anxiety screening** (new in 2024), alcohol use counseling, blood pressure, cholesterol, Type 2 diabetes.", "**Well-woman visits** include pap smears, breast exams, contraception counseling — all $0.", "Age-based screenings: **lung cancer CT** (smokers 50–80), **osteoporosis** (women 65+), **AAA screening** (men 65–75 who smoked)."],
      },
      suggestions: ["What do I owe on my other claims?"],
    },
  },

  /* ── SFP-03: Physical Therapy — PARTIAL CO-45 ── */
  "SFP-03": {
    welcome: {
      tools: [T.eob("SFP-03 · CO-45 · PT x6 sessions · Billed $900 · Allowed $600 · Member $220"), T.denial("CO-45 → Charge exceeds contracted rate · $300 write-down between plan and provider"), T.rag("§ Physical Therapy · 20 sessions/year · 20% coinsurance after deductible")],
      response: { type: "explanation", headline: "Partial payment — $220 is your legitimate cost-share, not a billing error.",
        details: ["Your 6 PT sessions were billed at $900 ($150/session). The contracted in-network rate is **$100/session** — so the allowed amount is $600. The **$300 CO-45 write-down** is between the plan and provider. You never owe that portion.", "Of the $600 allowed: $170 applied to your remaining deductible, then **20% coinsurance on the balance** = **$220 your share**. The math checks out.", "Your plan covers **20 PT sessions per year**. You've used 6 — **14 sessions remaining**."],
        card: { type: "denial_card", code: "CO-45", reason: "Exceeds Contracted Rate", service: "Physical Therapy x6", amount: "$220.00", owner: "Member (coinsurance)", consistent: true, sbcRef: "§ Physical Therapy" },
      },
      suggestions: ["Can I dispute the $220?", "How many PT sessions do I have left?", "What's a CO-45 code?"],
    },
    "can i dispute the $220?": {
      tools: [T.rag("§ PT Coverage · CO-45 = contractual adjustment · Not member-appealable · Coinsurance calculation verified")],
      response: { type: "explanation", headline: "The $220 is your actual responsibility — CO-45 adjustments aren't disputable.",
        details: ["**CO-45** is a contractual rate adjustment, not a denial. You cannot appeal it — it's the result of the provider's in-network contract with the plan.", "The **$220 is correct**: deductible application + 20% coinsurance on the allowed amount. This is working exactly as designed.", "If you believe the coinsurance calculation is wrong (e.g., your deductible was already met), I can request a detailed line-item breakdown from the plan."],
      },
      suggestions: ["How many PT sessions do I have left?"],
    },
    "how many pt sessions do i have left?": {
      tools: [T.accum("PT utilization: 6/20 sessions used · Plan year 2026 · Resets Jan 1, 2027")],
      response: { type: "explanation", headline: "14 PT sessions remaining for plan year 2026.",
        details: ["Your plan covers **20 physical therapy sessions per calendar year** (§ Physical Therapy).", "You've used **6 sessions** through March 8th, leaving **14 sessions** through December 31, 2026.", "Once your deductible is met, each session costs ~$20 coinsurance (20% × $100 allowed rate). Once you hit your OOP max ($4,500), sessions are fully covered."],
      },
      suggestions: ["Can I dispute the $220?"],
    },
    "what's a co-45 code?": {
      tools: [T.denial("CO-45 = CARC code · Contractual obligation / fee schedule adjustment · Standard in all PPO/HMO plans")],
      response: { type: "explanation", headline: "CO-45 means 'charge exceeds the contracted rate' — it's not a denial.",
        details: ["**CO-45** is one of the most common codes on EOBs. It records the difference between what the provider billed and what the plan's contract allows.", "In-network providers agree to accept the contracted rate. The CO-45 write-down is their obligation — not yours.", "You only owe your share of the **lower contracted rate**, never the full billed amount. The $300 difference simply disappears."],
      },
      suggestions: ["Can I dispute the $220?", "How many PT sessions do I have left?"],
    },
  },

  /* ── SFP-04: Dermatology — PENDING ── */
  "SFP-04": {
    welcome: {
      tools: [T.pending("SFP-04 · Dr. Torres · DOS 2026-03-20 · In adjudication · Est. completion: 2026-04-03")],
      response: { type: "explanation", headline: "Still processing — estimated completion April 3rd. No action needed yet.",
        details: ["Your March 20th visit with **Dr. Rachel Torres** (Dermatology) is currently **in adjudication**. Standard processing is 14–21 business days.", "Estimated completion: **April 3rd, 2026**. Once processed, the EOB will appear in your member portal.", "Since Dr. Torres is a specialist, the claim will be subject to your deductible, then **20% coinsurance** (in-network specialist benefit)."],
      },
      suggestions: ["Is Dr. Torres in-network?", "What will I likely owe?", "What if it gets denied?"],
    },
    "is dr. torres in-network?": {
      tools: [T.network("NPI 9876543210 · Dr. Rachel Torres, MD · Acme Self-Funded PPO — PARTICIPATING")],
      response: { type: "explanation", headline: "Confirmed — Dr. Torres is a participating in-network provider.",
        details: ["Dr. Rachel Torres (NPI 9876543210) is **in-network** on your Acme Industries Self-Funded PPO.", "In-network means contracted rates apply. Out-of-network would have meant 40–50% coinsurance on the full billed amount.", "No action needed on network status."],
      },
      suggestions: ["What will I likely owe?", "What if it gets denied?"],
    },
    "what will i likely owe?": {
      tools: [T.accum("Deductible remaining: $880 · OOP remaining: $3,680"), T.reconcile("$450 billed → ~$270 allowed (network rate) → deductible applies → est. $54–$270 member share")],
      response: { type: "financial_summary", headline: "Estimated member responsibility: $54–$270 depending on deductible timing.",
        details: ["Dr. Torres billed **$450**. The in-network allowed amount for a specialist visit is typically **$250–$270**.", "You have **$880 remaining on your deductible**, so the full allowed amount will likely apply toward meeting it.", "Once deductible is met, each specialist visit runs ~**20% coinsurance** on the allowed rate.", "Rough estimate: **$54–$270**. The exact number will be on your EOB around April 3rd."],
        card: { type: "financial_card", deductible: { used: 620, max: 1500 }, oop: { used: 820, max: 4500 }, potentialSavings: null },
      },
      suggestions: ["Is Dr. Torres in-network?", "What if it gets denied?"],
    },
    "what if it gets denied?": {
      tools: [T.rag("§ Claims Procedures · Clinical denial · Independent Medical Review available · 180-day appeal window")],
      response: { type: "explanation", headline: "If denied, you have strong appeal rights — including independent review.",
        details: ["Dr. Torres is in-network, so any denial would likely be a **clinical denial** (medical necessity), not a coverage issue.", "You have **180 days from the denial notice** to file a member appeal. For clinical denials, you can also request an **Independent Medical Review** — a neutral third party outside the plan makes the call.", "Independent reviews overturn roughly **40% of clinical denials** in the member's favor. Come back if it's denied and we'll build the appeal together."],
      },
      suggestions: ["Is Dr. Torres in-network?", "What will I likely owe?"],
    },
  },

  /* ── SFP-05: ER Visit — DENIED CO-97 ── */
  "SFP-05": {
    welcome: {
      tools: [T.eob("SFP-05 · CO-97 · ER Visit · City General (OON) · DOS 2026-03-01 · Billed $2,800"), T.denial("CO-97 → Payment adjusted for non-covered/OON charges"), T.rag("No Surprises Act §2799B-1 · Emergency care mandate · In-network cost-sharing cap")],
      response: { type: "explanation", headline: "This denial may violate the No Surprises Act. Do NOT pay this bill yet.",
        details: ["Your ER visit at **City General Hospital** (March 1st) was denied under **CO-97** because City General is out-of-network.", "However, the **No Surprises Act (2022)** requires plans to cover emergency care at **in-network cost-sharing rates** regardless of network status. You cannot be balance-billed for emergencies.", "Your real liability should be approximately **$150–$300** — not $2,800. This denial needs to be appealed."],
        card: { type: "denial_card", code: "CO-97", reason: "Out-of-Network Emergency", service: "ER Visit", amount: "$2,800.00", owner: "Plan (appeal required)", consistent: false, sbcRef: "§ Emergency Care / NSA" },
      },
      suggestions: ["How do I appeal this?", "What is the No Surprises Act?", "What do I actually owe?", "What are my escalation options?"],
    },
    "how do i appeal this?": {
      tools: [T.action("NSA §2799B-1 protections apply · In-network cost-sharing cap mandatory · File member appeal"), T.timeline("Denial 2026-03-05 · Appeal deadline 2026-09-01 · 159 days remaining"), T.script("Building NSA appeal letter · SFP-05 · DOS 03-01-2026 · City General NPI 5678901234")],
      response: { type: "action_plan", headline: "File a member appeal immediately — this denial is likely wrongful.",
        steps: [
          { num: 1, title: "Do NOT pay City General's $2,800 bill", detail: "Until the appeal is resolved, **do not pay**. Once paid, recovering funds from an out-of-network provider is extremely difficult.", time: "Right now" },
          { num: 2, title: "File a member appeal citing the No Surprises Act", detail: "Reference **NSA §2799B-1**: your plan must apply in-network cost-sharing to emergency services regardless of network status. The $2,800 balance billing is prohibited by federal law.", time: "This week" },
          { num: 3, title: "Request detailed denial explanation", detail: "The plan must explain in writing why NSA protections don't apply. If they can't justify it, reprocessing at in-network rates is required.", time: "During appeal" },
        ],
        card: { type: "timeline_card", deadlineLabel: "Appeal Deadline", deadline: "September 1, 2026", daysRemaining: 159 },
      },
      suggestions: ["What is the No Surprises Act?", "What do I actually owe?", "What are my escalation options?"],
    },
    "what is the no surprises act?": {
      tools: [T.rag("No Surprises Act §2799B-1 · Effective Jan 1, 2022 · Emergency care · Balance billing prohibition · Air ambulance")],
      response: { type: "explanation", headline: "The No Surprises Act caps your ER costs at in-network rates — regardless of network status.",
        details: ["The **No Surprises Act** (effective January 1, 2022) prohibits plans from charging members more than in-network cost-sharing for emergency services, even when the ER is out-of-network.", "This means City General **cannot balance-bill you** for the difference between their charges and what the plan pays. Your only responsibility is the in-network deductible + coinsurance.", "Your plan is required to reprocess this claim at **in-network benefit levels**. The law covers all hospital-based emergency services and extends to air ambulance with separate provisions."],
      },
      suggestions: ["How do I appeal this?", "What do I actually owe?"],
    },
    "what do i actually owe?": {
      tools: [T.accum("Deductible: $620/$1,500 · OOP: $820/$4,500 · ER in-network benefit: 20% after deductible"), T.reconcile("$2,800 billed → ~$1,100 allowed (network rate) → $880 deductible → 20% coinsurance on balance → est. $220–$300 true member share")],
      response: { type: "financial_summary", headline: "True liability: ~$220–$300. Not $2,800.",
        details: ["Under the No Surprises Act, your plan must apply **in-network ER rates**. Allowed amount based on network benchmarks: approximately **$1,100**.", "Your remaining deductible ($880) applies first. Then 20% coinsurance on the balance (~$220) = roughly **$44**. Total true member responsibility: **$220–$300**.", "⚠️ **Do not pay the $2,800 bill.** The out-of-network billed rate is not your financial responsibility under the NSA."],
        card: { type: "financial_card", deductible: { used: 620, max: 1500 }, oop: { used: 820, max: 4500 }, potentialSavings: "$2,500.00" },
      },
      suggestions: ["How do I appeal this?", "What are my escalation options?"],
    },
    "what are my escalation options?": {
      tools: [T.escalation("4 paths: NSA member appeal, Independent Medical Review, Federal IDR, State DOI / CMS complaint")],
      response: { type: "explanation", headline: "Four escalation paths — start with the member appeal.",
        details: ["**Path 1 — Member Appeal (NSA-based):** Cite No Surprises Act §2799B-1. The plan must respond within 60 days.", "**Path 2 — Independent Medical Review:** A neutral third party outside the plan reviews the denial. Very effective for NSA disputes.", "**Path 3 — Federal IDR Process:** Initiate Independent Dispute Resolution via the federal portal. You pay in-network rates while the dispute resolves.", "**Path 4 — State DOI / CMS Complaint:** File with your state Department of Insurance or with CMS directly. CMS has direct enforcement authority over NSA violations."],
      },
      suggestions: ["How do I appeal this?", "What do I actually owe?"],
    },
  },
};

/* ── Flow resolver ── */
function findClaimFlow(claimId, input) {
  const flows = FLOWS_BY_CLAIM[claimId];
  if (!flows) return null;
  const lower = input.toLowerCase().trim().replace(/[?!.]+$/, "").trim();

  for (const key of Object.keys(flows)) {
    if (key === "welcome") continue;
    const nk = key.replace(/[?!.]+$/, "").trim();
    if (lower === nk || lower.includes(nk) || nk.includes(lower)) return flows[key];
  }

  const kw = (words) => words.some(w => lower.includes(w));
  if (claimId === "SFP-01") {
    if (kw(["fix","resolve","next step","how"])) return flows["how do i fix this?"];
    if (kw(["say","script","call","provider"])) return flows["what should i say to the provider?"];
    if (kw(["owe","cost","pay","financial"])) return flows["what do i owe right now?"];
    if (kw(["appeal"])) return flows["can i appeal myself?"];
    if (kw(["refus","escalat","won't","won"])) return flows["what if they refuse?"];
  }
  if (claimId === "SFP-02") {
    if (kw(["cover","preventive","screen","qualify"])) return flows["what's covered under preventive care?"];
    if (kw(["other","also","more"])) return flows["do other screenings qualify for $0?"];
  }
  if (claimId === "SFP-03") {
    if (kw(["disput","appeal","fight","wrong"])) return flows["can i dispute the $220?"];
    if (kw(["session","remain","left","how many"])) return flows["how many pt sessions do i have left?"];
    if (kw(["co-45","what is","mean","code"])) return flows["what's a co-45 code?"];
  }
  if (claimId === "SFP-04") {
    if (kw(["network","torres","in-network"])) return flows["is dr. torres in-network?"];
    if (kw(["owe","cost","pay","likely"])) return flows["what will i likely owe?"];
    if (kw(["denied","denial","if","what if"])) return flows["what if it gets denied?"];
  }
  if (claimId === "SFP-05") {
    if (kw(["appeal","fix","fight","challenge"])) return flows["how do i appeal this?"];
    if (kw(["surprise","nsa","law","act","federal"])) return flows["what is the no surprises act?"];
    if (kw(["owe","actual","really","true"])) return flows["what do i actually owe?"];
    if (kw(["escalat","option","path","next"])) return flows["what are my escalation options?"];
  }
  return null;
}