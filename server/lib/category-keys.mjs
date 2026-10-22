import {
  FAN_GROWTH_CATEGORIES,
  isMonthlyCategory,
  isPeriodIdValidForCategory,
  normalizeFanGrowthCategory,
} from "../shared/fan-growth-validation.mjs";

export { FAN_GROWTH_CATEGORIES, isMonthlyCategory };

const LEGACY_CATEGORY_MAP = {
  "south-monthly": "monthly",
  "north-weekly": "weekly",
};

export function getLegacyCategory(category) {
  return LEGACY_CATEGORY_MAP[category] ?? null;
}

export function buildFanGrowthDatasetObjectKey(prefix, category, periodId) {
  const normalizedCategory = normalizeFanGrowthCategory(category);
  if (!normalizedCategory) {
    throw new Error("Unknown fan growth category.");
  }
  if (!isPeriodIdValidForCategory(normalizedCategory, periodId)) {
    throw new Error(
      isMonthlyCategory(normalizedCategory)
        ? "Monthly periodId must use YYYY-MM format."
        : "Weekly periodId must use YYYY-WNN format.",
    );
  }

  return `${prefix}${normalizedCategory}-${periodId}.json`;
}

export function isFanGrowthDatasetObjectKey(prefix, objectKey, category) {
  const normalizedCategory = normalizeFanGrowthCategory(category);
  if (!normalizedCategory) return false;

  const categoryPrefixes = [normalizedCategory, getLegacyCategory(normalizedCategory)]
    .filter(Boolean)
    .map((value) => `${prefix}${value}-`);

  return categoryPrefixes.some((candidate) => objectKey.startsWith(candidate)) &&
    objectKey.endsWith(".json");
}
