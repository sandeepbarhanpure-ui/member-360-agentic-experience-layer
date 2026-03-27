# ⚕ Member 360 — Agentic Experience Layer

> An interpretation layer for self-funded health plans that translates claims adjudication outcomes into plain-English member advocacy using deterministic mapping + RAG-based reasoning.

**This system does not decide if a claim is paid.** It reads the outcome from the adjudication engine and translates it for the associate — with cited plan rules, consistency checks, and actionable next steps.

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

```
┌─────────────────────────────────────────────────────────────────┐
│  EXPERIENCE LAYER                                               │
│  ┌─────────────────┐ ┌──────────────────┐ ┌─────────────────┐  │
│  │  Agentic Chat UI │ │ Advocacy Dashboard│ │ Member Context  │  │
│  │  (React)         │ │ (Streamlit)       │ │ (Accumulators)  │  │
│  └────────┬─────────┘ └────────┬──────────┘ └────────────────┘  │
│           │                    │                                 │
├───────────┼────────────────────┼─────────────────────────────────┤
│  ORCHESTRATION LAYER           │                                 │
│  ┌─────────────────────────────┴──────────────────────────────┐  │
│  │              ReconciliationAgent (Python/LangChain)         │  │
│  │                                                            │  │
│  │  EOB Parser ──► Denial Lookup ──► RAG Retrieve ──► Reason  │  │
│  └──────┬───────────────┬───────────────────┬─────────────────┘  │
│         │               │                   │                    │
├─────────┼───────────────┼───────────────────┼────────────────────┤
│  DATA & RETRIEVAL LAYER │                   │                    │
│  ┌──────┴──────┐ ┌──────┴───────┐ ┌────────┴────────┐           │
│  │ Denial Code │ │ SBC Vector   │ │  Accumulator    │           │
│  │ Mapping     │ │ Store (FAISS)│ │  Store          │           │
│  │ (JSON)      │ │ (RAG)        │ │  (API)          │           │
│  └─────────────┘ └──────────────┘ └─────────────────┘           │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  INTEGRATION LAYER ─── System of Record Boundary ───             │
│  ┌──────────────────┐ ┌────────────┐ ┌────────────────┐         │
│  │ Adjudication     │ │ EOB Data   │ │ Plan Document  │         │
│  │ Engine (SoR)     │ │ Feed       │ │ Store          │         │
│  └──────────────────┘ └────────────┘ └────────────────┘         │
└──────────────────────────────────────────────────────────────────┘
```

## Design Principles

| Principle | Implementation |
|---|---|
| **Anti-Hallucination** | Unknown denial codes produce an explicit "cannot interpret" response. SBC sections are cited by name. RAG retrieval status is always visible. |
| **Role Boundary** | The system interprets but never overrides the adjudication engine. A persistent disclaimer appears on every screen. |
| **Deterministic + RAG Hybrid** | JSON mapping provides precision for code lookups. Vector search provides contextual plan rule retrieval. Best of both approaches. |
| **Auditable Pipeline** | Every step is logged and visible: parse → lookup → retrieve → reason. The tool chain is shown to the user in real-time. |

## Why Not Pure LLM?

Healthcare claims have zero tolerance for hallucination. If the system tells a member "this is the provider's responsibility" when it's actually a deductible charge, that's a compliance problem — not a UX issue.

The architecture enforces precision where it matters:
- **Denial code → explanation** is a deterministic JSON lookup, not model inference
- **Plan rule retrieval** is scoped to the specific SBC section referenced by the mapping
- **Consistency reasoning** is rule-based logic (facility type checks, timeline validation)

The LLM adds value in the experience layer — natural conversation, contextual follow-ups, personalized scripts — but the interpretation pipeline underneath is auditable and repeatable.

---

## Quickstart

```bash
# Clone and set up
git clone https://github.com/sandeepbarhanpure-ui/member-360-agentic-experience-layer.git
cd member-360-agentic-experience-layer

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run
streamlit run app.py
```

Opens at `http://localhost:8501`. The default mock EOB loads automatically.

## Project Structure

```
member-360/
├── app.py                      # Streamlit app + ReconciliationAgent
├── requirements.txt            # Python dependencies
├── data/
│   ├── denial_mapping.json     # Deterministic code → explanation bridge
│   ├── synthetic_sbc.md        # Mock plan rules (SBC document)
│   └── mock_eob.txt            # Sample adjudicator output
└── README.md
```

## How It Works

### Step 1 — Ingest
The `EOBParser` reads raw EOB text and extracts structured fields: denial code, service, facility, amounts, dates, and provider information.

### Step 2 — Lookup
The denial code is matched against `denial_mapping.json`. **Hard constraint:** if the code is not in the mapping, the system states it cannot interpret the claim and directs the member to contact Member Services.

### Step 3 — RAG Retrieval
Using the `sbc_section` reference from the denial mapping, the `SBCRetriever` queries a FAISS vector store built from the plan's Summary of Benefits and Coverage document. It uses `all-MiniLM-L6-v2` embeddings for semantic similarity search. If FAISS/LangChain is unavailable, it falls back to deterministic header matching.

### Step 4 — Reasoning
The `ReconciliationAgent` compares the EOB data against the retrieved SBC text:
- Checks facility type against exception rules (e.g., ER waiver for prior auth)
- Validates timelines against filing deadlines
- Determines consistency with plan rules
- Assigns action ownership (Provider vs. Member)

### Step 5 — Output
The Member Advocacy Dashboard renders:
- **The Why** — plain-English explanation of the denial
- **The How** — personalized call script with claim details pre-filled
- **Reconciliation Reasoning** — step-by-step logic with SBC section citation

## Supported Denial Codes

| Code | Reason | Action Owner |
|---|---|---|
| CO-197 | Prior Authorization Absent | Provider |
| CO-16 | Missing Medical Records | Provider |
| CO-4 | Procedure Modifier Inconsistency | Provider |
| CO-29 | Filing Deadline Exceeded | Provider |
| PR-1 | Member Deductible Applies | Member |
| PR-2 | Coinsurance Applies | Member |

## Tech Stack

- **Frontend:** Streamlit (dashboard) · React (chat prototype)
- **Orchestration:** LangChain · Python
- **Retrieval:** FAISS · HuggingFace Embeddings (all-MiniLM-L6-v2)
- **Data:** Deterministic JSON Mapping · Markdown SBC Documents
  
_Note: The repository includes the React/JSX frontend code used for the UI prototype demonstration in the prototypes/ directory, while the core agentic reasoning engine is built in Python._

## License

MIT

---

*This is a prototype built with synthetic data. No real member, provider, or plan data is used. All denial codes, plan rules, and EOB records are fabricated for demonstration purposes.*
