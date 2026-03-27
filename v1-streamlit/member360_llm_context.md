# Member 360 — Agentic Experience Layer: Full Project Context

> **Purpose of this document:** This is a comprehensive context file designed to be shared with any LLM to provide full project knowledge. It covers architecture, design decisions, data models, code structure, conversation flows, guardrails, and current project state. Paste this into any LLM conversation to resume work on this project with zero ramp-up.

---

## 1. Project Overview

**Member 360** is an agentic experience layer for **self-funded health plans** that sits on top of an existing claims adjudication platform. It does **not** make financial decisions — it interprets adjudication outcomes and translates them into plain-English member advocacy.

**Domain:** Healthcare Benefits Technology — specifically pharmacy/medical claims interpretation for self-funded employer plans.

**Core Principle:** The adjudication engine (System of Record) holds financial authority. Member 360 is a read-only interpretation layer. This role boundary is non-negotiable and must appear on every screen.

**Current State:** Working prototype with two frontends (Streamlit dashboard + React agentic chat UI), and an interactive architecture diagram. All data is synthetic — no real PHI/PII anywhere.

---

## 2. Architecture (Four Layers)

### Layer 1 — Experience Layer (Member-Facing)
| Component | Technology | Purpose |
|---|---|---|
| Agentic Chat UI | React (.jsx) | Conversational interface with tool-call visualization, streaming responses, suggestion chips, and inline data cards |
| Advocacy Dashboard | Streamlit (Python) | Structured view: claim snapshot metrics, The Why (explanation), The How (script), Reconciliation Reasoning |
| Member Context Panel | Real-time state | Sidebar showing member demographics, plan enrollment, accumulators (deductible/OOP), active claim details |

### Layer 2 — Orchestration Layer (Agentic Reasoning)
| Component | Technology | Purpose |
|---|---|---|
| ReconciliationAgent | Python / LangChain | Core agent class — 5-step pipeline: Ingest → Lookup → RAG Retrieve → Reason → Output |
| EOB Parser | Regex / structured extraction | Parses raw EOB text into typed EOBRecord dataclass |
| Reasoning Engine | Rule-based logic | Compares EOB fields against SBC text — facility-type checks, timeline validation, consistency scoring |

### Layer 3 — Data & Retrieval Layer (Knowledge Infrastructure)
| Component | Technology | Purpose |
|---|---|---|
| Denial Code Mapping | JSON (deterministic) | CARC/RARC code → plain-language explanation, SBC section reference, action owner, call script template |
| SBC Vector Store | FAISS + HuggingFace (all-MiniLM-L6-v2) | RAG pipeline over the Summary of Benefits and Coverage; section-level retrieval with deterministic fallback |
| Accumulator Store | Benefits Platform API (mocked) | Deductible tracking, OOP max, coinsurance calculations, savings projections |

### Layer 4 — Integration Layer (System of Record Boundary)
| Component | Technology | Purpose |
|---|---|---|
| Adjudication Engine | System of Record | Upstream pay/deny determination — Member 360 reads from this, NEVER writes back |
| EOB Data Feed | Kafka / Batch ETL | Ingestion pipeline for EOB data from the adjudication engine |
| Plan Document Store | Document Management | Repository of SBC, SPD, formularies, network files — source-of-truth for RAG |

### Data Flow Paths
```
Adjudication Engine → EOB Data Feed → EOB Parser → ReconciliationAgent
Plan Document Store → SBC Vector Store → Reasoning Engine → ReconciliationAgent
ReconciliationAgent → Chat UI / Advocacy Dashboard
Accumulator Store → Member Context Panel
Denial Code Mapping → ReconciliationAgent (deterministic lookup)
SBC Vector Store → Reasoning Engine (RAG retrieval)
```

---

## 3. The 5-Step Reconciliation Pipeline

