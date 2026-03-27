/* ══════════════════════════════════════════════════════════════
   MEMBER 360 — ARCHITECTURE DIAGRAM COMPONENTS
   Data (LAYERS, DATA_FLOWS, PRINCIPLES, C, FONT, MONO,
   FONTS_URL) lives in member360_architecture_data.js
══════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════
   COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

function FadeIn({ children, delay = 0, style = {} }) {
  const [v, setV] = useState(false);
  useEffect(() => { const t = setTimeout(() => setV(true), delay); return () => clearTimeout(t); }, [delay]);
  return <div style={{ opacity: v ? 1 : 0, transform: v ? "translateY(0)" : "translateY(16px)", transition: "all 0.6s cubic-bezier(0.22,1,0.36,1)", ...style }}>{children}</div>;
}

function ComponentNode({ comp, layerColor, isSelected, onClick, delay }) {
  const [hovered, setHovered] = useState(false);
  const active = isSelected || hovered;
  return (
    <FadeIn delay={delay}>
      <div
        onClick={() => onClick(comp.id)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: "relative",
          background: active
            ? `linear-gradient(135deg, ${layerColor}08 0%, ${C.bgCard} 100%)`
            : C.bgCard,
          border: `1px solid ${active ? layerColor + "40" : C.border}`,
          borderRadius: 12,
          padding: "16px 18px",
          cursor: "pointer",
          transition: "all 0.3s ease",
          flex: 1,
          minWidth: 0,
          boxShadow: active ? `0 0 24px ${layerColor}10` : "none",
          transform: active ? "translateY(-2px)" : "translateY(0)",
        }}
      >
        {comp.isPrimary && (
          <div style={{
            position: "absolute", top: -1, right: 16,
            background: layerColor, color: "#fff",
            fontFamily: MONO, fontSize: 8.5, fontWeight: 600,
            textTransform: "uppercase", letterSpacing: 1.5,
            padding: "2px 8px 3px", borderRadius: "0 0 6px 6px",
          }}>Core</div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `${layerColor}12`,
            border: `1px solid ${layerColor}25`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15, flexShrink: 0,
          }}>{comp.icon}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontFamily: FONT, fontSize: 13.5, fontWeight: 700,
              color: active ? C.textH : C.text, transition: "color 0.2s",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{comp.label}</div>
            <div style={{
              fontFamily: MONO, fontSize: 10, color: layerColor,
              opacity: 0.7, marginTop: 1,
            }}>{comp.tech}</div>
          </div>
        </div>
        <div style={{
          fontFamily: FONT, fontSize: 11.5, color: C.textSoft,
          lineHeight: 1.55, display: "-webkit-box",
          WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>{comp.desc}</div>
      </div>
    </FadeIn>
  );
}

function DetailPanel({ comp, layerColor, onClose }) {
  if (!comp) return null;
  const flows = DATA_FLOWS.filter(f => f.from === comp.id || f.to === comp.id);
  return (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0, width: 380,
      background: C.bgDetail, borderLeft: `1px solid ${C.border}`,
      zIndex: 100, display: "flex", flexDirection: "column",
      animation: "slideIn 0.3s ease",
      boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
    }}>
      <div style={{
        padding: "20px 24px", borderBottom: `1px solid ${C.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 22 }}>{comp.icon}</span>
            <span style={{ fontFamily: FONT, fontSize: 18, fontWeight: 800, color: C.textH }}>{comp.label}</span>
          </div>
          <span style={{
            fontFamily: MONO, fontSize: 10.5, color: layerColor,
            background: `${layerColor}12`, padding: "2px 8px", borderRadius: 4,
          }}>{comp.tech}</span>
        </div>
        <button onClick={onClose} style={{
          width: 30, height: 30, borderRadius: 6, border: `1px solid ${C.border}`,
          background: "transparent", color: C.textSoft, cursor: "pointer",
          fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
        }}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        <div style={{
          fontFamily: FONT, fontSize: 13.5, color: C.text,
          lineHeight: 1.7, marginBottom: 24,
        }}>{comp.desc}</div>

        {comp.details && (
          <div style={{ marginBottom: 24 }}>
            <div style={{
              fontFamily: MONO, fontSize: 9.5, textTransform: "uppercase",
              letterSpacing: 1.8, color: C.textMuted, marginBottom: 10, fontWeight: 600,
            }}>Capabilities</div>
            {comp.details.map((d, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "7px 10px", borderRadius: 6, marginBottom: 4,
                background: i % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent",
              }}>
                <div style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: layerColor, flexShrink: 0,
                }} />
                <span style={{ fontFamily: FONT, fontSize: 12.5, color: C.text }}>{d}</span>
              </div>
            ))}
          </div>
        )}

        {flows.length > 0 && (
          <div>
            <div style={{
              fontFamily: MONO, fontSize: 9.5, textTransform: "uppercase",
              letterSpacing: 1.8, color: C.textMuted, marginBottom: 10, fontWeight: 600,
            }}>Data Flows</div>
            {flows.map((f, i) => {
              const isInbound = f.to === comp.id;
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 10px", borderRadius: 6, marginBottom: 4,
                  background: `${f.color}06`, border: `1px solid ${f.color}15`,
                }}>
                  <span style={{
                    fontFamily: MONO, fontSize: 10, color: f.color, fontWeight: 600,
                    width: 16, textAlign: "center",
                  }}>{isInbound ? "←" : "→"}</span>
                  <span style={{ fontFamily: FONT, fontSize: 12, color: C.text }}>{f.label}</span>
                  <span style={{ flex: 1 }} />
                  <span style={{
                    fontFamily: MONO, fontSize: 9.5, color: C.textMuted,
                  }}>{isInbound ? f.from : f.to}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function FlowArrow({ label, color, direction = "down", delay = 0 }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t); }, [delay]);

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "6px 0", opacity: visible ? 1 : 0, transition: "opacity 0.5s ease",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <div style={{
          height: 1, width: 40,
          background: `linear-gradient(90deg, transparent, ${color}40)`,
        }} />
        <span style={{
          fontFamily: MONO, fontSize: 9.5, color: `${color}90`,
          letterSpacing: 0.5, whiteSpace: "nowrap",
        }}>{label}</span>
        <div style={{
          height: 1, width: 40,
          background: `linear-gradient(90deg, ${color}40, transparent)`,
        }} />
      </div>
      <svg width="12" height="14" viewBox="0 0 12 14" style={{ marginTop: 2 }}>
        <path d="M6 0 L6 10 M2 7 L6 12 L10 7" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
      </svg>
    </div>
  );
}

function LayerHeader({ layer, delay }) {
  return (
    <FadeIn delay={delay}>
      <div style={{
        display: "flex", alignItems: "center", gap: 14, marginBottom: 14,
      }}>
        <div style={{
          width: 4, height: 36, borderRadius: 2,
          background: `linear-gradient(180deg, ${layer.color}, ${layer.color}30)`,
        }} />
        <div>
          <div style={{
            fontFamily: FONT, fontSize: 16, fontWeight: 800,
            color: C.textH, letterSpacing: -0.3,
          }}>{layer.label}</div>
          <div style={{
            fontFamily: MONO, fontSize: 10.5, color: layer.color,
            opacity: 0.7, marginTop: 1,
          }}>{layer.sublabel}</div>
        </div>
        <div style={{ flex: 1, height: 1, background: `${layer.color}15`, marginLeft: 8 }} />
      </div>
    </FadeIn>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════════════ */

