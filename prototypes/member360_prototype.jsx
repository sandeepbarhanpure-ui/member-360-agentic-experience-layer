const { useState, useEffect, useRef } = React;

// ═══════════════════════════════════════════════════════════════
//  DATA LAYER — mirrors the Python data files exactly
// ═══════════════════════════════════════════════════════════════

const DENIAL_MAP = {
  "CO-197": {
    reason: "Prior Authorization Absent",
    plain_language: "The provider didn't get the required 'OK' from the plan before the service.",
    sbc_section: "Advanced Imaging",
    action_owner: "Provider",
    script: "I'm calling about claim [ID]. My plan denied this because a prior authorization was not filed. As an in-network provider, please submit a retroactive authorization to resolve this.",
  },
  "CO-16": {
    reason: "Missing Medical Records",
    plain_language: "The insurance company needs more details from your doctor to see why this was necessary.",
    sbc_section: "Claims Procedures",
    action_owner: "Provider",
    script: "My claim was denied for missing information. Please resubmit the claim with the clinical notes and office visit records for [Date].",
  },
  "CO-4": {
    reason: "Procedure Modifier Inconsistency",
    plain_language: "The billing code used by the provider doesn't match the service that was performed.",
    sbc_section: "Claims Procedures",
    action_owner: "Provider",
    script: "I'm calling about claim [ID]. The denial code indicates a modifier issue. Please review the procedure and modifier codes, correct any errors, and resubmit.",
  },
  "CO-29": {
    reason: "Filing Deadline Exceeded",
    plain_language: "The claim was submitted too late. Providers must file within the plan's deadline.",
    sbc_section: "Claims Procedures",
    action_owner: "Provider",
    script: "My claim was denied for late filing. Please check your records for the original submission date and file an appeal with proof of timely filing if applicable.",
  },
  "PR-1": {
    reason: "Member Deductible Applies",
    plain_language: "This amount is your responsibility because you haven't met your annual deductible yet.",
    sbc_section: "Cost Sharing",
    action_owner: "Member",
    script: "No provider action needed. This amount applies to your annual deductible. Check your plan's Explanation of Benefits for your remaining deductible balance.",
  },
  "PR-2": {
    reason: "Coinsurance Applies",
    plain_language: "After the plan paid its share, this is the percentage you owe based on your coinsurance rate.",
    sbc_section: "Cost Sharing",
    action_owner: "Member",
    script: "No provider action needed. This is your coinsurance portion. Refer to your SBC under Cost Sharing for your coinsurance percentage for this service category.",
  },
};

const SBC_SECTIONS = {
  "Advanced Imaging":
    "All MRIs and CT scans require Prior Authorization 5 days in advance. Exception: This is waived if performed in an Emergency Room. The authorization must reference a valid ICD-10 diagnosis code. Retroactive authorizations are accepted within 72 hours of the service date for urgent situations only.",
  "Claims Procedures":
    "Providers must submit all requested clinical documentation within 30 days of the request or the claim will be closed. Initial claims must be filed within 90 days of the date of service. Appeals for denied claims must be submitted within 180 days of the denial notice. All claims must include the rendering provider's NPI and valid CPT/HCPCS codes.",
  "Cost Sharing":
    "The annual deductible for in-network services is $1,500 for individual coverage and $3,000 for family coverage. After the deductible is met, the plan pays 80% coinsurance for most in-network services. The annual out-of-pocket maximum is $4,500 individual / $9,000 family, after which the plan pays 100%.",
};

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

