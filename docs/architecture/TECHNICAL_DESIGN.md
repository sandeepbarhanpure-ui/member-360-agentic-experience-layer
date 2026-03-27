# Member 360 — Technical Design

This document describes the current v2 implementation: what each component does, what its interface is, where the edge cases are, and what a real integration needs to provide. It is written from the code, not from intent.

**What this system does:** Interprets adjudication outcomes and translates them into plain-English member guidance.

**What this system does not do:** Decide if a claim is paid, override an adjudication decision, or write back to any system of record.

---

## Table of Contents

- [Architecture Decisions](#architecture-decisions)
- [Data Model](#data-model)
- [Component Interfaces](#component-interfaces)
- [The Reconciliation Pipeline](#the-reconciliation-pipeline)
- [The Chat Agent](#the-chat-agent)
- [Known Limitations](#known-limitations)
- [Integration Specification](#integration-specification)

---

## Architecture Decisions

Each decision below records what was chosen, the alternative, and the reason the alternative was rejected.

### FastAPI over Flask

**Chosen:** FastAPI 0.2.0 with Pydantic v2.

**Rejected:** Flask.

**Why:** Pydantic v2 schema validation is native — request and response bodies are typed, validated, and documented automatically. The Swagger UI at `/docs` is generated without any manual effort. Flask would require `marshmallow` or `pydantic` wired in separately, adding indirection between the schema definitions and the API contract. FastAPI's `lifespan` context manager also provides a clean, dependency-injection-adjacent pattern for initializing the `DenialLookup`, `SBCRetriever`, and `ReconciliationAgent` once at startup and attaching them to `app.state`.

### CDN React over a build step

**Chosen:** React 18 loaded from CDN, JSX transpiled by Babel in the browser.

**Rejected:** Vite, Create React App, or any Node-based build pipeline.

**Why:** The prototype needs to be runnable with `uvicorn` alone — no Node toolchain, no `npm install`, no build step. The frontend is served as static files by FastAPI from the filesystem. The CDN approach has no production use case, but for a prototype it eliminates an entire class of setup friction. When this ships, the frontend build step is a known and scoped addition.

### Deterministic-first, not LLM-first

**Chosen:** JSON lookup for denial code interpretation, rule-based logic for consistency checking, scoped header matching for SBC retrieval.

**Rejected:** Sending the denial code and EOB text to an LLM and asking it to explain what happened.

**Why:** CARC codes have published, fixed meanings. There is no interpretation involved — CO-197 means "Prior Authorization Absent" in every context. Sending a known code through a language model introduces variance (different phrasing, different emphasis, potential hallucination) where none belongs. The compliance constraint is binary: the answer must be the same every time, and it must be auditable. The LLM surface in this system is in the roadmap for the *conversation layer* (dynamic follow-ups, multi-turn reasoning), not the interpretation pipeline.

### FAISS/LangChain as optional dependency

**Chosen:** `SBCRetriever` attempts to import LangChain and FAISS at startup; if the import fails, it silently falls back to deterministic header matching. The `ReconciliationResult.rag_available` field tells callers which path was taken.

**Rejected:** Hard-requiring FAISS.

**Why:** The demo must run with `pip install fastapi uvicorn` and nothing else. Most plan document retrieval in this prototype is deterministic anyway — the denial mapping already names the exact SBC section, so full semantic search is over-engineered for the current data. FAISS becomes meaningful at scale when the plan document is large and sections aren't predictably named.

### All monetary amounts as strings in schemas

**Chosen:** `billed_amount`, `allowed_amount`, `plan_paid`, `member_responsibility` are all `str` in `EOBRecord`. `billed`, `allowed`, `plan_paid`, `member_owes` are all `str` in `ClaimSummary`.

**Rejected:** `float` or `Decimal`.

**Why:** EOB text arrives in formats like `$1,250.00`. Coercing to float at parse time requires stripping currency symbols and commas and deciding what to do when the format is unexpected. The prototype defers that decision to the integration layer. Real integration with an 835 EDI parser or a DB query would produce typed amounts and these fields should be migrated to `Decimal` at that point.

---

## Data Model

All schemas are in `backend/app/models/schemas.py`. They are the single source of truth for data contracts between every component.

### EOBRecord

The structured output of `EOBParser.parse()`. Every field defaults to an empty string — the parser never raises, it just leaves fields empty if the label was not found in the input text.

```python
class EOBRecord(BaseModel):
    status: str = ""            # "DENIED", "PROCESSED", etc.
    code: str = ""              # CARC code, e.g. "CO-197"
    service: str = ""           # "MRI Knee"
    facility: str = ""          # "Outpatient Clinic" — used in ER exception check
    billed_amount: str = ""     # "$1,250.00" — string, not float
    member_id: str = ""
    date_of_service: str = ""
    provider: str = ""          # Provider name (not NPI)
    allowed_amount: str = ""
    plan_paid: str = ""
    member_responsibility: str = ""
    remark: str = ""
    raw_text: str = ""          # Original input preserved verbatim
```

**Critical note:** If `code` is empty (because the EOB text had no recognized `Code:` label), `DenialLookup.lookup("")` returns `None`, and `ReconciliationAgent.reconcile()` returns a `cannot_interpret` error. This is the correct behavior but it is silent — there is no distinction in the error message between "unknown code" and "no code found at all."

### DenialMapping

One entry from `denial_mapping.json`. Loaded at startup, never modified at runtime.

```python
class DenialMapping(BaseModel):
    code: str           # "CO-197"
    reason: str         # "Prior Authorization Absent" — short label
    plain_language: str # Full plain-English explanation for the member
    sbc_section: str    # "Advanced Imaging" — the exact section name SBCRetriever uses
    action_owner: str   # "Provider" or "Member"
    script: str         # Pre-written call script with [ID] and [Date] placeholders
```

### ReconciliationResult

The full output of the pipeline. The `error` field and the rest are mutually exclusive in practice — if `error` is set, `mapping` is `None` and `sbc_excerpt` is empty.

```python
class ReconciliationResult(BaseModel):
    eob: EOBRecord
    mapping: Optional[DenialMapping] = None   # None if code not recognized
    sbc_excerpt: str = ""                     # Retrieved plan rule text
    reasoning: str = ""                       # Markdown output of _reason()
    is_consistent: bool = True                # False only for CO-197 + ER facility
    confidence: str = "HIGH"                  # "HIGH" if SBC found, "MEDIUM" if not
    error: Optional[str] = None              # Set when code is unrecognized
    rag_available: bool = False               # True if FAISS was used
```

### MemberProfile and ClaimSummary

These two types are the integration boundary. They are what `synthetic_data.py` provides, and they are what a real data layer must provide.

```python
class Accumulator(BaseModel):
    used: float
    max: float

class MemberProfile(BaseModel):
    id: str
    name: str
    plan: str
    group: str
    deductible: Accumulator
    oop: Accumulator

class ClaimSummary(BaseModel):
    status: str          # "DENIED", "PROCESSED"
    code: str            # CARC code
    service: str
    facility: str
    provider: str
    npi: str
    date_of_service: str
    billed: str          # "$1,250.00" — string
    allowed: str
    plan_paid: str
    member_owes: str
    remark: str
```

---

## Component Interfaces

### EOBParser

**Location:** `backend/app/services/eob_parser.py`

**Interface:**
```python
EOBParser.parse(text: str) -> EOBRecord   # static method
```

**Behavior:** Iterates over lines of `text`. For each line, checks if it starts with any label in `_FIELD_MAP` (case-insensitive). If it does, splits on the first `:` and takes the right side as the value. Returns an `EOBRecord` with all matched fields populated.

**What it does not do:** Validate that required fields are present. Raise on malformed input. Handle multi-line field values. Handle different delimiters (e.g., `=` or tab).

**Supported input format:**
```
CLAIM STATUS: DENIED
Code: CO-197
Service: MRI Knee
Facility: Outpatient Clinic
Billed Amount: $1,250.00
Member ID: SFP-882401-A
Date of Service: 2026-03-10
Rendering Provider: Dr. James Whitfield
Allowed Amount: $0.00
Plan Paid: $0.00
Member Responsibility: $1,250.00
Remark: Service requires prior authorization per plan guidelines.
```

Inputs in any other format produce an `EOBRecord` with empty fields.

---

### DenialLookup

**Location:** `backend/app/services/denial_lookup.py`

**Interface:**
```python
DenialLookup(mapping_path: Path)          # loads JSON at init
DenialLookup.lookup(code: str) -> DenialMapping | None
DenialLookup.all_codes() -> list[DenialMapping]
```

**Behavior:** Loads `denial_mapping.json` into a `dict[str, DenialMapping]` at construction. `lookup()` is a dict get — O(1), returns `None` for unrecognized codes. `all_codes()` returns the full list in insertion order.

**Current mapping — 6 codes:**

| Code | Reason | Action Owner |
|---|---|---|
| CO-197 | Prior Authorization Absent | Provider |
| CO-16 | Missing Medical Records | Provider |
| CO-4 | Procedure Modifier Inconsistency | Provider |
| CO-29 | Filing Deadline Exceeded | Provider |
| PR-1 | Member Deductible Applies | Member |
| PR-2 | Coinsurance Applies | Member |

Adding a new code requires only a new entry in `denial_mapping.json`. The `_reason()` method in `ReconciliationAgent` has a separate `elif` chain — a new code added to the JSON without a corresponding `elif` will fall through to the generic `else` branch, which always returns `is_consistent=True`. See [Known Limitations](#known-limitations).

---

### SBCRetriever

**Location:** `backend/app/services/sbc_retriever.py`

**Interface:**
```python
SBCRetriever(sbc_path: Path, vectorstore_dir: Path | None = None)
SBCRetriever.retrieve(section_name: str) -> tuple[str, bool]
# Returns: (section_text, used_rag)
# used_rag=True means FAISS was used; False means deterministic header match
```

**Startup behavior:** Attempts to import LangChain and FAISS. If available, checks if a saved vectorstore exists at `vectorstore_dir` (defaults to `data/vectorstore/`). If a saved store exists, loads it. If not, builds one from `synthetic_sbc.md` using `all-MiniLM-L6-v2` embeddings and saves it. Building from scratch is slow (~20 seconds on first run). All exceptions during this process are caught and swallowed — `self.vectorstore` is set to `None` on any failure.

**Retrieval behavior (RAG path):**
1. `similarity_search(section_name, k=2)` against the vectorstore
2. Checks each result's `Section` metadata for an exact name match
3. If a match is found, returns that document's content
4. If no exact match, returns the top-k result's content
5. On any exception, falls through to deterministic path

**Retrieval behavior (deterministic path):**
1. Exact match against `self.sections` dict (key is the `## Header` text)
2. Partial match — checks if `section_name` is a substring of a key or vice versa
3. Returns empty string if nothing matched

**Deterministic path sections (from `synthetic_sbc.md`):** Advanced Imaging, Physical Therapy, Emergency Services, Preventive Care, Prescription Drugs, Cost Sharing, Claims Procedures, Out-of-Network Coverage, Mental Health, Maternity.

---

### ReconciliationAgent

**Location:** `backend/app/services/reconciliation.py`

**Interface:**
```python
ReconciliationAgent(denial_lookup: DenialLookup, sbc_retriever: SBCRetriever)
ReconciliationAgent.reconcile(eob: EOBRecord) -> ReconciliationResult
```

**Dependency injection:** The agent receives already-initialized `DenialLookup` and `SBCRetriever` instances. These are constructed once in `main.py`'s lifespan handler and attached to `app.state`.

---

## The Reconciliation Pipeline

Every call to `POST /api/reconcile` runs this pipeline in sequence. There are no async steps.

```
Request (eob_text: str)
    │
    ▼
[1] EOBParser.parse(eob_text)
    → EOBRecord (all fields str, empty if not found)
    │
    ▼
[2] DenialLookup.lookup(eob.code)
    ├── None → ReconciliationResult(error="Code X not in mapping")
    │          STOP — nothing further executes
    └── DenialMapping
    │
    ▼
[3] SBCRetriever.retrieve(mapping.sbc_section)
    → (sbc_text: str, used_rag: bool)
    → sbc_text = "(SBC section not found)" if empty
    │
    ▼
[4] ReconciliationAgent._reason(eob, mapping, sbc_text)
    → (reasoning: str, is_consistent: bool)
    │
    ▼
[5] ReconciliationResult assembled
    confidence = "HIGH" if sbc_text was found, else "MEDIUM"
    rag_available = used_rag from step 3
```

### Step 4 in detail — the `_reason()` decision matrix

`_reason()` is an `if/elif/else` chain on `eob.code`. Each branch produces a markdown-formatted reasoning string and an `is_consistent` flag.

| Code | Condition checked | `is_consistent` | Conclusion |
|---|---|---|---|
| CO-197 | `"emergency" in facility.lower()` or `"er " in facility.lower()` AND `"prior authorization" in sbc_text.lower()` | `False` if ER, else `True` | ER exception applies if facility matches — only case where `is_consistent` can be `False` |
| CO-16 | None — always consistent | `True` | Provider must resubmit with records |
| CO-4 | None — always consistent | `True` | Provider coding error |
| CO-29 | None — always consistent | `True` | Late filing |
| PR-* (any) | `code.startswith("PR-")` | `True` | Cost-sharing, not a denial |
| else | Any code in mapping not matched above | `True` | Generic consistent message |

**The else branch:** Any code added to `denial_mapping.json` that is not CO-197, CO-16, CO-4, CO-29, or a PR- prefix will hit the `else` clause and receive the generic message: *"Denial appears consistent with plan guidelines."* This is technically correct (the code was recognized) but provides no specific reasoning. New codes should have a corresponding `elif` block added to `_reason()`.

### Error response shape

When the denial code is not recognized, the pipeline returns immediately:

```json
{
  "eob": { "code": "XY-999", "...": "..." },
  "mapping": null,
  "sbc_excerpt": "",
  "reasoning": "",
  "is_consistent": true,
  "confidence": "HIGH",
  "error": "Code **XY-999** is not present in the denial mapping. The system cannot interpret this claim. Please contact Member Services for assistance.",
  "rag_available": false
}
```

Note: `is_consistent` defaults to `true` and `confidence` defaults to `"HIGH"` even in error results — these are Pydantic field defaults, not meaningful values. Callers must check `error is not null` first before reading any other field.

---

## The Chat Agent

**Location:** `backend/app/services/chat_agent.py`

The chat agent is a scripted flow engine, not an LLM. It maps user messages to pre-defined response objects using fuzzy string matching.

### How it works

```
POST /api/chat { message, member_id }
    │
    ▼
[1] get_member(member_id) — from synthetic_data.py
    get_claims(member_id) — claim[0] is the context claim
    │
    ▼
[2] build_flows(member, claim)
    → dict keyed by question string, e.g. "why was my mri claim denied?"
    → personalized with member.id, claim.code, claim.date_of_service, etc.
    │
    ▼
[3] find_flow(message, flows)
    → lowercase + strip punctuation
    → try exact/substring match against flow keys
    → try keyword map (7 keyword groups → 6 flow keys)
    → None if no match
    │
    ├── None → ChatResponse(matched=False, type="fallback")
    └── flow → ChatResponse(tools, response, suggestions, matched=True)
```

### The 7 flows

| Flow key | Trigger keywords | Response type |
|---|---|---|
| `greeting` | GET `/api/chat/greeting` only | `greeting` |
| `why was my mri claim denied?` | denied, why, mri | `denial_explanation` + `denial_card` |
| `how do i get this fixed?` | fix, resolve, next step | `action_plan` + `timeline_card` |
| `what exactly should i say to the provider?` | script, say, call | `script` |
| `what do i owe right now?` | owe, cost, pay, financial, deductible | `financial_summary` + `financial_card` |
| `could i appeal this myself?` | appeal | `explanation` |
| `what if the provider refuses?` | refuse, won't, escalat | `explanation` |

### Tool chain simulation

Each flow includes a `tools` list that the frontend renders as a sequential animation. The tools are not real function calls — they are display metadata:

```json
{
  "name": "lookup_denial_code",
  "label": "Denial Code Lookup",
  "detail": "CO-197 → Prior Authorization Absent — mapped to SBC § Advanced Imaging",
  "duration": 1000
}
```

The `duration` field controls the animation timing in milliseconds. The `detail` strings contain real data (member ID, claim code, facility) interpolated from the `MemberProfile` and `ClaimSummary` objects at flow-build time.

### Current constraint

The chat is scoped to one member (`SFP-882401-A`) and one claim (the first `ClaimSummary` returned by `get_claims()`). The `member_id` parameter in `ChatRequest` is accepted and used for member lookup, but the flow content — denial code, service, facility, call script — is hardcoded to the CO-197 MRI scenario. A different member with a CO-16 denial would receive the CO-197 script with their name inserted. This is a known prototype constraint.

---

## Known Limitations

| # | Limitation | Location | Impact |
|---|---|---|---|
| 1 | `EOBParser` silently produces empty `EOBRecord` fields on unrecognized input formats | `eob_parser.py` | Any EOB format other than the label:value format in `mock_eob.txt` produces an uninterpretable result with no error to the caller |
| 2 | Empty `code` and unrecognized code produce identical error messages | `reconciliation.py` | Cannot distinguish "no code found in EOB" from "code found but not in mapping" |
| 3 | New denial codes added to `denial_mapping.json` without a matching `elif` in `_reason()` silently produce generic reasoning | `reconciliation.py` | No enforcement that mapping entries and reasoning logic stay in sync |
| 4 | Chat flows are hardcoded to the CO-197 MRI denial scenario regardless of the actual claim | `chat_agent.py` | A member with a CO-16 denial receives CO-197-specific scripts and explanations |
| 5 | Claims are not relationally linked to members | `synthetic_data.py` | `get_claims(member_id)` returns results only for `SFP-882401-A`; all other IDs return empty list |
| 6 | `SBCRetriever` builds the FAISS vectorstore synchronously at startup if LangChain is installed | `sbc_retriever.py` | First startup can take 20+ seconds with no progress indicator |
| 7 | `confidence` field is binary, not a probability | `reconciliation.py` | Reflects whether the SBC section was found, not a real confidence score. Callers should treat it as a boolean. |
| 8 | CORS allows all origins | `main.py` | Fine for development; must be scoped before connecting real member data |
| 9 | No authentication on any endpoint | `main.py` | All data is currently synthetic, but must be addressed before production |
| 10 | `chat_agent.py` is 14.4 KB and approaching the refactor threshold | `chat_agent.py` | Each new flow adds ~50–80 lines; the file should be split into flow modules before adding scenarios beyond the current 7 |

---

## Integration Specification

Connecting real data to this system requires implementing one file: `backend/app/services/synthetic_data.py`. No other file needs to change.

### Required interface

```python
def get_member(member_id: str) -> MemberProfile | None:
    """
    Return the member profile for the given ID.
    Return None if the member does not exist.
    """
    ...

def get_all_members() -> list[MemberProfile]:
    """
    Return all members accessible to the current context.
    In production, this would be scoped to the authenticated session.
    """
    ...

def get_claims(member_id: str | None = None) -> list[ClaimSummary]:
    """
    Return claims for the given member_id, or all claims if None.
    The caller expects a flat list — no pagination in the current router.
    The chat agent uses claims[0] as its context claim.
    """
    ...
```

### Field mapping notes

**`MemberProfile.deductible` and `.oop`** — `Accumulator.used` and `.max` are `float`. Source these from the adjudication engine's accumulator API or benefits platform. Values are in dollars.

**`ClaimSummary.billed`, `.allowed`, `.plan_paid`, `.member_owes`** — currently `str` (e.g., `"$1,250.00"`). These are passed through to the frontend as display strings. When integrating, format as `f"${amount:,.2f}"` from a numeric source. If the field types are migrated to `Decimal` for calculation purposes, update the chat agent's financial summary flow, which does string interpolation on these values.

**`ClaimSummary.code`** — must be a CARC code present in `denial_mapping.json` for the reconciliation pipeline to produce a full result. Claims with unrecognized codes return `cannot_interpret` from `/api/reconcile`. Expand `denial_mapping.json` before connecting broad real claims data.

**`ClaimSummary.facility`** — the CO-197 reasoning branch checks `facility.lower()` for `"emergency"` or `"er "` (note the trailing space). `"Emergency Department"` matches. `"ED"` or `"ER"` without a trailing space do not. Ensure facility names from real sources are consistent with this check or update the string comparison.

### EOB ingest

The current `EOBParser` handles only the plaintext label:value format. In production, EOB data arrives as ANSI X12 835 Electronic Remittance Advice transactions. The integration path is to build an `EDI835Parser` that produces the same `EOBRecord` output. `docs/product/ROADMAP.md` contains the segment mapping from 835 CLP/CAS segments to `EOBRecord` fields.

### SBC documents

Replace `backend/data/synthetic_sbc.md` with real plan SBC documents. `SBCRetriever` parses `## H2 headers` as section names and expects the `sbc_section` values in `denial_mapping.json` to match those headers exactly (case-insensitive partial match is the fallback). If the real SBC uses different section naming conventions, update the mapping entries accordingly.

### Services on app.state

The three core services — `DenialLookup`, `SBCRetriever`, `ReconciliationAgent` — are initialized once in the `lifespan` handler in `main.py` and stored on `app.state`. They are not re-initialized per request. Any integration that requires per-request context (e.g., tenant-specific SBC documents for a multi-employer platform) needs the service initialization architecture to change.
