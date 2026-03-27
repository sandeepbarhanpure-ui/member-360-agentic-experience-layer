// Copyright (c) 2026 Sandeep Barhanpure. All Rights Reserved.
// Proprietary software — see LICENSE for terms.

/* Chat Tool Chain Visualization Components */

const TOOL_ICONS = {
  read_eob: "", lookup_denial_code: "", query_sbc_rag: "",
  reconcile: "", determine_action_path: "", check_timeline: "",
  generate_script: "", fetch_accumulators: "", pending_claims: "",
  evaluate_appeal_path: "", escalation_paths: "",
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
        {isDone ? <span className="text-emerald-400 text-[11px]"></span> :
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

function ToolChain({ tools, onComplete }) {
  const { useState, useEffect, useRef } = React;
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
