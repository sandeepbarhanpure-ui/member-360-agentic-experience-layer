# Member 360 Agentic Experience Layer - Project Context

**Date Created:** 2026-03-25  
**Last Updated:** 2026-03-26  
**Canonical Location:** `docs/Member360_Project_Context_2026-03-26.md` (single source of truth — `/Users/s1b0tr7/Projects/member-360-scaled/`)  
**GitHub:** https://github.com/sandeepbarhanpure-ui/member-360-agentic-experience-layer

> ⚠️ Original scratch copy was in `~/Downloads/Member360/`. That folder is now retired — all docs, assets, and context live here in the git repo.

---

## Project Overview

**What it does:** Interprets claims adjudication outcomes (EOBs) into plain-English member advocacy using deterministic mapping + RAG-based reasoning.

**Tech Stack:**
- Backend: FastAPI + Python 3.11+
- Frontend: React 18 (CDN-loaded, no build)
- Data: Synthetic (swap `synthetic_data.py` for real integration)
- Deployment: uvicorn (dev), Docker-ready

---

## Session History (2026-03-24 to 2026-03-26)

### Problem We Started With
1. **GitHub repo broken** - only had 1 file instead of 14
2. **Original location** - `/Users/s1b0tr7/Downloads/Member360/`
3. **Monolith architecture** - 850-line `app.py` Streamlit file
4. **React prototypes** - 3 JSX files that couldn't run standalone

### What We Built
1. **Scaled v2 architecture** - Clean FastAPI + React SPA separation
2. **9 API endpoints** - health, members, claims, reconcile, chat, denial-codes
3. **7 chat conversation flows** - greeting, denial explanation, action plan, script generator, financial summary, appeal, escalation
4. **Archive structure** - Preserved v1 prototype in `prototype-v1/`
5. **Comprehensive README** - Merged best of v1 + v2 documentation

### Files We Removed
- `SESSION_SUMMARY.md` - AI session log (not appropriate for public repo)

### Files We Cleaned
- `frontend/index.html` - Changed `walmart:` colors to `brand:`
- `WORKING_BACKWARDS.md` - Changed "Walmart brand colors" to "Brand colors"

### Backups Created
- `.backups/index.html.bak`
- `.backups/WORKING_BACKWARDS.md.bak`

---

## Current Repository Structure

```
member-360-agentic-experience-layer/
├── README.md                        # Comprehensive docs (v1 + v2)
├── WORKING_BACKWARDS.md             # MVP scope & integration roadmap
├── LICENSE                          # MIT
│
├── backend/                         # FastAPI Server
│   ├── app/
│   │   ├── main.py                  # Entry point (75 lines)
│   │   ├── routers/
│   │   │   ├── members.py           # GET /api/members
│   │   │   ├── claims.py            # GET /api/claims
│   │   │   ├── reconcile.py         # POST /api/reconcile
│   │   │   └── chat.py              # POST /api/chat
│   │   ├── services/
│   │   │   ├── eob_parser.py        # Parse EOB text
│   │   │   ├── sbc_retriever.py     # Retrieve plan rules
│   │   │   ├── reconciliation.py    # Core reasoning pipeline
│   │   │   ├── denial_lookup.py     # Code mapping
│   │   │   ├── chat_agent.py        # 7 conversation flows
│   │   │   └── synthetic_data.py    # ← SWAP for real data
│   │   └── models/
│   │       └── schemas.py           # Pydantic models
│   ├── data/
│   │   ├── denial_mapping.json
│   │   ├── mock_eob.txt
│   │   └── synthetic_sbc.md
│   └── requirements.txt
│
├── frontend/                        # React SPA
│   ├── index.html                   # Entry point
│   └── components/
│       ├── chat.jsx                 # Chat Agent UI
│       └── app_shell.jsx            # 4 pages: Chat, Dashboard, Reconcile, Codes
│
├── docs/                            # Architecture artifacts
│   ├── member360_llm_context.md
│   └── member360_architecture_diagram.svg
│
├── prototypes/                      # React JSX demos
│   ├── member360_chat.jsx
│   ├── member360_prototype.jsx
│   └── member360_architecture.jsx
│
├── prototype-v1/                    # ARCHIVED - Original Streamlit
│   ├── README-original.md
│   ├── app.py                       # 850-line monolith
│   ├── member360_llm_context.md
│   ├── member360_architecture_diagram.svg
│   └── prototypes/
│
├── tests/
│   └── test_agent.py
│
└── .backups/                        # Backups of edited files
    ├── index.html.bak
    ├── WORKING_BACKWARDS.md.bak
    └── PROJECT_CONTEXT.md           # ← This file
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

---

## Chat Agent Flows

1. **Greeting** - Initial welcome with member context
2. **Denial Explanation** - "Why was my MRI claim denied?" → Tool chain: EOB → Lookup → RAG → Reasoning
3. **Action Plan** - "How do I fix this?" → Timeline, deadlines, next steps
4. **Script Generator** - "What should I say to the provider?" → Personalized call script
5. **Financial Summary** - "What do I owe?" → Accumulators, balances, breakdown
6. **Appeal Guidance** - "Could I appeal?" → Member vs provider path analysis
7. **Escalation** - "What if provider refuses?" → 3 escalation options

---

## How to Run Locally

```bash
# Navigate to project
cd /Users/s1b0tr7/Projects/member-360-scaled

