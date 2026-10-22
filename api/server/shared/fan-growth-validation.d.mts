export const FAN_GROWTH_CATEGORIES: readonly string[];
export function normalizeFanGrowthCategory(category: unknown): string | null;
export function isMonthlyCategory(category: string): boolean;
export function isPeriodIdValidForCategory(category: string, periodId: unknown): boolean;
export function getExpectedMemberIdPrefix(category: string): "S" | "N";
export function normalizeMemberId(value: unknown, category: string): string | null;
export function parseNonNegativeInteger(value: unknown): number | undefined;