const SAMPLE_EOBS = {
  "CO-197 — Prior Auth (Default)": DEFAULT_EOB,
  "CO-16 — Missing Records": `EXPLANATION OF BENEFITS
=======================
Plan: 2026 Associate Health Plan
Member ID: WMT-553012-B
Date of Service: 2026-02-18

CLAIM STATUS: DENIED

Code: CO-16
Service: Physical Therapy Evaluation
Facility: RehabFirst Clinic
Rendering Provider: Dr. Sarah Chen, NPI 9876543210
Billed Amount: $385.00
Allowed Amount: $0.00
Plan Paid: $0.00
Member Responsibility: $385.00

Remark: Additional clinical documentation required.`,
  "PR-1 — Deductible Applies": `EXPLANATION OF BENEFITS
=======================
Plan: 2026 Associate Health Plan
Member ID: WMT-770188-C
Date of Service: 2026-01-22

CLAIM STATUS: PROCESSED

Code: PR-1
Service: Diagnostic Blood Panel
Facility: LabCorp Central
Rendering Provider: Dr. Michael Torres, NPI 5551234567
Billed Amount: $290.00
Allowed Amount: $245.00
Plan Paid: $0.00
Member Responsibility: $245.00

Remark: Amount applied to annual deductible.`,
  "CO-999 — Unknown Code": `EXPLANATION OF BENEFITS
=======================
Plan: 2026 Associate Health Plan
Member ID: WMT-400221-D
Date of Service: 2026-03-05

CLAIM STATUS: DENIED

Code: CO-999
Service: Lab Work
Facility: Quest Diagnostics
Billed Amount: $450.00
Allowed Amount: $0.00
Plan Paid: $0.00
Member Responsibility: $450.00

Remark: See denial code for details.`,
};

// ═══════════════════════════════════════════════════════════════
//  RECONCILIATION AGENT — mirrors the Python class
// ═══════════════════════════════════════════════════════════════

function parseEOB(text) {
  const fields = {
    status: "", code: "", service: "", facility: "",
    billed_amount: "", member_id: "", date_of_service: "",
    provider: "", allowed_amount: "", plan_paid: "",
    member_responsibility: "", remark: "", raw_text: text,
  };
  const map = {
    "CLAIM STATUS": "status", "Code": "code", "Service": "service",
    "Facility": "facility", "Billed Amount": "billed_amount",
    "Member ID": "member_id", "Date of Service": "date_of_service",
    "Rendering Provider": "provider", "Allowed Amount": "allowed_amount",
    "Plan Paid": "plan_paid", "Member Responsibility": "member_responsibility",
    "Remark": "remark",
  };
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    for (const [label, attr] of Object.entries(map)) {
      if (trimmed.toUpperCase().startsWith(label.toUpperCase())) {
        const val = trimmed.split(":").slice(1).join(":").trim();
        fields[attr] = val;
      }
    }
  }
  return fields;
}

function reconcile(eob) {
  const mapping = DENIAL_MAP[eob.code];
  if (!mapping) {
    return {
      eob, mapping: null,
      error: `Code ${eob.code} is not present in the denial mapping. The system cannot interpret this claim. Please contact Member Services for assistance.`,
    };
  }

  const sbcText = SBC_SECTIONS[mapping.sbc_section] || "(SBC section not found)";
  let reasoning = [];
  let isConsistent = true;

  if (eob.code === "CO-197") {
    const facility = eob.facility.toLowerCase();
    const isER = facility.includes("emergency") || facility.includes("er ");
    if (!isER) {
      reasoning = [
        `The adjudication engine denied this claim under ${eob.code} (Prior Authorization Absent).`,
        `The SBC section "${mapping.sbc_section}" states that MRIs and CT scans require Prior Authorization 5 days in advance.`,
        `The service was performed at "${eob.facility}", which is not an Emergency Room — therefore the ER exception does not apply.`,
        `Conclusion: The denial is consistent with plan rules.`,
      ];
    } else {
      reasoning = [
        `The engine denied for ${eob.code}, but the service was performed in an Emergency Room setting.`,
        `The SBC section "${mapping.sbc_section}" waives prior authorization for ER-based imaging.`,
        `Conclusion: This denial may be INCONSISTENT with plan rules. An appeal or system review is recommended.`,
      ];
      isConsistent = false;
    }
  } else if (eob.code === "CO-16") {
    reasoning = [
      `The adjudication engine denied this claim under ${eob.code} (Missing Medical Records).`,
      `The SBC section "${mapping.sbc_section}" requires providers to submit clinical documentation within 30 days of request.`,
      `Conclusion: The denial is consistent with plan rules. The provider must resubmit with the required records.`,
    ];
  } else if (eob.code === "CO-4" || eob.code === "CO-29") {
    reasoning = [
      `The adjudication engine denied this claim under ${eob.code} (${mapping.reason}).`,
      `The SBC section "${mapping.sbc_section}" outlines the filing and coding requirements for claims.`,
      `Conclusion: The denial is consistent with plan rules.`,
    ];
  } else if (eob.code.startsWith("PR-")) {
    reasoning = [
      `The adjudication engine applied ${eob.code} (${mapping.reason}) to this claim.`,
      `The SBC section "${mapping.sbc_section}" defines the member's cost-sharing obligations.`,
      `Conclusion: This is a member cost-sharing responsibility, not a claim denial. The amount is consistent with plan rules.`,
    ];
  }

  return {
    eob, mapping, sbcText, reasoning, isConsistent,
    confidence: sbcText !== "(SBC section not found)" ? "HIGH" : "MEDIUM",
  };
}

