// Guess The Word — main app
// Editorial & calm aesthetic. Source Serif 4 + Geist + JetBrains Mono.
// Brand: deep green #006239 (hot accent), near-black #171717.

const { useState, useEffect, useRef, useMemo } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "rankViz": "heat-bar",
  "showSecret": false
}/*EDITMODE-END*/;

// ── Heat color: cold (slate) → warm (amber) → hot (deep green) ──
function heatColor(heat) {
  // Three-stop interpolation in oklch space.
  // cold ≈ oklch(0.72 0.02 240)  — cool grey-blue
  // warm ≈ oklch(0.74 0.13 70)   — amber/ochre
  // hot  = #006239 — deep green
  if (heat < 0.5) {
    const t = heat / 0.5;
    const L = 0.72 + (0.74 - 0.72) * t;
    const C = 0.02 + (0.13 - 0.02) * t;
    const H = 240 + (70 - 240) * t; // wrap through the long way is fine, oklch handles it
    return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${H.toFixed(1)})`;
  } else {
    const t = (heat - 0.5) / 0.5;
    // lerp from warm amber → #006239 ≈ oklch(0.45 0.105 158)
    const L = 0.74 + (0.45 - 0.74) * t;
    const C = 0.13 + (0.105 - 0.13) * t;
    const H = 70 + (158 - 70) * t;
    return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${H.toFixed(1)})`;
  }
}

function heatLabel(rank) {
  if (rank <= 10) return "Burning";
  if (rank <= 50) return "Hot";
  if (rank <= 250) return "Warm";
  if (rank <= 1000) return "Tepid";
  if (rank <= 3000) return "Cold";
  return "Frigid";
}

// ── Rank visualizations ─────────────────────────────────────────

function HeatBar({ heat, color }) {
  return (
    <div style={{
      width: "100%", height: 3, background: "rgba(23,23,23,.06)",
      borderRadius: 999, overflow: "hidden", marginTop: 6,
    }}>
      <div style={{
        width: `${Math.max(2, heat * 100)}%`, height: "100%",
        background: color, borderRadius: 999,
        transition: "width .6s cubic-bezier(.2,.7,.2,1), background .4s",
      }} />
    </div>
  );
}

function HeatDot({ color }) {
  return (
    <span style={{
      display: "inline-block", width: 8, height: 8, borderRadius: 999,
      background: color, marginRight: 10, flexShrink: 0,
    }} />
  );
}

function HeatGradient({ heat, color }) {
  // Full-row left-edge swipe of color, faded
  return (
    <div style={{
      position: "absolute", inset: 0, pointerEvents: "none",
      background: `linear-gradient(90deg, ${color}22 0%, transparent ${20 + heat * 60}%)`,
      borderRadius: 6,
    }} />
  );
}

// ── Single guess row ────────────────────────────────────────────

