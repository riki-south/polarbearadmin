import type { FanGrowthCategory } from "../../lib/types";

export type FanGrowthRecord = {
  memberId: string;
  name: string;
  previousFans: number;
  currentFans: number;
};

export type FanGrowthUploadRecord = {
  memberId: string;
  name: string;
  previousFans?: number;
  currentFans: number;
};

export type FanGrowthComputedRecord = FanGrowthRecord & {
  isNew: boolean;
  increase: number;
  increaseRate: number | null;
};

export type FanGrowthDataset = {
  category: FanGrowthCategory;
  periodId: string;
  periodLabel: string;
  uploadedAt: string;
  records: FanGrowthRecord[];
};

export type FanGrowthUploadDataset = {
  category: FanGrowthCategory;
  periodId: string;
  periodLabel: string;
  uploadedAt: string;
  records: FanGrowthUploadRecord[];
};

export type FanGrowthPeriodSummary = {
  category: FanGrowthCategory;
  periodId: string;
  periodLabel: string;
  uploadedAt: string;
  recordCount: number;
};

export type FanGrowthTrendPoint = {
  periodId: string;
  periodLabel: string;
  increase: number;
  averageIncrease?: number;
  currentFans: number;
  previousFans: number;
};