```
Step 1 — INGEST: Parse raw EOB text → extract code, service, facility, amounts, dates
Step 2 — LOOKUP: Match denial code against denial_mapping.json
         HARD CONSTRAINT: If code is NOT in mapping → return "cannot interpret" error
Step 3 — RAG RETRIEVE: Use sbc_section from mapping → retrieve relevant SBC section via FAISS
         FALLBACK: If FAISS unavailable → deterministic header matching on markdown
Step 4 — REASON: Compare EOB data vs. SBC text
         Example: "SBC says MRIs need auth unless ER. Facility = Outpatient Clinic ≠ ER.
                   Therefore denial is CONSISTENT with plan rules."
Step 5 — OUTPUT: Render The Why (plain English) + The How (call script) + Reasoning (cited)
```

---

## 4. Design Principles & Guardrails

### Anti-Hallucination
- Unknown denial codes are **rejected** — the system says "I cannot interpret this claim" rather than guessing
- SBC sections are **cited by name** in every reasoning output
- RAG retrieval status is displayed (active vs. deterministic fallback)
- Confidence scoring: HIGH when SBC section found, MEDIUM when not

### Role Boundary
- Persistent disclaimer on every screen: "This is an interpretation layer. Final financial determinations are held by the Adjudication System of Record."
- The agent cannot: override a claim determination, promise financial outcomes, or bypass appeals
- Read-only architecture — no write-back to adjudication engine

### Deterministic + RAG Hybrid
- JSON mapping provides **precision** for code lookups (no model inference for code interpretation)
- FAISS vector search provides **contextual** plan rule retrieval
- Reasoning is **rule-based**, not generative (facility checks, timeline validation)
- LLM value is in the experience layer (conversation, follow-ups, personalization), not the interpretation pipeline

### Auditable Pipeline
- Every step is logged and visible in the tool chain UI
- The chat UI shows each tool call with: name, label, detail text, and duration
- SBC source citation appears in every reconciliation output

---

## 5. Data Files

### denial_mapping.json (Deterministic Bridge)
```json
{
  "CO-197": {
    "reason": "Prior Authorization Absent",
    "plain_language": "The provider didn't get the required 'OK' from the plan before the service.",
    "sbc_section": "Advanced Imaging",
    "action_owner": "Provider",
    "script": "I'm calling about claim [ID]. My plan denied this because a prior authorization was not filed. As an in-network provider, please submit a retroactive authorization to resolve this."
  },
  "CO-16": {
    "reason": "Missing Medical Records",
    "plain_language": "The insurance company needs more details from your doctor to see why this was necessary.",
    "sbc_section": "Claims Procedures",
    "action_owner": "Provider",
    "script": "My claim was denied for missing information. Please resubmit the claim with the clinical notes and office visit records for [Date]."
  },
  "CO-4": {
    "reason": "Procedure Modifier Inconsistency",
    "plain_language": "The billing code used by the provider doesn't match the service that was performed.",
    "sbc_section": "Claims Procedures",
    "action_owner": "Provider",
    "script": "I'm calling about claim [ID]. The denial code indicates a modifier issue. Please review the procedure and modifier codes, correct any errors, and resubmit."
  },
  "CO-29": {
    "reason": "Filing Deadline Exceeded",
    "plain_language": "The claim was submitted too late. Providers must file within the plan's deadline.",
    "sbc_section": "Claims Procedures",
    "action_owner": "Provider",
    "script": "My claim was denied for late filing. Please check your records for the original submission date and file an appeal with proof of timely filing if applicable."
  },
  "PR-1": {
    "reason": "Member Deductible Applies",
    "plain_language": "This amount is your responsibility because you haven't met your annual deductible yet.",
    "sbc_section": "Cost Sharing",
    "action_owner": "Member",
    "script": "No provider action needed. This amount applies to your annual deductible. Check your plan's Explanation of Benefits for your remaining deductible balance."
  },
  "PR-2": {
    "reason": "Coinsurance Applies",
    "plain_language": "After the plan paid its share, this is the percentage you owe based on your coinsurance rate.",
    "sbc_section": "Cost Sharing",
    "action_owner": "Member",
    "script": "No provider action needed. This is your coinsurance portion. Refer to your SBC under Cost Sharing for your coinsurance percentage for this service category."
  }
}
```

