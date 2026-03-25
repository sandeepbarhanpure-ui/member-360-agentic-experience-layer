# Member 360 Agentic Experience Layer - Working Backwards Plan

**Amazon-style Working Backwards: Start with the customer experience, define MVP scope**

---

## The Vision (End State)

### Internal Press Release (The Future We're Building)

**Member 360 Agentic Experience Layer Now Live**

*Walmart Health Plan members can now get instant, conversational explanations of denied claims - with actionable next steps - through an AI-powered Benefits Advocate agent.*

Instead of deciphering cryptic EOB codes and navigating complex plan documents, members chat with an agent that:
- Reads their EOB in plain language
- Explains exactly why a claim was denied
- Reconciles the denial against their plan rules
- Provides a ready-to-use script for calling their provider
- Tracks deadlines and suggests escalation paths if needed

**What's different?**
- **No more guessing:** The agent reconciles EOB codes against the actual SBC (Summary of Benefits and Coverage)
- **No more dead ends:** Every explanation includes WHO is responsible (member vs provider) and WHAT to do next
- **No more jargon:** "CO-197" becomes "Your provider didn't get pre-approval before the MRI"
- **Deterministic + Agentic:** Unknown codes are rejected (not hallucinated). Known codes trigger full reasoning chains.

**For members:** "I finally understand what happened and know exactly who to call."

**For operations:** Reduced call center volume, faster resolution, documented member empowerment.

---

## The MVP (What We're Building First)

### MVP Definition: "Demonstrate the capability with synthetic data"

**MVP Success Criteria:**
1. A working full-stack app running locally
2. 4 core pages: Chat Agent, Dashboard, Reconcile Tool, Denial Codes Reference
3. Chat agent handles 7 conversation flows with tool-chain visualization
4. All data is synthetic but structured identically to production schemas
5. Clean integration points - swap `synthetic_data.py` for real DB, everything else stays the same
6. Zero external dependencies (LLMs, RAG, databases) - pure deterministic logic
7. Runs with `uvicorn app.main:app` and opens in browser

**MVP Customer (Internal Stakeholder):**
- **Who:** Product leadership, health plan operations, IT architecture
- **What they need to see:** 
  - "This is what the member experience looks like"
  - "Here's how the agent reasons through denials"
  - "This is production-ready architecture - just needs real data"

---

## What's IN Scope for MVP

### ✅ Backend (FastAPI)

**API Endpoints:**
- [x] `GET /api/health` - System health
- [x] `GET /api/members` - List members
- [x] `GET /api/members/{id}` - Single member
- [x] `GET /api/claims` - List claims (filter by member)
- [x] `GET /api/denial-codes` - List recognized codes
- [x] `POST /api/reconcile` - Full reconciliation pipeline
- [x] `POST /api/chat` - Process chat message
- [x] `GET /api/chat/greeting` - Initial greeting
- [x] `GET /docs` - Auto-generated Swagger UI

**Services (Business Logic):**
- [x] **EOB Parser:** Raw text → structured record
- [x] **SBC Retriever:** Plan rules lookup (deterministic fallback, RAG-ready)
- [x] **Denial Lookup:** Code → explanation mapping
- [x] **Reconciliation Agent:** Core reasoning (EOB + SBC + Mapping → Analysis)
- [x] **Chat Agent:** 7 conversation flows with fuzzy matching
- [x] **Synthetic Data:** In-memory fixtures (3 members, 4 claims, denial mapping)

**Data Models (Pydantic):**
- [x] EOBRecord
- [x] DenialMapping
- [x] ReconciliationResult
- [x] MemberProfile
- [x] ClaimSummary

### ✅ Frontend (React SPA)

**Pages:**
- [x] **Chat Agent** - Full conversational UI with tool chains
- [x] **Dashboard** - Members table, Claims table, Metrics
- [x] **Reconcile Tool** - Paste EOB → get full analysis
- [x] **Denial Codes** - Reference guide for all recognized codes

**Components:**
- [x] Tool chain visualization (animated steps)
- [x] Inline cards (DenialCard, FinancialCard, TimelineCard)
- [x] Member context panel (accumulators, active claim)
- [x] Message bubbles (user/agent)
- [x] Suggestion chips

**UX Features:**
- [x] Typing indicators
- [x] Simulated tool execution delays
- [x] Markdown formatting (**bold** support)
- [x] Copy-to-clipboard for scripts
- [x] Responsive layout
- [x] Walmart brand colors

### ✅ Developer Experience

- [x] Single command startup: `uvicorn app.main:app --reload`
- [x] Auto-reload on code changes
- [x] Interactive API docs at `/docs`
- [x] Git initialized with clean commits
- [x] All files under 600 lines
- [x] Clear separation of concerns (routers/services/models)
- [x] `.gitignore` excludes venv, databases, PII files

---

## What's OUT of Scope for MVP

### ❌ NOT in MVP (Future Phases)

**Real Data Integrations:**
- ❌ Database connections (PostgreSQL, Snowflake, etc.)
- ❌ Live claims adjudication system APIs
- ❌ Real member lookup (Active Directory, MemberHub, etc.)
- ❌ Real SBC document storage
- ❌ Authentication/authorization (PingFed, LDAP)