function ArchitectureDiagram() {
  const [selected, setSelected] = useState(null);
  const [activeFlow, setActiveFlow] = useState(null);

  const allComponents = LAYERS.flatMap(l => l.components.map(c => ({ ...c, layerColor: l.color })));
  const selectedComp = allComponents.find(c => c.id === selected);
  const selectedColor = selectedComp?.layerColor || C.blue;

  const handleClick = (id) => {
    setSelected(prev => prev === id ? null : id);
  };

  return (
    <>
      <link href={FONTS_URL} rel="stylesheet" />
      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes pulseFlow { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
        @keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
      `}</style>

      <div style={{
        minHeight: "100vh", width: "100%",
        background: C.bg, fontFamily: FONT,
        position: "relative",
      }}>
        {/* Background grid */}
        <div style={{
          position: "fixed", inset: 0, opacity: 0.03,
          backgroundImage: `
            linear-gradient(${C.blue}40 1px, transparent 1px),
            linear-gradient(90deg, ${C.blue}40 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          pointerEvents: "none",
        }} />

        <div style={{
          maxWidth: 1080, margin: "0 auto",
          padding: "40px 32px 60px",
          paddingRight: selected ? 412 : 32,
          transition: "padding-right 0.3s ease",
        }}>

          {/* Title */}
          <FadeIn delay={0}>
            <div style={{ marginBottom: 12 }}>
              <div style={{
                fontFamily: MONO, fontSize: 10, textTransform: "uppercase",
                letterSpacing: 2.5, color: C.textMuted, marginBottom: 10,
                fontWeight: 600,
              }}>System Architecture</div>
              <h1 style={{
                fontFamily: FONT, fontSize: 34, fontWeight: 800,
                color: C.textH, letterSpacing: -0.8, margin: "0 0 6px",
                lineHeight: 1.15,
              }}>
                Member 360{" "}
                <span style={{
                  background: `linear-gradient(135deg, ${C.blue}, ${C.teal})`,
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                }}>Agentic Experience Layer</span>
              </h1>
              <p style={{
                fontFamily: FONT, fontSize: 14.5, color: C.textSoft,
                lineHeight: 1.6, maxWidth: 660,
              }}>
                An interpretation layer that sits on top of the claims adjudication platform.
                It reads outcomes, applies deterministic mapping + RAG-based reasoning, and
                translates them into actionable member advocacy.
              </p>
            </div>
          </FadeIn>

          {/* Design Principles */}
          <FadeIn delay={100}>
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10,
              marginBottom: 40, marginTop: 24,
            }}>
              {PRINCIPLES.map((p, i) => (
                <div key={i} style={{
                  background: C.bgCard, border: `1px solid ${C.border}`,
                  borderRadius: 10, padding: "14px 16px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 15 }}>{p.icon}</span>
                    <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: C.textH }}>{p.title}</span>
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: 11, color: C.textSoft, lineHeight: 1.55 }}>{p.desc}</div>
                </div>
              ))}
            </div>
          </FadeIn>

          {/* Architecture Layers */}
          {LAYERS.map((layer, li) => {
            const baseDelay = 200 + li * 180;
            return (
              <div key={layer.id}>
                <LayerHeader layer={layer} delay={baseDelay} />
                <FadeIn delay={baseDelay + 40}>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 12, marginBottom: 8,
                  }}>
                    {layer.components.map((comp, ci) => (
                      <ComponentNode
                        key={comp.id}
                        comp={comp}
                        layerColor={layer.color}
                        isSelected={selected === comp.id}
                        onClick={handleClick}
                        delay={baseDelay + 60 + ci * 80}
                      />
                    ))}
                  </div>
                </FadeIn>

                {/* Flow Arrow between layers */}
                {li < LAYERS.length - 1 && (
                  <FlowArrow
                    label={
                      li === 0 ? "Agent Responses · Structured Output"
                      : li === 1 ? "Code Mapping · SBC Retrieval · Accumulators"
                      : "EOB Feed · Plan Documents"
                    }
                    color={LAYERS[li + 1].color}
                    delay={baseDelay + 300}
                  />
                )}
              </div>
            );
          })}

          {/* Data Flow Legend */}
          <FadeIn delay={1200}>
            <div style={{ marginTop: 36 }}>
              <div style={{
                fontFamily: MONO, fontSize: 9.5, textTransform: "uppercase",
                letterSpacing: 1.8, color: C.textMuted, marginBottom: 14, fontWeight: 600,
              }}>Data Flow Map</div>
              <div style={{
                background: C.bgCard, border: `1px solid ${C.border}`,
                borderRadius: 12, padding: "18px 22px",
                display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "6px 24px",
              }}>
                {DATA_FLOWS.map((flow, i) => (
                  <div key={i}
                    onMouseEnter={() => setActiveFlow(i)}
                    onMouseLeave={() => setActiveFlow(null)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "6px 8px", borderRadius: 6,
                      background: activeFlow === i ? `${flow.color}08` : "transparent",
                      transition: "background 0.2s",
                      cursor: "default",
                    }}
                  >
                    <div style={{
                      width: 24, height: 2, borderRadius: 1,
                      background: flow.color, opacity: activeFlow === i ? 1 : 0.4,
                      transition: "opacity 0.2s",
                    }} />
                    <span style={{
                      fontFamily: MONO, fontSize: 10.5,
                      color: activeFlow === i ? flow.color : C.textMuted,
                      fontWeight: 500, transition: "color 0.2s",
                      minWidth: 80,
                    }}>{flow.from}</span>
                    <svg width="14" height="8" viewBox="0 0 14 8" style={{ flexShrink: 0 }}>
                      <path d="M0 4 L10 4 M7 1 L11 4 L7 7" stroke={flow.color} strokeWidth="1.2"
                        fill="none" strokeLinecap="round" opacity={activeFlow === i ? 0.9 : 0.3} />
                    </svg>
                    <span style={{
                      fontFamily: MONO, fontSize: 10.5,
                      color: activeFlow === i ? flow.color : C.textMuted,
                      fontWeight: 500, transition: "color 0.2s",
                      minWidth: 80,
                    }}>{flow.to}</span>
                    <span style={{ flex: 1 }} />
                    <span style={{
                      fontFamily: FONT, fontSize: 11,
                      color: activeFlow === i ? C.text : C.textMuted,
                      transition: "color 0.2s",
                    }}>{flow.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* Tech Stack Footer */}
          <FadeIn delay={1400}>
            <div style={{
              marginTop: 32, display: "flex", alignItems: "center",
              justifyContent: "space-between", flexWrap: "wrap", gap: 12,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                {[
                  { label: "Python", color: C.teal },
                  { label: "LangChain", color: C.teal },
                  { label: "FAISS", color: C.amber },
                  { label: "HuggingFace", color: C.amber },
                  { label: "Streamlit", color: C.blue },
                  { label: "React", color: C.blue },
                  { label: "Kafka", color: C.rose },
                ].map((t, i) => (
                  <span key={i} style={{
                    fontFamily: MONO, fontSize: 10, color: t.color,
                    opacity: 0.6, fontWeight: 500,
                  }}>{t.label}</span>
                ))}
              </div>
              <div style={{
                fontFamily: MONO, fontSize: 10, color: C.textMuted,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.emerald }} />
                Self-Funded Health Plan · Member 360 v0.1
              </div>
            </div>
          </FadeIn>
        </div>

        {/* Detail Panel */}
        {selected && (
          <>
            <div
              onClick={() => setSelected(null)}
              style={{
                position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
                zIndex: 99, animation: "fadeIn 0.2s ease",
              }}
            />
            <DetailPanel
              comp={selectedComp}
              layerColor={selectedColor}
              onClose={() => setSelected(null)}
            />
          </>
        )}
      </div>
    </>
  );
}