**Schema per denial code entry:**
- `reason` — short clinical/admin reason name
- `plain_language` — member-facing explanation in everyday English
- `sbc_section` — exact header name in the SBC markdown document (used for RAG scoping)
- `action_owner` — "Provider" or "Member" — determines who needs to take action
- `script` — call script template with `[ID]` and `[Date]` placeholders for personalization

### synthetic_sbc.md (Plan Rules)
```markdown
# 2026 Self-Funded Health Plan Rules

## Advanced Imaging
All MRIs and CT scans require Prior Authorization 5 days in advance. Exception: This is waived if performed in an Emergency Room. The authorization must reference a valid ICD-10 diagnosis code. Retroactive authorizations are accepted within 72 hours of the service date for urgent situations only.

## Claims Procedures
Providers must submit all requested clinical documentation within 30 days of the request or the claim will be closed. Initial claims must be filed within 90 days of the date of service. Appeals for denied claims must be submitted within 180 days of the denial notice. All claims must include the rendering provider's NPI and valid CPT/HCPCS codes.

## Cost Sharing
The annual deductible for in-network services is $1,500 for individual coverage and $3,000 for family coverage. After the deductible is met, the plan pays 80% coinsurance for most in-network services. The annual out-of-pocket maximum is $4,500 individual / $9,000 family, after which the plan pays 100%.

## Preventive Care
Routine preventive services as defined by the ACA are covered at 100% with no cost sharing when performed by an in-network provider. Annual wellness exams, age-appropriate screenings, and immunizations are included.

## Emergency Services
Emergency Room visits are covered at 80% after a $250 copay. The copay is waived if the member is admitted. Emergency services are covered at in-network rates regardless of the facility's network status.
```

### mock_eob.txt (Default Test Case)
```
EXPLANATION OF BENEFITS
=======================
Plan: 2026 Self-Funded Health Plan
Member ID: SFP-882401-A
Date of Service: 2026-03-10

CLAIM STATUS: DENIED

Code: CO-197
Service: MRI Knee
Facility: Outpatient Clinic
Rendering Provider: Dr. James Whitfield, NPI 1234567890
Billed Amount: $1,250.00
Allowed Amount: $0.00
Plan Paid: $0.00
Member Responsibility: $1,250.00

Remark: Service requires prior authorization per plan guidelines.
```

---

## 6. Code Architecture

### Python Backend (app.py — Streamlit)

**Data Models (dataclasses):**
```python
@dataclass
class EOBRecord:
    status, code, service, facility, billed_amount, member_id,
    date_of_service, provider, allowed_amount, plan_paid,
    member_responsibility, remark, raw_text

@dataclass
class DenialMapping:
    code, reason, plain_language, sbc_section, action_owner, script

@dataclass
class ReconciliationResult:
    eob, mapping, sbc_excerpt, reasoning, is_consistent,
    confidence, error, rag_available
```

**Key Classes:**
- `EOBParser` — static `parse(text)` method using field-label regex matching
- `SBCRetriever` — manages FAISS vectorstore construction and section retrieval with deterministic fallback
- `ReconciliationAgent` — core orchestrator with `reconcile(eob)` method running the 5-step pipeline

**SBCRetriever dual-mode retrieval:**
1. Attempts FAISS similarity search (k=2) with metadata matching
2. Falls back to deterministic header matching on markdown sections
3. Further falls back to fuzzy substring matching
4. Returns `(text, used_rag)` tuple