**Advanced AI Features:**
- ❌ Actual LLM integration (Element Gateway, OpenAI, etc.)
- ❌ Vector database for RAG (FAISS, Pinecone, etc.)
- ❌ Embeddings generation
- ❌ Conversational memory beyond single session
- ❌ Multi-turn context tracking

**Production Ops:**
- ❌ Logging/monitoring (DataDog, Splunk)
- ❌ Error tracking (Sentry)
- ❌ Rate limiting
- ❌ Deployment pipelines (CI/CD)
- ❌ Containerization (Docker, Kubernetes)
- ❌ Load balancing
- ❌ HTTPS/SSL

**Extended Features:**
- ❌ Architecture diagram visualization page
- ❌ Multi-member support (currently hardcoded to Sarah Mitchell)
- ❌ Claim history pagination
- ❌ Search/filter on dashboard
- ❌ Export to PDF/email
- ❌ Mobile responsive optimizations
- ❌ Accessibility audit (WCAG 2.2)

---

## Integration Roadmap (Post-MVP)

### Phase 1: Data Layer Swap (Week 1)
**Goal:** Replace synthetic data with real sources

**Files to modify:**
- `backend/app/services/synthetic_data.py` → Replace with:
  - `get_member()` → Query member DB or API
  - `get_claims()` → Query claims adjudication system
  - Load denial mapping from real config/DB

**Everything else stays the same** - routers, services, models, frontend all unchanged.

**Testing:**
- Verify schemas match (MemberProfile, ClaimSummary)
- Ensure claim codes map to denial_mapping.json
- Test with 3-5 real member IDs

---

### Phase 2: SBC Retrieval (Week 2)
**Goal:** Hook up real plan documents

**Files to modify:**
- `backend/app/services/sbc_retriever.py` → Replace with:
  - Query SharePoint/Confluence for SBC PDFs
  - OR: Pre-chunked SBC markdown in database
  - OR: Vector DB lookup (if RAG enabled)

**Falls back gracefully** if SBC not found (deterministic mode).

---

### Phase 3: LLM Integration (Week 3-4)
**Goal:** Enable true agentic reasoning

**New dependencies:**
- Element LLM Gateway client
- Pydantic AI (recommended for tool-calling agents)

**Files to modify:**
- `backend/app/services/reconciliation.py` → Add LLM reasoning
- `backend/app/services/chat_agent.py` → Replace hardcoded flows with dynamic LLM responses

**Fallback:** If LLM unavailable, use deterministic flows (current MVP behavior).

---

### Phase 4: Production Hardening (Week 5-6)
**Goal:** Make it production-ready

- Add authentication (PingFed)
- Add logging/monitoring
- Containerize (Docker)
- Set up CI/CD pipeline
- Load testing
- Security audit
- WCAG accessibility audit

---

## File-by-File Integration Guide

### 🔄 Files That Need Real Data

**1. `backend/app/services/synthetic_data.py`**

**Current (Synthetic):**
```python
MEMBERS = {
    "SFP-882401-A": MemberProfile(...),
    ...
}

def get_member(member_id: str) -> MemberProfile | None:
    return MEMBERS.get(member_id)
```

**Future (Real):**
```python
import psycopg2  # or whatever DB client

def get_member(member_id: str) -> MemberProfile | None:
    conn = get_db_connection()
    row = conn.execute(
        "SELECT id, name, plan, group, deductible_used, deductible_max, ... FROM members WHERE id = ?",
        (member_id,)
    ).fetchone()
    if not row:
        return None
    return MemberProfile(
        id=row['id'],
        name=row['name'],
        ...
    )
```

**Schema stays identical** - MemberProfile doesn't change.

---

**2. `backend/app/services/sbc_retriever.py`**

**Current (Synthetic):**
```python
def retrieve_sbc_section(section: str, plan: str) -> str:
    # Returns hardcoded markdown
    return SYNTHETIC_SBC_TEXT
```

**Future (Real - Option A: Pre-chunked):**
```python
def retrieve_sbc_section(section: str, plan: str) -> str:
    conn = get_db_connection()
    row = conn.execute(
        "SELECT content FROM sbc_sections WHERE plan = ? AND section = ?",
        (plan, section)
    ).fetchone()
    return row['content'] if row else ""
```

**Future (Real - Option B: RAG):**
```python
import faiss

def retrieve_sbc_section(section: str, plan: str) -> str:
    query_embedding = get_embedding(section)
    sbc_index = load_faiss_index(plan)
    results = sbc_index.search(query_embedding, k=1)
    return results[0]['text']
```

---

**3. `backend/data/denial_mapping.json`**

**Current:** Static JSON file

