/* ═══════════════════════════════════════════════════════════════
   MEMBER 360 — V2 UI PRIMITIVES
   Design tokens, markdown formatter, ToolChain, inline cards,
   ClaimPicker. Loaded before member360_chat_v2.jsx.
   ═══════════════════════════════════════════════════════════════ */
// React hooks — accessible within this file's compiled scope
const { useState: _useState, useEffect: _useEffect, useRef: _useRef } = React;

/* ── Design tokens ── */
const P2 = {
  bg: "#05080F", bgPanel: "#0A0F1B", bgChat: "#080D18",
  bgBubbleUser: "#1A2B4A", bgBubbleAgent: "#0E1524",
  bgTool: "#0B1120", bgInput: "#0C1222",
  border: "#151E35", borderActive: "#1E3058", borderTool: "#131D32",
  textH: "#EDF2FA", text: "#C0CDE0", textSoft: "#7088AD", textMuted: "#3C5070",
  accent: "#3B82F6", accentGlow: "rgba(59,130,246,0.12)",
  teal: "#14B8A6",   tealGlow: "rgba(20,184,166,0.08)",
  emerald: "#10B981", emeraldGlow: "rgba(16,185,129,0.08)",
  amber: "#F59E0B",  amberGlow: "rgba(245,158,11,0.08)",
  rose: "#F43F5E",   roseGlow: "rgba(244,63,94,0.08)",
};
const FONT2 = `'Satoshi','General Sans',-apple-system,BlinkMacSystemFont,sans-serif`;
const MONO2 = `'IBM Plex Mono','SF Mono',monospace`;
const FONT_URL2 = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap";

const TOOL_ICONS2 = {
  read_eob:"", lookup_denial_code:"", query_sbc_rag:"",
  reconcile:"", determine_action_path:"", check_timeline:"",
  generate_script:"", fetch_accumulators:"", check_claim_status:"",
  evaluate_appeal_path:"", escalation_paths:"", check_network:"",
};

/* ── Markdown bold formatter ── */
function fmt(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i} style={{ color: P2.textH, fontWeight: 600 }}>{p.slice(2,-2)}</strong>
      : p
  );
}

/* ═══════════════════════════════════════════════════════════════
   TOOL CHAIN
   ═══════════════════════════════════════════════════════════════ */
function ToolStep2({ tool, state }) {
  const active = state === "active", done = state === "done", pending = state === "pending";
  return (
    <div style={{ display:"flex", gap:10, alignItems:"flex-start", padding:"8px 12px", borderRadius:8,
      background: active ? "rgba(59,130,246,0.06)" : "transparent", opacity: pending ? 0.35 : 1, transition:"all 0.3s" }}>
      <div style={{ width:26, height:26, borderRadius:6, flexShrink:0, marginTop:1,
        background: done ? P2.emeraldGlow : active ? P2.accentGlow : "rgba(255,255,255,0.03)",
        border:`1px solid ${done ? "rgba(16,185,129,0.2)" : active ? "rgba(59,130,246,0.2)" : P2.borderTool}`,
        display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, transition:"all 0.3s" }}>
        {done ? <span style={{ color:P2.emerald, fontSize:11 }}>✓</span>
          : active ? <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%",
              border:`2px solid ${P2.accent}`, borderTopColor:"transparent",
              animation:"toolspin2 0.7s linear infinite" }} />
          : <span style={{ fontSize:11 }}>{TOOL_ICONS2[tool.name] || "⚙"}</span>}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily:MONO2, fontSize:11.5, fontWeight:500,
          color: done ? P2.emerald : active ? P2.accent : P2.textMuted, transition:"color 0.3s" }}>
          {tool.label}
        </div>
        {(active || done) && <div style={{ fontFamily:MONO2, fontSize:10.5, color:P2.textMuted,
          marginTop:2, lineHeight:1.5, opacity: done ? 0.7 : 1 }}>{tool.detail}</div>}
      </div>
    </div>
  );
}

