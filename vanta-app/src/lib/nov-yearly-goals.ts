// November Edging Challenge — yearly themes.
// Each year picks a unique theme so the goal feels fresh.
// Falls back to (year % themes.length) when the year isn't pre-defined.

export type NovYearTheme = {
  code: string;
  title_vi: string;
  title_en: string;
  rule_vi: string;
  rule_en: string;
  // baseline daily target multiplier (applied on top of the random per-day target)
  multiplier: number;
};

const THEMES: NovYearTheme[] = [
  {
    code: "STAMINA",
    title_vi: "Năm Sức Bền",
    title_en: "Year of Stamina",
    rule_vi: "Mỗi phiên edging tối thiểu 20 phút, cộng dồn ≥ 600 phút cả tháng.",
    rule_en: "Each edge ≥ 20 min, total ≥ 600 min for the month.",
    multiplier: 1,
  },
  {
    code: "VOLUME",
    title_vi: "Năm Khối Lượng",
    title_en: "Year of Volume",
    rule_vi: "Tăng 50% mục tiêu mỗi ngày. Không bỏ ngày nào.",
    rule_en: "Daily target ×1.5. No skipped days.",
    multiplier: 1.5,
  },
  {
    code: "CONTROL",
    title_vi: "Năm Kiểm Soát",
    title_en: "Year of Control",
    rule_vi: "Edge tối thiểu 2 lần/ngày, mỗi lần kéo dài đến đỉnh điểm rồi dừng 30s.",
    rule_en: "≥ 2 edges/day, ride to the brink and back off for 30s each time.",
    multiplier: 1,
  },
  {
    code: "SILENCE",
    title_vi: "Năm Tĩnh Lặng",
    title_en: "Year of Silence",
    rule_vi: "Không xem khiêu dâm trong tháng 11. Edge bằng trí tưởng tượng.",
    rule_en: "No porn in November. Edge using imagination only.",
    multiplier: 1,
  },
  {
    code: "INTENSITY",
    title_vi: "Năm Cường Độ",
    title_en: "Year of Intensity",
    rule_vi: "Mỗi Chủ Nhật là ngày INTENSE: tối thiểu 5 lần edge.",
    rule_en: "Every Sunday is INTENSE day: minimum 5 edges.",
    multiplier: 1,
  },
  {
    code: "DOUBLE",
    title_vi: "Năm Nhân Đôi",
    title_en: "Year of Doubling",
    rule_vi: "Gấp đôi mục tiêu mỗi ngày, nhưng được phép nghỉ 2 ngày bất kỳ.",
    rule_en: "Daily target ×2, but you may skip any 2 days.",
    multiplier: 2,
  },
  {
    code: "MARATHON",
    title_vi: "Năm Marathon",
    title_en: "Year of Marathon",
    rule_vi: "Một phiên edge cuối tuần phải kéo dài liên tục ≥ 60 phút.",
    rule_en: "One weekend session must last ≥ 60 minutes nonstop.",
    multiplier: 1,
  },
];

// Pre-bind specific years so each is guaranteed unique in sequence.
const YEAR_MAP: Record<number, number> = {
  2024: 0,
  2025: 1,
  2026: 2,
  2027: 3,
  2028: 4,
  2029: 5,
  2030: 6,
};

export function getNovYearTheme(year: number): NovYearTheme {
  const idx = year in YEAR_MAP ? YEAR_MAP[year] : year % THEMES.length;
  return THEMES[idx];
}
