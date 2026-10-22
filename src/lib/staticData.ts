import type { FanGrowthDataset, FanGrowthPeriodSummary } from "../features/fan-growth/fanGrowthTypes";
import { sortPeriodSummaries } from "../features/fan-growth/fanGrowthUtils";
import type { FanGrowthCategory } from "./types";

type StaticCategory = FanGrowthCategory | "monthly" | "weekly";

type StaticFanGrowthManifest = {
  generatedAt: string;
  datasetCount: number;
  periods: Array<Omit<FanGrowthPeriodSummary, "category"> & { category: StaticCategory }>;
  datasets: Array<Omit<FanGrowthDataset, "category"> & { category: StaticCategory }>;
};

const STATIC_DATA_URL = "/data/fan-growth.json";

let manifestPromise: Promise<StaticFanGrowthManifest | null> | null = null;

async function loadStaticManifest(): Promise<StaticFanGrowthManifest | null> {
  if (typeof window === "undefined") {
    return null;
  }

  if (!manifestPromise) {
    manifestPromise = fetch(STATIC_DATA_URL)
      .then(async (response) => {
        if (!response.ok) {
          manifestPromise = null;
          return null;
        }

        return (await response.json()) as StaticFanGrowthManifest;
      })
      .catch((error) => {
        console.warn("Failed to load static fan growth data.", error);
        manifestPromise = null;
        return null;
      });
  }

  return manifestPromise;
}

export async function getStaticDatasets(): Promise<FanGrowthDataset[]> {
  const datasets = (await loadStaticManifest())?.datasets ?? [];

  return datasets.map((dataset) => ({
    ...dataset,
    category:
      dataset.category === "monthly"
        ? "south-monthly"
        : dataset.category === "weekly"
          ? "north-weekly"
          : dataset.category,
  }));
}

export async function listStaticPeriods(
  category: FanGrowthCategory,
): Promise<FanGrowthPeriodSummary[]> {
  const datasets = await getStaticDatasets();
  const periods = datasets
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

export async function getStaticDataset(
  category: FanGrowthCategory,
  periodId: string,
): Promise<FanGrowthDataset | null> {
  const datasets = await getStaticDatasets();
  return (
    datasets.find(
      (dataset) => dataset.category === category && dataset.periodId === periodId,
    ) ?? null
  );
}