function ToolChain2({ tools, onComplete }) {
  const [idx, setIdx] = _useState(-1);
  const [done, setDone] = _useState(new Set());
  const called = _useRef(false);
  _useEffect(() => {
    if (!tools.length) { if (!called.current) { called.current = true; onComplete(); } return; }
    const t = setTimeout(() => setIdx(0), 400);
    return () => clearTimeout(t);
  }, []);
  _useEffect(() => {
    if (idx < 0 || idx >= tools.length) return;
    const t = setTimeout(() => {
      setDone(prev => { const n = new Set(prev); n.add(idx); return n; });
      if (idx + 1 < tools.length) setTimeout(() => setIdx(idx + 1), 200);
      else setTimeout(() => { if (!called.current) { called.current = true; onComplete(); } }, 300);
    }, tools[idx].duration || 1000);
    return () => clearTimeout(t);
  }, [idx]);
  return (
    <div style={{ background:P2.bgTool, border:`1px solid ${P2.borderTool}`, borderRadius:10, padding:"10px 6px", marginBottom:8 }}>
      <div style={{ fontFamily:MONO2, fontSize:9.5, textTransform:"uppercase", letterSpacing:1.8,
        color:P2.textMuted, padding:"2px 12px 8px", fontWeight:600 }}>Agent Reasoning</div>
      {tools.map((tool, i) => (
        <ToolStep2 key={i} tool={tool} state={done.has(i) ? "done" : i === idx ? "active" : "pending"} />
      ))}
      <style>{`@keyframes toolspin2 { to { transform:rotate(360deg); } }`}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   INLINE CARDS
   ═══════════════════════════════════════════════════════════════ */
function DenialCard2({ card }) {
  return (
    <div style={{ background:"rgba(59,130,246,0.04)", border:`1px solid ${P2.borderActive}`,
      borderRadius:10, padding:"14px 16px", marginTop:10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontFamily:MONO2, fontSize:12, fontWeight:600, background:P2.accentGlow,
            color:P2.accent, padding:"2px 8px", borderRadius:4 }}>{card.code}</span>
          <span style={{ fontSize:13, color:P2.text, fontWeight:500 }}>{card.reason}</span>
        </div>
        <span style={{ fontSize:10, fontFamily:MONO2, fontWeight:600, textTransform:"uppercase",
          letterSpacing:1, padding:"3px 10px", borderRadius:20,
          ...(card.consistent
            ? { background:"#052E16", color:"#6EE7B7", border:"1px solid #14532D" }
            : { background:"#3B0712", color:"#FDA4AF", border:"1px solid #881337" }) }}>
          {card.consistent ? "✓ Consistent" : "⚠ Wrongful — Appeal"}
        </span>
      </div>
      <div style={{ display:"flex", gap:20, flexWrap:"wrap" }}>
        {[["Service",card.service],["Amount",card.amount],["Action Owner",card.owner],["SBC Ref",card.sbcRef]].map(([k,v]) => (
          <div key={k}>
            <div style={{ fontFamily:MONO2, fontSize:9.5, color:P2.textMuted, textTransform:"uppercase", letterSpacing:1 }}>{k}</div>
            <div style={{ fontSize:13, color:P2.textH, fontWeight:500, marginTop:2 }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FinancialCard2({ card }) {
  const Bar = ({ used, max, color, label }) => (
    <div style={{ flex:1 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
        <span style={{ fontFamily:MONO2, fontSize:10, color:P2.textMuted, textTransform:"uppercase", letterSpacing:1 }}>{label}</span>
        <span style={{ fontFamily:MONO2, fontSize:11, color:P2.text }}>${used.toLocaleString()} / ${max.toLocaleString()}</span>
      </div>
      <div style={{ height:6, background:"rgba(255,255,255,0.04)", borderRadius:3, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${Math.min((used/max)*100,100)}%`, background:color, borderRadius:3, transition:"width 1s ease" }} />
      </div>
    </div>
  );
  return (
    <div style={{ background:"rgba(20,184,166,0.04)", border:"1px solid rgba(20,184,166,0.15)",
      borderRadius:10, padding:"14px 16px", marginTop:10 }}>
      <div style={{ display:"flex", gap:20, marginBottom: card.potentialSavings ? 12 : 0 }}>
        <Bar used={card.deductible.used} max={card.deductible.max} color={P2.accent} label="Deductible" />
        <Bar used={card.oop.used} max={card.oop.max} color={P2.teal} label="OOP Max" />
      </div>
      {card.potentialSavings && (
        <div style={{ background:P2.emeraldGlow, border:"1px solid rgba(16,185,129,0.15)",
          borderRadius:6, padding:"8px 12px", display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:14 }}>💰</span>
          <span style={{ fontFamily:FONT2, fontSize:12.5, color:P2.emerald, fontWeight:500 }}>
            Potential savings if resolved: {card.potentialSavings}
          </span>
        </div>
      )}
    </div>
  );
}

function TimelineCard2({ card }) {
  return (
    <div style={{ background:P2.amberGlow, border:"1px solid rgba(245,158,11,0.15)",
      borderRadius:10, padding:"12px 16px", marginTop:10,
      display:"flex", alignItems:"center", justifyContent:"space-between" }}>
      <div>
        <div style={{ fontFamily:MONO2, fontSize:9.5, color:P2.textMuted, textTransform:"uppercase", letterSpacing:1 }}>{card.deadlineLabel}</div>
        <div style={{ fontSize:14, color:P2.textH, fontWeight:600, marginTop:2 }}>{card.deadline}</div>
      </div>
      <div style={{ fontFamily:MONO2, fontSize:20, fontWeight:700, color:P2.amber }}>{card.daysRemaining}d</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CLAIM PICKER
   ═══════════════════════════════════════════════════════════════ */
function ClaimPicker({ onSelect }) {
  const [hovered, setHovered] = _useState(null);
  return (
    <div style={{ marginTop:12 }}>
      <div style={{ fontFamily:MONO2, fontSize:9.5, textTransform:"uppercase", letterSpacing:1.6,
        color:P2.textMuted, marginBottom:10, fontWeight:600 }}>Sarah’s Claims — Select one to get started</div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {CLAIMS_V2.map(claim => {
          const sc = STATUS_COLORS_V2[claim.status];
          const isHov = hovered === claim.id;
          return (
            <button key={claim.id} onClick={() => onSelect(claim)}
              onMouseEnter={() => setHovered(claim.id)}
              onMouseLeave={() => setHovered(null)}
              style={{ display:"flex", alignItems:"center", gap:12, width:"100%",
                background: isHov ? "rgba(59,130,246,0.08)" : "rgba(255,255,255,0.02)",
                border:`1px solid ${isHov ? P2.accent : sc.border}`,
                borderRadius:10, padding:"11px 14px", cursor:"pointer",
                transition:"all 0.2s", textAlign:"left", outline:"none" }}>
              <span style={{ fontSize:18, flexShrink:0 }}>{claim.icon}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                  <span style={{ fontSize:13.5, fontWeight:600, color:P2.textH }}>{claim.service}</span>
                  <span style={{ fontFamily:MONO2, fontSize:9, fontWeight:700, textTransform:"uppercase",
                    letterSpacing:1, padding:"2px 7px", borderRadius:12,
                    background:sc.bg, color:sc.text, border:`1px solid ${sc.border}` }}>
                    {claim.status}
                  </span>
                  {claim.urgency === "high" && (
                    <span style={{ fontFamily:MONO2, fontSize:9, color:"#F43F5E",
                      background:"rgba(244,63,94,0.08)", border:"1px solid rgba(244,63,94,0.2)",
                      padding:"2px 6px", borderRadius:10, letterSpacing:0.5 }}>URGENT</span>
                  )}
                </div>
                <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
                  <span style={{ fontFamily:MONO2, fontSize:10.5, color:P2.textMuted }}>{claim.provider}</span>
                  <span style={{ fontFamily:MONO2, fontSize:10.5, color:P2.textMuted }}>DOS {claim.dos}</span>
                  <span style={{ fontFamily:MONO2, fontSize:10.5,
                    color: claim.memberOwes === "$0.00" ? P2.emerald
                      : claim.memberOwes === "TBD" || claim.memberOwes === "Pending" ? P2.textSoft
                      : P2.amber, fontWeight:600 }}>
                    Owes {claim.memberOwes}
                  </span>
                  {claim.code && <span style={{ fontFamily:MONO2, fontSize:10.5, color:P2.accent }}>{claim.code}</span>}
                </div>
              </div>
              <span style={{ color: isHov ? P2.accent : P2.textMuted, fontSize:16, transition:"color 0.2s" }}>›</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}