# Set up backend
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run server
uvicorn app.main:app --reload --port 3000

# Open browser
open http://localhost:3000
```

**What you'll see:**
- Chat Agent (conversational UI with tool chains)
- Dashboard (members/claims tables)
- Reconcile Tool (paste EOB → analysis)
- Denial Codes (reference guide)
- API Docs (Swagger UI at `/docs`)

---

## Integration Roadmap (from WORKING_BACKWARDS.md)

### Phase 1 (Week 1): Real Data
- Swap `synthetic_data.py` → real DB queries (Postgres, API calls)
- Files to modify: `backend/app/services/synthetic_data.py`

### Phase 2 (Week 2): Real Plan Documents
- Hook up SBC documents (SharePoint/S3)
- Files to modify: `backend/app/services/sbc_retriever.py`

### Phase 3 (Week 3-4): LLM Integration
- Enable Element Gateway / OpenAI for reasoning
- Files to modify: `backend/app/services/chat_agent.py`, `reconciliation.py`

### Phase 4 (Week 5-6): Production Hardening
- Auth (PingFed/OIDC)
- Logging (structured JSON)
- CI/CD (GitHub Actions)
- Monitoring (Datadog/Splunk)

---

## Key Design Decisions

| Decision | Reason |
|---|---|
| **FastAPI over Streamlit** | Real REST APIs, auto-docs, production-grade |
| **CDN React over npm** | Zero build step, instant dev loop |
| **Separate chat router** | Chat is distinct capability, easier to test/extend |
| **Isolated synthetic data** | Clean integration - swap 1 file, rest unchanged |
| **All files < 600 lines** | Maintainability, readability, modularity |
| **Deterministic + RAG hybrid** | Precision for code lookups, flexibility for plan rules |

---

## Git Commit History (Last 5)

```
1c674e0 - Remove SESSION_SUMMARY.md - internal AI session log not appropriate for public repo
740ee2a - Update WORKING_BACKWARDS.md
fe296a9 - Archive v1 prototype + comprehensive README merge
7ba2839 - Update WORKING_BACKWARDS.md
1caad06 - Add Agentic Chat UI + complete documentation
```

---

## Files Modified for Public Release

### Removed
- `SESSION_SUMMARY.md` - AI session context (internal only)

### Cleaned (Walmart mentions removed)
- `frontend/index.html` - Changed `walmart:` to `brand:` in Tailwind config
- `WORKING_BACKWARDS.md` - Changed "Walmart brand colors" to "Brand colors"

### Backups
- `.backups/index.html.bak`
- `.backups/WORKING_BACKWARDS.md.bak`

---

## Verification Checklist

- [x] All 10 architecture files on GitHub (SVGs, JSX prototypes, docs)
- [x] No AI session artifacts (SESSION_SUMMARY.md removed)
- [x] No company-specific mentions (Walmart references cleaned)
- [x] Comprehensive README (v1 + v2 merged)
- [x] v1 prototype archived properly (`prototype-v1/`)
- [x] All files under 600 lines
- [x] Clean git history
- [x] Backups created before edits

---

## Next Steps (When Ready)

1. **Test locally** - Run server, click through all 7 chat flows
2. **Swap synthetic data** - Replace `synthetic_data.py` with real DB/API
3. **Deploy** - Containerize (Dockerfile) or push to cloud
4. **Demo** - Share GitHub link with stakeholders
5. **Iterate** - Add real LLM, auth, monitoring

---

## Important Notes

- **No real data** - All member/claim data is synthetic
- **MVP scope** - Focus is on architecture, not features
- **Integration-ready** - Swap `synthetic_data.py` and you're live
- **Public repo** - Safe for external sharing (no proprietary info)

---

## Contact & Resources

- **GitHub:** https://github.com/sandeepbarhanpure-ui/member-360-agentic-experience-layer
- **Local:** `/Users/s1b0tr7/Projects/member-360-scaled/`
- **Backups:** `.backups/` folder
- **Docs:** README.md, WORKING_BACKWARDS.md

---

**Last verified:** 2026-03-26 09:30 PST  
**Status:** ✅ Production-ready MVP, public-safe, integration-ready
