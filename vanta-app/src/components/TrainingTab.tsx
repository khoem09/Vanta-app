// @ts-nocheck
/**
 * TrainingTab — Chế độ luyện tập tăng cường:
 *  G1) Tăng CHẤT LƯỢNG & SỐ LƯỢNG sản phẩm sau bắn (load size/quality)
 *  G2) Tăng khả năng BẮN LIÊN TỤC (multi-shot stamina, giảm refractory)
 *  G3) Tăng THỜI LƯỢNG cơ thể cho phép bắn (kéo dài cương cứng / kiểm soát)
 *
 * Các bài tập dựa trên khoa học phổ biến:
 * - Kegel & Reverse Kegel (PC/BC muscle) — kiểm soát phóng tinh, cương cứng tốt hơn
 * - Edging có chu kỳ — tăng ngưỡng PONR (point of no return)
 * - Nhịn xuất + bổ sung kẽm/L-arginine/hydration — tăng thể tích & chất lượng
 * - Hít thở 4-7-8 + kiểm soát hông — chống xuất sớm
 * - Cardio HIIT nhẹ + squats — tăng tuần hoàn vùng chậu, testosterone
 *
 * Người dùng tick hoàn thành mỗi bài → cộng XP, lên Level, streak luyện tập.
 */

import React, { useEffect, useMemo, useState } from "react";
import { Dumbbell, Droplet, Timer, Zap, Target, Award, Flame, CheckCircle2, Circle, RotateCcw, Play, Pause } from "lucide-react";
import LiveBattle from "./LiveBattle";
import SleepCycle from "./SleepCycle";

const C = {
  bg:"#080810",card:"#0f0f18",card2:"#14141f",primary:"#7c3aed",
  accent:"#a78bfa",text:"#f0f0ff",sub:"#6b7280",danger:"#ef4444",
  warn:"#f59e0b",green:"#10b981",sky:"#38bdf8",border:"#1e1e2e",
  surface:"#18182a",gold:"#fbbf24",pink:"#f472b6",
};

// ─── Bài tập ───────────────────────────────────────────────────────────────
type Goal = "quality" | "continuous" | "duration";

interface Drill {
  id: string;
  goal: Goal;
  icon: string;
  name_vi: string;
  name_en: string;
  desc_vi: string;
  desc_en: string;
  durationSec: number;   // thời lượng gợi ý cho 1 buổi
  xp: number;            // điểm thưởng khi hoàn thành
  howto_vi: string;
  howto_en: string;
}

