
[IMAGE: License: Proprietary] (https://img.shields.io/badge/License-Proprietary-red.svg)

# ⚕ Member 360 — Agentic Experience Layer

> An interpretation layer that sits between a claims adjudication engine and the member it affects. It reads denial outcomes, identifies who is responsible, cites the plan rule that applies, and gives the member a clear path forward.

**One boundary this system respects:** Member 360 does not decide whether a claim is paid or denied. That decision belongs to the adjudication engine. This system reads that decision and explains it — accurately, consistently, and without guessing.

![Member 360 Solution Architecture](docs/architecture/member360_solution_architecture.png)

> **Try the interactive demo:** Clone the repo and run `./demo.sh` — no backend required, fully offline. Includes V1 single-claim and V2 multi-claim agentic chat.

---

## Table of Contents

- [Technical Design](docs/architecture/TECHNICAL_DESIGN.md)
- [The Problem](#the-problem)
- [The User Journey](#the-user-journey)
- [Phase 4 — Where Things Break Down](#phase-4--where-things-break-down)
- [Why Not Just Use an LLM?](#why-not-just-use-an-llm)
- [The Solution](#the-solution)
- [How the Pipeline Works](#how-the-pipeline-works)
- [Architecture](#architecture)
- [Design Principles](#design-principles)
- [Demo Walkthrough](#demo-walkthrough)
- [Quickstart](#quickstart)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Versions](#versions)
- [Roadmap](#roadmap)

---

## The Problem

Every year in the United States, more than 8.8 million in-network health insurance claims are denied. In 2025, the initial denial rate reached 11.8% — rising for the third consecutive year. Of everyone who receives a denied claim, fewer than 1% ever file an appeal. Of those who do appeal, 44% win.

Read that again: nearly half of all denied claims that get challenged are overturned. But only 1 in 100 people challenges a denial at all.

This is not because the other 99 people decided their claim was fair. It is because the process surrounding a denied claim — the documents, the codes, the phone calls, the paperwork — is difficult enough that most people give up before they start.

| Metric | Figure | Source |
|---|---|---|
| Denied in-network claims annually | 8.8M+ | CMS Transparency PUF, 2024 |
| Initial denial rate (3rd consecutive year of increase) | 11.8% | Experian Health, 2025 |
| Members who ever appeal a denial | < 1% | KFF, 2025 |
| Of those who appeal, how many win | 44% overturned | KFF, 2025 |
| Annual cost of overturning denials | $18B | AHA, 2025 |
| Members reporting care delays due to insurance issues | 28% | Experian Health, 2026 |

The gap is not medical. It is informational. A member who understands exactly what happened, exactly who is responsible, and exactly what to say gets a different outcome than a member who doesn't. Member 360 exists to close that gap.

---

## The User Journey

The experience of navigating employer-sponsored health benefits spans five phases. Four of them have received significant engineering investment over the past decade.

![Member Benefits Journey — All 5 Phases](docs/architecture/journey_map_overview.png)

| Phase | What Happens | Where Investment Has Gone |
|---|---|---|
| **1. Enroll** | Comparing plans, selecting coverage, enrolling dependents | Benefits portals, plan comparison tools, HR platforms |
| **2. Find Care** | Searching in-network providers, checking specialist coverage | Provider directories, carrier apps, telemedicine |
| **3. Get Care** | Appointments, tests, procedures | Digital ID cards, patient portals, check-in systems |
| **4. Understand the Bill** | Reading EOBs, tracking deductible, reconciling provider bills | **Almost nothing. This is the gap.** |
| **5. Manage Ongoing** | HSA/FSA contributions, wellness programs, next enrollment prep | Spending account platforms, wellness apps, benefits portals |

Phase 4 is the one where a member receives a document called an Explanation of Benefits (EOB). It arrives by mail or email after a claim is processed. It contains denial codes, adjustment amounts, coinsurance breakdowns, and remark codes — written in the language of insurance administration, not the language of a person who just had surgery and is trying to figure out what they owe.

---

## Phase 4 — Where Things Break Down

![Phase 4 Deep Dive: The Friction Zone](docs/architecture/phase4_friction_deep_dive.png)

A single medical visit can produce three or four separate EOBs — one for the facility fee, one for the professional fee, one for imaging, one for lab work. Each is billed separately. Each may have a different adjudication outcome.

When a claim is denied, the EOB shows a code like **CO-197**. That code has an official definition: *Prior Authorization Required — Authorization Not Obtained*. But the EOB does not tell you:

- Whether the provider forgot to request authorization, or whether the plan never responded to the request
- Whether you — the member — are responsible for fixing this, or whether the provider's billing department is
- Whether there is an appeal deadline, and if so, when it expires
- What to say when you call, or who to call first

So a member who just received a denied claim, who is already managing a medical situation, must now:

1. Decode the denial code independently
2. Figure out whose responsibility it is to resolve
3. Call the right party with the right information
4. Know what to ask for, and how to ask for it
5. Track whether it gets resolved, and follow up if it doesn't

Most people don't. Not because they don't care about money, but because the system gives them no foothold.

### What happens to denied claims

| What happens | How often |
|---|---|
| Never appealed | More than 99% of denied claims |
| Appealed — and overturned | 44% of the tiny fraction that are challenged |
| Member gives up after the first call | Majority of those who try |
| Care delayed or deferred due to billing confusion | 28% of patients |

---

## Why Not Just Use an LLM?

This is the right question to ask before building anything in this space, and it deserves a straight answer.

Large language models are genuinely good at conversation. They understand context, handle follow-up questions, and can explain complex ideas in plain language. For the conversational part of claims advocacy — answering a member's follow-up questions, rephrasing an explanation, guiding someone through a call — a language model is the right tool.

But the first two steps of claims interpretation are not conversation problems. They are precision problems.

**Step 1: What does this denial code mean?**

CARC code CO-197 has one meaning. It is not open to inference. If a model reads CO-197 and produces an explanation that is close but slightly wrong, the member might:

- Call the wrong party (the plan instead of the provider, or vice versa)
- Ask for the wrong type of correction
- Miss an appeal deadline by pursuing the wrong resolution
- Believe they owe money they don't, or not realize they have a right to dispute

In a healthcare context, a confidently wrong answer is not a UX problem. It is a potential compliance event that causes financial harm to a real person managing a medical situation. The cost of being wrong is not a frustrated user — it is a member who loses an appeal they could have won, or pays a bill that wasn't theirs to pay.

**Step 2: Does this denial make sense against the member's plan?**

Whether a denial is consistent with the member's Summary of Benefits and Coverage is a logical comparison between two sets of data. Either the prior auth requirement was waived because the service was in an ER, or it wasn't. Either the filing deadline has passed, or it hasn't. Either the denial code is appropriate given the SBC rules, or it isn't.

These are binary checks. Letting a model infer them introduces the possibility of false positives — telling a member they're covered when they're not — and false negatives — telling a member they have to pay when their plan says otherwise. Both cause real harm.

**What the architecture does instead**

| What the system needs to do | Approach | Why |
|---|---|---|
| Decode a denial code | Deterministic JSON lookup | Codes have exact meanings. Inference introduces error where error causes harm. |
| Retrieve the applicable plan rule | Scoped RAG — retrieval constrained to one SBC section | Prevents hallucinated citations. The section name comes from the code lookup, not the model. |
| Determine action ownership | Rule-based logic | Facility checks, timeline validation, and exception rules are deterministic, not probabilistic. |
| Explain it to the member conversationally | LLM-ready conversation layer | Natural language, nuance, and follow-up questions are exactly what models handle well. |

The hard constraint enforced in code: if a denial code is not in the mapping, the system does not attempt to interpret it. It returns a specific message telling the member it cannot interpret this claim and directs them to Member Services. A confident wrong answer causes harm. A clear acknowledgment of the limit does not.

This is the core design decision: treat accuracy as a hard requirement in the places where accuracy matters, and use language models in the places where they are genuinely the right tool.

---

## The Solution

Member 360 is an agentic experience layer that sits on top of an existing claims adjudication platform. It does not replace the adjudication engine and does not influence its decisions. It reads the output the engine has already produced and translates it into something a member can act on.

**The pipeline:**

```
EOB Text → Parse → Lookup Denial Code → Retrieve Plan Rule → Reason → Member Output
```

**What the member receives for every claim:**

- **Why it happened** — A plain-English explanation of the denial, without jargon or codes
- **Who is responsible** — Whether this is the provider's problem to fix, the member's, or the plan's
- **What to say** — A word-for-word call script with the claim ID, date of service, and provider NPI already filled in
- **What to expect financially** — Current deductible status, out-of-pocket progress, and what the member actually owes
- **How to appeal** — Deadlines, the SBC section to cite, and the escalation path if the first call doesn't resolve it

---

## How the Pipeline Works

### Step 1 — Parse the EOB

`EOBParser` reads raw EOB text and extracts structured fields: denial code, service type, facility type, billed amount, allowed amount, member share, dates of service, and provider NPI. The output is a typed `EOBRecord` — a consistent data structure the rest of the pipeline depends on.

### Step 2 — Look Up the Denial Code

The extracted denial code is matched against `denial_mapping.json` — a hand-curated map of CARC codes to plain-language explanations, action owners, applicable SBC sections, and call scripts.

Hard constraint: if the code is not in the mapping, the pipeline stops and returns `cannot_interpret`. The system never guesses.

### Step 3 — Retrieve the Plan Rule

`SBCRetriever` uses the `sbc_section` field from the denial mapping to pull the specific section of the plan's Summary of Benefits and Coverage that applies to this denial. Retrieval is constrained — it pulls one named section, not an open-ended search. The section name comes from the code lookup in step 2, not from a model.

The architecture is FAISS/vector store ready. The current build uses a deterministic fallback against `synthetic_sbc.md`.

### Step 4 — Reason Against the Plan Rules

`ReconciliationAgent` compares the parsed EOB against the retrieved SBC rules and runs a set of deterministic checks:

- **ER exception check** — If the denial involves prior authorization but the service was rendered in an emergency room, certain plans waive the requirement. The system checks this explicitly.
- **Filing deadline check** — Has the appeal deadline passed? If so, the resolution path changes.
- **Consistency check** — Is the denial consistent with what the SBC says about this service, or is something wrong on the plan's side?
- **Action assignment** — Based on the above: Provider, Member, or Plan?

### Step 5 — Generate the Member Output

The pipeline produces a unified resolution statement covering all five member outputs listed above. Every step is logged and visible to the member in real time through an animated tool-chain component:

```
→ Reading EOB...          [Claim #MBR-001 · CO-197 · MRI Knee]
→ Looking up denial...    [CO-197: Prior Authorization Absent]
→ Retrieving plan rule... [SBC Section: Advanced Imaging]
→ Reasoning...            [Facility: Outpatient · Auth required]
→ Generating script...    [Action owner: Provider]
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND  —  React SPA (CDN, no build step)                    │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │  Chat Agent       │  │  Dashboard        │  │  Reconcile   │  │
│  │  7 flows          │  │  Members · Claims │  │  Tool        │  │
│  └────────┬──────────┘  └────────┬──────────┘  └──────┬───────┘  │
│                          REST API (FastAPI)                      │
├─────────────────────────────────────────────────────────────────┤
│  BACKEND — FastAPI                                              │
│  EOBParser · DenialLookup · SBCRetriever                        │
│  ReconciliationAgent · ChatAgent (7 scripted flows)             │
├─────────────────────────────────────────────────────────────────┤
│  DATA LAYER — one swap point for real data                      │
│  synthetic_data.py  ←  replace this file only                   │
│  denial_mapping.json  ←  CARC codes → plain language + scripts  │
├─────────────────────────────────────────────────────────────────┤
│  FUTURE INTEGRATION  (no other code changes needed)             │
│  Adjudication Engine  ·  Member DB  ·  Plan Document Store      │
└─────────────────────────────────────────────────────────────────┘
```

Also available as an SVG: [`docs/architecture/member360_architecture_diagram.svg`](docs/architecture/member360_architecture_diagram.svg)

The data layer is fully isolated. Every router, service, and frontend component is built against stable Pydantic interfaces. When the time comes to connect real data sources, `synthetic_data.py` is the only file that changes.

---

## Design Principles

These are not aspirational statements. They are enforced in the code.

| Principle | What it means in practice |
|---|---|
| **Never guess** | Unknown denial codes return an explicit cannot-interpret response. The system does not attempt inference. |
| **Always cite** | Every response referencing a plan rule names the SBC section it came from. The member can verify independently. |
| **Stay in your lane** | The system interprets adjudication outcomes — it does not override them. A disclaimer appears on every screen. |
| **Show your work** | Every pipeline step — parse, lookup, retrieve, reason — is visible to the member in real time. |
| **One swap point** | All synthetic data is isolated to `synthetic_data.py`. No other file changes for real data integration. |
| **Small files** | No file in this codebase exceeds 600 lines. Routers hold no business logic. Services hold no HTTP concerns. |

---

## Demo Walkthrough

The offline demo requires no backend and no internet connection.

```bash
git clone https://github.com/sandeepbarhanpure-ui/member-360-agentic-experience-layer.git
cd member-360-agentic-experience-layer
./demo.sh
# Opens at http://127.0.0.1:8888
```

### V2 — Multi-Claim Agentic Chat

The V2 demo puts the agent in front of a member navigating five active claims simultaneously — covering the most common scenarios in claims advocacy:

| # | Status | Service | Member Owes | What this scenario covers |
|---|---|---|---|---|
| 1 | DENIED | MRI — Right Knee | $1,250 | Prior auth missing (CO-197) — provider's problem to fix |
| 2 | APPROVED | Annual Wellness | $0.00 | Preventive care — covered 100%, nothing to do |
| 3 | PARTIAL | Physical Therapy x6 | $220 | Benefit limit reached (CO-45) — member's cost, explained clearly |
| 4 | PENDING | Dermatology Visit | TBD | Network status being verified — what to watch for |
| 5 | DENIED | ER Visit | $2,800 | No Surprises Act — plan may owe a correction |

For each claim: **why it happened → who is responsible → what to say → what you owe → how to appeal**.

### V1 — Single Claim Advocacy

A focused flow for one denied MRI claim. Shows the full tool-chain animation, denial card, call script generator, and financial summary. The best place to start if you want to understand the core pipeline.

---

## Quickstart

### Full App — FastAPI + React (v2)

```bash
git clone https://github.com/sandeepbarhanpure-ui/member-360-agentic-experience-layer.git
cd member-360-agentic-experience-layer/backend

python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

uvicorn app.main:app --reload --port 3000
```

Open `http://localhost:3000` — four pages:

| Page | What it does |
|---|---|
| **Chat Agent** | Conversational UI — 7 flows, animated tool-chain visualization |
| **Dashboard** | Members table, claims table, denial metrics |
| **Reconcile Tool** | Paste any EOB text → full reconciliation analysis |
| **Denial Codes** | All supported CARC codes in plain English |

Swagger UI at `http://localhost:3000/docs`.

### Offline Demo (no backend needed)

```bash
./demo.sh   # opens at http://127.0.0.1:8888
```

---

## API Endpoints

| Endpoint | Method | What it does |
|---|---|---|
| `/api/health` | GET | System health check |
| `/api/members` | GET | List all members |
| `/api/members/{id}` | GET | Get a single member profile |
| `/api/claims` | GET | List claims (filter with `?member_id=`) |
| `/api/denial-codes` | GET | All recognized CARC codes |
| `/api/reconcile` | POST | Full reconciliation pipeline for an EOB |
| `/api/chat` | POST | Send a chat message, receive agent response |
| `/api/chat/greeting` | GET | Initial member greeting |
| `/docs` | GET | Auto-generated Swagger UI |

```bash
# Run the reconciliation pipeline
curl -X POST http://localhost:3000/api/reconcile \n  -H "Content-Type: application/json" \n  -d '{"eob_text": "CLAIM STATUS: DENIED\nCode: CO-197\nService: MRI Knee"}'

# Send a chat message to the agent
curl -X POST http://localhost:3000/api/chat \n  -H "Content-Type: application/json" \n  -d '{"message": "Why was my MRI claim denied?"}'
```

---

## Supported Denial Codes

| Code | Plain-Language Reason | Action Owner |
|---|---|---|
| CO-197 | Prior Authorization Not Obtained | Provider |
| CO-16 | Missing or Incomplete Medical Records | Provider |
| CO-4 | Procedure-Modifier Inconsistency | Provider |
| CO-29 | Filing Deadline Exceeded | Provider |
| CO-45 | Benefit Limit Reached | Member |
| PR-1 | Member Deductible Applies | Member |
| PR-2 | Coinsurance Applies | Member |

---

## Project Structure

```
member-360-agentic-experience-layer/
│
├── backend/                          # FastAPI application
│   ├── app/
│   │   ├── main.py                   # Entry point, router registration
│   │   ├── routers/                  # HTTP layer — no business logic here
│   │   │   ├── members.py
│   │   │   ├── claims.py
│   │   │   ├── reconcile.py
│   │   │   └── chat.py
│   │   ├── services/                 # Business logic
│   │   │   ├── eob_parser.py         # EOB text → EOBRecord
│   │   │   ├── denial_lookup.py      # CARC code → DenialMapping
│   │   │   ├── sbc_retriever.py      # Plan rule retrieval (FAISS-ready)
│   │   │   ├── reconciliation.py     # Core reasoning pipeline
│   │   │   ├── chat_agent.py         # 7 conversation flows
│   │   │   └── synthetic_data.py     # ← swap this one file for real data
│   │   └── models/
│   │       └── schemas.py            # Pydantic models
│   └── data/
│       ├── denial_mapping.json       # CARC → plain-language + scripts
│       ├── mock_eob.txt              # Sample EOB for testing
│       └── synthetic_sbc.md          # Mock Summary of Benefits and Coverage
│
├── frontend/                         # React SPA — CDN-loaded, no build step
│   ├── index.html
│   └── components/
│       ├── app_shell.jsx             # 4-page app shell + routing
│       ├── chat.jsx                  # Chat Agent page
│       ├── chat_ui.jsx               # Message bubbles, suggestion chips
│       ├── chat_cards.jsx            # DenialCard, FinancialCard, TimelineCard
│       ├── chat_tools.jsx            # Tool-chain visualization
│       └── member_panel.jsx          # Member context sidebar
│
├── prototypes/
│   └── demo/                         # Offline demo — no server, no internet
│       ├── index.html                # Demo landing page
│       ├── chat.html                 # V1 single-claim demo
│       ├── chat_v2.html              # V2 multi-claim agentic chat
│       └── ...                       # JSX components and vendor libs
│
├── docs/
│   ├── architecture/
│   │   ├── TECHNICAL_DESIGN.md       # Architecture decisions, data model, component specs
│   │   ├── member360_solution_architecture.png
│   │   ├── journey_map_overview.png
│   │   ├── phase4_friction_deep_dive.png
│   │   └── member360_architecture_diagram.svg
│   └── product/
│       ├── PRODUCT_THINKING.md       # Full product context and patient journey
│       └── ROADMAP.md                # Proposed next steps
│
├── archive/
│   └── v1-streamlit/                 # Original prototype — preserved, not deleted
│       ├── app.py                    # 850-line Streamlit monolith
│       └── README-original.md
│
├── tests/
│   └── test_agent.py
│
├── demo.sh                           # One-command demo launcher
├── README.md
└── LICENSE
```

---

## Tech Stack

### v2 — Current

| Layer | Technology |
|---|---|
| Backend | FastAPI · Python 3.11+ · Pydantic v2 |
| Frontend | React 18 (CDN) · Tailwind CSS · Babel (in-browser transpile) |
| Retrieval | Deterministic JSON lookup · FAISS/LangChain ready |
| Data | Synthetic JSON fixtures — isolated to one file |
| API Docs | Auto-generated Swagger UI via FastAPI |
| Deployment | uvicorn (dev) · Docker-ready |

### v1 — Archived

| Layer | Technology |
|---|---|
| Backend | Streamlit · LangChain · Python |
| Retrieval | FAISS · HuggingFace Embeddings (all-MiniLM-L6-v2) |
| Frontend | React JSX prototypes (standalone HTML files) |

---

## Versions

### v2 — Current (FastAPI + React SPA)

- 9 API endpoints, all returning typed Pydantic responses
- 7 chat conversation flows with fuzzy intent matching
- Animated tool-chain — every reasoning step visible to the member in real time
- V2 multi-claim demo — 5 simultaneous claims, per-claim conversation state
- All files under 600 lines — routers, services, and models are cleanly separated

### v1 — Archived (Streamlit)

The original working prototype — a single 850-line `app.py` that proved the concept. It used FAISS with real vector embeddings (HuggingFace all-MiniLM-L6-v2) for plan rule retrieval. The foundation that everything else was built on. Preserved in `archive/v1-streamlit/`, never deleted.

---

## Roadmap

See [`docs/product/ROADMAP.md`](docs/product/ROADMAP.md) for full engineering proposals on each.

| Phase | What it involves | Effort |
|---|---|---|
| **1** | Swap `synthetic_data.py` for real DB queries | Low — one file |
| **2** | Real SBC documents via SharePoint, S3, or a vector DB | Medium |
| **3** | LLM integration for the conversation layer (OpenAI, Anthropic, etc.) | Medium |
| **4** | Auth, audit logging, CI/CD, Docker, load testing | High |
| **5** | 835 EDI transaction parsing · RARC code support · appeals automation | High |

---

## License

MIT

---

*Built with synthetic data. No real member, provider, or plan information is used anywhere in this repository. All denial codes, plan rules, member profiles, and EOB records are fabricated for demonstration purposes only.*
