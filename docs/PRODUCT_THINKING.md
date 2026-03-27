# Patient Journey & Product Thinking

## 1. The Full Journey — 5 Phases of Benefits Navigation

The patient journey spans five phases: **Enrollment → Finding Care → Receiving Care → Claims & Billing → Ongoing Management**. Most healthtech investment has focused on Phases 1–3 (enrollment platforms, provider directories, telemedicine). Phase 4 — the post-care financial experience — remains the most painful and least addressed.

| Phase | Primary Friction |
|---|---|
| 1. Enroll in Benefits | Plans are confusing — members can't meaningfully compare options |
| 2. Find & Access Care | Outdated directories, unclear referral and prior auth requirements |
| 3. Get Medical Care | Minimal friction — this is the phase the system is optimized for |
| **4. Understand & Pay Bills** | **Highest friction — cryptic denial codes, confusing EOBs, no guidance** |
| 5. Ongoing Management | Disconnected systems, no feedback loop to enrollment decisions |

---

## 2. Phase 4 Deep Dive — The Friction Zone

### Why EOBs Fail the Member

When a claim is processed, the member receives an Explanation of Benefits. This is the primary communication between the adjudication system and the person it affects — and it is nearly incomprehensible.

**The four patient challenges:**

| Challenge | What Happens |
|---|---|
| Confusing Documentation | Multiple EOBs per visit, jargon terminology, no plain-language explanation |
| Out-of-Network Surprise | Specialist wasn't in-network — facility was, but anesthesiologist wasn't |
| Claim Denied (Pre-Auth) | Prior authorization missing — provider didn't file, or plan didn't respond |
| Reconciliation Mismatch | EOB says one amount, provider bill says another, member can't reconcile |

### The Manual Resolution Path (Without Member 360)

Today's resolution is entirely member-initiated:

1. **Review EOB & Bill** — compare documents at home
2. **Research & Clarification** — call carrier and provider (60% abandon at 1+ min hold)
3. **Appeals & Reconciliation** — file appeal or request corrections (<1% of members reach this step)
4. **Final Payment** — pay via HSA/FSA portal or provider billing site

The system places the entire burden on the person with the least context, the least leverage, and the least time.

---

## 3. The Member 360 Solution — Agentic Advocate

### The 4-Step Agent Pipeline

| Step | What Happens | Code Implementation |
|---|---|---|
| 1. Data Ingest & Parsing | Extract denial codes, service type, amounts from EOB | `EOBParser.parse()` in `app.py` |
| 2. Profile Validation | Check member profile, route to human escalation if needed | Profile quality scoring |
| 3. Rules (RAG) | Query plan SBC for the specific rule that applies | `SBCRetriever.retrieve()` — FAISS + deterministic fallback |
| 4. Reasoning & Advocacy | Analyze benefits, validate network status, assign action ownership | `ReconciliationAgent._reason()` — rule-based logic |

### What the Member Gets

Instead of navigating the manual resolution path, the agent produces:

- **Plain-English explanation** — what happened and why
- **Action ownership** — provider's job, member's job, or plan's job
- **Resolution script** — word-for-word call script with claim details pre-filled
- **Financial context** — deductible status, OOP progress, potential savings
- **SBC citation** — the exact plan rule referenced, by section name

### Design Constraints

| Constraint | How It's Enforced |
|---|---|
| Anti-hallucination | Unknown codes rejected. SBC sections cited by name. RAG retrieval status visible. |
| Role boundary | "Interpretation layer only" disclaimer on every screen. Never overrides adjudication. |
| Deterministic-first | Denial code lookup is JSON, not inference. RAG is scoped, not open-ended. Reasoning is rule-based. |
| Auditable pipeline | Every step logged and visible via tool chain visualization. |

---

## Mapping to the Codebase

| Concept in These Diagrams | File / Class |
|---|---|
| EOB Anatomy & Parsing | `EOBParser` in `app.py` |
| Denial Code Lookup | `data/denial_mapping.json` |
| SBC Rule Retrieval (RAG) | `SBCRetriever` in `app.py` |
| Consistency Reasoning | `ReconciliationAgent._reason()` in `app.py` |
| Resolution Script | `DenialMapping.script` field |
| Tool Chain Visibility | `ToolChain` component in `prototypes/member360_chat.jsx` |
| Architecture Diagram | `prototypes/member360_architecture.jsx` |

---

## Sources

- CMS Transparency in Coverage PUF, 2024
- KFF Claims Denials & Appeals Analysis, 2025
- AHA Costs of Caring Report, 2025
- Experian Health State of Claims Survey, 2025
- Experian Health State of Patient Access Survey, 2026

---

*All data in this project is synthetic. No real member, provider, or plan information is used.*