function GuessRow({ guess, isLatest, isWin, vizStyle, animateIn }) {
  const heat = window.heatFromRank(guess.rank);
  const color = heatColor(heat);
  const showLabel = vizStyle === "label" || vizStyle === "all";
  const showBar = vizStyle === "heat-bar" || vizStyle === "all";
  const showGradient = vizStyle === "gradient";
  const showDot = vizStyle === "dot" || vizStyle === "all";

  const [revealed, setRevealed] = useState(!animateIn);
  useEffect(() => {
    if (animateIn) {
      const id = requestAnimationFrame(() => setRevealed(true));
      return () => cancelAnimationFrame(id);
    }
  }, [animateIn]);

  return (
    <li style={{
      position: "relative",
      padding: "12px 14px",
      borderRadius: 6,
      background: isLatest ? "rgba(0, 98, 57, 0.04)" : "transparent",
      transition: "background .4s",
      opacity: revealed ? 1 : 0,
      transform: revealed ? "translateY(0)" : "translateY(6px)",
      transitionProperty: "background, opacity, transform",
      transitionDuration: ".5s",
      transitionTimingFunction: "cubic-bezier(.2,.7,.2,1)",
    }}>
      {showGradient && <HeatGradient heat={heat} color={color} />}
      <div style={{
        position: "relative", display: "flex", alignItems: "baseline",
        justifyContent: "space-between", gap: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", minWidth: 0, flex: 1 }}>
          {showDot && <HeatDot color={color} />}
          <span style={{
            fontFamily: "'Source Serif 4', Georgia, serif",
            fontSize: "clamp(20px, 4.5vw, 26px)",
            fontWeight: 400,
            color: isWin ? "#006239" : "#171717",
            letterSpacing: "-0.01em",
            fontStyle: isWin ? "italic" : "normal",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {guess.word}
          </span>
        </div>
        <div style={{
          display: "flex", alignItems: "baseline", gap: 10,
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontVariantNumeric: "tabular-nums",
        }}>
          {showLabel && (
            <span style={{
              fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase",
              color: color, fontWeight: 500,
            }}>
              {heatLabel(guess.rank)}
            </span>
          )}
          <span style={{
            fontSize: "clamp(14px, 3vw, 16px)",
            color: color,
            fontWeight: 500,
          }}>
            {isWin ? "✓" : `#${guess.rank.toLocaleString()}`}
          </span>
        </div>
      </div>
      {showBar && <HeatBar heat={heat} color={color} />}
    </li>
  );
}

// ── Main app ───────────────────────────────────────────────────

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [guesses, setGuesses] = useState([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [latestWord, setLatestWord] = useState(null);
  const [won, setWon] = useState(false);
  const [puzzleNumber] = useState(247); // mock daily puzzle counter
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const sorted = useMemo(() => {
    return [...guesses].sort((a, b) => a.rank - b.rank);
  }, [guesses]);

  const submit = (e) => {
    e?.preventDefault();
    const word = input.trim().toLowerCase();
    if (!word) return;
    if (!/^[a-z]+$/.test(word)) {
      setError("Letters only");
      return;
    }
    if (guesses.some((g) => g.word === word)) {
      setError(`"${word}" already guessed`);
      // briefly highlight existing
      setLatestWord(word);
      setTimeout(() => setError(""), 1800);
      return;
    }
    const rank = window.getRank(word);
    const newGuess = { word, rank, ts: Date.now() };
    setGuesses((g) => [...g, newGuess]);
    setLatestWord(word);
    setInput("");
    setError("");
    if (rank === 1) {
      setTimeout(() => setWon(true), 400);
    }
  };

  const reset = () => {
    setGuesses([]);
    setLatestWord(null);
    setWon(false);
    setInput("");
    setError("");
    setTweak("showSecret", false);
    inputRef.current?.focus();
  };

  const closest = sorted[0];
  const closestHeat = closest ? window.heatFromRank(closest.rank) : 0;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#FBFAF7",
      color: "#171717",
      fontFamily: "'Geist', -apple-system, BlinkMacSystemFont, sans-serif",
      WebkitFontSmoothing: "antialiased",
      padding: "clamp(24px, 5vw, 56px) clamp(20px, 5vw, 48px)",
      display: "flex",
      justifyContent: "center",
    }}>
      <main style={{
        width: "100%",
        maxWidth: 560,
        display: "flex",
        flexDirection: "column",
        gap: 28,
      }}>
        {/* ── Header ─────────────────────────────────────── */}
        <header style={{
          display: "flex", alignItems: "baseline", justifyContent: "space-between",
          gap: 16, paddingBottom: 4,
          borderBottom: "1px solid rgba(23,23,23,0.08)",
        }}>
          <div>
            <h1 style={{
              fontFamily: "'Source Serif 4', Georgia, serif",
              fontSize: "clamp(28px, 6vw, 38px)",
              fontWeight: 400,
              letterSpacing: "-0.02em",
              margin: 0,
              lineHeight: 1.1,
            }}>
              Guess <em style={{ color: "#006239", fontStyle: "italic" }}>the</em> Word
            </h1>
            <p style={{
              margin: "6px 0 12px",
              fontSize: 13,
              color: "rgba(23,23,23,0.55)",
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              letterSpacing: "0.02em",
            }}>
              № {puzzleNumber.toString().padStart(3, "0")} · {guesses.length} {guesses.length === 1 ? "guess" : "guesses"}
            </p>
          </div>
          {guesses.length > 0 && (
            <button onClick={reset} style={{
              appearance: "none", border: 0, background: "transparent",
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase",
              color: "rgba(23,23,23,0.5)", cursor: "pointer", padding: "6px 0",
            }}>
              Reset
            </button>
          )}
        </header>

        {/* ── Win banner (subtle reveal) ──────────────────── */}
        <WinReveal won={won} secret={window.SECRET_WORD} count={guesses.length} />

        {/* ── Closest summary ─────────────────────────────── */}
        {!won && closest && (
          <div style={{
            padding: "20px 22px",
            background: "#FFFFFF",
            border: "0.5px solid rgba(23,23,23,0.1)",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            position: "relative",
            overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", left: 0, top: 0, bottom: 0,
              width: 3, background: heatColor(closestHeat),
              transition: "background .4s",
            }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase",
                color: "rgba(23,23,23,0.5)", marginBottom: 4,
              }}>
                Closest so far
              </div>
              <div style={{
                fontFamily: "'Source Serif 4', Georgia, serif",
                fontSize: "clamp(22px, 5vw, 28px)",
                fontWeight: 400,
                letterSpacing: "-0.01em",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {closest.word}
              </div>
            </div>
            <div style={{
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              fontVariantNumeric: "tabular-nums",
              fontSize: "clamp(20px, 5vw, 26px)",
              color: heatColor(closestHeat),
              fontWeight: 500,
              transition: "color .4s",
            }}>
              #{closest.rank.toLocaleString()}
            </div>
          </div>
        )}

        {/* ── Input ─────────────────────────────────────── */}
        <form onSubmit={submit} style={{ position: "relative" }}>
          <div style={{
            display: "flex", alignItems: "center",
            background: "#FFFFFF",
            border: `1px solid ${error ? "rgba(180,40,40,0.4)" : "rgba(23,23,23,0.15)"}`,
            borderRadius: 10,
            transition: "border-color .2s",
            overflow: "hidden",
          }}>
            <span style={{
              padding: "0 0 0 18px",
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              fontSize: 14,
              color: "rgba(23,23,23,0.35)",
              userSelect: "none",
            }}>
              ›
            </span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); if (error) setError(""); }}
              placeholder={won ? "You found it." : "Type a word"}
              disabled={won}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              style={{
                flex: 1,
                appearance: "none", border: 0, outline: "none", background: "transparent",
                fontFamily: "'Source Serif 4', Georgia, serif",
                fontSize: "clamp(18px, 4.5vw, 22px)",
                padding: "16px 8px",
                color: "#171717",
                minWidth: 0,
              }}
            />
            <button type="submit" disabled={won || !input.trim()} style={{
              appearance: "none", border: 0, cursor: won ? "default" : "pointer",
              background: "transparent",
              padding: "0 18px",
              height: "100%",
              alignSelf: "stretch",
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase",
              color: input.trim() && !won ? "#006239" : "rgba(23,23,23,0.3)",
              transition: "color .2s",
            }}>
              Enter
            </button>
          </div>
          <div style={{
            height: 18, marginTop: 6, paddingLeft: 4,
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: 11, letterSpacing: "0.04em",
            color: error ? "rgb(180,40,40)" : "rgba(23,23,23,0.4)",
            transition: "color .2s",
          }}>
            {error || (guesses.length === 0 ? "Any English word. Press enter." : "")}
          </div>
        </form>

        {/* ── Guess list ─────────────────────────────────── */}
        {guesses.length === 0 ? (
          <EmptyState />
        ) : (
          <ol style={{
            listStyle: "none", padding: 0, margin: 0,
            display: "flex", flexDirection: "column", gap: 2,
          }}>
            {sorted.map((g) => (
              <GuessRow
                key={g.word}
                guess={g}
                isLatest={g.word === latestWord}
                isWin={g.rank === 1}
                vizStyle={tweaks.rankViz}
                animateIn={g.word === latestWord}
              />
            ))}
          </ol>
        )}

        {/* ── Footer ─────────────────────────────────────── */}
        <footer style={{
          marginTop: "auto",
          paddingTop: 32,
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase",
          color: "rgba(23,23,23,0.35)",
          display: "flex", justifyContent: "space-between", gap: 12,
          flexWrap: "wrap",
        }}>
          <span>Lower rank · closer meaning</span>
          {tweaks.showSecret && (
            <span style={{ color: "#006239" }}>
              Secret · {window.SECRET_WORD}
            </span>
          )}
        </footer>

        {/* ── Tweaks panel ───────────────────────────────── */}
        <TweaksPanel title="Tweaks">
          <TweakSection label="Rank visualization" />
          <TweakSelect
            label="Style"
            value={tweaks.rankViz}
            options={[
              { value: "heat-bar", label: "Heat bar (default)" },
              { value: "dot",      label: "Color dot" },
              { value: "label",    label: "Heat label only" },
              { value: "gradient", label: "Row gradient" },
              { value: "all",      label: "All combined" },
            ]}
            onChange={(v) => setTweak("rankViz", v)}
          />
          <TweakSection label="Debug" />
          <TweakToggle
            label="Reveal secret"
            value={tweaks.showSecret}
            onChange={(v) => setTweak("showSecret", v)}
          />
          <div style={{ height: 8 }} />
          <TweakButton label="Reset puzzle" onClick={reset} secondary />
        </TweaksPanel>
      </main>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{
      padding: "32px 4px",
      fontFamily: "'Source Serif 4', Georgia, serif",
      fontSize: 16,
      lineHeight: 1.6,
      color: "rgba(23,23,23,0.55)",
      maxWidth: 460,
    }}>
      <p style={{ margin: "0 0 12px" }}>
        A secret word is hidden. Guess any word — you'll see how close in
        <em style={{ color: "#006239" }}> meaning</em> it is to the answer.
      </p>
      <p style={{
        margin: 0,
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontSize: 11, letterSpacing: "0.04em",
        color: "rgba(23,23,23,0.4)",
      }}>
        Rank 1 wins. Rank 2 is one step away. Rank 9,999 is nowhere.
      </p>
    </div>
  );
}

// ── Win reveal: subtle fade + serif italic ───────────────────────

function WinReveal({ won, secret, count }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (won) {
      const id = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(id);
    } else {
      setShown(false);
    }
  }, [won]);

  if (!won) return null;
  return (
    <div style={{
      padding: "24px 22px",
      background: "#006239",
      color: "#FBFAF7",
      borderRadius: 10,
      opacity: shown ? 1 : 0,
      transform: shown ? "translateY(0)" : "translateY(-6px)",
      transition: "opacity .8s ease, transform .8s ease",
    }}>
      <div style={{
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase",
        opacity: 0.7,
        marginBottom: 6,
      }}>
        Solved
      </div>
      <div style={{
        fontFamily: "'Source Serif 4', Georgia, serif",
        fontSize: "clamp(28px, 7vw, 40px)",
        fontWeight: 400,
        fontStyle: "italic",
        letterSpacing: "-0.02em",
        lineHeight: 1.05,
      }}>
        {secret}
      </div>
      <div style={{
        marginTop: 10,
        fontSize: 13,
        opacity: 0.85,
        fontFamily: "'Source Serif 4', Georgia, serif",
      }}>
        Found in {count} {count === 1 ? "guess" : "guesses"}.
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