const DRILLS: Drill[] = [
  // G1 — Quality & quantity
  {
    id:"hydration", goal:"quality", icon:"💧",
    name_vi:"Nạp nước & Kẽm", name_en:"Hydration & Zinc",
    desc_vi:"Uống 500ml nước + thực phẩm giàu kẽm/L-arginine để tăng thể tích.",
    desc_en:"Drink 500ml water + zinc/L-arginine rich food to boost load.",
    durationSec:120, xp:8,
    howto_vi:"Hàu, hạt bí, trứng, thịt bò nạc, dưa hấu. Duy trì hydrat hóa ≥2L/ngày.",
    howto_en:"Oysters, pumpkin seeds, eggs, lean beef, watermelon. Stay hydrated ≥2L/day.",
  },
  {
    id:"semen_retention", goal:"quality", icon:"🧊",
    name_vi:"Chu kỳ giữ tinh 3–5 ngày", name_en:"3–5 Day Retention Cycle",
    desc_vi:"Giữ không bắn 3–5 ngày để tối đa hoá thể tích & độ đặc.",
    desc_en:"Hold 3–5 days without ejaculating to maximize volume & density.",
    durationSec:60, xp:10,
    howto_vi:"Đếm ngày từ lần bắn cuối. Edging vẫn được phép, không lên đỉnh.",
    howto_en:"Count days from last shot. Edging allowed, no climax.",
  },
  {
    id:"pelvic_pump", goal:"quality", icon:"🩸",
    name_vi:"Bơm máu vùng chậu", name_en:"Pelvic Blood Pump",
    desc_vi:"Squat + jumping jacks tăng tuần hoàn, kích testosterone.",
    desc_en:"Squats + jumping jacks boost circulation & testosterone.",
    durationSec:300, xp:12,
    howto_vi:"3 hiệp: 20 squat + 30 jumping jacks, nghỉ 30s giữa hiệp.",
    howto_en:"3 sets: 20 squats + 30 jumping jacks, 30s rest between sets.",
  },

  // G2 — Continuous shooting
  {
    id:"reverse_kegel", goal:"continuous", icon:"🌀",
    name_vi:"Reverse Kegel", name_en:"Reverse Kegel",
    desc_vi:"Đẩy ra (như đi tiểu mạnh) để thư giãn cơ PC, kéo dài giữa các shot.",
    desc_en:"Push out (like forcing urine) to relax PC muscle, prolong between shots.",
    durationSec:180, xp:10,
    howto_vi:"3 set × 10 nhịp: đẩy 5s, thả 5s. Hít sâu khi đẩy.",
    howto_en:"3 sets × 10 reps: push 5s, release 5s. Inhale while pushing.",
  },
  {
    id:"multi_edge", goal:"continuous", icon:"♾️",
    name_vi:"Edge nhiều chu kỳ", name_en:"Multi-Edge Cycles",
    desc_vi:"Edge → hạ nhiệt 60s → edge tiếp. Tập não & cơ thể quen nhiều đợt.",
    desc_en:"Edge → cool down 60s → edge again. Train brain/body for multiple waves.",
    durationSec:1200, xp:20,
    howto_vi:"4–6 chu kỳ. Mỗi lần đến gần PONR thì dừng, hít thở chậm.",
    howto_en:"4–6 cycles. Stop near PONR, slow breathing each time.",
  },
  {
    id:"refractory_drill", goal:"continuous", icon:"⚡",
    name_vi:"Refractory Drill", name_en:"Refractory Drill",
    desc_vi:"Sau khi bắn, thử kích thích lại nhẹ sau 5–10 phút để rút ngắn refractory.",
    desc_en:"After shooting, gently re-stimulate after 5–10 min to shorten refractory.",
    durationSec:600, xp:15,
    howto_vi:"Chỉ áp dụng khi tuổi ≤ 35. Dừng nếu thấy đau hoặc quá nhạy cảm.",
    howto_en:"Only if age ≤ 35. Stop if pain or hypersensitivity.",
  },

  // G3 — Duration
  {
    id:"kegel", goal:"duration", icon:"💪",
    name_vi:"Kegel cơ bản", name_en:"Standard Kegel",
    desc_vi:"Co cơ PC giữ vững cương cứng, kiểm soát phóng tinh.",
    desc_en:"Contract PC muscle to hold erection, control ejaculation.",
    durationSec:180, xp:10,
    howto_vi:"3 set × 15 nhịp: siết 5s, thả 5s. Tập 1–2 lần/ngày.",
    howto_en:"3 sets × 15 reps: squeeze 5s, release 5s. 1–2× daily.",
  },
  {
    id:"breath_478", goal:"duration", icon:"🌬️",
    name_vi:"Thở 4-7-8", name_en:"4-7-8 Breathing",
    desc_vi:"Hít 4s, giữ 7s, thở ra 8s. Hạ kích thích, kéo dài thời gian.",
    desc_en:"Inhale 4s, hold 7s, exhale 8s. Lowers arousal, extends time.",
    durationSec:240, xp:8,
    howto_vi:"4 chu kỳ liên tiếp. Dùng ngay khi gần PONR để hạ nhiệt.",
    howto_en:"4 consecutive cycles. Use near PONR to cool down.",
  },
  {
    id:"start_stop", goal:"duration", icon:"🛑",
    name_vi:"Start–Stop Method", name_en:"Start–Stop Method",
    desc_vi:"Kích thích đến gần đỉnh → dừng hẳn 30s → tiếp tục. Lặp 3–5 lần.",
    desc_en:"Stimulate near climax → fully stop 30s → resume. Repeat 3–5×.",
    durationSec:900, xp:15,
    howto_vi:"Nhằm nâng ngưỡng PONR. Không cần lên đỉnh ở phiên tập.",
    howto_en:"Raises PONR threshold. No climax needed during training.",
  },
];

// ─── Storage ───────────────────────────────────────────────────────────────
const STORE_KEY = "ht_training_v1";
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const loadState = () => {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); } catch { return {}; }
};
const saveState = (s) => { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch {} };

const levelFromXP = (xp:number) => {
  // Mỗi level cần 100 XP, cấp số cộng nhẹ
  let lvl = 1, need = 100, total = 0;
  while (xp >= total + need) { total += need; lvl++; need = Math.round(need * 1.15); }
  return { level: lvl, intoLevel: xp - total, needForNext: need };
};

// ─── Mini timer ────────────────────────────────────────────────────────────
const Timer1 = ({ seconds, onDone }) => {
  const [t, setT] = useState(seconds);
  const [run, setRun] = useState(false);
  useEffect(() => {
    if (!run) return;
    if (t <= 0) { setRun(false); onDone?.(); return; }
    const id = setTimeout(() => setT(x => x - 1), 1000);
    return () => clearTimeout(id);
  }, [run, t]);
  const mm = String(Math.floor(t/60)).padStart(2,"0");
  const ss = String(t%60).padStart(2,"0");
  return (
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <div style={{fontVariantNumeric:"tabular-nums",fontSize:18,fontWeight:800,color:C.sky,minWidth:60}}>{mm}:{ss}</div>
      <button onClick={()=>setRun(r=>!r)} style={{background:C.primary,border:"none",borderRadius:10,padding:"6px 10px",color:"#fff",display:"flex",alignItems:"center",gap:4,cursor:"pointer"}}>
        {run ? <Pause size={14}/> : <Play size={14}/>} {run ? "Pause" : "Start"}
      </button>
      <button onClick={()=>{setRun(false);setT(seconds);}} style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:10,padding:"6px 10px",color:C.sub,display:"flex",alignItems:"center",cursor:"pointer"}}>
        <RotateCcw size={14}/>
      </button>
    </div>
  );
};

