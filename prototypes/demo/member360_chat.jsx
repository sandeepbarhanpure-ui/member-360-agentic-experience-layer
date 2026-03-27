// Copyright (c) 2026 Sandeep Barhanpure. All Rights Reserved.
// Proprietary software — see LICENSE for terms.

const { useState, useEffect, useRef, useCallback } = React;

/* ═══════════════════════════════════════════════════════════════
   DATA LAYER
   ═══════════════════════════════════════════════════════════════ */

const MEMBER = {
  name: "Sarah Mitchell", id: "SFP-882401-A",
  plan: "2026 Self-Funded Health Plan", group: "Acme Industries, Inc.",
  deductible: { used: 620, max: 1500 },
  oop: { used: 820, max: 4500 },
};

const CLAIM = {
  status: "DENIED", code: "CO-197", service: "MRI Knee",
  facility: "Outpatient Clinic", provider: "Dr. James Whitfield",
  npi: "1234567890", dos: "2026-03-10",
  billed: "$1,250.00", allowed: "$0.00",
  planPaid: "$0.00", memberOwes: "$1,250.00",
  remark: "Service requires prior authorization per plan guidelines.",
};

const DENIAL_MAP = {
  "CO-197": {
    reason: "Prior Authorization Absent",
    plain_language: "The provider didn't get the required approval from the plan before performing the MRI.",
    sbc_section: "Advanced Imaging",
    action_owner: "Provider",
    script: `I'm calling about claim for member SFP-882401-A, date of service 03/10/2026. My plan denied this MRI because a prior authorization was not filed. As an in-network provider, please submit a retroactive authorization to resolve this.`,
  },
};

const SBC_TEXT = "All MRIs and CT scans require Prior Authorization 5 days in advance. Exception: This is waived if performed in an Emergency Room. The authorization must reference a valid ICD-10 diagnosis code. Retroactive authorizations are accepted within 72 hours of the service date for urgent situations only.";

/* ═══════════════════════════════════════════════════════════════
   AGENT CONVERSATION SCRIPTS
   ═══════════════════════════════════════════════════════════════ */

