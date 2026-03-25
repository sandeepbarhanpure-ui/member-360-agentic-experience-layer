/* Member 360 Chat — Full Agentic Chat UI
   All components in one file to avoid script tag dependency issues */

const { useState, useEffect, useRef, useCallback } = React;

/* ═══ TOOL CHAIN VISUALIZATION ════════════════════════════════ */

const TOOL_ICONS = {
  read_eob: "📄", lookup_denial_code: "🔍", query_sbc_rag: "🧠",
  reconcile: "⚖️", determine_action_path: "🛤️", check_timeline: "⏱️",
  generate_script: "✏️", fetch_accumulators: "💰", pending_claims: "📋",
  evaluate_appeal_path: "🔀", escalation_paths: "🚨",
};

function ToolStep({ tool, state }) {
  const isActive = state === "active";
  const isDone = state === "done";
  const isPending = state === "pending";

  return (
    <div className={`flex gap-2.5 items-start px-3 py-2 rounded-lg transition-all ${
      isActive ? 'bg-blue-500/5' : ''
    } ${isPending ? 'opacity-35' : 'opacity-100'}`}>
      <div className={`w-[26px] h-[26px] rounded-md flex-shrink-0 mt-0.5 flex items-center justify-center text-xs border transition-all ${
        isDone ? 'bg-emerald-500/10 border-emerald-500/20' :
        isActive ? 'bg-blue-500/10 border-blue-500/20' :
        'bg-white/[0.03] border-gray-800'
      }`}>
        {isDone ? <span className="text-emerald-400 text-[11px]">✓</span> :
         isActive ? <span className="inline-block w-2 h-2 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" /> :
         <span className="text-[11px]">{TOOL_ICONS[tool.name] || "⚙"}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`font-mono text-[11.5px] font-medium transition-colors ${
          isDone ? 'text-emerald-400' : isActive ? 'text-blue-400' : 'text-gray-600'
        }`}>{tool.label}</div>
        {(isActive || isDone) && (
          <div className={`font-mono text-[10.5px] text-gray-600 mt-0.5 leading-relaxed ${
            isDone ? 'opacity-70' : ''
          }`}>{tool.detail}</div>
        )}
      </div>
    </div>
  );
}

// Expose to global scope for app_shell.jsx
window.ChatPage = ChatPage;

