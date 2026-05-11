// @ts-nocheck
/**
 * LiveBattle — Chế độ THỰC CHIẾN theo tình huống.
 * Người dùng chọn tình huống cần xảy ra (cần lâu / nhiều lần / sản phẩm khủng / combo)
 * → app sinh KẾ HOẠCH CHUẨN BỊ (T-24h, T-6h, T-1h, GIỜ G) + player phase trực tiếp.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, SkipForward, X, Swords, Flame, Clock, Target, Zap, Droplet, Layers } from "lucide-react";

const C = {
  bg:"#080810",card:"#0f0f18",card2:"#14141f",primary:"#7c3aed",accent:"#a78bfa",
  text:"#f0f0ff",sub:"#6b7280",danger:"#ef4444",warn:"#f59e0b",green:"#10b981",
  sky:"#38bdf8",border:"#1e1e2e",surface:"#18182a",gold:"#fbbf24",pink:"#f472b6",
};

type Cue = "breath"|"kegel"|"reverse"|"edge"|"cool"|"push"|"rest";
const CUE_META: Record<Cue,{color:string;label_vi:string;label_en:string;emoji:string}> = {
  breath:{color:"#38bdf8",label_vi:"Thở",label_en:"Breathe",emoji:"🌬️"},
  kegel:{color:"#10b981",label_vi:"Siết Kegel",label_en:"Kegel",emoji:"💪"},
  reverse:{color:"#a78bfa",label_vi:"Đẩy ra",label_en:"Reverse",emoji:"🌀"},
  edge:{color:"#fbbf24",label_vi:"Edge",label_en:"Edge",emoji:"⚡"},
  cool:{color:"#6b7280",label_vi:"Hạ nhiệt",label_en:"Cool",emoji:"❄️"},
  push:{color:"#f472b6",label_vi:"Bơm máu",label_en:"Pump",emoji:"🩸"},
  rest:{color:"#10b981",label_vi:"Nghỉ",label_en:"Rest",emoji:"🧘"},
};

interface Phase { name_vi:string; name_en:string; cue:Cue; seconds:number; hint_vi:string; hint_en:string; }
interface PrepStep { when_vi:string; when_en:string; do_vi:string; do_en:string; offsetH:number; }
interface Scenario {
  id: string;
  icon: React.ReactNode;
  color: string;
  title_vi: string; title_en: string;
  desc_vi: string; desc_en: string;
  prep: PrepStep[];
  phases: Phase[];
}

// Common prep helpers
const prep_long: PrepStep[] = [
  { offsetH:24, when_vi:"24h trước", when_en:"24h before", do_vi:"Ngủ ≥7 tiếng. Tránh xuất tinh từ giờ.",                do_en:"Sleep ≥7h. No ejaculation from now." },
  { offsetH:6,  when_vi:"6h trước",  when_en:"6h before",  do_vi:"Ăn nhẹ giàu protein + L-arginine (trứng, hạt).",       do_en:"Light meal high in protein + L-arginine (eggs, nuts)." },
  { offsetH:2,  when_vi:"2h trước",  when_en:"2h before",  do_vi:"Tập Kegel 3 set × 15 + thở 4-7-8 5 phút.",             do_en:"Kegel 3 sets × 15 + 4-7-8 breathing 5 min." },
  { offsetH:1,  when_vi:"1h trước",  when_en:"1h before",  do_vi:"Uống 400ml nước. Đi vệ sinh hết. Tắm ấm.",             do_en:"Drink 400ml water. Empty bladder. Warm shower." },
  { offsetH:0,  when_vi:"GIỜ G",     when_en:"GO TIME",    do_vi:"Bật phiên thực chiến bên dưới. Kiểm soát thở từ đầu.", do_en:"Run the live session below. Control breath from the start." },
];
const prep_multi: PrepStep[] = [
  { offsetH:48, when_vi:"48h trước", when_en:"48h before", do_vi:"Bắt đầu giữ tinh. Không xả.",                          do_en:"Start retention. No release." },
  { offsetH:24, when_vi:"24h trước", when_en:"24h before", do_vi:"Bổ sung kẽm, magie, vitamin D. Ngủ sớm.",              do_en:"Take zinc, magnesium, vit D. Sleep early." },
  { offsetH:4,  when_vi:"4h trước",  when_en:"4h before",  do_vi:"Cardio nhẹ 15 phút (squat + jumping jacks).",          do_en:"Light cardio 15 min (squats + jumping jacks)." },
  { offsetH:1,  when_vi:"1h trước",  when_en:"1h before",  do_vi:"Reverse Kegel để cơ chậu thả lỏng tối đa.",            do_en:"Reverse Kegel to fully relax pelvic floor." },
  { offsetH:0,  when_vi:"GIỜ G",     when_en:"GO TIME",    do_vi:"Phát đầu kiểm soát chậm. Hồi 5–10 phút giữa các phát.",do_en:"First shot slow & controlled. 5–10 min recovery between shots." },
];
const prep_volume: PrepStep[] = [
  { offsetH:120,when_vi:"5 ngày trước",when_en:"5 days before",do_vi:"Dừng xuất tinh hoàn toàn. Edging vẫn được.",       do_en:"Stop ejaculating entirely. Edging still allowed." },
  { offsetH:48, when_vi:"48h trước", when_en:"48h before", do_vi:"Ăn hàu, trứng, cá hồi, rau xanh đậm.",                 do_en:"Eat oysters, eggs, salmon, dark leafy greens." },
  { offsetH:24, when_vi:"24h trước", when_en:"24h before", do_vi:"Uống ≥2.5L nước/ngày. Tránh rượu, caffeine.",          do_en:"Drink ≥2.5L water/day. Avoid alcohol, caffeine." },
  { offsetH:3,  when_vi:"3h trước",  when_en:"3h before",  do_vi:"Bổ sung 500ml nước + 1 nắm hạt bí (kẽm).",             do_en:"Drink 500ml water + handful of pumpkin seeds (zinc)." },
  { offsetH:0,  when_vi:"GIỜ G",     when_en:"GO TIME",    do_vi:"Edge tối thiểu 15 phút trước khi xả. Càng tích càng đậm.",do_en:"Edge ≥15 min before release. More buildup = bigger load." },
];
const prep_combo: PrepStep[] = [
  { offsetH:120,when_vi:"5 ngày trước",when_en:"5 days before",do_vi:"Giữ tinh + hydrat + ngủ đủ. Edging hằng ngày.",    do_en:"Retain + hydrate + sleep well. Daily edging." },
  { offsetH:48, when_vi:"48h trước", when_en:"48h before", do_vi:"Tập Kegel + Reverse Kegel sáng và tối.",               do_en:"Kegel + Reverse Kegel morning & evening." },
  { offsetH:24, when_vi:"24h trước", when_en:"24h before", do_vi:"Ăn sạch: protein + omega-3 + rau xanh.",                do_en:"Eat clean: protein + omega-3 + greens." },
  { offsetH:6,  when_vi:"6h trước",  when_en:"6h before",  do_vi:"Cardio 20 phút. Tắm xen kẽ nóng-lạnh.",                do_en:"20 min cardio. Hot–cold contrast shower." },
  { offsetH:1,  when_vi:"1h trước",  when_en:"1h before",  do_vi:"Thở 4-7-8 + tự xoa bóp đùi/hông.",                     do_en:"4-7-8 breathing + thigh/hip self-massage." },
  { offsetH:0,  when_vi:"GIỜ G",     when_en:"GO TIME",    do_vi:"Mở phiên live. Theo từng phase, không vội.",           do_en:"Start live session. Follow phases, no rush." },
];

const SCENARIOS: Scenario[] = [
  {
    id:"long", color:"#10b981", icon:<Clock size={20}/>,
    title_vi:"Cần kéo dài LÂU", title_en:"Need to LAST LONG",
    desc_vi:"Dồn cả buổi không xả. Mục tiêu: thời lượng cương cứng & kiểm soát PONR.",
    desc_en:"Long session, no release. Goal: erection duration & PONR control.",
    prep: prep_long,
    phases:[
      { name_vi:"Hít thở mở phiên", name_en:"Opening Breath", cue:"breath", seconds:120, hint_vi:"4-7-8, thư giãn vai-hông", hint_en:"4-7-8, relax shoulders & hips" },
      { name_vi:"Kegel khoá ngưỡng", name_en:"Threshold Kegel", cue:"kegel", seconds:180, hint_vi:"Siết 5s — Thả 5s × 18", hint_en:"Squeeze 5s — Release 5s × 18" },
      { name_vi:"Edge giữ 60%", name_en:"Hold @60%", cue:"edge", seconds:600, hint_vi:"Giữ quanh 60%, không vượt", hint_en:"Stay around 60%, never above" },
      { name_vi:"Start–Stop ×3", name_en:"Start–Stop ×3", cue:"edge", seconds:600, hint_vi:"Lên 90% → DỪNG 30s × 3 vòng", hint_en:"Hit 90% → STOP 30s × 3 rounds" },
      { name_vi:"Reverse Kegel hồi", name_en:"Reverse Reset", cue:"reverse", seconds:120, hint_vi:"Đẩy ra để hạ áp lực", hint_en:"Push out to drop pressure" },
      { name_vi:"Edge dài 70%", name_en:"Long Edge 70%", cue:"edge", seconds:600, hint_vi:"10 phút quanh 70%", hint_en:"10 min around 70%" },
      { name_vi:"Khoá Kegel cuối", name_en:"Final Lock", cue:"kegel", seconds:60, hint_vi:"Siết mạnh 8s × 6 nếu muốn dừng", hint_en:"Strong squeeze 8s × 6 to stop" },
    ],
  },
  {
    id:"multi", color:"#fbbf24", icon:<Zap size={20}/>,
    title_vi:"Cần bắn NHIỀU LẦN", title_en:"Need MULTIPLE SHOTS",
    desc_vi:"Mục tiêu 2–3 phát trong 1 phiên. Rút ngắn refractory.",
    desc_en:"2–3 shots in one session. Shorten refractory.",
    prep: prep_multi,
    phases:[
      { name_vi:"Khởi động", name_en:"Warmup", cue:"breath", seconds:90, hint_vi:"Thở sâu, làm nóng", hint_en:"Deep breath, warm up" },
      { name_vi:"Edge 80%", name_en:"Edge 80%", cue:"edge", seconds:300, hint_vi:"Sát đỉnh, chưa xả", hint_en:"Near peak, no release" },
      { name_vi:"PHÁT 1 — Xả", name_en:"SHOT 1 — Release", cue:"edge", seconds:60, hint_vi:"Bắn. Thả lỏng cơ chậu.", hint_en:"Shoot. Relax pelvic floor." },
      { name_vi:"Hồi thở", name_en:"Breath Recovery", cue:"breath", seconds:300, hint_vi:"5 phút thở 4-7-8, GIỮ tay nhẹ", hint_en:"5 min 4-7-8, keep hand on lightly" },
      { name_vi:"Reverse Kegel", name_en:"Reverse Kegel", cue:"reverse", seconds:180, hint_vi:"Đẩy ra liên tục, thả tuyệt đối", hint_en:"Continuous push out, total relax" },
      { name_vi:"Kích lại nhẹ", name_en:"Gentle Re-Stim", cue:"edge", seconds:300, hint_vi:"Chậm, từng chút", hint_en:"Slow, gentle" },
      { name_vi:"PHÁT 2", name_en:"SHOT 2", cue:"edge", seconds:240, hint_vi:"Đừng ép. Có hay không cũng là chiến thắng.", hint_en:"Don't force. Either way is a win." },
      { name_vi:"Hồi thứ 2", name_en:"Recovery 2", cue:"cool", seconds:420, hint_vi:"7 phút hồi nếu định bắn phát 3", hint_en:"7 min recovery if going for shot 3" },
      { name_vi:"PHÁT 3 (tuỳ)", name_en:"SHOT 3 (optional)", cue:"edge", seconds:300, hint_vi:"Chỉ làm nếu cảm thấy được", hint_en:"Only if you feel it" },
    ],
  },
  {
    id:"volume", color:"#38bdf8", icon:<Droplet size={20}/>,
    title_vi:"Cần SẢN PHẨM KHỦNG", title_en:"Need MASSIVE LOAD",
    desc_vi:"Tối đa thể tích & độ đặc cho 1 phát duy nhất.",
    desc_en:"Maximize volume & density for a single shot.",
    prep: prep_volume,
    phases:[
      { name_vi:"Nạp nước cuối", name_en:"Final Hydrate", cue:"rest", seconds:60, hint_vi:"Uống 300ml nước ấm", hint_en:"Drink 300ml warm water" },
      { name_vi:"Bơm máu chậu", name_en:"Pelvic Pump", cue:"push", seconds:240, hint_vi:"30 squat + 40 jumping jacks", hint_en:"30 squats + 40 jumping jacks" },
      { name_vi:"Kegel sâu", name_en:"Deep Kegel", cue:"kegel", seconds:300, hint_vi:"Siết 6s — Thả 6s × 25", hint_en:"Squeeze 6s — Release 6s × 25" },
      { name_vi:"Edge tích trữ 1", name_en:"Build-up Edge 1", cue:"edge", seconds:600, hint_vi:"10 phút lên-xuống, KHÔNG xả", hint_en:"10 min up-down, NO release" },
      { name_vi:"Reverse Kegel xả áp", name_en:"Reverse Release", cue:"reverse", seconds:120, hint_vi:"Đẩy ra, hạ ngưỡng", hint_en:"Push out, drop threshold" },
      { name_vi:"Edge tích trữ 2", name_en:"Build-up Edge 2", cue:"edge", seconds:600, hint_vi:"10 phút nữa, áp lực dồn tối đa", hint_en:"Another 10 min, max pressure buildup" },
      { name_vi:"PHÁT KHỦNG", name_en:"BIG SHOT", cue:"edge", seconds:120, hint_vi:"Xả. Đếm số nhịp co thắt & thể tích.", hint_en:"Release. Count contractions & volume." },
    ],
  },
  {
    id:"combo", color:"#f472b6", icon:<Layers size={20}/>,
    title_vi:"COMBO — Lâu + Nhiều + Khủng", title_en:"COMBO — Long + Multi + Big",
    desc_vi:"Cấp độ cao nhất: phiên dài, nhiều phát, mỗi phát đậm đặc.",
    desc_en:"Top tier: long session, multiple shots, each one dense.",
    prep: prep_combo,
    phases:[
      { name_vi:"Mở phiên thở", name_en:"Open Breath", cue:"breath", seconds:180, hint_vi:"3 phút thở box 4-4-4-4", hint_en:"3 min box breath 4-4-4-4" },
      { name_vi:"Kegel + Reverse xen kẽ", name_en:"Kegel + Reverse Mix", cue:"kegel", seconds:300, hint_vi:"Siết 10 — Đẩy 10, lặp 5 vòng", hint_en:"Squeeze 10 — Push 10, 5 rounds" },
      { name_vi:"Bơm máu", name_en:"Blood Pump", cue:"push", seconds:180, hint_vi:"20 squat + 30 jacks × 2", hint_en:"20 squats + 30 jacks × 2" },
      { name_vi:"Edge tích trữ", name_en:"Build-up Edge", cue:"edge", seconds:900, hint_vi:"15 phút edge giữ 70%, KHÔNG xả", hint_en:"15 min edge @70%, NO release" },
      { name_vi:"PHÁT 1 — KHỦNG", name_en:"SHOT 1 — BIG", cue:"edge", seconds:120, hint_vi:"Xả phát đầu thật đậm", hint_en:"First shot, dense release" },
      { name_vi:"Hồi tích cực", name_en:"Active Recovery", cue:"breath", seconds:600, hint_vi:"10 phút thở + Reverse Kegel xen kẽ", hint_en:"10 min breath + Reverse Kegel" },
      { name_vi:"Edge sóng 2", name_en:"Wave 2 Edge", cue:"edge", seconds:600, hint_vi:"10 phút edge nhẹ", hint_en:"10 min light edge" },
      { name_vi:"PHÁT 2", name_en:"SHOT 2", cue:"edge", seconds:120, hint_vi:"Xả lần 2", hint_en:"Second release" },
      { name_vi:"Khoá phiên", name_en:"Lock Session", cue:"kegel", seconds:120, hint_vi:"Kegel chốt + 300ml nước", hint_en:"Lock with Kegel + 300ml water" },
    ],
  },
];

interface Props { lang?: "vi"|"en"; onComplete?: (id:string)=>void; }

export default function LiveBattle({ lang="vi", onComplete }: Props) {
  const t = (vi,en) => lang==="vi" ? vi : en;
  const [picked, setPicked] = useState<Scenario|null>(null);
  const [eventTimeStr, setEventTimeStr] = useState(""); // "HH:MM"
  const [eventDateStr, setEventDateStr] = useState(""); // "YYYY-MM-DD"
  const [open, setOpen] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const tickRef = useRef<any>(null);

  // countdown to event
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const eventMs = useMemo(() => {
    if (!eventTimeStr) return null;
    const [h,m] = eventTimeStr.split(":").map(Number);
    if (isNaN(h)||isNaN(m)) return null;
    let d: Date;
    if (eventDateStr) {
      const [y,mo,da] = eventDateStr.split("-").map(Number);
      d = new Date(y, (mo||1)-1, da||1, h, m, 0, 0);
    } else {
      d = new Date(); d.setHours(h,m,0,0);
      if (d.getTime() < Date.now()) d.setDate(d.getDate()+1);
    }
    return d.getTime();
  }, [eventTimeStr, eventDateStr]);
  const remainingToEvent = eventMs ? Math.max(0, eventMs - now) : null;
  const rDays = remainingToEvent !== null ? Math.floor(remainingToEvent/86400000) : 0;
  const rHours = remainingToEvent !== null ? Math.floor((remainingToEvent%86400000)/3600000) : 0;
  const rMins = remainingToEvent !== null ? Math.floor((remainingToEvent%3600000)/60000) : 0;

  const phase = picked?.phases[phaseIdx];

  useEffect(() => {
    if (!running || !picked) { clearInterval(tickRef.current); return; }
    tickRef.current = setInterval(() => {
      setRemaining(r => {
        if (r > 1) return r - 1;
        setPhaseIdx(i => {
          if (i + 1 < picked.phases.length) {
            setRemaining(picked.phases[i+1].seconds);
            return i+1;
          }
          setRunning(false);
          try {
            const k="ht_battle_done_v1";
            const cur=JSON.parse(localStorage.getItem(k)||"{}");
            cur[new Date().toISOString().slice(0,10)]=picked.id;
            localStorage.setItem(k,JSON.stringify(cur));
          } catch {}
          onComplete?.(picked.id);
          return i;
        });
        return 0;
      });
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, [running, picked, onComplete]);

  const startSession = () => {
    if (!picked) return;
    setPhaseIdx(0); setRemaining(picked.phases[0].seconds); setRunning(false); setOpen(true);
  };

  const totalMin = picked ? Math.round(picked.phases.reduce((s,p)=>s+p.seconds,0)/60) : 0;
  const overallPct = picked ? Math.min(100, ((picked.phases.slice(0,phaseIdx).reduce((s,p)=>s+p.seconds,0) + (phase!.seconds-remaining)) / picked.phases.reduce((s,p)=>s+p.seconds,0))*100) : 0;

  return (
    <div style={{marginBottom:14}}>
      {/* Banner */}
      <div style={{
        background:`linear-gradient(135deg, ${C.primary}30 0%, ${C.danger}25 60%, ${C.gold}20 100%)`,
        border:`1px solid ${C.primary}`, borderRadius:18, padding:14,
        boxShadow:`0 8px 24px -8px ${C.primary}80`,
      }}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
          <Swords size={18} color={C.gold}/>
          <div style={{fontSize:11,color:C.gold,fontWeight:800,letterSpacing:1.5,textTransform:"uppercase"}}>{t("Thực chiến — chọn tình huống","Live Battle — pick scenario")}</div>
        </div>
        <div style={{fontSize:13,color:C.sub,marginBottom:12,lineHeight:1.5}}>
          {t("Chọn việc bạn sắp làm. App sẽ ra kế hoạch chuẩn bị + phiên trực tiếp.",
            "Pick what you're about to do. App generates a prep plan + live session.")}
        </div>

        {/* Scenario chips */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
          {SCENARIOS.map(s => {
            const active = picked?.id === s.id;
            return (
              <button key={s.id} onClick={()=>setPicked(s)} style={{
                background: active ? `${s.color}25` : C.card,
                border: `1px solid ${active ? s.color : C.border}`,
                borderRadius:12, padding:10, color:C.text, cursor:"pointer",
                textAlign:"left", display:"flex", flexDirection:"column", gap:4,
                transition:"all .2s",
              }}>
                <div style={{display:"flex",alignItems:"center",gap:6,color:s.color}}>
                  {s.icon}
                  <span style={{fontSize:11,fontWeight:800}}>{lang==="vi"?s.title_vi:s.title_en}</span>
                </div>
                <div style={{fontSize:10,color:C.sub,lineHeight:1.4}}>{lang==="vi"?s.desc_vi:s.desc_en}</div>
              </button>
            );
          })}
        </div>

        {picked && (
          <>
            {/* Event date+time picker */}
            <div style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:12,padding:10,marginBottom:10}}>
              <div style={{fontSize:11,color:C.sub,marginBottom:6}}>{t("Giờ G — ngày & giờ (tuỳ chọn)","Target date & time (optional)")}</div>
              <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                <input type="date" value={eventDateStr} onChange={e=>setEventDateStr(e.target.value)}
                  style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 10px",color:C.text,fontSize:13,colorScheme:"dark"}}/>
                <input type="time" value={eventTimeStr} onChange={e=>setEventTimeStr(e.target.value)}
                  style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 10px",color:C.text,fontSize:13,colorScheme:"dark"}}/>
                {(eventDateStr||eventTimeStr) && (
                  <button onClick={()=>{setEventDateStr("");setEventTimeStr("");}} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.sub,borderRadius:8,padding:"6px 8px",fontSize:11,cursor:"pointer"}}>{t("Xoá","Clear")}</button>
                )}
              </div>
              {remainingToEvent !== null && (
                <div style={{marginTop:8,fontSize:14,fontWeight:800,color:picked.color,fontVariantNumeric:"tabular-nums"}}>
                  ⏳ {rDays>0 && `${rDays}d `}{rHours}h {rMins}m
                </div>
              )}
            </div>

            {/* Prep plan */}
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:12,marginBottom:10}}>
              <div style={{fontSize:11,fontWeight:800,color:picked.color,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>
                {t("Kế hoạch chuẩn bị","Prep plan")}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {picked.prep.map((p,i) => {
                  // mark "active" when remaining time <= offset
                  const reachable = remainingToEvent !== null && remainingToEvent <= p.offsetH*3600000;
                  return (
                    <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                      <div style={{
                        flex:"0 0 auto", minWidth:78, fontSize:11, fontWeight:800,
                        color: reachable ? picked.color : C.sub,
                        background: reachable ? `${picked.color}20` : C.card2,
                        border:`1px solid ${reachable ? picked.color : C.border}`,
                        borderRadius:8, padding:"4px 8px", textAlign:"center",
                      }}>
                        {lang==="vi"?p.when_vi:p.when_en}
                      </div>
                      <div style={{fontSize:12,color:C.text,lineHeight:1.5,flex:1}}>{lang==="vi"?p.do_vi:p.do_en}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mục tiêu HÔM NAY & TUẦN NÀY (rút từ kế hoạch thực chiến) */}
            {eventMs && (() => {
              const startOfToday = new Date(); startOfToday.setHours(0,0,0,0);
              const endOfToday = startOfToday.getTime() + 86400000;
              const dow = (startOfToday.getDay()+6)%7; // 0=Mon
              const startOfWeek = startOfToday.getTime() - dow*86400000;
              const endOfWeek = startOfWeek + 7*86400000;
              const scheduled = picked.prep.map((p,i)=>({...p, idx:i, ts: eventMs - p.offsetH*3600000}));
              const today = scheduled.filter(s => s.ts >= startOfToday.getTime() && s.ts < endOfToday);
              const week  = scheduled.filter(s => s.ts >= startOfWeek && s.ts < endOfWeek && (s.ts < startOfToday.getTime() || s.ts >= endOfToday));
              const fmt = (ts:number) => {
                const d = new Date(ts);
                const wd = ["T2","T3","T4","T5","T6","T7","CN"][(d.getDay()+6)%7];
                const wdEn = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][(d.getDay()+6)%7];
                return `${lang==="vi"?wd:wdEn} ${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;
              };
              const storeKey = `ht_battle_tasks_${picked.id}_${eventDateStr||"today"}_${eventTimeStr||"x"}`;
              const getDone = (): Record<string,boolean> => { try { return JSON.parse(localStorage.getItem(storeKey)||"{}"); } catch { return {}; } };
              const Section = ({title,list}:{title:string;list:typeof scheduled}) => (
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:10,fontWeight:800,color:C.sub,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>{title}</div>
                  {list.length===0 ? (
                    <div style={{fontSize:11,color:C.sub,fontStyle:"italic"}}>{t("Không có việc trong khung này","Nothing in this window")}</div>
                  ) : list.map(s=>{
                    const done = !!getDone()[String(s.idx)];
                    return (
                      <label key={s.idx} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"6px 0",cursor:"pointer"}}>
                        <input type="checkbox" defaultChecked={done} onChange={e=>{
                          const cur = getDone(); cur[String(s.idx)] = e.target.checked;
                          localStorage.setItem(storeKey, JSON.stringify(cur));
                        }} style={{marginTop:3,accentColor:picked.color}}/>
                        <div style={{flex:1}}>
                          <div style={{fontSize:11,fontWeight:800,color:picked.color}}>{fmt(s.ts)} · {lang==="vi"?s.when_vi:s.when_en}</div>
                          <div style={{fontSize:12,color:C.text,lineHeight:1.5}}>{lang==="vi"?s.do_vi:s.do_en}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              );
              return (
                <div style={{background:`${picked.color}10`,border:`1px solid ${picked.color}50`,borderRadius:12,padding:12,marginBottom:10}}>
                  <div style={{fontSize:11,fontWeight:800,color:picked.color,letterSpacing:1,textTransform:"uppercase",marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
                    <Target size={14}/> {t("Mục tiêu lấy từ kế hoạch","Goals from plan")}
                  </div>
                  <Section title={t("Hôm nay","Today")} list={today}/>
                  <Section title={t("Tuần này (khác hôm nay)","This week (other days)")} list={week}/>
                </div>
              );
            })()}

            {/* Live session info + start */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:10}}>
              <div style={{fontSize:11,color:C.sub}}>
                {picked.phases.length} phase · ~{totalMin} {t("phút","min")}
              </div>
              <div style={{display:"flex",gap:3}}>
                {picked.phases.map((p,i)=>(<div key={i} style={{width:14,height:5,borderRadius:3,background:CUE_META[p.cue].color}}/>))}
              </div>
            </div>
            <button onClick={startSession} style={{
              width:"100%", background:`linear-gradient(90deg, ${C.danger}, ${picked.color})`,
              border:"none", borderRadius:12, padding:"12px 16px", color:"#fff",
              fontWeight:800, fontSize:14, cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            }}>
              <Flame size={18}/> {t("Vào phiên thực chiến","Enter live session")}
            </button>
          </>
        )}
      </div>

      {/* Player */}
      {open && picked && phase && (() => {
        const cue = CUE_META[phase.cue];
        const mm = String(Math.floor(remaining/60)).padStart(2,"0");
        const ss = String(remaining%60).padStart(2,"0");
        return (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.95)",zIndex:100,display:"flex",flexDirection:"column",padding:20,color:C.text,maxWidth:480,margin:"0 auto"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <div>
                <div style={{fontSize:10,color:C.sub,letterSpacing:1.5,textTransform:"uppercase"}}>{t("Phase","Phase")} {phaseIdx+1}/{picked.phases.length}</div>
                <div style={{fontSize:14,fontWeight:800,color:picked.color}}>{lang==="vi"?picked.title_vi:picked.title_en}</div>
              </div>
              <button onClick={()=>{setRunning(false);setOpen(false);}} style={{background:"none",border:"none",color:C.sub,cursor:"pointer"}}><X size={24}/></button>
            </div>
            <div style={{height:4,background:C.card2,borderRadius:2,overflow:"hidden",marginBottom:24}}>
              <div style={{height:"100%",width:`${overallPct}%`,background:picked.color,transition:"width .5s"}}/>
            </div>
            <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:20}}>
              <div style={{
                width:240,height:240,borderRadius:"50%",
                background:`radial-gradient(circle, ${cue.color}40 0%, transparent 70%)`,
                border:`3px solid ${cue.color}`,
                display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                animation: running ? "pulse 2s ease-in-out infinite" : "none",
                boxShadow:`0 0 60px ${cue.color}80`,
              }}>
                <div style={{fontSize:48,marginBottom:4}}>{cue.emoji}</div>
                <div style={{fontSize:11,color:cue.color,fontWeight:800,letterSpacing:2,textTransform:"uppercase"}}>{lang==="vi"?cue.label_vi:cue.label_en}</div>
                <div style={{fontSize:56,fontWeight:900,fontVariantNumeric:"tabular-nums",color:C.text,marginTop:8,lineHeight:1}}>{mm}:{ss}</div>
              </div>
              <div style={{textAlign:"center",padding:"0 12px"}}>
                <div style={{fontSize:18,fontWeight:800,color:C.text,marginBottom:6}}>{lang==="vi"?phase.name_vi:phase.name_en}</div>
                <div style={{fontSize:13,color:C.accent,lineHeight:1.5}}>💡 {lang==="vi"?phase.hint_vi:phase.hint_en}</div>
              </div>
            </div>
            <div style={{display:"flex",gap:10,marginTop:20}}>
              <button onClick={()=>{setPhaseIdx(0);setRemaining(picked.phases[0].seconds);setRunning(false);}} style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 18px",color:C.sub,cursor:"pointer"}}><X size={18}/></button>
              <button onClick={()=>setRunning(r=>!r)} style={{flex:1,background:`linear-gradient(90deg, ${C.danger}, ${picked.color})`,border:"none",borderRadius:14,padding:"14px",color:"#fff",fontWeight:800,fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                {running ? <><Pause size={20}/> {t("Tạm dừng","Pause")}</> : <><Play size={20}/> {t("Bắt đầu","Go")}</>}
              </button>
              <button onClick={()=>{ if(phaseIdx+1<picked.phases.length){ setPhaseIdx(phaseIdx+1); setRemaining(picked.phases[phaseIdx+1].seconds);} }} style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 18px",color:C.sub,cursor:"pointer"}}><SkipForward size={18}/></button>
            </div>
            <style>{`@keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.05);opacity:.85} }`}</style>
          </div>
        );
      })()}
    </div>
  );
}
