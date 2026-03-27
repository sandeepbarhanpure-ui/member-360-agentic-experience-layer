/* Chat Inline Response Cards */

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
          {card.consistent ? ' Consistent' : ' Inconsistent'}
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
        <span className="text-sm"></span>
        <span className="text-[12.5px] text-emerald-400 font-medium">
          Potential savings if resolved: {card.potentialSavings}
        </span>
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
