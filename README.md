# ⚕ Member 360 — Agentic Experience Layer

> An AI-powered interpretation layer for health plan claims that translates cryptic adjudication outcomes into plain-English member advocacy — with cited plan rules, deterministic guardrails, and actionable next steps.

**This system does not decide if a claim is paid.** It reads the outcome from the adjudication engine and translates it for the member with precision, consistency, and zero hallucination tolerance.

![Member 360 Solution Architecture](docs/architecture/member360_solution_architecture.png)

>  **Try the interactive demo:** Clone the repo and run `./demo.sh` — no backend required, fully offline. Includes V1 and V2 multi-claim agentic chat UI.

---

## Table of Contents

- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [What Makes This Different](#what-makes-this-different)
- [Architecture](#architecture)
- [Design Principles](#design-principles)
- [Demo Walkthrough](#demo-walkthrough)
- [Quickstart](#quickstart)
- [How It Works](#how-it-works)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Versions](#versions)
- [Roadmap](#roadmap)

---

## The Problem

The healthcare benefits journey has five phases. Phases 1–3 and 5 have seen enormous investment — enrollment platforms, provider directories, telemedicine, wellness apps. **Phase 4 — understanding and paying bills — remains largely unsolved.**

![User Journey: Navigating Benefits & Healthcare](docs/architecture/journey_map_overview.png)

When a claim is processed, the member receives an Explanation of Benefits (EOB). This document is the primary communication channel between the adjudication system and the human it affects. It is nearly incomprehensible.

![Phase 4 Deep Dive: The Friction Zone](docs/architecture/phase4_friction_deep_dive.png)

### The Scale of the Problem

| Metric | Data |
|---|---|
| Denied in-network claims annually | 8.8M+ (CMS Transparency PUF, 2024) |
| Initial denial rate, rising 3rd consecutive year | 11.8% (Experian Health, 2025) |
| Patients who ever appeal a denial | < 1% (KFF, 2025) |
| Of those who do appeal, how many win | 44% overturned (KFF, 2025) |
| Annual cost of overturning denials | $18B, 70% eventually paid (AHA, 2025) |
| Patients reporting care delays from insurance issues | 28% (Experian, 2026) |

**The core failure:** Resolution requires awareness (knowing something is wrong), persistence (making multiple calls), and domain knowledge (understanding CARC codes, SBC rules, and appeal rights). The system places the entire burden on the person with the least context.

---

## The Solution

Member 360 is an agentic experience layer that sits **on top** of an existing claims adjudication platform. It does not replace the adjudication engine — it interprets its output and translates it for the member.

**The 5-step pipeline:**

```
EOB Input → Parse → Lookup Denial Code → Retrieve Plan Rule (RAG) → Reason → Member Advocacy Output
```

**The output for every claim:**
-  **The Why** — Plain-English explanation of exactly what happened
-  **The SBC Citation** — The exact plan rule that applies, by section name
-  **Action Ownership** — Is this the provider’s problem to fix, or the member’s?
-  **Call Script** — Word-for-word script with claim ID, DOS, and provider NPI pre-filled
-  **Financial Context** — Deductible status, OOP progress, what you actually owe
-  **Appeal Guidance** — Deadlines, next steps, escalation paths

---

## What Makes This Different

### Deterministic + RAG Hybrid — Not Pure LLM

Healthcare claims have zero tolerance for hallucination. If the system tells a member “this is the provider’s responsibility” when it’s actually a deductible charge, that’s a compliance problem — not a UX issue.

The architecture enforces precision where it matters:

| Layer | Approach | Why |
|---|---|---|
| Denial code → explanation | Deterministic JSON lookup | Codes have exact meanings — inference is wrong here |
| Plan rule retrieval | Scoped RAG (section-level) | Retrieves only the SBC section cited by the denial mapping |
| Consistency reasoning | Rule-based logic | Facility checks, timeline validation, action ownership |
| Member conversation | LLM-ready experience layer | Natural language, follow-ups, personalized scripts |

**Hard constraint enforced in code:** If a denial code is not in the mapping, the system says “I cannot interpret this claim” and directs the member to contact Member Services. It never guesses.

### The Swap Point Architecture

The entire data layer is isolated to a single file: `synthetic_data.py`. Every router, service, and frontend component is built against stable Pydantic interfaces. Replacing synthetic data with real DB queries is a **one-file swap** — nothing else changes.

```
synthetic_data.py  ←  the only file that changes for real data integration
     ↓
  MemberProfile  →  routers  →  frontend
  ClaimSummary   →  services
  DenialMapping  →  chat agent
```

### Auditable Pipeline

Every step of the reasoning process is logged and **visible to the member in real-time** via an animated tool-chain component. The member sees exactly what the agent is doing:

```
→ Reading EOB...         [Claim #MBR-001 · CO-197 · MRI Knee]
→ Looking up denial...   [CO-197: Prior Authorization Absent]
→ Retrieving plan rule.. [SBC Section: Advanced Imaging]
→ Reasoning...          [Facility: Outpatient · Auth required]
→ Generating script...  [Action owner: Provider]
```

---

## Architecture

### v2 — Scaled Production Architecture (Current)

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND  —  React SPA (CDN, no build step)                    │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐  │
│  │  Chat Agent    │ │  Dashboard     │ │  Reconcile    │  │
│  │  (Agentic UI)  │ │  (Members /   │ │  Tool         │  │
│  │  7 flows       │ │   Claims)     │ │  (Power user) │  │
│  └───────┬───────┘ └───────┬───────┘ └───────┬───────┘  │
│                  └─────────┬─────────┘                   │
│                            REST API (FastAPI)                  │
├───────────────────────────────┬─────────────────────────────────┤
│  BACKEND — FastAPI                      │                     │
│  Routers (HTTP layer)                   │  Services           │
│  /members /claims /reconcile /chat      │  EOB Parser         │
│                                         │  Denial Lookup      │
│  ReconciliationAgent                    │  SBC Retriever      │
│  Parse→Lookup→Retrieve→Reason→Advocate  │  Chat Agent         │
├───────────────────────────────┴─────────────────────────────────┤
│  DATA LAYER — Swappable                                         │
│  synthetic_data.py  ←  swap this one file for real data        │
│  denial_mapping.json  ←  CARC/RARC → plain-language mapping    │
├─────────────────────────────────────────────────────────────────┤
│  INTEGRATION POINTS (future — nothing else changes)             │
│  Adjudication Engine  ·  Member DB  ·  Plan Document Store      │
└─────────────────────────────────────────────────────────────────┘
```

Also available as an SVG: [`docs/architecture/member360_architecture_diagram.svg`](docs/architecture/member360_architecture_diagram.svg)

---

## Design Principles

| Principle | Implementation |
|---|---|
| **Anti-Hallucination** | Unknown denial codes return an explicit “cannot interpret” response. SBC sections are always cited by name. Never infers. |
| **Role Boundary** | Interprets adjudication outcomes but never overrides them. A persistent disclaimer appears on every screen. |
| **Deterministic + RAG Hybrid** | JSON lookup for precision on codes. Vector search for contextual plan rule retrieval. Best of both. |
| **Auditable Pipeline** | Every reasoning step — parse, lookup, retrieve, reason — is logged and visible to the member in real-time. |
| **Single Swap Point** | All data is isolated to `synthetic_data.py`. Swap it for real queries and the entire system follows. |
| **Clean Architecture** | All files under 600 lines. Clear separation: routers / services / models. No tangled concerns. |

---

## Demo Walkthrough

The offline demo (`./demo.sh`) requires no backend and no internet. It runs directly in the browser.

### V2 — Multi-Claim Agentic Chat

The V2 demo shows an agent helping a member navigate **5 simultaneous active claims**:

| Claim | Status | Service | Member Owes | Key Scenario |
|---|---|---|---|---|
| #1 | DENIED | MRI — Right Knee | $1,250 | Prior auth missing — CO-197 |
| #2 | APPROVED | Annual Wellness | $0.00 | Preventive care covered 100% |
| #3 | PARTIAL | Physical Therapy x6 | $220 | CO-45 — benefit limit reached |
| #4 | PENDING | Dermatology Visit | TBD | Network status check needed |
| #5 | DENIED | ER Visit | $2,800 | No Surprises Act application |

For each claim, the agent walks through: **why it happened → who’s responsible → what to say → what you owe → how to appeal**.

### V1 — Single Claim Advocacy
Focused flow for a single denied MRI claim. Shows the full tool-chain animation, denial card, call script generator, and financial summary.

```bash
# Run the demo (macOS)
git clone https://github.com/sandeepbarhanpure-ui/member-360-agentic-experience-layer.git
cd member-360-agentic-experience-layer
./demo.sh
# Browser opens at http://127.0.0.1:8888
```

---

## Quickstart

### Backend + Full App (v2 — FastAPI + React)

```bash
git clone https://github.com/sandeepbarhanpure-ui/member-360-agentic-experience-layer.git
cd member-360-agentic-experience-layer/backend

python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

uvicorn app.main:app --reload --port 3000
```

Open `http://localhost:3000` — you’ll land on a 4-page React app:

| Page | What it does |
|---|---|
| **Chat Agent** | Conversational UI with 7 flows and animated tool-chain visualization |
| **Dashboard** | Members table, claims table, denial metrics |
| **Reconcile Tool** | Paste any EOB text → get full reconciliation analysis |
| **Denial Codes** | Reference guide: all recognized CARC codes in plain English |

API docs auto-generated at `http://localhost:3000/docs`.

### Offline Demo (no backend needed)

```bash
./demo.sh   # opens browser at http://127.0.0.1:8888
```

---

## How It Works

### Step 1 — Ingest
The `EOBParser` reads raw EOB text and extracts structured fields: denial code, service type, facility, billed/allowed/member amounts, dates, and provider NPI.

### Step 2 — Lookup
The denial code is matched against `denial_mapping.json`. **Hard constraint:** if the code is not in the mapping, the system returns `cannot_interpret` and directs the member to contact Member Services. It never guesses.

### Step 3 — RAG Retrieval
`SBCRetriever` uses the `sbc_section` field from the denial mapping to scope retrieval to the exact plan rule that applies. Currently deterministic fallback; architecture is FAISS/vector store ready.

### Step 4 — Reasoning
`ReconciliationAgent` compares EOB fields against the retrieved SBC text:
- Checks facility type against exception rules (e.g., ER waiver for prior auth)
- Validates service dates against filing deadlines
- Determines consistency with plan rules
- Assigns action ownership: **Provider** vs. **Member** vs. **Plan**

### Step 5 — Output
The system produces a unified resolution statement:
- **Plain-English explanation** of what happened and why
- **Personalized call script** with claim ID, date of service, and provider NPI pre-filled
- **Step-by-step action plan** with deadlines
- **SBC section citation** so the member can verify independently
- **Financial reconciliation** across deductible, coinsurance, and OOP max

---

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | System health check |
| `/api/members` | GET | List all members |
| `/api/members/{id}` | GET | Get single member profile |
| `/api/claims` | GET | List claims (`?member_id=...`) |
| `/api/denial-codes` | GET | All recognized CARC codes |
| `/api/reconcile` | POST | Full reconciliation pipeline for an EOB |
| `/api/chat` | POST | Chat message → agent response |
| `/api/chat/greeting` | GET | Initial member greeting |
| `/docs` | GET | Auto-generated Swagger UI |

```bash
# Reconcile an EOB
curl -X POST http://localhost:3000/api/reconcile \n  -H "Content-Type: application/json" \n  -d '{"eob_text": "CLAIM STATUS: DENIED\nCode: CO-197\nService: MRI Knee"}'

# Chat with the agent
curl -X POST http://localhost:3000/api/chat \n  -H "Content-Type: application/json" \n  -d '{"message": "Why was my MRI claim denied?"}'
```

---

## Supported Denial Codes

| Code | Plain-Language Reason | Action Owner |
|---|---|---|
| CO-197 | Prior Authorization Absent | Provider |
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
├── backend/                         # FastAPI application
│   ├── app/
│   │   ├── main.py                  # Entry point, router registration
│   │   ├── routers/                 # HTTP layer (thin — no business logic)
│   │   │   ├── members.py
│   │   │   ├── claims.py
│   │   │   ├── reconcile.py
│   │   │   └── chat.py
│   │   ├── services/                # Business logic
│   │   │   ├── eob_parser.py        # EOB text → structured EOBRecord
│   │   │   ├── denial_lookup.py     # CARC code → DenialMapping
│   │   │   ├── sbc_retriever.py     # Plan rule retrieval (RAG-ready)
│   │   │   ├── reconciliation.py    # Core reasoning pipeline
│   │   │   ├── chat_agent.py        # 7 conversation flows
│   │   │   └── synthetic_data.py    # ← SWAP THIS for real data
│   │   └── models/
│   │       └── schemas.py           # Pydantic models
│   └── data/
│       ├── denial_mapping.json      # Deterministic CARC → explanation
│       ├── mock_eob.txt             # Sample EOB for testing
│       └── synthetic_sbc.md         # Mock Summary of Benefits and Coverage
│
├── frontend/                        # React SPA (CDN-loaded, no build step)
│   ├── index.html
│   └── components/
│       ├── app_shell.jsx            # 4-page app shell + routing
│       ├── chat.jsx                 # Chat Agent page
│       ├── chat_ui.jsx              # Message bubbles, suggestion chips
│       ├── chat_cards.jsx           # DenialCard, FinancialCard, TimelineCard
│       ├── chat_tools.jsx           # Tool-chain visualization
│       └── member_panel.jsx         # Member context sidebar
│
├── prototypes/
│   └── demo/                        # Offline demo kit (no server, no internet)
│       ├── index.html               # Demo hub landing page
│       ├── chat.html                # V1 — single-claim chat demo
│       ├── chat_v2.html             # V2 — multi-claim agentic chat
│       ├── member360_chat.jsx       # V1 components
│       ├── member360_chat_v2.jsx    # V2 components
│       ├── member360_chat_v2_data.jsx  # V2 data layer (5 claims + flows)
│       ├── member360_prototype.jsx  # Dashboard prototype
│       ├── member360_architecture.jsx  # Architecture diagram prototype
│       └── start_demo.sh
│
├── docs/
│   ├── architecture/
│   │   ├── member360_solution_architecture.png  # Hero diagram
│   │   ├── journey_map_overview.png             # 5-phase patient journey
│   │   ├── phase4_friction_deep_dive.png        # EOB friction analysis
│   │   └── member360_architecture_diagram.svg   # Technical architecture SVG
│   └── product/
│       ├── PRODUCT_THINKING.md      # Full product context & patient journey
│       └── ROADMAP.md               # Proposed enhancements
│
├── archive/
│   └── v1-streamlit/              # Original prototype (archived, not deleted)
│       ├── app.py                   # 850-line Streamlit monolith (v1)
│       └── README-original.md
│
├── tests/
│   └── test_agent.py
│
├── demo.sh                          # One-command demo launcher
├── README.md
└── LICENSE
```

---

## Tech Stack

### v2 (Current)

| Layer | Technology |
|---|---|
| Backend | FastAPI · Python 3.11+ · Pydantic v2 |
| Frontend | React 18 (CDN) · Tailwind CSS · Babel (browser transpile) |
| Retrieval | Deterministic JSON · RAG-ready for FAISS / LangChain |
| Data | Synthetic JSON fixtures (swap point isolated) |
| API Docs | Auto-generated Swagger UI via FastAPI |
| Deployment | uvicorn (dev) · Docker-ready |

### v1 (Archived)

| Layer | Technology |
|---|---|
| Backend | Streamlit · LangChain · Python |
| Retrieval | FAISS · HuggingFace Embeddings (all-MiniLM-L6-v2) |
| Frontend | React JSX prototypes (standalone demos) |

---

## Versions

### v2 — Current (FastAPI + React SPA)
- **9 API endpoints**, all returning structured Pydantic responses
- **7 chat conversation flows** with fuzzy intent matching
- **Animated tool-chain visualization** — every reasoning step visible in real time
- **Multi-claim V2 demo** — 5 simultaneous claims, per-claim conversation state
- **Clean architecture** — all files under 600 lines, routers/services/models separation

### v1 — Archived (Streamlit Monolith)
- Single 850-line `app.py` — the original working prototype
- FAISS vector store with real RAG retrieval (HuggingFace embeddings)
- The foundation that proved the concept before scaling the architecture
- Preserved in `archive/v1-streamlit/` — never deleted

---

## Roadmap

See [`docs/product/ROADMAP.md`](docs/product/ROADMAP.md) for detailed proposals.

| Phase | Work | Complexity |
|---|---|---|
| **Phase 1** | Swap `synthetic_data.py` for real DB queries | Low — one file |
| **Phase 2** | Real SBC documents via SharePoint/S3 or vector DB | Medium |
| **Phase 3** | LLM integration for dynamic reasoning (OpenAI, Anthropic, etc.) | Medium |
| **Phase 4** | Auth, logging, CI/CD, Docker, load testing | High |
| **Phase 5** | 835 EDI transaction parsing · RARC code expansion · Appeals automation | High |

---

## License

MIT

---

*Built with synthetic data. No real member, provider, or plan information is used anywhere in this repository. All denial codes, plan rules, member profiles, and EOB records are fabricated for demonstration purposes only.*