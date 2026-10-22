import type {
  FanGrowthDataset,
  FanGrowthPeriodSummary,
  FanGrowthUploadDataset,
} from "../features/fan-growth/fanGrowthTypes";
import {
  FAN_GROWTH_CATEGORIES,
  getPreviousPeriodId,
  resolveUploadDataset,
  sortPeriodSummaries,
} from "../features/fan-growth/fanGrowthUtils";
import type { FanGrowthCategory } from "./types";

const STORAGE_KEYS = {
  datasets: "spb:fan-growth-datasets",
} as const;

type StoredFanGrowthDataset = Omit<FanGrowthDataset, "category"> & {
  category: FanGrowthCategory | "monthly" | "weekly";
};

function normalizeStoredCategory(
  category: StoredFanGrowthDataset["category"],
): FanGrowthCategory | null {
  if (category === "monthly") return "south-monthly";
  if (category === "weekly") return "north-weekly";
  return FAN_GROWTH_CATEGORIES.includes(category) ? category : null;
}

function readArray<T>(key: string): T[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as T[];
  } catch (error) {
    console.error(error);
    return [];
  }
}

function writeArray<T>(key: string, records: T[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(records));
}

export function getDatasets(): FanGrowthDataset[] {
  return readArray<StoredFanGrowthDataset>(STORAGE_KEYS.datasets).flatMap((dataset) => {
    const category = normalizeStoredCategory(dataset.category);
    const hasMemberIds = dataset.records.every(
      (record) => typeof record.memberId === "string" && record.memberId.trim() !== "",
    );

    return category && hasMemberIds ? [{ ...dataset, category }] : [];
  });
}

export function saveDatasets(datasets: FanGrowthDataset[]): void {
  writeArray(STORAGE_KEYS.datasets, datasets);
}

export function getDataset(
  category: FanGrowthCategory,
  periodId: string,
): FanGrowthDataset | null {
  return (
    getDatasets().find(
      (dataset) => dataset.category === category && dataset.periodId === periodId,
    ) ?? null
  );
}

export function listPeriods(category: FanGrowthCategory): FanGrowthPeriodSummary[] {
  const periods = getDatasets()
    .filter((dataset) => dataset.category === category)
    .map((dataset) => ({
      category: dataset.category,
      periodId: dataset.periodId,
      periodLabel: dataset.periodLabel,
      uploadedAt: dataset.uploadedAt,
      recordCount: dataset.records.length,
    }));

  return sortPeriodSummaries(periods);
}

export function upsertResolvedDataset(dataset: FanGrowthDataset): FanGrowthDataset {
  const current = getDatasets();
  const filtered = current.filter(
    (item) =>
      !(item.category === dataset.category && item.periodId === dataset.periodId),
  );
  const nextDatasets = [...filtered, dataset].sort((left, right) =>
    right.uploadedAt.localeCompare(left.uploadedAt),
  );

  saveDatasets(nextDatasets);
  return dataset;
}

export function resolveAndUpsertDataset(
  uploadDataset: FanGrowthUploadDataset,
): FanGrowthDataset {
  const previousPeriodId = getPreviousPeriodId(
    uploadDataset.category,
    uploadDataset.periodId,
  );
  const previousDataset = previousPeriodId
    ? getDataset(uploadDataset.category, previousPeriodId)
    : null;
  const resolvedDataset = resolveUploadDataset(uploadDataset, previousDataset);
  return upsertResolvedDataset(resolvedDataset);
}
