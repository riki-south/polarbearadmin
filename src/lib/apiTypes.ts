import type {
  FanGrowthDataset,
  FanGrowthPeriodSummary,
  FanGrowthUploadDataset,
} from "../features/fan-growth/fanGrowthTypes";
import type { MemberRegistry } from "./memberRegistry";
export type ApiSuccessEnvelope<T> = {
  success: true;
  data: T;
};

export type ApiErrorEnvelope = {
  success: false;
  error: {
    code: string;
    message: string;
  };
};

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

export type FanGrowthPeriodsResponse = {
  periods: FanGrowthPeriodSummary[];
};

export type FanGrowthDatasetsResponse = {
  datasets: FanGrowthDataset[];
};

export type FanGrowthDatasetResponse = {
  dataset: FanGrowthDataset | null;
};

export type FanGrowthDatasetUpsertRequest = FanGrowthUploadDataset;

export type MemberRegistryResponse = {
  memberRegistry: MemberRegistry;
};