// ═══════════════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════════════

const FONT_LINK = "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap";

const palette = {
  bg: "#060A13", bgCard: "#0C1322", bgCardAlt: "#111B2E",
  border: "#1A2742", borderHover: "#243656",
  textPrimary: "#E4EAF4", textSecondary: "#6B7FA3", textMuted: "#3D506E",
  blue: "#3B82F6", blueGlow: "rgba(59,130,246,0.12)",
  teal: "#14B8A6", tealGlow: "rgba(20,184,166,0.1)",
  amber: "#F59E0B", amberGlow: "rgba(245,158,11,0.1)",
  rose: "#F43F5E", roseGlow: "rgba(244,63,94,0.1)",
  emerald: "#10B981", emeraldGlow: "rgba(16,185,129,0.1)",
};

// ═══════════════════════════════════════════════════════════════
//  COMPONENTS
// ═══════════════════════════════════════════════════════════════

function FadeIn({ children, delay = 0, style = {} }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(12px)",
      transition: "opacity 0.5s ease, transform 0.5s ease",
      ...style,
    }}>
      {children}
    </div>
  );
}

function MetricCard({ label, value, accent, delay = 0 }) {
  const [hovered, setHovered] = useState(false);
  return (
    <FadeIn delay={delay}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered ? palette.bgCardAlt : palette.bgCard,
          border: `1px solid ${hovered ? palette.borderHover : palette.border}`,
          borderRadius: 10, padding: "16px 18px",
          transition: "all 0.25s ease",
          cursor: "default",
          borderTop: accent ? `2px solid ${accent}` : undefined,
        }}
      >
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10, textTransform: "uppercase", letterSpacing: 1.6,
          color: accent || palette.textMuted, marginBottom: 7, fontWeight: 500,
        }}>
          {label}
        </div>
        <div style={{
          fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 700,
          color: palette.textPrimary, lineHeight: 1.2,
        }}>
          {value || "—"}
        </div>
      </div>
    </FadeIn>
  );
}

function SectionLabel({ children, delay = 0 }) {
  return (
    <FadeIn delay={delay}>
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 10, textTransform: "uppercase", letterSpacing: 2,
        color: palette.textMuted, marginBottom: 12, marginTop: 28, fontWeight: 500,
      }}>
        {children}
      </div>
    </FadeIn>
  );
}

function WhyCard({ mapping, delay = 0 }) {
  return (
    <FadeIn delay={delay}>
      <div style={{
        background: `linear-gradient(135deg, ${palette.blueGlow} 0%, ${palette.bgCard} 100%)`,
        border: `1px solid #1A3058`, borderRadius: 12,
        padding: "24px 28px", marginBottom: 16,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10, marginBottom: 14,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "rgba(59,130,246,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16,
          }}>💡</div>
          <span style={{
            fontFamily: "'Outfit', sans-serif", fontSize: 17, fontWeight: 700,
            color: palette.blue,
          }}>
            {mapping.reason}
          </span>
        </div>
        <p style={{
          fontFamily: "'Outfit', sans-serif", fontSize: 15, lineHeight: 1.75,
          color: "#B8C9E0", margin: 0,
        }}>
          {mapping.plain_language}
        </p>
      </div>
    </FadeIn>
  );
}