**Future:** 
- Load from database table
- OR: Query CMS denial code API
- OR: Keep as config file (it's small and changes rarely)

---

### ✅ Files That DON'T Change

- `backend/app/main.py` - App entry, router registration
- `backend/app/routers/*` - All API endpoints
- `backend/app/models/schemas.py` - Data models (unless DB schema differs)
- `backend/app/services/eob_parser.py` - Parsing logic
- `backend/app/services/denial_lookup.py` - Lookup logic
- `backend/app/services/reconciliation.py` - Reasoning logic (unless adding LLM)
- `backend/app/services/chat_agent.py` - Conversation flows (unless adding LLM)
- `frontend/*` - Entire UI (unless changing branding/layout)

---

## Success Metrics for MVP Demo

### Stakeholder Demo Checklist

**✅ Can demonstrate:**
1. Open browser → Chat agent greets member by name
2. Click "Why was my claim denied?" → Watch tool chain animate
3. See denial card with code, reason, action owner
4. Click "How do I fix this?" → Get 3-step action plan with timeline
5. Click "What should I say?" → Get personalized call script, copy to clipboard
6. Switch to Dashboard → See members table, claims table, metrics
7. Switch to Reconcile → Paste EOB → Get full analysis with SBC excerpt
8. Switch to Denial Codes → See reference guide with plain-language explanations
9. Show `/docs` → Interactive Swagger UI with all endpoints
10. Show file structure → Explain clean separation of concerns

**✅ Can answer:**
- "How long to integrate with real data?" → **1-2 weeks, swap synthetic_data.py**
- "Does this use real AI?" → **No, deterministic for MVP. LLM-ready architecture.**
- "What if we don't have RAG?" → **Falls back to deterministic SBC lookup**
- "How do we test?" → **Swagger UI at /docs, or curl the APIs**
- "Can we customize the flows?" → **Yes, edit chat_agent.py - all flows are data**
- "Is this production-ready?" → **Architecture yes, needs auth/logging/deployment**

---

## Current MVP Status

### ✅ Complete
- [x] Backend architecture (FastAPI + routers + services)
- [x] All 9 API endpoints working
- [x] Reconciliation agent with full reasoning
- [x] Chat agent with 7 conversation flows
- [x] Synthetic data layer (3 members, 4 claims)
- [x] Frontend architecture (React SPA)
- [x] Dashboard page (members + claims tables)
- [x] Reconcile page (EOB input + full analysis)
- [x] Denial Codes reference page
- [x] Git initialized with clean commits

### 🔧 In Progress
- [ ] Chat UI page (components built, fixing JavaScript scope issue)

### 📋 Next Up (Post-Fix)
- [ ] End-to-end test of all chat flows
- [ ] README with setup instructions
- [ ] Architecture diagram visualization page
- [ ] Final demo prep

---

## Decision Log

**Why FastAPI?**
- Real REST APIs (not Streamlit's stateful server)
- Auto-generated docs
- Production-grade async support
- Easy to test with curl/Postman

**Why CDN React?**
- Zero build step (no webpack, vite, npm)
- Instant dev loop
- Easier for non-frontend devs to modify
- Can migrate to proper build later if needed

**Why deterministic first?**
- Prove the architecture without LLM dependency
- Faster iteration
- Easier to debug
- Fallback if LLM is down
- Controlled demo (no hallucinations)

**Why separate chat from reconcile?**
- Chat = conversational UX for members
- Reconcile = power tool for operations/analysts
- Different use cases, same underlying agent

**Why Walmart colors?**
- Internal tooling should match brand
- Builds trust with stakeholders
- Shows attention to detail

---

## Risk Mitigation

**Risk: Real data schemas don't match synthetic**
- **Mitigation:** Document expected schemas now, validate early with data team

**Risk: SBC documents are PDFs, not markdown**
- **Mitigation:** SBC retriever has fallback mode, can add PDF parsing later

**Risk: Denial codes in production differ from mapping**
- **Mitigation:** Denial lookup rejects unknown codes (doesn't guess)

**Risk: Stakeholders expect real AI**
- **Mitigation:** Set expectations upfront - "deterministic MVP, LLM-ready architecture"

**Risk: Black screen / JavaScript errors**
- **Mitigation:** Consolidate components into single file, test incrementally

---

## Definition of Done (MVP)

**MVP is "done" when:**
1. ✅ All 9 API endpoints return 200 OK
2. ✅ Swagger docs load and all endpoints are testable
3. 🔄 All 4 frontend pages render without errors
4. 🔄 Chat agent handles all 7 conversation flows
5. 🔄 Tool chains animate correctly
6. ✅ README exists with setup instructions
7. ✅ Git history is clean (no secrets, no huge files)
8. 🔄 Can run `uvicorn app.main:app` and demo to stakeholders
9. 📋 Integration guide exists (this doc)
10. 📋 Can answer "how long to production?" with confidence

**Legend:**
- ✅ Done
- 🔄 In progress
- 📋 Pending

---

## Next Session Checklist

1. [ ] Fix chat UI black screen (consolidate components)
2. [ ] Test all 7 chat flows end-to-end
3. [ ] Verify tool chain animations
4. [ ] Screenshot each page for documentation
5. [ ] Write README.md with setup steps
6. [ ] Create INTEGRATION.md with real data hookup guide
7. [ ] Final commit + tag as `v0.1-mvp`
8. [ ] Practice stakeholder demo (5-min version)
