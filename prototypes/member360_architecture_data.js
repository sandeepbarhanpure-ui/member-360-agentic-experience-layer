const { useState, useEffect, useRef } = React;

/* ═══════════════════════════════════════════════════════════════
   ARCHITECTURE DATA MODEL
   ═══════════════════════════════════════════════════════════════ */

const LAYERS = [
  {
    id: "experience",
    label: "Experience Layer",
    sublabel: "Member-Facing Interface",
    color: "#3B82F6",
    glow: "rgba(59,130,246,0.12)",
    y: 0,
    components: [
      {
        id: "chat_ui",
        label: "Agentic Chat UI",
        tech: "React / Streamlit",
        icon: "💬",
        desc: "Conversational interface where members interact with the Benefits Advocate agent. Renders tool-call visualizations, inline data cards, and actionable scripts in real-time.",
        details: ["Natural language input", "Streaming responses", "Suggestion chips", "Copy-to-clipboard scripts"],
      },
      {
        id: "dashboard",
        label: "Advocacy Dashboard",
        tech: "Streamlit Widgets",
        icon: "📊",
        desc: "Structured dashboard view showing claim snapshots, denial explanations (The Why), action plans (The How), and reconciliation reasoning with SBC citations.",
        details: ["Metric cards", "Consistency badges", "SBC excerpt panels", "RAG status indicators"],
      },
      {
        id: "member_ctx",
        label: "Member Context Panel",
        tech: "Real-Time State",
        icon: "👤",
        desc: "Sidebar displaying member demographics, plan enrollment, accumulator status (deductible/OOP), and active claim details pulled from the benefits platform.",
        details: ["Accumulator progress bars", "Active claim feed", "Plan summary", "Identity verification"],
      },
    ],
  },
  {
    id: "orchestration",
    label: "Orchestration Layer",
    sublabel: "Agentic Reasoning Engine",
    color: "#14B8A6",
    glow: "rgba(20,184,166,0.10)",
    y: 1,
    components: [
      {
        id: "recon_agent",
        label: "ReconciliationAgent",
        tech: "Python / LangChain",
        icon: "⚙️",
        desc: "Core agent class that orchestrates the full adjudicator-to-member workflow: Ingest → Lookup → RAG Retrieve → Reason → Output. Enforces anti-hallucination guardrails.",
        details: ["5-step pipeline", "Deterministic + RAG hybrid", "Citation enforcement", "Confidence scoring"],
        isPrimary: true,
      },
      {
        id: "eob_parser",
        label: "EOB Parser",
        tech: "Regex / Structured Extract",
        icon: "📄",
        desc: "Ingests raw EOB text files and extracts structured fields: denial code, service, facility, amounts, dates, and provider information into a typed EOBRecord object.",
        details: ["Field-level extraction", "Multi-format support", "Validation layer", "Error handling"],
      },
      {
        id: "reasoning",
        label: "Reasoning Engine",
        tech: "Rule-Based Logic",
        icon: "🧮",
        desc: "Compares parsed EOB data against retrieved SBC text to determine denial consistency. Applies facility-type checks (ER exception), timeline validation, and action-owner assignment.",
        details: ["ER exception logic", "Timeline checks", "Consistency scoring", "Action path routing"],
      },
    ],
  },
  {
    id: "retrieval",
    label: "Data & Retrieval Layer",
    sublabel: "Knowledge Infrastructure",
    color: "#F59E0B",
    glow: "rgba(245,158,11,0.10)",
    y: 2,
    components: [
      {
        id: "denial_map",
        label: "Denial Code Mapping",
        tech: "JSON / Deterministic",
        icon: "🗂️",
        desc: "Deterministic bridge mapping CARC/RARC codes to plain-language explanations, SBC section references, action owners, and member call scripts. Hard constraint: unknown codes are rejected.",
        details: ["CO-197, CO-16, CO-4, CO-29", "PR-1, PR-2", "Action owner routing", "Script templates"],
      },
      {
        id: "sbc_rag",
        label: "SBC Vector Store",
        tech: "FAISS / HuggingFace",
        icon: "🔍",
        desc: "RAG pipeline over the Summary of Benefits and Coverage document. Uses all-MiniLM-L6-v2 embeddings with FAISS similarity search to retrieve the specific SBC section referenced by the denial mapping.",
        details: ["Markdown header splitting", "Semantic similarity (k=2)", "Section-level retrieval", "Deterministic fallback"],
      },
      {
        id: "accumulator",
        label: "Accumulator Store",
        tech: "Benefits Platform API",
        icon: "💰",
        desc: "Real-time member financial accumulators: deductible usage, out-of-pocket maximum tracking, coinsurance calculations, and potential savings projections if denied claims are resolved.",
        details: ["Deductible tracking", "OOP max monitoring", "Coinsurance calc", "Savings projection"],
      },
    ],
  },
  {
    id: "integration",
    label: "Integration Layer",
    sublabel: "System of Record Boundary",
    color: "#F43F5E",
    glow: "rgba(244,63,94,0.10)",
    y: 3,
    components: [
      {
        id: "adjudication",
        label: "Adjudication Engine",
        tech: "System of Record",
        icon: "⚖️",
        desc: "The upstream claims adjudication system that makes the actual pay/deny determination. Member 360 reads from this system but NEVER writes back or overrides its decisions.",
        details: ["NCPDP B1/B2 transactions", "Real-time adjudication", "Parity validation", "Financial authority"],
        isPrimary: true,
      },
      {
        id: "eob_feed",
        label: "EOB Data Feed",
        tech: "Kafka / Batch ETL",
        icon: "📡",
        desc: "Ingestion pipeline for Explanation of Benefits data from the adjudication engine. Supports both real-time Kafka streaming and batch file processing for historical claims.",
        details: ["Kafka consumer group", "Batch file ingest", "Schema validation", "Dedup logic"],
      },
      {
        id: "plan_docs",
        label: "Plan Document Store",
        tech: "Document Management",
        icon: "📁",
        desc: "Repository of plan documents including SBC, SPD, formularies, and provider network files. Source-of-truth for the RAG pipeline's plan rule retrieval.",
        details: ["SBC / SPD versioning", "Formulary data", "Network files", "Annual refresh cycle"],
      },
    ],
  },
];

