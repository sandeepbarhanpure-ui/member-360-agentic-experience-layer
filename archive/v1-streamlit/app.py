"""
Member 360 — Agentic Experience Layer
======================================
A Streamlit prototype that interprets adjudication outcomes and translates
them into plain-English member advocacy guidance.

This is an INTERPRETATION layer. Final financial determinations are held
by the Adjudication System of Record.
"""

from __future__ import annotations

import json
import os
import re
import textwrap
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import streamlit as st

# ---------------------------------------------------------------------------
# LangChain / FAISS imports — graceful fallback when unavailable
# ---------------------------------------------------------------------------
try:
    from langchain_community.vectorstores import FAISS
    from langchain_community.embeddings import HuggingFaceEmbeddings
    from langchain_text_splitters import MarkdownHeaderTextSplitter
    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DENIAL_MAP_PATH = DATA_DIR / "denial_mapping.json"
SBC_PATH = DATA_DIR / "synthetic_sbc.md"
EOB_PATH = DATA_DIR / "mock_eob.txt"
VECTORSTORE_DIR = DATA_DIR / "vectorstore"


# ═══════════════════════════════════════════════════════════════════════════
#  Data Models
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class EOBRecord:
    """Structured representation of an Explanation of Benefits."""
    status: str = ""
    code: str = ""
    service: str = ""
    facility: str = ""
    billed_amount: str = ""
    member_id: str = ""
    date_of_service: str = ""
    provider: str = ""
    allowed_amount: str = ""
    plan_paid: str = ""
    member_responsibility: str = ""
    remark: str = ""
    raw_text: str = ""


@dataclass
class DenialMapping:
    """One entry from the deterministic denial mapping."""
    code: str
    reason: str
    plain_language: str
    sbc_section: str
    action_owner: str
    script: str


@dataclass
class ReconciliationResult:
    """Full output of the reconciliation agent."""
    eob: EOBRecord
    mapping: Optional[DenialMapping]
    sbc_excerpt: str = ""
    reasoning: str = ""
    is_consistent: bool = True
    confidence: str = "HIGH"
    error: Optional[str] = None
    rag_available: bool = False


# ═══════════════════════════════════════════════════════════════════════════
#  EOB Parser
# ═══════════════════════════════════════════════════════════════════════════

class EOBParser:
    """Parses an EOB text file into a structured record."""

    _FIELD_MAP = {
        "CLAIM STATUS": "status",
        "Code": "code",
        "Service": "service",
        "Facility": "facility",
        "Billed Amount": "billed_amount",
        "Member ID": "member_id",
        "Date of Service": "date_of_service",
        "Rendering Provider": "provider",
        "Allowed Amount": "allowed_amount",
        "Plan Paid": "plan_paid",
        "Member Responsibility": "member_responsibility",
        "Remark": "remark",
    }

    @staticmethod
    def parse(text: str) -> EOBRecord:
        record = EOBRecord(raw_text=text)
        for line in text.splitlines():
            line = line.strip()
            for label, attr in EOBParser._FIELD_MAP.items():
                if line.upper().startswith(label.upper()):
                    value = line.split(":", 1)[-1].strip()
                    setattr(record, attr, value)
        return record


# ═══════════════════════════════════════════════════════════════════════════
#  SBC Vector Store (RAG Layer)
# ═══════════════════════════════════════════════════════════════════════════

