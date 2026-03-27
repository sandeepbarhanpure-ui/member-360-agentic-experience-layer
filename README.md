# ⚕ Member 360 — Agentic Experience Layer

> An interpretation layer for self-funded health plans that translates claims adjudication outcomes into plain-English member advocacy using deterministic mapping + RAG-based reasoning.

**This system does not decide if a claim is paid.** It reads the outcome from the adjudication engine and translates it for the associate — with cited plan rules, consistency checks, and actionable next steps.

---

## Table of Contents

- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [Architecture](#architecture)
- [Design Principles](#design-principles)
- [Quickstart](#quickstart)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [How It Works](#how-it-works)
- [Versions](#versions)
- [Tech Stack](#tech-stack)

---

## The Problem

Self-funded employers process millions of claims annually. When a claim is denied, the member receives a cryptic CARC/RARC code and a bill. Most members don't understand what happened, whose responsibility it is, or what to do next. The result: unnecessary call center volume, delayed resolutions, and poor member experience.

## The Solution

Member 360 is an agentic experience layer that sits **on top** of an existing claims adjudication platform. It runs a 5-step pipeline:

```
EOB Input → Parse → Lookup Denial Code → Retrieve Plan Rule (RAG) → Reason → Member Advocacy Output
```

The output: a plain-English explanation, a consistency assessment against plan rules, and a personalized call script the member can use immediately.

---

## Architecture

### Scaled Production Architecture (Current - v2)

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND (React SPA - CDN-loaded, no build step)               │
│  ┌─────────────────┐ ┌──────────────────┐ ┌─────────────────┐  │
│  │  Chat Agent     │ │   Dashboard      │ │  Reconcile Tool │  │
│  │  (Agentic UI)   │ │   (Members/      │ │  (Power Users)  │  │
│  │                 │ │    Claims)       │ │                 │  │
│  └────────┬────────┘ └────────┬─────────┘ └────────┬────────┘  │
│           │                    │                      │           │
│           └────────────────────┴──────────────────────┘           │
│                                │                                  │
│                         REST API (FastAPI)                        │
│                                │                                  │
├────────────────────────────────┴──────────────────────────────────┤
│  BACKEND (FastAPI - Clean Separation of Concerns)                │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  ROUTERS (HTTP Layer)                                    │   │
│  │  /api/members · /api/claims · /api/reconcile · /api/chat│   │
│  └──────────────────────┬───────────────────────────────────────┘   │
│                         │                                       │
│  ┌──────────────────────┴───────────────────────────────────────┐   │
│  │  SERVICES (Business Logic)                               │   │
│  │  ┌────────────┐ ┌──────────┐ ┌────────────┐ ┌─────────┐ │   │
│  │  │ EOB Parser │ │ Denial   │ │ SBC        │ │ Chat    │ │   │
│  │  │            │ │ Lookup   │ │ Retriever  │ │ Agent   │ │   │
│  │  └────────────┘ └──────────┘ └────────────┘ └─────────┘ │   │
│  │  ┌────────────────────────────────────────────────────────┐  │   │
│  │  │  ReconciliationAgent (Core Reasoning Pipeline)    │  │   │
│  │  │  Parse → Lookup → Retrieve → Reason → Advocate    │  │   │
│  │  └────────────────────────────────────────────────────────┘  │   │
│  └──────────────────┬───────────────────────────────────────────┘   │
│                         │                                        │
│  ┌──────────────────────┴───────────────────────────────────────┐   │
│  │  DATA LAYER (Swappable - currently synthetic)           │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌─────────────────┐  │   │
│  │  │ Members      │ │ Claims       │ │ Denial Mapping  │  │   │
│  │  │ (synthetic_  │ │ (synthetic_  │ │ (JSON)          │  │   │
│  │  │  data.py)    │ │  data.py)    │ │                 │  │   │
│  │  └──────────────┘ └──────────────┘ └─────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  INTEGRATION POINTS (Future - swap synthetic_data.py)           │
│  ┌──────────────────┐ ┌────────────┐ ┌────────────────┐         │
│  │ Adjudication     │ │ Member DB  │ │ Plan Document  │         │
│  │ Engine (SoR)     │ │ (Postgres) │ │ Store (S3/SP)  │         │
│  └──────────────────┘ └────────────┘ └────────────────┘         │
└──────────────────────────────────────────────────────────────────┘
```

### Original Prototype Architecture (v1 - Archived)

See `prototype-v1/` for the original 850-line Streamlit monolith and React prototypes.

---

## Design Principles

| Principle | Implementation |
|---|---|
| **Anti-Hallucination** | Unknown denial codes produce an explicit "cannot interpret" response. SBC sections are cited by name. RAG retrieval status is always visible. |
| **Role Boundary** | The system interprets but never overrides the adjudication engine. A persistent disclaimer appears on every screen. |
| **Deterministic + RAG Hybrid** | JSON mapping provides precision for code lookups. Vector search provides contextual plan rule retrieval. Best of both approaches. |
| **Auditable Pipeline** | Every step is logged and visible: parse → lookup → retrieve → reason. The tool chain is shown to the user in real-time. |
| **Clean Architecture** | All files < 600 lines. Clear separation: routers/services/models. Swap `synthetic_data.py` for real integration — nothing else changes. |

## Why Not Pure LLM?

Healthcare claims have zero tolerance for hallucination. If the system tells a member "this is the provider's responsibility" when it's actually a deductible charge, that's a compliance problem — not a UX issue.

The architecture enforces precision where it matters:
- **Denial code → explanation** is a deterministic JSON lookup, not model inference
- **Plan rule retrieval** is scoped to the specific SBC section referenced by the mapping
- **Consistency reasoning** is rule-based logic (facility type checks, timeline validation)

The LLM adds value in the experience layer — natural conversation, contextual follow-ups, personalized scripts — but the interpretation pipeline underneath is auditable and repeatable.

---

## Quickstart

### Production Version (Scaled v2 - FastAPI + React)

```bash
# Clone and navigate
git clone https://github.com/sandeepbarhanpure-ui/member-360-agentic-experience-layer.git
cd member-360-agentic-experience-layer

# Set up backend
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run server
uvicorn app.main:app --reload --port 3000

# Open in browser
open http://localhost:3000
```

**What you'll see:**
-  **Chat Agent** - Conversational UI with 7 flows (greeting, denial explanation, action plan, script generator, financial summary, appeal guidance, escalation)
-  **Dashboard** - Members table, claims table, metrics
-  **Reconcile Tool** - Paste EOB → full analysis
-  **Denial Codes** - Reference guide
-  **API Docs** - Auto-generated Swagger UI at `/docs`

### Original Prototype (v1 - Streamlit)

See `prototype-v1/README-original.md` for the original Streamlit quickstart.

---

## Project Structure

```
member-360-scaled/
│
├── backend/                         # FastAPI server
│   ├── app/
│   │   ├── main.py                  # Entry point
│   │   ├── routers/                 # HTTP layer
│   │   │   ├── members.py           # GET /api/members
│   │   │   ├── claims.py            # GET /api/claims
│   │   │   ├── reconcile.py         # POST /api/reconcile
│   │   │   └── chat.py              # POST /api/chat
│   │   ├── services/                # Business logic
│   │   │   ├── eob_parser.py        # EOB text → structured record
│   │   │   ├── sbc_retriever.py     # Plan rules lookup (RAG-ready)
│   │   │   ├── reconciliation.py    # Core reasoning pipeline
│   │   │   ├── denial_lookup.py     # CARC code mapping
│   │   │   ├── chat_agent.py        # 7 conversation flows
│   │   │   └── synthetic_data.py    # ← SWAP for real data
│   │   └── models/
│   │       └── schemas.py           # Pydantic models
│   └── data/
│       ├── denial_mapping.json      # Deterministic CARC → explanation
│       ├── mock_eob.txt             # Sample EOB for testing
│       └── synthetic_sbc.md         # Mock plan rules (SBC)
│
├── frontend/                        # React SPA (CDN-loaded, no build)
│   ├── index.html                   # Entry point
│   └── components/
│       ├── app_shell.jsx            # 4-page shell
│       ├── chat.jsx                 # Chat Agent UI
│       ├── chat_ui.jsx              # Chat sub-components
│       ├── chat_cards.jsx           # Response cards
│       ├── chat_tools.jsx           # Tool chain visualization
│       └── member_panel.jsx         # Member context panel
│
├── docs/                            # All documentation
│   ├── architecture/                # Visual diagrams & images
│   │   ├── member360_architecture_diagram.svg
│   │   ├── member360_solution_architecture.png
│   │   ├── journey_map_overview.png
│   │   └── phase4_friction_deep_dive.png
│   ├── product/                     # Product strategy & roadmap
│   │   ├── PRODUCT_THINKING.md      # Full product context & patient journey
│   │   └── github_issues.md         # Open issues & proposed features
│   └── context/                     # Project & LLM context docs
│       ├── member360_llm_context.md # Full context for LLM sessions
│       ├── Member360_Project_Context_2026-03-26.md  # Latest project context
│       └── versions/                # ← Historical snapshots (audit trail)
│           ├── Member360_Project_Context_2026-03-25.md
│           └── WORKING_BACKWARDS_2026-03-25.md
│
├── prototypes/                      # UI/UX prototypes & demos
│   ├── member360_prototype.jsx      # Full dashboard prototype
│   ├── member360_chat.jsx           # Chat UI prototype
│   ├── member360_architecture.jsx   # Architecture diagram prototype
│   ├── member360_chat.html          # Standalone chat HTML demo
│   └── demo/                        # Offline demo kit (no server needed)
│       ├── index.html
│       ├── start_demo.sh
│       └── vendor/                  # Bundled React + Babel
│
├── archive/                         # Archived prior versions (never deleted)
│   └── v1-streamlit/                # Original 850-line Streamlit monolith
│       ├── app.py
│       └── README-original.md
│
├── tests/
│   └── test_agent.py
│
├── scripts/
│   └── setup_repo.sh                # Repo bootstrap script
│
├── AUDIT_LOG.md                     # ← Append-only change log
├── RESUME.md                        # Session quick-start for Code Puppy
├── WORKING_BACKWARDS.md             # MVP scope & integration roadmap
├── README.md                        # This file
└── LICENSE
```

---

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | System health check |
| `/api/members` | GET | List all members |
| `/api/members/{id}` | GET | Get single member profile |
| `/api/claims` | GET | List claims (optional `?member_id=...`) |
| `/api/denial-codes` | GET | List all recognized denial codes |
| `/api/reconcile` | POST | Reconcile an EOB (full agent pipeline) |
| `/api/chat` | POST | Process chat message → agent response |
| `/api/chat/greeting` | GET | Get initial greeting for member |
| `/docs` | GET | Auto-generated Swagger UI |

**Example:**
```bash
# Get member profile
curl http://localhost:3000/api/members/SFP-882401-A

# Reconcile an EOB
curl -X POST http://localhost:3000/api/reconcile \
  -H "Content-Type: application/json" \
  -d '{"eob_text":"CLAIM STATUS: DENIED\nCode: CO-197\nService: MRI Knee"}'

# Chat with agent
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Why was my MRI claim denied?"}'
```

---

## How It Works

### Step 1 — Ingest
The `EOBParser` reads raw EOB text and extracts structured fields: denial code, service, facility, amounts, dates, and provider information.

### Step 2 — Lookup
The denial code is matched against `denial_mapping.json`. **Hard constraint:** if the code is not in the mapping, the system states it cannot interpret the claim and directs the member to contact Member Services.

### Step 3 — RAG Retrieval
Using the `sbc_section` reference from the denial mapping, the `SBCRetriever` queries plan rules. Currently uses deterministic fallback; RAG-ready for FAISS/vector store integration.

### Step 4 — Reasoning
The `ReconciliationAgent` compares the EOB data against the retrieved SBC text:
- Checks facility type against exception rules (e.g., ER waiver for prior auth)
- Validates timelines against filing deadlines
- Determines consistency with plan rules
- Assigns action ownership (Provider vs. Member)

### Step 5 — Output
The system renders:
- **The Why** — plain-English explanation of the denial
- **The How** — personalized call script with claim details pre-filled
- **Reconciliation Reasoning** — step-by-step logic with SBC section citation
- **Chat Agent** — Conversational UI with tool-chain visualization

---

## Supported Denial Codes

| Code | Reason | Action Owner |
|---|---|---|
| CO-197 | Prior Authorization Absent | Provider |
| CO-16 | Missing Medical Records | Provider |
| CO-4 | Procedure Modifier Inconsistency | Provider |
| CO-29 | Filing Deadline Exceeded | Provider |
| PR-1 | Member Deductible Applies | Member |
| PR-2 | Coinsurance Applies | Member |

---

## Versions

### v2 (Current - Production-Ready Scaled Architecture)
- **Backend:** FastAPI with clean separation (routers/services/models)
- **Frontend:** React SPA with 4 pages (Chat, Dashboard, Reconcile, Codes)
- **Features:** 9 API endpoints, 7 chat flows, tool-chain visualization
- **Status:** MVP-ready, synthetic data, integration-ready
- **Docs:** SESSION_SUMMARY.md, WORKING_BACKWARDS.md

### v1 (Archived - Original Prototype)
- **Backend:** Single 850-line `app.py` (Streamlit)
- **Frontend:** 3 React JSX prototypes (chat, dashboard, architecture)
- **Features:** Basic reconciliation, RAG retrieval
- **Status:** Archived in `prototype-v1/`
- **Docs:** prototype-v1/README-original.md

---

## Tech Stack

### v2 (Current)
- **Backend:** FastAPI · Python 3.11+ · Pydantic
- **Frontend:** React 18 (CDN) · Tailwind CSS · Babel (browser)
- **Retrieval:** Deterministic (RAG-ready for FAISS/LangChain)
- **Data:** Synthetic (JSON fixtures)
- **Deployment:** uvicorn (dev), Docker-ready

### v1 (Archived)
- **Backend:** Streamlit · LangChain · Python
- **Retrieval:** FAISS · HuggingFace Embeddings (all-MiniLM-L6-v2)
- **Frontend:** React prototypes (separate demos)

---

## Integration Roadmap

See **WORKING_BACKWARDS.md** for the complete integration plan.

**TL;DR:**
1. **Phase 1 (Week 1):** Swap `synthetic_data.py` for real DB queries
2. **Phase 2 (Week 2):** Hook up real SBC documents (SharePoint/S3)
3. **Phase 3 (Week 3-4):** Enable LLM reasoning (Element Gateway)
4. **Phase 4 (Week 5-6):** Production hardening (auth, logging, CI/CD)

---

## License

MIT

---

*This is a prototype built with synthetic data. No real member, provider, or plan data is used. All denial codes, plan rules, and EOB records are fabricated for demonstration purposes.*
