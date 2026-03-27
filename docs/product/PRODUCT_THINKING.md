# Patient Journey & Product Thinking

> This document maps the full patient journey across healthcare benefits, identifies the highest-friction phase, and shows how Member 360 addresses it. It provides the product context behind the codebase.

---

## 1. The Full Journey — 5 Phases of Benefits Navigation

The patient journey across employer-sponsored health benefits spans five distinct phases, each with its own activities, touchpoints, and friction points:

| Phase | What Happens | Key Touchpoints | Primary Friction |
|---|---|---|---|
| **1. Enroll in Benefits** | Reviewing plan options (Medical, Dental, Vision, HSA/FSA), using comparison tools | Company Benefits Portal, HR Communications | Plans are confusing — members can't meaningfully compare deductibles, coinsurance, and network scope |
| **2. Find & Access Care** | Searching in-network providers, checking specialist coverage, scheduling | Carrier Mobile App, Provider Directory, Telemedicine Platform | Outdated provider directories, unclear referral requirements, prior auth uncertainty |
| **3. Get Medical Care** | Checking in, sharing insurance information, consultations and tests | Digital ID Card, Patient Portal, Doctor's Office Check-in | Minimal friction here — this is the phase the system is optimized for |
| **4. Understand & Pay Bills** | Receiving EOBs, tracking deductible, reviewing provider bills, using HSA/FSA | Health Carrier Portal, EOB Statement, Provider Billing Portal, HSA/FSA Manager | **Highest friction phase** — cryptic denial codes, confusing documentation, reconciliation between EOB and provider bills |
| **5. Ongoing Management** | Managing HSA/FSA contributions, wellness programs, preparing for next open enrollment | Benefits Portal, HSA/FSA Portal, Wellness App, Retirement Account Portal | Disconnected systems, no feedback loop from claims experience to enrollment decisions |

**Key insight:** Phases 1–3 and 5 have been the focus of most healthtech investment (enrollment platforms, provider directories, telemedicine, wellness apps). Phase 4 — the post-care financial experience — remains largely unaddressed despite being the phase where members face the most confusion, the highest financial exposure, and the least guidance.

---

## 2. Phase 4 Deep Dive — The Friction Zone

### Anatomy of the Problem

When a claim is processed, the member receives an Explanation of Benefits (EOB). This document is the primary communication channel between the adjudication system and the human being it affects. And it's nearly incomprehensible.

**What the EOB contains:**
- Service type, date, and provider
- Amount billed vs. allowed amount vs. provider discount
- Member share (deductible, copay, coinsurance)
- Denial codes (CARC/RARC) if applicable
- Remark codes and plan references

**Why it fails the member:**
- Multiple EOBs for a single visit (facility fee, professional fee, lab, imaging — each billed separately)
- Jargon-heavy terminology that assumes familiarity with insurance mechanics
- No plain-language explanation of what happened or what to do next
- No indication of whether the member should act, the provider should act, or nobody needs to act

### The Four Patient Challenges

| Challenge | Description | Frequency |
|---|---|---|
| **Confusing Documentation** | Multiple EOBs per visit, confusing format, jargon terminology | Every claim |
| **Out-of-Network Surprise** | Specialist wasn't in-network, facility was but anesthesiologist wasn't | Common for complex care |
| **Claim Denied (Pre-Auth)** | Prior authorization missing — provider didn't file or plan didn't respond | 9% of all denials (KFF/CMS) |
| **Reconciliation Mismatch** | EOB says one amount, provider bill says another, member has no way to reconcile | Extremely common |

### How Patients Currently Navigate This (Without Member 360)

The resolution path today is entirely manual and member-initiated:

1. **Review EOB & Bill** — Patient compares documents at home. Touchpoint: mail/email.
2. **Research & Clarification** — Patient calls carrier member services and/or provider billing department. Average hold time creates 60% abandonment at 1+ minutes.
3. **Appeals & Reconciliation** — Patient files appeal or requests corrections. Touchpoints: carrier appeals department, patient advocate. Less than 1% of denied claims ever reach this step.
4. **Final Payment & Tracking** — Patient pays via HSA/FSA portal, provider billing website, or tracking sheet.

**The core failure:** Resolution requires awareness (knowing something is wrong), persistence (making multiple calls), and domain knowledge (understanding CARC codes, SBC rules, and appeal rights). The system places the entire burden on the person with the least context.

---

## 3. The Member 360 Solution — Agentic AI Advocate

### From Manual Middleman to Autonomous Advocate

The traditional workflow requires the patient to act as a manual router between the payer, provider, and their own plan documents. Member 360 replaces this with an agentic AI advocate that sits on top of the existing systems of record.