class SBCRetriever:
    """Retrieves SBC sections — uses FAISS/LangChain when available,
    falls back to deterministic header matching."""

    def __init__(self, sbc_path: Path):
        self.sbc_text = sbc_path.read_text(encoding="utf-8")
        self.sections = self._parse_sections()
        self.vectorstore = None
        self._build_vectorstore()

    # -- section parsing (always available) ----------------------------------
    def _parse_sections(self) -> dict[str, str]:
        sections: dict[str, str] = {}
        current_header = ""
        current_body: list[str] = []
        for line in self.sbc_text.splitlines():
            if line.startswith("## "):
                if current_header:
                    sections[current_header] = "\n".join(current_body).strip()
                current_header = line.lstrip("# ").strip()
                current_body = []
            elif current_header:
                current_body.append(line)
        if current_header:
            sections[current_header] = "\n".join(current_body).strip()
        return sections

    # -- FAISS vectorstore (optional) ----------------------------------------
    def _build_vectorstore(self):
        if not LANGCHAIN_AVAILABLE:
            return
        try:
            if VECTORSTORE_DIR.exists():
                embeddings = HuggingFaceEmbeddings(
                    model_name="all-MiniLM-L6-v2",
                )
                self.vectorstore = FAISS.load_local(
                    str(VECTORSTORE_DIR), embeddings,
                    allow_dangerous_deserialization=True,
                )
                return

            splitter = MarkdownHeaderTextSplitter(
                headers_to_split_on=[("##", "Section")],
            )
            docs = splitter.split_text(self.sbc_text)
            if not docs:
                return

            texts = [d.page_content for d in docs]
            metadatas = [d.metadata for d in docs]

            embeddings = HuggingFaceEmbeddings(
                model_name="all-MiniLM-L6-v2",
            )
            self.vectorstore = FAISS.from_texts(
                texts, embeddings, metadatas=metadatas,
            )
            VECTORSTORE_DIR.mkdir(parents=True, exist_ok=True)
            self.vectorstore.save_local(str(VECTORSTORE_DIR))
        except Exception:
            self.vectorstore = None

    # -- retrieval -----------------------------------------------------------
    def retrieve(self, section_name: str) -> tuple[str, bool]:
        """Return (text, used_rag). Tries RAG first, then deterministic."""
        # Attempt RAG retrieval
        if self.vectorstore is not None:
            try:
                results = self.vectorstore.similarity_search(section_name, k=2)
                for doc in results:
                    header = doc.metadata.get("Section", "")
                    if header.lower() == section_name.lower():
                        return doc.page_content.strip(), True
                # Fallback: return best match
                if results:
                    return results[0].page_content.strip(), True
            except Exception:
                pass

        # Deterministic fallback
        for header, body in self.sections.items():
            if header.lower() == section_name.lower():
                return body, False
        # Fuzzy: substring match
        for header, body in self.sections.items():
            if section_name.lower() in header.lower() or header.lower() in section_name.lower():
                return body, False
        return "", False


# ═══════════════════════════════════════════════════════════════════════════
#  Reconciliation Agent
# ═══════════════════════════════════════════════════════════════════════════

