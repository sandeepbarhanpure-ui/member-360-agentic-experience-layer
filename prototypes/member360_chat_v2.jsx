/* ═══════════════════════════════════════════════════════════════
   MEMBER 360 — V2 COMPONENTS
   Depends on: member360_chat_v2_data.jsx loaded first
   ═══════════════════════════════════════════════════════════════ */
const { useState, useEffect, useRef, useCallback } = React;

/* ── Design tokens (same dark palette as V1) ── */
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
  read_eob:"📄", lookup_denial_code:"🔍", query_sbc_rag:"🧠",
  reconcile:"⚖️", determine_action_path:"🛤️", check_timeline:"⏱️",
  generate_script:"✏️", fetch_accumulators:"💰", check_claim_status:"🔄",
  evaluate_appeal_path:"🔀", escalation_paths:"🚨", check_network:"🌐",
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
  const [idx, setIdx] = useState(-1);
  const [done, setDone] = useState(new Set());
  const called = useRef(false);
  useEffect(() => {
    if (!tools.length) { if (!called.current) { called.current = true; onComplete(); } return; }
    const t = setTimeout(() => setIdx(0), 400);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
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
          {card.consistent ? "✓ Consistent" : "✗ Wrongful — Appeal"}
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
          <span style={{ fontSize:14 }}>💡</span>
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
   CLAIM PICKER — renders inside the first agent bubble
   ═══════════════════════════════════════════════════════════════ */
function ClaimPicker({ onSelect }) {
  const [hovered, setHovered] = useState(null);
  return (
    <div style={{ marginTop:12 }}>
      <div style={{ fontFamily:MONO2, fontSize:9.5, textTransform:"uppercase", letterSpacing:1.6,
        color:P2.textMuted, marginBottom:10, fontWeight:600 }}>Sarah's Claims — Select one to get started</div>
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

/* ═══════════════════════════════════════════════════════════════
   MESSAGES
   ═══════════════════════════════════════════════════════════════ */
function AgentMessage2({ message, isLast, onClaimSelect }) {
  const { response, tools, showTools, toolsDone } = message;
  const [showResp, setShowResp] = useState(!tools || !tools.length || toolsDone);

  const onDone = useCallback(() => {
    message.toolsDone = true;
    setTimeout(() => setShowResp(true), 200);
  }, [message]);

  useEffect(() => { if (toolsDone) setShowResp(true); }, [toolsDone]);

  const renderCard = (card) => {
    if (!card) return null;
    if (card.type === "denial_card")   return <DenialCard2 card={card} />;
    if (card.type === "financial_card") return <FinancialCard2 card={card} />;
    if (card.type === "timeline_card") return <TimelineCard2 card={card} />;
    return null;
  };

  return (
    <div style={{ maxWidth:680, marginBottom:8 }}>
      <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
        <div style={{ width:30, height:30, borderRadius:8, flexShrink:0, marginTop:2,
          background:"linear-gradient(135deg,#1A3058 0%,#0E1A30 100%)",
          border:`1px solid ${P2.borderActive}`,
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>⚕</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:MONO2, fontSize:10, color:P2.textMuted, marginBottom:4, fontWeight:500 }}>Benefits Advocate</div>
          {showTools && tools && tools.length > 0 && <ToolChain2 tools={tools} onComplete={onDone} />}
          {showResp && response && (
            <div style={{ background:P2.bgBubbleAgent, border:`1px solid ${P2.border}`,
              borderRadius:"2px 12px 12px 12px", padding:"14px 18px", animation:"fadeUp2 0.35s ease" }}>
              {response.headline && (
                <div style={{ fontSize:14.5, fontWeight:600, color:P2.textH, marginBottom:8, lineHeight:1.45 }}>
                  {response.headline}
                </div>
              )}
              {response.text && (
                <div style={{ fontSize:13.5, color:P2.text, lineHeight:1.7 }}>
                  {response.text.split("\n").map((ln, i) => (
                    <span key={i}>{ln.trim() ? fmt(ln) : <br />}</span>
                  ))}
                </div>
              )}
              {response.details && response.details.map((d, i) => (
                <p key={i} style={{ fontSize:13.5, color:P2.text, lineHeight:1.7, margin:"0 0 8px" }}>{fmt(d)}</p>
              ))}
              {response.steps && (
                <div style={{ marginTop:6 }}>
                  {response.steps.map(s => (
                    <div key={s.num} style={{ display:"flex", gap:12, marginBottom:12, alignItems:"flex-start" }}>
                      <div style={{ width:24, height:24, borderRadius:"50%", flexShrink:0,
                        background:P2.accentGlow, border:`1px solid ${P2.borderActive}`,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontFamily:MONO2, fontSize:11, fontWeight:600, color:P2.accent, marginTop:1 }}>{s.num}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <span style={{ fontSize:13.5, fontWeight:600, color:P2.textH }}>{s.title}</span>
                          {s.time && <span style={{ fontFamily:MONO2, fontSize:9.5, color:P2.textMuted,
                            background:"rgba(255,255,255,0.03)", padding:"1px 6px", borderRadius:4 }}>{s.time}</span>}
                        </div>
                        <p style={{ fontSize:13, color:P2.text, lineHeight:1.65, margin:"3px 0 0" }}>{fmt(s.detail)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {response.intro && <p style={{ fontSize:13.5, color:P2.text, lineHeight:1.7, margin:"0 0 8px" }}>{fmt(response.intro)}</p>}
              {response.script && (
                <div style={{ background:"#060A13", border:`1px solid ${P2.border}`,
                  borderLeft:`3px solid ${P2.emerald}`, borderRadius:6,
                  padding:"14px 16px", margin:"8px 0" }}>
                  <div style={{ fontSize:13, color:"#C0CDE0", lineHeight:1.7, fontStyle:"italic", whiteSpace:"pre-wrap" }}>
                    {response.script}
                  </div>
                </div>
              )}
              {response.tips && (
                <div style={{ marginTop:10 }}>
                  <div style={{ fontFamily:MONO2, fontSize:10, color:P2.textMuted, textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>Tips</div>
                  {response.tips.map((tip, i) => (
                    <div key={i} style={{ display:"flex", gap:6, marginBottom:4, fontSize:12.5, color:P2.textSoft }}>
                      <span style={{ color:P2.teal }}>›</span> {fmt(tip)}
                    </div>
                  ))}
                </div>
              )}
              {response.card && renderCard(response.card)}
              {response.type === "claim_selector" && <ClaimPicker onSelect={onClaimSelect} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UserMessage2({ text }) {
  return (
    <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:8 }}>
      <div style={{ maxWidth:480, background:P2.bgBubbleUser, border:`1px solid ${P2.borderActive}`,
        borderRadius:"12px 2px 12px 12px", padding:"12px 16px" }}>
        <div style={{ fontSize:14, color:P2.textH, lineHeight:1.6 }}>{text}</div>
      </div>
    </div>
  );
}

function TypingIndicator2() {
  return (
    <div style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:8 }}>
      <div style={{ width:30, height:30, borderRadius:8, flexShrink:0,
        background:"linear-gradient(135deg,#1A3058 0%,#0E1A30 100%)",
        border:`1px solid ${P2.borderActive}`,
        display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>⚕</div>
      <div style={{ background:P2.bgBubbleAgent, border:`1px solid ${P2.border}`,
        borderRadius:"2px 12px 12px 12px", padding:"14px 18px", display:"flex", gap:5, alignItems:"center" }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width:6, height:6, borderRadius:"50%", background:P2.textMuted,
            animation:`typingDot2 1.2s ease-in-out ${i*0.2}s infinite` }} />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SIDEBAR — member + all claims list
   ═══════════════════════════════════════════════════════════════ */
function SidebarV2({ activeClaim }) {
  const pctDed = Math.round((MEMBER_V2.deductible.used / MEMBER_V2.deductible.max) * 100);
  const pctOop = Math.round((MEMBER_V2.oop.used / MEMBER_V2.oop.max) * 100);

  return (
    <div style={{ width:270, minWidth:270, background:P2.bgPanel,
      borderLeft:`1px solid ${P2.border}`, padding:"20px 16px",
      overflowY:"auto", display:"flex", flexDirection:"column" }}>

      <div style={{ fontFamily:MONO2, fontSize:9.5, textTransform:"uppercase",
        letterSpacing:1.8, color:P2.textMuted, marginBottom:14, fontWeight:600 }}>Member Context</div>

      {/* Member chip */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16,
        padding:"12px", background:"rgba(59,130,246,0.04)",
        border:`1px solid ${P2.borderTool}`, borderRadius:10 }}>
        <div style={{ width:36, height:36, borderRadius:"50%",
          background:"linear-gradient(135deg,#2563EB 0%,#14B8A6 100%)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:15, fontWeight:700, color:"#fff" }}>SM</div>
        <div>
          <div style={{ fontSize:14, fontWeight:600, color:P2.textH }}>{MEMBER_V2.name}</div>
          <div style={{ fontFamily:MONO2, fontSize:10.5, color:P2.textMuted }}>{MEMBER_V2.id}</div>
        </div>
      </div>

      {/* Plan */}
      {[["Plan",MEMBER_V2.plan],["Group",MEMBER_V2.group]].map(([k,v]) => (
        <div key={k} style={{ marginBottom:10 }}>
          <div style={{ fontFamily:MONO2, fontSize:9, color:P2.textMuted, textTransform:"uppercase", letterSpacing:1.4, marginBottom:3 }}>{k}</div>
          <div style={{ fontSize:12.5, color:P2.textH, fontWeight:500, lineHeight:1.4 }}>{v}</div>
        </div>
      ))}

      <div style={{ height:1, background:P2.border, margin:"8px 0 14px" }} />

      {/* Accumulators */}
      <div style={{ fontFamily:MONO2, fontSize:9.5, textTransform:"uppercase",
        letterSpacing:1.4, color:P2.textMuted, marginBottom:10, fontWeight:600 }}>Accumulators</div>
      {[{label:"Deductible", pct:pctDed, used:MEMBER_V2.deductible.used, max:MEMBER_V2.deductible.max, color:P2.accent},
        {label:"OOP Max", pct:pctOop, used:MEMBER_V2.oop.used, max:MEMBER_V2.oop.max, color:P2.teal}].map(b => (
        <div key={b.label} style={{ marginBottom:12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
            <span style={{ fontSize:11, color:P2.textSoft }}>{b.label}</span>
            <span style={{ fontFamily:MONO2, fontSize:11, color:P2.text }}>${b.used} / ${b.max}</span>
          </div>
          <div style={{ height:5, background:"rgba(255,255,255,0.04)", borderRadius:3 }}>
            <div style={{ height:"100%", width:`${b.pct}%`, background:b.color, borderRadius:3 }} />
          </div>
        </div>
      ))}

      <div style={{ height:1, background:P2.border, margin:"4px 0 14px" }} />

      {/* Claims list */}
      <div style={{ fontFamily:MONO2, fontSize:9.5, textTransform:"uppercase",
        letterSpacing:1.4, color:P2.textMuted, marginBottom:10, fontWeight:600 }}>All Claims</div>
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {CLAIMS_V2.map(c => {
          const sc = STATUS_COLORS_V2[c.status];
          const isActive = activeClaim && activeClaim.id === c.id;
          return (
            <div key={c.id} style={{ padding:"9px 10px", borderRadius:8,
              background: isActive ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.02)",
              border:`1px solid ${isActive ? P2.accent : sc.border}`,
              transition:"all 0.25s" }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                <span style={{ fontSize:12 }}>{c.icon}</span>
                <span style={{ fontFamily:MONO2, fontSize:9, fontWeight:700, textTransform:"uppercase",
                  letterSpacing:0.8, color:sc.text }}>{c.status}</span>
                {isActive && <span style={{ fontFamily:MONO2, fontSize:8.5, color:P2.accent,
                  background:P2.accentGlow, padding:"1px 5px", borderRadius:8, letterSpacing:0.5 }}>ACTIVE</span>}
              </div>
              <div style={{ fontSize:11.5, color:P2.textH, fontWeight:500, marginBottom:2, lineHeight:1.3 }}>{c.service}</div>
              <div style={{ fontFamily:MONO2, fontSize:10, color:P2.textMuted }}>{c.dos}</div>
              <div style={{ fontFamily:MONO2, fontSize:10.5, marginTop:3,
                color: c.memberOwes === "$0.00" ? P2.emerald : c.memberOwes === "TBD" ? P2.textSoft : P2.amber,
                fontWeight:600 }}>Owes {c.memberOwes}</div>
            </div>
          );
        })}
      </div>

      <div style={{ flex:1 }} />

      <div style={{ marginTop:14, padding:"10px 12px", borderRadius:8,
        background:P2.amberGlow, border:"1px solid rgba(245,158,11,0.12)" }}>
        <div style={{ fontFamily:MONO2, fontSize:9, textTransform:"uppercase",
          letterSpacing:1.2, color:P2.amber, fontWeight:600, marginBottom:3 }}>Role Boundary</div>
        <div style={{ fontSize:10.5, color:P2.textSoft, lineHeight:1.5 }}>
          Interpretation layer only. Final determinations held by System of Record.
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════════════════ */
function AgenticChatUIV2() {
  const GREETING = {
    role:"agent",
    response:{ type:"claim_selector",
      headline:"Hi Sarah! I'm your Benefits Advocate. I can see you have 5 claims on file.",
      text:"Two of them need your attention. Select a claim below and I'll pull up all the details, explain what happened, and walk you through exactly what to do.",
    },
    tools:[], showTools:false, toolsDone:true,
  };

  const [messages, setMessages] = useState([GREETING]);
  const [suggestions, setSuggestions] = useState([]);
  const [input, setInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [activeClaim, setActiveClaim] = useState(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, processing]);

  const handleClaimSelect = useCallback((claim) => {
    setActiveClaim(claim);
    setProcessing(true);
    setSuggestions([]);
    const userMsg = `Tell me about my ${claim.service} claim (${claim.id})`;
    setMessages(prev => [...prev, { role:"user", text:userMsg }]);
    const flow = FLOWS_BY_CLAIM[claim.id]?.welcome;
    if (!flow) return;
    setTimeout(() => {
      setMessages(prev => [...prev, { role:"agent", response:flow.response, tools:flow.tools, showTools:true, toolsDone:false }]);
      const delay = flow.tools.reduce((s, t) => s + (t.duration || 1000), 0) + 1000;
      setTimeout(() => {
        setProcessing(false);
        setSuggestions(flow.suggestions || []);
      }, delay);
    }, 600);
  }, []);

  const handleSend = useCallback((text) => {
    if (!text.trim() || processing) return;
    const userText = text.trim();
    setInput("");
    setSuggestions([]);
    setProcessing(true);
    setMessages(prev => [...prev, { role:"user", text:userText }]);

    const flow = activeClaim ? findClaimFlow(activeClaim.id, userText) : null;
    setTimeout(() => {
      if (!flow) {
        setMessages(prev => [...prev, {
          role:"agent",
          response:{ type:"fallback",
            text: activeClaim
              ? `I can help with your ${activeClaim.service} claim. Try one of the suggestions below.`
              : "Please select a claim above to get started, and I'll walk you through everything.",
          },
          tools:[], showTools:false, toolsDone:true,
        }]);
        setSuggestions(activeClaim ? (FLOWS_BY_CLAIM[activeClaim.id]?.welcome?.suggestions || []) : []);
        setProcessing(false);
      } else {
        setMessages(prev => [...prev, { role:"agent", response:flow.response, tools:flow.tools, showTools:true, toolsDone:false }]);
        const delay = flow.tools.reduce((s, t) => s + (t.duration || 1000), 0) + 800;
        setTimeout(() => {
          setProcessing(false);
          setSuggestions(flow.suggestions || []);
        }, delay);
      }
    }, 600);
  }, [processing, activeClaim]);

  const handleKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(input); } };

  return (
    <>
      <link href={FONT_URL2} rel="stylesheet" />
      <style>{`
        @keyframes fadeUp2 { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes typingDot2 { 0%,60%,100%{opacity:0.3;transform:translateY(0)} 30%{opacity:1;transform:translateY(-3px)} }
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#151E35;border-radius:3px}
        button:focus-visible{outline:2px solid #3B82F6;outline-offset:2px}
      `}</style>

      <div style={{ display:"flex", height:"100vh", width:"100%", background:P2.bg, fontFamily:FONT2 }}>

        {/* ── Chat column ── */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>

          {/* Header */}
          <div style={{ padding:"14px 24px", borderBottom:`1px solid ${P2.border}`,
            display:"flex", alignItems:"center", justifyContent:"space-between",
            background:P2.bgPanel, flexShrink:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:34, height:34, borderRadius:8,
                background:"linear-gradient(135deg,#2563EB 0%,#14B8A6 100%)",
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>⚕</div>
              <div>
                <div style={{ fontSize:15, fontWeight:700, color:P2.textH, letterSpacing:-0.3 }}>
                  Member 360 <span style={{ fontWeight:400, color:P2.textMuted }}>·</span>{" "}
                  <span style={{ fontWeight:400, color:P2.textSoft, fontSize:13 }}>Benefits Advocate</span>
                  {activeClaim && (
                    <span style={{ fontFamily:MONO2, fontSize:11, color:P2.accent,
                      background:P2.accentGlow, border:`1px solid ${P2.borderActive}`,
                      padding:"2px 8px", borderRadius:6, marginLeft:10, fontWeight:500 }}>
                      {activeClaim.id} — {activeClaim.service}
                    </span>
                  )}
                </div>
                <div style={{ fontFamily:MONO2, fontSize:10, color:P2.textMuted, marginTop:1, display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ width:6, height:6, borderRadius:"50%", background:P2.emerald, display:"inline-block" }} />
                  Agentic Experience Layer — Multi-Claim Advocacy
                </div>
              </div>
            </div>
            <div style={{ fontFamily:MONO2, fontSize:9.5, color:P2.textMuted,
              background:"rgba(255,255,255,0.02)", border:`1px solid ${P2.border}`,
              borderRadius:6, padding:"4px 10px", letterSpacing:0.5 }}>v2 PROTOTYPE</div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} style={{ flex:1, overflowY:"auto", padding:"24px 28px" }}>
            <div style={{ maxWidth:740, margin:"0 auto" }}>
              <div style={{ textAlign:"center", marginBottom:24, padding:"10px 16px",
                background:"rgba(245,158,11,0.04)", border:"1px solid rgba(245,158,11,0.1)", borderRadius:8 }}>
                <span style={{ fontFamily:MONO2, fontSize:10, color:"#8A7A4E", letterSpacing:0.5 }}>
                  Interpretation layer only. Final financial determinations held by the Adjudication System of Record.
                </span>
              </div>

              {messages.map((msg, i) => (
                <div key={i} style={{ animation:"fadeUp2 0.3s ease" }}>
                  {msg.role === "user"
                    ? <UserMessage2 text={msg.text} />
                    : <AgentMessage2 message={msg} isLast={i === messages.length - 1}
                        onClaimSelect={handleClaimSelect} />}
                </div>
              ))}

              {processing && messages[messages.length-1]?.role === "user" && <TypingIndicator2 />}

              {suggestions.length > 0 && !processing && (
                <div style={{ display:"flex", flexWrap:"wrap", gap:8,
                  marginTop:12, marginLeft:40, animation:"fadeUp2 0.4s ease" }}>
                  {suggestions.map((s, i) => (
                    <button key={i} onClick={() => handleSend(s)} style={{
                      background:"rgba(59,130,246,0.06)", border:`1px solid ${P2.borderActive}`,
                      borderRadius:20, padding:"7px 14px", fontFamily:FONT2, fontSize:12.5,
                      color:P2.accent, cursor:"pointer", transition:"all 0.2s", outline:"none" }}
                      onMouseEnter={e => { e.target.style.background="rgba(59,130,246,0.12)"; e.target.style.borderColor=P2.accent; }}
                      onMouseLeave={e => { e.target.style.background="rgba(59,130,246,0.06)"; e.target.style.borderColor=P2.borderActive; }}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <div style={{ height:24 }} />
            </div>
          </div>

          {/* Input */}
          <div style={{ padding:"14px 28px 20px", borderTop:`1px solid ${P2.border}`,
            background:P2.bgPanel, flexShrink:0 }}>
            <div style={{ maxWidth:740, margin:"0 auto",
              display:"flex", gap:10, alignItems:"flex-end" }}>
              <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
                placeholder={activeClaim ? `Ask about your ${activeClaim.service} claim...` : "Select a claim above to get started..."}
                rows={1} style={{ flex:1, background:P2.bgInput, border:`1px solid ${P2.border}`,
                  borderRadius:10, padding:"12px 16px", color:P2.textH, fontFamily:FONT2,
                  fontSize:14, lineHeight:1.5, resize:"none", outline:"none",
                  minHeight:46, maxHeight:120, overflowY:"auto" }}
                onFocus={e => e.target.style.borderColor = P2.borderActive}
                onBlur={e => e.target.style.borderColor = P2.border}
              />
              <button onClick={() => handleSend(input)} disabled={processing || !input.trim()}
                style={{ padding:"12px 20px", background: processing || !input.trim() ? "rgba(59,130,246,0.3)" : P2.accent,
                  border:"none", borderRadius:10, color:"#fff", fontFamily:FONT2,
                  fontSize:13.5, fontWeight:600, cursor: processing || !input.trim() ? "default" : "pointer",
                  transition:"all 0.2s", minWidth:72, height:46 }}
                aria-label="Send message">
                {processing ? "..." : "Send"}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <SidebarV2 activeClaim={activeClaim} />
      </div>
    </>
  );
}