// ─── Main ──────────────────────────────────────────────────────────────────
const GOALS_META = (lang) => ({
  quality:    { icon:<Droplet size={16}/>, color:C.sky,   title: lang==="vi"?"Chất lượng & Số lượng":"Quality & Quantity",       sub: lang==="vi"?"Tăng thể tích, độ đặc sản phẩm":"Boost load size & density" },
  continuous: { icon:<Zap size={16}/>,     color:C.gold,  title: lang==="vi"?"Bắn liên tục":"Continuous Shots",                    sub: lang==="vi"?"Giảm refractory, nhiều đợt":"Shorter refractory, multi-shot" },
  duration:   { icon:<Target size={16}/>,  color:C.green, title: lang==="vi"?"Thời lượng cơ thể":"Body Duration",                  sub: lang==="vi"?"Kéo dài thời gian trước khi bắn":"Last longer before climax" },
});

export default function TrainingTab({ lang = "vi", age = 25 }: { lang?: "vi"|"en"; age?: number }) {
  const [state, setState] = useState(loadState);
  const today = todayKey();
  const todayDone: string[] = state.daily?.[today] || [];
  const xp = state.xp || 0;
  const streak = state.streak || 0;
  const lastDay = state.lastDay || null;

  const lvl = useMemo(() => levelFromXP(xp), [xp]);
  const meta = GOALS_META(lang);
  const t = (vi, en) => lang==="vi" ? vi : en;

  const toggle = (drill: Drill) => {
    const done = new Set(todayDone);
    let nextXp = xp;
    if (done.has(drill.id)) { done.delete(drill.id); nextXp -= drill.xp; }
    else { done.add(drill.id); nextXp += drill.xp; }

    // Update streak: nếu hôm nay vừa hoàn thành ≥1 bài lần đầu
    let nextStreak = streak;
    let nextLast = lastDay;
    if (done.size > 0 && lastDay !== today) {
      const y = new Date(); y.setDate(y.getDate()-1);
      const yKey = `${y.getFullYear()}-${String(y.getMonth()+1).padStart(2,"0")}-${String(y.getDate()).padStart(2,"0")}`;
      nextStreak = lastDay === yKey ? streak + 1 : 1;
      nextLast = today;
    } else if (done.size === 0 && lastDay === today) {
      // bỏ tick hết → trả streak
      nextStreak = Math.max(0, streak - 1);
      nextLast = null;
    }

    const next = {
      ...state,
      xp: Math.max(0, nextXp),
      streak: nextStreak,
      lastDay: nextLast,
      daily: { ...(state.daily||{}), [today]: Array.from(done) },
    };
    setState(next);
    saveState(next);
  };

  const grouped: Record<Goal, Drill[]> = { quality:[], continuous:[], duration:[] };
  DRILLS.forEach(d => grouped[d.goal].push(d));

  const totalDrills = DRILLS.length;
  const todayPct = Math.round((todayDone.length / totalDrills) * 100);

  return (
    <div style={{padding:"16px 16px 24px",color:C.text}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
        <Dumbbell size={22} color={C.accent}/>
        <div style={{fontSize:20,fontWeight:900}}>{t("Chế độ luyện tập","Training Mode")}</div>
      </div>
      <div style={{fontSize:12,color:C.sub,marginBottom:14}}>
        {t("Tăng chất lượng, số lượng, khả năng bắn liên tục và thời lượng cơ thể.",
          "Boost load quality, quantity, continuous shots and body duration.")}
      </div>

      {/* THỰC CHIẾN HÔM NAY — kết hợp cả 3 mục tiêu */}
      <LiveBattle lang={lang} onComplete={()=>{
        const next = { ...state, xp: (state.xp||0) + 50, lastDay: today,
          streak: (state.lastDay===today ? (state.streak||0) : (state.streak||0)+1) };
        setState(next); saveState(next);
      }}/>

      {/* Chu kỳ giấc ngủ — phục hồi hormone tối ưu cho thực chiến */}
      <SleepCycle lang={lang}/>

      {/* Level & streak card */}
      <div style={{background:`linear-gradient(135deg, ${C.card} 0%, ${C.surface} 100%)`,border:`1px solid ${C.border}`,borderRadius:18,padding:14,marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <Award size={18} color={C.gold}/>
            <div>
              <div style={{fontSize:11,color:C.sub,textTransform:"uppercase",letterSpacing:1}}>{t("Cấp độ","Level")}</div>
              <div style={{fontSize:22,fontWeight:900,color:C.gold}}>Lv. {lvl.level}</div>
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{display:"flex",alignItems:"center",gap:4,justifyContent:"flex-end",color:C.warn}}>
              <Flame size={16}/><span style={{fontWeight:800,fontSize:18}}>{streak}</span>
            </div>
            <div style={{fontSize:10,color:C.sub}}>{t("ngày luyện liên tiếp","day streak")}</div>
          </div>
        </div>
        <div style={{height:8,background:C.card2,borderRadius:4,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${(lvl.intoLevel/lvl.needForNext)*100}%`,background:`linear-gradient(90deg, ${C.gold}, ${C.accent})`,transition:"width .3s"}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.sub,marginTop:4}}>
          <span>{lvl.intoLevel}/{lvl.needForNext} XP</span>
          <span>{xp} XP {t("tổng","total")}</span>
        </div>
      </div>

      {/* Today progress */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:12,marginBottom:16,display:"flex",alignItems:"center",gap:10}}>
        <div style={{position:"relative",width:48,height:48,flexShrink:0}}>
          <svg width="48" height="48" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="20" fill="none" stroke={C.card2} strokeWidth="4"/>
            <circle cx="24" cy="24" r="20" fill="none" stroke={C.green} strokeWidth="4"
              strokeDasharray={`${(todayPct/100)*125.6} 125.6`} strokeLinecap="round" transform="rotate(-90 24 24)"/>
          </svg>
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:C.green}}>{todayPct}%</div>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700}}>{t("Tiến độ hôm nay","Today's progress")}</div>
          <div style={{fontSize:11,color:C.sub}}>{todayDone.length}/{totalDrills} {t("bài đã hoàn thành","drills done")}</div>
        </div>
      </div>

      {/* Drills by goal */}
      {(["quality","continuous","duration"] as Goal[]).map(goal => (
        <div key={goal} style={{marginBottom:18}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <span style={{color:meta[goal].color,display:"flex"}}>{meta[goal].icon}</span>
            <div>
              <div style={{fontSize:14,fontWeight:800,color:meta[goal].color}}>{meta[goal].title}</div>
              <div style={{fontSize:10,color:C.sub}}>{meta[goal].sub}</div>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {grouped[goal].map(d => {
              const done = todayDone.includes(d.id);
              return (
                <div key={d.id} style={{background:done?`${meta[goal].color}15`:C.card,border:`1px solid ${done?meta[goal].color:C.border}`,borderRadius:14,padding:12,transition:"all .2s"}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                    <button onClick={()=>toggle(d)} style={{background:"none",border:"none",cursor:"pointer",padding:0,marginTop:2,color:done?meta[goal].color:C.sub}}>
                      {done ? <CheckCircle2 size={22}/> : <Circle size={22}/>}
                    </button>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                        <span style={{fontSize:18}}>{d.icon}</span>
                        <span style={{fontSize:14,fontWeight:700,color:done?meta[goal].color:C.text}}>{lang==="vi"?d.name_vi:d.name_en}</span>
                        <span style={{fontSize:10,background:C.card2,color:C.gold,padding:"2px 6px",borderRadius:6,fontWeight:700}}>+{d.xp} XP</span>
                      </div>
                      <div style={{fontSize:12,color:C.sub,marginTop:4,lineHeight:1.5}}>{lang==="vi"?d.desc_vi:d.desc_en}</div>
                      <div style={{fontSize:11,color:C.accent,marginTop:6,fontStyle:"italic"}}>💡 {lang==="vi"?d.howto_vi:d.howto_en}</div>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:10,gap:8}}>
                        <div style={{fontSize:10,color:C.sub,display:"flex",alignItems:"center",gap:4}}><Timer size={12}/> {Math.round(d.durationSec/60)} {t("phút","min")}</div>
                        <Timer1 seconds={d.durationSec} onDone={()=>{ if(!done) toggle(d); }}/>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Safety footer */}
      <div style={{background:C.card2,border:`1px dashed ${C.border}`,borderRadius:12,padding:12,marginTop:8}}>
        <div style={{fontSize:11,color:C.sub,lineHeight:1.6}}>
          ⚠️ {t(
            "Luyện tập nên đều đặn, không quá sức. Dừng ngay nếu thấy đau, tê hoặc khó chịu kéo dài. Tham khảo bác sĩ nếu bạn có bệnh lý nền.",
            "Train consistently, never to the point of pain. Stop immediately if you feel pain, numbness or persistent discomfort. Consult a doctor if you have underlying conditions."
          )}
        </div>
      </div>
    </div>
  );
}
