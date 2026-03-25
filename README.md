# Member 360 — Agentic Experience Layer (Scaled)

A scalable full-stack prototype that interprets adjudication outcomes and translates them into plain-English member advocacy guidance.

## Architecture

```
member-360-scaled/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── routers/
│   │   │   ├── members.py       # /api/members
│   │   │   ├── claims.py        # /api/claims
│   │   │   └── reconcile.py     # /api/reconcile, /api/denial-codes
│   │   ├── services/
│   │   │   ├── eob_parser.py    # EOB text → structured record
│   │   │   ├── sbc_retriever.py # FAISS/RAG + deterministic fallback
│   │   │   ├── reconciliation.py # Core reasoning pipeline
│   │   │   ├── denial_lookup.py # Deterministic denial code mapping
│   │   │   └── synthetic_data.py # Swappable data layer
│   │   └── models/
│   │       └── schemas.py       # Pydantic models
│   ├── data/                    # Synthetic data files
│   └── requirements.txt
├── frontend/
│   ├── index.html               # SPA entry point
│   └── components/
│       └── app_shell.jsx        # React UI (CDN-loaded)
└── tests/
```

## Quick Start

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 3000
```

Then open http://localhost:3000

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/health | Health check |
| GET | /api/members | List all members |
| GET | /api/members/{id} | Get member by ID |
| GET | /api/claims | List claims (optional ?member_id=) |
| GET | /api/denial-codes | List recognized denial codes |
| POST | /api/reconcile | Run reconciliation pipeline |

## Design Principles

- **Interpretation, not adjudication**: This layer reads outcomes, it never writes back.
- **Deterministic first**: Unknown codes are rejected, not guessed.
- **Graceful degradation**: Works fully without LangChain/FAISS.
- **Swappable data layer**: Replace `synthetic_data.py` with real DB queries when ready.
