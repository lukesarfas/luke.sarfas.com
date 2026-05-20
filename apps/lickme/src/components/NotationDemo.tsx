import { useEffect, useRef, useState } from "react";

const DEMO_ABC = `X:1
T:Bebop ii-V-I in C
C:LickMe demo
M:4/4
L:1/8
Q:1/4=180
K:C
"Dm7" A,2 DF A2 cA | "G7" Bcde dc Bd | "Cmaj7" =e4 z4 |]
`;

export default function NotationDemo() {
  const target = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const abcjs = await import("abcjs");
        if (cancelled || !target.current) return;
        abcjs.renderAbc(target.current, DEMO_ABC, {
          responsive: "resize",
          add_classes: true,
          staffwidth: 760,
          scale: 1.1,
          paddingtop: 8,
          paddingbottom: 8,
          paddingleft: 0,
          paddingright: 0,
        });
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to render notation"
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div style={{ color: "#b00", padding: "1rem" }}>
        Couldn't render notation: {error}
      </div>
    );
  }

  return (
    <div>
      <div ref={target} aria-label="Bebop ii-V-I in C, rendered live" />
      <details style={{ marginTop: "1rem", color: "#5a5e6a" }}>
        <summary
          style={{
            cursor: "pointer",
            fontSize: "0.85rem",
            color: "#5a5e6a",
          }}
        >
          Show ABC source
        </summary>
        <pre
          style={{
            marginTop: "0.5rem",
            padding: "0.75rem 1rem",
            background: "rgba(0,0,0,0.04)",
            borderRadius: 8,
            fontSize: "0.78rem",
            lineHeight: 1.5,
            color: "#3a3e48",
            overflowX: "auto",
          }}
        >
          {DEMO_ABC}
        </pre>
      </details>
    </div>
  );
}
