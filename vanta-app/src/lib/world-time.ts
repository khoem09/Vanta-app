// Timezone utilities.
// All time logic in the app uses the user's selected timezone (from the User tab).
// No world-clock / UTC sync — the device clock is the source of truth, and the
// chosen timezone determines calendar boundaries (today, day-of-week, month, year).

const TZ_KEY = "ht_tz_v1";

export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function getTimezone(): string {
  if (typeof window === "undefined") return "UTC";
  try {
    const v = localStorage.getItem(TZ_KEY);
    if (v) return v;
  } catch {}
  return getBrowserTimezone();
}

export function setTimezone(tz: string) {
  try {
    localStorage.setItem(TZ_KEY, tz);
  } catch {}
}

// Local "now" — the user's device clock. All callers should pass this through
// partsInTZ / dayKey / formatInTZ to interpret it in the selected timezone.
export function worldNow(): Date {
  return new Date();
}

// Back-compat no-op (previously synced to a public time API).
export async function syncWorldTime(_force = false): Promise<void> {
  return;
}

export function getSkewMs(): number {
  return 0;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

// ── Timezone-aware parts (the only "calendar" the app uses) ──────────────
export function partsInTZ(d: Date = worldNow(), tz: string = getTimezone()) {
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      weekday: "short",
    });
    const out: any = {};
    for (const p of fmt.formatToParts(d)) out[p.type] = p.value;
    const dowMap: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    };
    return {
      year: +out.year,
      month: +out.month - 1,
      day: +out.day,
      hour: +out.hour,
      minute: +out.minute,
      dayOfWeek: dowMap[out.weekday] ?? 0,
    };
  } catch {
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      day: d.getDate(),
      hour: d.getHours(),
      minute: d.getMinutes(),
      dayOfWeek: d.getDay(),
    };
  }
}

// Day key (YYYY-MM-DD) in the user's selected timezone.
export function dayKeyTZ(d: Date = worldNow()): string {
  const p = partsInTZ(d);
  return `${p.year}-${pad2(p.month + 1)}-${pad2(p.day)}`;
}

// ── Back-compat aliases (previously UTC-based) ───────────────────────────
// These now resolve in the user's selected timezone — the "world UTC" mode
// has been removed by user request.
export const utcParts = partsInTZ;
export const dayKeyUTC = dayKeyTZ;

export function formatInTZ(
  date: Date | string | number,
  opts: Intl.DateTimeFormatOptions = {},
  locale = "en-GB",
): string {
  const d = date instanceof Date ? date : new Date(date);
  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone: getTimezone(),
      ...opts,
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

export const COMMON_TIMEZONES: { value: string; label: string }[] = [
  { value: "UTC", label: "UTC (±0)" },
  { value: "Pacific/Honolulu", label: "Honolulu (UTC−10)" },
  { value: "America/Anchorage", label: "Anchorage (UTC−9)" },
  { value: "America/Los_Angeles", label: "Los Angeles (UTC−8)" },
  { value: "America/Denver", label: "Denver (UTC−7)" },
  { value: "America/Chicago", label: "Chicago (UTC−6)" },
  { value: "America/New_York", label: "New York (UTC−5)" },
  { value: "America/Sao_Paulo", label: "São Paulo (UTC−3)" },
  { value: "Atlantic/Azores", label: "Azores (UTC−1)" },
  { value: "Europe/London", label: "London (UTC±0)" },
  { value: "Europe/Paris", label: "Paris (UTC+1)" },
  { value: "Europe/Berlin", label: "Berlin (UTC+1)" },
  { value: "Europe/Moscow", label: "Moscow (UTC+3)" },
  { value: "Asia/Dubai", label: "Dubai (UTC+4)" },
  { value: "Asia/Kolkata", label: "Kolkata (UTC+5:30)" },
  { value: "Asia/Bangkok", label: "Bangkok (UTC+7)" },
  { value: "Asia/Ho_Chi_Minh", label: "Ho Chi Minh (UTC+7)" },
  { value: "Asia/Jakarta", label: "Jakarta (UTC+7)" },
  { value: "Asia/Singapore", label: "Singapore (UTC+8)" },
  { value: "Asia/Shanghai", label: "Shanghai (UTC+8)" },
  { value: "Asia/Hong_Kong", label: "Hong Kong (UTC+8)" },
  { value: "Asia/Tokyo", label: "Tokyo (UTC+9)" },
  { value: "Asia/Seoul", label: "Seoul (UTC+9)" },
  { value: "Australia/Sydney", label: "Sydney (UTC+10/11)" },
  { value: "Pacific/Auckland", label: "Auckland (UTC+12/13)" },
];
