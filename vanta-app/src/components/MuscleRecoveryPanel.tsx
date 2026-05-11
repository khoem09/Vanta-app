// @ts-nocheck
import React, { useMemo, useState } from "react";
import AnatomyBody, { recoveryColor } from "./AnatomyBody";

// Hours to fully recover by muscle group
const RECOVERY_HOURS: Record<string, number> = {
  chest: 72, upperChest: 72, lats: 72, upperBack: 60, midBack: 60,
  lowerBack: 60, traps: 48, frontDelts: 48, sideDelts: 48, rearDelts: 48,
  biceps: 36, triceps: 36, forearms: 30,
  abs: 24, obliques: 24,
  glutes: 60, quads: 72, hamstrings: 72, adductors: 60, calves: 36,
};

const ALL_MUSCLES = Object.keys(RECOVERY_HOURS);

const LABELS_VI: Record<string, string> = {
  chest: "Ngực", upperChest: "Ngực trên", triceps: "Tay sau", biceps: "Tay trước",
  frontDelts: "Vai trước", sideDelts: "Vai giữa", rearDelts: "Vai sau",
  traps: "Cơ thang", lats: "Cơ xô", upperBack: "Lưng trên", midBack: "Lưng giữa",
  lowerBack: "Lưng dưới", abs: "Cơ bụng", obliques: "Liên sườn",
  forearms: "Cẳng tay", glutes: "Mông", quads: "Đùi trước",
  hamstrings: "Đùi sau", adductors: "Đùi trong", calves: "Bắp chân",
};
const LABELS_EN: Record<string, string> = {
  chest: "Chest", upperChest: "Upper Chest", triceps: "Triceps", biceps: "Biceps",
  frontDelts: "Front Delts", sideDelts: "Side Delts", rearDelts: "Rear Delts",
  traps: "Traps", lats: "Lats", upperBack: "Upper Back", midBack: "Mid Back",
  lowerBack: "Lower Back", abs: "Abs", obliques: "Obliques",
  forearms: "Forearms", glutes: "Glutes", quads: "Quads",
  hamstrings: "Hamstrings", adductors: "Adductors", calves: "Calves",
};

function statusLabel(pct: number, lang: string) {
  if (pct >= 85) return lang === "vi" ? "Sẵn sàng" : "Ready";
  if (pct >= 60) return lang === "vi" ? "Hồi phục tốt" : "Recovering";
  if (pct >= 35) return lang === "vi" ? "Hồi phục một phần" : "Partial";
  if (pct >= 15) return lang === "vi" ? "Mệt mỏi" : "Fatigued";
  return lang === "vi" ? "Quá tải" : "Overworked";
}

type CompletionLog = Record<string, { dow?: number; name?: string; duration?: number; muscles?: Record<string, number> }>;

type Props = {
  completionLog: CompletionLog;
  lang: "vi" | "en";
};