function HowCard({ mapping, eob, delay = 0 }) {
  const [copied, setCopied] = useState(false);
  const script = mapping.script
    .replace("[ID]", eob.member_id || "[ID]")
    .replace("[Date]", eob.date_of_service || "[Date]");

  const handleCopy = () => {
    try { navigator.clipboard.writeText(script); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const ownerColor = mapping.action_owner === "Provider"
    ? { bg: "#052E16", text: "#6EE7B7", border: "#14532D" }
    : { bg: "#1E1B05", text: "#FCD34D", border: "#713F12" };

  return (
    <FadeIn delay={delay}>
      <div style={{
        background: `linear-gradient(135deg, ${palette.emeraldGlow} 0%, ${palette.bgCard} 100%)`,
        border: `1px solid #14352A`, borderRadius: 12,
        padding: "24px 28px", marginBottom: 16,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10, marginBottom: 10,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "rgba(16,185,129,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16,
          }}>📞</div>
          <span style={{
            fontFamily: "'Outfit', sans-serif", fontSize: 17, fontWeight: 700,
            color: palette.emerald,
          }}>
            Recommended Action
          </span>
        </div>

        <span style={{
          display: "inline-block",
          background: ownerColor.bg, color: ownerColor.text,
          border: `1px solid ${ownerColor.border}`,
          fontSize: 10, fontWeight: 600, letterSpacing: 1,
          textTransform: "uppercase", padding: "3px 12px",
          borderRadius: 20, marginBottom: 14, fontFamily: "'IBM Plex Mono', monospace",
        }}>
          Action Owner: {mapping.action_owner}
        </span>

        <div style={{
          background: "#060A13", border: `1px solid ${palette.border}`,
          borderRadius: 8, padding: "16px 20px", position: "relative",
        }}>
          <p style={{
            fontFamily: "'Outfit', sans-serif", fontSize: 14,
            color: "#D1DAE8", lineHeight: 1.7, fontStyle: "italic", margin: 0,
          }}>
            "{script}"
          </p>
          <button
            onClick={handleCopy}
            style={{
              position: "absolute", top: 10, right: 10,
              background: copied ? palette.emerald : "rgba(255,255,255,0.06)",
              border: `1px solid ${copied ? palette.emerald : palette.border}`,
              borderRadius: 6, padding: "4px 10px",
              color: copied ? "#fff" : palette.textSecondary,
              fontSize: 11, fontFamily: "'IBM Plex Mono', monospace",
              cursor: "pointer", transition: "all 0.2s ease",
            }}
          >
            {copied ? " Copied" : "Copy"}
          </button>
        </div>
      </div>
    </FadeIn>
  );
}

function ReasoningCard({ result, delay = 0 }) {
  const { reasoning, isConsistent, sbcText, mapping, confidence } = result;
  return (
    <FadeIn delay={delay}>
      <div style={{
        background: palette.bgCard, border: `1px solid ${palette.border}`,
        borderRadius: 12, padding: "24px 28px",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10, marginBottom: 16,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: palette.amberGlow,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16,
          }}>⚖</div>
          <span style={{
            fontFamily: "'Outfit', sans-serif", fontSize: 17, fontWeight: 700,
            color: palette.amber,
          }}>
            Plan Rule Analysis
          </span>
        </div>

        <span style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "5px 14px", borderRadius: 20,
          fontSize: 12, fontWeight: 600, letterSpacing: 0.5,
          fontFamily: "'IBM Plex Mono', monospace",
          ...(isConsistent
            ? { background: "#052E16", color: "#6EE7B7", border: "1px solid #14532D" }
            : { background: "#3B0712", color: "#FDA4AF", border: "1px solid #881337" }),
        }}>
          {isConsistent ? " Consistent with Plan Rules" : " Potential Inconsistency Detected"}
        </span>

        <div style={{ marginTop: 18 }}>
          {reasoning.map((line, i) => {
            const isConclusion = line.startsWith("Conclusion:");
            const formatted = line.replace(/^Conclusion:\s*/, "");
            return (
              <p key={i} style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 14, lineHeight: 1.75,
                color: isConclusion ? palette.textPrimary : "#A3B5D0",
                fontWeight: isConclusion ? 600 : 400,
                margin: "0 0 10px 0",
              }}>
                {isConclusion && <span style={{ color: palette.amber }}>↳ Conclusion: </span>}
                {isConclusion ? formatted : line}
              </p>
            );
          })}
        </div>

        {/* SBC Excerpt */}
        <div style={{
          background: "#060A13", border: `1px solid ${palette.border}`,
          borderLeft: `3px solid ${palette.blue}`, borderRadius: 6,
          padding: "14px 18px", marginTop: 18,
        }}>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10, textTransform: "uppercase", letterSpacing: 1.4,
            color: palette.blue, marginBottom: 8, fontWeight: 600,
          }}>
            SBC Source: § {mapping.sbc_section}
          </div>
          <p style={{
            fontFamily: "'Outfit', sans-serif", fontSize: 13,
            color: palette.textSecondary, lineHeight: 1.6, margin: 0,
          }}>
            {sbcText}
          </p>
        </div>

        {/* RAG badge */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          marginTop: 14, fontSize: 11, color: palette.textMuted,
          fontFamily: "'IBM Plex Mono', monospace",
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: palette.emerald, display: "inline-block",
          }} />
          RAG retrieval active &nbsp;·&nbsp; Confidence: {confidence}
        </div>
      </div>
    </FadeIn>
  );
}

