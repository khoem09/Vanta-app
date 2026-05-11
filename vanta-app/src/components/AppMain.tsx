// @ts-nocheck
import { Home, BarChart2, Trophy, HeartPulse, MessageCircle, User, Timer, Flame, Medal, Crown, Gem, Star, CheckCircle, Dumbbell, Camera, Film, Calendar, Globe, Image as ImageIcon, ClipboardList, Languages, RefreshCw, Pencil, Settings, History } from "lucide-react";
// @ts-nocheck
/* Ported from App.js — do not edit by hand without re-syncing. */
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import ChatTab from "./ChatTab";
import TrainingTab from "./TrainingTab";
// DailyWheel removed — challenges are now shown directly without the spinning wheel UI.
import MuscleRecoveryPanel from "@/components/MuscleRecoveryPanel";
import { exerciseMuscles, exerciseCategory, EXERCISES } from "@/lib/exercise-data";
import { getNovYearTheme } from "@/lib/nov-yearly-goals";
import vantaLogo from "@/assets/vanta-logo.png";

// ── Suggested time-of-day presets for edging / shoot sessions ────────────
// Times are interpreted in the user's selected timezone (see world-time.ts).
const SUGGESTED_EDGE_TIMES = [
  { value: "06:30", labelVi: "Sáng sớm",     labelEn: "Early morning" },
  { value: "12:30", labelVi: "Giữa trưa",    labelEn: "Midday" },
  { value: "18:00", labelVi: "Đầu tối",      labelEn: "Early evening" },
  { value: "21:30", labelVi: "Trước khi ngủ", labelEn: "Before bed" },
];
const SUGGESTED_SHOOT_TIMES = [
  { value: "07:00", labelVi: "Sau khi ngủ dậy", labelEn: "After waking" },
  { value: "13:00", labelVi: "Sau bữa trưa",    labelEn: "After lunch" },
  { value: "20:00", labelVi: "Tối thư giãn",    labelEn: "Relaxing evening" },
  { value: "22:30", labelVi: "Trước khi ngủ",   labelEn: "Before bed" },
];

// Scientific rep/set defaults based on goal & age (NSCA / ACSM guidelines)
// goal: -500 = lose weight (endurance/fat-loss), 0 = maintain (hypertrophy), 500 = gain (strength)
const suggestSetsReps = (age, goal) => {
  let sets = 3, reps = 10;
  if (goal <= -500)      { sets = 3; reps = 15; }   // endurance / fat loss
  else if (goal === 0)   { sets = 4; reps = 10; }   // hypertrophy
  else                   { sets = 5; reps = 6;  }   // strength / mass

  // Age modifiers — older lifters: lower volume, moderate reps for joint safety
  if (age >= 50)      { sets = Math.max(2, sets - 1); reps = Math.max(8, Math.min(12, reps)); }
  else if (age >= 40) { reps = Math.max(8, Math.min(12, reps)); }
  else if (age <= 18) { sets = Math.max(2, sets - 1); reps = Math.max(reps, 10); }
  return { sets, reps };
};

// US-Navy body-fat formula (cm). Returns % rounded to 1 decimal, or null if invalid.
const calcBodyFatNavy = ({ gender, height, neck, waist, hip }) => {
  const h = +height, n = +neck, w = +waist, hp = +hip;
  if (!h || !n || !w) return null;
  if (gender === "male") {
    if (w - n <= 0) return null;
    const bf = 86.010 * Math.log10(w - n) - 70.041 * Math.log10(h) + 36.76;
    return Math.max(2, Math.min(60, +bf.toFixed(1)));
  } else {
    if (!hp || (w + hp - n) <= 0) return null;
    const bf = 163.205 * Math.log10(w + hp - n) - 97.684 * Math.log10(h) - 78.387;
    return Math.max(5, Math.min(60, +bf.toFixed(1)));
  }
};
const bodyFatCategory = (bf, gender, lang) => {
  if (bf == null) return { label: "—", color: "#6b7280" };
  const t = (vi, en) => lang === "vi" ? vi : en;
  const ranges = gender === "male"
    ? [[5,"Thiết yếu","Essential","#38bdf8"],[14,"Vận động viên","Athlete","#10b981"],[18,"Thể thao","Fitness","#10b981"],[25,"Trung bình","Average","#fbbf24"],[100,"Béo phì","Obese","#ef4444"]]
    : [[13,"Thiết yếu","Essential","#38bdf8"],[21,"Vận động viên","Athlete","#10b981"],[25,"Thể thao","Fitness","#10b981"],[32,"Trung bình","Average","#fbbf24"],[100,"Béo phì","Obese","#ef4444"]];
  for (const [max, vi, en, col] of ranges) if (bf <= max) return { label: t(vi, en), color: col };
  return { label: t("—","—"), color: "#6b7280" };
};
import {
  worldNow,
  getTimezone,
  setTimezone,
  getBrowserTimezone,
  formatInTZ,
  partsInTZ,
  COMMON_TIMEZONES,
} from "@/lib/world-time";

const C = {
  bg:"transparent",card:"#0a0613",card2:"#0f0a1c",primary:"#a78bfa",
  accent:"#c4b5fd",text:"#f5f3ff",sub:"#a5a3c4",danger:"#ef4444",
  warn:"#f59e0b",green:"#10b981",sky:"#60a5fa",border:"#2a2347",
  surface:"#120c24",gold:"#fbbf24",pink:"#f472b6",navy:"#1e1b4b",
  gradient:"#0d0820",
};

// Age group index: 0=16-19, 1=20-29, 2=30-39, 3=40-49, 4=50-59, 5=60+
const AGE_RECS = {
  16:{max:3, edgeMax:5, edgeDuration:{min:10,max:20}, label:"16–19",recovery:72,note:"Testosterone still developing.",ageGroup:0},
  20:{max:4, edgeMax:8, edgeDuration:{min:15,max:30}, label:"20–29",recovery:48,note:"Peak hormone years.",ageGroup:1},
  30:{max:3, edgeMax:7, edgeDuration:{min:20,max:40}, label:"30–39",recovery:56,note:"Recovery slows.",ageGroup:2},
  40:{max:2, edgeMax:5, edgeDuration:{min:20,max:45}, label:"40–49",recovery:72,note:"Testosterone declining.",ageGroup:3},
  50:{max:2, edgeMax:4, edgeDuration:{min:15,max:35}, label:"50–59",recovery:96,note:"Longer recovery needed.",ageGroup:4},
  60:{max:1, edgeMax:3, edgeDuration:{min:10,max:25}, label:"60+",recovery:120,note:"Quality over quantity.",ageGroup:5},
};

const getAgeRec = age => {
  if(age<=19) return AGE_RECS[16];
  if(age<=29) return AGE_RECS[20];
  if(age<=39) return AGE_RECS[30];
  if(age<=49) return AGE_RECS[40];
  if(age<=59) return AGE_RECS[50];
  return AGE_RECS[60];
};

// Daily challenges - ring and clamp only (safe accessories)
// ageGroup >= 1 (20+) for all, no restricted challenges
const DAILY_CHALLENGES = [
  {id:"ring", icon:"💍", name_vi:"Đeo Cock Ring", name_en:"Cock Ring", desc_vi:"Đeo cock ring trong suốt phiên edging hoặc khi bắn", desc_en:"Wear a cock ring throughout your edging or shoot session.", minAgeGroup:0},
  {id:"clamp", icon:"🗜️", name_vi:"Kẹp núm vú", name_en:"Nipple Clamps", desc_vi:"Đeo kẹp núm vú trong suốt phiên edging hoặc khi bắn", desc_en:"Wear nipple clamps throughout your edging or shoot session.", minAgeGroup:0},
  {id:"ring_edge", icon:"💍⏳", name_vi:"Cock Ring + Edging kéo dài", name_en:"Cock Ring + Extended Edge", desc_vi:"Đeo cock ring và giữ edging tối thiểu 20 phút", desc_en:"Wear a cock ring and sustain edging for at least 20 minutes.", minAgeGroup:1},
  {id:"clamp_edge", icon:"🗜️⏳", name_vi:"Kẹp núm vú + Edging kép", name_en:"Nipple Clamps + Double Edge", desc_vi:"Đeo kẹp núm vú và thực hiện ít nhất 2 lần edging", desc_en:"Wear nipple clamps and complete at least 2 edging sessions.", minAgeGroup:1},
  {id:"ring_clamp", icon:"💍🗜️", name_vi:"Cock Ring + Kẹp núm vú", name_en:"Cock Ring + Nipple Clamps", desc_vi:"Đeo cả cock ring và kẹp núm vú trong phiên edging hoặc khi bắn", desc_en:"Wear both a cock ring and nipple clamps during your edging or shoot session.", minAgeGroup:2},
  {id:"rest", icon:"🧘", name_vi:"Ngày nghỉ ngơi", name_en:"Rest Day", desc_vi:"Không có thử thách hôm nay – tập trung phục hồi", desc_en:"No challenge today – focus on recovery", minAgeGroup:0},
  {id:"free", icon:"🌿", name_vi:"Thoải mái", name_en:"Free Day", desc_vi:"Không có gì cả – cứ thoải mái, làm điều bạn thích", desc_en:"Nothing required – just relax and do what you like", minAgeGroup:0},
];

// Shoot-day-only random challenges
// "polishing_head" stays at its original ~10% solo rate (kept rare/special).
// All other post-shoot product challenges share equal weight in the random pool.
const SHOOT_DAY_CHALLENGES = [
  {id:"polishing_head", icon:"✨", name_vi:"Polishing Head", name_en:"Polishing the Head", desc_vi:"Chà đầu (polishing head) liên tục cho đến khi bắn", desc_en:"Keep polishing the head non-stop until you ejaculate.", minAgeGroup:0, solo:true},
  // Post-shoot product handling — equal-weight random pool
  {id:"swallow",      icon:"👅", name_vi:"Nuốt thành phẩm",     name_en:"Swallow It",            desc_vi:"Sau khi bắn, nuốt toàn bộ thành phẩm.",                          desc_en:"After shooting, swallow the entire load.", minAgeGroup:1},
  {id:"taste",        icon:"😋", name_vi:"Nếm thử",              name_en:"Taste It",              desc_vi:"Nếm thử thành phẩm trên đầu lưỡi (không cần nuốt).",             desc_en:"Place the load on the tip of your tongue and taste it (no need to swallow).", minAgeGroup:1},
  {id:"dry",          icon:"🌬️", name_vi:"Để khô tự nhiên",      name_en:"Let It Air-Dry",        desc_vi:"Bắn lên bụng/ngực và để khô tự nhiên, không lau trong 30 phút.",  desc_en:"Shoot on your belly or chest and let it air-dry for 30 minutes without wiping.", minAgeGroup:0},
  {id:"yogurt",       icon:"🥛", name_vi:"Trộn sữa chua",        name_en:"Mix With Yogurt",       desc_vi:"Bắn vào hũ sữa chua, trộn đều và ăn hết.",                         desc_en:"Shoot into a cup of yogurt, stir well, and eat all of it.", minAgeGroup:1},
  {id:"spoon",        icon:"🥄", name_vi:"Hứng vào thìa",        name_en:"Catch on a Spoon",      desc_vi:"Hứng thành phẩm vào thìa, ngắm 10 giây rồi ăn.",                  desc_en:"Catch the load on a spoon, admire it for 10 seconds, then swallow it.", minAgeGroup:1},
  {id:"face",         icon:"🫣", name_vi:"Bắn lên mặt",          name_en:"Shoot on Your Face",    desc_vi:"Bắn lên mặt mình (cẩn thận tránh mắt) và giữ trong 5 phút.",      desc_en:"Shoot on your own face (carefully avoid the eyes) and leave it on for 5 minutes.", minAgeGroup:1},
  {id:"mirror_lick",  icon:"🪞", name_vi:"Bắn lên gương & liếm", name_en:"Shoot on a Mirror & Lick", desc_vi:"Bắn lên gương, sau đó liếm sạch.",                              desc_en:"Shoot on a mirror, then lick it completely clean.", minAgeGroup:1},
  {id:"toast",        icon:"🍞", name_vi:"Phết lên bánh",        name_en:"Spread on Bread",       desc_vi:"Bắn lên một miếng bánh mì/bánh quy và ăn hết.",                    desc_en:"Shoot onto a piece of bread or a cracker and eat the whole thing.", minAgeGroup:1},
  {id:"hold_mouth",   icon:"💋", name_vi:"Ngậm 1 phút",          name_en:"Hold in Mouth for 1 Min", desc_vi:"Bắn vào miệng và ngậm tối thiểu 1 phút trước khi nuốt/nhổ.",       desc_en:"Shoot directly into your mouth and hold it for at least 1 minute before swallowing or spitting.", minAgeGroup:1},
  {id:"freeze",       icon:"🧊", name_vi:"Đông đá",              name_en:"Freeze It",             desc_vi:"Hứng vào khay đá nhỏ, đông lạnh để dùng sau.",                      desc_en:"Catch it in a small ice tray and freeze it for later use.", minAgeGroup:2},
  {id:"drink_mix",    icon:"🥤", name_vi:"Pha vào đồ uống",      name_en:"Mix Into a Drink",      desc_vi:"Bắn vào ly đồ uống yêu thích, khuấy đều và uống hết.",              desc_en:"Shoot into a glass of your favorite drink, stir well, and drink it all.", minAgeGroup:1},
  {id:"body_rub",     icon:"🧴", name_vi:"Bôi đầy người",        name_en:"Rub All Over Body",     desc_vi:"Sau khi bắn, bôi thành phẩm khắp người (ngực, bụng, tay, chân) như kem dưỡng và để tự thấm trong 15 phút.", desc_en:"After shooting, rub the load all over your body (chest, belly, arms, legs) like lotion and let it absorb for 15 minutes.", minAgeGroup:1},
  // ===== Combo challenges (accessory + post-shoot handling) =====
  {id:"clamp_dry",        icon:"🗜️🌬️",  name_vi:"Kẹp + Để khô",            name_en:"Clamps + Air-Dry",            desc_vi:"Đeo kẹp núm vú trong suốt phiên, sau khi bắn để thành phẩm khô tự nhiên 30 phút.",       desc_en:"Wear nipple clamps the whole session, then let the load air-dry for 30 minutes after shooting.", minAgeGroup:1},
  {id:"ring_swallow",     icon:"💍👅",   name_vi:"Ring + Nuốt",             name_en:"Ring + Swallow",              desc_vi:"Đeo cock ring suốt phiên, sau khi bắn nuốt toàn bộ thành phẩm.",                          desc_en:"Wear a cock ring the whole session, then swallow the entire load after shooting.", minAgeGroup:1},
  {id:"clamp_ring_yogurt",icon:"🗜️💍🥛", name_vi:"Kẹp + Ring + Sữa chua",   name_en:"Clamps + Ring + Yogurt",       desc_vi:"Đeo cả kẹp núm vú và cock ring trong phiên, sau khi bắn trộn vào hũ sữa chua và ăn hết.", desc_en:"Wear both nipple clamps and a cock ring, then mix the load into a yogurt cup and finish it.", minAgeGroup:2},
  {id:"ring_dry",         icon:"💍🌬️",   name_vi:"Ring + Để khô",           name_en:"Ring + Air-Dry",              desc_vi:"Đeo cock ring suốt phiên, bắn lên bụng/ngực và để khô tự nhiên 30 phút.",                  desc_en:"Wear a cock ring the whole session, then shoot on your belly/chest and let it air-dry 30 min.", minAgeGroup:1},
  {id:"clamp_swallow",    icon:"🗜️👅",   name_vi:"Kẹp + Nuốt",              name_en:"Clamps + Swallow",            desc_vi:"Đeo kẹp núm vú suốt phiên, sau khi bắn nuốt toàn bộ thành phẩm.",                          desc_en:"Wear nipple clamps the whole session, then swallow the load after shooting.", minAgeGroup:1},
  {id:"ring_yogurt",      icon:"💍🥛",   name_vi:"Ring + Sữa chua",         name_en:"Ring + Yogurt",                desc_vi:"Đeo cock ring suốt phiên, bắn vào sữa chua rồi trộn đều và ăn hết.",                       desc_en:"Wear a cock ring the whole session, then shoot into yogurt, stir and eat it all.", minAgeGroup:1},
  {id:"clamp_ring_swallow",icon:"🗜️💍👅",name_vi:"Kẹp + Ring + Nuốt",      name_en:"Clamps + Ring + Swallow",      desc_vi:"Đeo cả kẹp và ring suốt phiên, sau khi bắn nuốt toàn bộ thành phẩm.",                      desc_en:"Wear both clamps and ring, then swallow the entire load after shooting.", minAgeGroup:2},
  {id:"clamp_taste",      icon:"🗜️😋",   name_vi:"Kẹp + Nếm thử",           name_en:"Clamps + Taste",              desc_vi:"Đeo kẹp núm vú suốt phiên, sau khi bắn đặt thành phẩm lên đầu lưỡi để nếm.",               desc_en:"Wear nipple clamps the whole session, then place the load on your tongue tip to taste.", minAgeGroup:1},
  {id:"ring_hold_mouth",  icon:"💍💋",   name_vi:"Ring + Ngậm 1 phút",      name_en:"Ring + Hold in Mouth 1 min",  desc_vi:"Đeo cock ring suốt phiên, sau đó bắn vào miệng và ngậm tối thiểu 1 phút.",                desc_en:"Wear a cock ring the whole session, then shoot in your mouth and hold for 1 minute.", minAgeGroup:1},
  {id:"clamp_spoon",      icon:"🗜️🥄",   name_vi:"Kẹp + Hứng thìa",         name_en:"Clamps + Catch on Spoon",     desc_vi:"Đeo kẹp núm vú suốt phiên, hứng thành phẩm vào thìa, ngắm 10 giây rồi ăn.",               desc_en:"Wear nipple clamps the whole session, catch the load on a spoon, admire 10s, then eat it.", minAgeGroup:1},
  {id:"ring_toast",       icon:"💍🍞",   name_vi:"Ring + Phết bánh",        name_en:"Ring + Spread on Bread",      desc_vi:"Đeo cock ring suốt phiên, sau khi bắn phết lên bánh mì/bánh quy và ăn hết.",              desc_en:"Wear a cock ring the whole session, then spread the load on bread/cracker and eat it.", minAgeGroup:1},
  {id:"clamp_drink",      icon:"🗜️🥤",   name_vi:"Kẹp + Pha đồ uống",       name_en:"Clamps + Mix in Drink",       desc_vi:"Đeo kẹp núm vú suốt phiên, bắn vào ly đồ uống yêu thích, khuấy đều và uống hết.",         desc_en:"Wear nipple clamps the whole session, then shoot into your favorite drink, stir and finish it.", minAgeGroup:1},
  {id:"ring_freeze",      icon:"💍🧊",   name_vi:"Ring + Đông đá",          name_en:"Ring + Freeze",               desc_vi:"Đeo cock ring suốt phiên, hứng vào khay đá nhỏ và đông lạnh để dùng sau.",                desc_en:"Wear a cock ring the whole session, then catch the load in an ice tray and freeze it.", minAgeGroup:2},
  {id:"clamp_ring_dry",   icon:"🗜️💍🌬️",name_vi:"Kẹp + Ring + Để khô",     name_en:"Clamps + Ring + Air-Dry",     desc_vi:"Đeo cả kẹp và ring suốt phiên, bắn lên bụng/ngực và để khô tự nhiên 30 phút.",            desc_en:"Wear both clamps and ring, then shoot on your belly/chest and air-dry 30 minutes.", minAgeGroup:2},
  {id:"clamp_ring_taste", icon:"🗜️💍😋", name_vi:"Kẹp + Ring + Nếm",        name_en:"Clamps + Ring + Taste",       desc_vi:"Đeo cả kẹp và ring suốt phiên, sau khi bắn nếm thử thành phẩm trên đầu lưỡi.",            desc_en:"Wear both clamps and ring, then taste the load on the tip of your tongue.", minAgeGroup:2},
];
// Deterministic per-day shoot challenge.
// Polishing-head keeps its rare ~10% solo slot; on every other day a stable
// post-shoot product challenge is picked from the equal-weight pool so the
// shoot-day card ALWAYS shows something.
const getShootDayChallenge = (age) => {
  const rec = getAgeRec(age||25);
  const pool = SHOOT_DAY_CHALLENGES.filter(c => c.minAgeGroup <= rec.ageGroup);
  if (!pool.length) return null;
  // The shoot-day challenge comes straight from the wheel result so the
  // wheel is the single source of truth. If we don't have one yet (first
  // open of the day) generate a fresh random pick.
  let result = getWheelResult();
  if (!result || !result.shootId || !pool.find(c=>c.id===result.shootId)) {
    result = randomizeWheelResult(age, null);
  }
  return pool.find(c=>c.id===result.shootId) || pool[0];
};

// Maximum segments the wheel can render readably.
const MAX_WHEEL_SEGMENTS = 10;

// Build the full wheel item list. Includes ALL daily challenges (age-filtered)
// PLUS ALL shoot-day challenges (age-filtered) when today is a scheduled shoot
// day OR when the user hasn't set a schedule yet. If the combined pool exceeds
// MAX_WHEEL_SEGMENTS, randomly hide extras (deterministic per local day) but
// always keep `mustInclude` items (e.g. today's daily + shoot challenge).
const getWheelItems = (age, schedule, mustInclude=[]) => {
  const rec = getAgeRec(age||25);
  const dailyPool = DAILY_CHALLENGES.filter(c=>c.minAgeGroup<=rec.ageGroup);
  const today = partsInTZ(worldNow());
  const dow = today.dayOfWeek;
  const hasSchedule = !!(schedule && ((schedule.edge&&schedule.edge.length)||(schedule.shoot&&schedule.shoot.length)));
  const isShootToday = hasSchedule && (schedule.shoot||[]).includes(dow);
  const includeShoot = !hasSchedule || isShootToday;
  const shootPool = includeShoot
    ? SHOOT_DAY_CHALLENGES.filter(c=>c.minAgeGroup<=rec.ageGroup)
    : [];
  const seenIds = new Set();
  const uniq = [...dailyPool, ...shootPool].filter(c=>{
    if (seenIds.has(c.id)) return false;
    seenIds.add(c.id); return true;
  });
  if (uniq.length <= MAX_WHEEL_SEGMENTS) return uniq;
  const mustIds = new Set((mustInclude||[]).filter(Boolean).map(c=>c.id));
  const must = uniq.filter(c=>mustIds.has(c.id));
  const others = uniq.filter(c=>!mustIds.has(c.id));
  let seed = today.year*10000 + (today.month+1)*100 + today.day;
  const rand = () => { seed = (seed*9301+49297)%233280; return seed/233280; };
  const shuffled = others.map(o=>({o,r:rand()})).sort((a,b)=>a.r-b.r).map(x=>x.o);
  return [...must, ...shuffled].slice(0, MAX_WHEEL_SEGMENTS);
};

const getDailyChallenge = (age, schedule) => {
  const rec = getAgeRec(age);
  const ageGroup = rec.ageGroup;
  let available = DAILY_CHALLENGES.filter(c => c.minAgeGroup <= ageGroup);
  const today = partsInTZ(worldNow());
  const dow = today.dayOfWeek;
  const hasSchedule = !!(schedule && ((schedule.edge&&schedule.edge.length)||(schedule.shoot&&schedule.shoot.length)));
  const isScheduledToday = hasSchedule && ((schedule.edge||[]).includes(dow) || (schedule.shoot||[]).includes(dow));
  if (isScheduledToday) {
    available = available.filter(c => c.id !== 'rest');
  }
  // Daily challenge is whatever the wheel landed on for today. If no spin
  // has happened yet (first open of the day), pick a fresh random target.
  let result = getWheelResult();
  if (!result || !result.dailyId || !available.find(c=>c.id===result.dailyId)) {
    result = randomizeWheelResult(age, schedule);
  }
  return available.find(c=>c.id===result.dailyId) || available[0];
};

const T = {
  en:{
    appTitle:"Tracker",appSub:"Stay consistent",
    home:"Home",browser:"Browse",history:"History",stats:"Stats",challenges:"Challenges",nutrition:"Health",user:"User",
    logShoot:"Shoot 💦",logEdge:"Edging ⏳",editSession:"Edit",saveChanges:"Save",
    reset:"Reset",resetConfirm:"Reset your streak? History stays intact.",
    streak:"DAYS TRACKED",edgeCount:"EDGES",longest:"Best Gap",last:"Last",never:"Never",
    startStreak:"Start Today",firstDay:"First Day!",incredible:"Incredible!",keepGoing:"Keep Going!",
    startMsg:"Log your first shoot to begin",currentStreak:"Continuous tracking",
    recoveryStatus:"Recovery",recovered:"recovered",
    recentSessions:"Recent",noSessions:"No sessions yet",
    timestamp:"Time",setCustomTime:"Custom time",
    notes:"Notes",notesPlaceholder:"How do you feel?",
    edit:"Edit",del:"Del",deleteConfirm:"Delete this session?",
    now:"Now",justNow:"Just now",ago:"ago",yesterday:"Yesterday",
    levels:["Recharging","Recovering","Restored","Optimized","Peak"],
    insightsTitle:"Recovery Insights",insightsSub:"Science-backed notes",
    badges:"Badges",noBadges:"Keep going to earn badges!",
    challengesTitle:"Challenges",challengesSub:"Set a goal and track progress",
    edgeGoalTitle:"Edging Challenges (This Week)",
    active:"Active",completed:"Done",
    statsTitle:"Statistics",statsSub:"Your journey at a glance",
    totalDays:"Total Days",successRate:"Success",avgStreak:"Avg Streak",thisMonth:"This Month",
    heatmap:"Activity Map",weeklyChart:"Weekly",
    lang:"EN",switchLang:"VI",
    ageLabel:"Age",weeklyLimit:"Weekly limit",recoverySafe:"Recovery time",
    nextShootTitle:"Time until next shoot",readyToShoot:"You can shoot now ✅",
    waitMore:"Wait",ageGroupShort:"Age group",
    warnTitle:"⚠️ Health Warning",warnBody:"You haven't fully recovered yet.",
    warnForce:"Log anyway",warnCancel:"Wait, I'll recover first",
    thisWeek:"This week",ofMax:"/ max",overLimit:"Over limit!",
    ageSetup:"Set your age for personalized recommendations",ageSave:"Save",
    quotesEditTitle:"Custom Quotes",quotePlaceholder:"Type a new quote...",addQuote:"Add",
    quotes:["Discipline is choosing what you want most.","Every day is a new beginning.","Day one or one day — you decide."],
    nutritionSub:"Optimize your body & testosterone",bmiTitle:"BMI & Calories",
    height:"Height (cm)",weight:"Weight (kg)",activity:"Activity",goal:"Goal",
    actLevels:["Sedentary","Light","Moderate","Active","Very Active"],
    goalLevels:["Lose Weight","Maintain","Gain Weight"],
    dailyCal:"Daily Calories",macrosTitle:"Macros",protein:"Protein",fat:"Fat",carbs:"Carbs",
    foodTitle:"Testosterone-Boosting Foods",
    foods:[
      {name:"Oysters",desc:"Rich in Zinc for testosterone production.",icon:"🦪"},
      {name:"Eggs",desc:"Cholesterol & Vitamin D for hormone synthesis.",icon:"🥚"},
      {name:"Spinach",desc:"High in Magnesium, unbinds testosterone.",icon:"🥬"},
      {name:"Avocado",desc:"Healthy fats support hormone levels.",icon:"🥑"},
      {name:"Salmon",desc:"Omega-3 & Vitamin D.",icon:"🐟"},
      {name:"Pomegranate",desc:"Antioxidants and blood flow.",icon:"🍎"}
    ],
    dailyChallenge:"Today's Challenge",challengeCompleted:"Challenge Completed!",
    addPhoto:"Add Photo",photoAdded:"Photo saved",cropPhoto:"Crop & Save",
    edgeDuration:"Edging duration (min)",continuousTracking:"Continuous Tracking",
    trackingSince:"Tracking since",daysTracked:"Days tracked",
    photoViewer:"Photo Viewer",
    novChallengeTitle:"⚔️ November Edging Challenge",
    novChallengeSub:"Annual special challenge – November only",
    novChallengeRule1:"🚫 No shooting throughout November",
    novChallengeRule2:"⏳ Edging only – minimum 1 session per day",
    novChallengeRule3:"🎉 December 1st: You've earned it!",
    novJoinBtn:"Join Challenge",
    novDeclineBtn:"Decline this year",
    novDeclined:"You declined this year's challenge.",
    novActive:"Challenge Active 🔥",
    novCompleted:"🏆 Challenge Completed! You earned December 1st!",
    novFailed:"Challenge Failed 😞",
    novProgress:"Progress",
    novDaysEdged:"Days edged",
    novDaysMissed:"Days missed",
    novLogEdgeToday:"Log today's edging",
    novTodayDone:"✅ Today's edge done!",
    novCountdown:"Days remaining in November",
    novDec1Banner:"🎉 December 1st — You made it! Time to release!",
    novRestOfYear:"Challenge opens again next November.",
    novStreakWarning:"You missed a day! Keep going or the challenge is failed.",
    dob:"Date of birth",dobSave:"Save",dobTitle:"Enter your date of birth",
    userTab:"User",userInfo:"Profile",ageGroupLabel:"Age group",activityHistory:"Activity history",
    totalShoots:"Total shoots",totalEdges:"Total edges",memberSince:"Tracking since",
    recsTitle:"Recommendations by age group",viewRecs:"View safe recommendations",closeBtn:"Close",
    motivationTitle:"Motivation media",motivationDesc:"Add a photo or short video that inspires you — it shows up on the Home tab.",
    pickPhoto:"Pick photo",pickVideo:"Pick video",removePhoto:"Remove",
    ownerName:"Your name",ownerNamePh:"Enter your name (used for greetings)",saveOwner:"Save",ownerSaved:"Saved",
    greetingHi:"Hi",greetingDefault:"there",
    weeklyStats:"This week stats",
    schedTitle:"Weekly edging & shoot schedule",schedDesc:"Pick weekdays – we'll remind you",
    schedDays:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],
    schedShoot:"Shoot day",schedEdge:"Edge day",schedSave:"Save schedule",schedNone:"No schedule yet",
    schedHint:"You can set both edge and shoot on the same day",
    presets:"Suggestions by age group",applyPreset:"Apply",
    levelBalanced:"Balanced",levelStim:"Stimulating",levelExtreme:"Extreme",
    pickLevel:"Pick a schedule level (within safe limits for your age group)",
    reminderShoot:"💦 Today is a scheduled shoot day!",
    reminderEdge:"⏳ Today is a scheduled edging day!",
    polishHeadDay:"🎯 Shoot-day challenge",
    novRules:"Rules",
  },
  vi:{
    appTitle:"Tracker",appSub:"Kiên trì mỗi ngày",
    home:"Home",browser:"Browser",history:"Lịch sử",stats:"Thống kê",challenges:"Thử thách",nutrition:"Sức khỏe",user:"Người dùng",
    logShoot:"Bắn 💦",logEdge:"Edging ⏳",editSession:"Sửa",saveChanges:"Lưu",
    reset:"Reset",resetConfirm:"Reset streak? Lịch sử vẫn giữ.",
    streak:"NGÀY THEO DÕI",edgeCount:"LẦN",longest:"Khoảng cách dài nhất",last:"Lần cuối",never:"Chưa có",
    startStreak:"Bắt đầu nào!",firstDay:"Ngày đầu!",incredible:"Xuất sắc!",keepGoing:"Tiếp tục!",
    startMsg:"Chưa có dữ liệu Shoot",currentStreak:"Theo dõi liên tục",
    recoveryStatus:"Phục hồi",recovered:"đã phục hồi",
    recentSessions:"Gần đây",noSessions:"Chưa có",
    timestamp:"Thời gian",setCustomTime:"Thời gian tùy chỉnh",
    notes:"Ghi chú",notesPlaceholder:"Cảm giác thế nào?",
    edit:"Sửa",del:"Xóa",deleteConfirm:"Xóa buổi này?",
    now:"Bây giờ",justNow:"Vừa xong",ago:"trước",yesterday:"Hôm qua",
    levels:["Đang nạp","Đang phục hồi","Đã phục hồi","Tối ưu","Đỉnh cao"],
    insightsTitle:"Kiến thức",insightsSub:"Ghi chú khoa học",
    badges:"Huy hiệu",noBadges:"Tiếp tục để nhận huy hiệu!",
    challengesTitle:"Thử thách",challengesSub:"Đặt mục tiêu và theo dõi",
    edgeGoalTitle:"Thử thách Edging (Tuần này)",
    active:"Đang chạy",completed:"Hoàn thành",
    statsTitle:"Thống kê",statsSub:"Hành trình của bạn",
    totalDays:"Tổng ngày",successRate:"Thành công",avgStreak:"Streak TB",thisMonth:"Tháng này",
    heatmap:"Bản đồ",weeklyChart:"Tuần",
    lang:"VI",switchLang:"EN",
    ageLabel:"Tuổi",weeklyLimit:"Giới hạn tuần",recoverySafe:"Thời gian phục hồi",
    nextShootTitle:"Thời gian đến lần bắn kế tiếp",readyToShoot:"Bạn có thể bắn ngay ✅",
    waitMore:"Cần chờ",ageGroupShort:"Nhóm tuổi",
    warnTitle:"⚠️ Cảnh báo sức khỏe",warnBody:"Bạn chưa phục hồi hoàn toàn.",
    warnForce:"Tôi hiểu rủi ro – vẫn ghi",warnCancel:"Thôi, để cơ thể phục hồi",
    thisWeek:"Tuần này",ofMax:"/ tối đa",overLimit:"Vượt giới hạn!",
    ageSetup:"Nhập tuổi để nhận khuyến nghị phù hợp",ageSave:"Lưu",
    quotesEditTitle:"Tùy chỉnh câu động viên",quotePlaceholder:"Nhập câu nói mới...",addQuote:"Thêm",
    quotes:["Kỷ luật là lựa chọn điều bạn muốn nhất.","Mỗi ngày là một khởi đầu mới.","Một ngày nào đó hay ngày một — bạn quyết định."],
    nutritionSub:"Tối ưu hóa cơ thể & hormone",bmiTitle:"Tính BMI & Calories",
    height:"Chiều cao (cm)",weight:"Cân nặng (kg)",activity:"Vận động",goal:"Mục tiêu",
    actLevels:["Ít vận động","Nhẹ nhàng","Trung bình","Nhiều","Rất nhiều"],
    goalLevels:["Giảm cân","Giữ cân","Tăng cân"],
    dailyCal:"Calories Mục Tiêu",macrosTitle:"Chỉ số Macro (Gợi ý)",protein:"Đạm (Protein)",fat:"Béo (Fat)",carbs:"Tinh bột (Carbs)",
    foodTitle:"Thực phẩm Vàng cho Nam giới",
    foods:[
      {name:"Hàu biển",desc:"Chứa nhiều Kẽm, nòng cốt sản xuất testosterone.",icon:"🦪"},
      {name:"Trứng",desc:"Cholesterol tốt & Vitamin D tổng hợp hormone.",icon:"🥚"},
      {name:"Cải bó xôi",desc:"Giàu Magie, giúp giải phóng testosterone.",icon:"🥬"},
      {name:"Quả Bơ",desc:"Chất béo tốt bảo vệ mức testosterone trong máu.",icon:"🥑"},
      {name:"Cá hồi",desc:"Omega-3 & Vitamin D dồi dào, giảm căng thẳng.",icon:"🐟"},
      {name:"Quả Lựu",desc:"Chống oxy hóa, tăng cường lưu thông máu cực tốt.",icon:"🍎"}
    ],
    dailyChallenge:"Thử thách hôm nay",challengeCompleted:"Đã hoàn thành thử thách!",
    addPhoto:"Thêm ảnh",photoAdded:"Đã lưu ảnh",cropPhoto:"Cắt & Lưu",
    edgeDuration:"Thời lượng edging (phút)",continuousTracking:"Theo dõi liên tục",
    trackingSince:"Theo dõi từ",daysTracked:"Ngày đã ghi nhận",
    photoViewer:"Xem ảnh",
    novChallengeTitle:"⚔️ Thử Thách Edging Tháng 11",
    novChallengeSub:"Thử thách đặc biệt hàng năm – chỉ trong tháng 11",
    novChallengeRule1:"🚫 Không được bắn trong suốt tháng 11",
    novChallengeRule2:"⏳ Chỉ edging – tối thiểu 1 lần mỗi ngày",
    novChallengeRule3:"🎉 Ngày 1/12: Mới được bắn!",
    novJoinBtn:"Tham gia thử thách",
    novDeclineBtn:"Từ chối năm nay",
    novDeclined:"Bạn đã từ chối thử thách năm nay.",
    novActive:"Đang thử thách 🔥",
    novCompleted:"🏆 Hoàn thành! Bạn xứng đáng với ngày 1/12!",
    novFailed:"Thử thách thất bại 😞",
    novProgress:"Tiến độ",
    novDaysEdged:"Ngày đã edge",
    novDaysMissed:"Ngày bỏ lỡ",
    novLogEdgeToday:"Ghi nhận edging hôm nay",
    novTodayDone:"✅ Đã edge hôm nay!",
    novCountdown:"Ngày còn lại trong tháng 11",
    novDec1Banner:"🎉 Ngày 1/12 — Bạn đã làm được! Đến lúc giải phóng rồi!",
    novRestOfYear:"Thử thách mở lại vào tháng 11 năm sau.",
    novStreakWarning:"Bạn bỏ lỡ một ngày! Cố lên hoặc thử thách coi như thất bại.",
    dob:"Ngày sinh",dobSave:"Lưu",dobTitle:"Nhập ngày tháng năm sinh",
    userTab:"Người dùng",userInfo:"Thông tin",ageGroupLabel:"Nhóm tuổi",activityHistory:"Lịch sử hoạt động",
    totalShoots:"Tổng lần bắn",totalEdges:"Tổng lần edging",memberSince:"Bắt đầu theo dõi",
    recsTitle:"Khuyến nghị theo nhóm tuổi",viewRecs:"Xem khuyến nghị an toàn",closeBtn:"Đóng",
    motivationTitle:"Ảnh / Video động lực",motivationDesc:"Thêm ảnh hoặc video ngắn truyền cảm hứng — sẽ hiện ngay ở Home",
    pickPhoto:"Chọn ảnh",pickVideo:"Chọn video",removePhoto:"Xóa",
    ownerName:"Tên của bạn",ownerNamePh:"Nhập tên để app chào bạn thân thiện hơn",saveOwner:"Lưu",ownerSaved:"Đã lưu",
    greetingHi:"Chào",greetingDefault:"bạn",
    weeklyStats:"Thống kê tuần này",
    schedTitle:"Lịch edging & bắn theo tuần",schedDesc:"Chọn ngày trong tuần – ứng dụng sẽ nhắc bạn",
    schedDays:["CN","T2","T3","T4","T5","T6","T7"],
    schedShoot:"Ngày bắn",schedEdge:"Ngày edging",schedSave:"Lưu lịch",schedNone:"Chưa thiết lập lịch",
    schedHint:"Có thể chọn cả edging và bắn trong cùng một ngày",
    presets:"Gợi ý theo nhóm tuổi",applyPreset:"Áp dụng",
    levelBalanced:"Cân bằng",levelStim:"Kích thích",levelExtreme:"Cực hạn",
    pickLevel:"Chọn mức lịch (không vượt giới hạn an toàn theo nhóm tuổi)",
    reminderShoot:"💦 Hôm nay là ngày bắn theo lịch của bạn!",
    reminderEdge:"⏳ Hôm nay là ngày edging theo lịch của bạn!",
    polishHeadDay:"🎯 Thử thách ngày bắn",
    novRules:"Luật chơi",
  },
};