class ReconciliationAgent:
    """Deterministic JSON mapping + RAG reasoning.

    This agent does NOT decide whether a claim is paid. It interprets
    the outcome of the adjudication and translates it for the associate.
    """

    def __init__(
        self,
        denial_map_path: Path = DENIAL_MAP_PATH,
        sbc_path: Path = SBC_PATH,
    ):
        with open(denial_map_path, encoding="utf-8") as f:
            raw = json.load(f)
        self.denial_map: dict[str, DenialMapping] = {
            code: DenialMapping(code=code, **fields)
            for code, fields in raw.items()
        }
        self.retriever = SBCRetriever(sbc_path)

    def reconcile(self, eob: EOBRecord) -> ReconciliationResult:
        """Run the full adjudicator-to-member workflow."""

        # Step 1 — Lookup
        mapping = self.denial_map.get(eob.code)
        if mapping is None:
            return ReconciliationResult(
                eob=eob,
                mapping=None,
                error=(
                    f"Code **{eob.code}** is not present in the denial mapping. "
                    "The system cannot interpret this claim. Please contact "
                    "Member Services for assistance."
                ),
            )

        # Step 2 — RAG Retrieval
        sbc_text, used_rag = self.retriever.retrieve(mapping.sbc_section)
        if not sbc_text:
            sbc_text = "(SBC section not found)"

        # Step 3 — Reasoning
        reasoning, is_consistent = self._reason(eob, mapping, sbc_text)

        return ReconciliationResult(
            eob=eob,
            mapping=mapping,
            sbc_excerpt=sbc_text,
            reasoning=reasoning,
            is_consistent=is_consistent,
            confidence="HIGH" if sbc_text != "(SBC section not found)" else "MEDIUM",
            rag_available=used_rag,
        )

    @staticmethod
    def _reason(
        eob: EOBRecord,
        mapping: DenialMapping,
        sbc_text: str,
    ) -> tuple[str, bool]:
        """Compare EOB data against SBC rules and produce reasoning."""
        facility = eob.facility.strip().lower()
        service = eob.service.strip().lower()
        code = eob.code

        lines: list[str] = []
        is_consistent = True

        if code == "CO-197":
            is_er = "emergency" in facility or "er " in facility
            needs_auth = "prior authorization" in sbc_text.lower()

            if needs_auth and not is_er:
                lines.append(
                    f"The adjudication engine denied this claim under **{code}** "
                    f"(Prior Authorization Absent)."
                )
                lines.append(
                    f'The SBC section **"{mapping.sbc_section}"** states that '
                    f"MRIs and CT scans require Prior Authorization 5 days in advance."
                )
                lines.append(
                    f'The service was performed at **"{eob.facility}"**, which is '
                    f"not an Emergency Room — therefore the ER exception does not apply."
                )
                lines.append(
                    "**Conclusion:** The denial is consistent with plan rules."
                )
            elif is_er:
                lines.append(
                    f"The engine denied for **{code}**, but the service was "
                    f"performed in an Emergency Room setting."
                )
                lines.append(
                    f'The SBC section **"{mapping.sbc_section}"** waives prior '
                    f"authorization for ER-based imaging."
                )
                lines.append(
                    "**Conclusion:** This denial may be INCONSISTENT with plan "
                    "rules. An appeal or system review is recommended."
                )
                is_consistent = False
            else:
                lines.append(
                    f"Denial code **{code}** applied. SBC section "
                    f'**"{mapping.sbc_section}"** reviewed. Denial appears '
                    f"consistent with plan guidelines."
                )

        elif code == "CO-16":
            lines.append(
                f"The adjudication engine denied this claim under **{code}** "
                f"(Missing Medical Records)."
            )
            lines.append(
                f'The SBC section **"{mapping.sbc_section}"** requires providers '
                f"to submit clinical documentation within 30 days of request."
            )
            lines.append(
                "**Conclusion:** The denial is consistent with plan rules. "
                "The provider must resubmit with the required records."
            )

        elif code in ("CO-4", "CO-29"):
            lines.append(
                f"The adjudication engine denied this claim under **{code}** "
                f"({mapping.reason})."
            )
            lines.append(
                f'The SBC section **"{mapping.sbc_section}"** outlines the '
                f"filing and coding requirements for claims."
            )
            lines.append(
                "**Conclusion:** The denial is consistent with plan rules."
            )

        elif code.startswith("PR-"):
            lines.append(
                f"The adjudication engine applied **{code}** "
                f"({mapping.reason}) to this claim."
            )
            lines.append(
                f'The SBC section **"{mapping.sbc_section}"** defines the '
                f"member's cost-sharing obligations."
            )
            lines.append(
                "**Conclusion:** This is a member cost-sharing responsibility, "
                "not a claim denial. The amount is consistent with plan rules."
            )

        else:
            lines.append(
                f"Denial code **{code}** applied. SBC section "
                f'**"{mapping.sbc_section}"** reviewed. Denial appears '
                f"consistent with plan guidelines."
            )

        return "\n\n".join(lines), is_consistent


# ═══════════════════════════════════════════════════════════════════════════
#  Streamlit UI
# ═══════════════════════════════════════════════════════════════════════════