**ReconciliationAgent reasoning logic:**
- CO-197: Checks if facility contains "emergency" or "er " → if yes, flags inconsistency (ER exception should apply); if no, denial is consistent
- CO-16: Confirms documentation deadline rule applies
- CO-4, CO-29: Confirms filing/coding requirement applies
- PR-1, PR-2: Identifies as member cost-sharing, not a denial
- Unknown codes: Returns explicit error — never guesses

**Tech stack:**
- `streamlit>=1.38.0`
- `langchain>=0.3.0`, `langchain-community>=0.3.0`, `langchain-text-splitters>=0.3.0`
- `faiss-cpu>=1.8.0`
- `sentence-transformers>=3.0.0` (pulls all-MiniLM-L6-v2)

### React Chat UI (member360_chat.jsx)

**Conversation engine:** Pre-scripted agent flows matched via fuzzy keyword matching. Each flow contains:
- `tools[]` — array of tool steps with name, label, detail text, and duration (ms)
- `response` — structured response object with type-specific fields
- `suggestions[]` — follow-up suggestion chips

**Supported conversation flows:**
| Trigger Keywords | Flow | Tools Used |
|---|---|---|
| "why", "denied", "mri" | Denial explanation | read_eob → lookup_denial_code → query_sbc_rag → reconcile |
| "fix", "resolve", "next step" | Action plan | determine_action_path → check_timeline → generate_script |
| "script", "say", "call" | Call script | generate_script |
| "owe", "cost", "deductible" | Financial summary | fetch_accumulators → pending_claims |
| "appeal" | Appeal options | query_sbc_rag → evaluate_appeal_path |
| "refuse", "won't", "escalat" | Escalation paths | escalation_paths |

**Inline data cards:**
- `DenialCard` — code, reason, service, amount, action owner, consistency badge, SBC reference
- `FinancialCard` — deductible/OOP progress bars with potential savings callout
- `TimelineCard` — appeal deadline with days remaining counter

**Tool chain visualization:**
- Each tool step shows: icon → spinner (active) → checkmark (done)
- Detail text shows exact data being processed
- Steps execute sequentially with configurable durations
- `ToolChain` component calls `onComplete` callback when all steps finish

**Mock member data:**
```
Name: Sarah Mitchell | ID: SFP-882401-A
Plan: 2026 Self-Funded Health Plan | Group: Acme Industries, Inc.
Deductible: $620 / $1,500 | OOP Max: $820 / $4,500
```

### Architecture Diagram (member360_architecture.jsx)
Interactive React component with:
- 4 layer sections, each with 3 component nodes
- Click any component → detail panel slides in from right with description, capabilities, and data flows
- 10 data flow paths with hover highlighting
- 4 design principle cards at top
- Staggered fade-in animations on load

---

## 7. UI/UX Design Language

**Color system (dark theme):**
- Background: `#04070E` to `#0A1020`
- Blue accent: `#3B82F6` (Experience Layer, primary actions)
- Teal accent: `#14B8A6` (Orchestration Layer, agent identity)
- Amber accent: `#F59E0B` (Data Layer, warnings, role boundary)
- Rose accent: `#F43F5E` (Integration Layer, errors, denials)
- Emerald accent: `#10B981` (Success, consistency, completion)

**Typography:**
- Headings/body: Outfit (chat UI), Nunito Sans (architecture), DM Sans (Streamlit)
- Monospace: IBM Plex Mono (labels, technical details, code references)

**Component patterns:**
- Cards with subtle gradient backgrounds matching their layer color
- Monospace uppercase labels with wide letter-spacing for section headers
- Consistency badges: green for consistent, rose for inconsistent
- Tool chain: vertical step list with spinner → checkmark transition
- Suggestion chips: pill-shaped with accent border, hover glow

---

## 8. Important Constraints & Naming

### Naming conventions 
- Plan name: "2026 Self-Funded Health Plan"
- Member ID prefix: "SFP-" 
- Employer: "Acme Industries, Inc." 
- State references: "your state's Department of Insurance" 
- All data is synthetic — explicitly stated in README and UI