const DATA_FLOWS = [
  { from: "adjudication", to: "eob_feed", label: "Claim Outcomes", color: "#F43F5E" },
  { from: "eob_feed", to: "eob_parser", label: "EOB Data", color: "#F43F5E" },
  { from: "plan_docs", to: "sbc_rag", label: "Plan Rules", color: "#F59E0B" },
  { from: "eob_parser", to: "recon_agent", label: "Structured EOB", color: "#14B8A6" },
  { from: "denial_map", to: "recon_agent", label: "Code → Explanation", color: "#F59E0B" },
  { from: "sbc_rag", to: "reasoning", label: "SBC Excerpt", color: "#F59E0B" },
  { from: "reasoning", to: "recon_agent", label: "Consistency Result", color: "#14B8A6" },
  { from: "recon_agent", to: "chat_ui", label: "Agent Response", color: "#3B82F6" },
  { from: "recon_agent", to: "dashboard", label: "Structured Output", color: "#3B82F6" },
  { from: "accumulator", to: "member_ctx", label: "Financial Data", color: "#F59E0B" },
];

const PRINCIPLES = [
  { icon: "🛡️", title: "Anti-Hallucination", desc: "Unknown codes rejected. SBC sections cited by name. RAG retrieval status visible." },
  { icon: "🔒", title: "Role Boundary", desc: "Interpretation only. Never overrides adjudication. System of Record holds financial authority." },
  { icon: "⚡", title: "Deterministic + RAG Hybrid", desc: "JSON mapping for precision. Vector search for contextual plan rule retrieval. Best of both." },
  { icon: "🔎", title: "Auditable Pipeline", desc: "Every step logged: parse → lookup → retrieve → reason. Full transparency in tool chain." },
];

/* ═══════════════════════════════════════════════════════════════
   PALETTE
   ═══════════════════════════════════════════════════════════════ */

const C = {
  bg: "#04070E", bgCard: "#0A1020", bgHover: "#0E1630",
  bgPanel: "#080D1A", bgDetail: "#060B16",
  border: "#121D35", borderHi: "#1C2E52",
  textH: "#EDF2FA", text: "#B0C4DE", textSoft: "#6580A5", textMuted: "#2E4060",
  blue: "#3B82F6", teal: "#14B8A6", amber: "#F59E0B", rose: "#F43F5E", emerald: "#10B981",
};
const FONT = `'Nunito Sans', 'Avenir', -apple-system, sans-serif`;
const MONO = `'IBM Plex Mono', 'SF Mono', monospace`;
const FONTS_URL = "https://fonts.googleapis.com/css2?family=Nunito+Sans:ital,opsz,wght@0,6..12,300;0,6..12,500;0,6..12,700;0,6..12,800;1,6..12,400&family=IBM+Plex+Mono:wght@400;500;600&display=swap";