### Unified Member 360 Hub

The agent draws from a unified data layer that aggregates:

| Data Source | What It Provides | Integration |
|---|---|---|
| Enrollment History | Plan type, coverage tier, effective dates | Payer system |
| Claims History | Past EOBs, denial patterns, resolution history | Adjudication engine |
| Preferred Provider Network | In-network status, provider NPI, facility type | Network database |
| Demographics | Member ID, dependents, contact information | HR/enrollment system |
| Prescription History | Formulary status, prior auth requirements for Rx | PBM integration |
| Plan Benefits & Deductible Status | SBC rules, accumulator data, OOP tracking | Benefits platform API |

### The 4-Step Agent Pipeline

| Step | What Happens | Technical Implementation |
|---|---|---|
| **1. Data Ingest & Parsing** | Extracts denial codes, service type, amounts, provider info from EOB | `EOBParser` class — regex-based structured extraction into typed `EOBRecord` dataclass |
| **2. Profile Validation & Refinement** | Checks member profile quality, routes to specialized intervention if needed (e.g., call center for complex cases) | Profile quality scoring — determines if automated resolution is appropriate or human escalation is required |
| **3. Rules (RAG)** | Queries the plan's SBC document to retrieve the specific rule that applies | `SBCRetriever` class — FAISS vector store with all-MiniLM-L6-v2 embeddings, scoped to the section referenced by the denial mapping |
| **4. Reasoning & Advocacy Strategy** | Analyzes plan benefits, validates network provider status, assigns action ownership (Member vs. Provider vs. Plan), generates resolution script | `ReconciliationAgent._reason()` — rule-based logic comparing EOB fields against retrieved SBC text, with consistency checking and citation enforcement |

### Output: Unified Resolution Statement

Instead of forcing the member to reconcile multiple documents across multiple portals, the agent produces:

- **Plain-English explanation** — "Your MRI was denied because the provider didn't get pre-approval"
- **Action ownership** — "This is the provider's responsibility to fix, not yours"
- **Resolution script** — Word-for-word call script with claim ID, DOS, provider NPI pre-filled
- **Financial context** — Deductible status, OOP progress, potential savings if resolved
- **SBC citation** — The exact plan rule referenced, by section name

### Design Constraints

These constraints are non-negotiable and are enforced in both the codebase and the UI:

- **Anti-hallucination:** Unknown denial codes are rejected outright — the system says "I cannot interpret this claim" rather than guessing. Every response cites the SBC section by name.
- **Role boundary:** The agent interprets adjudication outcomes but never overrides them. The disclaimer "This is an interpretation layer. Final financial determinations are held by the Adjudication System of Record" appears on every screen.
- **Deterministic-first:** Denial code interpretation is a JSON lookup, not model inference. Plan rule retrieval is scoped RAG, not open-ended search. Reasoning is rule-based logic, not generative inference.
- **Auditable pipeline:** Every step (parse → lookup → retrieve → reason) is logged and visible to the member via the tool chain visualization.

---

## Mapping to the Codebase

| Concept in These Diagrams | Implementation in Code |
|---|---|
| EOB Anatomy & Parsing | `EOBParser.parse()` in `app.py` |
| Denial Code Lookup | `denial_mapping.json` + `ReconciliationAgent.reconcile()` |
| SBC Rule Retrieval (RAG) | `SBCRetriever.retrieve()` with FAISS + deterministic fallback |
| Consistency Reasoning | `ReconciliationAgent._reason()` — facility checks, timeline validation |
| Resolution Script Output | `DenialMapping.script` field with `[ID]` and `[Date]` personalization |
| Member Financial Context | Accumulator data in chat UI (`member360_chat.jsx`) |
| Tool Chain Visibility | `ToolChain` component in `member360_chat.jsx` |
| Role Boundary Disclaimer | Rendered on every screen in both Streamlit and React UIs |

---

## Data Sources Referenced

- CMS Transparency in Coverage PUF, 2024 (8.8M denied in-network claims)
- KFF Claims Denials & Appeals Analysis, 2025 (<1% appeal rate, 44% overturn rate)
- AHA Costs of Caring Report, 2025 ($18B spent overturning denials, 70% eventually paid)
- Experian Health State of Claims Survey, 2025 (11.8% initial denial rate, rising for 3rd consecutive year)
- Experian Health State of Patient Access Survey, 2026 (36% of patients report difficulty with authorizations, 28% experienced care delays from insurance verification)

---

*All data in this project is synthetic. No real member, provider, or plan information is used.*
