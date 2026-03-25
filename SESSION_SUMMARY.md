# Member 360 Agentic Experience Layer - Session Summary

**Date:** 2026-03-24  
**Goal:** Scale the Member 360 prototype from a single-file Streamlit app to a production-ready full-stack application

---

## What We Started With

**Your original prototype:**
- GitHub repo: `github.com/sandeepbarhanpure-ui/member-360-agentic-experience-layer`
- Local files: `/Users/s1b0tr7/Downloads/Member360/`
- **Problems found:**
  - GitHub repo only had 1 file (`tests/test_agent.py`) instead of all 14
  - Root cause: buggy `setup_repo.sh` script had wrong paths
  - 3 React JSX prototypes (chat, dashboard, architecture) that couldn't run
  - 1 massive `app.py` (850 lines) - Streamlit monolith with everything mixed together

---

## What We Fixed

### 1. Fixed Broken GitHub Repo ✅
- Cloned the repo, copied all 14 missing files from local
- Pushed complete codebase to GitHub
- **Result:** All files now visible on GitHub

### 2. Created Quick Demo (No Build Tools) ✅
- Created HTML wrappers in `/Downloads/Member360/demo/`
- Used CDN-loaded React + Babel for browser-based JSX compilation
- **Result:** `python3 -m http.server 8888` → working demos in browser

---

## What We Built - The Scaled Architecture

**New location:** `/Users/s1b0tr7/Projects/member-360-scaled/`

### Backend Architecture (FastAPI)

```
backend/
├── app/
│   ├── main.py                  # FastAPI app entry (75 lines)
│   ├── models/
│   │   └── schemas.py           # Pydantic models (EOB, Member, Claim, etc.)
│   ├── routers/
│   │   ├── members.py           # GET /api/members
│   │   ├── claims.py            # GET /api/claims
│   │   ├── reconcile.py         # POST /api/reconcile + GET /api/denial-codes
│   │   └── chat.py              # POST /api/chat + GET /api/chat/greeting
│   └── services/
│       ├── eob_parser.py        # Parses raw EOB text → structured record
│       ├── sbc_retriever.py     # Fetches plan rules (RAG or deterministic)
│       ├── reconciliation.py    # Core agent reasoning pipeline
│       ├── denial_lookup.py     # Denial code → explanation mapping
│       ├── chat_agent.py        # Conversation flow engine (7 flows)
│       └── synthetic_data.py    # ← THE SWAP POINT for real integrations
└── data/                        # JSON, markdown, EOB fixtures
```

**Key Principles:**
- **Routers:** Define API endpoints, handle HTTP
- **Services:** Business logic (parsing, reasoning, lookup)
- **Models:** Data shapes (Pydantic schemas)
- **Synthetic Data:** Isolated in ONE file - swap for real DB/API calls

### Frontend Architecture (React SPA)

```
frontend/
├── index.html                   # SPA entry point
└── components/
    ├── chat.jsx                 # Full agentic chat UI (all-in-one)
    └── app_shell.jsx            # Main app with 4 pages:
                                 #   - Chat Agent (default)
                                 #   - Dashboard
                                 #   - Reconcile
                                 #   - Denial Codes
```

**Tech Stack:**
- React 18 (CDN-loaded, zero npm)
- Tailwind CSS (Walmart brand colors)
- Babel in-browser compilation
- All API-connected (no hardcoded data in UI)

---

## API Endpoints (All Live)

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/health` | GET | System health check |
| `/api/members` | GET | List all members |
| `/api/members/{id}` | GET | Get single member |
| `/api/claims` | GET | List claims (optional `?member_id=...`) |
| `/api/denial-codes` | GET | List all recognized denial codes |
| `/api/reconcile` | POST | Reconcile an EOB (full agent pipeline) |
| `/api/chat` | POST | Process chat message → agent response |
| `/api/chat/greeting` | GET | Get initial greeting for member |
| `/docs` | GET | Auto-generated Swagger UI |

---

## Chat Agent Conversation Flows (7 Total)

1. **Greeting** - Initial welcome with context
2. **Why was my claim denied?** - Tool chain: EOB → Denial Lookup → RAG → Reconciliation
3. **How do I fix this?** - Action plan with timeline + deadlines
4. **What should I say to the provider?** - Personalized call script
5. **What do I owe right now?** - Financial snapshot with accumulators
6. **Could I appeal this myself?** - Appeal vs provider path analysis
7. **What if the provider refuses?** - Escalation options (3 paths)

**Each flow includes:**
- Simulated tool chain with realistic delays
- Structured response (headline, details, steps, scripts, tips)
- Inline cards (DenialCard, FinancialCard, TimelineCard)
- Smart suggestions for next question

---

## Current Status

**Running locally:**
- Server: `http://localhost:3000`
- Backend: FastAPI with hot reload
- Frontend: React SPA with 4 pages
- **Last issue:** Black screen (JavaScript scope error from multiple script tags)
- **Fix in progress:** Consolidating chat components into single file

**Git initialized:**
- 23 files committed
- Clean commit message documenting the scaling
- `.gitignore` includes venv, databases, CSV/Excel with PII

---

## File Size Compliance

✅ **All files under 600 lines** (per your mandate)

| File | Lines |
|---|---|
| `app/main.py` | 75 |
| `app/models/schemas.py` | ~100 |
| `app/routers/chat.py` | ~90 |
| `app/services/chat_agent.py` | ~250 |
| `frontend/components/chat.jsx` | ~580 |
| `frontend/components/app_shell.jsx` | ~440 |

---

## Next Steps (When Ready)

1. **Fix the black screen** - Consolidate chat JSX components
2. **Test full chat flow** - Click through all 7 conversation flows
3. **Add Architecture Diagram page** - Port from original prototype
4. **Integration day:** Swap `synthetic_data.py` for real DB/API calls
5. **Deploy:** Containerize or push to cloud

---

## Key Decisions Made

- **Why FastAPI over Streamlit?** Real REST APIs, auto-docs, production-grade
- **Why CDN React over npm?** Zero build step, instant dev loop, simpler demo
- **Why separate chat router?** Chat is a distinct capability, easier to test/extend
- **Why keep synthetic data isolated?** Clean integration path - change 1 file, rest stays same
- **Why Walmart colors?** Brand compliance for internal tooling

---

## Files to Review Later

- `/Users/s1b0tr7/Downloads/Member360/` - Original prototypes (archived)
- `/Users/s1b0tr7/Projects/member-360-scaled/` - Scaled production version
- GitHub: `github.com/sandeepbarhanpure-ui/member-360-agentic-experience-layer` - Now complete
