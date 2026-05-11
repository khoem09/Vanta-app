import React, { useEffect, useMemo, useRef, useState } from "react";

type Item = {
  id: string;
  icon: string;
  name_vi: string;
  name_en: string;
  desc_vi: string;
  desc_en: string;
};

type Props = {
  items: Item[];
  target: Item;
  lang: "vi" | "en";
  size?: number;
  autoSpin?: boolean;
  spinKey?: string | number; // change to re-spin
};

// A simple deterministic conic wheel that animates to land on `target`.
const PALETTE = [
  "#7c3aed", "#0ea5e9", "#f59e0b", "#ec4899",
  "#10b981", "#ef4444", "#06b6d4", "#a78bfa",
  "#f43f5e", "#84cc16", "#eab308", "#3b82f6",
];

export default function DailyWheel({
  items,
  target,
  lang,
  size = 240,
  autoSpin = true,
  spinKey,
}: Props) {
  const [spinning, setSpinning] = useState(false);
  const [landed, setLanded] = useState(!autoSpin);
  const ringRef = useRef<HTMLDivElement>(null);

  const idx = Math.max(0, items.findIndex((i) => i.id === target.id));
  const seg = 360 / items.length;
  // Pointer is at top (12 o'clock). Each segment center sits at (i*seg + seg/2)
  // measured clockwise from 0deg. To bring segment idx under the pointer we
  // rotate by -(idx*seg + seg/2). Add full turns for drama.
  const finalDeg = useMemo(() => {
    const turns = 5 + (Math.abs(((spinKey as number) ?? 0)) % 3);
    return turns * 360 - (idx * seg + seg / 2);
  }, [idx, seg, spinKey]);

  useEffect(() => {
    if (!autoSpin) {
      // Static snap (no animation) when wheel is just for display.
      if (ringRef.current) {
        ringRef.current.style.transition = "none";
        ringRef.current.style.transform = `rotate(${-(idx * seg + seg / 2)}deg)`;
      }
      setLanded(true);
      return;
    }
    setLanded(false);
    setSpinning(true);
    // Force reflow then start the animation
    if (ringRef.current) {
      ringRef.current.style.transition = "none";
      ringRef.current.style.transform = "rotate(0deg)";
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      ringRef.current.offsetHeight;
      ringRef.current.style.transition =
        "transform 4.2s cubic-bezier(.18,.72,.18,1)";
      ringRef.current.style.transform = `rotate(${finalDeg}deg)`;
    }
    const t = setTimeout(() => {
      setSpinning(false);
      setLanded(true);
    }, 4300);
    return () => clearTimeout(t);
  }, [finalDeg, autoSpin, spinKey, idx, seg]);

  const conic = useMemo(() => {
    const stops: string[] = [];
    items.forEach((_, i) => {
      const c = PALETTE[i % PALETTE.length];
      stops.push(`${c} ${i * seg}deg ${(i + 1) * seg}deg`);
    });
    return `conic-gradient(${stops.join(",")})`;
  }, [items, seg]);

  const radius = size / 2;
  const labelRadius = radius * 0.66;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        {/* Pointer */}
        <div
          style={{
            position: "absolute",
            top: -6,
            left: "50%",
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            borderLeft: "12px solid transparent",
            borderRight: "12px solid transparent",
            borderTop: "20px solid #facc15",
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,.5))",
            zIndex: 3,
          }}
        />
        {/* Wheel */}
        <div
          ref={ringRef}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            background: conic,
            boxShadow:
              "0 12px 40px rgba(0,0,0,.55), inset 0 0 0 4px rgba(255,255,255,.15)",
            position: "relative",
            willChange: "transform",
          }}
        >
          {items.map((it, i) => {
            const angle = i * seg + seg / 2;
            const rad = (angle - 90) * (Math.PI / 180);
            const x = radius + Math.cos(rad) * labelRadius;
            const y = radius + Math.sin(rad) * labelRadius;
            return (
              <div
                key={it.id}
                style={{
                  position: "absolute",
                  left: x,
                  top: y,
                  transform: `translate(-50%,-50%) rotate(${angle}deg)`,
                  fontSize: Math.max(16, size * 0.09),
                  textShadow: "0 1px 2px rgba(0,0,0,.5)",
                  pointerEvents: "none",
                }}
                className="emoji"
              >
                {it.icon}
              </div>
            );
          })}
        </div>
        {/* Hub */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            width: size * 0.18,
            height: size * 0.18,
            borderRadius: "50%",
            background: "linear-gradient(135deg,#fde68a,#f59e0b)",
            boxShadow: "0 0 0 3px rgba(0,0,0,.4), 0 4px 10px rgba(0,0,0,.4)",
          }}
        />
      </div>

      {/* Result */}
      <div
        style={{
          textAlign: "center",
          opacity: landed ? 1 : 0.4,
          transition: "opacity .35s",
          minHeight: 60,
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 4 }} className="emoji">
          {target.icon}
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>
          {lang === "vi" ? target.name_vi : target.name_en}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,.7)",
            lineHeight: 1.5,
            marginTop: 4,
            maxWidth: 320,
          }}
        >
          {lang === "vi" ? target.desc_vi : target.desc_en}
        </div>
      </div>

      {spinning && (
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.55)" }}>
          {lang === "vi" ? "Đang quay…" : "Spinning…"}
        </div>
      )}
    </div>
  );
}
