/* Agentic Chat UI — Main Component
   API-connected chat with tool-chain visualization */

const { useState, useEffect, useRef, useCallback } = React;

/* ═══ Markdown Helper ════════════════════════════════════════ */
function formatMarkdown(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return React.createElement('strong', { key: i, className: 'text-gray-100 font-semibold' }, part.slice(2, -2));
    }
    return part;
  });
}

/* ═══ Agent Message ═════════════════════════════════════════ */
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
          ⚚
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

/* ═══ User Message ══════════════════════════════════════════ */
function UserMessage({ text }) {
  return (
    <div className="flex justify-end mb-2">
      <div className="max-w-[480px] bg-blue-900/30 border border-blue-800/40 rounded-xl rounded-tr-sm px-4 py-3">
        <div className="text-sm text-gray-100 leading-relaxed">{text}</div>
      </div>
    </div>
  );
}

/* ═══ Typing Indicator ══════════════════════════════════════ */
function TypingIndicator() {
  return (
    <div className="flex gap-2.5 items-start mb-2">
      <div className="w-[30px] h-[30px] rounded-lg flex-shrink-0 bg-gradient-to-br from-blue-800 to-gray-900 border border-blue-800/40 flex items-center justify-center text-[13px]">⚚</div>
      <div className="bg-gray-900/60 border border-gray-800 rounded-sm rounded-r-xl rounded-b-xl px-4 py-3.5 flex gap-1.5 items-center">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-600 animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
        ))}
      </div>
    </div>
  );
}

/* ═══ Main Chat Page ════════════════════════════════════════ */
function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [member, setMember] = useState(null);
  const [claim, setClaim] = useState(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Load member, claim, and greeting from API
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
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-gray-800 flex items-center justify-between bg-gray-900/80 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-[34px] h-[34px] rounded-lg bg-gradient-to-br from-blue-600 to-teal-500 flex items-center justify-center text-base">⚚</div>
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

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-7 py-6">
          <div className="max-w-[720px] mx-auto">
            {/* Disclaimer */}
            <div className="text-center mb-6 px-4 py-2.5 bg-amber-500/[0.04] border border-amber-500/10 rounded-lg">
              <span className="font-mono text-[10px] text-amber-700 tracking-wide">
                This is an interpretation layer. Final financial determinations are held by the Adjudication System of Record.
              </span>
            </div>

            {messages.map((msg, i) => (
              <div key={i} className="animate-fade-up">
                {msg.role === 'user'
                  ? <UserMessage text={msg.text} />
                  : <AgentMessage message={msg} />
                }
              </div>
            ))}

            {isProcessing && messages[messages.length - 1]?.role === 'user' && <TypingIndicator />}

            {/* Suggestions */}
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

        {/* Input Bar */}
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
                aria-label="Chat message input"
              />
              <button
                onClick={() => handleSend(input)}
                disabled={!input.trim() || isProcessing}
                className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                  input.trim() && !isProcessing
                    ? 'bg-[#0053e2] hover:bg-[#004acc] cursor-pointer'
                    : 'bg-white/[0.03] cursor-default'
                }`}
                aria-label="Send message"
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

      {/* Right Panel */}
      <MemberPanel member={member} claim={claim} />
    </div>
  );
}