const AGENT_FLOWS = {
  greeting: {
    tools: [],
    response: {
      type: "greeting",
      text: `Hi Sarah! I'm your Benefits Advocate agent. I have access to your recent claims and plan documents.\n\nI can see you have a **denied claim** from March 10th that may need attention. Would you like me to look into it?`,
    },
    suggestions: ["Why was my MRI claim denied?", "What do I owe right now?", "How do I fix this?"],
  },

  "why was my mri claim denied?": {
    tools: [
      { name: "read_eob", label: "Reading EOB", detail: "Claim #SFP-882401-A → CO-197 · MRI Knee · Outpatient Clinic", duration: 1200 },
      { name: "lookup_denial_code", label: "Denial Code Lookup", detail: "CO-197 → Prior Authorization Absent — mapped to SBC § Advanced Imaging", duration: 1000 },
      { name: "query_sbc_rag", label: "RAG: Plan Document Search", detail: "Retrieved § Advanced Imaging from 2026 Self-Funded Health Plan SBC (similarity: 0.94)", duration: 1400 },
      { name: "reconcile", label: "Reconciliation Engine", detail: "EOB facility = 'Outpatient Clinic' ≠ Emergency Room → ER exception does NOT apply → denial is CONSISTENT", duration: 900 },
    ],
    response: {
      type: "denial_explanation",
      headline: "Your MRI was denied because the provider didn't get pre-approval.",
      details: [
        "Your plan requires **Prior Authorization** for all MRIs and CT scans at least 5 days before the procedure — this is in the **Advanced Imaging** section of your plan rules.",
        "Your MRI was done at an **Outpatient Clinic**. There's an exception for Emergency Room visits, but since this wasn't an ER visit, that exception doesn't apply here.",
        "This means the denial **is consistent** with your plan rules. The good news: this is the **provider's responsibility** to fix, not yours.",
      ],
      card: {
        type: "denial_card",
        code: "CO-197",
        reason: "Prior Authorization Absent",
        service: "MRI Knee",
        amount: "$1,250.00",
        owner: "Provider",
        consistent: true,
        sbcRef: "§ Advanced Imaging",
      },
    },
    suggestions: ["How do I get this fixed?", "What exactly should I say to the provider?", "Could I appeal this myself?"],
  },

  "how do i get this fixed?": {
    tools: [
      { name: "determine_action_path", label: "Action Path Analysis", detail: "Action owner = Provider → retroactive authorization path available within 72hr window", duration: 800 },
      { name: "check_timeline", label: "Deadline Check", detail: "DOS 2026-03-10 → 72hr urgent retro-auth window EXPIRED → standard appeal path (180 days remaining)", duration: 1000 },
      { name: "generate_script", label: "Building Call Script", detail: "Personalizing script with claim ID, DOS, provider NPI, and facility details", duration: 700 },
    ],
    response: {
      type: "action_plan",
      headline: "Here's your step-by-step plan to resolve this.",
      steps: [
        { num: 1, title: "Call Dr. Whitfield's billing office", detail: "The provider needs to submit a **retroactive authorization** or file a **corrected claim** with the prior auth on record. This is their responsibility — you shouldn't owe anything for their administrative miss.", time: "10 min call" },
        { num: 2, title: "Reference your claim details", detail: "Give them your Member ID **SFP-882401-A**, date of service **03/10/2026**, and mention the denial code **CO-197**. I've prepared a script below you can use.", time: "During call" },
        { num: 3, title: "Follow up in 14 business days", detail: "If the provider resubmits, allow 14 business days for reprocessing. If you don't see an updated EOB by then, call us back and I can escalate.", time: "Set reminder" },
      ],
      card: {
        type: "timeline_card",
        deadlineLabel: "Appeal Deadline",
        deadline: "September 6, 2026",
        daysRemaining: 167,
      },
    },
    suggestions: ["What exactly should I say to the provider?", "What if the provider refuses?", "Set a reminder for me"],
  },

  "what exactly should i say to the provider?": {
    tools: [
      { name: "generate_script", label: "Personalizing Call Script", detail: "Inserting claim specifics: Member SFP-882401-A, DOS 03/10, NPI 1234567890, Code CO-197", duration: 600 },
    ],
    response: {
      type: "script",
      headline: "Here's a ready-to-use script for your call.",
      intro: "When you call Dr. Whitfield's office, ask for the **billing department** and say:",
      script: `Hi, I'm calling about a denied claim for patient Sarah Mitchell, Member ID SFP-882401-A. The date of service was March 10th, 2026 for an MRI of the knee.\n\nThe claim was denied under code CO-197 because prior authorization was not obtained. My plan requires prior auth for all advanced imaging at outpatient facilities.\n\nAs the in-network provider, could you please submit a retroactive authorization or file a corrected claim? The plan allows retroactive auths for urgent situations, and standard appeals are accepted within 180 days of the denial.`,
      tips: [
        "Ask for a **reference number** for the call",
        "Request they **fax confirmation** once they resubmit",
        "If they push back, mention you'll file a formal grievance with the plan",
      ],
    },
    suggestions: ["What if the provider refuses?", "Can you explain my overall benefits?", "What do I owe right now?"],
  },

  "what do i owe right now?": {
    tools: [
      { name: "fetch_accumulators", label: "Fetching Accumulators", detail: "Deductible: $620 / $1,500 · OOP Max: $820 / $4,500 — as of 03/23/2026", duration: 900 },
      { name: "pending_claims", label: "Checking Pending Claims", detail: "1 denied claim ($1,250) — if resolved, would not apply to accumulators since plan pays", duration: 700 },
    ],
    response: {
      type: "financial_summary",
      headline: "Here's your current financial snapshot.",
      details: [
        "You've used **$620 of your $1,500 deductible** so far this year — that's about 41%.",
        "Your out-of-pocket spending is at **$820 of your $4,500 maximum**.",
        "The **$1,250 denied MRI** is currently showing as your responsibility, but if the provider successfully resubmits with authorization, the plan would reprocess it. After your remaining deductible ($880), the plan pays 80% — so your share would drop to about **$74** in coinsurance.",
      ],
      card: {
        type: "financial_card",
        deductible: { used: 620, max: 1500 },
        oop: { used: 820, max: 4500 },
        potentialSavings: "$1,176.00",
      },
    },
    suggestions: ["How do I get the MRI denial fixed?", "What's covered under preventive care?", "Explain my coinsurance"],
  },

  "could i appeal this myself?": {
    tools: [
      { name: "query_sbc_rag", label: "RAG: Appeal Procedures", detail: "Retrieved § Claims Procedures — appeal rights and timelines", duration: 1100 },
      { name: "evaluate_appeal_path", label: "Evaluating Options", detail: "Member-initiated appeal vs. provider retro-auth — comparing timelines and success rates", duration: 800 },
    ],
    response: {
      type: "explanation",
      headline: "You can, but the provider route is faster and more likely to succeed.",
      details: [
        "Under your plan's **Claims Procedures**, you have the right to file an appeal within **180 days** of the denial notice. That gives you until approximately **September 6, 2026**.",
        "However, I'd recommend starting with the provider first. Since CO-197 is specifically about a missing prior auth — which is the **provider's obligation** for in-network services — they have the most direct path to resolution by submitting a retroactive authorization.",
        "If the provider doesn't act within 30 days, **then** filing a member appeal is a strong backup. You can reference that the provider failed their administrative duty as an in-network participant.",
        "I can help you draft either a provider call script or a formal appeal letter — whichever you need.",
      ],
    },
    suggestions: ["What exactly should I say to the provider?", "Help me draft an appeal letter", "What if the provider refuses?"],
  },

  "what if the provider refuses?": {
    tools: [
      { name: "escalation_paths", label: "Escalation Analysis", detail: "3 paths identified: formal grievance, state insurance dept, member appeal with negligence documentation", duration: 900 },
    ],
    response: {
      type: "explanation",
      headline: "You have several escalation options if the provider won't act.",
      details: [
        "**Option 1 — Formal Grievance:** File a grievance with the plan against the provider for failing their prior authorization obligation as an in-network participant. This creates a documented record and often prompts action.",
        "**Option 2 — Member Appeal with Documentation:** Submit your own appeal to the plan, noting that the provider was in-network and failed to obtain required authorization. Include the date you contacted the provider and any reference numbers from your call.",
        "**Option 3 — State Insurance Department:** If both the plan and provider are unresponsive, you can file a complaint with your state's Department of Insurance. This is a last resort but very effective.",
        "In most cases, a firm follow-up call referencing the grievance process is enough to get the provider to act. They don't want a network compliance issue on their record.",
      ],
    },
    suggestions: ["Help me draft a grievance", "What exactly should I say to the provider?", "What do I owe right now?"],
  },
};