const BADGE_DEFS = [
  {id:"first",icon:"🌱",days:1,en:"First Step",vi:"Bước Đầu"},{id:"week",icon:<Flame size={16}/>,days:7,en:"On Fire",vi:"Bốc Lửa"},
  {id:"two_weeks",icon:"⚡",days:14,en:"Electric",vi:"Điện Khí"},{id:"month",icon:<Medal size={16}/>,days:30,en:"30-Day Hero",vi:"Anh Hùng"},
  {id:"two_months",icon:<Gem size={16}/>,days:60,en:"Diamond Will",vi:"Kim Cương"},{id:"three_months",icon:<Crown size={16}/>,days:90,en:"Champion",vi:"Vô Địch"},
  {id:"halfyear",icon:<Star size={16}/>,days:180,en:"Half-Year",vi:"Nửa Năm"},{id:"year",icon:"🏆",days:365,en:"Legend",vi:"Huyền Thoại"},
];

const BLOCKED_DOMAINS = [
  "doubleclick.net", "googleadservices.com", "googlesyndication.com",
  "adsystem.com", "adnexus.com", "criteo.com", "outbrain.com", "taboola.com",
  "popads.net", "popcash.net", "exoclick.com", "onclickads.net",
  "adsterra.com", "propellerads.com", "chitika.com", "infolinks.com", "mgid.com",
  "scorecardresearch.com", "quantserve.com", "criteo.net", "pornhub", "xnxx", "xvideos"
];

const isBlocked = url => {
  try {
    const host = new URL(url.startsWith("http")?url:"https://"+url).hostname.toLowerCase();
    return BLOCKED_DOMAINS.some(d=>host.includes(d));
  } catch { return false; }
};

const STORAGE_KEY="ht_sessions_v6";
const LANG_KEY="ht_lang_v5";
const CHALLENGES_KEY="ht_challenges_v5";
const AGE_KEY="ht_age_v3";
const QUOTES_KEY="ht_quotes_v2";
const TRACKING_START_KEY="ht_tracking_start_v1";
const CHALLENGE_LOG_KEY="ht_challenge_log_v1";
const NOV_CHALLENGE_KEY="ht_nov_challenge_v1";
const DOB_KEY="ht_dob_v1";
const MOTIVATION_KEY="ht_motivation_v1";
const MOTIVATION_OWNER_KEY="ht_motivation_owner_v1";
const SCHEDULE_KEY="ht_schedule_v1";
const LAST_REMIND_KEY="ht_last_remind_v1";
const BIRTHDAY_KEY="ht_birthday_v1";
const AVATAR_KEY="ht_avatar_v1";
const WHEEL_SEEN_KEY="ht_wheel_seen_v1"; // { 'YYYY-MM-DD': true }

const load=k=>{try{if(typeof window==='undefined')return null;const v=localStorage.getItem(k);return v?JSON.parse(v):null;}catch{return null;}};
const save=(k,v)=>{try{if(typeof window==='undefined')return;localStorage.setItem(k,JSON.stringify(v));}catch{}};

// Per-day wheel-spin result. The wheel REPLACES the deterministic random for
// both the daily-challenge and shoot-day challenge. A fresh random is picked
// the first time the wheel runs each local day, and again every time the user
// hits "Spin again". Stored per local day so reloading the app shows the same
// result until the user re-spins.
const WHEEL_RESULT_KEY="ht_wheel_result_v1"; // { 'YYYY-MM-DD': {dailyId, shootId} }
const _todayKey = () => {
  const p = partsInTZ(worldNow());
  const pad2 = n => String(n).padStart(2,'0');
  return `${p.year}-${pad2(p.month+1)}-${pad2(p.day)}`;
};
const getWheelResult = () => {
  const all = load(WHEEL_RESULT_KEY) || {};
  return all[_todayKey()] || null;
};
const writeWheelResult = (partial) => {
  const all = load(WHEEL_RESULT_KEY) || {};
  const k = _todayKey();
  const merged = { ...(all[k]||{}), ...partial };
  save(WHEEL_RESULT_KEY, { ...all, [k]: merged });
  return merged;
};
// Pick a fresh random target for both the daily and (when applicable) the
// shoot challenge, persist it, and return the new result.
const randomizeWheelResult = (age, schedule) => {
  const rec = getAgeRec(age||25);
  const today = partsInTZ(worldNow());
  const dow = today.dayOfWeek;
  const hasSchedule = !!(schedule && ((schedule.edge&&schedule.edge.length)||(schedule.shoot&&schedule.shoot.length)));
  const isScheduledToday = hasSchedule && ((schedule.edge||[]).includes(dow) || (schedule.shoot||[]).includes(dow));
  let dailyAvail = DAILY_CHALLENGES.filter(c => c.minAgeGroup <= rec.ageGroup);
  if (isScheduledToday) dailyAvail = dailyAvail.filter(c => c.id !== 'rest');
  const dailyPick = dailyAvail.length ? dailyAvail[Math.floor(Math.random()*dailyAvail.length)] : null;

  const isShootToday = hasSchedule && (schedule.shoot||[]).includes(dow);
  const includeShoot = !hasSchedule || isShootToday;
  let shootPick = null;
  if (includeShoot) {
    const shootPool = SHOOT_DAY_CHALLENGES.filter(c => c.minAgeGroup <= rec.ageGroup);
    if (shootPool.length) shootPick = shootPool[Math.floor(Math.random()*shootPool.length)];
  }
  const result = { dailyId: dailyPick?.id || null, shootId: shootPick?.id || null };
  const all = load(WHEEL_RESULT_KEY) || {};
  save(WHEEL_RESULT_KEY, { ...all, [_todayKey()]: result });
  return result;
};

// All STORAGE keys (used by backup/restore)
const ALL_KEYS=['ht_sessions_v6','ht_lang_v5','ht_challenges_v5','ht_age_v3','ht_quotes_v2','ht_tracking_start_v1','ht_challenge_log_v1','ht_nov_challenge_v1','ht_dob_v1','ht_motivation_v1','ht_schedule_v1','ht_last_remind_v1','ht_nov_test_v1','ht_birthday_v1','ht_avatar_v1'];

const exportData=()=>{
  try{
    const data={};
    ALL_KEYS.forEach(k=>{const v=localStorage.getItem(k);if(v!=null)data[k]=v;});
    const payload={version:1,exportedAt:new Date().toISOString(),data};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    const ts=new Date().toISOString().slice(0,10);
    a.href=url; a.download=`tracker-backup-${ts}.json`;
    document.body.appendChild(a); a.click();
    setTimeout(()=>{URL.revokeObjectURL(url);a.remove();},100);
  }catch(e){alert('Export failed: '+e.message);}
};

const importData=(file,onDone)=>{
  const reader=new FileReader();
  reader.onload=ev=>{
    try{
      const payload=JSON.parse(ev.target.result);
      const data=payload.data||payload;
      if(typeof data!=='object'||!data) throw new Error('Invalid file');
      Object.keys(data).forEach(k=>{
        if(ALL_KEYS.includes(k)) localStorage.setItem(k,data[k]);
      });
      onDone&&onDone(true);
    }catch(e){alert('Import failed: '+e.message);onDone&&onDone(false);}
  };
  reader.readAsText(file);
};

// November Edging Challenge helpers
const getNovChallengeState = () => load(NOV_CHALLENGE_KEY) || {status:"idle", year:null, dailyLog:{}};
const isNovember = () => partsInTZ(worldNow()).month === 10; // 0-indexed
const isDecember1st = () => { const p=partsInTZ(worldNow()); return p.month===11 && p.day===1; };
const getCurrentYear = () => partsInTZ(worldNow()).year;
const getNovDayKey = (d) => { const p=partsInTZ(d?new Date(d):worldNow()); return`${p.year}-11-${pad(p.day)}`; };
const novTodayKey = () => { const p=partsInTZ(worldNow()); return`${p.year}-${pad(p.month+1)}-${pad(p.day)}`; };
const countNovEdgeDays = (dailyLog) => Object.values(dailyLog).filter(Boolean).length;
const getNovDaysElapsed = () => { const p=partsInTZ(worldNow()); if(p.month!==10)return 0; return p.day; };
const getNovMissingDays = (dailyLog) => {
  const elapsed = getNovDaysElapsed();
  let missing=[];
  for(let i=1;i<=elapsed;i++){
    const k=`${getCurrentYear()}-11-${pad(i)}`;
    if(!dailyLog[k]) missing.push(i);
  }
  return missing;
};
const pad=n=>String(n).padStart(2,"0");
// Day key based on the user's selected timezone (defaults to browser local TZ).
const dayKey=d=>{const p=partsInTZ(new Date(d));return`${p.year}-${pad(p.month+1)}-${pad(p.day)}`;};
const todayKey=()=>dayKey(worldNow());

const getShoots = sessions => sessions.filter(s => s.type !== 'edge');
const getEdges = sessions => sessions.filter(s => s.type === 'edge');

// Continuous tracking: count from first session
const calcContinuousDays = (trackingStart) => {
  if (!trackingStart) return 0;
  return Math.floor((Date.now() - new Date(trackingStart).getTime()) / 86400000);
};

const calcLongest = sessions => {
  const shoots = getShoots(sessions);
  if (!shoots.length) return 0;
  const sorted = shoots.slice().sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
  let longest = 0;
  for (let i = 1; i < sorted.length; i++) {
    const days = Math.floor((new Date(sorted[i].timestamp).getTime() - new Date(sorted[i-1].timestamp).getTime()) / 86400000);
    if (days > longest) longest = days;
  }
  return longest;
};

const hoursSinceLast = sessions => {
  const shoots = getShoots(sessions);
  if(!shoots.length) return null;
  const last = shoots.slice().sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp))[0];
  return Math.floor((Date.now()-new Date(last.timestamp))/3600000);
};

const getThisWeekCount = items => {
  const now=new Date(),weekStart=new Date(now);
  weekStart.setDate(now.getDate()-now.getDay()+(now.getDay()===0?-6:1));
  weekStart.setHours(0,0,0,0);
  return items.filter(s=>new Date(s.timestamp)>=weekStart).length;
};

const fmtRelative=(ts,t)=>{
  const diff=worldNow().getTime()-new Date(ts).getTime(),m=Math.floor(diff/60000);
  if(m<1)return t.justNow;if(m<60)return`${m}m ${t.ago}`;
  const h=Math.floor(m/60);if(h<24)return`${h}h ${t.ago}`;
  const d=Math.floor(h/24);if(d===1)return t.yesterday;if(d<7)return`${d}d ${t.ago}`;
  return formatInTZ(ts, {day:"2-digit",month:"2-digit",year:"numeric"}, "en-GB");
};
const fmtDateTime=ts=>{
  return formatInTZ(ts, {day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:false}, "en-GB");
};

const LEVEL_DEFS=[
  {min:0,max:12,pct:10,color:"#ef4444"},{min:12,max:24,pct:30,color:"#f59e0b"},
  {min:24,max:48,pct:60,color:"#eab308"},{min:48,max:168,pct:85,color:"#10b981"},
  {min:168,max:Infinity,pct:100,color:"#a78bfa"},
];
const getLevel=(h,t)=>{
  const idx=h===null?4:LEVEL_DEFS.findIndex(l=>h>=l.min&&h<l.max);
  const def=LEVEL_DEFS[idx<0?4:idx];
  return{...def,label:t.levels[idx<0?4:idx]};
};

const AnimNum=({value,duration=800})=>{
  const [disp,setDisp]=useState(0);
  const raf=useRef();
  useEffect(()=>{
    const start=performance.now(),from=disp;
    const tick=now=>{
      const p=Math.min((now-start)/duration,1),ease=1-Math.pow(1-p,3);
      setDisp(Math.round(from+(value-from)*ease));
      if(p<1)raf.current=requestAnimationFrame(tick);
    };
    raf.current=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(raf.current);
  },[value]);
  return<span>{disp}</span>;
};

const Ring=({pct,size=120,stroke=9,color,children})=>{
  const r=(size-stroke)/2,circ=2*Math.PI*r;
  const [prog,setProg]=useState(0);
  useEffect(()=>{const t=setTimeout(()=>setProg(pct),100);return()=>clearTimeout(t);},[pct]);
  return(
    <div style={{position:"relative",width:size,height:size,display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
      <svg width={size} height={size} style={{position:"absolute",transform:"rotate(-90deg)"}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e1e2e" strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={circ*(1-prog/100)}
          strokeLinecap="round" style={{transition:"stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)"}}/>
      </svg>
      <div style={{position:"relative",zIndex:1,textAlign:"center"}}>{children}</div>
    </div>
  );
};

const Card=({children,style})=>(
  <div style={{background:C.card,borderRadius:20,padding:"16px 18px",marginBottom:12,border:`1px solid ${C.border}`,...style}}>
    {children}
  </div>
);

// ─── IMAGE CROP VIEWER ───────────────────────────────────────────────────────
const PhotoViewer=({src,onClose,onSave,t})=>{
  const canvasRef=useRef();
  const imgRef=useRef();
  const [crop,setCrop]=useState({x:0,y:0,w:100,h:100});
  const [dragging,setDragging]=useState(null);
  const [loaded,setLoaded]=useState(false);

  const drawCanvas=useCallback(()=>{
    if(!canvasRef.current||!imgRef.current||!loaded)return;
    const canvas=canvasRef.current;
    const ctx=canvas.getContext("2d");
    const img=imgRef.current;
    // Preserve aspect ratio: canvas matches the cropped region's actual pixel size
    const srcX=(crop.x/100)*img.naturalWidth;
    const srcY=(crop.y/100)*img.naturalHeight;
    const srcW=Math.max(1,(crop.w/100)*img.naturalWidth);
    const srcH=Math.max(1,(crop.h/100)*img.naturalHeight);
    // Cap output to a sensible max while keeping aspect ratio (no stretching)
    const MAX=600;
    const scale=Math.min(1, MAX/Math.max(srcW,srcH));
    canvas.width=Math.round(srcW*scale);
    canvas.height=Math.round(srcH*scale);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(img,srcX,srcY,srcW,srcH,0,0,canvas.width,canvas.height);
  },[crop,loaded]);

  useEffect(()=>{drawCanvas();},[drawCanvas]);

  const handleSave=()=>{
    if(!canvasRef.current)return;
    const dataUrl=canvasRef.current.toDataURL("image/jpeg",0.8);
    onSave(dataUrl);
  };

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.95)",zIndex:300,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:C.card,borderRadius:20,padding:20,width:"100%",maxWidth:380,border:`1px solid ${C.border}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <span style={{fontWeight:700,color:C.text,fontSize:15}}>🖼 {t.photoViewer}</span>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.sub,fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
        <img ref={imgRef} src={src} onLoad={()=>setLoaded(true)} alt="" style={{display:"none"}}/>
        <canvas ref={canvasRef} style={{maxWidth:"100%",height:"auto",borderRadius:12,border:`1px solid ${C.border}`,display:"block",marginBottom:14,marginInline:"auto",background:C.surface}}/>
        {/* Simple crop controls */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
          {[["X (%)",crop.x,(v)=>setCrop(p=>({...p,x:+v}))],["Y (%)",crop.y,(v)=>setCrop(p=>({...p,y:+v}))],["W (%)",crop.w,(v)=>setCrop(p=>({...p,w:+v}))],["H (%)",crop.h,(v)=>setCrop(p=>({...p,h:+v}))]].map(([lbl,val,fn])=>(
            <div key={lbl}>
              <div style={{fontSize:10,color:C.sub,marginBottom:3}}>{lbl}</div>
              <input type="range" min="0" max="100" value={val} onChange={e=>fn(e.target.value)} style={{width:"100%",accentColor:C.primary}}/>
              <div style={{fontSize:10,color:C.accent,textAlign:"right"}}>{val}</div>
            </div>
          ))}
        </div>
        <button onClick={handleSave} style={{width:"100%",background:`linear-gradient(135deg,${C.primary},#a855f7)`,color:"#fff",border:"none",borderRadius:12,padding:"12px",fontWeight:700,cursor:"pointer"}}>{t.cropPhoto}</button>
      </div>
    </div>
  );
};

// ─── VIDEO TRIMMER & FRAMERATE ───────────────────────────────────────────────
// Re-encodes the input video between [start,end] seconds at the chosen fps
// using canvas + MediaRecorder. Output is a webm data URL.
const VideoTrimmer = ({src, onClose, onSave, t, lang}) => {
  const videoRef = useRef();
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [fps, setFps] = useState(24);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const onLoaded = () => {
    const d = videoRef.current.duration || 0;
    setDuration(d);
    setStart(0);
    setEnd(Math.min(d, 15));
  };

  const seek = (s) => {
    if(videoRef.current){ videoRef.current.currentTime = Math.max(0,Math.min(duration,s)); }
  };

  const handleProcess = async () => {
    if(!videoRef.current) return;
    setProcessing(true); setProgress(0);
    try{
      const v = videoRef.current;
      const w = v.videoWidth, h = v.videoHeight;
      // Cap output size for sane file size
      const maxDim = 720;
      const scale = Math.min(1, maxDim/Math.max(w,h));
      const ow = Math.round(w*scale), oh = Math.round(h*scale);
      const canvas = document.createElement('canvas');
      canvas.width = ow; canvas.height = oh;
      const ctx = canvas.getContext('2d');
      const stream = canvas.captureStream(fps);
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9'
                  : MediaRecorder.isTypeSupported('video/webm;codecs=vp8') ? 'video/webm;codecs=vp8'
                  : 'video/webm';
      const chunks=[];
      const rec = new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:1_200_000});
      rec.ondataavailable = e => { if(e.data.size>0) chunks.push(e.data); };
      const stopped = new Promise(r => rec.onstop = r);
      rec.start();

      v.muted = true;
      v.playbackRate = 1;
      v.currentTime = start;
      await new Promise(r => v.onseeked = r);
      const dur = end - start;
      const t0 = performance.now();
      await v.play();
      // Draw frames in a rAF loop until end reached
      await new Promise((resolve) => {
        const tick = () => {
          if(v.currentTime >= end || v.ended){
            resolve();
            return;
          }
          ctx.drawImage(v,0,0,ow,oh);
          const elapsed = (performance.now()-t0)/1000;
          setProgress(Math.min(99, Math.round((elapsed/dur)*100)));
          requestAnimationFrame(tick);
        };
        tick();
      });
      v.pause();
      rec.stop();
      await stopped;

      const blob = new Blob(chunks,{type:mime});
      const reader = new FileReader();
      reader.onload = () => { onSave({type:'video', dataUrl:reader.result, mime, duration:dur, fps}); setProcessing(false); };
      reader.readAsDataURL(blob);
    }catch(err){
      console.error(err);
      alert((lang==='vi'?'Lỗi xử lý video: ':'Video processing error: ')+err.message);
      setProcessing(false);
    }
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.95)",zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:C.card,borderRadius:"24px 24px 0 0",padding:"16px 16px 28px",width:"100%",maxWidth:480,border:`1px solid ${C.border}`,maxHeight:"92vh",overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
        <div style={{width:40,height:4,background:C.border,borderRadius:99,margin:"0 auto 10px"}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <span style={{fontWeight:700,color:C.text,fontSize:15}}>🎬 {lang==='vi'?'Cắt video & chọn FPS':'Trim video & FPS'}</span>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.sub,fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
        <video ref={videoRef} src={src} onLoadedMetadata={onLoaded} controls playsInline preload="metadata"
          style={{width:"100%",borderRadius:12,background:"#000",maxHeight:240,marginBottom:12}}/>
        <div style={{fontSize:11,color:C.sub,marginBottom:4}}>{lang==='vi'?'Bắt đầu':'Start'} · <span style={{color:C.accent,fontWeight:700}}>{start.toFixed(1)}s</span></div>
        <input type="range" min="0" max={duration||0} step="0.1" value={start} onChange={e=>{const v=Math.min(+e.target.value,end-0.2);setStart(v);seek(v);}} style={{width:"100%",accentColor:C.sky,marginBottom:8}}/>
        <div style={{fontSize:11,color:C.sub,marginBottom:4}}>{lang==='vi'?'Kết thúc':'End'} · <span style={{color:C.accent,fontWeight:700}}>{end.toFixed(1)}s</span> <span style={{color:C.sub}}>({(end-start).toFixed(1)}s)</span></div>
        <input type="range" min="0" max={duration||0} step="0.1" value={end} onChange={e=>{const v=Math.max(+e.target.value,start+0.2);setEnd(v);seek(v);}} style={{width:"100%",accentColor:C.sky,marginBottom:12}}/>
        <div style={{fontSize:11,color:C.sub,marginBottom:6}}>🎞 {lang==='vi'?'Khung hình / giây (FPS)':'Frames per second (FPS)'}</div>
        <div style={{display:"flex",gap:6,marginBottom:14}}>
          {[12,15,24,30].map(f=>(
            <button key={f} onClick={()=>setFps(f)} style={{flex:1,padding:"8px 4px",borderRadius:10,border:`1.5px solid ${fps===f?C.primary:C.border}`,background:fps===f?`${C.primary}25`:"transparent",color:fps===f?C.primary:C.sub,fontWeight:700,fontSize:13,cursor:"pointer"}}>{f}</button>
          ))}
        </div>
        {processing && (
          <div style={{marginBottom:12}}>
            <div style={{fontSize:11,color:C.sub,marginBottom:4}}>{lang==='vi'?`Đang xử lý... ${progress}%`:`Processing... ${progress}%`}</div>
            <div style={{background:C.border,borderRadius:99,height:6,overflow:"hidden"}}>
              <div style={{width:`${progress}%`,height:"100%",background:C.sky,transition:"width .2s"}}/>
            </div>
          </div>
        )}
        <button disabled={processing||!duration} onClick={handleProcess} style={{width:"100%",background:`linear-gradient(135deg,${C.primary},#a855f7)`,color:"#fff",border:"none",borderRadius:12,padding:"13px",fontWeight:700,cursor:"pointer",opacity:(processing||!duration)?0.6:1}}>
          {processing?(lang==='vi'?'Đang lưu...':'Saving...'):(lang==='vi'?'✂️ Cắt & Lưu video':'✂️ Trim & Save video')}
        </button>
      </div>
    </div>
  );
};
const WarnModal=({open,onForce,onCancel,t,hours,required})=>{
  const [vis,setVis]=useState(false);
  useEffect(()=>{if(open)setTimeout(()=>setVis(true),10);else setVis(false);},[open]);
  if(!open)return null;
  return(
    <div style={{position:"fixed",inset:0,background:`rgba(0,0,0,${vis ? 0.85 : 0})`,zIndex:150,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 16px",transition:"background .3s"}}>
      <div style={{background:"#16161f",borderRadius:24,padding:"28px 22px",width:"100%",maxWidth:440,boxSizing:"border-box",border:`1.5px solid ${C.danger}44`,transform:vis?"scale(1) translateY(0)":"scale(.9) translateY(20px)",transition:"transform .3s",opacity:vis?1:0}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:52,marginBottom:12}}>⚠️</div>
          <div style={{fontSize:18,fontWeight:800,color:C.danger,marginBottom:8}}>{t.warnTitle.replace("⚠️ ","")}</div>
          <div style={{fontSize:13,color:"rgba(240,240,255,.7)",lineHeight:1.7}}>{t.warnBody}</div>
        </div>
        <button onClick={onCancel} style={{width:"100%",background:C.green,color:"#fff",border:"none",borderRadius:14,padding:"13px",fontWeight:700,fontSize:15,cursor:"pointer",marginBottom:10}}>{t.warnCancel}</button>
        <button onClick={onForce} style={{width:"100%",background:"transparent",color:C.sub,border:`1px solid ${C.border}`,borderRadius:14,padding:"11px",fontWeight:600,fontSize:13,cursor:"pointer"}}>{t.warnForce}</button>
      </div>
    </div>
  );
};

// ─── DOB / AGE helpers ───────────────────────────────────────────────────────
const calcAgeFromDob = (dob) => {
  if(!dob) return null;
  const d = new Date(dob);
  if(isNaN(d)) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if(m<0 || (m===0 && now.getDate() < d.getDate())) a--;
  return a;
};

// ─── DOB SETUP ───────────────────────────────────────────────────────────────
const DobSetup=({onSave,t})=>{
  const [dob,setDob]=useState("2000-01-01");
  const age = calcAgeFromDob(dob);
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.95)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 20px"}}>
      <div style={{background:C.card,borderRadius:24,padding:"32px 24px",width:"100%",maxWidth:400,textAlign:"center"}}>
        <div style={{fontSize:18,fontWeight:800,color:C.text,marginBottom:8}}>{t.dobTitle}</div>
        <div style={{fontSize:13,color:C.sub,marginBottom:14}}>{t.dob}</div>
        <input type="date" value={dob} onChange={e=>setDob(e.target.value)} max={new Date().toISOString().slice(0,10)} min="1940-01-01"
          style={{width:"100%",padding:"14px",borderRadius:12,border:`1px solid ${C.border}`,background:C.surface,color:C.text,fontSize:16,boxSizing:"border-box",marginBottom:14}}/>
        <div style={{fontSize:42,fontWeight:900,color:C.accent,marginBottom:20}}>{age!==null?age:"—"} <span style={{fontSize:14,color:C.sub,fontWeight:600}}>{t.ageLabel}</span></div>
        <button disabled={!age||age<10} onClick={()=>onSave(dob)} style={{width:"100%",background:C.primary,color:"#fff",border:"none",borderRadius:14,padding:"14px",fontWeight:700,opacity:(!age||age<10)?0.5:1}}>{t.dobSave}</button>
      </div>
    </div>
  );
};

