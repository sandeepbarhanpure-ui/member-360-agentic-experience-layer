const { useState, useEffect } = React;

/* ═══ API Helper ═══════════════════════════════════════════════ */
const api = async (path, options = {}) => {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

/* ═══ Nav Item ════════════════════════════════════════════════ */
function NavItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all w-full text-left
        ${active
          ? 'bg-[#0053e2] text-white shadow-lg shadow-blue-900/30'
          : 'text-gray-400 hover:text-white hover:bg-gray-800'
        }`}
    >
      <span className="text-lg">{icon}</span>
      {label}
    </button>
  );
}

/* ═══ Dashboard Page ══════════════════════════════════════════ */
function DashboardPage() {
  const [members, setMembers] = useState([]);
  const [claims, setClaims] = useState([]);
  const [denialCodes, setDenialCodes] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api('/members'),
      api('/claims'),
      api('/denial-codes'),
      api('/health'),
    ]).then(([m, c, d, h]) => {
      setMembers(m);
      setClaims(c);
      setDenialCodes(d);
      setHealth(h);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-96"><span className="text-gray-500">Loading…</span></div>;

  const denied = claims.filter(c => c.status === 'DENIED');
  const processed = claims.filter(c => c.status === 'PROCESSED');

  return (
    <div className="space-y-6">
      {/* System Banner */}
      <div className="bg-gray-900 border border-gray-700 border-l-4 border-l-[#ffc220] rounded-lg px-5 py-3 text-sm text-gray-400">
        <strong className="text-[#ffc220]">⚠ ROLE BOUNDARY</strong> —
        This is an interpretation layer. Final financial determinations are held by the <strong className="text-[#ffc220]">Adjudication System of Record</strong>.
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Members" value={members.length} accent="blue" />
        <MetricCard label="Total Claims" value={claims.length} accent="teal" />
        <MetricCard label="Denied" value={denied.length} accent="rose" />
        <MetricCard label="Denial Codes" value={denialCodes.length} accent="amber" />
      </div>

      {/* Members Table */}
      <SectionCard title="👥 Members" subtitle="Synthetic member profiles">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-800">
              <th className="text-left py-3 px-4">ID</th>
              <th className="text-left py-3 px-4">Name</th>
              <th className="text-left py-3 px-4">Plan</th>
              <th className="text-right py-3 px-4">Deductible</th>
              <th className="text-right py-3 px-4">OOP</th>
            </tr></thead>
            <tbody>
              {members.map(m => (
                <tr key={m.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-3 px-4 font-mono text-[#0053e2]">{m.id}</td>
                  <td className="py-3 px-4 text-gray-200">{m.name}</td>
                  <td className="py-3 px-4 text-gray-400 text-xs">{m.plan}</td>
                  <td className="py-3 px-4 text-right">
                    <ProgressBar used={m.deductible.used} max={m.deductible.max} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <ProgressBar used={m.oop.used} max={m.oop.max} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Claims Table */}
      <SectionCard title="📋 Claims" subtitle="All synthetic claims">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-800">
              <th className="text-left py-3 px-4">Code</th>
              <th className="text-left py-3 px-4">Service</th>
              <th className="text-left py-3 px-4">Status</th>
              <th className="text-left py-3 px-4">Facility</th>
              <th className="text-right py-3 px-4">Billed</th>
              <th className="text-right py-3 px-4">Member Owes</th>
            </tr></thead>
            <tbody>
              {claims.map((c, i) => (
                <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-3 px-4 font-mono font-semibold text-gray-200">{c.code}</td>
                  <td className="py-3 px-4 text-gray-300">{c.service}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="py-3 px-4 text-gray-400">{c.facility}</td>
                  <td className="py-3 px-4 text-right text-gray-300">{c.billed}</td>
                  <td className="py-3 px-4 text-right font-semibold text-gray-200">{c.member_owes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* API Health */}
      <div className="text-center text-xs text-gray-600 py-4">
        API: {health?.status} · v{health?.version}
      </div>
    </div>
  );
}

/* ═══ Reconcile Page ═════════════════════════════════════════ */
function ReconcilePage() {
  const [eobText, setEobText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mockEob, setMockEob] = useState('');

  useEffect(() => {
    fetch('/api/health').then(() => {
      // Load the mock EOB from the data directory via a small endpoint
    });
  }, []);

  const DEFAULT_EOB = `EXPLANATION OF BENEFITS
=======================
Plan: 2026 Associate Health Plan
Member ID: WMT-882401-A
Date of Service: 2026-03-10

CLAIM STATUS: DENIED

Code: CO-197
Service: MRI Knee
Facility: Outpatient Clinic
Rendering Provider: Dr. James Whitfield, NPI 1234567890
Billed Amount: $1,250.00
Allowed Amount: $0.00
Plan Paid: $0.00
Member Responsibility: $1,250.00

Remark: Service requires prior authorization per plan guidelines.`;

  const handleReconcile = async () => {
    const text = eobText.trim() || DEFAULT_EOB;
    setLoading(true);
    try {
      const res = await api('/reconcile', {
        method: 'POST',
        body: JSON.stringify({ eob_text: text }),
      });
      setResult(res);
    } catch (err) {
      setResult({ error: err.message });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <SectionCard title="📄 EOB Input" subtitle="Paste raw EOB text or use the default mock">
        <textarea
          value={eobText}
          onChange={e => setEobText(e.target.value)}
          placeholder={DEFAULT_EOB}
          rows={12}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg p-4 text-sm font-mono text-gray-300 focus:outline-none focus:border-[#0053e2] resize-y"
          aria-label="EOB text input"
        />
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleReconcile}
            disabled={loading}
            className="px-6 py-2.5 bg-[#0053e2] hover:bg-[#004acc] active:bg-[#003ba3] text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Reconciling…' : '⚡ Run Reconciliation'}
          </button>
          <button
            onClick={() => { setEobText(DEFAULT_EOB); }}
            className="px-6 py-2.5 border border-gray-600 text-gray-300 hover:bg-gray-800 rounded-lg font-medium text-sm transition-colors"
          >
            Load Default EOB
          </button>
        </div>
      </SectionCard>

      {result && !result.error && <ReconciliationResultCard result={result} />}
      {result?.error && (
        <div className="bg-gradient-to-br from-red-950 to-gray-900 border border-red-800 rounded-xl p-6">
          <h3 className="text-[#ea1100] font-bold text-lg mb-2">⊘ Unable to Interpret</h3>
          <p className="text-red-300">{result.error}</p>
        </div>
      )}
    </div>
  );
}

/* ═══ Reconciliation Result Card ══════════════════════════════ */
function ReconciliationResultCard({ result }) {
  const { eob, mapping, sbc_excerpt, reasoning, is_consistent, confidence, rag_available } = result;
  const [copied, setCopied] = useState(false);

  const filledScript = mapping?.script
    ?.replace('[ID]', eob.member_id || '[ID]')
    ?.replace('[Date]', eob.date_of_service || '[Date]');

  const handleCopy = () => {
    navigator.clipboard.writeText(filledScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Convert **text** to bold
  const formatReasoning = (text) => {
    return text.split('\n\n').map((para, i) => (
      <p key={i} className="mb-3 last:mb-0" dangerouslySetInnerHTML={{
        __html: para.replace(/\*\*(.+?)\*\*/g, '<strong class="text-gray-100">$1</strong>')
      }} />
    ));
  };

  return (
    <div className="space-y-5">
      {/* Claim Snapshot */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Status" value={eob.status} accent="rose" />
        <MetricCard label="Denial Code" value={eob.code} accent="blue" />
        <MetricCard label="Service" value={eob.service} accent="teal" />
        <MetricCard label="Billed" value={eob.billed_amount} accent="amber" />
      </div>

      {/* The Why */}
      <div className="bg-gradient-to-br from-blue-950/60 to-gray-900 border border-blue-800/50 rounded-xl p-6">
        <h3 className="text-[#0053e2] font-bold text-base flex items-center gap-2 mb-3">
          💬 {mapping.reason}
        </h3>
        <p className="text-gray-300 leading-relaxed">{mapping.plain_language}</p>
      </div>

      {/* The How */}
      <div className="bg-gradient-to-br from-green-950/40 to-gray-900 border border-green-800/40 rounded-xl p-6">
        <h3 className="text-[#2a8703] font-bold text-base flex items-center gap-2 mb-2">📋 Recommended Action</h3>
        <span className="inline-block bg-green-900/60 text-green-300 text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full mb-4">
          Action Owner: {mapping.action_owner}
        </span>
        <div className="bg-gray-950 border border-gray-800 rounded-lg p-4 text-sm text-gray-200 leading-relaxed italic">
          "{filledScript}"
        </div>
        <button
          onClick={handleCopy}
          className="mt-3 px-4 py-1.5 text-xs border border-gray-600 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          {copied ? '✓ Copied!' : '📋 Copy Script'}
        </button>
      </div>

      {/* Reasoning */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
        <h3 className="text-[#ffc220] font-bold text-base flex items-center gap-2 mb-3">⚖ Plan Rule Analysis</h3>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4 ${
          is_consistent
            ? 'bg-green-900/50 text-green-300 border border-green-800'
            : 'bg-red-900/50 text-red-300 border border-red-800'
        }`}>
          {is_consistent ? '✓ Consistent with Plan Rules' : '✗ Potential Inconsistency Detected'}
        </span>
        <div className="text-gray-400 text-sm leading-relaxed">
          {formatReasoning(reasoning)}
        </div>
        {sbc_excerpt && (
          <div className="mt-4 bg-gray-950 border border-gray-800 border-l-2 border-l-[#0053e2] rounded-md p-4">
            <div className="text-[#0053e2] text-[10px] uppercase tracking-wider font-semibold mb-1">
              SBC Source: § {mapping.sbc_section}
            </div>
            <div className="text-gray-500 text-sm">{sbc_excerpt}</div>
          </div>
        )}
        <div className="mt-3 text-xs text-gray-600 flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${rag_available ? 'bg-green-500' : 'bg-gray-600'}`} />
          {rag_available ? 'RAG retrieval active' : 'Deterministic retrieval'} · Confidence: {confidence}
        </div>
      </div>
    </div>
  );
}

