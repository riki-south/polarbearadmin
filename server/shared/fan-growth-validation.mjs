export const FAN_GROWTH_CATEGORIES = [
  "south-monthly",
  "north-weekly",
  "north-monthly",
];

const MONTHLY_PERIOD_PATTERN = /^(\d{4})-(\d{2})$/;
const WEEKLY_PERIOD_PATTERN = /^(\d{4})-W(\d{2})$/i;

export function normalizeFanGrowthCategory(category) {
  if (category === "monthly") return "south-monthly";
  if (category === "weekly") return "north-weekly";
  return FAN_GROWTH_CATEGORIES.includes(category) ? category : null;
}

export function isMonthlyCategory(category) {
  return category === "south-monthly" || category === "north-monthly";
}

function getIsoWeeksInYear(year) {
  const decemberTwentyEighth = new Date(Date.UTC(year, 11, 28));
  const day = decemberTwentyEighth.getUTCDay() || 7;
  decemberTwentyEighth.setUTCDate(decemberTwentyEighth.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(decemberTwentyEighth.getUTCFullYear(), 0, 1));
  return Math.ceil(
    ((decemberTwentyEighth.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
}

export function isPeriodIdValidForCategory(category, periodId) {
  if (typeof periodId !== "string") return false;

  if (isMonthlyCategory(category)) {
    const match = MONTHLY_PERIOD_PATTERN.exec(periodId);
    if (!match) return false;
    const month = Number(match[2]);
    return month >= 1 && month <= 12;
  }

  if (category === "north-weekly") {
    const match = WEEKLY_PERIOD_PATTERN.exec(periodId);
    if (!match) return false;
    const year = Number(match[1]);
    const week = Number(match[2]);
    return week >= 1 && week <= getIsoWeeksInYear(year);
  }

  return false;
}

export function getExpectedMemberIdPrefix(category) {
  return category === "south-monthly" ? "S" : "N";
}

export function normalizeMemberId(value, category) {
  if (typeof value !== "string") return null;
  const memberId = value.trim().toUpperCase();
  const prefix = getExpectedMemberIdPrefix(category);
  return new RegExp(`^${prefix}[0-9]{3,}$`).test(memberId) && memberId !== `${prefix}000`
    ? memberId
    : null;
}

export function parseNonNegativeInteger(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.replaceAll(",", "").trim())
        : Number.NaN;

  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;
}