const DEFAULT_FLOW_KEY = "default";

function findFlow(input) {
  const lower = input.toLowerCase().trim().replace(/[?!.]+$/, "").trim();
  for (const key of Object.keys(AGENT_FLOWS)) {
    if (key === "greeting") continue;
    const normalizedKey = key.replace(/[?!.]+$/, "").trim();
    if (lower === normalizedKey || lower.includes(normalizedKey) || normalizedKey.includes(lower)) return AGENT_FLOWS[key];
  }
  // fuzzy keyword matching
  if (lower.includes("denied") || lower.includes("why") || (lower.includes("mri") && !lower.includes("owe"))) return AGENT_FLOWS["why was my mri claim denied?"];
  if (lower.includes("fix") || lower.includes("resolve") || lower.includes("next step")) return AGENT_FLOWS["how do i get this fixed?"];
  if (lower.includes("script") || lower.includes("say") || lower.includes("call")) return AGENT_FLOWS["what exactly should i say to the provider?"];
  if (lower.includes("owe") || lower.includes("cost") || lower.includes("pay") || lower.includes("financial") || lower.includes("deductible")) return AGENT_FLOWS["what do i owe right now?"];
  if (lower.includes("appeal")) return AGENT_FLOWS["could i appeal this myself?"];
  if (lower.includes("refuse") || lower.includes("won't") || lower.includes("escalat")) return AGENT_FLOWS["what if the provider refuses?"];
  return null;
}

/* ═══════════════════════════════════════════════════════════════
   PALETTE & TOKENS
   ═══════════════════════════════════════════════════════════════ */

const P = {
  bg: "#05080F", bgPanel: "#0A0F1B", bgChat: "#080D18",
  bgBubbleUser: "#1A2B4A", bgBubbleAgent: "#0E1524",
  bgTool: "#0B1120", bgInput: "#0C1222",
  border: "#151E35", borderActive: "#1E3058", borderTool: "#131D32",
  textH: "#EDF2FA", text: "#C0CDE0", textSoft: "#7088AD", textMuted: "#3C5070",
  accent: "#3B82F6", accentGlow: "rgba(59,130,246,0.12)",
  teal: "#14B8A6", tealGlow: "rgba(20,184,166,0.08)",
  emerald: "#10B981", emeraldGlow: "rgba(16,185,129,0.08)",
  amber: "#F59E0B", amberGlow: "rgba(245,158,11,0.08)",
  rose: "#F43F5E", roseGlow: "rgba(244,63,94,0.08)",
};

const FONT = `'Satoshi', 'General Sans', -apple-system, BlinkMacSystemFont, sans-serif`;
const MONO = `'IBM Plex Mono', 'SF Mono', monospace`;
const FONT_URL = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap";

/* ═══════════════════════════════════════════════════════════════
   UTILITY HOOKS
   ═══════════════════════════════════════════════════════════════ */

function useStreamText(text, speed = 14, trigger = false) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!trigger) { setDisplayed(""); setDone(false); return; }
    let i = 0; setDisplayed(""); setDone(false);
    const iv = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(iv); setDone(true); }
    }, speed);
    return () => clearInterval(iv);
  }, [text, trigger, speed]);
  return [displayed, done];
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENTS — TOOL VISUALIZATION
   ═══════════════════════════════════════════════════════════════ */

const TOOL_ICONS = {
  read_eob: "", lookup_denial_code: "", query_sbc_rag: "",
  reconcile: "", determine_action_path: "", check_timeline: "",
  generate_script: "", fetch_accumulators: "", pending_claims: "",
  evaluate_appeal_path: "", escalation_paths: "",
};