### Compliance language
- Role boundary disclaimer must appear on every screen/view
- The system "interprets" — never "decides," "determines," or "adjudicates"
- Never promise financial outcomes
- Always cite SBC section by name
- Unknown codes must be rejected, never inferred

### Technical constraints
- FAISS graceful fallback — app must work fully without LangChain/FAISS installed
- No external API calls required — fully self-contained with local data files
- Vectorstore cached to disk after first build (`data/vectorstore/`)

---

## 9. File Inventory

| File | Type | Purpose |
|---|---|---|
| `app.py` | Python/Streamlit | Main application — ReconciliationAgent + dashboard UI |
| `data/denial_mapping.json` | JSON | Deterministic denial code → explanation bridge |
| `data/synthetic_sbc.md` | Markdown | Mock plan rules (SBC document) |
| `data/mock_eob.txt` | Text | Default EOB test case |
| `requirements.txt` | Text | Python dependencies |
| `member360_chat.jsx` | React | Agentic chat UI prototype |
| `member360_architecture.jsx` | React | Interactive architecture diagram |
| `member360_prototype.jsx` | React | Static dashboard prototype (original, pre-chat) |
| `member360_architecture_diagram.svg` | SVG | Static architecture diagram for LinkedIn/presentations |
| `README_github.md` | Markdown | Enhanced README for public GitHub repository |
| `Member360_LinkedIn_Content_Kit.docx` | Word | Video storyboard, content calendar, profile optimization |
| `post_1_demo_video.md` | Markdown | LinkedIn Post 1 — demo video with hook copy |
| `post_2_architecture.md` | Markdown | LinkedIn Post 2 — architecture deep-dive |
| `post_3_philosophy.md` | Markdown | LinkedIn Post 3 — role boundary thought leadership |

---

## 10. Expansion Opportunities

These are natural next steps if continuing development:

### Code enhancements
- Replace pre-scripted chat flows with actual LLM orchestration (LangChain Agent with tools)
- Add more denial codes to the mapping (CO-50, CO-45, CO-18, PI-* series)
- Implement real EOB file parsing (835/837 EDI transaction formats, not just text)
- Add multi-claim support (member has multiple denied claims)
- Build provider lookup integration (NPI registry API)
- Add appeal letter generation (structured document from claim + SBC data)

### Architecture extensions
- Kafka consumer for real-time EOB ingestion
- Accumulator API integration (real deductible/OOP data)
- Multi-plan SBC support (different SBCs for different plan tiers)
- Audit logging pipeline (every agent decision logged with citations)
- Member authentication and session management

### UX enhancements
- Mobile-responsive chat UI
- Voice input/output for accessibility
- Multi-language support (Spanish, Mandarin for diverse workforce)
- Email/SMS delivery of call scripts and action plans
- Calendar integration for follow-up reminders

### Analytics
- Denial pattern dashboard (most common codes, resolution rates)
- Member satisfaction scoring post-interaction
- Provider responsiveness tracking (did they resubmit?)
- Time-to-resolution metrics

---

## 11. How to Use This Context Document

**To continue development:** Paste this document into any LLM and ask it to extend or modify the codebase. The LLM will have full knowledge of the architecture, data models, naming conventions, and design constraints.

**To create presentations:** Reference sections 2 (Architecture), 4 (Design Principles), and 5 (Data Files) for slide content.

**To onboard a new engineer:** Sections 3 (Pipeline), 6 (Code Architecture), and 8 (Constraints) provide the technical onboarding path.

**To demo the prototype:** Section 6's conversation flow table shows the supported interactions and their trigger keywords.

**To extend the denial mapping:** Add a new entry to `denial_mapping.json` following the schema in Section 5, add a corresponding `## Section` to `synthetic_sbc.md`, and add reasoning logic to `ReconciliationAgent._reason()` in `app.py`.

---

*Last updated: March 2026. All data is synthetic. No real member, provider, or plan information is included.*
