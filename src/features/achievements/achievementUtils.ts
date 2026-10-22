import type { FanGrowthDataset } from "../fan-growth/fanGrowthTypes";
import { buildComputedRecords, comparePeriodIdsAsc, isMonthlyCategory } from "../fan-growth/fanGrowthUtils";

export const TWO_HUNDRED_MILLION_FANS = 200_000_000;

export type AchievementBadgeTier = "wood" | "stone" | "iron" | "silver" | "gold" | "diamond";
export type AchievementBadge = {
  tier: AchievementBadgeTier;
  minimumStacks: number;
  label: string;
};

export const ACHIEVEMENT_BADGE_TIERS: AchievementBadge[] = [
  { tier: "wood", minimumStacks: 2, label: "나무" },
  { tier: "stone", minimumStacks: 4, label: "석재" },
  { tier: "iron", minimumStacks: 6, label: "철" },
  { tier: "silver", minimumStacks: 8, label: "은" },
  { tier: "gold", minimumStacks: 13, label: "금" },
  { tier: "diamond", minimumStacks: 20, label: "다이아" },
];

/**
 * Awards one stack for each monthly first-place finish and one for each
 * established member whose monthly increase is strictly greater than 200M.
 * Because this is derived from the current monthly history, replacing an
 * uploaded period also recalculates its awards without storing duplicate state.
 */
export function buildMemberAchievementStacks(
  datasets: FanGrowthDataset[],
): Map<string, number> {
  const stacksByMemberId = new Map<string, number>();
  const monthlyDatasets = datasets
    .filter((dataset) => isMonthlyCategory(dataset.category))
    .sort((left, right) => comparePeriodIdsAsc(left.periodId, right.periodId));

  for (const dataset of monthlyDatasets) {
    const establishedRecords = buildComputedRecords(dataset.records).filter((record) => !record.isNew);
    const monthlyLeader = establishedRecords[0];

    if (monthlyLeader) {
      stacksByMemberId.set(
        monthlyLeader.memberId,
        (stacksByMemberId.get(monthlyLeader.memberId) ?? 0) + 1,
      );
    }

    for (const record of establishedRecords) {
      if (record.increase <= TWO_HUNDRED_MILLION_FANS) continue;
      stacksByMemberId.set(
        record.memberId,
        (stacksByMemberId.get(record.memberId) ?? 0) + 1,
      );
    }
  }

  return stacksByMemberId;
}

export function getAchievementBadgeTier(stacks: number): AchievementBadge | null {
  return [...ACHIEVEMENT_BADGE_TIERS]
    .reverse()
    .find((tier) => stacks >= tier.minimumStacks) ?? null;
}