def _inject_css():
    st.markdown(
        """
        <style>
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,500;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap');

        :root {
            --bg-primary: #0B1120;
            --bg-card: #131B2E;
            --bg-card-alt: #182338;
            --border: #1E2D4A;
            --text-primary: #E8EDF5;
            --text-secondary: #8899B4;
            --accent-blue: #3B82F6;
            --accent-teal: #14B8A6;
            --accent-amber: #F59E0B;
            --accent-rose: #F43F5E;
            --accent-emerald: #10B981;
        }

        .stApp {
            font-family: 'DM Sans', sans-serif;
        }

        .block-container {
            max-width: 1100px !important;
            padding-top: 2rem !important;
        }

        .system-banner {
            background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%);
            border: 1px solid #334155;
            border-left: 4px solid var(--accent-amber);
            border-radius: 8px;
            padding: 12px 18px;
            margin-bottom: 24px;
            font-size: 13px;
            color: #94A3B8;
            line-height: 1.5;
        }
        .system-banner strong { color: #F59E0B; }

        .dashboard-header {
            background: linear-gradient(135deg, #1E3A5F 0%, #0F172A 60%, #14283E 100%);
            border: 1px solid #1E3A5F;
            border-radius: 12px;
            padding: 28px 32px;
            margin-bottom: 28px;
        }
        .dashboard-header h1 {
            font-size: 28px;
            font-weight: 700;
            color: #F1F5F9;
            margin: 0 0 4px 0;
            letter-spacing: -0.5px;
        }
        .dashboard-header .subtitle {
            font-size: 14px;
            color: #64748B;
            margin: 0;
        }

        .metric-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 18px 20px;
        }
        .metric-card .label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1.2px;
            color: var(--text-secondary);
            margin-bottom: 6px;
        }
        .metric-card .value {
            font-size: 22px;
            font-weight: 700;
            color: var(--text-primary);
        }

        .section-label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: #64748B;
            margin-bottom: 10px;
            font-weight: 500;
        }

        .why-card {
            background: linear-gradient(135deg, #0F1D32 0%, #131B2E 100%);
            border: 1px solid #1E3A5F;
            border-radius: 12px;
            padding: 24px 28px;
            margin-bottom: 20px;
        }
        .why-card h3 {
            color: #3B82F6;
            font-size: 16px;
            font-weight: 700;
            margin: 0 0 12px 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .why-card p {
            color: #CBD5E1;
            font-size: 15px;
            line-height: 1.7;
            margin: 0;
        }

        .how-card {
            background: linear-gradient(135deg, #0D1F17 0%, #131B2E 100%);
            border: 1px solid #14532D;
            border-radius: 12px;
            padding: 24px 28px;
            margin-bottom: 20px;
        }
        .how-card h3 {
            color: #10B981;
            font-size: 16px;
            font-weight: 700;
            margin: 0 0 8px 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .how-card .owner-badge {
            display: inline-block;
            background: #14532D;
            color: #6EE7B7;
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            padding: 3px 10px;
            border-radius: 20px;
            margin-bottom: 12px;
        }
        .how-card .script-box {
            background: #0A0F1A;
            border: 1px solid #1E2D4A;
            border-radius: 8px;
            padding: 16px 20px;
            font-family: 'DM Sans', sans-serif;
            font-size: 14px;
            color: #E2E8F0;
            line-height: 1.65;
            font-style: italic;
        }

        .reasoning-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 24px 28px;
        }
        .reasoning-card h3 {
            color: var(--accent-amber);
            font-size: 16px;
            font-weight: 700;
            margin: 0 0 14px 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .consistency-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 5px 14px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.5px;
        }
        .consistent {
            background: #052E16;
            color: #6EE7B7;
            border: 1px solid #14532D;
        }
        .inconsistent {
            background: #3B0712;
            color: #FDA4AF;
            border: 1px solid #881337;
        }

        .sbc-excerpt {
            background: #0A0F1A;
            border: 1px solid #1E2D4A;
            border-left: 3px solid #3B82F6;
            border-radius: 6px;
            padding: 14px 18px;
            font-size: 13px;
            color: #94A3B8;
            line-height: 1.6;
            margin-top: 14px;
        }
        .sbc-excerpt .sbc-label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 1.2px;
            color: #3B82F6;
            margin-bottom: 6px;
            font-weight: 600;
        }

        .error-card {
            background: linear-gradient(135deg, #1C0B0B 0%, #1A0A0A 100%);
            border: 1px solid #7F1D1D;
            border-radius: 12px;
            padding: 24px 28px;
        }
        .error-card h3 {
            color: #F43F5E;
            font-size: 16px;
            font-weight: 700;
            margin: 0 0 10px 0;
        }
        .error-card p {
            color: #FCA5A5;
            font-size: 14px;
            line-height: 1.6;
            margin: 0;
        }

        .rag-badge {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            font-size: 11px;
            color: #64748B;
            margin-top: 8px;
        }
        .rag-badge .dot {
            width: 6px; height: 6px;
            border-radius: 50%;
            display: inline-block;
        }
        .rag-on { background: #10B981; }
        .rag-off { background: #64748B; }

        div[data-testid="stFileUploader"] {
            border: 1px dashed #334155 !important;
            border-radius: 10px !important;
            padding: 8px !important;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def _render_header():
    st.markdown(
        """
        <div class="dashboard-header">
            <h1>⚕ Member 360 — Advocacy Dashboard</h1>
            <p class="subtitle">Agentic Experience Layer &nbsp;·&nbsp; Claim Interpretation Prototype</p>
        </div>
        """,
        unsafe_allow_html=True,
    )
    st.markdown(
        """
        <div class="system-banner">
            <strong> ROLE BOUNDARY</strong> &nbsp;—&nbsp;
            This is an interpretation layer. Final financial determinations
            are held by the <strong>Adjudication System of Record</strong>.
            This tool does not decide if a claim is paid; it interprets
            the outcome and translates it for the associate.
        </div>
        """,
        unsafe_allow_html=True,
    )


def _render_eob_metrics(eob: EOBRecord):
    st.markdown('<p class="section-label">Claim Snapshot</p>', unsafe_allow_html=True)
    cols = st.columns(4)
    metrics = [
        ("Status", eob.status or "—"),
        ("Denial Code", eob.code or "—"),
        ("Service", eob.service or "—"),
        ("Billed Amount", eob.billed_amount or "—"),
    ]
    for col, (label, value) in zip(cols, metrics):
        with col:
            st.markdown(
                f"""
                <div class="metric-card">
                    <div class="label">{label}</div>
                    <div class="value">{value}</div>
                </div>
                """,
                unsafe_allow_html=True,
            )

    st.markdown("<div style='height:8px'></div>", unsafe_allow_html=True)

    cols2 = st.columns(4)
    extra = [
        ("Facility", eob.facility or "—"),
        ("Date of Service", eob.date_of_service or "—"),
        ("Member ID", eob.member_id or "—"),
        ("Member Owes", eob.member_responsibility or "—"),
    ]
    for col, (label, value) in zip(cols2, extra):
        with col:
            st.markdown(
                f"""
                <div class="metric-card">
                    <div class="label">{label}</div>
                    <div class="value" style="font-size:16px">{value}</div>
                </div>
                """,
                unsafe_allow_html=True,
            )


def _render_result(result: ReconciliationResult):
    if result.error:
        st.markdown(
            f"""
            <div class="error-card">
                <h3>⊘ Unable to Interpret</h3>
                <p>{result.error}</p>
            </div>
            """,
            unsafe_allow_html=True,
        )
        return

    mapping = result.mapping
    assert mapping is not None

    # -- THE WHY --------------------------------------------------------
    st.markdown('<p class="section-label">The Why — Plain-English Explanation</p>', unsafe_allow_html=True)
    st.markdown(
        f"""
        <div class="why-card">
            <h3> {mapping.reason}</h3>
            <p>{mapping.plain_language}</p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # -- THE HOW --------------------------------------------------------
    st.markdown('<p class="section-label">The How — Your Next Step</p>', unsafe_allow_html=True)
    script_filled = mapping.script.replace(
        "[ID]", result.eob.member_id or "[ID]"
    ).replace(
        "[Date]", result.eob.date_of_service or "[Date]"
    )
    st.markdown(
        f"""
        <div class="how-card">
            <h3> Recommended Action</h3>
            <div class="owner-badge">Action Owner: {mapping.action_owner}</div>
            <div class="script-box">"{script_filled}"</div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # -- REASONING -------------------------------------------------------
    consistency_class = "consistent" if result.is_consistent else "inconsistent"
    consistency_label = " Consistent with Plan Rules" if result.is_consistent else " Potential Inconsistency Detected"

    rag_dot_class = "rag-on" if result.rag_available else "rag-off"
    rag_label = "RAG retrieval active" if result.rag_available else "Deterministic retrieval (RAG unavailable)"

    st.markdown('<p class="section-label">Reconciliation Reasoning</p>', unsafe_allow_html=True)

    reasoning_html = result.reasoning.replace("\n\n", "<br><br>")
    # Convert **text** to <strong>text</strong>
    reasoning_html = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", reasoning_html)

    st.markdown(
        f"""
        <div class="reasoning-card">
            <h3>⚖ Plan Rule Analysis</h3>
            <span class="consistency-badge {consistency_class}">{consistency_label}</span>
            <div style="margin-top:16px; color:#CBD5E1; font-size:14px; line-height:1.75;">
                {reasoning_html}
            </div>
            <div class="sbc-excerpt">
                <div class="sbc-label">SBC Source: § {mapping.sbc_section}</div>
                {result.sbc_excerpt}
            </div>
            <div class="rag-badge">
                <span class="dot {rag_dot_class}"></span>
                {rag_label} &nbsp;·&nbsp; Confidence: {result.confidence}
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )


# ═══════════════════════════════════════════════════════════════════════════
#  Main
# ═══════════════════════════════════════════════════════════════════════════

def main():
    st.set_page_config(
        page_title="Member 360 — Advocacy Dashboard",
        page_icon="⚕",
        layout="wide",
    )
    _inject_css()
    _render_header()

    # -- Initialize Agent ------------------------------------------------
    agent = ReconciliationAgent()

    # -- Sidebar: Data Source Selection ----------------------------------
    with st.sidebar:
        st.markdown("### Data Source")
        source = st.radio(
            "Choose EOB input:",
            ["Default (mock_eob.txt)", "Upload EOB file", "Paste EOB text"],
            label_visibility="collapsed",
        )

        eob_text = ""

        if source == "Default (mock_eob.txt)":
            eob_text = EOB_PATH.read_text(encoding="utf-8")
            st.code(eob_text, language="text")

        elif source == "Upload EOB file":
            uploaded = st.file_uploader("Upload an EOB (.txt)", type=["txt"])
            if uploaded is not None:
                eob_text = uploaded.getvalue().decode("utf-8")
                st.code(eob_text, language="text")

        elif source == "Paste EOB text":
            eob_text = st.text_area(
                "Paste EOB content:",
                height=220,
                placeholder="CLAIM STATUS: DENIED\nCode: CO-197\n...",
            )

        st.markdown("---")
        st.markdown("### Recognized Codes")
        for code, m in agent.denial_map.items():
            st.markdown(f"**`{code}`** — {m.reason}")

        st.markdown("---")
        st.markdown(
            "<div style='font-size:11px; color:#64748B;'>"
            "Member 360 Prototype v0.1<br>"
            "Agentic Experience Layer<br>"
            "LangChain + FAISS RAG Pipeline"
            "</div>",
            unsafe_allow_html=True,
        )

    # -- Process ----------------------------------------------------------
    if eob_text.strip():
        eob = EOBParser.parse(eob_text)
        _render_eob_metrics(eob)
        st.markdown("<div style='height:24px'></div>", unsafe_allow_html=True)

        with st.spinner("Running reconciliation agent..."):
            result = agent.reconcile(eob)

        _render_result(result)
    else:
        st.info("Select or provide an EOB in the sidebar to begin analysis.")


if __name__ == "__main__":
    main()
