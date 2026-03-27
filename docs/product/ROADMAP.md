# Roadmap — Proposed Enhancements

> Three high-value engineering improvements that would take this prototype toward a production-grade claims advocacy system.

---

## Issue #1

**Title:** Add 835 EDI transaction parsing for real-world EOB ingest

**Labels:** `enhancement`, `architecture`

**Body:**

The current `EOBParser` extracts fields from plaintext EOB files using regex matching against label:value pairs. In production, EOB data arrives as ANSI X12 835 Electronic Remittance Advice transactions.

**Proposed changes:**

- Add an `EDI835Parser` class that handles the X12 envelope structure (ISA/GS/ST segments)
- Map CLP (Claim Payment) segments to the existing `EOBRecord` dataclass:
  - CLP01 → claim ID
  - CLP02 → claim status (1=processed, 2=denied, 4=denied)
  - CLP03 → billed amount
  - CLP04 → paid amount
- Map CAS (Claim Adjustment) segments to denial code extraction:
  - CAS01 → adjustment group (CO, PR, OA, PI, CR)
  - CAS02 → CARC code (maps to `denial_mapping.json`)
  - CAS03 → adjustment amount
- Preserve backward compatibility with the plaintext parser for demo/testing
- Add sample 835 test fixtures

**Why this matters:** The plaintext parser works for the prototype, but any production deployment against a real adjudication engine will receive 835 transactions. The `EOBRecord` dataclass is already structured to accept this data — the parser is the only gap.

---

## Issue #2

**Title:** Expand denial mapping to support RARC codes alongside CARC

**Labels:** `enhancement`, `data`

**Body:**

The current `denial_mapping.json` maps CARC (Claim Adjustment Reason Codes) to plain-language explanations. In production, the combination of CARC + RARC (Remittance Advice Remark Codes) provides a much richer interpretation.

**Example:**
- CARC CO-197 alone = "Prior Authorization Absent"
- CARC CO-197 + RARC N527 = "Prior Authorization Absent — authorization was requested but response not received within the required timeframe"

**Proposed schema change:**

```json
{
  "CO-197": {
    "reason": "Prior Authorization Absent",
    "plain_language": "...",
    "rarc_overrides": {
      "N527": {
        "plain_language": "The provider requested authorization but didn't receive a response in time.",
        "action_owner": "Provider",
        "script": "I'm calling about claim [ID]. My provider submitted a prior auth request but the plan didn't respond within the required timeframe..."
      },
      "N517": {
        "plain_language": "No prior authorization was submitted at all.",
        "action_owner": "Provider",
        "script": "..."
      }
    },
    "sbc_section": "Advanced Imaging",
    "action_owner": "Provider",
    "script": "..."
  }
}
```

**Impact:** RARC-level specificity changes the call script significantly. "Your provider didn't file auth at all" vs. "Your provider filed but the plan didn't respond in time" are completely different conversations with different action paths.

---

## Issue #3

**Title:** Replace pre-scripted chat flows with LangChain Agent + tool-use orchestration

**Labels:** `enhancement`, `agentic-ai`

**Body:**

The React chat UI (`member360_chat.jsx`) currently uses pre-scripted conversation flows matched via keyword fuzzy-matching. This works for the demo but doesn't handle novel questions or multi-turn reasoning.

**Proposed architecture:**

Replace the static flow engine with a LangChain `create_react_agent` backed by custom tools:

```python
from langchain.agents import create_react_agent, AgentExecutor
from langchain.tools import Tool

tools = [
    Tool(name="read_eob", func=eob_parser.parse, description="Parse an EOB text file into structured fields"),
    Tool(name="lookup_denial_code", func=agent.lookup, description="Look up a CARC code in the denial mapping"),
    Tool(name="search_sbc", func=retriever.retrieve, description="Retrieve a specific section from the plan SBC"),
    Tool(name="check_consistency", func=agent.reason, description="Compare EOB data against SBC rules"),
    Tool(name="generate_script", func=agent.script, description="Generate a personalized call script"),
    Tool(name="fetch_accumulators", func=accum.fetch, description="Get member deductible and OOP status"),
]

agent = create_react_agent(llm, tools, prompt)
executor = AgentExecutor(agent=agent, tools=tools, verbose=True)
```

**Key constraints to preserve:**
- The `lookup_denial_code` tool must enforce the hard constraint: unknown codes return an error, not an inference
- The `search_sbc` tool must scope retrieval to the section specified by the denial mapping
- Tool-call visibility must be maintained in the UI (the tool chain is a core UX feature)
- The role boundary disclaimer must remain on every screen

**Why now:** The pre-scripted flows cover the demo scenarios well, but leadership will ask "what happens when someone asks something we didn't script?" The agent architecture answers that while preserving the deterministic guardrails.