// ─── RECOMMENDATIONS DIALOG ──────────────────────────────────────────────────
const RecsDialog=({open,onClose,t,lang})=>{
  if(!open) return null;
  const rows = [AGE_RECS[16],AGE_RECS[20],AGE_RECS[30],AGE_RECS[40],AGE_RECS[50],AGE_RECS[60]];
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:C.card,borderRadius:20,padding:20,width:"100%",maxWidth:440,border:`1px solid ${C.border}`,maxHeight:"85vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={{fontWeight:800,color:C.text,fontSize:15}}>📋 {t.recsTitle}</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.sub,fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{fontSize:11,color:C.sub,marginBottom:12,lineHeight:1.5}}>
          {lang==="vi"?"Khuyến nghị an toàn dựa trên độ tuổi. Số liệu mang tính tham khảo.":"Safe limits per age group. For reference only."}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {rows.map(r=>(
            <div key={r.label} style={{background:C.surface,borderRadius:12,padding:"10px 12px",border:`1px solid ${C.border}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div style={{fontWeight:800,color:C.accent,fontSize:14}}>{r.label}</div>
                <div style={{fontSize:10,color:C.sub}}>♻ {r.recovery}h</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,fontSize:12}}>
                <div style={{color:C.sub}}>💦 {lang==="vi"?"Bắn / tuần":"Shoots/wk"}: <span style={{color:C.primary,fontWeight:700}}>{r.max}</span></div>
                <div style={{color:C.sub}}>⏳ {lang==="vi"?"Edge / tuần":"Edges/wk"}: <span style={{color:C.sky,fontWeight:700}}>{r.edgeMax}</span></div>
                <div style={{color:C.sub,gridColumn:"1 / -1"}}>⏱ {lang==="vi"?"Thời lượng edge":"Edge dur."}: <span style={{color:C.text,fontWeight:600}}>{r.edgeDuration.min}–{r.edgeDuration.max} min</span></div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={onClose} style={{marginTop:14,width:"100%",background:C.primary,color:"#fff",border:"none",borderRadius:12,padding:"12px",fontWeight:700,cursor:"pointer"}}>{t.closeBtn}</button>
      </div>
    </div>
  );
};

// ─── SCHEDULE DIALOG ─────────────────────────────────────────────────────────
// 3 schedule levels per age group – all within safe weekly limits
// (edge counts <= edgeMax, shoot counts <= max for the age group)
const PRESETS = {
  0: { // 16–19  (edgeMax 5, shootMax 3)
    balanced:{edge:[3],         shoot:[6]},
    stim:    {edge:[2,4,6],     shoot:[3,6]},
    extreme: {edge:[1,3,4,5,6], shoot:[2,4,6]},
  },
  1: { // 20–29  (edgeMax 8, shootMax 4)
    balanced:{edge:[2,5],         shoot:[6]},
    stim:    {edge:[1,3,5,6],     shoot:[3,6]},
    extreme: {edge:[0,1,2,3,4,5,6], shoot:[1,3,5,6]},
  },
  2: { // 30–39  (edgeMax 7, shootMax 3)
    balanced:{edge:[2,5],         shoot:[6]},
    stim:    {edge:[1,3,5],       shoot:[3,6]},
    extreme: {edge:[0,1,3,4,5,6], shoot:[1,4,6]},
  },
  3: { // 40–49  (edgeMax 5, shootMax 2)
    balanced:{edge:[3],           shoot:[6]},
    stim:    {edge:[2,5],         shoot:[3,6]},
    extreme: {edge:[1,3,5,6],     shoot:[2,5]},
  },
  4: { // 50–59  (edgeMax 4, shootMax 2)
    balanced:{edge:[3],           shoot:[6]},
    stim:    {edge:[2,5],         shoot:[6]},
    extreme: {edge:[1,3,5],       shoot:[2,5]},
  },
  5: { // 60+    (edgeMax 3, shootMax 1)
    balanced:{edge:[3],           shoot:[6]},
    stim:    {edge:[2,5],         shoot:[6]},
    extreme: {edge:[1,3,5],       shoot:[6]},
  },
};
const ScheduleDialog=({open,onClose,t,lang,age,schedule,onSave})=>{
  const [edge,setEdge] = useState(schedule?.edge||[]);
  const [shoot,setShoot] = useState(schedule?.shoot||[]);
  const [edgeTime,setEdgeTime] = useState(schedule?.edgeTime||"21:30");
  const [shootTime,setShootTime] = useState(schedule?.shootTime||"22:30");
  useEffect(()=>{ if(open){
    setEdge(schedule?.edge||[]);
    setShoot(schedule?.shoot||[]);
    setEdgeTime(schedule?.edgeTime||"21:30");
    setShootTime(schedule?.shootTime||"22:30");
  } },[open,schedule]);
  if(!open) return null;
  const rec = getAgeRec(age||25);
  const presets = PRESETS[rec.ageGroup];
  const tz = getTimezone();
  const toggle=(arr,setArr,d)=> setArr(arr.includes(d)?arr.filter(x=>x!==d):[...arr,d].sort());
  const applyLevel=(lvl)=>{ const p=presets[lvl]; setEdge([...p.edge]); setShoot([...p.shoot]); };
  const levels = [
    {id:"balanced", label:t.levelBalanced, color:C.green},
    {id:"stim",     label:t.levelStim,     color:C.warn},
    {id:"extreme",  label:t.levelExtreme,  color:C.danger},
  ];
  const timeLabel = lang==='vi' ? 'Thời gian gợi ý' : 'Suggested time';
  const tzNote = lang==='vi'
    ? `Tính theo múi giờ: ${tz}`
    : `In your timezone: ${tz}`;
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:C.card,borderRadius:20,padding:20,width:"100%",maxWidth:440,border:`1px solid ${C.border}`,maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div style={{fontWeight:800,color:C.text,fontSize:15}}>🗓 {t.schedTitle}</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.sub,fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{fontSize:12,color:C.sub,marginBottom:6}}>{t.schedDesc}</div>
        <div style={{fontSize:11,color:C.warn,marginBottom:6}}>💡 {t.schedHint}</div>
        <div style={{fontSize:10,color:C.sub,marginBottom:14,opacity:.8}}>🌍 {tzNote}</div>

        <div style={{background:C.surface,borderRadius:12,padding:"10px 12px",marginBottom:14,border:`1px solid ${C.sky}33`}}>
          <div style={{fontSize:12,fontWeight:700,color:C.sky,marginBottom:8}}>⏳ {t.schedEdge}</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
            {t.schedDays.map((d,i)=>(
              <button key={i} onClick={()=>toggle(edge,setEdge,i)} style={{flex:"1 0 36px",padding:"8px 4px",borderRadius:10,border:`1.5px solid ${edge.includes(i)?C.sky:C.border}`,background:edge.includes(i)?`${C.sky}25`:"transparent",color:edge.includes(i)?C.sky:C.sub,fontWeight:700,fontSize:12,cursor:"pointer"}}>{d}</button>
            ))}
          </div>
          <div style={{fontSize:10,color:C.sub,marginBottom:6}}>⏰ {timeLabel}</div>
          <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
            <input type="time" value={edgeTime} onChange={e=>setEdgeTime(e.target.value)} style={{background:C.card,border:`1px solid ${C.sky}55`,borderRadius:8,padding:"6px 8px",color:C.text,fontSize:13,fontWeight:700,colorScheme:"dark"}}/>
            {SUGGESTED_EDGE_TIMES.map(s=>(
              <button key={s.value} onClick={()=>setEdgeTime(s.value)} style={{background:edgeTime===s.value?`${C.sky}25`:"transparent",border:`1px solid ${edgeTime===s.value?C.sky:C.border}`,color:edgeTime===s.value?C.sky:C.sub,borderRadius:8,padding:"5px 8px",fontSize:10,fontWeight:600,cursor:"pointer"}}>{s.value} · {lang==='vi'?s.labelVi:s.labelEn}</button>
            ))}
          </div>
        </div>

        <div style={{background:C.surface,borderRadius:12,padding:"10px 12px",marginBottom:14,border:`1px solid ${C.primary}33`}}>
          <div style={{fontSize:12,fontWeight:700,color:C.primary,marginBottom:8}}>💦 {t.schedShoot}</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
            {t.schedDays.map((d,i)=>(
              <button key={i} onClick={()=>toggle(shoot,setShoot,i)} style={{flex:"1 0 36px",padding:"8px 4px",borderRadius:10,border:`1.5px solid ${shoot.includes(i)?C.primary:C.border}`,background:shoot.includes(i)?`${C.primary}25`:"transparent",color:shoot.includes(i)?C.primary:C.sub,fontWeight:700,fontSize:12,cursor:"pointer"}}>{d}</button>
            ))}
          </div>
          <div style={{fontSize:10,color:C.sub,marginBottom:6}}>⏰ {timeLabel}</div>
          <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
            <input type="time" value={shootTime} onChange={e=>setShootTime(e.target.value)} style={{background:C.card,border:`1px solid ${C.primary}55`,borderRadius:8,padding:"6px 8px",color:C.text,fontSize:13,fontWeight:700,colorScheme:"dark"}}/>
            {SUGGESTED_SHOOT_TIMES.map(s=>(
              <button key={s.value} onClick={()=>setShootTime(s.value)} style={{background:shootTime===s.value?`${C.primary}25`:"transparent",border:`1px solid ${shootTime===s.value?C.primary:C.border}`,color:shootTime===s.value?C.primary:C.sub,borderRadius:8,padding:"5px 8px",fontSize:10,fontWeight:600,cursor:"pointer"}}>{s.value} · {lang==='vi'?s.labelVi:s.labelEn}</button>
            ))}
          </div>
        </div>

        <div style={{background:C.surface,borderRadius:12,padding:"10px 12px",marginBottom:14,border:`1px solid ${C.border}`}}>
          <div style={{fontSize:11,color:C.sub,marginBottom:8}}>✨ {t.presets} ({rec.label})</div>
          <div style={{fontSize:11,color:C.sub,marginBottom:8,lineHeight:1.5}}>{t.pickLevel}</div>
          <div style={{display:"flex",gap:6}}>
            {levels.map(lv=>{
              const p=presets[lv.id];
              return (
                <button key={lv.id} onClick={()=>applyLevel(lv.id)} title={`⏳ ${p.edge.map(i=>t.schedDays[i]).join(", ")} | 💦 ${p.shoot.map(i=>t.schedDays[i]).join(", ")}`} style={{flex:1,background:`${lv.color}18`,border:`1.5px solid ${lv.color}66`,color:lv.color,fontWeight:700,fontSize:12,padding:"10px 4px",borderRadius:10,cursor:"pointer",display:"flex",flexDirection:"column",gap:3}}>
                  <span>{lv.label}</span>
                  <span style={{fontSize:9,opacity:.85,fontWeight:600}}>⏳{p.edge.length} · 💦{p.shoot.length}</span>
                </button>
              );
            })}
          </div>
        </div>

        <button onClick={()=>{ onSave({edge,shoot,edgeTime,shootTime}); onClose(); }} style={{width:"100%",background:C.primary,color:"#fff",border:"none",borderRadius:12,padding:"12px",fontWeight:700,cursor:"pointer"}}>{t.schedSave}</button>
      </div>
    </div>
  );
};

// ─── USER TAB ────────────────────────────────────────────────────────────────
const UserTab=({sessions,dob,age,t,lang,toggleLang,trackingStart,motivationPhoto,setMotivationPhoto,avatar,setAvatar,schedule,setSchedule,onChangeDob,onEdit,onDelete,novTestMode,toggleNovTest,resetAll})=>{
  const [showRecs,setShowRecs] = useState(false);
  const [showSched,setShowSched] = useState(false);
  const [showCrop,setShowCrop] = useState(false);
  const [raw,setRaw] = useState(null);
  const fileRef = useRef();
  const videoRef = useRef();
  const importRef = useRef();
  const avatarRef = useRef();
  const rec = getAgeRec(age||25);
  const shoots = getShoots(sessions).length;
  const edges = getEdges(sessions).length;

  // Timezone selector + live world clock
  const [tz, setTz] = useState(() => getTimezone());
  const [nowTick, setNowTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNowTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const wnow = worldNow();
  const tzNowStr = formatInTZ(wnow, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }, lang === "vi" ? "vi-VN" : "en-GB");
  const tzDateStr = formatInTZ(wnow, { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }, lang === "vi" ? "vi-VN" : "en-GB");

  const isVideo = motivationPhoto && typeof motivationPhoto==='string' && motivationPhoto.startsWith('data:video');

  const handleFile=e=>{
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader(); r.onload=ev=>{ setRaw(ev.target.result); setShowCrop(true); }; r.readAsDataURL(f);
  };
  const handleVideo=e=>{
    const f=e.target.files[0]; if(!f) return;
    if(f.size > 100*1024*1024){ alert(lang==='vi'?'Video quá lớn (tối đa 100MB).':'Video too large (max 100MB).'); return; }
    const r=new FileReader(); r.onload=ev=>{ setMotivationPhoto(ev.target.result); }; r.readAsDataURL(f);
    e.target.value='';
  };
  const handleAvatar=e=>{
    const f=e.target.files[0]; if(!f) return;
    if(f.size > 5*1024*1024){ alert(lang==='vi'?'Ảnh quá lớn (tối đa 5MB).':'Image too large (max 5MB).'); return; }
    const r=new FileReader(); r.onload=ev=>{ setAvatar(ev.target.result); }; r.readAsDataURL(f);
    e.target.value='';
  };

  return(
    <div style={{padding:"14px 14px 100px"}}>
      {showCrop&&raw&&<PhotoViewer src={raw} onClose={()=>{setShowCrop(false);setRaw(null);}} onSave={(d)=>{setMotivationPhoto(d);setShowCrop(false);setRaw(null);}} t={t}/>}
      <RecsDialog open={showRecs} onClose={()=>setShowRecs(false)} t={t} lang={lang}/>
      <ScheduleDialog open={showSched} onClose={()=>setShowSched(false)} t={t} lang={lang} age={age} schedule={schedule} onSave={setSchedule}/>

      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,gap:10}}>
        <div style={{fontSize:18,fontWeight:800,color:C.text,display:"flex",alignItems:"center",gap:8}}><User size={18}/> {t.userTab}</div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <img src={vantaLogo} alt="Vanta" width={22} height={22} style={{borderRadius:6,boxShadow:"0 0 10px rgba(124,58,237,.45)"}}/>
          <span style={{fontSize:12,fontWeight:900,letterSpacing:.5,background:`linear-gradient(135deg,#fff,${C.accent})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>VANTA</span>
        </div>
      </div>
      <div style={{fontSize:13,color:C.sub,marginBottom:16}}>{t.userInfo}</div>

      <Card>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:12}}>
          <input ref={avatarRef} type="file" accept="image/*" onChange={handleAvatar} style={{display:"none"}}/>
          <div onClick={()=>avatarRef.current?.click()} title={lang==='vi'?'Đổi ảnh đại diện':'Change avatar'} style={{position:"relative",width:64,height:64,borderRadius:"50%",overflow:"hidden",cursor:"pointer",background:`linear-gradient(135deg,${C.primary},${C.accent})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,flexShrink:0,border:`2px solid ${C.border}`}}>
            {avatar ? <img src={avatar} alt="avatar" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <User size={30} color="#fff"/>}
            <div style={{position:"absolute",bottom:0,left:0,right:0,background:"rgba(0,0,0,.55)",color:"#fff",fontSize:9,textAlign:"center",padding:"2px 0",fontWeight:700,display:"inline-flex",justifyContent:"center"}}><Camera size={11}/></div>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,color:C.sub}}>{t.dob}</div>
            <div style={{fontSize:15,fontWeight:700,color:C.text}}>{dob ? new Date(dob).toLocaleDateString(lang==="vi"?"vi-VN":"en-GB") : "—"}</div>
            <div style={{fontSize:11,color:C.sub,marginTop:2}}>{t.ageLabel}: <span style={{color:C.accent,fontWeight:700}}>{age}</span> · {t.ageGroupLabel}: <span style={{color:C.accent,fontWeight:700}}>{rec.label}</span></div>
            {avatar && <button onClick={()=>setAvatar(null)} style={{marginTop:4,background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,padding:"2px 8px",color:C.sub,fontSize:10,cursor:"pointer"}}>{lang==='vi'?'Gỡ ảnh':'Remove'}</button>}
          </div>
          <button onClick={onChangeDob} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"6px 10px",color:C.sub,fontSize:11,cursor:"pointer",display:"inline-flex",alignItems:"center"}}><Pencil size={12}/></button>
        </div>
        <button onClick={()=>setShowRecs(true)} style={{width:"100%",background:`${C.accent}22`,color:C.accent,border:`1px solid ${C.accent}55`,borderRadius:12,padding:"10px",fontWeight:700,fontSize:13,cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8}}><ClipboardList size={15}/> {t.viewRecs}</button>
      </Card>

      <Card>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
          <div>
            <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:2,display:"flex",alignItems:"center",gap:6}}><Languages size={15}/> {lang==='vi'?'Ngôn ngữ':'Language'}</div>
            <div style={{fontSize:12,color:C.sub}}>{lang==='vi'?'Hiện tại: Tiếng Việt':'Current: English'}</div>
          </div>
          <button onClick={toggleLang} style={{background:`${C.accent}22`,border:`1px solid ${C.accent}66`,borderRadius:10,padding:"8px 14px",color:C.accent,fontSize:13,fontWeight:800,cursor:"pointer",flexShrink:0,display:"inline-flex",alignItems:"center",gap:6}}>
            <RefreshCw size={14}/> {lang==='vi'?'English':'Tiếng Việt'}
          </button>
        </div>
      </Card>

      <Card>
        <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:10,display:"flex",alignItems:"center",gap:6}}><Calendar size={15}/> {t.schedTitle}</div>
        {(schedule&&(schedule.edge.length||schedule.shoot.length)) ? (
          <div style={{fontSize:12,color:C.sub,lineHeight:1.8,marginBottom:10}}>
            <div>⏳ {t.schedEdge}: <span style={{color:C.sky,fontWeight:700}}>{schedule.edge.length?schedule.edge.map(i=>t.schedDays[i]).join(", "):"—"}</span>{schedule.edge.length && schedule.edgeTime ? <span style={{color:C.sub,fontWeight:600}}> · ⏰ {schedule.edgeTime}</span> : null}</div>
            <div>💦 {t.schedShoot}: <span style={{color:C.primary,fontWeight:700}}>{schedule.shoot.length?schedule.shoot.map(i=>t.schedDays[i]).join(", "):"—"}</span>{schedule.shoot.length && schedule.shootTime ? <span style={{color:C.sub,fontWeight:600}}> · ⏰ {schedule.shootTime}</span> : null}</div>
            <div style={{fontSize:10,opacity:.7,marginTop:2}}>🌍 {lang==='vi'?'Theo múi giờ':'In timezone'}: <span style={{fontWeight:700}}>{getTimezone()}</span></div>
          </div>
        ):(
          <div style={{fontSize:12,color:C.sub,marginBottom:10}}>{t.schedNone}</div>
        )}
        <button onClick={()=>setShowSched(true)} style={{width:"100%",background:C.primary,color:"#fff",border:"none",borderRadius:12,padding:"10px",fontWeight:700,fontSize:13,cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8}}><Calendar size={15}/> {t.schedSave.replace("Lưu lịch","Cập nhật lịch").replace("Save schedule","Set schedule")}</button>
      </Card>

      <Card>
        <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:6,display:"flex",alignItems:"center",gap:6}}><Globe size={15}/> {lang==='vi'?'Múi giờ & đồng hồ thế giới':'Timezone & world clock'}</div>
        <div style={{fontSize:11,color:C.sub,marginBottom:10,lineHeight:1.5}}>
          {lang==='vi'
            ? 'Mọi thử thách (daily, lịch, tháng 11...) đều dựa trên ngày & giờ trong múi giờ bạn chọn bên dưới.'
            : 'All challenges (daily, schedule, November streak) use the date & time of the timezone you select below.'}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr',gap:8,marginBottom:10}}>
          <div style={{background:`${C.sky}15`,border:`1px solid ${C.sky}44`,borderRadius:10,padding:'10px',textAlign:'center'}}>
            <div style={{fontSize:10,color:C.sub,marginBottom:2}}>{lang==='vi'?'Giờ địa phương':'Local time'}</div>
            <div style={{fontSize:18,fontWeight:900,color:C.sky,fontVariantNumeric:'tabular-nums'}}>{tzNowStr}</div>
            <div style={{fontSize:10,color:C.sub,marginTop:2}}>{tzDateStr}</div>
          </div>
        </div>
        <div style={{fontSize:11,color:C.sub,marginBottom:6}}>{lang==='vi'?'Chọn múi giờ hiển thị':'Display timezone'}</div>
        <select value={tz} onChange={(e)=>{ const v=e.target.value; setTz(v); setTimezone(v); }} style={{width:'100%',background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:'10px',color:C.text,fontSize:13}}>
          {COMMON_TIMEZONES.map(o=>(
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
          {!COMMON_TIMEZONES.find(o=>o.value===tz) && <option value={tz}>{tz}</option>}
        </select>
        <button onClick={()=>{ const auto=getBrowserTimezone(); setTz(auto); setTimezone(auto); }} style={{marginTop:8,width:'100%',background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:'8px',color:C.sub,fontSize:12,fontWeight:700,cursor:'pointer'}}>
          <RefreshCw size={13} style={{verticalAlign:"-2px",marginRight:4}}/> {lang==='vi'?`Tự động (${getBrowserTimezone()})`:`Auto-detect (${getBrowserTimezone()})`}
        </button>
      </Card>

      <Card>
        <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:6,display:"flex",alignItems:"center",gap:6}}><ImageIcon size={15}/> {t.motivationTitle}</div>
        <div style={{fontSize:12,color:C.sub,marginBottom:12}}>{t.motivationDesc}</div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{display:"none"}}/>
        <input ref={videoRef} type="file" accept="video/*" onChange={handleVideo} style={{display:"none"}}/>
        {motivationPhoto ? (
          <div style={{position:"relative"}}>
            {isVideo ? (
              <video src={motivationPhoto} controls playsInline style={{width:"100%",borderRadius:12,maxHeight:260,background:"#000",border:`1px solid ${C.border}`}}/>
            ) : (
              <img src={motivationPhoto} alt="motivation" style={{width:"100%",borderRadius:12,maxHeight:240,objectFit:"contain",background:C.surface,border:`1px solid ${C.border}`}}/>
            )}
            <div style={{position:"absolute",top:8,right:8,display:"flex",gap:6,flexWrap:"wrap",justifyContent:"flex-end"}}>
              {!isVideo && <button onClick={()=>{setRaw(motivationPhoto);setShowCrop(true);}} style={{background:"rgba(0,0,0,.7)",border:"none",borderRadius:8,padding:"5px 10px",color:"#fff",fontSize:11,cursor:"pointer"}}>✂️</button>}
              <button onClick={()=>setMotivationPhoto(null)} style={{background:"rgba(239,68,68,.85)",border:"none",borderRadius:8,padding:"5px 10px",color:"#fff",fontSize:11,cursor:"pointer"}}>{t.removePhoto}</button>
            </div>
            <div style={{display:"flex",gap:8,marginTop:8}}>
              <button onClick={()=>fileRef.current?.click()} style={{flex:1,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"8px",color:C.text,fontSize:12,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6}}><Camera size={13}/> {t.pickPhoto}</button>
              <button onClick={()=>videoRef.current?.click()} style={{flex:1,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"8px",color:C.text,fontSize:12,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6}}><Film size={13}/> {t.pickVideo}</button>
            </div>
          </div>
        ):(
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>fileRef.current?.click()} style={{flex:1,background:C.surface,border:`1.5px dashed ${C.border}`,borderRadius:12,padding:"20px 8px",color:C.sub,cursor:"pointer",fontSize:13,fontWeight:600,display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6}}><Camera size={15}/> {t.pickPhoto}</button>
            <button onClick={()=>videoRef.current?.click()} style={{flex:1,background:C.surface,border:`1.5px dashed ${C.border}`,borderRadius:12,padding:"20px 8px",color:C.sub,cursor:"pointer",fontSize:13,fontWeight:600,display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6}}><Film size={15}/> {t.pickVideo}</button>
          </div>
        )}
        {/* Owner name lock for video */}
        <OwnerNameField t={t}/>
      </Card>

      <Card>
        <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:10,display:"flex",alignItems:"center",gap:6}}><BarChart2 size={15}/> {t.userInfo}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <div style={{background:`${C.primary}15`,borderRadius:10,padding:"10px",textAlign:"center"}}>
            <div style={{fontSize:11,color:C.sub}}>{t.totalShoots}</div>
            <div style={{fontSize:20,fontWeight:900,color:C.primary}}>{shoots}</div>
          </div>
          <div style={{background:`${C.sky}15`,borderRadius:10,padding:"10px",textAlign:"center"}}>
            <div style={{fontSize:11,color:C.sub}}>{t.totalEdges}</div>
            <div style={{fontSize:20,fontWeight:900,color:C.sky}}>{edges}</div>
          </div>
        </div>
        <div style={{fontSize:11,color:C.sub,marginTop:10,textAlign:"center"}}>{t.memberSince}: <span style={{color:C.accent,fontWeight:700}}>{trackingStart?new Date(trackingStart).toLocaleDateString(lang==="vi"?"vi-VN":"en-GB"):"—"}</span></div>
      </Card>

      <Card>
        <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:10}}>💾 {lang==='vi'?'Sao lưu & Khôi phục':'Backup & Restore'}</div>
        <div style={{fontSize:11,color:C.sub,marginBottom:10,lineHeight:1.5}}>
          {lang==='vi'?'Tải file JSON chứa toàn bộ dữ liệu (sessions, lịch, ảnh, thử thách...). Có thể nhập lại trên thiết bị khác.':'Download a JSON file with all your data (sessions, schedule, photos, challenges...). Import it on any device.'}
        </div>
        <button onClick={exportData} style={{width:"100%",background:`${C.green}20`,border:`1px solid ${C.green}66`,borderRadius:12,padding:"10px",color:C.green,fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:8}}>
          ⬇️ {lang==='vi'?'Tải xuống bản sao lưu':'Download backup'}
        </button>
        <input ref={importRef} type="file" accept="application/json,.json" onChange={(e)=>{
          const f=e.target.files&&e.target.files[0]; if(!f) return;
          if(!(typeof window !== 'undefined' && window.confirm ? window.confirm(lang==='vi'?'Khôi phục sẽ ghi đè dữ liệu hiện tại. Tiếp tục?':'Restore will overwrite current data. Continue?') : true)){e.target.value='';return;}
          importData(f,(ok)=>{ if(ok){ alert(lang==='vi'?'Đã khôi phục! Tải lại trang...':'Restored! Reloading...'); location.reload(); } e.target.value=''; });
        }} style={{display:'none'}}/>
        <button onClick={()=>importRef.current&&importRef.current.click()} style={{width:"100%",background:`${C.sky}20`,border:`1px solid ${C.sky}66`,borderRadius:12,padding:"10px",color:C.sky,fontWeight:700,fontSize:13,cursor:"pointer"}}>
          ⬆️ {lang==='vi'?'Khôi phục từ file...':'Restore from file...'}
        </button>
      </Card>

      <Card>
        <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:10}}>⚙️ {lang==='vi'?'Tuỳ chọn nâng cao':'Advanced options'}</div>
        <button onClick={toggleNovTest} style={{width:"100%",background:novTestMode?`${C.gold}25`:C.surface,border:`1px solid ${novTestMode?C.gold:C.border}`,borderRadius:12,padding:"10px",color:novTestMode?C.gold:C.text,fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:8}}>
          ⚔️ {novTestMode?(lang==='vi'?'Đang thử nghiệm – Tắt':'Test mode ON – Disable'):(lang==='vi'?'Thử nghiệm Thử thách Tháng 11':'Test November Challenge')}
        </button>
        <button onClick={resetAll} style={{width:"100%",background:`${C.danger}15`,border:`1px solid ${C.danger}55`,borderRadius:12,padding:"10px",color:C.danger,fontWeight:700,fontSize:13,cursor:"pointer"}}>
          🗑 {lang==='vi'?'Đặt lại toàn bộ dữ liệu':'Reset all data'}
        </button>
      </Card>

      <Card>
        <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:10,display:"flex",alignItems:"center",gap:6}}><History size={15}/> {t.activityHistory}</div>
        <HistoryTab sessions={sessions} onEdit={onEdit} onDelete={onDelete} t={t} embedded/>
      </Card>
    </div>
  );
};

// ─── Shared sync bus between Session timer ↔ Metronome ───────────────────
// The timer publishes its phase + target BPM; the metronome can subscribe
// to follow along smoothly ("Sync" mode).
type SessionSyncState = {
  running: boolean;
  phase: "idle"|"warmup"|"build"|"approach"|"edge"|"final";
  targetBpm: number;
  label_vi: string;
  label_en: string;
};
const sessionSync = (() => {
  const listeners = new Set<(s:SessionSyncState)=>void>();
  let state:SessionSyncState = { running:false, phase:"idle", targetBpm:90, label_vi:"Chờ", label_en:"Idle" };
  return {
    get(){ return state; },
    set(patch:Partial<SessionSyncState>){
      state = { ...state, ...patch };
      listeners.forEach(l=>{ try{ l(state); }catch{} });
    },
    subscribe(l:(s:SessionSyncState)=>void){
      listeners.add(l); l(state);
      return ()=>{ listeners.delete(l); };
    },
  };
})();

// Compute phase + target BPM from elapsed seconds & milestones.
const computeSessionPhase=(elapsedSec:number,totalSec:number,milestones:{at:number;label_vi:string;label_en:string}[]):Omit<SessionSyncState,"running">=>{
  const elapsedMin = elapsedSec/60;
  if(elapsedSec<=0) return { phase:"idle", targetBpm:60, label_vi:"Sẵn sàng", label_en:"Ready" };
  const first = milestones[0];
  const last  = milestones[milestones.length-1];
  // Warm-up — before first milestone
  if(first && elapsedMin < first.at){
    // gentle ramp 55 → 70 across warm-up
    const p = first.at>0 ? elapsedMin/first.at : 0;
    return { phase:"warmup", targetBpm: Math.round(55 + 15*p), label_vi:"Khởi động", label_en:"Warm-up" };
  }
  // Final stretch — after last milestone
  if(last && elapsedMin >= last.at){
    const remainMin = (totalSec/60) - elapsedMin;
    // ramp 130 → 160 across the final stretch
    const span = (totalSec/60) - last.at;
    const p = span>0 ? 1 - Math.max(0,Math.min(1,remainMin/span)) : 1;
    return { phase:"final", targetBpm: Math.round(130 + 30*p), label_vi:"Bứt tốc", label_en:"Final push" };
  }
  // Find next non-warmup milestone
  const next = milestones.find(m=>m.at>elapsedMin);
  // Find most recent passed milestone (after warm-up)
  const passedIdx = milestones.reduce((acc,m,i)=>m.at<=elapsedMin?i:acc,-1);
  const prev = passedIdx>=0 ? milestones[passedIdx] : null;
  // "Edge pulse" — 20s right after a non-warmup milestone
  if(prev && passedIdx>0){
    const sincePrev = elapsedMin - prev.at;
    if(sincePrev*60 <= 20){
      return { phase:"edge", targetBpm:135, label_vi:`Sau ${prev.label_vi}`, label_en:`After ${prev.label_en}` };
    }
  }
  // "Approach" — last 30s before next edge milestone
  if(next){
    const untilSec = (next.at - elapsedMin)*60;
    if(untilSec <= 30){
      const p = 1 - Math.max(0,Math.min(1,untilSec/30));
      return { phase:"approach", targetBpm: Math.round(95 + 35*p), label_vi:`Gần ${next.label_vi}`, label_en:`Near ${next.label_en}` };
    }
  }
  // "Build" — steady between milestones, slight rise with overall progress
  const overall = Math.max(0,Math.min(1,elapsedSec/totalSec));
  return { phase:"build", targetBpm: Math.round(75 + 20*overall), label_vi:"Duy trì", label_en:"Build" };
};

// ─── Metronome (máy đếm nhịp) ─────────────────────────────────────────────
const METRONOME_KEY = "ht_metronome_v1";
const BPM_PRESETS = [
  { id:"slow",   bpm:60,  label_vi:"Slow",   label_en:"Slow",   tag_vi:"Cảm giác",  tag_en:"Sense" },
  { id:"edge",   bpm:90,  label_vi:"Edge",   label_en:"Edge",   tag_vi:"Kiểm soát", tag_en:"Control" },
  { id:"sprint", bpm:140, label_vi:"Sprint", label_en:"Sprint", tag_vi:"Bùng nổ",   tag_en:"Burst" },
];

// Short click tick using Web Audio — sharper than the milestone beep.
const playTick=(audioCtx,freq=1200,volume=0.35)=>{
  try{
    const ctx = audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type="square";
    osc.frequency.value=freq;
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001,now);
    gain.gain.exponentialRampToValueAtTime(volume, now+0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now+0.05);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(now); osc.stop(now+0.06);
  }catch{}
};

const MetronomeCard=({lang})=>{
  const saved = (typeof window!=='undefined' ? load(METRONOME_KEY) : null) || {};
  const [bpm,setBpm]=useState<number>(saved.bpm || 90);
  const [running,setRunning]=useState(false);
  const [vibrateOn,setVibrateOn]=useState<boolean>(saved.vibrate ?? false);
  const [soundOn,setSoundOn]=useState<boolean>(saved.sound ?? true);
  const [autoMode,setAutoMode]=useState<boolean>(false);
  const [autoMin,setAutoMin]=useState<number>(saved.autoMin || 60);
  const [autoMax,setAutoMax]=useState<number>(saved.autoMax || 140);
  const [autoPeriod,setAutoPeriod]=useState<number>(saved.autoPeriod || 30); // seconds for full cycle
  const [syncOn,setSyncOn]=useState<boolean>(saved.syncOn ?? false);
  const [syncInfo,setSyncInfo]=useState<SessionSyncState>(sessionSync.get());
  const [beatCount,setBeatCount]=useState(0);
  const [pulse,setPulse]=useState(false);

  const audioCtxRef = useRef<any>(null);
  const tickTimerRef = useRef<any>(null);
  const autoTimerRef = useRef<any>(null);
  const autoStartRef = useRef<number>(0);
  const bpmRef = useRef<number>(bpm);
  bpmRef.current = bpm;

  const tapTimesRef = useRef<number[]>([]);

  // Persist settings
  useEffect(()=>{
    save(METRONOME_KEY,{bpm,vibrate:vibrateOn,sound:soundOn,autoMin,autoMax,autoPeriod,syncOn});
  },[bpm,vibrateOn,soundOn,autoMin,autoMax,autoPeriod,syncOn]);

  // Subscribe to session sync bus. When syncOn:
  //  • metronome BPM follows the session's targetBpm (smoothly)
  //  • metronome auto-starts/stops with the session
  //  • manual BPM & auto-BPM controls are disabled
  useEffect(()=>{
    const unsub = sessionSync.subscribe((s)=>{
      setSyncInfo(s);
      if(!syncOn) return;
      // Follow target BPM
      if(s.targetBpm && s.targetBpm!==bpmRef.current){
        setBpm(s.targetBpm);
      }
      // Auto start when session starts
      if(s.running && !running){
        if(autoMode) setAutoMode(false);
        ensureCtx();
        setRunning(true);
        // kick scheduler on next tick so state has settled
        setTimeout(()=>{ if(tickTimerRef.current==null) scheduleNextTick(); },0);
      }
      // Auto stop when session pauses/ends
      if(!s.running && running){
        stopAll(); setRunning(false); setBeatCount(0);
      }
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[syncOn,running,autoMode]);


  const ensureCtx=()=>{
    if(typeof window==='undefined') return null;
    if(!audioCtxRef.current){
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if(!Ctx) return null;
      audioCtxRef.current = new Ctx();
    }
    if(audioCtxRef.current.state==='suspended') audioCtxRef.current.resume();
    return audioCtxRef.current;
  };

  const scheduleNextTick=()=>{
    const interval = 60000 / Math.max(20, bpmRef.current);
    tickTimerRef.current = setTimeout(()=>{
      const ctx = ensureCtx();
      if(soundOn && ctx) playTick(ctx, 1200, 0.35);
      if(vibrateOn && typeof navigator!=='undefined' && navigator.vibrate){
        try{ navigator.vibrate(35); }catch{}
      }
      setBeatCount(b=>b+1);
      setPulse(true);
      setTimeout(()=>setPulse(false),90);
      if(tickTimerRef.current!==null) scheduleNextTick();
    }, interval);
  };

  const stopAll=()=>{
    if(tickTimerRef.current){ clearTimeout(tickTimerRef.current); tickTimerRef.current=null; }
    if(autoTimerRef.current){ clearInterval(autoTimerRef.current); autoTimerRef.current=null; }
  };

  const start=()=>{
    if(running) return;
    ensureCtx();
    setRunning(true);
    scheduleNextTick();
    if(autoMode){
      autoStartRef.current = Date.now();
      autoTimerRef.current = setInterval(()=>{
        const elapsed = (Date.now()-autoStartRef.current)/1000;
        const phase = (elapsed % autoPeriod) / autoPeriod; // 0..1
        // sine wave between min and max — smooth speed-up / slow-down
        const norm = 0.5 - 0.5*Math.cos(2*Math.PI*phase);
        const next = Math.round(autoMin + (autoMax-autoMin)*norm);
        setBpm(next);
      },250);
    }
  };
  const stop=()=>{ stopAll(); setRunning(false); setBeatCount(0); };

  useEffect(()=>()=>{
    stopAll();
    if(audioCtxRef.current){ try{ audioCtxRef.current.close(); }catch{} }
  },[]);

  // Tap to set BPM (average last 4 taps)
  const tap=()=>{
    const now = Date.now();
    const arr = tapTimesRef.current;
    arr.push(now);
    while(arr.length>5) arr.shift();
    if(arr.length>=2){
      const intervals:number[] = [];
      for(let i=1;i<arr.length;i++) intervals.push(arr[i]-arr[i-1]);
      // discard if too slow (>2s gap → reset)
      if(intervals[intervals.length-1]>2000){
        tapTimesRef.current=[now]; return;
      }
      const avgMs = intervals.reduce((a,b)=>a+b,0)/intervals.length;
      const newBpm = Math.round(60000/avgMs);
      setBpm(Math.max(40,Math.min(220,newBpm)));
    }
    // give a small visual click
    setPulse(true); setTimeout(()=>setPulse(false),80);
  };

  const pickPreset=(p)=>{
    setBpm(p.bpm);
    if(autoMode) setAutoMode(false);
  };

  return(
    <Card style={{marginBottom:10,background:`linear-gradient(135deg,${C.primary}26,${C.navy}66)`,border:`1px solid ${C.primary}66`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <span style={{fontWeight:800,fontSize:14,color:C.text,letterSpacing:.2}}>🥁 {lang==='vi'?'Máy đếm nhịp':'Metronome'}</span>
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>setSyncOn(s=>!s)} title={lang==='vi'?'Đồng bộ với bộ đếm phiên':'Sync with session timer'}
            style={{background:syncOn?`${C.primary}33`:"transparent",border:`1px solid ${syncOn?C.primary:C.border}`,borderRadius:8,padding:"3px 7px",color:syncOn?C.accent:C.sub,fontSize:11,fontWeight:800,cursor:"pointer"}}>
            🔗 {lang==='vi'?'Đồng bộ':'Sync'}
          </button>
          <button onClick={()=>setSoundOn(s=>!s)} title="Sound"
            style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,padding:"3px 7px",color:soundOn?C.accent:C.sub,fontSize:12,cursor:"pointer"}}>
            {soundOn?'🔔':'🔕'}
          </button>
          <button onClick={()=>setVibrateOn(v=>!v)} title="Vibrate"
            style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,padding:"3px 7px",color:vibrateOn?C.accent:C.sub,fontSize:12,cursor:"pointer"}}>
            📳
          </button>
        </div>
      </div>

      {syncOn && (
        <div style={{
          display:"flex",alignItems:"center",gap:8,
          background:`linear-gradient(90deg,${C.primary}22,${C.accent}22)`,
          border:`1px solid ${C.primary}66`,borderRadius:10,padding:"7px 10px",marginBottom:10
        }}>
          <span style={{fontSize:11,fontWeight:800,color:C.accent}}>🔗 {lang==='vi'?'Đang đồng bộ':'Synced'}</span>
          <span style={{flex:1,fontSize:11,color:C.text,fontWeight:700}}>
            {syncInfo.running
              ? `${lang==='vi'?syncInfo.label_vi:syncInfo.label_en} · ${syncInfo.targetBpm} BPM`
              : (lang==='vi'?'Chờ bộ đếm phiên bắt đầu…':'Waiting for session to start…')}
          </span>
        </div>
      )}

      {/* BPM display + pulse circle */}
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:10}}>
        <div style={{
          width:72,height:72,borderRadius:"50%",
          background:pulse?`radial-gradient(circle,${C.accent},${C.primary})`:`radial-gradient(circle,${C.primary}55,${C.navy})`,
          border:`2px solid ${pulse?C.accent:C.primary}`,
          display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
          transition:"transform .08s, background .12s",
          transform:pulse?"scale(1.08)":"scale(1)",
          boxShadow:pulse?`0 0 24px ${C.primary}cc`:"none",
        }}>
          <span style={{fontSize:11,fontWeight:800,color:"#fff",letterSpacing:.5}}>{running?"♪":"—"}</span>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:36,fontWeight:900,color:C.text,lineHeight:1,fontVariantNumeric:"tabular-nums"}}>
            {bpm}<span style={{fontSize:13,fontWeight:700,color:C.sub,marginLeft:6}}>BPM</span>
          </div>
          <div style={{fontSize:11,color:C.sub,marginTop:4}}>
            {autoMode
              ? (lang==='vi'?`Tự động ${autoMin}→${autoMax} BPM · ${autoPeriod}s/chu kỳ`:`Auto ${autoMin}→${autoMax} BPM · ${autoPeriod}s cycle`)
              : (lang==='vi'?`Nhịp: ${beatCount}`:`Beats: ${beatCount}`)}
          </div>
        </div>
      </div>

      {/* BPM slider */}
      <input type="range" min={40} max={220} value={bpm} disabled={autoMode||syncOn}
        onChange={e=>setBpm(parseInt(e.target.value))}
        style={{width:"100%",accentColor:C.primary,opacity:(autoMode||syncOn)?.5:1,marginBottom:8}}/>

      {/* Presets */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:8}}>
        {BPM_PRESETS.map(p=>{
          const active=!autoMode && bpm===p.bpm;
          return(
            <button key={p.id} onClick={()=>pickPreset(p)}
              style={{
                padding:"8px 4px",borderRadius:10,cursor:"pointer",fontSize:11,fontWeight:800,
                border:`1px solid ${active?C.primary:C.border}`,
                background: active ? `linear-gradient(135deg,${C.primary},${C.accent})` : C.surface,
                color: active ? "#fff" : C.text,
              }}>
              <div>{lang==='vi'?p.label_vi:p.label_en}</div>
              <div style={{fontSize:10,fontWeight:600,opacity:.85,marginTop:1}}>{p.bpm} · {lang==='vi'?p.tag_vi:p.tag_en}</div>
            </button>
          );
        })}
      </div>

      {/* Auto-BPM mode */}
      <div style={{background:C.surface,border:`1px solid ${autoMode?C.primary+"88":C.border}`,borderRadius:12,padding:"10px 12px",marginBottom:8}}>
        <label style={{display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer"}}>
          <span style={{fontSize:12,fontWeight:800,color:C.text}}>⚡ {lang==='vi'?'Tự đổi BPM':'Auto BPM'}</span>
          <input type="checkbox" checked={autoMode} disabled={syncOn} onChange={e=>setAutoMode(e.target.checked)}
            style={{accentColor:C.primary,width:18,height:18,cursor:syncOn?"not-allowed":"pointer",opacity:syncOn?.5:1}}/>
        </label>
        {autoMode && (
          <div style={{marginTop:8,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            <label style={{fontSize:10,color:C.sub,fontWeight:700,display:"flex",flexDirection:"column",gap:2}}>
              MIN
              <input type="number" min={40} max={autoMax-5} value={autoMin}
                onChange={e=>setAutoMin(Math.max(40,Math.min(autoMax-5,parseInt(e.target.value)||40)))}
                style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:6,padding:"4px 6px",color:C.text,fontSize:13,fontWeight:700}}/>
            </label>
            <label style={{fontSize:10,color:C.sub,fontWeight:700,display:"flex",flexDirection:"column",gap:2}}>
              MAX
              <input type="number" min={autoMin+5} max={220} value={autoMax}
                onChange={e=>setAutoMax(Math.max(autoMin+5,Math.min(220,parseInt(e.target.value)||220)))}
                style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:6,padding:"4px 6px",color:C.text,fontSize:13,fontWeight:700}}/>
            </label>
            <label style={{fontSize:10,color:C.sub,fontWeight:700,display:"flex",flexDirection:"column",gap:2}}>
              {lang==='vi'?'CHU KỲ (s)':'CYCLE (s)'}
              <input type="number" min={5} max={300} value={autoPeriod}
                onChange={e=>setAutoPeriod(Math.max(5,Math.min(300,parseInt(e.target.value)||30)))}
                style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:6,padding:"4px 6px",color:C.text,fontSize:13,fontWeight:700}}/>
            </label>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:8}}>
        {running ? (
          <button onClick={stop} style={{padding:"11px",borderRadius:12,border:"none",background:`linear-gradient(135deg,${C.danger},#dc2626)`,color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer"}}>
            ⏹ {lang==='vi'?'Dừng':'Stop'}
          </button>
        ) : (
          <button onClick={start} style={{padding:"11px",borderRadius:12,border:"none",background:`linear-gradient(135deg,${C.primary},${C.accent})`,color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",boxShadow:`0 4px 14px ${C.primary}66`}}>
            ▶ {lang==='vi'?'Phát nhịp':'Play'}
          </button>
        )}
        <button onClick={tap} style={{padding:"11px",borderRadius:12,border:`1px solid ${C.accent}66`,background:C.surface,color:C.accent,fontWeight:800,fontSize:13,cursor:"pointer"}}>
          👆 TAP
        </button>
      </div>

      <div style={{fontSize:10,color:C.sub,marginTop:8,lineHeight:1.5}}>
        {lang==='vi'
          ? 'Gõ "TAP" 2–4 lần để app tự tính BPM theo nhịp bạn muốn.'
          : 'Hit "TAP" 2–4 times to auto-detect your tempo.'}
      </div>
    </Card>
  );
};


// ─── LOG MODAL (with photo + edging duration + separate shoot/edge) ──────────
const LogModal=({open,onClose,onSave,editSession,t,age,defaultType,lang})=>{
  const [notes,setNotes]=useState("");
  const [type,setType]=useState(defaultType||"shoot");
  const [customTime,setCustomTime]=useState(false);
  const [customDate,setCustomDate]=useState("");
  const [vis,setVis]=useState(false);
  const [photoData,setPhotoData]=useState(null);     // image dataURL OR {type:'video',dataUrl,...}
  const [showCrop,setShowCrop]=useState(false);
  const [rawPhoto,setRawPhoto]=useState(null);
  const [showVidTrim,setShowVidTrim]=useState(false);
  const [rawVideo,setRawVideo]=useState(null);
  const [edgeDuration,setEdgeDuration]=useState(15);
  const fileInputRef=useRef();
  const videoInputRef=useRef();
  const rec=getAgeRec(age||25);

  // Detect if current photoData is a video object
  const isVideo = photoData && typeof photoData==='object' && photoData.type==='video';

  useEffect(()=>{
    if(open){
      setNotes(editSession?.notes||"");
      setType(defaultType||(editSession?.type||"shoot"));
      setCustomTime(false);setCustomDate("");
      setPhotoData(editSession?.photo||null);
      setEdgeDuration(editSession?.edgeDuration||rec.edgeDuration.min);
      setTimeout(()=>setVis(true),10);
    } else setVis(false);
  },[open,editSession,defaultType]);

  if(!open)return null;

  // 20MB cap to keep localStorage sane
  const MAX_BYTES = 20*1024*1024;

  const handleFile=e=>{
    const f=e.target.files[0];if(!f)return;
    if(f.size > MAX_BYTES){
      alert(lang==='vi'?'File quá lớn (>20MB).':'File too large (>20MB).');
      e.target.value=''; return;
    }
    const reader=new FileReader();
    reader.onload=ev=>{setRawPhoto(ev.target.result);setShowCrop(true);};
    reader.readAsDataURL(f);
    e.target.value='';
  };

  const handleVideoFile=e=>{
    const f=e.target.files[0];if(!f)return;
    if(f.size > MAX_BYTES){
      alert(lang==='vi'?'Video quá lớn (>20MB). Hãy chọn video ngắn hơn.':'Video too large (>20MB). Pick a shorter clip.');
      e.target.value=''; return;
    }
    const url = URL.createObjectURL(f);
    setRawVideo(url);
    setShowVidTrim(true);
    e.target.value='';
  };

  const handleCropSave=dataUrl=>{
    setPhotoData(dataUrl);setShowCrop(false);setRawPhoto(null);
  };
  const handleVideoSave=videoObj=>{
    setPhotoData(videoObj);
    setShowVidTrim(false);
    if(rawVideo){ URL.revokeObjectURL(rawVideo); setRawVideo(null); }
  };

  const save=()=>{
    let ts=editSession?editSession.timestamp:worldNow().toISOString();
    if(customTime&&customDate){const p=new Date(customDate);if(!isNaN(p))ts=p.toISOString();}
    onSave({notes:notes.trim(),timestamp:ts,type,photo:photoData,edgeDuration:type==='edge'?edgeDuration:null});
    onClose();
  };
  const localNow=()=>{
    // Build a YYYY-MM-DDTHH:mm string in the user's chosen timezone using
    // world-synced clock. The datetime-local input expects local-naive ISO.
    const p = partsInTZ(worldNow());
    const pad=(n)=>String(n).padStart(2,"0");
    return `${p.year}-${pad(p.month+1)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
  };

  return(
    <>
      {showCrop&&rawPhoto&&<PhotoViewer src={rawPhoto} onClose={()=>{setShowCrop(false);setRawPhoto(null);}} onSave={handleCropSave} t={t}/>}
      {showVidTrim&&rawVideo&&<VideoTrimmer src={rawVideo} onClose={()=>{setShowVidTrim(false); if(rawVideo){URL.revokeObjectURL(rawVideo);setRawVideo(null);}}} onSave={handleVideoSave} t={t} lang={lang||'vi'}/>}
      <div style={{position:"fixed",inset:0,background:`rgba(0,0,0,${vis ? 0.75 : 0})`,zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center",transition:"background .3s"}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
        <div style={{background:"#13131e",borderRadius:"28px 28px 0 0",padding:"20px 20px 36px",width:"100%",maxWidth:480,boxSizing:"border-box",border:`1px solid ${C.border}`,transform:vis?"translateY(0)":"translateY(100%)",transition:"transform .35s",maxHeight:"92vh",overflowY:"auto",WebkitOverflowScrolling:"touch",overscrollBehavior:"contain"}}>
          {/* drag handle / scroll affordance */}
          <div style={{width:40,height:4,background:C.border,borderRadius:99,margin:"0 auto 10px"}}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <span style={{fontSize:17,fontWeight:700,color:C.text}}>{editSession?t.editSession:(type==='shoot'?t.logShoot:t.logEdge)}</span>
            <button onClick={onClose} style={{background:C.surface,border:`1px solid ${C.border}`,width:32,height:32,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,cursor:"pointer",color:C.sub}}>✕</button>
          </div>

          {!editSession&&(
            <div style={{display:"flex",gap:10,marginBottom:14}}>
              <button onClick={()=>setType('shoot')} style={{flex:1,padding:"14px 10px",borderRadius:14,border:`2px solid ${type==='shoot'?C.primary:C.border}`,background:type==='shoot'?`${C.primary}25`:C.surface,color:type==='shoot'?C.primary:C.sub,fontWeight:800,fontSize:16,cursor:"pointer",transition:"all .2s"}}>
                💦<br/><span style={{fontSize:12}}>Bắn</span>
              </button>
              <button onClick={()=>setType('edge')} style={{flex:1,padding:"14px 10px",borderRadius:14,border:`2px solid ${type==='edge'?C.sky:C.border}`,background:type==='edge'?`${C.sky}25`:C.surface,color:type==='edge'?C.sky:C.sub,fontWeight:800,fontSize:16,cursor:"pointer",transition:"all .2s"}}>
                ⏳<br/><span style={{fontSize:12}}>Edging</span>
              </button>
            </div>
          )}

          {type==='edge'&&(
            <div style={{background:C.surface,borderRadius:14,padding:14,marginBottom:14,border:`1px solid ${C.sky}33`}}>
              <div style={{fontSize:12,fontWeight:700,color:C.sky,marginBottom:8}}>⏱ {t.edgeDuration}: <span style={{color:C.text,fontSize:15}}>{edgeDuration} phút</span></div>
              <input type="range" min={rec.edgeDuration.min} max={rec.edgeDuration.max} value={edgeDuration}
                onChange={e=>setEdgeDuration(+e.target.value)}
                style={{width:"100%",accentColor:C.sky}}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.sub,marginTop:4}}>
                <span>{rec.edgeDuration.min}p (min)</span>
                <span>{rec.edgeDuration.max}p (max khuyến cáo)</span>
              </div>
            </div>
          )}

          <div style={{background:C.surface,borderRadius:14,padding:12,marginBottom:12,border:`1px solid ${C.border}`}}>
            <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:C.sub}}>
              <input type="checkbox" checked={customTime} onChange={e=>setCustomTime(e.target.checked)} style={{accentColor:C.primary}}/>
              {t.setCustomTime}
            </label>
            {customTime&&<input type="datetime-local" defaultValue={localNow()} onChange={e=>setCustomDate(e.target.value)} style={{marginTop:10,width:"100%",padding:"8px 12px",borderRadius:10,border:`1px solid ${C.border}`,fontSize:14,boxSizing:"border-box",background:C.card,color:C.text}}/>}
          </div>

          <div style={{marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:600,color:C.sub,marginBottom:6}}>📝 {t.notes}</div>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder={t.notesPlaceholder} rows={2} style={{width:"100%",padding:"12px",borderRadius:12,border:`1px solid ${C.border}`,fontSize:14,resize:"none",boxSizing:"border-box",background:C.surface,color:C.text}}/>
          </div>

          {/* Media section: image OR video */}
          <div style={{marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:600,color:C.sub,marginBottom:8}}>📷 {lang==='vi'?'Thêm ảnh hoặc video':'Add photo or video'}</div>
            <input ref={fileInputRef} type="file" accept="image/*" capture="camera" onChange={handleFile} style={{display:"none"}}/>
            <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoFile} style={{display:"none"}}/>
            {photoData ? (
              isVideo ? (
                <div style={{position:"relative",width:"100%"}}>
                  <video src={photoData.dataUrl} controls playsInline style={{width:"100%",borderRadius:12,maxHeight:240,background:"#000",border:`1px solid ${C.border}`}}/>
                  <div style={{position:"absolute",top:6,right:6,display:"flex",gap:6}}>
                    <button onClick={()=>setPhotoData(null)} style={{background:"rgba(239,68,68,.8)",border:"none",borderRadius:8,padding:"5px 8px",color:"#fff",fontSize:11,cursor:"pointer"}}>✕</button>
                  </div>
                  <div style={{fontSize:10,color:C.sub,marginTop:4}}>🎬 {photoData.duration?.toFixed?.(1)}s · {photoData.fps}fps</div>
                </div>
              ) : (
                <div style={{position:"relative",display:"inline-block",width:"100%"}}>
                  <img src={photoData} alt="session" style={{width:"100%",borderRadius:12,maxHeight:180,objectFit:"contain",background:C.surface,border:`1px solid ${C.border}`}}/>
                  <div style={{position:"absolute",top:6,right:6,display:"flex",gap:6}}>
                    <button onClick={()=>{setRawPhoto(photoData);setShowCrop(true);}} style={{background:"rgba(0,0,0,.7)",border:"none",borderRadius:8,padding:"5px 8px",color:"#fff",fontSize:11,cursor:"pointer"}}>✂️ {t.cropPhoto.split(" ")[0]}</button>
                    <button onClick={()=>setPhotoData(null)} style={{background:"rgba(239,68,68,.8)",border:"none",borderRadius:8,padding:"5px 8px",color:"#fff",fontSize:11,cursor:"pointer"}}>✕</button>
                  </div>
                </div>
              )
            ):(
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>fileInputRef.current?.click()} style={{flex:1,background:C.surface,border:`1.5px dashed ${C.border}`,borderRadius:12,padding:"18px 8px",color:C.sub,cursor:"pointer",fontSize:13,fontWeight:600}}>
                  📷 {lang==='vi'?'Ảnh':'Photo'}
                </button>
                <button onClick={()=>videoInputRef.current?.click()} style={{flex:1,background:C.surface,border:`1.5px dashed ${C.border}`,borderRadius:12,padding:"18px 8px",color:C.sub,cursor:"pointer",fontSize:13,fontWeight:600}}>
                  🎬 {lang==='vi'?'Video':'Video'}
                </button>
              </div>
            )}
          </div>

          <button onClick={save} style={{width:"100%",background:`linear-gradient(135deg,${type==='shoot'?C.primary:C.sky},${type==='shoot'?'#a855f7':'#0ea5e9'})`,color:"#fff",border:"none",borderRadius:14,padding:"14px",fontWeight:700,fontSize:15,cursor:"pointer"}}>
            {editSession?t.saveChanges:(type==='shoot'?(lang==='vi'?"💦 Bắn":"💦 Shoot"):(lang==='vi'?"⏳ Edging":"⏳ Edge"))}
          </button>
        </div>
      </div>
    </>
  );
};

// ─── QUOTE MODAL ─────────────────────────────────────────────────────────────
const QuoteModal=({open,onClose,quotes,setQuotes,t})=>{
  const [newQ,setNewQ]=useState("");
  if(!open)return null;
  const handleAdd=()=>{if(newQ.trim()){setQuotes([...quotes,newQ.trim()]);setNewQ("");}};
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:C.card,borderRadius:20,padding:20,width:"100%",maxWidth:400,border:`1px solid ${C.border}`}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
          <div style={{fontWeight:700,color:C.text}}>{t.quotesEditTitle}</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.sub,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          <input value={newQ} onChange={e=>setNewQ(e.target.value)} placeholder={t.quotePlaceholder} style={{flex:1,padding:"10px",borderRadius:10,border:`1px solid ${C.border}`,background:C.surface,color:C.text}}/>
          <button onClick={handleAdd} style={{background:C.primary,color:"#fff",border:"none",borderRadius:10,padding:"0 16px",fontWeight:600}}>{t.addQuote}</button>
        </div>
        <div style={{maxHeight:300,overflowY:"auto",display:"flex",flexDirection:"column",gap:8}}>
          {quotes.map((q,i)=>(
            <div key={i} style={{background:C.surface,padding:"10px 12px",borderRadius:10,fontSize:13,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{color:C.text,fontStyle:"italic"}}>{q}</span>
              <button onClick={()=>setQuotes(quotes.filter((_,idx)=>idx!==i))} style={{background:"none",border:"none",color:C.danger,fontSize:16,cursor:"pointer"}}>🗑</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── HOME TAB ─────────────────────────────────────────────────────────────────
// User-name input shown in UserTab — saves to localStorage for greetings
const OwnerNameField=({t})=>{
  const [name,setName]=useState(()=>load(MOTIVATION_OWNER_KEY)||"");
  const [saved,setSaved]=useState(false);
  const handleSave=()=>{
    save(MOTIVATION_OWNER_KEY,name.trim());
    if(typeof window!=='undefined') window.dispatchEvent(new Event("ht-owner-name-changed"));
    setSaved(true);
    setTimeout(()=>setSaved(false),1500);
  };
  return(
    <div style={{marginTop:12,paddingTop:12,borderTop:`1px dashed ${C.border}`}}>
      <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:6,display:"flex",alignItems:"center",gap:6}}>
        <User size={13}/> {t.ownerName}
      </div>
      <div style={{display:"flex",gap:8}}>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder={t.ownerNamePh}
          style={{flex:1,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"8px 10px",color:C.text,fontSize:13,outline:"none"}}/>
        <button onClick={handleSave}
          style={{background:C.primary,border:"none",borderRadius:10,padding:"8px 14px",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>
          {saved?"✓ "+t.ownerSaved:t.saveOwner}
        </button>
      </div>
    </div>
  );
};

// Locked video shown on HomeTab — autoplays muted, no controls, cannot be paused or seeked
const LockedVideo=({src})=>{
  return(
    <div style={{position:"relative",background:"#000"}}>
      <video src={src} autoPlay loop muted playsInline disablePictureInPicture controlsList="nodownload nofullscreen noremoteplayback noplaybackrate"
        style={{width:"100%",display:"block",maxHeight:300,background:"#000",pointerEvents:"none"}}/>
      {/* transparent overlay blocks all interaction (pause/seek/context menu) */}
      <div onContextMenu={e=>e.preventDefault()}
        style={{position:"absolute",inset:0,cursor:"default"}}/>
    </div>
  );
};

// Suggested session-duration presets — replaces the next-shoot countdown card
const SUGGESTED_DURATIONS_KEY = "ht_suggested_duration_v1";
const SuggestedDurationCard=({lang})=>{
  const presets = [
    {id:"15m",  mins:15,  label_vi:"15 phút",  label_en:"15 min",   tag_vi:"Nhanh gọn",   tag_en:"Quickie",
      goals_vi:["Warm-up 2 phút","1 lần edging ngắn","Bắn dứt khoát"],
      goals_en:["2-min warm-up","1 short edge","Finish cleanly"]},
    {id:"30m",  mins:30,  label_vi:"30 phút",  label_en:"30 min",   tag_vi:"Tiêu chuẩn",  tag_en:"Standard",
      goals_vi:["Warm-up 5 phút","2 lần edging","Tập thở khi gần đỉnh","Bắn thoải mái"],
      goals_en:["5-min warm-up","2 edges","Breathe near peak","Relaxed finish"]},
    {id:"1h",   mins:60,  label_vi:"1 tiếng",  label_en:"1 hour",   tag_vi:"Sâu",         tag_en:"Deep",
      goals_vi:["Warm-up 10 phút","3–4 lần edging","Giữ mỗi edge ≥5 phút","Thư giãn cơ sàn chậu","Bắn có kiểm soát"],
      goals_en:["10-min warm-up","3–4 edges","Hold each edge ≥5 min","Relax pelvic floor","Controlled finish"]},
    {id:"90m",  mins:90,  label_vi:"1.5 tiếng",label_en:"1.5 hour", tag_vi:"Mở rộng",     tag_en:"Extended",
      goals_vi:["Warm-up 15 phút","4–5 lần edging","Đổi kỹ thuật giữa các edge","Nghỉ ngắn 1–2 lần","Tập trung vào cảm giác","Bắn mạnh & sâu"],
      goals_en:["15-min warm-up","4–5 edges","Switch technique between edges","1–2 short breaks","Focus on sensation","Strong, deep finish"]},
    {id:"2h",   mins:120, label_vi:"2 tiếng",  label_en:"2 hour",   tag_vi:"Marathon",    tag_en:"Marathon",
      goals_vi:["Warm-up 15–20 phút","5+ lần edging","Uống nước giữa phiên","Thử ít nhất 2 kỹ thuật","Giữ nhịp thở chậm","Đẩy giới hạn an toàn","Bắn bùng nổ"],
      goals_en:["15–20 min warm-up","5+ edges","Hydrate mid-session","Try 2+ techniques","Slow breathing","Push the edge safely","Explosive finish"]},
  ];
  const [picked,setPicked]=useState(()=>load(SUGGESTED_DURATIONS_KEY)||"30m");
  const choose=(id)=>{ setPicked(id); save(SUGGESTED_DURATIONS_KEY,id); };
  const current = presets.find(p=>p.id===picked) || presets[1];
  return(
    <Card style={{marginBottom:10,background:`linear-gradient(135deg,${C.primary}22,${C.navy}55)`,border:`1px solid ${C.primary}55`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <span style={{fontWeight:800,fontSize:14,color:C.text,letterSpacing:.2}}>⏱️ {lang==='vi'?'Thời gian gợi ý cho phiên bắn':'Suggested shoot duration'}</span>
        <span style={{fontSize:11,fontWeight:700,color:C.accent}}>{lang==='vi'?current.tag_vi:current.tag_en}</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6,marginBottom:8}}>
        {presets.map(p=>{
          const active = p.id===picked;
          return(
            <button key={p.id} onClick={()=>choose(p.id)}
              style={{
                padding:"10px 4px",borderRadius:12,cursor:"pointer",fontSize:11,fontWeight:800,
                border:`1px solid ${active?C.primary:C.border}`,
                background: active ? `linear-gradient(135deg,${C.primary},${C.accent})` : C.surface,
                color: active ? "#fff" : C.text,
                boxShadow: active ? `0 4px 14px ${C.primary}55` : "none",
                transition:"all .2s",
              }}>
              {lang==='vi'?p.label_vi:p.label_en}
            </button>
          );
        })}
      </div>
      <div style={{fontSize:11,color:C.sub,lineHeight:1.5,marginBottom:10}}>
        {lang==='vi'
          ? `Mục tiêu phiên: kéo dài khoảng ${current.mins} phút trước khi bắn — gồm warm-up, edging và phần kết.`
          : `Session goal: aim for around ${current.mins} minutes before climax — warm-up, edging and finish.`}
      </div>
      <div style={{background:C.surface,borderRadius:12,padding:"10px 12px",border:`1px solid ${C.border}`}}>
        <div style={{fontSize:11,fontWeight:800,color:C.accent,letterSpacing:.4,marginBottom:6}}>
          🎯 {lang==='vi'?'MỤC TIÊU PHIÊN':'SESSION GOALS'}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:5}}>
          {(lang==='vi'?current.goals_vi:current.goals_en).map((g,i)=>(
            <div key={i} style={{display:"flex",alignItems:"flex-start",gap:8,fontSize:12,color:C.text,lineHeight:1.4}}>
              <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",minWidth:18,height:18,borderRadius:"50%",background:`${C.primary}33`,color:C.accent,fontSize:10,fontWeight:800,flexShrink:0,marginTop:1}}>{i+1}</span>
              <span>{g}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

// ─── Live session timer ───────────────────────────────────────────────────
// Counts down from the selected suggested duration, beeps on each milestone.
const SESSION_DURATIONS = {
  "15m": { total: 15, milestones: [
    { at: 2,  label_vi:"Hết warm-up",         label_en:"Warm-up done" },
    { at: 10, label_vi:"Edge 1",              label_en:"Edge 1" },
  ]},
  "30m": { total: 30, milestones: [
    { at: 5,  label_vi:"Hết warm-up",         label_en:"Warm-up done" },
    { at: 15, label_vi:"Edge 1",              label_en:"Edge 1" },
    { at: 25, label_vi:"Edge 2",              label_en:"Edge 2" },
  ]},
  "1h":  { total: 60, milestones: [
    { at: 10, label_vi:"Hết warm-up",         label_en:"Warm-up done" },
    { at: 25, label_vi:"Edge 1",              label_en:"Edge 1" },
    { at: 40, label_vi:"Edge 2",              label_en:"Edge 2" },
    { at: 50, label_vi:"Edge 3",              label_en:"Edge 3" },
  ]},
  "90m": { total: 90, milestones: [
    { at: 15, label_vi:"Hết warm-up",         label_en:"Warm-up done" },
    { at: 30, label_vi:"Edge 1",              label_en:"Edge 1" },
    { at: 50, label_vi:"Edge 2",              label_en:"Edge 2" },
    { at: 70, label_vi:"Edge 3",              label_en:"Edge 3" },
    { at: 80, label_vi:"Edge 4",              label_en:"Edge 4" },
  ]},
  "2h":  { total: 120, milestones: [
    { at: 20,  label_vi:"Hết warm-up",        label_en:"Warm-up done" },
    { at: 40,  label_vi:"Edge 1",             label_en:"Edge 1" },
    { at: 65,  label_vi:"Edge 2",             label_en:"Edge 2" },
    { at: 85,  label_vi:"Edge 3",             label_en:"Edge 3" },
    { at: 100, label_vi:"Edge 4",             label_en:"Edge 4" },
  ]},
};

// Web Audio beep — short tone, no asset required.
const playBeep=(freq=880,durationMs=200,volume=0.25)=>{
  if(typeof window==='undefined') return;
  try{
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if(!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type="sine"; osc.frequency.value=freq;
    gain.gain.value=volume;
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs/1000);
    osc.stop(ctx.currentTime + durationMs/1000 + 0.02);
    setTimeout(()=>{ try{ ctx.close(); }catch{} }, durationMs+120);
  }catch{}
};

const formatMMSS=(secs)=>{
  const s = Math.max(0, Math.floor(secs));
  const m = Math.floor(s/60); const r = s%60;
  return `${String(m).padStart(2,"0")}:${String(r).padStart(2,"0")}`;
};

const SessionTimerCard=({lang})=>{
  const [pickedId,setPickedId]=useState(()=>load(SUGGESTED_DURATIONS_KEY)||"30m");
  useEffect(()=>{
    const refresh=()=>setPickedId(load(SUGGESTED_DURATIONS_KEY)||"30m");
    const i=setInterval(refresh,800); // pick up changes from SuggestedDurationCard
    return()=>clearInterval(i);
  },[]);
  const cfg = SESSION_DURATIONS[pickedId] || SESSION_DURATIONS["30m"];
  const totalSec = cfg.total*60;

  const [running,setRunning]=useState(false);
  const [remaining,setRemaining]=useState(totalSec);
  const [hitMs,setHitMs]=useState<Record<number,boolean>>({});
  const [soundOn,setSoundOn]=useState(true);
  const tickRef = useRef<any>(null);
  const endAtRef = useRef<number>(0);

  // Reset whenever the picked preset changes (and not currently running)
  useEffect(()=>{
    if(!running){ setRemaining(totalSec); setHitMs({}); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[pickedId]);

  const stopInterval=()=>{ if(tickRef.current){ clearInterval(tickRef.current); tickRef.current=null; } };

  const publishPhase=(elapsedSec:number,isRunning:boolean)=>{
    const p = computeSessionPhase(elapsedSec, totalSec, cfg.milestones);
    sessionSync.set({ running:isRunning, ...p });
  };

  const start=()=>{
    if(running) return;
    endAtRef.current = Date.now() + remaining*1000;
    setRunning(true);
    if(soundOn) playBeep(660,160);
    publishPhase(totalSec - remaining, true);
    tickRef.current = setInterval(()=>{
      const left = Math.max(0, Math.round((endAtRef.current - Date.now())/1000));
      setRemaining(left);
      // milestone detection
      const elapsedSec = totalSec - left;
      const elapsedMin = elapsedSec/60;
      cfg.milestones.forEach((m,i)=>{
        if(elapsedMin >= m.at && !hitMs[i]){
          setHitMs(prev=>({...prev,[i]:true}));
          if(soundOn) playBeep(880,260);
          if(typeof navigator!=='undefined' && navigator.vibrate) try{ navigator.vibrate(120); }catch{}
        }
      });
      publishPhase(elapsedSec, true);
      if(left<=0){
        stopInterval();
        setRunning(false);
        sessionSync.set({ running:false, phase:"idle", targetBpm:60, label_vi:"Hoàn tất", label_en:"Done" });
        if(soundOn){ playBeep(1100,500,0.3); setTimeout(()=>playBeep(880,500,0.3),350); }
        if(typeof navigator!=='undefined' && navigator.vibrate) try{ navigator.vibrate([200,80,200]); }catch{}
      }
    },250);
  };
  const pause=()=>{ stopInterval(); setRunning(false); sessionSync.set({ running:false }); };
  const reset=()=>{
    stopInterval(); setRunning(false); setRemaining(totalSec); setHitMs({});
    sessionSync.set({ running:false, phase:"idle", targetBpm:60, label_vi:"Sẵn sàng", label_en:"Ready" });
  };

  useEffect(()=>()=>{
    stopInterval();
    // clear sync bus on unmount so metronome doesn't keep stale state
    sessionSync.set({ running:false, phase:"idle" });
  },[]);

  const elapsed = totalSec - remaining;
  const pct = Math.min(100, (elapsed/totalSec)*100);
  const elapsedMin = elapsed/60;
  const nextMs = cfg.milestones.find(m=>m.at > elapsedMin);
  const nextText = nextMs
    ? `${lang==='vi'?nextMs.label_vi:nextMs.label_en} · ${formatMMSS((nextMs.at*60) - elapsed)}`
    : (lang==='vi'?'Chuẩn bị bắn 💥':'Final stretch 💥');

  return(
    <Card style={{marginBottom:10,background:`linear-gradient(135deg,${C.navy}88,${C.primary}33)`,border:`1px solid ${C.primary}66`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <span style={{fontWeight:800,fontSize:14,color:C.text,letterSpacing:.2}}>⏲️ {lang==='vi'?'Bộ đếm phiên live':'Live session timer'}</span>
        <button onClick={()=>setSoundOn(s=>!s)} title={soundOn?'Mute':'Unmute'}
          style={{background:"transparent",border:"none",color:C.accent,fontSize:14,cursor:"pointer"}}>
          {soundOn?'🔔':'🔕'}
        </button>
      </div>
      <div style={{textAlign:"center",margin:"6px 0 10px"}}>
        <div style={{fontSize:44,fontWeight:900,letterSpacing:1,color:C.text,lineHeight:1,fontVariantNumeric:"tabular-nums"}}>
          {formatMMSS(remaining)}
        </div>
        <div style={{fontSize:11,color:C.sub,marginTop:4}}>
          {lang==='vi'?'Tổng':'Total'}: {cfg.total} {lang==='vi'?'phút':'min'} · {lang==='vi'?'Kế tiếp':'Next'}: {nextText}
        </div>
        {running && (()=>{
          const ph = computeSessionPhase(elapsed, totalSec, cfg.milestones);
          return (
            <div style={{display:"inline-flex",alignItems:"center",gap:6,marginTop:6,
              background:`${C.primary}22`,border:`1px solid ${C.primary}66`,borderRadius:99,padding:"3px 10px"}}>
              <span style={{fontSize:10,fontWeight:800,color:C.accent}}>🔗 {lang==='vi'?ph.label_vi:ph.label_en}</span>
              <span style={{fontSize:10,fontWeight:800,color:C.text}}>· {ph.targetBpm} BPM</span>
            </div>
          );
        })()}
      </div>
      <div style={{background:C.border,borderRadius:99,height:8,overflow:"hidden",marginBottom:10,position:"relative"}}>
        <div style={{width:`${pct}%`,height:"100%",background:`linear-gradient(90deg,${C.primary},${C.accent})`,borderRadius:99,transition:"width .3s"}}/>
        {cfg.milestones.map((m,i)=>{
          const left=(m.at/cfg.total)*100;
          const reached=hitMs[i];
          return(
            <div key={i} title={lang==='vi'?m.label_vi:m.label_en}
              style={{position:"absolute",top:-2,left:`calc(${left}% - 4px)`,width:8,height:12,borderRadius:3,background:reached?C.gold:C.surface,border:`1.5px solid ${reached?C.gold:C.accent}`}}/>
          );
        })}
      </div>
      <div style={{display:"grid",gridTemplateColumns:running?"1fr 1fr":"2fr 1fr",gap:8}}>
        {running ? (
          <button onClick={pause} style={{padding:"11px",borderRadius:12,border:"none",background:`linear-gradient(135deg,${C.warn},#d97706)`,color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer"}}>
            ⏸ {lang==='vi'?'Tạm dừng':'Pause'}
          </button>
        ) : (
          <button onClick={start} style={{padding:"11px",borderRadius:12,border:"none",background:`linear-gradient(135deg,${C.primary},${C.accent})`,color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",boxShadow:`0 4px 14px ${C.primary}66`}}>
            ▶ {remaining<totalSec ? (lang==='vi'?'Tiếp tục':'Resume') : (lang==='vi'?'Bắt đầu':'Start')}
          </button>
        )}
        <button onClick={reset} disabled={remaining===totalSec && !running}
          style={{padding:"11px",borderRadius:12,border:`1px solid ${C.border}`,background:C.surface,color:C.text,fontWeight:700,fontSize:13,cursor:"pointer",opacity:(remaining===totalSec && !running)?.5:1}}>
          ↺ {lang==='vi'?'Đặt lại':'Reset'}
        </button>
      </div>
      <div style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:6}}>
        {cfg.milestones.map((m,i)=>{
          const reached=hitMs[i];
          return(
            <span key={i} style={{fontSize:10,fontWeight:700,padding:"4px 8px",borderRadius:99,
              background:reached?`${C.gold}22`:C.surface,
              color:reached?C.gold:C.sub,
              border:`1px solid ${reached?C.gold+"88":C.border}`}}>
              {reached?'✓ ':''}{lang==='vi'?m.label_vi:m.label_en} · {m.at}m
            </span>
          );
        })}
      </div>
    </Card>
  );
};

const HomeTab=({sessions,onLogShoot,onLogEdge,t,lang,age,setAge,customQuotes,openQuoteModal,trackingStart,motivationPhoto,schedule,wheelTick})=>{
  const hours=useMemo(()=>hoursSinceLast(sessions),[sessions]);
  const level=useMemo(()=>getLevel(hours,t),[hours,t]);
  const edgeCountThisWeek = useMemo(()=>getThisWeekCount(getEdges(sessions)),[sessions]);
  const rec=getAgeRec(age);
  const continuousDays=useMemo(()=>calcContinuousDays(trackingStart),[trackingStart]);
  const dailyChallenge=useMemo(()=>age?getDailyChallenge(age,schedule):null,[age,schedule,wheelTick]);
  const hasScheduleHome = !!(schedule && ((schedule.edge&&schedule.edge.length)||(schedule.shoot&&schedule.shoot.length)));
  const isShootDayToday = useMemo(()=>{
    // Without a schedule, treat every day as a potential shoot day so the
    // shoot-day challenge can also surface alongside the regular daily one.
    if(!hasScheduleHome) return true;
    if(!schedule||!schedule.shoot) return false;
    return schedule.shoot.includes(partsInTZ(worldNow()).dayOfWeek);
  },[schedule,hasScheduleHome]);
  const shootChallenge = useMemo(()=>isShootDayToday?getShootDayChallenge(age):null,[isShootDayToday,age,wheelTick]);

  const displayQuotes = customQuotes.length > 0 ? customQuotes : t.quotes;
  const quote=useMemo(()=>displayQuotes[Math.floor(Math.random()*displayQuotes.length)],[displayQuotes]);

  // Check if today's challenge is marked done. Use local state so toggling
  // the flag never has to reload the page (the reload was triggering an
  // app-crash on some devices).
  const today=todayKey();
  const [challengeDone,setChallengeDone]=useState(()=> {
    const log = (typeof window!=='undefined') ? (load(CHALLENGE_LOG_KEY)||{}) : {};
    return !!log[today];
  });
  useEffect(()=>{
    const log = load(CHALLENGE_LOG_KEY)||{};
    setChallengeDone(!!log[today]);
  },[today]);

  const markChallengeDone=()=>{
    const log = load(CHALLENGE_LOG_KEY)||{};
    save(CHALLENGE_LOG_KEY,{...log,[today]:true});
    setChallengeDone(true);
  };

  const [userName,setUserName]=useState(()=>(load(MOTIVATION_OWNER_KEY)||"").trim());
  useEffect(()=>{
    const refresh=()=>setUserName((load(MOTIVATION_OWNER_KEY)||"").trim());
    window.addEventListener("storage",refresh);
    window.addEventListener("ht-owner-name-changed",refresh);
    return()=>{
      window.removeEventListener("storage",refresh);
      window.removeEventListener("ht-owner-name-changed",refresh);
    };
  },[]);
  return(
    <div style={{padding:"14px 14px 100px"}}>
      {/* Friendly greeting */}
      <div style={{fontSize:20,fontWeight:900,color:C.text,marginBottom:10,letterSpacing:.2}}>
        {t.greetingHi} <span style={{background:`linear-gradient(135deg,${C.accent},${C.gold})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{userName||t.greetingDefault}</span> 👋
      </div>
      {/* Quote */}
      <div style={{background:C.surface,borderRadius:18,padding:"14px 16px",marginBottom:12,border:`1px solid ${C.border}`,position:"relative"}}>
        <button onClick={openQuoteModal} style={{position:"absolute",top:8,right:8,background:"none",border:"none",color:C.sub,cursor:"pointer",display:"inline-flex",alignItems:"center"}}><Pencil size={14}/></button>
        <div style={{fontSize:13,color:"rgba(240,240,255,.65)",lineHeight:1.7,fontStyle:"italic",paddingRight:20}}>{quote}</div>
      </div>

      {/* Motivation photo / video */}
      {motivationPhoto && (
        <div style={{borderRadius:18,overflow:"hidden",marginBottom:12,border:`1px solid ${C.gold}55`,position:"relative"}}>
          {typeof motivationPhoto==='string' && motivationPhoto.startsWith('data:video') ? (
            <LockedVideo src={motivationPhoto}/>
          ) : (
            <img src={motivationPhoto} alt="motivation" style={{width:"100%",display:"block",maxHeight:260,objectFit:"contain",background:C.surface}}/>
          )}
          <div style={{position:"absolute",bottom:8,left:10,background:"rgba(0,0,0,.55)",color:C.gold,fontSize:11,fontWeight:700,padding:"3px 8px",borderRadius:8,pointerEvents:"none"}}>✨ Motivation</div>
        </div>
      )}

      {/* Shoot-day challenge (only if today is scheduled shoot day) */}
      {isShootDayToday && shootChallenge && (
        <Card style={{background:`${C.gold}12`,border:`1px solid ${C.gold}55`,marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:700,color:C.gold,marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
            <span>{t.polishHeadDay}</span>
            {schedule?.shootTime && <span style={{color:C.sub,fontWeight:600}}>⏰ {schedule.shootTime} · {getTimezone()}</span>}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{fontSize:32}}>{shootChallenge.icon}</div>
            <div>
              <div style={{fontSize:14,fontWeight:800,color:C.text}}>{lang==='vi'?shootChallenge.name_vi:shootChallenge.name_en}</div>
              <div style={{fontSize:12,color:C.sub,lineHeight:1.5,marginTop:2}}>{lang==='vi'?shootChallenge.desc_vi:shootChallenge.desc_en}</div>
            </div>
          </div>
        </Card>
      )}

      {/* Daily Challenge Card */}
      {dailyChallenge&&(
        <Card style={{background:challengeDone?`${C.green}15`:`${C.warn}12`,border:`1px solid ${challengeDone?C.green:C.warn}44`,marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div style={{flex:1}}>
              <div style={{fontSize:11,fontWeight:700,color:challengeDone?C.green:C.warn,marginBottom:4}}>
                {challengeDone?"✅ "+t.challengeCompleted:"🎯 "+t.dailyChallenge}
              </div>
              <div style={{fontSize:22,marginBottom:4}}>{dailyChallenge.icon}</div>
              <div style={{fontSize:14,fontWeight:800,color:C.text,marginBottom:2}}>{lang==='vi'?dailyChallenge.name_vi:dailyChallenge.name_en}</div>
              <div style={{fontSize:12,color:C.sub,lineHeight:1.5}}>{lang==='vi'?dailyChallenge.desc_vi:dailyChallenge.desc_en}</div>
            </div>
            {!challengeDone&&(
              <button onClick={markChallengeDone} style={{background:C.green,border:"none",borderRadius:10,padding:"8px 12px",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",marginLeft:10,whiteSpace:"nowrap"}}>✓ Done</button>
            )}
          </div>
        </Card>
      )}

      {/* Today's goal — derived from schedule + active events/challenges */}
      {(() => {
        const dow = partsInTZ(worldNow()).dayOfWeek;
        const hasSched = !!(schedule && ((schedule.edge&&schedule.edge.length)||(schedule.shoot&&schedule.shoot.length)));
        const isEdgeDay = hasSched ? (schedule.edge||[]).includes(dow) : false;
        const isShootDay = hasSched ? (schedule.shoot||[]).includes(dow) : false;
        const novState = getNovChallengeState();
        const nowD = worldNow();
        const novActiveNow = novState.status==='active' && novState.year===nowD.getFullYear() && nowD.getMonth()===10;
        const events = [];
        if (novActiveNow) events.push({ icon:"⚔️", label: lang==='vi'?'Thử thách Tháng 11 đang diễn ra':'November Challenge active' });
        if (dailyChallenge) events.push({ icon: dailyChallenge.icon, label: lang==='vi'?('Thử thách: '+dailyChallenge.name_vi):('Challenge: '+dailyChallenge.name_en) });
        if (isShootDayToday && shootChallenge) events.push({ icon: shootChallenge.icon, label: lang==='vi'?('Ngày bắn: '+shootChallenge.name_vi):('Shoot day: '+shootChallenge.name_en) });
        const goalEdge = novActiveNow ? 1 : (hasSched ? (isEdgeDay?1:0) : Math.max(1, Math.round(rec.edgeMax/3)));
        const goalShoot = novActiveNow ? 0 : (hasSched ? (isShootDay?1:0) : 0);
        const todayK = todayKey();
        const todays = sessions.filter(s=>{ const d=new Date(s.timestamp); return dayKey(d)===todayK; });
        const doneEdge = todays.filter(s=>s.type==='edge').length;
        const doneShoot = todays.filter(s=>s.type==='shoot').length;
        return (
          <Card style={{background:`linear-gradient(135deg,${C.primary}22,${C.sky}18)`,border:`1px solid ${C.primary}55`,marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:800,color:C.accent,marginBottom:10,letterSpacing:.4}}>
              🎯 {lang==='vi'?'Mục tiêu hôm nay':"Today's goal"}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:events.length?12:0}}>
              <div style={{background:C.surface,borderRadius:14,padding:"10px 12px",border:`1px solid ${C.border}`}}>
                <div style={{fontSize:10,color:C.sub,fontWeight:700,letterSpacing:.5,marginBottom:4}}>⏳ EDGING</div>
                <div style={{fontSize:18,fontWeight:900,color:doneEdge>=goalEdge?C.green:C.sky}}>
                  {doneEdge}<span style={{color:C.sub,fontSize:13,fontWeight:700}}> / {goalEdge}</span>
                </div>
                <div style={{fontSize:10,color:C.sub,marginTop:2}}>
                  {hasSched ? (isEdgeDay?(lang==='vi'?'Lịch tuần':'Scheduled')+(schedule.edgeTime?` · ${schedule.edgeTime}`:'') : (lang==='vi'?'Không bắt buộc':'Not required')) : (lang==='vi'?'Gợi ý':'Suggested')}
                </div>
              </div>
              <div style={{background:C.surface,borderRadius:14,padding:"10px 12px",border:`1px solid ${C.border}`}}>
                <div style={{fontSize:10,color:C.sub,fontWeight:700,letterSpacing:.5,marginBottom:4}}>💦 {lang==='vi'?'BẮN':'SHOOT'}</div>
                <div style={{fontSize:18,fontWeight:900,color:novActiveNow?C.danger:(doneShoot>=goalShoot&&goalShoot>0?C.green:C.text)}}>
                  {doneShoot}<span style={{color:C.sub,fontSize:13,fontWeight:700}}> / {goalShoot}</span>
                </div>
                <div style={{fontSize:10,color:C.sub,marginTop:2}}>
                  {novActiveNow ? (lang==='vi'?'🚫 Cấm bắn (T11)':'🚫 No shoot (Nov)') : hasSched ? (isShootDay?(lang==='vi'?'Lịch tuần':'Scheduled')+(schedule.shootTime?` · ${schedule.shootTime}`:'') : (lang==='vi'?'Không lịch':'Off-day')) : (lang==='vi'?'Tự do':'Free day')}
                </div>
              </div>
            </div>
            {events.length>0 && (
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {events.map((ev,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:C.text,background:C.surface,padding:"8px 10px",borderRadius:10,border:`1px solid ${C.border}`}}>
                    <span style={{fontSize:16}} className="emoji">{ev.icon}</span>
                    <span style={{lineHeight:1.4}}>{ev.label}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })()}

      {/* Stats ring */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
        <Card style={{textAlign:"center",padding:"20px 10px",marginBottom:0}}>
          <Ring pct={Math.min((continuousDays/30)*100,100)} color={C.accent} size={110} stroke={8}>
            <div>
              <div style={{fontSize:32,fontWeight:900,color:C.text,lineHeight:1}}><AnimNum value={continuousDays}/></div>
              <div style={{fontSize:9,fontWeight:700,color:C.sub,letterSpacing:1,marginTop:2}}>{t.streak}</div>
            </div>
          </Ring>
          <div style={{fontSize:11,fontWeight:700,color:C.text,marginTop:10}}>📅 {t.continuousTracking}</div>
        </Card>

        <Card style={{textAlign:"center",padding:"20px 10px",marginBottom:0}}>
          <Ring pct={Math.min((edgeCountThisWeek/rec.edgeMax)*100,100)} color={C.sky} size={110} stroke={8}>
            <div>
              <div style={{fontSize:32,fontWeight:900,color:C.sky,lineHeight:1}}><AnimNum value={edgeCountThisWeek}/></div>
              <div style={{fontSize:9,fontWeight:700,color:C.sub,letterSpacing:1,marginTop:2}}>{t.edgeCount}</div>
            </div>
          </Ring>
          <div style={{fontSize:11,fontWeight:700,color:C.text,marginTop:10}}>⏳ Edging ({t.thisWeek})</div>
        </Card>
      </div>

      {/* Suggested session duration presets */}
      <SuggestedDurationCard lang={lang}/>
      <SessionTimerCard lang={lang}/>
      <MetronomeCard lang={lang}/>

      {/* Recovery bar */}
      <Card>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <span style={{fontWeight:700,fontSize:14,color:C.text}}>{t.recoveryStatus}</span>
          <span style={{fontSize:13,fontWeight:700,color:level.color}}>{level.label}</span>
        </div>
        <div style={{background:C.border,borderRadius:99,height:8,overflow:"hidden"}}>
          <div style={{width:`${level.pct}%`,background:`linear-gradient(90deg,${level.color}88,${level.color})`,height:"100%",borderRadius:99}}/>
        </div>
        <div style={{fontSize:12,color:C.sub,marginTop:6}}>{level.pct}% {t.recovered} · {t.recoverySafe}: {rec.recovery}h</div>
      </Card>

      {/* Quick action buttons */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:4}}>
        <button onClick={onLogShoot} style={{padding:"16px",borderRadius:16,background:`linear-gradient(135deg,${C.primary},#a855f7)`,color:"#fff",border:"none",fontWeight:800,fontSize:18,cursor:"pointer",boxShadow:"0 4px 20px rgba(124,58,237,.4)"}}>
          💦<br/><span style={{fontSize:13}}>{lang==='vi'?'Bắn':'Shoot'}</span>
        </button>
        <button onClick={onLogEdge} style={{padding:"16px",borderRadius:16,background:`linear-gradient(135deg,${C.sky},#0ea5e9)`,color:"#fff",border:"none",fontWeight:800,fontSize:18,cursor:"pointer",boxShadow:"0 4px 20px rgba(56,189,248,.4)"}}>
          ⏳<br/><span style={{fontSize:13}}>Edging</span>
        </button>
      </div>
    </div>
  );
};

// ─── STATS TAB (dương lịch calendar heatmap) ─────────────────────────────────
const StatsTab=({sessions,t,trackingStart,lang})=>{
  const shoots=getShoots(sessions);
  const edges=getEdges(sessions);
  const longest=useMemo(()=>calcLongest(sessions),[sessions]);
  const continuousDays=useMemo(()=>calcContinuousDays(trackingStart),[trackingStart]);
  const totalEdgeDuration=useMemo(()=>edges.reduce((a,s)=>a+(s.edgeDuration||0),0),[edges]);

  const stats=[[continuousDays,"📅",t.daysTracked||"Ngày theo dõi",C.accent],[longest,"🏆",t.longest,C.gold],[shoots.length,"💦","Tổng Bắn",C.pink],[edges.length,<Timer size={16}/>,"Tổng Edging",C.sky]];

  // Health stats (moved from Health tab) — computed from localStorage
  const muscleLabels = lang==="vi" ? MUSCLE_LABELS_VI : MUSCLE_LABELS_EN;
  const healthStats = useMemo(() => {
    let completionLog = {};
    try { completionLog = JSON.parse(localStorage.getItem("health.completionLog") || "{}"); } catch {}
    const entries = Object.entries(completionLog);
    const today = new Date(); today.setHours(0,0,0,0);
    const startOfWeek = new Date(today); startOfWeek.setDate(today.getDate() - today.getDay());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    let week=0, month=0, totalMins=0;
    const muscleTotals = {};
    entries.forEach(([date, e]) => {
      const d = new Date(date);
      if (d >= startOfWeek) week++;
      if (d >= startOfMonth) month++;
      totalMins += e.duration || 0;
      Object.entries(e.muscles||{}).forEach(([m,v]) => { muscleTotals[m]=(muscleTotals[m]||0)+v; });
    });
    let streak = 0;
    for (let i=0;;i++) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0,10);
      if (completionLog[key]) streak++;
      else if (i === 0) {} else break;
    }
    const topMuscle = Object.entries(muscleTotals).sort((a,b)=>b[1]-a[1])[0]?.[0];
    const kcal = Math.round(totalMins * 6);
    return { total: entries.length, week, month, streak, topMuscle, kcal, totalMins };
  }, [sessions]);

  // Calendar heatmap - current month (dương lịch)
  const now=new Date();
  const year=now.getFullYear(),month=now.getMonth();
  const daysInMonth=new Date(year,month+1,0).getDate();
  const firstDow=new Date(year,month,1).getDay(); // 0=Sun

  const dayMap=useMemo(()=>{
    const m={};
    sessions.forEach(s=>{
      const k=dayKey(s.timestamp);
      if(!m[k])m[k]={shoot:0,edge:0};
      if(s.type==='edge')m[k].edge++;else m[k].shoot++;
    });
    return m;
  },[sessions]);

  const monthName=now.toLocaleDateString("vi-VN",{month:"long",year:"numeric"});
  const dayHeaders=["CN","T2","T3","T4","T5","T6","T7"];

  return(
    <div style={{padding:"14px 14px 100px"}}>
      {/* Weekly stats */}
      {(()=>{
        const weekShoots = getThisWeekCount(getShoots(sessions));
        const weekEdges = getThisWeekCount(getEdges(sessions));
        return (
          <Card style={{background:`linear-gradient(135deg,${C.primary}10,${C.sky}10)`,border:`1px solid ${C.accent}33`}}>
            <div style={{fontSize:13,fontWeight:800,color:C.accent,marginBottom:10}}>📅 {t.weeklyStats||'This week'}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div style={{background:`${C.primary}18`,borderRadius:12,padding:"12px",textAlign:"center"}}>
                <div style={{fontSize:11,color:C.sub}}>💦 {t.totalShoots||'Shoots'}</div>
                <div style={{fontSize:26,fontWeight:900,color:C.primary}}>{weekShoots}</div>
              </div>
              <div style={{background:`${C.sky}18`,borderRadius:12,padding:"12px",textAlign:"center"}}>
                <div style={{fontSize:11,color:C.sub}}>⏳ {t.totalEdges||'Edges'}</div>
                <div style={{fontSize:26,fontWeight:900,color:C.sky}}>{weekEdges}</div>
              </div>
            </div>
          </Card>
        );
      })()}

      <div style={{fontSize:18,fontWeight:800,color:C.text,marginBottom:16,display:"flex",alignItems:"center",gap:8}}><BarChart2 size={18}/> {t.statsTitle}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        {stats.map(([val,ic,lb,col])=>(
          <div key={lb} style={{background:C.card,borderRadius:18,padding:"16px 14px",border:`1px solid ${C.border}`}}>
            <div style={{fontSize:22}}>{ic}</div>
            <div style={{fontSize:30,fontWeight:900,color:col,marginTop:4}}><AnimNum value={val}/></div>
            <div style={{fontSize:11,color:C.sub,marginTop:2}}>{lb}</div>
          </div>
        ))}
      </div>

      {/* ── Health stats summary (moved from Health tab) ── */}
      <Card style={{marginBottom:14}}>
        <div style={{fontSize:13,fontWeight:800,color:C.accent,marginBottom:10}}>❤️‍🔥 {lang==="vi"?"Thống kê sức khỏe":"Health stats"}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:8}}>
          {[
            {label:lang==="vi"?"Tổng":"Total", value:healthStats.total, color:C.accent},
            {label:lang==="vi"?"Tuần":"Week",  value:healthStats.week,  color:C.sky},
            {label:lang==="vi"?"Tháng":"Month",value:healthStats.month, color:C.green},
            {label:"🔥", value:healthStats.streak, color:C.warn},
          ].map((s,i)=>(
            <div key={i} style={{textAlign:"center",padding:"10px 4px",borderRadius:12,background:`${s.color}14`,border:`1px solid ${s.color}33`}}>
              <div style={{fontSize:20,fontWeight:900,color:s.color,lineHeight:1}}>{s.value}</div>
              <div style={{fontSize:9,color:C.sub,marginTop:4,textTransform:"uppercase",letterSpacing:.4}}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:10,fontSize:11,color:C.sub,flexWrap:"wrap",gap:6}}>
          <span>🔥 {healthStats.kcal} kcal · {healthStats.totalMins} min</span>
          {healthStats.topMuscle && <span>{lang==="vi"?"Cơ tập nhiều":"Top muscle"}: <b style={{color:C.accent}}>{muscleLabels[healthStats.topMuscle]}</b></span>}
        </div>
      </Card>

      {/* Total edging duration */}
      <Card style={{marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:12,color:C.sub,marginBottom:2}}>⏱ Tổng thời lượng Edging</div>
            <div style={{fontSize:24,fontWeight:900,color:C.sky}}>{totalEdgeDuration} <span style={{fontSize:14,fontWeight:500}}>phút</span></div>
          </div>
          <div style={{fontSize:36}}>⏳</div>
        </div>
      </Card>

      {/* Calendar heatmap - dương lịch */}
      <Card>
        <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:12}}>📅 {monthName}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:8}}>
          {dayHeaders.map(d=><div key={d} style={{textAlign:"center",fontSize:9,color:C.sub,fontWeight:700,padding:"2px 0"}}>{d}</div>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
          {Array.from({length:firstDow}).map((_,i)=><div key={"e"+i}/>)}
          {Array.from({length:daysInMonth}).map((_,i)=>{
            const d=i+1;
            const k=`${year}-${pad(month+1)}-${pad(d)}`;
            const data=dayMap[k];
            const isToday=d===now.getDate();
            let bg=C.surface,dot=null;
            if(data){
              if(data.shoot>0&&data.edge>0){bg=`${C.primary}40`;dot="both";}
              else if(data.shoot>0){bg=`${C.primary}35`;dot="shoot";}
              else if(data.edge>0){bg=`${C.sky}35`;dot="edge";}
            }
            return(
              <div key={d} style={{aspectRatio:"1",borderRadius:6,background:bg,border:isToday?`1.5px solid ${C.accent}`:`1px solid ${C.border}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",position:"relative"}}>
                <span style={{fontSize:9,fontWeight:isToday?800:400,color:isToday?C.accent:C.text}}>{d}</span>
                {dot==="shoot"&&<div style={{width:4,height:4,borderRadius:"50%",background:C.pink,position:"absolute",bottom:2}}/>}
                {dot==="edge"&&<div style={{width:4,height:4,borderRadius:"50%",background:C.sky,position:"absolute",bottom:2}}/>}
                {dot==="both"&&<div style={{width:6,height:3,borderRadius:3,background:`linear-gradient(90deg,${C.pink},${C.sky})`,position:"absolute",bottom:2}}/>}
              </div>
            );
          })}
        </div>
        <div style={{display:"flex",gap:12,marginTop:10,justifyContent:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:8,height:8,borderRadius:"50%",background:C.pink}}/><span style={{fontSize:10,color:C.sub}}>Bắn</span></div>
          <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:8,height:8,borderRadius:"50%",background:C.sky}}/><span style={{fontSize:10,color:C.sub}}>Edging</span></div>
          <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:8,height:4,borderRadius:3,background:`linear-gradient(90deg,${C.pink},${C.sky})`}}/><span style={{fontSize:10,color:C.sub}}>Cả hai</span></div>
        </div>
      </Card>

      {/* Tracking start info */}
      {trackingStart&&(
        <Card>
          <div style={{fontSize:12,color:C.sub,marginBottom:4}}>📌 {t.trackingSince}</div>
          <div style={{fontSize:15,fontWeight:700,color:C.text}}>{fmtDateTime(trackingStart)}</div>
        </Card>
      )}
    </div>
  );
};

// ─── BIRTHDAY CHALLENGE ─────────────────────────────────────────────────────
const getBirthdayState = () => load(BIRTHDAY_KEY) || {status:"idle", birthdayKey:null, dailyLog:{}, shootLog:0};

const getNextBirthday = (dob) => {
  if(!dob) return null;
  const d = new Date(dob);
  const today = new Date(); today.setHours(0,0,0,0);
  const y = today.getFullYear();
  let bday = new Date(y, d.getMonth(), d.getDate()); bday.setHours(0,0,0,0);
  if(bday < today) bday = new Date(y+1, d.getMonth(), d.getDate());
  return bday;
};
const daysUntilBirthday = (dob) => {
  const bday = getNextBirthday(dob); if(!bday) return Infinity;
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.round((bday - today)/86400000);
};

const BirthdayChallenge = ({sessions, dob, age, t, lang, onLogEdge, onLogShoot}) => {
  const [state, setState] = useState(getBirthdayState);

  if(!dob) return null;

  const bday = getNextBirthday(dob);
  const bdayKey = `${bday.getFullYear()}-${pad(bday.getMonth()+1)}-${pad(bday.getDate())}`;
  const today = new Date(); today.setHours(0,0,0,0);
  const days = Math.round((bday - today)/86400000);
  const inWindow = days <= 14 && days >= 0;

  // Reset on new cycle
  useEffect(() => {
    if(state.birthdayKey && state.birthdayKey !== bdayKey && !inWindow) {
      const reset = {status:"idle", birthdayKey:null, dailyLog:{}, shootLog:0};
      setState(reset); save(BIRTHDAY_KEY, reset);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bdayKey]);

  // Aggregate sessions into log
  useEffect(() => {
    if(state.status !== 'active' || state.birthdayKey !== bdayKey) return;
    const start = new Date(bday); start.setDate(start.getDate()-14); start.setHours(0,0,0,0);
    const end = new Date(bday); end.setHours(23,59,59,999);
    const newLog = {};
    sessions.forEach(s => {
      const d = new Date(s.timestamp);
      if(d < start || d > end) return;
      const k = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
      newLog[k] = newLog[k] || {edge:0, shoot:0};
      if(s.type === 'edge') newLog[k].edge++; else newLog[k].shoot++;
    });
    if(JSON.stringify(newLog) !== JSON.stringify(state.dailyLog)) {
      const updated = {...state, dailyLog:newLog};
      setState(updated); save(BIRTHDAY_KEY, updated);
    }
  }, [sessions, state.status, bdayKey]);

  const isActive   = state.status === 'active'   && state.birthdayKey === bdayKey;
  const isDeclined = state.status === 'declined' && state.birthdayKey === bdayKey;

  if(!inWindow && !isActive) return null;

  const rec = getAgeRec(age||25);
  const requiredDuration = rec.edgeDuration.max + 10;

  const persist = (s) => { setState(s); save(BIRTHDAY_KEY, s); };
  const handleJoin    = () => persist({status:'active',   birthdayKey:bdayKey, dailyLog:{}, shootLog:0});
  const handleDecline = () => persist({status:'declined', birthdayKey:bdayKey, dailyLog:{}, shootLog:0});

  // Idle prompt
  if(!isActive && !isDeclined) {
    return (
      <Card style={{border:`2px solid ${C.pink}88`,marginBottom:14,background:`${C.pink}0a`}}>
        <div style={{textAlign:'center',marginBottom:12}}>
          <div style={{fontSize:42}}>🎂</div>
          <div style={{fontSize:16,fontWeight:900,color:C.pink,marginBottom:4}}>{lang==='vi'?'🎉 Thử thách Sinh nhật':'🎉 Birthday Challenge'}</div>
          <div style={{fontSize:12,color:C.sub,marginBottom:12}}>
            {days===0
              ? (lang==='vi'?'🎂 Hôm nay là sinh nhật của bạn!':'🎂 Today is your birthday!')
              : (lang==='vi'?`Còn ${days} ngày đến sinh nhật của bạn!`:`${days} days until your birthday!`)}
          </div>
          <div style={{background:C.surface,borderRadius:12,padding:'12px',textAlign:'left',lineHeight:1.9}}>
            <div style={{fontSize:12,color:C.text,fontWeight:700,marginBottom:6}}>📋 {lang==='vi'?'Luật chơi':'Rules'}:</div>
            <div style={{fontSize:12,color:C.sub}}>⏳ {lang==='vi'?`14 ngày trước sinh nhật: CHỈ edging, mỗi lần ${requiredDuration} phút (khuyến nghị nhóm tuổi +10p)`:`14 days before: ONLY edging, each session ${requiredDuration} min (age recs +10 min)`}</div>
            <div style={{fontSize:12,color:C.sub}}>🎂 {lang==='vi'?'Đúng ngày sinh nhật (ngày 15): Bắn 2 lần để ăn mừng!':'On birthday (day 15): Shoot 2 times to celebrate!'}</div>
            <div style={{fontSize:12,color:C.sub}}>⚡ {lang==='vi'?'Thử thách này được ưu tiên & thay thế mục tiêu tuần hiện tại.':'This challenge is prioritized & replaces your current weekly goal.'}</div>
          </div>
        </div>
        <button onClick={handleJoin} style={{width:'100%',background:`linear-gradient(135deg,${C.pink},${C.primary})`,border:'none',borderRadius:14,padding:'13px',color:'#fff',fontWeight:800,fontSize:15,cursor:'pointer',marginBottom:10}}>
          🎂 {lang==='vi'?'Tham gia thử thách':'Accept Challenge'}
        </button>
        <button onClick={handleDecline} style={{width:'100%',background:'transparent',border:`1px solid ${C.border}`,borderRadius:14,padding:'10px',color:C.sub,fontWeight:600,fontSize:13,cursor:'pointer'}}>
          {lang==='vi'?'Từ chối năm nay':'Decline this year'}
        </button>
      </Card>
    );
  }

  if(isDeclined) {
    return (
      <Card style={{border:`1px solid ${C.border}`,marginBottom:14}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{fontSize:24}}>🎂</div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:700,color:C.sub}}>{lang==='vi'?'Thử thách Sinh nhật':'Birthday Challenge'}</div>
            <div style={{fontSize:12,color:C.sub,marginTop:2}}>{lang==='vi'?'Bạn đã từ chối thử thách năm nay.':'You declined this year\'s challenge.'}</div>
          </div>
          <button onClick={handleJoin} style={{background:`${C.pink}22`,border:`1px solid ${C.pink}55`,borderRadius:10,padding:'6px 10px',color:C.pink,fontSize:12,fontWeight:700,cursor:'pointer'}}>
            🔄 {lang==='vi'?'Tham gia':'Join'}
          </button>
        </div>
      </Card>
    );
  }

  // Active: build day list -14..0
  const items = [];
  for(let i=14; i>=0; i--){
    const d = new Date(bday); d.setDate(d.getDate()-i); d.setHours(0,0,0,0);
    const k = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    items.push({k, d, dayNum: 15-i, isToday: d.getTime()===today.getTime(), isPast: d<today, isBday: i===0});
  }
  const log = state.dailyLog || {};
  const completedEdges = items.slice(0,14).filter(it => (log[it.k]?.edge||0) >= 1).length;
  const bdayLog = log[bdayKey] || {shoot:0, edge:0};
  const bdayDone = (bdayLog.shoot||0) >= 2;
  const shotBeforeBday = items.slice(0,14).some(it => (log[it.k]?.shoot||0) > 0);

  return (
    <Card style={{border:`2px solid ${C.pink}88`,marginBottom:14,background:`${C.pink}08`}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <div style={{fontSize:14,fontWeight:900,color:C.pink}}>🎂 {lang==='vi'?'Thử thách Sinh nhật':'Birthday Challenge'}</div>
        <div style={{fontSize:11,fontWeight:700,padding:'4px 10px',borderRadius:99,background:`${C.pink}25`,color:C.pink}}>
          {days===0 ? (lang==='vi'?'🎉 Sinh nhật!':'🎉 Birthday!') : (lang==='vi'?`Còn ${days} ngày`:`${days}d left`)}
        </div>
      </div>

      <div style={{fontSize:11,color:C.sub,marginBottom:10,lineHeight:1.6,background:C.surface,borderRadius:10,padding:'8px 10px'}}>
        ⏳ {lang==='vi'?`Mỗi ngày: ≥1 lần edging · gợi ý ${requiredDuration} phút`:`Each day: ≥1 edge · suggest ${requiredDuration} min`}<br/>
        🎂 {lang==='vi'?'Ngày sinh nhật: bắn 2 lần':'Birthday: shoot 2 times'}
        {shotBeforeBday && <><br/><span style={{color:C.danger}}>⚠️ {lang==='vi'?'Đã có lần bắn trước sinh nhật – nên giữ chỉ edging!':'Shoot logged before birthday – keep edging only!'}</span></>}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:4,marginBottom:10}}>
        {items.map(it => {
          const lg = log[it.k] || {edge:0, shoot:0};
          const ok = it.isBday ? (lg.shoot>=2) : (lg.edge>=1);
          return (
            <div key={it.k} style={{textAlign:'center',padding:'5px 2px',borderRadius:8,background:it.isToday?`${C.pink}33`:(ok?`${C.green}15`:(it.isPast?`${C.danger}10`:C.card2)),border:`1px solid ${it.isToday?C.pink:(ok?`${C.green}55`:(it.isBday?C.pink:C.border))}`}}>
              <div style={{fontSize:9,color:C.sub,lineHeight:1.1}}>{it.d.getDate()}/{it.d.getMonth()+1}</div>
              <div style={{fontSize:10,fontWeight:800,color:it.isBday?C.pink:(ok?C.green:C.accent),lineHeight:1.2}}>
                {it.isBday ? `💦 ${lg.shoot}/2` : `⏳ ${lg.edge}/1`}
              </div>
              <div style={{fontSize:9,color:ok?C.green:C.sub,lineHeight:1}}>{ok?'✅':(it.isPast?'❌':'•')}</div>
            </div>
          );
        })}
      </div>

      <div style={{display:'flex',gap:6}}>
        <button onClick={onLogEdge} style={{flex:1,background:`${C.sky}22`,border:`1px solid ${C.sky}66`,color:C.sky,fontWeight:800,fontSize:12,padding:'9px',borderRadius:10,cursor:'pointer'}}>
          ⏳ {lang==='vi'?'Edge':'Edge'}
        </button>
        {days===0 && (
          <button onClick={onLogShoot} style={{flex:1,background:`${C.primary}22`,border:`1px solid ${C.primary}66`,color:C.primary,fontWeight:800,fontSize:12,padding:'9px',borderRadius:10,cursor:'pointer'}}>
            💦 {lang==='vi'?'Bắn':'Shoot'}
          </button>
        )}
      </div>

      <div style={{fontSize:11,color:C.sub,marginTop:10,textAlign:'center'}}>
        {lang==='vi'?`Đã hoàn thành ${completedEdges}/14 ngày edging`:`${completedEdges}/14 edge days done`}
        {days===0 && (bdayDone ? ' · 🏆 '+(lang==='vi'?'Hoàn thành!':'Complete!') : ` · 💦 ${bdayLog.shoot||0}/2`)}
      </div>
    </Card>
  );
};

// ─── NOVEMBER EDGING CHALLENGE COMPONENT ────────────────────────────────────

// November special intense edging schedule – deterministic per-day random target.
// Some days demand up to 5–6 edges. Stable per (year,day).
const getNovDailyTarget = (year, day) => {
  // Simple LCG-style hash for stable pseudo-randomness
  let h = (year * 73856093) ^ (day * 19349663);
  h = (h ^ (h >>> 13)) >>> 0;
  const r = h % 100;
  // Distribution: 35% -> 1, 25% -> 2, 18% -> 3, 12% -> 4, 7% -> 5, 3% -> 6
  if (r < 35) return 1;
  if (r < 60) return 2;
  if (r < 78) return 3;
  if (r < 90) return 4;
  if (r < 97) return 5;
  return 6;
};
const getNovEdgeCountForDay = (sessions, year, dayNum) => {
  return sessions.filter(s => {
    if (s.type !== 'edge') return false;
    const d = new Date(s.timestamp);
    return d.getFullYear()===year && d.getMonth()===10 && d.getDate()===dayNum;
  }).length;
};

const NovemberChallenge = ({sessions, t, lang, onLogEdge, onQuickEdgeForDay, testMode}) => {
  const [novState, setNovState] = useState(getNovChallengeState);
  const now = new Date();
  const month = testMode ? 10 : now.getMonth(); // 10=Nov, 11=Dec
  const year = now.getFullYear();
  const today = novTodayKey();

  // Auto-reset if new year
  useEffect(() => {
    if(novState.year && novState.year < year && novState.status !== 'idle') {
      const reset = {status:'idle', year:null, dailyLog:{}};
      setNovState(reset); save(NOV_CHALLENGE_KEY, reset);
    }
  }, [year]);

  // Auto-mark edge days from sessions log
  useEffect(() => {
    if(novState.status !== 'active') return;
    const newLog = {...(novState.dailyLog||{})};
    sessions.forEach(s => {
      if(s.type !== 'edge') return;
      const d = new Date(s.timestamp);
      if(d.getMonth() !== 10 || d.getFullYear() !== (novState.year || year)) return;
      const k = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
      newLog[k] = true;
    });
    if(JSON.stringify(newLog) !== JSON.stringify(novState.dailyLog)) {
      const updated = {...novState, dailyLog: newLog};
      setNovState(updated); save(NOV_CHALLENGE_KEY, updated);
    }
  }, [sessions]);

  const persistState = (s) => { setNovState(s); save(NOV_CHALLENGE_KEY, s); };

  const handleJoin = () => {
    const s = {status:'active', year, dailyLog:{}};
    persistState(s);
  };
  const handleDecline = () => {
    const s = {status:'declined', year, dailyLog:{}};
    persistState(s);
  };

  const dailyLog = novState.dailyLog || {};
  const daysEdged = countNovEdgeDays(dailyLog);
  const daysElapsed = getNovDaysElapsed();
  const missingDays = getNovMissingDays(dailyLog);
  const todayDone = !!dailyLog[today];
  const daysRemaining = 30 - now.getDate();
  const isActive = novState.status === 'active' && novState.year === year;
  const isDeclined = novState.status === 'declined' && novState.year === year;
  const isCompleted = novState.status === 'completed' && novState.year === year;
  const isFailed = novState.status === 'failed' && novState.year === year;
  const yearTheme = getNovYearTheme(year);

  // Auto-complete on Dec 1st (must run before any early return — Rules of Hooks)
  useEffect(() => {
    if(isActive && month === 11 && now.getDate() === 1) {
      if(missingDays.length === 0) {
        const updated = {...novState, status:'completed'};
        setNovState(updated); save(NOV_CHALLENGE_KEY, updated);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, isActive]);

  // Failed state UI
  if(isFailed && month === 10) {
    return (
      <Card style={{border:`2px solid ${C.danger}`,marginBottom:14,background:`${C.danger}10`}}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:36,marginBottom:6}}>😞</div>
          <div style={{fontSize:14,fontWeight:900,color:C.danger,marginBottom:4}}>{t.novFailed}</div>
          <div style={{fontSize:12,color:C.sub}}>{lang==='vi'?'Thử thách năm nay đã thất bại do bắn trong tháng 11.':"This year's challenge failed because you shot during November."}</div>
        </div>
      </Card>
    );
  }



  // December 1st banner for completed
  if(month === 11 && now.getDate() === 1 && isCompleted) {
    return (
      <Card style={{background:`linear-gradient(135deg,${C.gold}22,${C.green}22)`,border:`2px solid ${C.gold}`,marginBottom:14}}>
        <div style={{textAlign:'center',padding:'8px 0'}}>
          <div style={{fontSize:40,marginBottom:8}}>🏆🎉</div>
          <div style={{fontSize:16,fontWeight:900,color:C.gold,marginBottom:6}}>{t.novDec1Banner}</div>
          <div style={{fontSize:13,color:C.sub}}>{t.novCompleted}</div>
        </div>
      </Card>
    );
  }

  // Outside November (and not Dec 1st completed)
  if(month !== 10) {
    return (
      <Card style={{border:`1px solid ${C.primary}44`,marginBottom:14}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
          <div style={{fontSize:28}}>⚔️</div>
          <div>
            <div style={{fontSize:14,fontWeight:800,color:C.accent}}>{t.novChallengeTitle}</div>
            <div style={{fontSize:11,color:C.sub}}>{t.novChallengeSub}</div>
          </div>
        </div>
        <div style={{fontSize:12,color:C.sub,background:C.surface,borderRadius:10,padding:'10px 12px',lineHeight:1.8}}>
          <div>{t.novChallengeRule1}</div>
          <div>{t.novChallengeRule2}</div>
          <div>{t.novChallengeRule3}</div>
        </div>
        <div style={{marginTop:10,fontSize:12,color:C.sub,textAlign:'center'}}>{t.novRestOfYear}</div>
        {isCompleted && <div style={{marginTop:8,textAlign:'center',fontSize:13,color:C.gold,fontWeight:700}}>🏆 {t.novCompleted}</div>}
      </Card>
    );
  }

  // November — not joined yet
  if(!isActive && !isDeclined && !isCompleted) {
    return (
      <Card style={{border:`2px solid ${C.gold}88`,marginBottom:14,background:`${C.gold}0a`}}>
        <div style={{textAlign:'center',marginBottom:12}}>
          <div style={{fontSize:40,marginBottom:6}}>⚔️</div>
          <div style={{fontSize:16,fontWeight:900,color:C.gold,marginBottom:4}}>{t.novChallengeTitle}</div>
          <div style={{fontSize:12,color:C.sub,marginBottom:12}}>{t.novChallengeSub}</div>
          <div style={{background:C.surface,borderRadius:12,padding:'12px',marginBottom:14,textAlign:'left',lineHeight:2}}>
            <div style={{fontSize:12,color:C.text,fontWeight:700,marginBottom:6}}>📋 {t.novRules}:</div>
            <div style={{fontSize:12,color:C.sub}}>{t.novChallengeRule1}</div>
            <div style={{fontSize:12,color:C.sub}}>{t.novChallengeRule2}</div>
            <div style={{fontSize:12,color:C.sub}}>{t.novChallengeRule3}</div>
          </div>
        </div>
        <button onClick={handleJoin} style={{width:'100%',background:`linear-gradient(135deg,${C.gold},#f59e0b)`,border:'none',borderRadius:14,padding:'13px',color:'#000',fontWeight:800,fontSize:15,cursor:'pointer',marginBottom:10}}>
          🔥 {t.novJoinBtn}
        </button>
        <button onClick={handleDecline} style={{width:'100%',background:'transparent',border:`1px solid ${C.border}`,borderRadius:14,padding:'10px',color:C.sub,fontWeight:600,fontSize:13,cursor:'pointer'}}>
          {t.novDeclineBtn}
        </button>
      </Card>
    );
  }

  // Declined
  if(isDeclined) {
    return (
      <Card style={{border:`1px solid ${C.border}`,marginBottom:14}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{fontSize:24}}>😶</div>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:C.sub}}>{t.novChallengeTitle}</div>
            <div style={{fontSize:12,color:C.sub,marginTop:2}}>{t.novDeclined}</div>
          </div>
        </div>
        <button onClick={handleJoin} style={{marginTop:12,width:'100%',background:C.surface,border:`1px solid ${C.gold}55`,borderRadius:12,padding:'10px',color:C.gold,fontWeight:700,fontSize:13,cursor:'pointer'}}>
          🔄 {lang==='vi'?'Đổi ý – Tham gia':'Change mind – Join'}
        </button>
      </Card>
    );
  }

  // Active in November
  const pct = daysElapsed > 0 ? Math.round((daysEdged / daysElapsed) * 100) : 0;
  const hasMissed = missingDays.length > 0;

  return (
    <Card style={{border:`2px solid ${hasMissed?C.danger:C.gold}88`,marginBottom:14,background:hasMissed?`${C.danger}08`:`${C.gold}08`}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <div style={{fontSize:14,fontWeight:900,color:hasMissed?C.danger:C.gold}}>{t.novChallengeTitle}</div>
        <div style={{fontSize:11,fontWeight:700,padding:'4px 10px',borderRadius:99,background:hasMissed?`${C.danger}25`:`${C.gold}25`,color:hasMissed?C.danger:C.gold}}>
          {t.novActive}
        </div>
      </div>

      {/* Progress ring area */}
      <div style={{display:'flex',gap:12,alignItems:'center',marginBottom:12}}>
        <Ring pct={pct} color={hasMissed?C.danger:C.gold} size={90} stroke={7}>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:20,fontWeight:900,color:hasMissed?C.danger:C.gold}}>{daysEdged}</div>
            <div style={{fontSize:8,color:C.sub}}>/ {daysElapsed}</div>
          </div>
        </Ring>
        <div style={{flex:1}}>
          <div style={{fontSize:11,color:C.sub,marginBottom:4}}>{t.novDaysEdged}: <span style={{color:C.gold,fontWeight:700}}>{daysEdged}</span></div>
          <div style={{fontSize:11,color:C.sub,marginBottom:4}}>{t.novDaysMissed}: <span style={{color:hasMissed?C.danger:C.green,fontWeight:700}}>{missingDays.length}</span></div>
          <div style={{fontSize:11,color:C.sub}}>{t.novCountdown}: <span style={{color:C.accent,fontWeight:700}}>{daysRemaining}</span></div>
        </div>
      </div>

      {/* Special intense edging schedule – random per day, may peak at 5–6 */}
      {(() => {
        const todayNum = now.getDate();
        const todayTarget = getNovDailyTarget(year, todayNum);
        const todayCount = getNovEdgeCountForDay(sessions, year, todayNum);
        const todayMet = todayCount >= todayTarget;
        // Build full month preview
        const allDays = [];
        let monthTotalTarget = 0;
        let monthTotalDone = 0;
        for(let dn=1; dn<=30; dn++){
          const tgt = getNovDailyTarget(year, dn);
          const cnt = getNovEdgeCountForDay(sessions, year, dn);
          monthTotalTarget += tgt;
          monthTotalDone   += Math.min(cnt, tgt);
          allDays.push({day:dn, target:tgt, count:cnt});
        }
        const monthPct = Math.round((monthTotalDone/monthTotalTarget)*100);
        return (
          <div style={{background:C.surface,border:`1px solid ${C.gold}33`,borderRadius:12,padding:'10px 12px',marginBottom:10}}>
            <div style={{fontSize:11,fontWeight:800,color:C.gold,marginBottom:6,letterSpacing:.3}}>
              🔥 {lang==='vi'?'Lịch edging đặc biệt – mục tiêu ngẫu nhiên':'Special edging schedule – random target'}
            </div>

            {/* Month total */}
            <div style={{background:C.card2,borderRadius:10,padding:'8px 10px',marginBottom:10,border:`1px solid ${C.gold}22`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                <div style={{fontSize:11,color:C.sub,fontWeight:700}}>
                  📅 {lang==='vi'?'Tổng cả tháng 11':'November total'}
                </div>
                <div style={{fontSize:13,fontWeight:900,color:C.gold}}>
                  {monthTotalDone}<span style={{color:C.sub,fontWeight:600}}>/{monthTotalTarget}</span>
                </div>
              </div>
              <div style={{background:C.border,borderRadius:99,height:5,overflow:'hidden'}}>
                <div style={{width:`${Math.min(100,monthPct)}%`,height:'100%',background:`linear-gradient(90deg,${C.gold},${C.danger})`,borderRadius:99,transition:'width 1s'}}/>
              </div>
            </div>

            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <div style={{fontSize:13,fontWeight:700,color:C.text}}>
                {lang==='vi'?'Hôm nay':'Today'} · <span style={{color:todayTarget>=5?C.danger:C.accent}}>{todayCount}/{todayTarget}</span>
                {todayTarget>=5 && <span style={{marginLeft:6,fontSize:10,padding:'2px 6px',borderRadius:99,background:`${C.danger}22`,color:C.danger,fontWeight:800}}>INTENSE</span>}
              </div>
              <span style={{fontSize:11,fontWeight:700,color:todayMet?C.green:C.sub}}>{todayMet?'✅':'⏳'}</span>
            </div>
            <div style={{background:C.border,borderRadius:99,height:6,overflow:'hidden',marginBottom:10}}>
              <div style={{width:`${Math.min(100,(todayCount/todayTarget)*100)}%`,height:'100%',background:todayMet?C.green:(todayTarget>=5?C.danger:C.gold),borderRadius:99,transition:'width 1s'}}/>
            </div>

            {/* Quick +1 edge today */}
            <div style={{display:'flex',gap:6,marginBottom:10}}>
              <button onClick={()=>onQuickEdgeForDay&&onQuickEdgeForDay(new Date(year,10,todayNum))} style={{flex:1,background:`${C.sky}22`,border:`1px solid ${C.sky}66`,color:C.sky,fontWeight:800,fontSize:12,padding:'8px',borderRadius:10,cursor:'pointer'}}>
                ⚡ +1 {lang==='vi'?'Edge nhanh':'Quick edge'}
              </button>
              <button onClick={onLogEdge} style={{flex:1,background:`${C.sky}15`,border:`1px solid ${C.border}`,color:C.text,fontWeight:700,fontSize:12,padding:'8px',borderRadius:10,cursor:'pointer'}}>
                📝 {lang==='vi'?'Edge chi tiết':'Detailed edge'}
              </button>
            </div>

            {/* Full month grid */}
            <div style={{fontSize:10,color:C.sub,marginBottom:6,textAlign:'center'}}>{lang==='vi'?'👇 Toàn bộ tháng 11 – chạm vào ngày để +1 edge':'👇 Whole November – tap any day to +1 edge'}</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4}}>
              {allDays.map(n=>{
                const met=n.count>=n.target;
                const isToday = n.day===todayNum;
                const isPast = n.day<todayNum;
                const isFuture = n.day>todayNum;
                const intense = n.target>=5;
                return (
                  <button key={n.day} onClick={()=>onQuickEdgeForDay&&onQuickEdgeForDay(new Date(year,10,n.day))} style={{textAlign:'center',padding:'5px 2px',borderRadius:8,background:isToday?`${C.gold}33`:(met?`${C.green}15`:(isPast?`${C.danger}10`:C.card2)),border:`1px solid ${isToday?C.gold:(met?`${C.green}55`:(intense?`${C.danger}55`:C.border))}`,cursor:'pointer',color:'inherit',opacity:isFuture?0.75:1}}>
                    <div style={{fontSize:9,color:C.sub,lineHeight:1.1}}>{n.day}</div>
                    <div style={{fontSize:11,fontWeight:800,color:intense?C.danger:(met?C.green:C.accent),lineHeight:1.2}}>{n.count}/{n.target}</div>
                    <div style={{fontSize:9,color:met?C.green:C.sub,lineHeight:1}}>{met?'✅':(isPast?'❌':'+')}</div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Today status */}
      {todayDone && (
        <div style={{background:`${C.green}20`,border:`1px solid ${C.green}44`,borderRadius:12,padding:'10px 14px',marginBottom:10,fontSize:13,color:C.green,fontWeight:700,textAlign:'center'}}>
          {t.novTodayDone}
        </div>
      )}

      {/* Missed days warning */}
      {hasMissed && (
        <div style={{background:`${C.danger}15`,border:`1px solid ${C.danger}44`,borderRadius:10,padding:'8px 12px',fontSize:12,color:C.danger}}>
          ⚠️ {lang==='vi'?`Bỏ lỡ ngày: ${missingDays.join(', ')} tháng 11`:`Missed days: Nov ${missingDays.join(', ')}`}
        </div>
      )}
    </Card>
  );
};

// ─── GOALS TAB ───────────────────────────────────────────────────────────────
// Modal listing every daily + shoot-day challenge (so users can still see
// challenges that get randomly hidden when the wheel is over-capacity).
const AllChallengesDialog = ({open, onClose, age, lang}) => {
  if (!open) return null;
  const rec = getAgeRec(age||25);
  const daily = DAILY_CHALLENGES.filter(c=>c.minAgeGroup<=rec.ageGroup);
  const shoot = SHOOT_DAY_CHALLENGES.filter(c=>c.minAgeGroup<=rec.ageGroup);
  const Row = ({c}) => (
    <div style={{display:"flex",gap:10,padding:"8px 4px",borderBottom:`1px solid ${C.border}`}}>
      <div style={{fontSize:22,lineHeight:1}} className="emoji">{c.icon}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:13,fontWeight:700,color:C.text}}>{lang==='vi'?c.name_vi:c.name_en}</div>
        <div style={{fontSize:11,color:C.sub,lineHeight:1.5,marginTop:2}}>{lang==='vi'?c.desc_vi:c.desc_en}</div>
      </div>
    </div>
  );
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={(e)=>{if(e.target===e.currentTarget) onClose();}}>
      <div style={{background:`linear-gradient(180deg,${C.card2},${C.card})`,borderRadius:20,padding:"18px 16px",maxWidth:420,width:"100%",maxHeight:"82vh",overflowY:"auto",border:`1px solid ${C.border}`,boxShadow:"0 30px 80px rgba(0,0,0,.6)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontSize:14,fontWeight:800,color:C.gold}}>📋 {lang==='vi'?'Tất cả thử thách':'All Challenges'}</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.sub,fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{fontSize:11,fontWeight:800,color:C.accent,letterSpacing:.5,margin:"8px 0 4px"}}>🎯 {lang==='vi'?'Thử thách hằng ngày':'Daily Challenges'}</div>
        {daily.map(c=><Row key={c.id} c={c}/>)}
        <div style={{fontSize:11,fontWeight:800,color:C.pink,letterSpacing:.5,margin:"14px 0 4px"}}>💦 {lang==='vi'?'Thử thách ngày bắn':'Shoot-Day Challenges'}</div>
        {shoot.map(c=><Row key={c.id} c={c}/>)}
        <button onClick={onClose} style={{marginTop:14,width:"100%",background:`linear-gradient(135deg,${C.primary},${C.accent})`,color:"#fff",border:"none",borderRadius:12,padding:"10px",fontWeight:800,cursor:"pointer",fontSize:13}}>
          {lang==='vi'?'Đóng':'Close'}
        </button>
      </div>
    </div>
  );
};

const GoalsTab=({sessions,age,t,lang,onLogEdge,onLogShoot,onQuickEdgeForDay,schedule,novTestMode,dob,wheelTick})=>{
  const edgeCountThisWeek = useMemo(()=>getThisWeekCount(getEdges(sessions)),[sessions]);
  const rec=getAgeRec(age);
  const edgeGoals = Array.from({length: rec.edgeMax}, (_, i) => i + 1);

  // Weekly challenge history
  const challengeLog=load(CHALLENGE_LOG_KEY)||{};
  const completedCount=Object.values(challengeLog).filter(Boolean).length;

  const dailyChallenge=useMemo(()=>age?getDailyChallenge(age,schedule):null,[age,schedule,wheelTick]);
  const dowToday = partsInTZ(worldNow()).dayOfWeek;
  const [allChalOpen, setAllChalOpen] = useState(false);
  const today=todayKey();
  const challengeDone=challengeLog[today];

  // November challenge active flag — when active, it REPLACES all edge & shoot goals
  const novState = getNovChallengeState();
  const nowD = new Date();
  const novActiveNow = novState.status==='active' && novState.year===nowD.getFullYear() && (novTestMode || nowD.getMonth()===10);

  // Birthday challenge active flag — when active, it REPLACES the weekly goal section
  const bdayState = getBirthdayState();
  const bdayUntil = dob ? daysUntilBirthday(dob) : Infinity;
  const nextBday = dob ? getNextBirthday(dob) : null;
  const nextBdayKey = nextBday ? `${nextBday.getFullYear()}-${pad(nextBday.getMonth()+1)}-${pad(nextBday.getDate())}` : null;
  const birthdayActiveNow = !!dob && bdayUntil <= 14 && bdayUntil >= 0 && bdayState.status==='active' && bdayState.birthdayKey===nextBdayKey;

  // If a schedule exists, weekly goal becomes "complete the schedule"
  const hasSchedule = !!(schedule && ((schedule.edge&&schedule.edge.length)||(schedule.shoot&&schedule.shoot.length)));
  const weekStart = useMemo(()=>{ const n=new Date(); const ws=new Date(n); ws.setDate(n.getDate()-n.getDay()+(n.getDay()===0?-6:1)); ws.setHours(0,0,0,0); return ws; },[]);
  const weekDays = useMemo(()=>Array.from({length:7},(_,i)=>{const d=new Date(weekStart);d.setDate(weekStart.getDate()+i);return d;}),[weekStart]);
  const sessionByDay = useMemo(()=>{
    const map={};
    sessions.forEach(se=>{ const d=new Date(se.timestamp); if(d>=weekStart){ const k=dayKey(d); (map[k]=map[k]||{edge:0,shoot:0})[se.type==='edge'?'edge':'shoot']++; } });
    return map;
  },[sessions,weekStart]);
  const scheduleProgress = useMemo(()=>{
    if(!hasSchedule) return null;
    const today0=new Date(); today0.setHours(0,0,0,0);
    const edgeSet=new Set(schedule.edge||[]); const shootSet=new Set(schedule.shoot||[]);
    let total=0, done=0, items=[];
    weekDays.forEach(d=>{
      const dow=d.getDay();
      const isEdge=edgeSet.has(dow); const isShoot=shootSet.has(dow);
      if(!isEdge && !isShoot) return;
      const k=dayKey(d); const log=sessionByDay[k]||{edge:0,shoot:0};
      const past = d<=today0;
      if(isEdge){ total++; const ok=log.edge>0; if(ok)done++; items.push({d,k,kind:'edge',ok,past}); }
      if(isShoot){ total++; const ok=log.shoot>0; if(ok)done++; items.push({d,k,kind:'shoot',ok,past}); }
    });
    return {total,done,items};
  },[hasSchedule,schedule,weekDays,sessionByDay]);

  return(
    <div style={{padding:"14px 14px 100px"}}>
      <div style={{fontSize:18,fontWeight:800,color:C.text,marginBottom:4}}>🎯 {t.challengesTitle}</div>
      <div style={{fontSize:13,color:C.sub,marginBottom:16}}>{t.challengesSub}</div>

      {/* November Annual Challenge */}
      <NovemberChallenge sessions={sessions} t={t} lang={lang} onLogEdge={onLogEdge} onQuickEdgeForDay={onQuickEdgeForDay} testMode={novTestMode}/>

      {/* Birthday Challenge — appears in 14-day window before user's birthday */}
      <BirthdayChallenge sessions={sessions} dob={dob} age={age} t={t} lang={lang} onLogEdge={onLogEdge} onLogShoot={onLogShoot}/>

      {/* Challenge menu — wheel removed, only the menu remains */}
      {dailyChallenge && (
        <Card style={{background:`linear-gradient(180deg,${C.card2},${C.card})`,border:`1px solid ${C.gold}55`,marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontSize:12,fontWeight:800,color:C.gold,letterSpacing:.5}}>📋 {lang==='vi'?'Menu thử thách':"Challenge Menu"}</div>
            <button onClick={()=>setAllChalOpen(true)} style={{background:`${C.gold}22`,border:`1px solid ${C.gold}66`,color:C.gold,fontSize:11,fontWeight:700,padding:"5px 10px",borderRadius:10,cursor:"pointer"}}>{lang==='vi'?'Xem tất cả':'View all'}</button>
          </div>
          <div style={{fontSize:12,color:C.sub,lineHeight:1.6}}>
            {lang==='vi'?'Bấm "Xem tất cả" để duyệt toàn bộ thử thách hằng ngày và thử thách ngày bắn.':'Tap "View all" to browse every daily and shoot-day challenge.'}
          </div>
          <div style={{marginTop:10,fontSize:11,color:C.sub,textAlign:"center"}}>🗓 {lang==='vi'?'Hoàn thành thử thách':'Challenges completed'}: {completedCount} {lang==='vi'?'ngày':'days'}</div>
        </Card>
      )}

      <AllChallengesDialog open={allChalOpen} onClose={()=>setAllChalOpen(false)} age={age} lang={lang}/>

      {/* Today's accessory challenge */}
      {dailyChallenge&&(
        <Card style={{border:`1px solid ${challengeDone?C.green:C.warn}55`,marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:700,color:challengeDone?C.green:C.warn,marginBottom:8}}>
            {challengeDone?"✅ "+t.challengeCompleted:"🎯 "+t.dailyChallenge}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{fontSize:36}} className="emoji">{dailyChallenge.icon}</div>
            <div>
              <div style={{fontSize:15,fontWeight:800,color:C.text}}>{lang==='vi'?dailyChallenge.name_vi:dailyChallenge.name_en}</div>
              <div style={{fontSize:12,color:C.sub,lineHeight:1.5,marginTop:2}}>{lang==='vi'?dailyChallenge.desc_vi:dailyChallenge.desc_en}</div>
            </div>
          </div>
        </Card>
      )}

      {/* When November Challenge is active, it REPLACES all edge & shoot goals */}
      {birthdayActiveNow ? (
        <Card style={{border:`1px dashed ${C.pink}66`,background:`${C.pink}08`}}>
          <div style={{fontSize:13,fontWeight:800,color:C.pink,marginBottom:6,textAlign:'center'}}>
            🎂 {lang==='vi'?'Thử thách Sinh nhật đang thay thế mục tiêu tuần':'Birthday Challenge replaces your weekly goal'}
          </div>
          <div style={{fontSize:12,color:C.sub,textAlign:'center',lineHeight:1.6}}>
            {lang==='vi'?'Tập trung vào lịch sinh nhật phía trên cho đến hết ngày sinh nhật.':'Focus on the birthday schedule above through your birthday.'}
          </div>
        </Card>
      ) : novActiveNow ? (
        <Card style={{border:`1px dashed ${C.gold}66`,background:`${C.gold}08`}}>
          <div style={{fontSize:13,fontWeight:800,color:C.gold,marginBottom:6,textAlign:'center'}}>
            ⚔️ {lang==='vi'?'Thử thách Tháng 11 đang thay thế toàn bộ mục tiêu Edging & Bắn':'November Challenge replaces all Edge & Shoot goals'}
          </div>
          <div style={{fontSize:12,color:C.sub,textAlign:'center',lineHeight:1.6}}>
            {lang==='vi'?'Tập trung vào lịch tháng 11 phía trên. Mục tiêu tuần & lịch xếp tạm ẩn cho đến ngày 1/12.':'Focus on the November schedule above. Weekly goals & schedule are paused until Dec 1.'}
          </div>
        </Card>
      ) : hasSchedule && scheduleProgress ? (
        <>
          <div style={{fontSize:14,fontWeight:700,color:C.sky,marginBottom:10,marginTop:8}}>🗓 {lang==='vi'?'Mục tiêu tuần: Hoàn thành lịch đã xếp':'Weekly goal: Complete your schedule'}</div>
          <Card style={{padding:"14px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontWeight:700,fontSize:14,color:C.text}}>{lang==='vi'?'Tiến độ lịch tuần':'Schedule progress'}</div>
              <span style={{fontSize:12,color:C.sub}}>{scheduleProgress.done}/{scheduleProgress.total}</span>
            </div>
            <div style={{background:C.border,borderRadius:99,height:8,overflow:"hidden",marginBottom:12}}>
              <div style={{width:`${scheduleProgress.total?Math.round((scheduleProgress.done/scheduleProgress.total)*100):0}%`,background:scheduleProgress.done===scheduleProgress.total?C.green:C.sky,height:"100%",borderRadius:99,transition:"width 1s"}}/>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {scheduleProgress.items.map((it,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:12,color:C.sub,padding:"6px 10px",background:C.surface,borderRadius:8}}>
                  <span>{t.schedDays[it.d.getDay()]} · {it.kind==='edge'?'⏳ '+t.schedEdge:'💦 '+t.schedShoot}</span>
                  <span style={{color:it.ok?C.green:(it.past?C.danger:C.sub),fontWeight:700}}>{it.ok?'✅':(it.past?'✗':'•')}</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      ) : (
        <>
          <div style={{fontSize:14,fontWeight:700,color:C.sky,marginBottom:10,marginTop:8}}>⏳ {t.edgeGoalTitle} (Max: {rec.edgeMax})</div>
          <div style={{fontSize:11,color:C.sub,marginBottom:12}}>Thời lượng mỗi lần: {rec.edgeDuration.min}–{rec.edgeDuration.max} phút</div>
          {edgeGoals.map(target => {
            const done = edgeCountThisWeek >= target;
            const pct = Math.min((edgeCountThisWeek / target) * 100, 100);
            return(
              <Card key={target} style={{padding:"14px 16px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{fontWeight:700,fontSize:14,color:C.text}}>Level {target}: {target} lần edging</div>
                  {done?<span style={{fontSize:18}}>✅</span>:<span style={{fontSize:12,color:C.sub}}>{edgeCountThisWeek}/{target}</span>}
                </div>
                <div style={{background:C.border,borderRadius:99,height:6,overflow:"hidden"}}>
                  <div style={{width:`${pct}%`,background:done?C.green:C.sky,height:"100%",borderRadius:99,transition:"width 1s"}}/>
                </div>
              </Card>
            );
          })}
        </>
      )}
    </div>
  );
};

// ─── HISTORY TAB (with photo viewer) ─────────────────────────────────────────
const HistoryTab=({sessions,onEdit,onDelete,t,embedded})=>{
  const [viewPhoto,setViewPhoto]=useState(null);
  const sorted=useMemo(()=>sessions.slice().sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)),[sessions]);
  if(!sorted.length)return(
    <div style={{padding:embedded?20:40,textAlign:"center",color:C.sub}}><div style={{fontSize:embedded?28:40,marginBottom:8}}>📋</div><div style={{fontSize:13,fontWeight:600,color:C.text}}>{t.noSessions}</div></div>
  );
  return(
    <div style={{padding:embedded?0:"14px 14px 100px"}}>
      {!embedded && <div style={{fontSize:18,fontWeight:800,color:C.text,marginBottom:16}}>📋 History</div>}

      {/* Photo / video viewer modal */}
      {viewPhoto&&(()=>{
        const isVid = typeof viewPhoto==='object' && viewPhoto.type==='video';
        return (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.95)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setViewPhoto(null)}>
            <div style={{position:"relative",maxWidth:480,width:"100%"}} onClick={e=>e.stopPropagation()}>
              {isVid
                ? <video src={viewPhoto.dataUrl} controls autoPlay playsInline style={{width:"100%",borderRadius:16,maxHeight:"80vh",background:"#000"}}/>
                : <img src={viewPhoto} alt="" style={{width:"100%",borderRadius:16,maxHeight:"80vh",objectFit:"contain"}}/>
              }
              <button onClick={()=>setViewPhoto(null)} style={{position:"absolute",top:-14,right:-14,background:C.danger,border:"none",borderRadius:"50%",width:32,height:32,color:"#fff",fontSize:16,cursor:"pointer"}}>✕</button>
            </div>
          </div>
        );
      })()}

      {sorted.map(s=>(
        <Card key={s.id} style={{padding:"12px 14px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                <span style={{fontSize:12,fontWeight:800,padding:"3px 8px",borderRadius:6,background:s.type==='edge'?`${C.sky}25`:`${C.primary}25`,color:s.type==='edge'?C.sky:C.accent}}>
                  {s.type==='edge' ? '⏳ Edging' : '💦 Bắn'}
                </span>
                {s.type==='edge'&&s.edgeDuration&&(
                  <span style={{fontSize:11,color:C.sky,background:`${C.sky}15`,borderRadius:6,padding:"2px 7px"}}>⏱{s.edgeDuration}p</span>
                )}
                {s.photo&&(
                  <button onClick={()=>setViewPhoto(s.photo)} style={{fontSize:11,color:C.gold,background:`${C.gold}15`,borderRadius:6,padding:"2px 7px",border:"none",cursor:"pointer"}}>{(typeof s.photo==='object'&&s.photo.type==='video')?'🎬 Video':'📷 Ảnh'}</button>
                )}
              </div>
              <div style={{fontSize:13,fontWeight:700,color:C.text}}>{fmtDateTime(s.timestamp)}</div>
              <div style={{fontSize:11,color:C.sub}}>{fmtRelative(s.timestamp,t)}</div>
              {s.notes&&<div style={{fontSize:12,color:"rgba(240,240,255,.7)",marginTop:6,background:C.surface,borderRadius:8,padding:"5px 10px",border:`1px solid ${C.border}`}}>{s.notes}</div>}
            </div>
            <div style={{display:"flex",gap:6,marginLeft:10}}>
              <button onClick={()=>onEdit(s)} style={{background:C.accent+"18",border:"none",borderRadius:8,padding:"5px 10px",color:C.accent,fontWeight:600}}>✎</button>
              <button onClick={()=>onDelete(s.id)} style={{background:C.danger+"18",border:"none",borderRadius:8,padding:"5px 10px",color:C.danger,fontWeight:600}}>✕</button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

// ─── HEALTH TAB (BMI + Vanta Fit muscle tracker) ─────────────────────────────
const MUSCLE_LABELS_VI = {
  chest:"Ngực", frontDelts:"Vai trước", sideDelts:"Vai giữa", rearDelts:"Vai sau",
  traps:"Cơ thang", biceps:"Tay trước", triceps:"Tay sau", forearms:"Cẳng tay",
  abs:"Cơ bụng", obliques:"Cơ liên sườn", lats:"Cơ xô", midBack:"Lưng giữa",
  lowerBack:"Lưng dưới", glutes:"Mông", quads:"Đùi trước", hamstrings:"Đùi sau",
  adductors:"Đùi trong", calves:"Bắp chân",
};
const MUSCLE_LABELS_EN = {
  chest:"Chest", frontDelts:"Front Delts", sideDelts:"Side Delts", rearDelts:"Rear Delts",
  traps:"Traps", biceps:"Biceps", triceps:"Triceps", forearms:"Forearms",
  abs:"Abs", obliques:"Obliques", lats:"Lats", midBack:"Mid Back",
  lowerBack:"Lower Back", glutes:"Glutes", quads:"Quads", hamstrings:"Hamstrings",
  adductors:"Adductors", calves:"Calves",
};

// 10 fitness goals — calorie modifier, protein g/kg, training focus
const FITNESS_GOALS = [
  { id:"weight_loss",  cal:-500, protein:2.2, vi:"Giảm cân",        en:"Weight Loss",        focus_vi:"Thâm hụt + giữ cơ", focus_en:"Deficit + preserve muscle", color:"#38bdf8" },
  { id:"cutting",      cal:-600, protein:2.6, vi:"Cắt nét (Cut)",   en:"Cutting",            focus_vi:"Giảm mỡ tối đa, giữ cơ", focus_en:"Max fat loss, keep muscle", color:"#0ea5e9" },
  { id:"recomp",       cal:-150, protein:2.4, vi:"Tái cấu trúc",    en:"Recomp",             focus_vi:"Mỡ ↓ + Cơ ↑ song song", focus_en:"Lose fat + gain muscle", color:"#a78bfa" },
  { id:"maintenance",  cal:0,    protein:1.8, vi:"Giữ dáng",        en:"Maintenance",        focus_vi:"Cân bằng tổng quát", focus_en:"Balanced training", color:"#10b981" },
  { id:"endurance",    cal:0,    protein:1.6, vi:"Sức bền",         en:"Endurance",          focus_vi:"Cardio + rep cao", focus_en:"Cardio + high-rep", color:"#22d3ee" },
  { id:"athletic",     cal:150,  protein:2.0, vi:"Thể thao",        en:"Athletic Performance", focus_vi:"Sức mạnh + bùng nổ", focus_en:"Power + explosiveness", color:"#f472b6" },
  { id:"strength",     cal:250,  protein:2.0, vi:"Sức mạnh",        en:"Strength Focus",     focus_vi:"Tải nặng, rep thấp", focus_en:"Heavy load, low reps", color:"#fbbf24" },
  { id:"lean_bulk",    cal:300,  protein:2.0, vi:"Tăng cơ sạch",    en:"Lean Bulk",          focus_vi:"Tăng cơ, hạn chế mỡ", focus_en:"Slow muscle gain", color:"#84cc16" },
  { id:"muscle_gain",  cal:450,  protein:2.0, vi:"Tăng cơ",         en:"Muscle Gain",        focus_vi:"Hypertrophy 8–12 reps", focus_en:"Hypertrophy 8–12 reps", color:"#fb923c" },
  { id:"dirty_bulk",   cal:700,  protein:1.8, vi:"Bulk nhanh",      en:"Dirty Bulk",         focus_vi:"Tăng cân nhanh", focus_en:"Aggressive surplus", color:"#ef4444" },
];

const WORKOUT_TEMPLATES = [
  { id:"push",   vi:"Ngày Đẩy",     en:"Push Day",     duration:60, exercises:["Bench Press","Overhead Press","Incline Dumbbell Press","Tricep Pushdown","Lateral Raise"] },
  { id:"pull",   vi:"Ngày Kéo",     en:"Pull Day",     duration:60, exercises:["Deadlift","Pull-Up","Barbell Row","Barbell Curl","Face Pull"] },
  { id:"legs",   vi:"Ngày Chân",    en:"Leg Day",      duration:75, exercises:["Squat","Romanian Deadlift","Leg Press","Standing Calf Raise","Hip Thrust"] },
  { id:"upper",  vi:"Thân Trên",    en:"Upper Body",   duration:65, exercises:["Bench Press","Barbell Row","Overhead Press","Lat Pulldown","Barbell Curl","Tricep Pushdown"] },
  { id:"lower",  vi:"Thân Dưới",    en:"Lower Body",   duration:60, exercises:["Squat","Romanian Deadlift","Leg Press","Hamstring Curl","Standing Calf Raise"] },
  { id:"full",   vi:"Toàn Thân",    en:"Full Body",    duration:55, exercises:["Squat","Bench Press","Barbell Row","Overhead Press","Plank"] },
  { id:"cardio", vi:"Cardio + Core",en:"Cardio + Core",duration:40, exercises:["Mountain Climber","Plank","Bicycle Crunch","Russian Twist","Hanging Leg Raise"] },
  { id:"rest",   vi:"Nghỉ ngơi",    en:"Rest",         duration:0,  exercises:[] },
];

const buildTargetMuscles = (exercises) => {
  const m = {};
  exercises.forEach(item => {
    const name = typeof item === "string" ? item : item.name;
    const list = exerciseMuscles(name);
    list.forEach(mm => { m[mm] = (m[mm]||0) + 1; });
    // Sub-region detection for richer recovery tracking
    const n = (name || "").toLowerCase();
    if (/incline/.test(n)) m.upperChest = (m.upperChest || 0) + 1;
    if (/(face pull|shrug|rear delt|rhomboid|reverse fly|high row)/.test(n)) m.upperBack = (m.upperBack || 0) + 1;
  });
  return m;
};

const DAYS_VI = ["CN","T2","T3","T4","T5","T6","T7"];
const DAYS_EN = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const HealthTab = ({age, t, lang}) => {
  const [h, setH] = useState(() => { try { return Number(localStorage.getItem("health.h")) || 170; } catch { return 170; } });
  const [w, setW] = useState(() => { try { return Number(localStorage.getItem("health.w")) || 65; } catch { return 65; } });
  const [act, setAct] = useState(1.55);
  const [goalId, setGoalId] = useState(() => { try { return localStorage.getItem("health.goalId") || "maintenance"; } catch { return "maintenance"; } });
  const [selectedMuscle, setSelectedMuscle] = useState(null);

  // Weekly plan: { 0..6: { name, exercises:[{name,sets,reps}], duration } | null }
  const [weeklyPlan, setWeeklyPlan] = useState(() => {
    try {
      const raw = localStorage.getItem("health.weeklyPlan");
      if (raw) return JSON.parse(raw);
    } catch {}
    return {};
  });
  // Completion log: { "YYYY-MM-DD": { dow, name, duration, muscles } }
  const [completionLog, setCompletionLog] = useState(() => {
    try { return JSON.parse(localStorage.getItem("health.completionLog") || "{}"); } catch { return {}; }
  });

  const [editorDay, setEditorDay] = useState(null); // 0..6 or null
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");

  // Body-fat tool
  const [gender, setGender] = useState(() => { try { return localStorage.getItem("health.gender") || "male"; } catch { return "male"; } });
  const [neck, setNeck] = useState(38);
  const [waist, setWaist] = useState(80);
  const [hip, setHip] = useState(95);

  useEffect(() => { try { localStorage.setItem("health.gender", gender); } catch {} }, [gender]);
  useEffect(() => { try { localStorage.setItem("health.h", String(h)); localStorage.setItem("health.w", String(w)); } catch {} }, [h, w]);
  useEffect(() => { try { localStorage.setItem("health.goalId", goalId); } catch {} }, [goalId]);
  useEffect(() => { try { localStorage.setItem("health.weeklyPlan", JSON.stringify(weeklyPlan)); } catch {} }, [weeklyPlan]);
  useEffect(() => { try { localStorage.setItem("health.completionLog", JSON.stringify(completionLog)); } catch {} }, [completionLog]);

  const muscleLabels = lang==="vi" ? MUSCLE_LABELS_VI : MUSCLE_LABELS_EN;
  const goal = FITNESS_GOALS.find(g => g.id === goalId) || FITNESS_GOALS[3];

  // BMI
  const bmi = useMemo(() => (w / Math.pow(h/100, 2)).toFixed(1), [h,w]);
  let bmiColor = C.green; let bmiLabel = lang==="vi"?"Bình thường":"Normal";
  if(bmi < 18.5) { bmiColor = C.sky; bmiLabel = lang==="vi"?"Thiếu cân":"Underweight"; }
  else if(bmi >= 25 && bmi < 30) { bmiColor = C.warn; bmiLabel = lang==="vi"?"Thừa cân":"Overweight"; }
  else if(bmi >= 30) { bmiColor = C.danger; bmiLabel = lang==="vi"?"Béo phì":"Obese"; }

  // BMI position on 15-35 scale (for visual progress)
  const bmiPct = Math.max(0, Math.min(100, ((+bmi - 15) / 20) * 100));

  // Suggested goal id from BMI + age
  const suggestedGoalId = useMemo(() => {
    const b = +bmi;
    if (b >= 30) return "weight_loss";
    if (b >= 25) return "cutting";
    if (b < 18.5) return (age && age > 35) ? "lean_bulk" : "muscle_gain";
    if (b >= 22) return "recomp";
    return "maintenance";
  }, [bmi, age]);

  const bodyFat = useMemo(() => calcBodyFatNavy({ gender, height: h, neck, waist, hip }), [gender, h, neck, waist, hip]);
  const bfCat = bodyFatCategory(bodyFat, gender, lang);

  const bmr = useMemo(() => (10*w) + (6.25*h) - (5*(age||25)) + 5, [w,h,age]);
  const tdee = Math.round(bmr * act);
  const targetCal = tdee + goal.cal;
  const protein = Math.round(w * goal.protein);
  const fat = Math.round((targetCal * 0.25) / 9);
  const carbs = Math.max(0, Math.round((targetCal - (protein*4) - (fat*9)) / 4));

  // Aggregate muscle usage from last 14 days of completed workouts (weighted, recent = stronger)
  const usage = useMemo(() => {
    const u = {};
    const today = new Date(); today.setHours(0,0,0,0);
    Object.entries(completionLog).forEach(([date, entry]) => {
      const d = new Date(date);
      const ageDays = Math.floor((today - d) / 86400000);
      if (ageDays < 0 || ageDays > 13) return;
      const weight = ageDays <= 6 ? 2 : 1;
      Object.entries(entry.muscles || {}).forEach(([m, v]) => { u[m] = (u[m]||0) + v * weight; });
    });
    return u;
  }, [completionLog]);

  // Stats
  const stats = useMemo(() => {
    const entries = Object.entries(completionLog);
    const today = new Date(); today.setHours(0,0,0,0);
    const startOfWeek = new Date(today); startOfWeek.setDate(today.getDate() - today.getDay());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    let week=0, month=0, totalMins=0;
    const muscleTotals = {};
    entries.forEach(([date, e]) => {
      const d = new Date(date);
      if (d >= startOfWeek) week++;
      if (d >= startOfMonth) month++;
      totalMins += e.duration || 0;
      Object.entries(e.muscles||{}).forEach(([m,v]) => { muscleTotals[m]=(muscleTotals[m]||0)+v; });
    });
    // streak: count consecutive days back from today that have a workout
    let streak = 0;
    for (let i=0;;i++) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0,10);
      if (completionLog[key]) streak++;
      else if (i === 0) { /* allow today empty, check yesterday */ }
      else break;
    }
    const topMuscle = Object.entries(muscleTotals).sort((a,b)=>b[1]-a[1])[0]?.[0];
    // Calories burned est: 6 kcal/min moderate strength
    const kcal = Math.round(totalMins * 6);
    return { total: entries.length, week, month, streak, topMuscle, kcal, totalMins };
  }, [completionLog]);

  // Day cards — derive day-of-week & date key in the user's selected timezone.
  const _todayParts = partsInTZ(worldNow());
  const todayDow = _todayParts.dayOfWeek;
  const todayKey = `${_todayParts.year}-${pad(_todayParts.month+1)}-${pad(_todayParts.day)}`;

  const setDayWorkout = (dow, workout) => {
    setWeeklyPlan(p => ({ ...p, [dow]: workout }));
  };
  const clearDay = (dow) => {
    setWeeklyPlan(p => { const np = {...p}; delete np[dow]; return np; });
  };
  const markComplete = (dow) => {
    const wk = weeklyPlan[dow];
    if (!wk) return;
    // Find date for this dow in the current week
    const today = new Date();
    const d = new Date(today); d.setDate(today.getDate() - (today.getDay() - dow));
    const key = d.toISOString().slice(0,10);
    const muscles = buildTargetMuscles(wk.exercises || []);
    setCompletionLog(c => ({ ...c, [key]: { dow, name: wk.name, duration: wk.duration || 0, muscles } }));
  };
  const unmarkComplete = (dow) => {
    const today = new Date();
    const d = new Date(today); d.setDate(today.getDate() - (today.getDay() - dow));
    const key = d.toISOString().slice(0,10);
    setCompletionLog(c => { const nc = {...c}; delete nc[key]; return nc; });
  };

  // Editor state
  const editingDay = editorDay !== null ? weeklyPlan[editorDay] : null;
  const updateEditingDay = (patch) => {
    if (editorDay === null) return;
    setWeeklyPlan(p => ({ ...p, [editorDay]: { ...(p[editorDay] || { name:"Workout", exercises:[], duration:60 }), ...patch } }));
  };
  const addExerciseToEditor = (name) => {
    if (editorDay === null) return;
    const sug = suggestSetsReps(age || 25, goal.cal);
    setWeeklyPlan(p => {
      const cur = p[editorDay] || { name: lang==="vi"?"Buổi tập":"Workout", exercises:[], duration:60 };
      return { ...p, [editorDay]: { ...cur, exercises: [...(cur.exercises||[]), { name, sets: sug.sets, reps: sug.reps }] } };
    });
  };
  const removeExerciseFromEditor = (idx) => {
    if (editorDay === null) return;
    setWeeklyPlan(p => {
      const cur = p[editorDay]; if (!cur) return p;
      return { ...p, [editorDay]: { ...cur, exercises: cur.exercises.filter((_,i)=>i!==idx) } };
    });
  };
  const updateExerciseInEditor = (idx, patch) => {
    if (editorDay === null) return;
    setWeeklyPlan(p => {
      const cur = p[editorDay]; if (!cur) return p;
      return { ...p, [editorDay]: { ...cur, exercises: cur.exercises.map((it,i)=> i===idx ? {...it, ...patch} : it) } };
    });
  };
  const applyTemplate = (tpl) => {
    if (editorDay === null) return;
    const sug = suggestSetsReps(age || 25, goal.cal);
    const exs = tpl.exercises.map(n => ({ name: n, sets: sug.sets, reps: sug.reps }));
    setWeeklyPlan(p => ({ ...p, [editorDay]: { name: lang==="vi"?tpl.vi:tpl.en, exercises: exs, duration: tpl.duration } }));
  };

  const filteredExercises = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    const list = q ? EXERCISES.filter(e => e.toLowerCase().includes(q)) : EXERCISES;
    const groups = {};
    list.forEach(e => { const cat = exerciseCategory(e); (groups[cat] = groups[cat] || []).push(e); });
    return groups;
  }, [pickerSearch]);

  const days = lang==="vi" ? DAYS_VI : DAYS_EN;

  // Glass card style helper
  const glass = {
    background: "linear-gradient(135deg, rgba(124,58,237,0.08), rgba(15,15,24,0.65))",
    backdropFilter: "blur(12px)",
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  };

  return (
    <div style={{padding:"14px 14px 100px"}}>
      <div style={{fontSize:18,fontWeight:800,color:C.text,marginBottom:4}}>❤️‍🔥 {t.nutrition}</div>
      <div style={{fontSize:13,color:C.sub,marginBottom:16}}>{lang==="vi"?"Theo dõi cơ thể, dinh dưỡng & tập luyện":"Track your body, nutrition & training"}</div>

      {/* ── Muscle Recovery Dashboard ── */}
      <div style={glass}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <div style={{fontWeight:800,fontSize:15,color:C.text,letterSpacing:0.3}}>
            🔥 {lang==="vi"?"Hồi phục cơ bắp":"Muscle Recovery"}
          </div>
          <div style={{fontSize:10,color:C.sub,fontWeight:600,letterSpacing:1,textTransform:"uppercase"}}>
            {lang==="vi"?"Khoa học thể thao":"Science-based"}
          </div>
        </div>
        <MuscleRecoveryPanel completionLog={completionLog} lang={lang} />
      </div>

      {/* ── Weekly Schedule ── */}
      <div style={glass}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <div style={{fontWeight:700,fontSize:14,color:C.text}}>📅 {lang==="vi"?"Lịch tập tuần":"Weekly schedule"}</div>
          <div style={{fontSize:11,color:C.sub}}>{lang==="vi"?"Bấm vào ngày để chỉnh":"Tap a day to edit"}</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {[1,2,3,4,5,6,0].map(dow => {
            const wk = weeklyPlan[dow];
            const today = new Date();
            const d = new Date(today); d.setDate(today.getDate() - (today.getDay() - dow));
            const key = d.toISOString().slice(0,10);
            const completed = !!completionLog[key];
            const isToday = dow === todayDow;
            return (
              <div key={dow} onClick={()=>setEditorDay(dow)}
                style={{
                  display:"flex",alignItems:"center",gap:10,padding:"12px",borderRadius:14,cursor:"pointer",
                  background: completed ? `${C.green}18` : isToday ? `${C.accent}14` : C.surface,
                  border: `1px solid ${completed ? C.green+"66" : isToday ? C.accent+"66" : C.border}`,
                  boxShadow: isToday ? `0 0 16px ${C.accent}22` : "none",
                  transition:"all .2s",
                }}>
                <div style={{
                  width:42,height:42,borderRadius:12,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                  background: isToday ? C.accent : C.card, color: isToday ? "#fff" : C.text, fontWeight:800, fontSize:13, flexShrink:0,
                }}>
                  <div>{days[dow]}</div>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  {wk ? (
                    <>
                      <div style={{fontSize:14,fontWeight:700,color:C.text,display:"flex",alignItems:"center",gap:6}}>
                        {completed && <CheckCircle size={14} color={C.green}/>}
                        {wk.name}
                      </div>
                      <div style={{fontSize:10,color:C.sub,marginTop:2,display:"flex",gap:8,flexWrap:"wrap"}}>
                        <span>💪 {wk.exercises?.length||0} {lang==="vi"?"bài":"ex"}</span>
                        <span>⏱ {wk.duration||0} min</span>
                        {Object.keys(buildTargetMuscles(wk.exercises||[])).slice(0,3).map(m =>
                          <span key={m} style={{color:C.accent}}>{muscleLabels[m]}</span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div style={{fontSize:13,color:C.sub,fontStyle:"italic"}}>{lang==="vi"?"Chưa lên lịch · bấm để thêm":"No workout · tap to add"}</div>
                  )}
                </div>
                {wk && wk.exercises?.length > 0 && (
                  <button onClick={(e)=>{e.stopPropagation(); completed ? unmarkComplete(dow) : markComplete(dow);}}
                    style={{
                      flexShrink:0,padding:"8px 10px",borderRadius:10,border:"none",cursor:"pointer",fontSize:11,fontWeight:700,
                      background: completed ? C.green : "transparent", color: completed ? "#fff" : C.green,
                      borderWidth:1, borderStyle:"solid", borderColor: C.green,
                    }}>
                    {completed ? "✓" : (lang==="vi"?"Xong":"Done")}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── BMI + Goal ── */}
      <div style={glass}>
        <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:12}}>{t.bmiTitle}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          <div>
            <div style={{fontSize:11,color:C.sub,marginBottom:4}}>{t.height}</div>
            <input type="number" value={h} onChange={e=>setH(Number(e.target.value)||0)} style={{width:"100%",padding:"10px",borderRadius:10,border:`1px solid ${C.border}`,background:C.surface,color:C.text,boxSizing:"border-box"}}/>
          </div>
          <div>
            <div style={{fontSize:11,color:C.sub,marginBottom:4}}>{t.weight}</div>
            <input type="number" value={w} onChange={e=>setW(Number(e.target.value)||0)} style={{width:"100%",padding:"10px",borderRadius:10,border:`1px solid ${C.border}`,background:C.surface,color:C.text,boxSizing:"border-box"}}/>
          </div>
        </div>

        {/* BMI bar */}
        <div style={{position:"relative",height:10,borderRadius:6,background:"linear-gradient(90deg,#38bdf8,#10b981 30%,#fbbf24 50%,#f59e0b 70%,#ef4444)",marginBottom:8}}>
          <div style={{position:"absolute",left:`${bmiPct}%`,top:-4,width:4,height:18,background:"#fff",borderRadius:2,transform:"translateX(-50%)",boxShadow:"0 0 6px rgba(255,255,255,.6)"}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:C.sub,marginBottom:12}}>
          <span>15</span><span>18.5</span><span>25</span><span>30</span><span>35+</span>
        </div>

        {/* Activity */}
        <div style={{marginBottom:10}}>
          <div style={{fontSize:11,color:C.sub,marginBottom:4}}>{t.activity}</div>
          <select value={act} onChange={e=>setAct(Number(e.target.value))} style={{width:"100%",padding:"10px",borderRadius:10,border:`1px solid ${C.border}`,background:C.surface,color:C.text}}>
            <option value={1.2}>{t.actLevels[0]}</option>
            <option value={1.375}>{t.actLevels[1]}</option>
            <option value={1.55}>{t.actLevels[2]}</option>
            <option value={1.725}>{t.actLevels[3]}</option>
            <option value={1.9}>{t.actLevels[4]}</option>
          </select>
        </div>

        {/* 10 goals grid */}
        <div style={{fontSize:11,color:C.sub,marginBottom:6}}>{t.goal} ({lang==="vi"?"10 mục tiêu":"10 goals"})</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:6,marginBottom:12}}>
          {FITNESS_GOALS.map(g => {
            const sel = g.id === goalId;
            return (
              <button key={g.id} onClick={()=>setGoalId(g.id)}
                style={{
                  textAlign:"left",padding:"8px 10px",borderRadius:10,cursor:"pointer",
                  background: sel ? `${g.color}26` : C.surface,
                  border:`1px solid ${sel ? g.color : C.border}`,
                  color: C.text, fontSize:11, fontWeight:700,
                  boxShadow: sel ? `0 0 10px ${g.color}55` : "none",
                }}>
                <div style={{color: sel ? g.color : C.text}}>{lang==="vi"?g.vi:g.en}</div>
                <div style={{fontSize:9,color:C.sub,fontWeight:500,marginTop:2}}>{g.cal>0?"+":""}{g.cal} kcal</div>
              </button>
            );
          })}
        </div>

        {/* Goal focus */}
        <div style={{padding:"10px 12px",borderRadius:10,background:`${goal.color}15`,border:`1px solid ${goal.color}44`,marginBottom:10}}>
          <div style={{fontSize:11,color:goal.color,fontWeight:800}}>🎯 {lang==="vi"?goal.focus_vi:goal.focus_en}</div>
        </div>

        {/* BMI / Calories cards */}
        <div style={{display:"flex",gap:10,marginBottom:10}}>
          <div style={{flex:1,background:`${bmiColor}20`,border:`1px solid ${bmiColor}50`,borderRadius:12,padding:"12px",textAlign:"center"}}>
            <div style={{fontSize:11,color:bmiColor,fontWeight:700}}>BMI ({bmiLabel})</div>
            <div style={{fontSize:24,fontWeight:900,color:bmiColor}}>{bmi}</div>
          </div>
          <div style={{flex:1,background:`${C.primary}20`,border:`1px solid ${C.primary}50`,borderRadius:12,padding:"12px",textAlign:"center"}}>
            <div style={{fontSize:11,color:C.primary,fontWeight:700}}>{t.dailyCal}</div>
            <div style={{fontSize:24,fontWeight:900,color:C.primary}}>{targetCal}</div>
          </div>
        </div>

        {/* Macros */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
          {[
            {l:lang==="vi"?"Đạm":"Protein", v:`${protein}g`, c:"#ef4444"},
            {l:"Carbs", v:`${carbs}g`, c:"#fbbf24"},
            {l:lang==="vi"?"Béo":"Fat", v:`${fat}g`, c:"#a78bfa"},
          ].map(m=>(
            <div key={m.l} style={{padding:"8px",borderRadius:10,background:`${m.c}18`,border:`1px solid ${m.c}44`,textAlign:"center"}}>
              <div style={{fontSize:14,fontWeight:800,color:m.c}}>{m.v}</div>
              <div style={{fontSize:9,color:C.sub,textTransform:"uppercase",letterSpacing:.4}}>{m.l}</div>
            </div>
          ))}
        </div>

        {suggestedGoalId !== goalId && (
          <div style={{marginTop:12,padding:"10px 12px",borderRadius:10,background:`${C.accent}18`,border:`1px dashed ${C.accent}66`,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
            <div style={{fontSize:11,color:C.text,lineHeight:1.4}}>
              💡 {lang==="vi"?`BMI ${bmi}, tuổi ${age||25} → khuyến nghị: `:`BMI ${bmi}, age ${age||25} → suggested: `}
              <b style={{color:C.accent}}>{(()=>{const sg=FITNESS_GOALS.find(x=>x.id===suggestedGoalId); return lang==="vi"?sg?.vi:sg?.en;})()}</b>
            </div>
            <button onClick={()=>setGoalId(suggestedGoalId)} style={{background:C.accent,border:"none",borderRadius:8,padding:"6px 10px",color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",whiteSpace:"nowrap"}}>{t.applyPreset||"Apply"}</button>
          </div>
        )}
      </div>

      {/* ── Body-fat (US Navy) ── */}
      <div style={glass}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <div style={{fontWeight:700,fontSize:14,color:C.text}}>📏 {lang==="vi"?"Đo Body Fat (US Navy)":"Body Fat (US Navy)"}</div>
        </div>
        <div style={{display:"flex",gap:6,marginBottom:10}}>
          {["male","female"].map(g => (
            <button key={g} onClick={()=>setGender(g)} style={{
              flex:1,padding:"8px",borderRadius:10,border:`1px solid ${gender===g?C.accent:C.border}`,
              background:gender===g?`${C.accent}26`:C.surface,color:gender===g?C.accent:C.text,
              fontWeight:700,fontSize:12,cursor:"pointer",
            }}>{g==="male"?(lang==="vi"?"Nam":"Male"):(lang==="vi"?"Nữ":"Female")}</button>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns: gender==="female"?"1fr 1fr 1fr":"1fr 1fr",gap:8,marginBottom:12}}>
          <div>
            <div style={{fontSize:10,color:C.sub,marginBottom:3}}>{lang==="vi"?"Cổ (cm)":"Neck (cm)"}</div>
            <input type="number" value={neck} onChange={e=>setNeck(Number(e.target.value)||0)} style={{width:"100%",padding:"8px",borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,color:C.text,boxSizing:"border-box"}}/>
          </div>
          <div>
            <div style={{fontSize:10,color:C.sub,marginBottom:3}}>{lang==="vi"?"Eo (cm)":"Waist (cm)"}</div>
            <input type="number" value={waist} onChange={e=>setWaist(Number(e.target.value)||0)} style={{width:"100%",padding:"8px",borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,color:C.text,boxSizing:"border-box"}}/>
          </div>
          {gender==="female" && (
            <div>
              <div style={{fontSize:10,color:C.sub,marginBottom:3}}>{lang==="vi"?"Hông (cm)":"Hip (cm)"}</div>
              <input type="number" value={hip} onChange={e=>setHip(Number(e.target.value)||0)} style={{width:"100%",padding:"8px",borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,color:C.text,boxSizing:"border-box"}}/>
            </div>
          )}
        </div>
        {bodyFat != null ? (
          <div style={{padding:"12px",borderRadius:12,background:`${bfCat.color}18`,border:`1px solid ${bfCat.color}55`,textAlign:"center"}}>
            <div style={{fontSize:11,color:bfCat.color,fontWeight:700}}>{bfCat.label}</div>
            <div style={{fontSize:28,fontWeight:900,color:bfCat.color,lineHeight:1.1}}>{bodyFat}%</div>
            <div style={{fontSize:10,color:C.sub,marginTop:6}}>
              {lang==="vi"?"Mỡ":"Fat"}: {(w*bodyFat/100).toFixed(1)}kg · {lang==="vi"?"Cơ nạc":"Lean"}: {(w*(100-bodyFat)/100).toFixed(1)}kg
            </div>
          </div>
        ) : (
          <div style={{padding:12,textAlign:"center",fontSize:11,color:C.sub}}>{lang==="vi"?"Nhập đầy đủ số đo":"Enter all measurements"}</div>
        )}
      </div>

      {/* ── Day Editor Modal ── */}
      {editorDay !== null && (
        <div onClick={()=>setEditorDay(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:50,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:480,maxHeight:"88vh",overflow:"auto",background:C.card,borderRadius:"20px 20px 0 0",padding:16,border:`1px solid ${C.border}`}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <div style={{fontSize:16,fontWeight:800,color:C.text}}>{days[editorDay]} · {editingDay?.name || (lang==="vi"?"Lên lịch":"Schedule")}</div>
              <button onClick={()=>setEditorDay(null)} style={{background:"transparent",border:"none",color:C.sub,fontSize:22,cursor:"pointer"}}>×</button>
            </div>

            {!editingDay && (
              <>
                <div style={{fontSize:12,color:C.sub,marginBottom:8}}>{lang==="vi"?"Chọn template hoặc tạo tuỳ chỉnh":"Pick a template or create custom"}</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:12}}>
                  {WORKOUT_TEMPLATES.map(tpl => (
                    <button key={tpl.id} onClick={()=>applyTemplate(tpl)} style={{padding:"10px",borderRadius:10,background:C.surface,border:`1px solid ${C.border}`,color:C.text,fontSize:12,fontWeight:700,cursor:"pointer",textAlign:"left"}}>
                      <div>{lang==="vi"?tpl.vi:tpl.en}</div>
                      <div style={{fontSize:10,color:C.sub,fontWeight:500,marginTop:2}}>{tpl.exercises.length} {lang==="vi"?"bài":"ex"} · {tpl.duration} min</div>
                    </button>
                  ))}
                </div>
                <button onClick={()=>updateEditingDay({name:lang==="vi"?"Buổi tự tạo":"Custom",exercises:[],duration:60})} style={{width:"100%",padding:"10px",borderRadius:10,background:C.primary,border:"none",color:"#fff",fontWeight:700,cursor:"pointer"}}>
                  + {lang==="vi"?"Tự tạo":"Create custom"}
                </button>
              </>
            )}

            {editingDay && (
              <>
                <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:8,marginBottom:10}}>
                  <input value={editingDay.name} onChange={e=>updateEditingDay({name:e.target.value})} placeholder={lang==="vi"?"Tên":"Name"} style={{padding:"8px",borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,color:C.text,boxSizing:"border-box"}}/>
                  <input type="number" value={editingDay.duration||0} onChange={e=>updateEditingDay({duration:Number(e.target.value)||0})} placeholder="min" style={{padding:"8px",borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,color:C.text,boxSizing:"border-box"}}/>
                </div>

                <div style={{display:"flex",gap:6,marginBottom:10}}>
                  <button onClick={()=>setPickerOpen(true)} style={{flex:1,padding:"8px",borderRadius:10,background:C.accent,border:"none",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer"}}>+ {lang==="vi"?"Thêm bài":"Add exercise"}</button>
                  <button onClick={()=>{clearDay(editorDay); setEditorDay(null);}} style={{padding:"8px 12px",borderRadius:10,background:"transparent",border:`1px solid ${C.danger}`,color:C.danger,fontWeight:700,fontSize:12,cursor:"pointer"}}>{lang==="vi"?"Xoá":"Clear"}</button>
                </div>

                {editingDay.exercises?.length === 0 ? (
                  <div style={{padding:16,textAlign:"center",color:C.sub,fontSize:12,background:C.surface,borderRadius:10,border:`1px dashed ${C.border}`}}>
                    {lang==="vi"?"Chưa có bài tập":"No exercises yet"}
                  </div>
                ) : (
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {editingDay.exercises.map((item,i) => {
                      const ms = exerciseMuscles(item.name);
                      const Stepper = ({label, value, min, max, onChange}) => (
                        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                          <div style={{fontSize:9,color:C.sub,textTransform:"uppercase",letterSpacing:.5}}>{label}</div>
                          <div style={{display:"flex",alignItems:"center",gap:4,background:C.card,borderRadius:8,border:`1px solid ${C.border}`,padding:"2px 4px"}}>
                            <button onClick={()=>onChange(Math.max(min, value-1))} style={{width:22,height:22,borderRadius:6,border:"none",background:"transparent",color:C.accent,cursor:"pointer",fontSize:14,fontWeight:800}}>−</button>
                            <input type="number" value={value} min={min} max={max}
                              onChange={e=>{const v=parseInt(e.target.value)||min; onChange(Math.max(min,Math.min(max,v)));}}
                              style={{width:30,textAlign:"center",background:"transparent",border:"none",color:C.text,fontWeight:800,fontSize:13,outline:"none"}}/>
                            <button onClick={()=>onChange(Math.min(max, value+1))} style={{width:22,height:22,borderRadius:6,border:"none",background:"transparent",color:C.accent,cursor:"pointer",fontSize:14,fontWeight:800}}>+</button>
                          </div>
                        </div>
                      );
                      return (
                        <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:10,borderRadius:10,background:C.surface,border:`1px solid ${C.border}`}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:13,fontWeight:700,color:C.text}}>{item.name}</div>
                            <div style={{fontSize:9,color:C.sub,marginTop:2}}>{ms.map(m=>muscleLabels[m]).join(" • ")}</div>
                          </div>
                          <Stepper label="Sets" value={item.sets} min={1} max={10} onChange={(v)=>updateExerciseInEditor(i,{sets:v})}/>
                          <Stepper label="Reps" value={item.reps} min={1} max={50} onChange={(v)=>updateExerciseInEditor(i,{reps:v})}/>
                          <button onClick={()=>removeExerciseFromEditor(i)} style={{background:"transparent",border:"none",color:C.danger,cursor:"pointer",fontSize:18,padding:"0 4px"}}>×</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Exercise Picker ── */}
      {pickerOpen && (
        <div onClick={()=>setPickerOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:60,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:480,maxHeight:"85vh",overflow:"auto",background:C.card,borderRadius:"20px 20px 0 0",padding:16,border:`1px solid ${C.border}`}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div style={{fontSize:15,fontWeight:800,color:C.text}}>{lang==="vi"?"Chọn bài tập":"Pick exercise"}</div>
              <button onClick={()=>setPickerOpen(false)} style={{background:"transparent",border:"none",color:C.sub,fontSize:22,cursor:"pointer"}}>×</button>
            </div>
            <input value={pickerSearch} onChange={e=>setPickerSearch(e.target.value)} placeholder={lang==="vi"?"Tìm...":"Search..."} style={{width:"100%",padding:"10px",borderRadius:10,border:`1px solid ${C.border}`,background:C.surface,color:C.text,boxSizing:"border-box",marginBottom:10}}/>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {Object.keys(filteredExercises).map(cat => (
                <div key={cat}>
                  <div style={{fontSize:11,color:C.accent,fontWeight:800,marginBottom:4,textTransform:"uppercase"}}>{cat}</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                    {filteredExercises[cat].map(ex => (
                      <button key={ex} onClick={()=>{addExerciseToEditor(ex); setPickerOpen(false); setPickerSearch("");}}
                        style={{textAlign:"left",padding:"10px 12px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,color:C.text,fontSize:12,cursor:"pointer",fontWeight:600}}>
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── BROWSER TAB ─────────────────────────────────────────────────────────────
const BrowserTab=({t,lang})=>{
  const [iframeUrl,setIframeUrl]=useState("");
  const [blocked,setBlocked]=useState(false);
  const [inputVal,setInputVal]=useState("");
  const navigate=target=>{
    let nav=target.trim(); if(!nav)return;
    if(!nav.startsWith("http"))nav="https://"+nav;
    if(isBlocked(nav)){setBlocked(true);setIframeUrl("");return;}
    setBlocked(false);setIframeUrl(nav);
  };
  return(
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 120px)",padding:"10px"}}>
      {/* Search bar hidden */}
      {!iframeUrl&&!blocked&&(
        <div style={{marginTop:16,background:C.surface,borderRadius:16,padding:"12px 14px",border:`1px solid ${C.border}`}}>
          <div style={{fontSize:12,fontWeight:700,color:C.accent,marginBottom:4}}>🛡 {lang==="en"?"Ad & Popup Blocker Active":"Đã bật chặn Popup & Trình theo dõi"}</div>
          <div style={{fontSize:12,color:C.sub,lineHeight:1.6}}>{lang==="en"?"Popups and known ad-tracking domains are restricted.":"Chặn quảng cáo nhảy tab (popup) và các máy chủ theo dõi độc hại."}</div>
        </div>
      )}
      {blocked ? (
        <div style={{textAlign:"center",padding:40}}>
          <div style={{fontSize:50}}>🚫</div>
          <div style={{color:C.accent,fontWeight:800,marginBottom:8}}>{lang==='en'?"Ad/Tracker Blocked":"Đã chặn Quảng cáo"}</div>
          <button onClick={()=>{setBlocked(false);setIframeUrl("");setInputVal("");}} style={{marginTop:16,background:C.primary,border:"none",borderRadius:12,padding:"10px 20px",color:"#fff",fontWeight:700}}>Quay lại</button>
        </div>
      ) : iframeUrl ? (
        <iframe src={iframeUrl} style={{flex:1,border:"none",borderRadius:16,background:"#fff"}} sandbox="allow-scripts allow-same-origin"/>
      ) : (
        <div style={{textAlign:"center",padding:40,color:C.sub}}>Nhập địa chỉ Web để bắt đầu duyệt</div>
      )}
    </div>
  );
};

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
function AppRoot(){
  const [sessions,setSessions]=useState(()=>load(STORAGE_KEY)||[]);
  const [customQuotes,setCustomQuotes]=useState(()=>load(QUOTES_KEY)||[]);
  const [pending,setPending]=useState(null);
  const [tab,setTab]=useState("home");
  const [modal,setModal]=useState(false);
  const [modalType,setModalType]=useState("shoot");
  const [quoteModal,setQuoteModal]=useState(false);
  const [editSession,setEditSession]=useState(null);
  const [lang,setLang]=useState(()=>load(LANG_KEY)||"vi");
  const [dob,setDobState]=useState(()=>load(DOB_KEY)||null);
  const [age,setAgeState]=useState(()=>{ const d=load(DOB_KEY); if(d){const a=calcAgeFromDob(d); if(a!==null) return a;} return load(AGE_KEY)||null; });
  const [motivationPhoto,setMotivationPhotoState]=useState(()=>load(MOTIVATION_KEY)||null);
  const [avatar,setAvatarState]=useState(()=>load(AVATAR_KEY)||null);
  const [schedule,setScheduleState]=useState(()=>load(SCHEDULE_KEY)||{edge:[],shoot:[]});
  const [editDob,setEditDob]=useState(false);
  const [warnOpen,setWarnOpen]=useState(false);
  const [wheelTick,setWheelTick]=useState(0);
  const [trackingStart,setTrackingStart]=useState(()=>load(TRACKING_START_KEY)||null);
  const t=T[lang];

  // ── Double-back to exit ────────────────────────────────────────
  const backPressCount = useRef(0);
  const backToastRef = useRef(null);
  useEffect(() => {
    const onBack = (e) => {
      e.preventDefault();
      backPressCount.current += 1;
      if (backPressCount.current === 1) {
        // Hiện toast nhắc nhở
        if (backToastRef.current) clearTimeout(backToastRef.current);
        const toast = document.getElementById('vanta-back-toast');
        if (toast) { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; }
        backToastRef.current = setTimeout(() => {
          backPressCount.current = 0;
          const t2 = document.getElementById('vanta-back-toast');
          if (t2) { t2.style.opacity = '0'; t2.style.transform = 'translateY(20px)'; }
        }, 2000);
      } else if (backPressCount.current >= 2) {
        // Thoát app
        window.history.go(-(window.history.length));
      }
      window.history.pushState(null, '', window.location.href);
    };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', onBack);
    return () => window.removeEventListener('popstate', onBack);
  }, []);

  // World-clock sync removed: time logic uses the user's selected timezone.

  const persist=useCallback(updated=>{setSessions(updated);save(STORAGE_KEY,updated);},[]);
  const persistQuotes=useCallback(updated=>{setCustomQuotes(updated);save(QUOTES_KEY,updated);},[]);
  const toggleLang=()=>{const next=lang==="en"?"vi":"en";setLang(next);save(LANG_KEY,next);};
  const setDob=d=>{ setDobState(d); save(DOB_KEY,d); const a=calcAgeFromDob(d); setAgeState(a); save(AGE_KEY,a); setEditDob(false); };
  const setMotivationPhoto=p=>{ setMotivationPhotoState(p); save(MOTIVATION_KEY,p); };
  const setAvatar=p=>{ setAvatarState(p); save(AVATAR_KEY,p); };
  const setSchedule=sc=>{ setScheduleState(sc); save(SCHEDULE_KEY,sc); };

  const hours=useMemo(()=>hoursSinceLast(sessions),[sessions]);

  const doSave=useCallback(({notes,timestamp,type,photo,edgeDuration})=>{
    // Set tracking start on first session ever
    if(!trackingStart){
      const start=timestamp||worldNow().toISOString();
      setTrackingStart(start);save(TRACKING_START_KEY,start);
    }
    if(editSession){persist(sessions.map(s=>s.id===editSession.id?{...s,notes,timestamp,type,photo:photo||s.photo,edgeDuration:edgeDuration||s.edgeDuration}:s));}
    else persist([...sessions,{id:Date.now().toString(),timestamp,notes,type,photo,edgeDuration}]);
    setEditSession(null);
  },[sessions,editSession,persist,trackingStart]);

  const handleSave=useCallback(data=>{
    if(!editSession && age && data.type==='shoot'){
      const rec=getAgeRec(age);
      if(hours!==null&&hours<rec.recovery){
        setPending(data);setWarnOpen(true);return;
      }
    }
    doSave(data);
  },[editSession,age,hours,doSave]);

  // Quick log an edge session for a specific date (used by November challenge tap-to-log)
  const quickEdgeForDay=useCallback((date)=>{
    const rec=getAgeRec(age||25);
    const d=new Date(date); d.setHours(12,0,0,0);
    if(!trackingStart){ const s=d.toISOString(); setTrackingStart(s); save(TRACKING_START_KEY,s); }
    const newSession={id:Date.now().toString(),timestamp:d.toISOString(),notes:'',type:'edge',photo:null,edgeDuration:rec.edgeDuration.min};
    persist([...sessions,newSession]);
  },[age,sessions,persist,trackingStart]);

  const handleDelete=useCallback(id=>{if(typeof window !== 'undefined' && window.confirm && window.confirm(t.deleteConfirm))persist(sessions.filter(s=>s.id!==id));},[sessions,persist,t]);

  const openLogShoot=()=>{setEditSession(null);setModalType("shoot");setModal(true);};
  const openLogEdge=()=>{setEditSession(null);setModalType("edge");setModal(true);};

  const [novTestMode,setNovTestMode]=useState(()=>{ try{return localStorage.getItem('ht_nov_test_v1')==='1';}catch{return false;} });
  const toggleNovTest=()=>{ setNovTestMode(v=>{ const nv=!v; try{localStorage.setItem('ht_nov_test_v1', nv?'1':'0');}catch{} return nv; }); };

  // November-aware home handlers (timezone-based, uses the user's selected TZ)
  const novStateNow = getNovChallengeState();
  const nowParts = partsInTZ(worldNow());
  const novActive = novStateNow.status==='active' && novStateNow.year===nowParts.year && (novTestMode || nowParts.month===10);

  const homeLogShoot = ()=>{
    if(novActive){
      const ok = typeof window !== 'undefined' && window.confirm ? window.confirm(lang==='vi'
        ? '⚠️ Bắn trong tháng 11 sẽ làm THỬ THÁCH THẤT BẠI. Tiếp tục?'
        : '⚠️ Shooting during November will FAIL the challenge. Continue?') : true;
      if(!ok) return;
      const failed = {...novStateNow, status:'failed'};
      save(NOV_CHALLENGE_KEY, failed);
    }
    openLogShoot();
  };
  const homeLogEdge = ()=>{
    if(novActive){
      // Same as challenge tab: quick +1 edge for today
      quickEdgeForDay(new Date());
      return;
    }
    openLogEdge();
  };
  const openEdit=s=>{setEditSession(s);setModalType(s.type||"shoot");setModal(true);};

  // Reminder effect: notify based on weekly schedule (once per day per type)
  useEffect(()=>{
    if(typeof window==='undefined' || !('Notification' in window)) return;
    const tryNotify = () => {
      if(Notification.permission!=='granted') return;
      const today = partsInTZ(worldNow());
      const dayKeyStr = `${today.year}-${today.month+1}-${today.day}`;
      const last = load(LAST_REMIND_KEY) || {};
      const dow = today.dayOfWeek;
      if(schedule.edge?.includes(dow) && last[dayKeyStr+"_e"]!==true){
        try{ new Notification("Vanta", {body: t.reminderEdge + (schedule.edgeTime?` ⏰ ${schedule.edgeTime}`:"")}); }catch{}
        save(LAST_REMIND_KEY, {...last, [dayKeyStr+"_e"]:true});
      }
      if(schedule.shoot?.includes(dow) && last[dayKeyStr+"_s"]!==true){
        try{ new Notification("Vanta", {body: t.reminderShoot + (schedule.shootTime?` ⏰ ${schedule.shootTime}`:"")}); }catch{}
        const cur = load(LAST_REMIND_KEY) || {};
        save(LAST_REMIND_KEY, {...cur, [dayKeyStr+"_s"]:true});
      }
    };
    if(Notification.permission==='default'){
      Notification.requestPermission().then(()=>tryNotify());
    } else {
      tryNotify();
    }
  },[schedule,t]);

  const resetAll=()=>{
    if(!(typeof window !== 'undefined' && window.confirm ? window.confirm(lang==='vi'?'Xoá toàn bộ dữ liệu? Hành động không thể hoàn tác.':'Erase ALL data? This cannot be undone.') : true))return;
    try{
      ['ht_sessions_v6','ht_lang_v5','ht_challenges_v5','ht_age_v3','ht_quotes_v2','ht_tracking_start_v1','ht_challenge_log_v1','ht_nov_challenge_v1','ht_dob_v1','ht_motivation_v1','ht_schedule_v1','ht_last_remind_v1','ht_nov_test_v1'].forEach(k=>localStorage.removeItem(k));
    }catch{}
    location.reload();
  };
  const TABS=[
    {id:"home",icon:<Home size={20}/>,label:t.home},
    {id:"stats",icon:<BarChart2 size={20}/>,label:t.stats},
    {id:"goals",icon:<Trophy size={20}/>,label:t.challenges},
    {id:"nutrition",icon:<HeartPulse size={20}/>,label:lang==='vi'?'Sức khỏe & Tập':'Health & Train'},
    {id:"chat",icon:<MessageCircle size={20}/>,label:lang==='vi'?'AI':'AI'},
    {id:"user",icon:<User size={20}/>,label:t.userTab},
  ];

  // Ensure today's daily/shoot challenges are randomized once per local day
  // (replaces the old wheel auto-popup; result is still stored under
  // WHEEL_RESULT_KEY so getDailyChallenge / getShootDayChallenge resolve).
  useEffect(()=>{
    if(age==null) return;
    const seen = load(WHEEL_SEEN_KEY) || {};
    const k = todayKey();
    if(!seen[k]){
      randomizeWheelResult(age, schedule);
      save(WHEEL_SEEN_KEY,{...seen,[k]:true});
      setWheelTick(x=>x+1);
    }
  },[age,schedule]);

  if(age===null||dob===null) return(
    <>
      <div style={{fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif,'Noto Color Emoji','Apple Color Emoji','Segoe UI Emoji'",background:C.gradient,minHeight:"100vh",maxWidth:480,margin:"0 auto",color:C.text}}/>
      <DobSetup onSave={setDob} t={t}/>
    </>
  );

  return(
    <div style={{fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif,'Noto Color Emoji','Apple Color Emoji','Segoe UI Emoji'",background:C.gradient,backgroundAttachment:"fixed",minHeight:"100vh",maxWidth:480,margin:"0 auto",position:"relative",color:C.text}}>
      {/* Sticky header removed; logo moved into User tab */}

      <div style={{overflowY:"auto",paddingBottom:80}}>
        {tab==="home"&&<HomeTab sessions={sessions} onLogShoot={homeLogShoot} onLogEdge={homeLogEdge} t={t} lang={lang} age={age} customQuotes={customQuotes} openQuoteModal={()=>setQuoteModal(true)} trackingStart={trackingStart} motivationPhoto={motivationPhoto} schedule={schedule} wheelTick={wheelTick}/>}
        {tab==="user"&&<UserTab sessions={sessions} dob={dob} age={age} t={t} lang={lang} toggleLang={toggleLang} trackingStart={trackingStart} motivationPhoto={motivationPhoto} setMotivationPhoto={setMotivationPhoto} avatar={avatar} setAvatar={setAvatar} schedule={schedule} setSchedule={setSchedule} onChangeDob={()=>setEditDob(true)} onEdit={openEdit} onDelete={handleDelete} novTestMode={novTestMode} toggleNovTest={toggleNovTest} resetAll={resetAll}/>}
        {tab==="stats"&&<StatsTab sessions={sessions} t={t} trackingStart={trackingStart} lang={lang}/>}
        {tab==="goals"&&<GoalsTab sessions={sessions} age={age} t={t} lang={lang} dob={dob} onLogEdge={openLogEdge} onLogShoot={openLogShoot} onQuickEdgeForDay={quickEdgeForDay} schedule={schedule} novTestMode={novTestMode} wheelTick={wheelTick}/>}
        {tab==="nutrition"&&<><TrainingTab lang={lang} age={age}/><HealthTab age={age} t={t} lang={lang} /></>}
        {tab==="chat"&&<ChatTab t={t} lang={lang}/>}
      </div>

      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,zIndex:10}}>
        <div style={{background:"rgba(10,10,20,.92)",backdropFilter:"blur(16px)",borderTop:`1px solid ${C.border}`,paddingBottom:8,paddingTop:4,overflowX:"auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",position:"relative",minWidth:350,padding:"0 10px"}}>
            {TABS.map(({id,icon,label})=>{
              const active=tab===id;
              return(
                <button key={id} onClick={()=>setTab(id)}
                  style={{flex:1,border:"none",background:"none",cursor:"pointer",padding:"6px 0 4px",display:"flex",flexDirection:"column",alignItems:"center",gap:2,position:"relative"}}>
                  {active&&<div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:24,height:2,background:C.accent,borderRadius:"0 0 4px 4px"}}/>}
                  <span style={{fontSize:active?20:18,filter:active?"drop-shadow(0 0 6px rgba(167,139,250,.6))":"none"}}>{icon}</span>
                  <span style={{fontSize:9,fontWeight:active?700:500,color:active?C.accent:C.sub,whiteSpace:"nowrap"}}>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <WarnModal open={warnOpen} onForce={()=>{setWarnOpen(false);if(pending){doSave(pending);setPending(null);}}} onCancel={()=>{setWarnOpen(false);setPending(null);}} t={t} hours={hours} required={age?getAgeRec(age).recovery:48}/>
      <LogModal open={modal} onClose={()=>{setModal(false);setEditSession(null);}} onSave={handleSave} editSession={editSession} t={t} age={age} defaultType={editSession?.type||modalType} lang={lang}/>
      <QuoteModal open={quoteModal} onClose={()=>setQuoteModal(false)} quotes={customQuotes} setQuotes={persistQuotes} t={t}/>
      {editDob && <DobSetup onSave={setDob} t={t}/>}
    </div>
  );
}

export default AppRoot;