function ToolStep({ tool, state, index }) {
  const isActive = state === "active";
  const isDone = state === "done";
  const isPending = state === "pending";

  return (
    <div style={{
      display: "flex", gap: 10, alignItems: "flex-start",
      padding: "8px 12px", borderRadius: 8,
      background: isActive ? "rgba(59,130,246,0.06)" : "transparent",
      transition: "all 0.3s ease",
      opacity: isPending ? 0.35 : 1,
    }}>
      <div style={{
        width: 26, height: 26, borderRadius: 6, flexShrink: 0, marginTop: 1,
        background: isDone ? P.emeraldGlow : isActive ? P.accentGlow : "rgba(255,255,255,0.03)",
        border: `1px solid ${isDone ? "rgba(16,185,129,0.2)" : isActive ? "rgba(59,130,246,0.2)" : P.borderTool}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, transition: "all 0.3s ease",
      }}>
        {isDone ? <span style={{ color: P.emerald, fontSize: 11 }}></span> :
         isActive ? <span style={{
           display: "inline-block", width: 8, height: 8, borderRadius: "50%",
           border: `2px solid ${P.accent}`, borderTopColor: "transparent",
           animation: "toolspin 0.7s linear infinite",
         }} /> :
         <span style={{ fontSize: 11 }}>{TOOL_ICONS[tool.name] || "⚙"}</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: MONO, fontSize: 11.5, fontWeight: 500,
          color: isDone ? P.emerald : isActive ? P.accent : P.textMuted,
          transition: "color 0.3s ease",
        }}>{tool.label}</div>
        {(isActive || isDone) && (
          <div style={{
            fontFamily: MONO, fontSize: 10.5, color: P.textMuted,
            marginTop: 2, lineHeight: 1.5,
            opacity: isDone ? 0.7 : 1,
          }}>{tool.detail}</div>
        )}
      </div>
    </div>
  );
}

function ToolChain({ tools, onComplete }) {
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [doneSet, setDoneSet] = useState(new Set());
  const completeCalled = useRef(false);

  useEffect(() => {
    if (tools.length === 0) { if (!completeCalled.current) { completeCalled.current = true; onComplete(); } return; }
    let t1 = setTimeout(() => setCurrentIdx(0), 400);
    return () => clearTimeout(t1);
  }, []);

  useEffect(() => {
    if (currentIdx < 0 || currentIdx >= tools.length) return;
    const dur = tools[currentIdx].duration || 1000;
    const t = setTimeout(() => {
      setDoneSet(prev => { const n = new Set(prev); n.add(currentIdx); return n; });
      if (currentIdx + 1 < tools.length) {
        setTimeout(() => setCurrentIdx(currentIdx + 1), 200);
      } else {
        setTimeout(() => { if (!completeCalled.current) { completeCalled.current = true; onComplete(); } }, 300);
      }
    }, dur);
    return () => clearTimeout(t);
  }, [currentIdx]);

  return (
    <div style={{
      background: P.bgTool, border: `1px solid ${P.borderTool}`,
      borderRadius: 10, padding: "10px 6px", marginBottom: 8,
    }}>
      <div style={{
        fontFamily: MONO, fontSize: 9.5, textTransform: "uppercase",
        letterSpacing: 1.8, color: P.textMuted, padding: "2px 12px 8px",
        fontWeight: 600,
      }}>
        Agent Reasoning
      </div>
      {tools.map((tool, i) => (
        <ToolStep
          key={i} tool={tool} index={i}
          state={doneSet.has(i) ? "done" : i === currentIdx ? "active" : "pending"}
        />
      ))}
      <style>{`@keyframes toolspin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENTS — INLINE RESPONSE CARDS
   ═══════════════════════════════════════════════════════════════ */

function DenialCard({ card }) {
  return (
    <div style={{
      background: "rgba(59,130,246,0.04)", border: `1px solid ${P.borderActive}`,
      borderRadius: 10, padding: "14px 16px", marginTop: 10, marginBottom: 4,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontFamily: MONO, fontSize: 12, fontWeight: 600,
            background: P.accentGlow, color: P.accent,
            padding: "2px 8px", borderRadius: 4,
          }}>{card.code}</span>
          <span style={{ fontSize: 13, color: P.text, fontWeight: 500 }}>{card.reason}</span>
        </div>
        <span style={{
          fontSize: 10, fontFamily: MONO, fontWeight: 600, textTransform: "uppercase",
          letterSpacing: 1, padding: "3px 10px", borderRadius: 20,
          ...(card.consistent
            ? { background: "#052E16", color: "#6EE7B7", border: "1px solid #14532D" }
            : { background: "#3B0712", color: "#FDA4AF", border: "1px solid #881337" }),
        }}>
          {card.consistent ? " Consistent" : " Inconsistent"}
        </span>
      </div>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        {[
          ["Service", card.service], ["Amount", card.amount],
          ["Action Owner", card.owner], ["SBC Ref", card.sbcRef],
        ].map(([k, v]) => (
          <div key={k}>
            <div style={{ fontFamily: MONO, fontSize: 9.5, color: P.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>{k}</div>
            <div style={{ fontSize: 13, color: P.textH, fontWeight: 500, marginTop: 2 }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FinancialCard({ card }) {
  const Bar = ({ used, max, color, label }) => {
    const pct = Math.min((used / max) * 100, 100);
    return (
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontFamily: MONO, fontSize: 10, color: P.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
          <span style={{ fontFamily: MONO, fontSize: 11, color: P.text }}>${used.toLocaleString()} / ${max.toLocaleString()}</span>
        </div>
        <div style={{ height: 6, background: "rgba(255,255,255,0.04)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 1s ease" }} />
        </div>
      </div>
    );
  };
  return (
    <div style={{
      background: "rgba(20,184,166,0.04)", border: `1px solid rgba(20,184,166,0.15)`,
      borderRadius: 10, padding: "14px 16px", marginTop: 10, marginBottom: 4,
    }}>
      <div style={{ display: "flex", gap: 20, marginBottom: 12 }}>
        <Bar used={card.deductible.used} max={card.deductible.max} color={P.accent} label="Deductible" />
        <Bar used={card.oop.used} max={card.oop.max} color={P.teal} label="Out-of-Pocket Max" />
      </div>
      <div style={{
        background: P.emeraldGlow, border: "1px solid rgba(16,185,129,0.15)",
        borderRadius: 6, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{ fontSize: 14 }}></span>
        <span style={{ fontFamily: FONT, fontSize: 12.5, color: P.emerald, fontWeight: 500 }}>
          Potential savings if resolved: {card.potentialSavings}
        </span>
      </div>
    </div>
  );
}

function TimelineCard({ card }) {
  return (
    <div style={{
      background: P.amberGlow, border: `1px solid rgba(245,158,11,0.15)`,
      borderRadius: 10, padding: "12px 16px", marginTop: 10, marginBottom: 4,
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <div>
        <div style={{ fontFamily: MONO, fontSize: 9.5, color: P.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>{card.deadlineLabel}</div>
        <div style={{ fontSize: 14, color: P.textH, fontWeight: 600, marginTop: 2 }}>{card.deadline}</div>
      </div>
      <div style={{
        fontFamily: MONO, fontSize: 20, fontWeight: 700, color: P.amber,
      }}>
        {card.daysRemaining}d
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENTS — MESSAGES
   ═══════════════════════════════════════════════════════════════ */

function formatMarkdown(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} style={{ color: P.textH, fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function AgentMessage({ message, isLast }) {
  const { response, tools, showTools, toolsDone } = message;
  const [showResponse, setShowResponse] = useState(!tools || tools.length === 0 || toolsDone);

  const handleToolsComplete = useCallback(() => {
    message.toolsDone = true;
    setTimeout(() => setShowResponse(true), 200);
  }, [message]);

  useEffect(() => {
    if (toolsDone) setShowResponse(true);
  }, [toolsDone]);

  const renderCard = (card) => {
    if (!card) return null;
    if (card.type === "denial_card") return <DenialCard card={card} />;
    if (card.type === "financial_card") return <FinancialCard card={card} />;
    if (card.type === "timeline_card") return <TimelineCard card={card} />;
    return null;
  };

  return (
    <div style={{ maxWidth: 640, marginBottom: 8 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0, marginTop: 2,
          background: "linear-gradient(135deg, #1A3058 0%, #0E1A30 100%)",
          border: `1px solid ${P.borderActive}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13,
        }}>⚕</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: P.textMuted, marginBottom: 4, fontWeight: 500 }}>Benefits Advocate</div>

          {showTools && tools && tools.length > 0 && (
            <ToolChain tools={tools} onComplete={handleToolsComplete} />
          )}

          {showResponse && response && (
            <div style={{
              background: P.bgBubbleAgent, border: `1px solid ${P.border}`,
              borderRadius: "2px 12px 12px 12px", padding: "14px 18px",
              animation: "fadeUp 0.35s ease",
            }}>
              {response.headline && (
                <div style={{ fontSize: 14.5, fontWeight: 600, color: P.textH, marginBottom: 8, lineHeight: 1.45 }}>
                  {response.headline}
                </div>
              )}

              {response.text && (
                <div style={{ fontSize: 13.5, color: P.text, lineHeight: 1.7 }}>
                  {response.text.split("\n").map((line, i) => (
                    <span key={i}>{line.trim() ? formatMarkdown(line) : <br />}{line.trim() ? " " : ""}</span>
                  ))}
                </div>
              )}

              {response.details && response.details.map((d, i) => (
                <p key={i} style={{ fontSize: 13.5, color: P.text, lineHeight: 1.7, margin: "0 0 8px" }}>
                  {formatMarkdown(d)}
                </p>
              ))}

              {response.steps && (
                <div style={{ marginTop: 6 }}>
                  {response.steps.map((s) => (
                    <div key={s.num} style={{
                      display: "flex", gap: 12, marginBottom: 12, alignItems: "flex-start",
                    }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                        background: P.accentGlow, border: `1px solid ${P.borderActive}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: MONO, fontSize: 11, fontWeight: 600, color: P.accent, marginTop: 1,
                      }}>{s.num}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 13.5, fontWeight: 600, color: P.textH }}>{s.title}</span>
                          {s.time && <span style={{
                            fontFamily: MONO, fontSize: 9.5, color: P.textMuted,
                            background: "rgba(255,255,255,0.03)", padding: "1px 6px", borderRadius: 4,
                          }}>{s.time}</span>}
                        </div>
                        <p style={{ fontSize: 13, color: P.text, lineHeight: 1.65, margin: "3px 0 0" }}>
                          {formatMarkdown(s.detail)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {response.intro && (
                <p style={{ fontSize: 13.5, color: P.text, lineHeight: 1.7, margin: "0 0 8px" }}>
                  {formatMarkdown(response.intro)}
                </p>
              )}

              {response.script && (
                <div style={{
                  background: "#060A13", border: `1px solid ${P.border}`,
                  borderLeft: `3px solid ${P.emerald}`, borderRadius: 6,
                  padding: "14px 16px", margin: "8px 0", position: "relative",
                }}>
                  <div style={{
                    fontSize: 13, color: "#C0CDE0", lineHeight: 1.7,
                    fontStyle: "italic", whiteSpace: "pre-wrap",
                  }}>
                    {response.script}
                  </div>
                </div>
              )}

              {response.tips && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: P.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Tips</div>
                  {response.tips.map((tip, i) => (
                    <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4, fontSize: 12.5, color: P.textSoft }}>
                      <span style={{ color: P.teal }}>›</span> {formatMarkdown(tip)}
                    </div>
                  ))}
                </div>
              )}

              {response.card && renderCard(response.card)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UserMessage({ text }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
      <div style={{
        maxWidth: 480, background: P.bgBubbleUser,
        border: `1px solid ${P.borderActive}`,
        borderRadius: "12px 2px 12px 12px",
        padding: "12px 16px",
      }}>
        <div style={{ fontSize: 14, color: P.textH, lineHeight: 1.6 }}>{text}</div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
      <div style={{
        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
        background: "linear-gradient(135deg, #1A3058 0%, #0E1A30 100%)",
        border: `1px solid ${P.borderActive}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13,
      }}>⚕</div>
      <div style={{
        background: P.bgBubbleAgent, border: `1px solid ${P.border}`,
        borderRadius: "2px 12px 12px 12px", padding: "14px 18px",
        display: "flex", gap: 5, alignItems: "center",
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: "50%",
            background: P.textMuted,
            animation: `typingDot 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENTS — MEMBER PANEL
   ═══════════════════════════════════════════════════════════════ */

function MemberPanel() {
  const Stat = ({ label, value, sub }) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontFamily: MONO, fontSize: 9, color: P.textMuted, textTransform: "uppercase", letterSpacing: 1.4, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, color: P.textH, fontWeight: 600 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: P.textMuted, marginTop: 1 }}>{sub}</div>}
    </div>
  );

  const pctDed = Math.round((MEMBER.deductible.used / MEMBER.deductible.max) * 100);
  const pctOop = Math.round((MEMBER.oop.used / MEMBER.oop.max) * 100);

  return (
    <div style={{
      width: 260, minWidth: 260, background: P.bgPanel,
      borderLeft: `1px solid ${P.border}`, padding: "20px 18px",
      overflowY: "auto", display: "flex", flexDirection: "column",
    }}>
      <div style={{
        fontFamily: MONO, fontSize: 9.5, textTransform: "uppercase",
        letterSpacing: 1.8, color: P.textMuted, marginBottom: 16, fontWeight: 600,
      }}>Member Context</div>

      <div style={{
        display: "flex", alignItems: "center", gap: 10, marginBottom: 18,
        padding: "12px", background: "rgba(59,130,246,0.04)",
        border: `1px solid ${P.borderTool}`, borderRadius: 10,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "linear-gradient(135deg, #2563EB 0%, #14B8A6 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 15, fontWeight: 700, color: "#fff",
        }}>SM</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: P.textH }}>{MEMBER.name}</div>
          <div style={{ fontFamily: MONO, fontSize: 10.5, color: P.textMuted }}>{MEMBER.id}</div>
        </div>
      </div>

      <Stat label="Plan" value={MEMBER.plan} />
      <Stat label="Group" value={MEMBER.group} />

      <div style={{ height: 1, background: P.border, margin: "4px 0 16px" }} />

      <div style={{ fontFamily: MONO, fontSize: 9.5, textTransform: "uppercase", letterSpacing: 1.4, color: P.textMuted, marginBottom: 10, fontWeight: 600 }}>Accumulators</div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: P.textSoft }}>Deductible</span>
          <span style={{ fontFamily: MONO, fontSize: 11, color: P.text }}>${MEMBER.deductible.used} / ${MEMBER.deductible.max}</span>
        </div>
        <div style={{ height: 5, background: "rgba(255,255,255,0.04)", borderRadius: 3 }}>
          <div style={{ height: "100%", width: `${pctDed}%`, background: P.accent, borderRadius: 3 }} />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: P.textSoft }}>OOP Max</span>
          <span style={{ fontFamily: MONO, fontSize: 11, color: P.text }}>${MEMBER.oop.used} / ${MEMBER.oop.max}</span>
        </div>
        <div style={{ height: 5, background: "rgba(255,255,255,0.04)", borderRadius: 3 }}>
          <div style={{ height: "100%", width: `${pctOop}%`, background: P.teal, borderRadius: 3 }} />
        </div>
      </div>

      <div style={{ height: 1, background: P.border, margin: "4px 0 16px" }} />

      <div style={{ fontFamily: MONO, fontSize: 9.5, textTransform: "uppercase", letterSpacing: 1.4, color: P.textMuted, marginBottom: 10, fontWeight: 600 }}>Active Claim</div>

      {[
        ["Status", CLAIM.status, P.rose], ["Code", CLAIM.code, P.accent],
        ["Service", CLAIM.service], ["Facility", CLAIM.facility],
        ["Provider", CLAIM.provider], ["Date", CLAIM.dos],
        ["Billed", CLAIM.billed], ["Member Owes", CLAIM.memberOwes, P.amber],
      ].map(([k, v, color]) => (
        <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: P.textMuted }}>{k}</span>
          <span style={{ fontFamily: MONO, fontSize: 11, color: color || P.text, fontWeight: color ? 600 : 400 }}>{v}</span>
        </div>
      ))}

      <div style={{ flex: 1 }} />

      <div style={{
        marginTop: 16, padding: "10px 12px", borderRadius: 8,
        background: P.amberGlow, border: "1px solid rgba(245,158,11,0.12)",
      }}>
        <div style={{ fontFamily: MONO, fontSize: 9, textTransform: "uppercase", letterSpacing: 1.2, color: P.amber, fontWeight: 600, marginBottom: 3 }}>Role Boundary</div>
        <div style={{ fontSize: 10.5, color: P.textSoft, lineHeight: 1.5 }}>
          Interpretation layer only. Final determinations held by System of Record.
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════════════════ */

function AgenticChatUI() {
  const greeting = AGENT_FLOWS.greeting;
  const [messages, setMessages] = useState([
    { role: "agent", response: greeting.response, tools: greeting.tools, showTools: false, toolsDone: true },
  ]);
  const [suggestions, setSuggestions] = useState(greeting.suggestions);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isProcessing]);

  const handleSend = (text) => {
    if (!text.trim() || isProcessing) return;
    const userText = text.trim();
    setInput("");
    setSuggestions([]);
    setIsProcessing(true);

    setMessages(prev => [...prev, { role: "user", text: userText }]);

    const flow = findFlow(userText);

    setTimeout(() => {
      if (!flow) {
        setMessages(prev => [...prev, {
          role: "agent",
          response: {
            type: "fallback",
            text: `I can help you understand your denied MRI claim, walk you through next steps, or explain your current benefits. Try asking me something like "Why was my claim denied?" or "What do I owe?"`,
          },
          tools: [], showTools: false, toolsDone: true,
        }]);
        setSuggestions(["Why was my MRI claim denied?", "What do I owe right now?", "How do I get this fixed?"]);
        setIsProcessing(false);
      } else {
        setMessages(prev => [...prev, {
          role: "agent",
          response: flow.response,
          tools: flow.tools,
          showTools: true,
          toolsDone: false,
        }]);
        const totalToolTime = flow.tools.reduce((sum, t) => sum + (t.duration || 1000), 0) + 800;
        setTimeout(() => {
          setIsProcessing(false);
          setSuggestions(flow.suggestions || []);
        }, totalToolTime);
      }
    }, 600);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  return (
    <>
      <link href={FONT_URL} rel="stylesheet" />
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes typingDot { 0%,60%,100% { opacity:0.3; transform:translateY(0); } 30% { opacity:1; transform:translateY(-3px); } }
        @keyframes pulseGlow { 0%,100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); } 50% { box-shadow: 0 0 0 4px rgba(59,130,246,0.15); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${P.border}; border-radius: 3px; }
      `}</style>

      <div style={{ display: "flex", height: "100vh", width: "100%", background: P.bg, fontFamily: FONT }}>
        {/* Main Chat Area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* Header */}
          <div style={{
            padding: "14px 24px", borderBottom: `1px solid ${P.border}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: P.bgPanel, flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 8,
                background: "linear-gradient(135deg, #2563EB 0%, #14B8A6 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16,
              }}>⚕</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: P.textH, letterSpacing: -0.3 }}>
                  Member 360 <span style={{ fontWeight: 400, color: P.textMuted }}>·</span> <span style={{ fontWeight: 400, color: P.textSoft, fontSize: 13 }}>Benefits Advocate</span>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: P.textMuted, marginTop: 1, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: P.emerald, display: "inline-block" }} />
                  Agentic Experience Layer — Claim Interpretation
                </div>
              </div>
            </div>
            <div style={{
              fontFamily: MONO, fontSize: 9.5, color: P.textMuted,
              background: "rgba(255,255,255,0.02)", border: `1px solid ${P.border}`,
              borderRadius: 6, padding: "4px 10px", letterSpacing: 0.5,
            }}>
              v0.1 PROTOTYPE
            </div>
          </div>

          {/* Messages Area */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
            <div style={{ maxWidth: 720, margin: "0 auto" }}>
              {/* System disclaimer */}
              <div style={{
                textAlign: "center", marginBottom: 24, padding: "10px 16px",
                background: "rgba(245,158,11,0.04)", border: `1px solid rgba(245,158,11,0.1)`,
                borderRadius: 8,
              }}>
                <span style={{ fontFamily: MONO, fontSize: 10, color: "#8A7A4E", letterSpacing: 0.5 }}>
                  This is an interpretation layer. Final financial determinations are held by the Adjudication System of Record.
                </span>
              </div>

              {messages.map((msg, i) => (
                <div key={i} style={{ animation: "fadeUp 0.3s ease" }}>
                  {msg.role === "user"
                    ? <UserMessage text={msg.text} />
                    : <AgentMessage message={msg} isLast={i === messages.length - 1} />
                  }
                </div>
              ))}

              {isProcessing && messages[messages.length - 1]?.role === "user" && <TypingIndicator />}

              {/* Suggestions */}
              {suggestions.length > 0 && !isProcessing && (
                <div style={{
                  display: "flex", flexWrap: "wrap", gap: 8,
                  marginTop: 12, marginLeft: 40, animation: "fadeUp 0.4s ease",
                }}>
                  {suggestions.map((s, i) => (
                    <button key={i} onClick={() => handleSend(s)} style={{
                      background: "rgba(59,130,246,0.06)", border: `1px solid ${P.borderActive}`,
                      borderRadius: 20, padding: "7px 14px",
                      fontFamily: FONT, fontSize: 12.5, color: P.accent,
                      cursor: "pointer", transition: "all 0.2s ease",
                      outline: "none",
                    }}
                    onMouseEnter={e => { e.target.style.background = "rgba(59,130,246,0.12)"; e.target.style.borderColor = P.accent; }}
                    onMouseLeave={e => { e.target.style.background = "rgba(59,130,246,0.06)"; e.target.style.borderColor = P.borderActive; }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              <div style={{ height: 24 }} />
            </div>
          </div>

          {/* Input Bar */}
          <div style={{
            padding: "16px 28px 20px", borderTop: `1px solid ${P.border}`,
            background: P.bgPanel, flexShrink: 0,
          }}>
            <div style={{ maxWidth: 720, margin: "0 auto" }}>
              <div style={{
                display: "flex", gap: 10, alignItems: "center",
                background: P.bgInput, border: `1px solid ${P.border}`,
                borderRadius: 12, padding: "4px 6px 4px 16px",
                transition: "border-color 0.2s ease",
              }}
              onFocus={() => {}}
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your claim, benefits, or next steps..."
                  disabled={isProcessing}
                  style={{
                    flex: 1, background: "transparent", border: "none", outline: "none",
                    fontFamily: FONT, fontSize: 14, color: P.textH,
                    padding: "10px 0",
                  }}
                />
                <button
                  onClick={() => handleSend(input)}
                  disabled={!input.trim() || isProcessing}
                  style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: input.trim() && !isProcessing ? P.accent : "rgba(255,255,255,0.03)",
                    border: "none", cursor: input.trim() && !isProcessing ? "pointer" : "default",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.2s ease", flexShrink: 0,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={input.trim() && !isProcessing ? "#fff" : P.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
              <div style={{ textAlign: "center", marginTop: 8 }}>
                <span style={{ fontFamily: MONO, fontSize: 9.5, color: P.textMuted, letterSpacing: 0.4 }}>
                  Powered by ReconciliationAgent · LangChain + FAISS RAG · Deterministic Mapping + Agentic Reasoning
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <MemberPanel />
      </div>
    </>
  );
}