function ErrorCard({ error, delay = 0 }) {
  return (
    <FadeIn delay={delay}>
      <div style={{
        background: `linear-gradient(135deg, ${palette.roseGlow} 0%, ${palette.bgCard} 100%)`,
        border: `1px solid #5C1328`, borderRadius: 12,
        padding: "28px 32px",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10, marginBottom: 14,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: "rgba(244,63,94,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18,
          }}>⊘</div>
          <span style={{
            fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 700,
            color: palette.rose,
          }}>
            Unable to Interpret
          </span>
        </div>
        <p style={{
          fontFamily: "'Outfit', sans-serif", fontSize: 15, lineHeight: 1.7,
          color: "#FECDD3", margin: 0,
        }}>
          {error}
        </p>
      </div>
    </FadeIn>
  );
}

// ═══════════════════════════════════════════════════════════════
//  SIDEBAR
// ═══════════════════════════════════════════════════════════════

function Sidebar({ selectedEOB, setSelectedEOB, customEOB, setCustomEOB, inputMode, setInputMode }) {
  return (
    <div style={{
      width: 320, minWidth: 320, background: "#080E1A",
      borderRight: `1px solid ${palette.border}`,
      padding: "24px 20px", overflowY: "auto",
      display: "flex", flexDirection: "column", gap: 20,
    }}>
      {/* Logo area */}
      <div style={{ marginBottom: 4 }}>
        <div style={{
          fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 700,
          color: palette.textPrimary, display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{
            width: 28, height: 28, borderRadius: 6,
            background: "linear-gradient(135deg, #3B82F6 0%, #14B8A6 100%)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontSize: 14,
          }}>⚕</span>
          Member 360
        </div>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10, color: palette.textMuted, marginTop: 4,
          letterSpacing: 0.8,
        }}>
          Agentic Experience Layer v0.1
        </div>
      </div>

      <div style={{ height: 1, background: palette.border }} />

      {/* Data Source */}
      <div>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10, textTransform: "uppercase", letterSpacing: 1.6,
          color: palette.textMuted, marginBottom: 10, fontWeight: 500,
        }}>
          Data Source
        </div>
        {["sample", "custom"].map((mode) => (
          <label key={mode} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 10px", borderRadius: 6,
            background: inputMode === mode ? "rgba(59,130,246,0.08)" : "transparent",
            border: `1px solid ${inputMode === mode ? "#1A3058" : "transparent"}`,
            cursor: "pointer", marginBottom: 4, transition: "all 0.2s ease",
          }}>
            <input
              type="radio" name="mode" checked={inputMode === mode}
              onChange={() => setInputMode(mode)}
              style={{ accentColor: palette.blue }}
            />
            <span style={{
              fontFamily: "'Outfit', sans-serif", fontSize: 13,
              color: inputMode === mode ? palette.textPrimary : palette.textSecondary,
            }}>
              {mode === "sample" ? "Sample EOBs" : "Paste Custom EOB"}
            </span>
          </label>
        ))}
      </div>

      {inputMode === "sample" ? (
        <div>
          {Object.keys(SAMPLE_EOBS).map((name) => (
            <button
              key={name}
              onClick={() => setSelectedEOB(name)}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "10px 12px", borderRadius: 6, marginBottom: 4,
                background: selectedEOB === name ? "rgba(59,130,246,0.1)" : "transparent",
                border: `1px solid ${selectedEOB === name ? "#1A3058" : "transparent"}`,
                color: selectedEOB === name ? palette.textPrimary : palette.textSecondary,
                fontFamily: "'Outfit', sans-serif", fontSize: 13,
                cursor: "pointer", transition: "all 0.2s ease",
              }}
            >
              {name}
            </button>
          ))}
        </div>
      ) : (
        <textarea
          value={customEOB}
          onChange={(e) => setCustomEOB(e.target.value)}
          placeholder={"CLAIM STATUS: DENIED\nCode: CO-197\nService: ...\nFacility: ...\nBilled Amount: ..."}
          style={{
            width: "100%", height: 200, resize: "vertical",
            background: palette.bgCard, border: `1px solid ${palette.border}`,
            borderRadius: 8, padding: 12,
            color: palette.textPrimary, fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12, lineHeight: 1.6, outline: "none",
          }}
        />
      )}

      <div style={{ height: 1, background: palette.border }} />

      {/* Recognized Codes */}
      <div>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10, textTransform: "uppercase", letterSpacing: 1.6,
          color: palette.textMuted, marginBottom: 10, fontWeight: 500,
        }}>
          Recognized Codes
        </div>
        {Object.entries(DENIAL_MAP).map(([code, m]) => (
          <div key={code} style={{
            display: "flex", alignItems: "baseline", gap: 8,
            marginBottom: 6,
          }}>
            <code style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11, color: palette.blue, fontWeight: 500,
              background: "rgba(59,130,246,0.08)",
              padding: "1px 6px", borderRadius: 4,
            }}>
              {code}
            </code>
            <span style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 12, color: palette.textSecondary,
            }}>
              {m.reason}
            </span>
          </div>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 10, color: palette.textMuted, lineHeight: 1.7,
      }}>
        Member 360 Prototype v0.1<br />
        LangChain + FAISS RAG Pipeline<br />
        Streamlit Preview
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════════════════════════════════

