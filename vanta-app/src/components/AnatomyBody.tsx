// @ts-nocheck
import React, { useMemo } from "react";
import Model from "react-body-highlighter";

// Recovery state -> color (kept for legends and external use)
export function recoveryColor(pct: number | null): string {
  if (pct === null || pct === undefined) return "#2a2a38";
  if (pct >= 85) return "#10b981";
  if (pct >= 60) return "#38bdf8";
  if (pct >= 35) return "#fbbf24";
  if (pct >= 15) return "#f59e0b";
  return "#ef4444";
}

// Map our internal muscle ids -> react-body-highlighter muscle names
const MUSCLE_MAP: Record<string, string[]> = {
  chest: ["chest"],
  upperChest: ["chest"],
  lats: ["upper-back"],
  upperBack: ["upper-back"],
  midBack: ["lower-back"],
  lowerBack: ["lower-back"],
  traps: ["trapezius"],
  frontDelts: ["front-deltoids"],
  sideDelts: ["front-deltoids"],
  rearDelts: ["back-deltoids"],
  biceps: ["biceps"],
  triceps: ["triceps"],
  forearms: ["forearm"],
  abs: ["abs"],
  obliques: ["obliques"],
  glutes: ["gluteal"],
  quads: ["quadriceps"],
  hamstrings: ["hamstring"],
  adductors: ["adductor"],
  calves: ["calves"],
};

// Reverse map: library muscle -> our id (first match wins)
const REVERSE_MAP: Record<string, string> = {};
for (const [ours, libList] of Object.entries(MUSCLE_MAP)) {
  for (const lib of libList) if (!REVERSE_MAP[lib]) REVERSE_MAP[lib] = ours;
}

// Bucket recovery % into 5 levels (1=worst .. 5=best)
function bucket(pct: number): number {
  if (pct >= 85) return 5;
  if (pct >= 60) return 4;
  if (pct >= 35) return 3;
  if (pct >= 15) return 2;
  return 1;
}

// Colors keyed by frequency (index = freq-1)
// Library uses the bodyColor for muscles not present in `data` — i.e. untrained.
const HIGHLIGHT_COLORS = ["#ef4444", "#f59e0b", "#fbbf24", "#38bdf8", "#10b981"];

type Props = {
  view: "front" | "back";
  recovery: Record<string, number>; // muscle id -> recovery %
  onSelect?: (id: string) => void;
  selected?: string | null;
  width?: number;
};

export default function AnatomyBody({ view, recovery, onSelect, width = 280 }: Props) {
  const data = useMemo(() => {
    // Group library muscles by bucket level
    const buckets: Record<number, Set<string>> = { 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set(), 5: new Set() };
    for (const [ours, pct] of Object.entries(recovery)) {
      const libIds = MUSCLE_MAP[ours];
      if (!libIds) continue;
      const lvl = bucket(pct);
      for (const lib of libIds) buckets[lvl].add(lib);
    }
    // Build one "exercise" per non-empty bucket. frequency = bucket level.
    const out: { name: string; muscles: string[]; frequency: number }[] = [];
    for (const lvl of [1, 2, 3, 4, 5]) {
      const muscles = Array.from(buckets[lvl]);
      if (!muscles.length) continue;
      // Repeat the exercise N=lvl times so frequency aggregates to lvl
      for (let i = 0; i < lvl; i++) {
        out.push({ name: `lvl-${lvl}-${i}`, muscles, frequency: 1 });
      }
    }
    return out;
  }, [recovery]);

  return (
    <div style={{ width, maxWidth: "100%" }}>
      <Model
        type={view === "front" ? "anterior" : "posterior"}
        data={data}
        bodyColor="#2a2a38"
        highlightedColors={HIGHLIGHT_COLORS}
        style={{ width: "100%", padding: 0 }}
        svgStyle={{ width: "100%", height: "auto", filter: "drop-shadow(0 0 12px rgba(124,58,237,0.18))" }}
        onClick={(stats: any) => {
          const muscle = stats?.muscle;
          if (!muscle) return;
          const ours = REVERSE_MAP[muscle];
          if (ours && onSelect) onSelect(ours);
        }}
      />
    </div>
  );
}