/* ═══ Shared Components ══════════════════════════════════════ */

function MetricCard({ label, value, accent }) {
  const colors = {
    blue: 'text-[#0053e2]', teal: 'text-teal-400',
    amber: 'text-[#ffc220]', rose: 'text-rose-400',
  };
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">{label}</div>
      <div className={`text-xl font-bold ${colors[accent] || 'text-gray-100'}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const style = status === 'DENIED'
    ? 'bg-red-900/50 text-red-300 border-red-800'
    : 'bg-green-900/50 text-green-300 border-green-800';
  return <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style}`}>{status}</span>;
}

function ProgressBar({ used, max }) {
  const pct = Math.min((used / max) * 100, 100);
  const color = pct >= 100 ? 'bg-rose-500' : pct > 60 ? 'bg-[#ffc220]' : 'bg-[#0053e2]';
  return (
    <div className="text-right">
      <div className="text-xs text-gray-300 mb-1">${used.toLocaleString()} / ${max.toLocaleString()}</div>
      <div className="w-24 h-1.5 bg-gray-800 rounded-full ml-auto">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SectionCard({ title, subtitle, children }) {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
      <h2 className="text-lg font-bold text-gray-100 mb-0.5">{title}</h2>
      {subtitle && <p className="text-xs text-gray-500 mb-4">{subtitle}</p>}
      {children}
    </div>
  );
}

/* ═══ Denial Codes Page ══════════════════════════════════════ */
function DenialCodesPage() {
  const [codes, setCodes] = useState([]);
  useEffect(() => { api('/denial-codes').then(setCodes); }, []);

  return (
    <div className="space-y-4">
      <SectionCard title="📖 Recognized Denial Codes" subtitle="Deterministic mapping — unknown codes are rejected, not guessed">
        <div className="space-y-4 mt-2">
          {codes.map(c => (
            <div key={c.code} className="bg-gray-800/50 border border-gray-700 rounded-lg p-5">
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono font-bold text-[#0053e2] text-lg">{c.code}</span>
                <span className="text-gray-200 font-semibold">{c.reason}</span>
                <span className={`ml-auto px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  c.action_owner === 'Provider'
                    ? 'bg-blue-900/40 text-blue-300 border-blue-800'
                    : 'bg-amber-900/40 text-amber-300 border-amber-800'
                }`}>{c.action_owner}</span>
              </div>
              <p className="text-gray-400 text-sm mb-2">{c.plain_language}</p>
              <div className="text-xs text-gray-500">SBC Section: <span className="text-gray-400">{c.sbc_section}</span></div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

/* ═══ App Shell (Main Layout) ═══════════════════════════════ */
function AppShell() {
  const [page, setPage] = useState('chat');

  const pages = [
    { id: 'chat', icon: '💬', label: 'Chat Agent' },
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'reconcile', icon: '⚡', label: 'Reconcile' },
    { id: 'codes', icon: '📖', label: 'Denial Codes' },
  ];

  // Chat page takes over the full viewport (has its own layout)
  if (page === 'chat') {
    return (
      <div className="h-screen flex flex-col">
        {/* Thin top bar for navigation back */}
        <div className="bg-gray-900/95 border-b border-gray-800 px-4 py-1.5 flex items-center gap-3 flex-shrink-0">
          <div className="flex gap-1">
            {pages.map(p => (
              <button
                key={p.id}
                onClick={() => setPage(p.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  page === p.id
                    ? 'bg-[#0053e2] text-white'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                }`}
              >
                {p.icon} {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <ChatPage />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <nav className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col" aria-label="Main navigation">
        <div className="p-5 border-b border-gray-800">
          <h1 className="text-xl font-bold">
            <span className="text-gray-100">⚚ Member</span>{' '}
            <span className="text-[#0053e2]">360</span>
          </h1>
          <p className="text-[11px] text-gray-500 mt-1">Agentic Experience Layer</p>
        </div>
        <div className="p-3 space-y-1 flex-1">
          {pages.map(p => (
            <NavItem
              key={p.id}
              icon={p.icon}
              label={p.label}
              active={page === p.id}
              onClick={() => setPage(p.id)}
            />
          ))}
        </div>
        <div className="p-4 border-t border-gray-800 text-[11px] text-gray-600">
          Member 360 v0.2.0<br />
          FastAPI + React<br />
          Synthetic Data Mode
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gray-950 p-8">
        <div className="max-w-5xl mx-auto">
          {page === 'dashboard' && <DashboardPage />}
          {page === 'reconcile' && <ReconcilePage />}
          {page === 'codes' && <DenialCodesPage />}
        </div>
      </main>
    </div>
  );
}