function Member360Dashboard() {
  const [selectedEOB, setSelectedEOB] = useState("CO-197 — Prior Auth (Default)");
  const [customEOB, setCustomEOB] = useState("");
  const [inputMode, setInputMode] = useState("sample");
  const [result, setResult] = useState(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    const text = inputMode === "sample" ? SAMPLE_EOBS[selectedEOB] : customEOB;
    if (text.trim()) {
      const eob = parseEOB(text);
      const r = reconcile(eob);
      setResult(r);
      setKey((k) => k + 1);
    } else {
      setResult(null);
    }
  }, [selectedEOB, customEOB, inputMode]);

  return (
    <>
      <link href={FONT_LINK} rel="stylesheet" />
      <div style={{
        display: "flex", height: "100vh", width: "100%",
        background: palette.bg, color: palette.textPrimary,
        fontFamily: "'Outfit', sans-serif", overflow: "hidden",
      }}>
        <Sidebar {...{ selectedEOB, setSelectedEOB, customEOB, setCustomEOB, inputMode, setInputMode }} />

        {/* Main Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 40px 60px" }}>
          <div style={{ maxWidth: 960, margin: "0 auto" }} key={key}>
            {/* Header */}
            <FadeIn delay={0}>
              <div style={{
                background: "linear-gradient(135deg, #0F1E38 0%, #0A1020 60%, #0E1A2E 100%)",
                border: `1px solid #1A3058`, borderRadius: 14,
                padding: "28px 32px", marginBottom: 20,
                position: "relative", overflow: "hidden",
              }}>
                <div style={{
                  position: "absolute", top: -40, right: -40,
                  width: 180, height: 180, borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)",
                }} />
                <h1 style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 26, fontWeight: 800, color: "#F1F5F9",
                  margin: "0 0 4px 0", letterSpacing: -0.5,
                }}>
                  ⚕ Member 360 — Advocacy Dashboard
                </h1>
                <p style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 12, color: "#4A6085", margin: 0,
                }}>
                  Agentic Experience Layer &nbsp;·&nbsp; Claim Interpretation Prototype
                </p>
              </div>
            </FadeIn>

            {/* Role Boundary Banner */}
            <FadeIn delay={60}>
              <div style={{
                background: "linear-gradient(135deg, #1A1708 0%, #0D0F18 100%)",
                border: `1px solid #3D2E08`,
                borderLeft: `4px solid ${palette.amber}`,
                borderRadius: 8, padding: "12px 18px", marginBottom: 28,
              }}>
                <p style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 13, color: "#9A8A5E", lineHeight: 1.6, margin: 0,
                }}>
                  <strong style={{ color: palette.amber }}>⚠️ ROLE BOUNDARY</strong> —
                  This is an interpretation layer. Final financial determinations
                  are held by the <strong style={{ color: palette.amber }}>Adjudication System of Record</strong>.
                  This tool does not decide if a claim is paid; it interprets the
                  outcome and translates it for the associate.
                </p>
              </div>
            </FadeIn>

            {result ? (
              <>
                {/* Metrics Row 1 */}
                <SectionLabel delay={100}>Claim Snapshot</SectionLabel>
                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 12, marginBottom: 10,
                }}>
                  <MetricCard label="Status" value={result.eob.status} accent={palette.rose} delay={140} />
                  <MetricCard label="Denial Code" value={result.eob.code} accent={palette.blue} delay={180} />
                  <MetricCard label="Service" value={result.eob.service} accent={palette.teal} delay={220} />
                  <MetricCard label="Billed Amount" value={result.eob.billed_amount} accent={palette.amber} delay={260} />
                </div>
                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 12,
                }}>
                  <MetricCard label="Facility" value={result.eob.facility} delay={300} />
                  <MetricCard label="Date of Service" value={result.eob.date_of_service} delay={340} />
                  <MetricCard label="Member ID" value={result.eob.member_id} delay={380} />
                  <MetricCard label="Member Owes" value={result.eob.member_responsibility} delay={420} />
                </div>

                {result.error ? (
                  <>
                    <SectionLabel delay={460}>Interpretation Result</SectionLabel>
                    <ErrorCard error={result.error} delay={500} />
                  </>
                ) : (
                  <>
                    <SectionLabel delay={460}>The Why — Plain-English Explanation</SectionLabel>
                    <WhyCard mapping={result.mapping} delay={500} />

                    <SectionLabel delay={560}>The How — Your Next Step</SectionLabel>
                    <HowCard mapping={result.mapping} eob={result.eob} delay={600} />

                    <SectionLabel delay={660}>Reconciliation Reasoning</SectionLabel>
                    <ReasoningCard result={result} delay={700} />
                  </>
                )}
              </>
            ) : (
              <FadeIn delay={100}>
                <div style={{
                  textAlign: "center", padding: "80px 0",
                  color: palette.textMuted, fontSize: 15,
                }}>
                  Select or provide an EOB in the sidebar to begin analysis.
                </div>
              </FadeIn>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
