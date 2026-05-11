// @ts-nocheck
/**
 * SleepCycle — Tính toán chu kỳ giấc ngủ 90 phút.
 * Ngủ đủ chu kỳ → tỉnh táo, hormone tốt → testosterone & phục hồi tối ưu cho thực chiến.
 */
import React, { useMemo, useState } from "react";
import { Moon, Sunrise, Bed } from "lucide-react";

const C = {
  card:"#0f0f18",card2:"#14141f",text:"#f0f0ff",sub:"#6b7280",
  accent:"#a78bfa",border:"#1e1e2e",sky:"#38bdf8",gold:"#fbbf24",
  green:"#10b981",warn:"#f59e0b",danger:"#ef4444",primary:"#7c3aed",
};

const fmt = (d: Date) => `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
const addMin = (d: Date, m: number) => { const x = new Date(d); x.setMinutes(x.getMinutes()+m); return x; };

const FALL_ASLEEP_MIN = 14; // trung bình 14 phút để ngủ thiếp đi
const CYCLE_MIN = 90;

interface Item { time: Date; cycles: number; hours: number; }

export default function SleepCycle({ lang = "vi" }: { lang?: "vi"|"en" }) {
  const t = (vi,en)=>lang==="vi"?vi:en;
  const [mode, setMode] = useState<"wake"|"sleep">("wake");
  const [wakeTime, setWakeTime] = useState("06:30");
  const [sleepNow, setSleepNow] = useState(false);

  const items: Item[] = useMemo(() => {
    if (mode === "wake") {
      const [h,m] = wakeTime.split(":").map(Number);
      if (isNaN(h)||isNaN(m)) return [];
      const wake = new Date(); wake.setHours(h,m,0,0);
      // 6 cycles = 9h, 5 = 7.5h, 4 = 6h, 3 = 4.5h
      return [6,5,4,3].map(c => {
        const sleep = addMin(wake, -(c*CYCLE_MIN + FALL_ASLEEP_MIN));
        return { time: sleep, cycles: c, hours: c*1.5 };
      });
    } else {
      const start = sleepNow ? new Date() : (() => {
        const [h,m] = wakeTime.split(":").map(Number);
        const d = new Date(); d.setHours(h,m,0,0); return d;
      })();
      // wake at end of cycles after fall-asleep buffer
      return [3,4,5,6].map(c => {
        const wake = addMin(start, FALL_ASLEEP_MIN + c*CYCLE_MIN);
        return { time: wake, cycles: c, hours: c*1.5 };
      });
    }
  }, [mode, wakeTime, sleepNow]);

  const ratingOf = (c: number) => {
    if (c >= 5) return { label: t("Tối ưu","Optimal"),     color: C.green };
    if (c === 4) return { label: t("Tạm ổn","Okay"),       color: C.warn  };
    return                { label: t("Thiếu ngủ","Short"), color: C.danger };
  };

  return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:18,padding:14,marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
        <Moon size={18} color={C.accent}/>
        <div style={{fontSize:14,fontWeight:800,color:C.text}}>{t("Chu kỳ giấc ngủ","Sleep Cycle")}</div>
        <span style={{marginLeft:"auto",fontSize:10,color:C.sub}}>90' × N + 14'</span>
      </div>
      <div style={{fontSize:11,color:C.sub,marginBottom:10,lineHeight:1.5}}>
        {t("Ngủ đủ chu kỳ giúp testosterone đỉnh & cơ thể phục hồi cho thực chiến.",
          "Complete cycles peak your testosterone & recovery for live battles.")}
      </div>

      {/* Mode tabs */}
      <div style={{display:"flex",background:C.card2,borderRadius:10,padding:3,marginBottom:10,gap:3}}>
        <button onClick={()=>setMode("wake")} style={{flex:1,background:mode==="wake"?C.primary:"transparent",border:"none",borderRadius:8,padding:"8px",color:mode==="wake"?"#fff":C.sub,fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
          <Sunrise size={14}/> {t("Tôi muốn DẬY lúc","I want to WAKE at")}
        </button>
        <button onClick={()=>setMode("sleep")} style={{flex:1,background:mode==="sleep"?C.primary:"transparent",border:"none",borderRadius:8,padding:"8px",color:mode==="sleep"?"#fff":C.sub,fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
          <Bed size={14}/> {t("Tôi NGỦ lúc","I SLEEP at")}
        </button>
      </div>

      {/* Inputs */}
      {mode === "wake" ? (
        <input type="time" value={wakeTime} onChange={e=>setWakeTime(e.target.value)}
          style={{width:"100%",background:C.card2,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",color:C.text,fontSize:14,marginBottom:10,colorScheme:"dark"}}/>
      ) : (
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          <button onClick={()=>setSleepNow(true)} style={{flex:1,background:sleepNow?C.accent:C.card2,border:`1px solid ${sleepNow?C.accent:C.border}`,borderRadius:10,padding:"10px",color:sleepNow?"#000":C.text,fontWeight:700,cursor:"pointer",fontSize:12}}>
            {t("Ngủ ngay bây giờ","Sleep right now")}
          </button>
          <input type="time" disabled={sleepNow} value={wakeTime} onChange={e=>{ setSleepNow(false); setWakeTime(e.target.value); }}
            style={{flex:1,background:C.card2,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",color:sleepNow?C.sub:C.text,fontSize:14,colorScheme:"dark",opacity:sleepNow?.5:1}}/>
        </div>
      )}

      {/* Results */}
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {items.map((it,i) => {
          const rate = ratingOf(it.cycles);
          return (
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,background:C.card2,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px"}}>
              <div style={{fontSize:18,fontVariantNumeric:"tabular-nums",fontWeight:900,color:rate.color,minWidth:60}}>{fmt(it.time)}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:12,color:C.text,fontWeight:700}}>{it.cycles} {t("chu kỳ","cycles")} · {it.hours}h</div>
                <div style={{fontSize:10,color:rate.color,fontWeight:700}}>{rate.label}</div>
              </div>
              <div style={{display:"flex",gap:2}}>
                {Array.from({length:it.cycles}).map((_,k)=>(<div key={k} style={{width:6,height:14,background:rate.color,borderRadius:2,opacity:.8}}/>))}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{fontSize:10,color:C.sub,marginTop:8,fontStyle:"italic",lineHeight:1.5}}>
        💡 {t("Cộng 14 phút để cơ thể chìm vào giấc ngủ. Ưu tiên 5–6 chu kỳ.",
              "Adds 14 min to fall asleep. Aim for 5–6 cycles.")}
      </div>
    </div>
  );
}
