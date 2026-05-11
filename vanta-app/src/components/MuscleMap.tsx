// @ts-nocheck
import React from "react";
import type { MuscleId } from "@/lib/exercise-data";

// Color scale by usage count (0..)
function colorFor(count: number, base: string): string {
  if (count <= 0) return base;
  if (count === 1) return "#38bdf8"; // sky
  if (count === 2) return "#10b981"; // green
  if (count === 3) return "#fbbf24"; // gold
  if (count === 4) return "#f59e0b"; // warn
  return "#ef4444"; // danger 5+
}

type Props = {
  usage: Record<string, number>;
  onSelect?: (id: MuscleId) => void;
  selected?: MuscleId | null;
  width?: number;
  baseColor?: string;
  strokeColor?: string;
};

// Simplified anterior + posterior muscle outlines.
// Anterior on left half (0..200), posterior on right half (210..410).
export default function MuscleMap({
  usage,
  onSelect,
  selected,
  width = 360,
  baseColor = "#2a2a3a",
  strokeColor = "#0a0a14",
}: Props) {
  const fill = (id: MuscleId) => colorFor(usage[id] || 0, baseColor);
  const stroke = (id: MuscleId) =>
    selected === id ? "#fff" : strokeColor;
  const sw = (id: MuscleId) => (selected === id ? 1.6 : 0.6);
  const click = (id: MuscleId) => () => onSelect && onSelect(id);
  const c = (id: MuscleId) => ({
    fill: fill(id),
    stroke: stroke(id),
    strokeWidth: sw(id),
    onClick: click(id),
    style: { cursor: "pointer" as const },
  });

  return (
    <svg
      viewBox="0 0 410 470"
      width={width}
      height={(470 / 410) * width}
      style={{ display: "block" }}
    >
      {/* ───────────── ANTERIOR (front) ───────────── */}
      <g>
        {/* head */}
        <ellipse cx="100" cy="32" rx="20" ry="24" fill={baseColor} stroke={strokeColor} strokeWidth="0.6" />
        {/* neck */}
        <rect x="92" y="52" width="16" height="14" fill={baseColor} stroke={strokeColor} strokeWidth="0.6" />
        {/* traps top (front view of upper traps) */}
        <path d="M78 64 Q100 56 122 64 L116 78 Q100 72 84 78 Z" {...c("traps")} />
        {/* shoulders / front delts */}
        <path d="M70 70 Q60 80 56 100 Q72 92 80 80 Z" {...c("frontDelts")} />
        <path d="M130 70 Q140 80 144 100 Q128 92 120 80 Z" {...c("frontDelts")} />
        {/* side delts cap */}
        <path d="M56 100 Q52 112 56 122 Q66 116 72 108 Z" {...c("sideDelts")} />
        <path d="M144 100 Q148 112 144 122 Q134 116 128 108 Z" {...c("sideDelts")} />
        {/* chest (pectorals) */}
        <path d="M82 80 Q100 86 100 88 L100 130 Q86 138 76 132 Q70 116 74 100 Z" {...c("chest")} />
        <path d="M118 80 Q100 86 100 88 L100 130 Q114 138 124 132 Q130 116 126 100 Z" {...c("chest")} />
        {/* biceps */}
        <path d="M58 122 Q52 150 58 178 Q66 168 68 150 Q66 134 64 124 Z" {...c("biceps")} />
        <path d="M142 122 Q148 150 142 178 Q134 168 132 150 Q134 134 136 124 Z" {...c("biceps")} />
        {/* forearms */}
        <path d="M58 178 Q54 210 58 240 Q66 232 70 212 Q68 192 64 180 Z" {...c("forearms")} />
        <path d="M142 178 Q146 210 142 240 Q134 232 130 212 Q132 192 136 180 Z" {...c("forearms")} />
        {/* abs */}
        <path d="M84 134 L116 134 L116 200 Q100 210 84 200 Z" {...c("abs")} />
        {/* abs rectus separators */}
        <line x1="100" y1="138" x2="100" y2="206" stroke={strokeColor} strokeWidth="0.4" />
        <line x1="86" y1="156" x2="114" y2="156" stroke={strokeColor} strokeWidth="0.3" />
        <line x1="86" y1="176" x2="114" y2="176" stroke={strokeColor} strokeWidth="0.3" />
        {/* obliques (side) */}
        <path d="M76 132 Q72 168 80 200 Q86 200 84 178 Z" {...c("obliques")} />
        <path d="M124 132 Q128 168 120 200 Q114 200 116 178 Z" {...c("obliques")} />
        {/* hips/pelvis (used for adductors origin) */}
        <path d="M80 200 Q100 214 120 200 L122 226 L78 226 Z" fill={baseColor} stroke={strokeColor} strokeWidth="0.4" />
        {/* quads */}
        <path d="M80 226 Q72 280 78 340 Q90 332 96 290 Q94 250 92 226 Z" {...c("quads")} />
        <path d="M120 226 Q128 280 122 340 Q110 332 104 290 Q106 250 108 226 Z" {...c("quads")} />
        {/* adductors (inner thigh) */}
        <path d="M92 226 Q100 254 108 226 L108 296 Q100 304 92 296 Z" {...c("adductors")} />
        {/* knees */}
        <ellipse cx="84" cy="346" rx="9" ry="6" fill={baseColor} stroke={strokeColor} strokeWidth="0.4" />
        <ellipse cx="116" cy="346" rx="9" ry="6" fill={baseColor} stroke={strokeColor} strokeWidth="0.4" />
        {/* calves (front - tibialis area, but use calves color) */}
        <path d="M76 354 Q72 396 78 432 Q88 422 90 400 Q88 374 86 354 Z" {...c("calves")} />
        <path d="M124 354 Q128 396 122 432 Q112 422 110 400 Q112 374 114 354 Z" {...c("calves")} />
        {/* feet */}
        <ellipse cx="82" cy="446" rx="10" ry="6" fill={baseColor} stroke={strokeColor} strokeWidth="0.4" />
        <ellipse cx="118" cy="446" rx="10" ry="6" fill={baseColor} stroke={strokeColor} strokeWidth="0.4" />
        {/* label */}
        <text x="100" y="466" textAnchor="middle" fill="#9ca3af" fontSize="9" fontWeight="700">FRONT</text>
      </g>

      {/* ───────────── POSTERIOR (back) ───────────── */}
      <g transform="translate(210,0)">
        {/* head */}
        <ellipse cx="100" cy="32" rx="20" ry="24" fill={baseColor} stroke={strokeColor} strokeWidth="0.6" />
        {/* neck */}
        <rect x="92" y="52" width="16" height="14" fill={baseColor} stroke={strokeColor} strokeWidth="0.6" />
        {/* traps (large diamond) */}
        <path d="M78 64 Q100 56 122 64 L130 110 Q100 124 70 110 Z" {...c("traps")} />
        {/* rear delts */}
        <path d="M68 76 Q56 90 56 108 Q70 102 80 90 Z" {...c("rearDelts")} />
        <path d="M132 76 Q144 90 144 108 Q130 102 120 90 Z" {...c("rearDelts")} />
        {/* triceps */}
        <path d="M58 108 Q52 150 58 178 Q66 168 70 150 Q70 128 64 110 Z" {...c("triceps")} />
        <path d="M142 108 Q148 150 142 178 Q134 168 130 150 Q130 128 136 110 Z" {...c("triceps")} />
        {/* forearms back */}
        <path d="M58 178 Q54 210 58 240 Q66 232 70 212 Q68 192 64 180 Z" {...c("forearms")} />
        <path d="M142 178 Q146 210 142 240 Q134 232 130 212 Q132 192 136 180 Z" {...c("forearms")} />
        {/* lats */}
        <path d="M70 110 Q66 150 80 178 Q92 172 94 138 Q86 122 76 116 Z" {...c("lats")} />
        <path d="M130 110 Q134 150 120 178 Q108 172 106 138 Q114 122 124 116 Z" {...c("lats")} />
        {/* mid back (between scapulae) */}
        <path d="M86 116 Q100 128 114 116 L114 158 Q100 168 86 158 Z" {...c("midBack")} />
        {/* lower back / erectors */}
        <path d="M86 162 Q100 170 114 162 L114 198 Q100 206 86 198 Z" {...c("lowerBack")} />
        {/* glutes */}
        <path d="M76 200 Q100 220 124 200 L124 246 Q100 258 76 246 Z" {...c("glutes")} />
        <line x1="100" y1="208" x2="100" y2="252" stroke={strokeColor} strokeWidth="0.4" />
        {/* hamstrings */}
        <path d="M80 252 Q72 300 80 340 Q92 332 96 300 Q94 270 92 252 Z" {...c("hamstrings")} />
        <path d="M120 252 Q128 300 120 340 Q108 332 104 300 Q106 270 108 252 Z" {...c("hamstrings")} />
        {/* knees */}
        <ellipse cx="84" cy="346" rx="9" ry="6" fill={baseColor} stroke={strokeColor} strokeWidth="0.4" />
        <ellipse cx="116" cy="346" rx="9" ry="6" fill={baseColor} stroke={strokeColor} strokeWidth="0.4" />
        {/* calves */}
        <path d="M74 354 Q68 396 78 432 Q90 422 92 396 Q90 372 86 354 Z" {...c("calves")} />
        <path d="M126 354 Q132 396 122 432 Q110 422 108 396 Q110 372 114 354 Z" {...c("calves")} />
        {/* feet */}
        <ellipse cx="82" cy="446" rx="10" ry="6" fill={baseColor} stroke={strokeColor} strokeWidth="0.4" />
        <ellipse cx="118" cy="446" rx="10" ry="6" fill={baseColor} stroke={strokeColor} strokeWidth="0.4" />
        <text x="100" y="466" textAnchor="middle" fill="#9ca3af" fontSize="9" fontWeight="700">BACK</text>
      </g>
    </svg>
  );
}