export default function MuscleRecoveryPanel({ completionLog, lang }: Props) {
  const [view, setView] = useState<"front" | "back">("front");
  const [selected, setSelected] = useState<string | null>(null);

  const labels = lang === "vi" ? LABELS_VI : LABELS_EN;

  // Compute per-muscle recovery + ETA + last load
  const data = useMemo(() => {
    const now = Date.now();
    const result: Record<
      string,
      { recovery: number; etaHours: number; lastHours: number | null; load: number; touched: boolean }
    > = {};

    for (const muscle of ALL_MUSCLES) {
      const recHours = RECOVERY_HOURS[muscle];
      let totalFatigue = 0;
      let lastHours: number | null = null;
      let totalLoad = 0;
      let etaHours = 0;

      for (const [dateKey, entry] of Object.entries(completionLog)) {
        const intensity = entry.muscles?.[muscle] || 0;
        if (!intensity) continue;
        const ts = new Date(dateKey + "T12:00:00").getTime();
        const hoursSince = (now - ts) / 3600000;
        if (hoursSince < 0 || hoursSince > recHours) continue;

        // each "exercise hit" = ~30 fatigue units
        const f0 = Math.min(100, intensity * 30);
        const remaining = f0 * Math.max(0, 1 - hoursSince / recHours);
        totalFatigue += remaining;
        totalLoad += intensity;
        if (lastHours === null || hoursSince < lastHours) lastHours = hoursSince;
        const eta = recHours - hoursSince;
        if (eta > etaHours) etaHours = eta;
      }

      const fatigue = Math.min(100, totalFatigue);
      result[muscle] = {
        recovery: Math.round(100 - fatigue),
        etaHours: Math.max(0, etaHours),
        lastHours,
        load: totalLoad,
        touched: lastHours !== null,
      };
    }
    return result;
  }, [completionLog]);

  // recovery map for body coloring (touched only; otherwise null = inactive gray)
  const bodyRecovery = useMemo(() => {
    const out: Record<string, number> = {};
    for (const m of ALL_MUSCLES) if (data[m].touched) out[m] = data[m].recovery;
    return out;
  }, [data]);

  // Overall readiness = average over touched muscles, or 100 if none
  const readiness = useMemo(() => {
    const touched = ALL_MUSCLES.filter((m) => data[m].touched);
    if (!touched.length) return 100;
    const avg = touched.reduce((s, m) => s + data[m].recovery, 0) / touched.length;
    return Math.round(avg);
  }, [data]);

  const sorted = useMemo(() => {
    return [...ALL_MUSCLES].sort((a, b) => {
      const ta = data[a].touched ? 0 : 1;
      const tb = data[b].touched ? 0 : 1;
      if (ta !== tb) return ta - tb;
      return data[a].recovery - data[b].recovery;
    });
  }, [data]);

  const sel = selected ? data[selected] : null;
  const fmtETA = (h: number) => {
    if (h <= 0) return lang === "vi" ? "Sẵn sàng" : "Ready";
    if (h < 1) return lang === "vi" ? `< 1 giờ` : `< 1 h`;
    if (h < 24) return `${Math.round(h)}h`;
    return `${Math.floor(h / 24)}d ${Math.round(h % 24)}h`;
  };

  const C = {
    text: "#f0f0ff", sub: "#7a7a8c", border: "#1e1e2e",
    surface: "#13131e", card: "#0f0f18", accent: "#a78bfa",
  };

  return (
    <div>
      {/* Header / readiness */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: C.sub, letterSpacing: 1, textTransform: "uppercase", fontWeight: 700 }}>
            {lang === "vi" ? "Sẵn sàng tập" : "Training Readiness"}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
            <div style={{ fontSize: 30, fontWeight: 900, color: recoveryColor(readiness), textShadow: `0 0 18px ${recoveryColor(readiness)}66` }}>
              {readiness}%
            </div>
            <div style={{ fontSize: 12, color: C.sub, fontWeight: 600 }}>{statusLabel(readiness, lang)}</div>
          </div>
        </div>
        {/* view toggle */}
        <div style={{ display: "flex", background: C.surface, padding: 4, borderRadius: 10, border: `1px solid ${C.border}` }}>
          {(["front", "back"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: "6px 12px", fontSize: 11, fontWeight: 800, letterSpacing: 1,
                border: "none", borderRadius: 7, cursor: "pointer",
                background: view === v ? "linear-gradient(135deg,#7c3aed,#a78bfa)" : "transparent",
                color: view === v ? "#fff" : C.sub,
                boxShadow: view === v ? "0 4px 14px rgba(124,58,237,.35)" : "none",
                transition: "all .25s",
              }}
            >
              {v === "front" ? (lang === "vi" ? "TRƯỚC" : "FRONT") : (lang === "vi" ? "SAU" : "BACK")}
            </button>
          ))}
        </div>
      </div>

      {/* Anatomy */}
      <div
        style={{
          display: "flex", justifyContent: "center", padding: "14px 8px",
          borderRadius: 18,
          background: "radial-gradient(ellipse at 50% 30%, rgba(124,58,237,0.12), rgba(8,8,16,0.9) 70%)",
          border: `1px solid ${C.border}`,
          boxShadow: "inset 0 0 40px rgba(124,58,237,0.06)",
          marginBottom: 12,
        }}
      >
        <AnatomyBody
          view={view}
          recovery={bodyRecovery}
          selected={selected}
          onSelect={(id) => setSelected(id === selected ? null : id)}
          width={280}
        />
      </div>

      {/* Color legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginBottom: 14 }}>
        {[
          { c: "#10b981", t: lang === "vi" ? "Sẵn sàng" : "Ready" },
          { c: "#38bdf8", t: lang === "vi" ? "Tốt" : "Recovering" },
          { c: "#fbbf24", t: lang === "vi" ? "Một phần" : "Partial" },
          { c: "#f59e0b", t: lang === "vi" ? "Mệt" : "Fatigued" },
          { c: "#ef4444", t: lang === "vi" ? "Quá tải" : "Overworked" },
          { c: "#2a2a38", t: lang === "vi" ? "Chưa tập" : "Inactive" },
        ].map((l) => (
          <div key={l.t} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: C.sub }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: l.c, boxShadow: `0 0 6px ${l.c}55` }} />
            {l.t}
          </div>
        ))}
      </div>

      {/* Selected muscle popup */}
      {selected && sel && (
        <div
          style={{
            padding: 14, borderRadius: 14, marginBottom: 14,
            background: `linear-gradient(135deg, ${recoveryColor(sel.recovery)}22, ${C.card})`,
            border: `1px solid ${recoveryColor(sel.recovery)}66`,
            boxShadow: `0 0 22px ${recoveryColor(sel.recovery)}22`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{labels[selected]}</div>
            <button
              onClick={() => setSelected(null)}
              style={{ background: "transparent", border: "none", color: C.sub, fontSize: 18, cursor: "pointer" }}
            >
              ×
            </button>
          </div>
          {sel.touched ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 12 }}>
                <div>
                  <div style={{ color: C.sub, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>
                    {lang === "vi" ? "Hồi phục" : "Recovery"}
                  </div>
                  <div style={{ color: recoveryColor(sel.recovery), fontWeight: 900, fontSize: 22 }}>{sel.recovery}%</div>
                </div>
                <div>
                  <div style={{ color: C.sub, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>
                    {lang === "vi" ? "Hồi phục sau" : "Ready in"}
                  </div>
                  <div style={{ color: C.text, fontWeight: 800, fontSize: 16 }}>{fmtETA(sel.etaHours)}</div>
                </div>
                <div>
                  <div style={{ color: C.sub, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>
                    {lang === "vi" ? "Trạng thái" : "Status"}
                  </div>
                  <div style={{ color: C.text, fontWeight: 700, fontSize: 13 }}>{statusLabel(sel.recovery, lang)}</div>
                </div>
                <div>
                  <div style={{ color: C.sub, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>
                    {lang === "vi" ? "Tải gần đây" : "Recent load"}
                  </div>
                  <div style={{ color: C.text, fontWeight: 700, fontSize: 13 }}>
                    {sel.load} {lang === "vi" ? "bài" : "sets"}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: C.sub }}>
              {lang === "vi" ? "Chưa được tập gần đây — hoàn toàn sẵn sàng." : "Not trained recently — fully ready."}
            </div>
          )}
        </div>
      )}

      {/* List */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {sorted.map((mid) => {
          const d = data[mid];
          const pct = d.touched ? d.recovery : 100;
          const c = d.touched ? recoveryColor(pct) : "#2a2a38";
          const isSel = selected === mid;
          return (
            <div
              key={mid}
              onClick={() => setSelected(mid === selected ? null : mid)}
              style={{
                padding: 10, borderRadius: 12, cursor: "pointer",
                background: isSel ? `${c}18` : C.card,
                border: `1px solid ${isSel ? c + "aa" : C.border}`,
                transition: "all .2s",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{labels[mid]}</div>
                <div style={{ fontSize: 13, fontWeight: 900, color: c }}>{pct}%</div>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: "#0a0a14", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${pct}%`, height: "100%",
                    background: `linear-gradient(90deg, ${c}, ${c}cc)`,
                    boxShadow: d.touched && pct < 35 ? `0 0 6px ${c}` : "none",
                    transition: "width .4s ease",
                  }}
                />
              </div>
              <div style={{ marginTop: 5, fontSize: 10, color: C.sub, display: "flex", justifyContent: "space-between" }}>
                <span>{d.touched ? statusLabel(pct, lang) : (lang === "vi" ? "Chưa tập" : "Inactive")}</span>
                {d.touched && d.etaHours > 0 && <span>{fmtETA(d.etaHours)}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