function ToolChain({ tools, onComplete }) {
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [doneSet, setDoneSet] = useState(new Set());
  const completeCalled = useRef(false);

  useEffect(() => {
    if (tools.length === 0) {
      if (!completeCalled.current) { completeCalled.current = true; onComplete(); }
      return;
    }
    const t = setTimeout(() => setCurrentIdx(0), 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (currentIdx < 0 || currentIdx >= tools.length) return;
    const dur = tools[currentIdx].duration || 1000;
    const t = setTimeout(() => {
      setDoneSet(prev => { const n = new Set(prev); n.add(currentIdx); return n; });
      if (currentIdx + 1 < tools.length) {
        setTimeout(() => setCurrentIdx(currentIdx + 1), 200);
      } else {
        setTimeout(() => {
          if (!completeCalled.current) { completeCalled.current = true; onComplete(); }
        }, 300);
      }
    }, dur);
    return () => clearTimeout(t);
  }, [currentIdx]);

  return (
    <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-2.5 mb-2">
      <div className="font-mono text-[9.5px] uppercase tracking-widest text-gray-600 px-3 pb-2 pt-0.5 font-semibold">
        Agent Reasoning
      </div>
      {tools.map((tool, i) => (
        <ToolStep
          key={i} tool={tool}
          state={doneSet.has(i) ? "done" : i === currentIdx ? "active" : "pending"}
        />
      ))}
    </div>
  );
}

/* ═══ INLINE CARDS ════════════════════════════════════════════ */

function DenialCard({ card }) {
  return (
    <div className="bg-blue-500/[0.04] border border-blue-800/40 rounded-xl p-4 mt-2.5 mb-1">
      <div className="flex justify-between items-center mb-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded">
            {card.code}
          </span>
          <span className="text-[13px] text-gray-300 font-medium">{card.reason}</span>
        </div>
        <span className={`text-[10px] font-mono font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
          card.consistent
            ? 'bg-green-950 text-emerald-300 border-green-800'
            : 'bg-red-950 text-red-300 border-red-800'
        }`}>
          {card.consistent ? '✓ Consistent' : '✗ Inconsistent'}
        </span>
      </div>
      <div className="flex gap-5 flex-wrap">
        {[["Service", card.service], ["Amount", card.amount],
          ["Action Owner", card.owner], ["SBC Ref", card.sbcRef]
        ].map(([k, v]) => (
          <div key={k}>
            <div className="font-mono text-[9.5px] text-gray-600 uppercase tracking-wider">{k}</div>
            <div className="text-[13px] text-gray-100 font-medium mt-0.5">{v}</div>
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
      <div className="flex-1">
        <div className="flex justify-between mb-1">
          <span className="font-mono text-[10px] text-gray-600 uppercase tracking-wider">{label}</span>
          <span className="font-mono text-[11px] text-gray-300">${used.toLocaleString()} / ${max.toLocaleString()}</span>
        </div>
        <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-1000 ${color}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  };

  return (
    <div className="bg-teal-500/[0.04] border border-teal-500/15 rounded-xl p-4 mt-2.5 mb-1">
      <div className="flex gap-5 mb-3">
        <Bar used={card.deductible.used} max={card.deductible.max} color="bg-blue-500" label="Deductible" />
        <Bar used={card.oop.used} max={card.oop.max} color="bg-teal-500" label="Out-of-Pocket Max" />
      </div>
      <div className="bg-emerald-500/[0.08] border border-emerald-500/15 rounded-md px-3 py-2 flex items-center gap-2">
        <span className="text-sm">💡</span>
        <span className="text-[12.5px] text-emerald-400 font-medium">
          Potential savings if resolved: {card.potentialSavings}
        </span>
      </div>
    </div>
  );
}

function TimelineCard({ card }) {
  return (
    <div className="bg-amber-500/[0.08] border border-amber-500/15 rounded-xl px-4 py-3 mt-2.5 mb-1 flex items-center justify-between">
      <div>
        <div className="font-mono text-[9.5px] text-gray-600 uppercase tracking-wider">{card.deadlineLabel}</div>
        <div className="text-sm text-gray-100 font-semibold mt-0.5">{card.deadline}</div>
      </div>
      <div className="font-mono text-xl font-bold text-amber-400">
        {card.daysRemaining}d
      </div>
    </div>
  );
}

function renderCard(card) {
  if (!card) return null;
  if (card.type === "denial_card") return <DenialCard card={card} />;
  if (card.type === "financial_card") return <FinancialCard card={card} />;
  if (card.type === "timeline_card") return <TimelineCard card={card} />;
  return null;
}

/* ═══ MEMBER PANEL ════════════════════════════════════════════ */

function MemberPanel({ member, claim }) {
  if (!member) return null;

  const Stat = ({ label, value, sub }) => (
    <div className="mb-3.5">
      <div className="font-mono text-[9px] text-gray-600 uppercase tracking-[1.4px] mb-0.5">{label}</div>
      <div className="text-sm text-gray-100 font-semibold">{value}</div>
      {sub && <div className="text-[11px] text-gray-600 mt-0.5">{sub}</div>}
    </div>
  );

  const pctDed = Math.round((member.deductible.used / member.deductible.max) * 100);
  const pctOop = Math.round((member.oop.used / member.oop.max) * 100);
  const initials = member.name.split(' ').map(n => n[0]).join('');

  return (
    <div className="w-[260px] min-w-[260px] bg-gray-900/80 border-l border-gray-800 p-5 overflow-y-auto flex flex-col">
      <div className="font-mono text-[9.5px] uppercase tracking-[1.8px] text-gray-600 mb-4 font-semibold">
        Member Context
      </div>

      <div className="flex items-center gap-2.5 mb-4 p-3 bg-blue-500/[0.04] border border-gray-800 rounded-xl">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-teal-500 flex items-center justify-center text-[15px] font-bold text-white">
          {initials}
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-100">{member.name}</div>
          <div className="font-mono text-[10.5px] text-gray-600">{member.id}</div>
        </div>
      </div>

      <Stat label="Plan" value={member.plan} />
      <Stat label="Group" value={member.group} />

      <div className="h-px bg-gray-800 my-1 mb-4" />

      <div className="font-mono text-[9.5px] uppercase tracking-[1.4px] text-gray-600 mb-2.5 font-semibold">
        Accumulators
      </div>

      <div className="mb-3.5">
        <div className="flex justify-between mb-1">
          <span className="text-[11px] text-gray-500">Deductible</span>
          <span className="font-mono text-[11px] text-gray-300">
            ${member.deductible.used.toLocaleString()} / ${member.deductible.max.toLocaleString()}
          </span>
        </div>
        <div className="h-[5px] bg-white/[0.04] rounded-full">
          <div className="h-full bg-[#0053e2] rounded-full" style={{ width: `${pctDed}%` }} />
        </div>
      </div>

      <div className="mb-3.5">
        <div className="flex justify-between mb-1">
          <span className="text-[11px] text-gray-500">OOP Max</span>
          <span className="font-mono text-[11px] text-gray-300">
            ${member.oop.used.toLocaleString()} / ${member.oop.max.toLocaleString()}
          </span>
        </div>
        <div className="h-[5px] bg-white/[0.04] rounded-full">
          <div className="h-full bg-teal-500 rounded-full" style={{ width: `${pctOop}%` }} />
        </div>
      </div>

      {claim && (
        <>
          <div className="h-px bg-gray-800 my-1 mb-4" />
          <div className="font-mono text-[9.5px] uppercase tracking-[1.4px] text-gray-600 mb-2.5 font-semibold">
            Active Claim
          </div>
          {[
            ["Status", claim.status, 'text-rose-400'], ["Code", claim.code, 'text-[#0053e2]'],
            ["Service", claim.service], ["Facility", claim.facility],
            ["Provider", claim.provider], ["Date", claim.date_of_service],
            ["Billed", claim.billed], ["Member Owes", claim.member_owes, 'text-amber-400'],
          ].map(([k, v, color]) => (
            <div key={k} className="flex justify-between mb-1.5">
              <span className="text-[11px] text-gray-600">{k}</span>
              <span className={`font-mono text-[11px] ${color || 'text-gray-300'} ${color ? 'font-semibold' : ''}`}>{v}</span>
            </div>
          ))}
        </>
      )}

      <div className="flex-1" />

      <div className="mt-4 p-2.5 rounded-lg bg-amber-500/[0.08] border border-amber-500/10">
        <div className="font-mono text-[9px] uppercase tracking-wider text-amber-400 font-semibold mb-0.5">Role Boundary</div>
        <div className="text-[10.5px] text-gray-500 leading-relaxed">
          Interpretation layer only. Final determinations held by System of Record.
        </div>
      </div>
    </div>
  );
}

/* ═══ MESSAGES ════════════════════════════════════════════════ */

function formatMarkdown(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return React.createElement('strong', { key: i, className: 'text-gray-100 font-semibold' }, part.slice(2, -2));
    }
    return part;
  });
}

function AgentMessage({ message }) {
  const { response, tools, showTools, toolsDone } = message;
  const [showResponse, setShowResponse] = useState(!tools || tools.length === 0 || toolsDone);

  const handleToolsComplete = useCallback(() => {
    message.toolsDone = true;
    setTimeout(() => setShowResponse(true), 200);
  }, [message]);

  useEffect(() => { if (toolsDone) setShowResponse(true); }, [toolsDone]);

  return (
    <div className="max-w-[640px] mb-2">
      <div className="flex gap-2.5 items-start">
        <div className="w-[30px] h-[30px] rounded-lg flex-shrink-0 mt-0.5 bg-gradient-to-br from-blue-800 to-gray-900 border border-blue-800/40 flex items-center justify-center text-[13px]">
          ⚕
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-mono text-[10px] text-gray-600 mb-1 font-medium">Benefits Advocate</div>

          {showTools && tools && tools.length > 0 && (
            <ToolChain tools={tools} onComplete={handleToolsComplete} />
          )}

          {showResponse && response && (
            <div className="bg-gray-900/60 border border-gray-800 rounded-sm rounded-r-xl rounded-b-xl p-4 animate-fade-up">
              {response.headline && (
                <div className="text-[14.5px] font-semibold text-gray-100 mb-2 leading-snug">
                  {response.headline}
                </div>
              )}

              {response.text && (
                <div className="text-[13.5px] text-gray-300 leading-relaxed">
                  {response.text.split('\n').map((line, i) => (
                    <span key={i}>{line.trim() ? formatMarkdown(line) : <br />}{line.trim() ? ' ' : ''}</span>
                  ))}
                </div>
              )}

              {response.details && response.details.map((d, i) => (
                <p key={i} className="text-[13.5px] text-gray-300 leading-relaxed mb-2">
                  {formatMarkdown(d)}
                </p>
              ))}

              {response.steps && (
                <div className="mt-1.5">
                  {response.steps.map(s => (
                    <div key={s.num} className="flex gap-3 mb-3 items-start">
                      <div className="w-6 h-6 rounded-full flex-shrink-0 bg-blue-500/10 border border-blue-800/40 flex items-center justify-center font-mono text-[11px] font-semibold text-blue-400 mt-0.5">
                        {s.num}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[13.5px] font-semibold text-gray-100">{s.title}</span>
                          {s.time && <span className="font-mono text-[9.5px] text-gray-600 bg-white/[0.03] px-1.5 py-0.5 rounded">{s.time}</span>}
                        </div>
                        <p className="text-[13px] text-gray-300 leading-relaxed mt-0.5">{formatMarkdown(s.detail)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {response.intro && (
                <p className="text-[13.5px] text-gray-300 leading-relaxed mb-2">{formatMarkdown(response.intro)}</p>
              )}

              {response.script && (
                <div className="bg-gray-950 border border-gray-800 border-l-[3px] border-l-emerald-500 rounded-md p-4 my-2">
                  <div className="text-[13px] text-gray-300 leading-relaxed italic whitespace-pre-wrap">{response.script}</div>
                </div>
              )}

              {response.tips && (
                <div className="mt-2.5">
                  <div className="font-mono text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">Tips</div>
                  {response.tips.map((tip, i) => (
                    <div key={i} className="flex gap-1.5 mb-1 text-[12.5px] text-gray-500">
                      <span className="text-teal-400">›</span> {formatMarkdown(tip)}
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
    <div className="flex justify-end mb-2">
      <div className="max-w-[480px] bg-blue-900/30 border border-blue-800/40 rounded-xl rounded-tr-sm px-4 py-3">
        <div className="text-sm text-gray-100 leading-relaxed">{text}</div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-2.5 items-start mb-2">
      <div className="w-[30px] h-[30px] rounded-lg flex-shrink-0 bg-gradient-to-br from-blue-800 to-gray-900 border border-blue-800/40 flex items-center justify-center text-[13px]">⚕</div>
      <div className="bg-gray-900/60 border border-gray-800 rounded-sm rounded-r-xl rounded-b-xl px-4 py-3.5 flex gap-1.5 items-center">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-600 animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
        ))}
      </div>
    </div>
  );
}

/* ═══ MAIN CHAT PAGE ══════════════════════════════════════════ */

function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [member, setMember] = useState(null);
  const [claim, setClaim] = useState(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      try {
        const [memberRes, claimsRes, greetingRes] = await Promise.all([
          fetch('/api/members/SFP-882401-A').then(r => r.json()),
          fetch('/api/claims?member_id=SFP-882401-A').then(r => r.json()),
          fetch('/api/chat/greeting?member_id=SFP-882401-A').then(r => r.json()),
        ]);
        setMember(memberRes);
        setClaim(claimsRes[0] || null);
        setMessages([{
          role: 'agent',
          response: greetingRes.response,
          tools: greetingRes.tools,
          showTools: false,
          toolsDone: true,
        }]);
        setSuggestions(greetingRes.suggestions || []);
      } catch (err) {
        console.error('Init failed:', err);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isProcessing]);

  const handleSend = async (text) => {
    if (!text.trim() || isProcessing) return;
    const userText = text.trim();
    setInput('');
    setSuggestions([]);
    setIsProcessing(true);

    setMessages(prev => [...prev, { role: 'user', text: userText }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, member_id: 'SFP-882401-A' }),
      });
      const data = await res.json();

      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: 'agent',
          response: data.response,
          tools: data.tools,
          showTools: data.tools && data.tools.length > 0,
          toolsDone: false,
        }]);

        const totalToolTime = (data.tools || []).reduce((sum, t) => sum + (t.duration || 1000), 0) + 800;
        setTimeout(() => {
          setIsProcessing(false);
          setSuggestions(data.suggestions || []);
        }, data.tools?.length ? totalToolTime : 200);
      }, 600);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'agent',
        response: { type: 'error', text: 'Something went wrong. Please try again.' },
        tools: [], showTools: false, toolsDone: true,
      }]);
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  return (
    <div className="flex h-full bg-gray-950">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-6 py-3.5 border-b border-gray-800 flex items-center justify-between bg-gray-900/80 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-[34px] h-[34px] rounded-lg bg-gradient-to-br from-blue-600 to-teal-500 flex items-center justify-center text-base">⚕</div>
            <div>
              <div className="text-[15px] font-bold text-gray-100">
                Member 360 <span className="text-gray-600">·</span> <span className="font-normal text-gray-500 text-[13px]">Benefits Advocate</span>
              </div>
              <div className="font-mono text-[10px] text-gray-600 mt-0.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                Agentic Experience Layer — Claim Interpretation
              </div>
            </div>
          </div>
          <div className="font-mono text-[9.5px] text-gray-600 bg-white/[0.02] border border-gray-800 rounded-md px-2.5 py-1">
            v0.2 SCALED
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-7 py-6">
          <div className="max-w-[720px] mx-auto">
            <div className="text-center mb-6 px-4 py-2.5 bg-amber-500/[0.04] border border-amber-500/10 rounded-lg">
              <span className="font-mono text-[10px] text-amber-700 tracking-wide">
                This is an interpretation layer. Final financial determinations are held by the Adjudication System of Record.
              </span>
            </div>

            {messages.map((msg, i) => (
              <div key={i} className="animate-fade-up">
                {msg.role === 'user' ? <UserMessage text={msg.text} /> : <AgentMessage message={msg} />}
              </div>
            ))}

            {isProcessing && messages[messages.length - 1]?.role === 'user' && <TypingIndicator />}

            {suggestions.length > 0 && !isProcessing && (
              <div className="flex flex-wrap gap-2 mt-3 ml-10 animate-fade-up">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(s)}
                    className="bg-blue-500/[0.06] border border-blue-800/40 rounded-full px-3.5 py-1.5 text-[12.5px] text-blue-400 hover:bg-blue-500/[0.12] hover:border-blue-500 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-gray-950"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div className="h-6" />
          </div>
        </div>

        <div className="px-7 py-4 pb-5 border-t border-gray-800 bg-gray-900/80 flex-shrink-0">
          <div className="max-w-[720px] mx-auto">
            <div className="flex gap-2.5 items-center bg-gray-900 border border-gray-800 rounded-xl px-4 py-1 focus-within:border-[#0053e2] transition-colors">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your claim, benefits, or next steps..."
                disabled={isProcessing}
                className="flex-1 bg-transparent border-none outline-none text-sm text-gray-100 py-2.5 placeholder:text-gray-600 disabled:opacity-50"
              />
              <button
                onClick={() => handleSend(input)}
                disabled={!input.trim() || isProcessing}
                className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                  input.trim() && !isProcessing
                    ? 'bg-[#0053e2] hover:bg-[#004acc] cursor-pointer'
                    : 'bg-white/[0.03] cursor-default'
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke={input.trim() && !isProcessing ? '#fff' : '#3C5070'}
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
            <div className="text-center mt-2">
              <span className="font-mono text-[9.5px] text-gray-600">
                Powered by ReconciliationAgent · FastAPI + React · Deterministic Mapping + Agentic Reasoning
              </span>
            </div>
          </div>
        </div>
      </div>

      <MemberPanel member={member} claim={claim} />
    </div>
  );
}
