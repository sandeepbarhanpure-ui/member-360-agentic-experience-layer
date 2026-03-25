/* Member Context Panel — API-connected sidebar */

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

      {/* Member Avatar + Name */}
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

      {/* Deductible bar */}
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

      {/* OOP bar */}
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

      {/* Role Boundary */}
      <div className="mt-4 p-2.5 rounded-lg bg-amber-500/[0.08] border border-amber-500/10">
        <div className="font-mono text-[9px] uppercase tracking-wider text-amber-400 font-semibold mb-0.5">Role Boundary</div>
        <div className="text-[10.5px] text-gray-500 leading-relaxed">
          Interpretation layer only. Final determinations held by System of Record.
        </div>
      </div>
    </div>
  );
}
