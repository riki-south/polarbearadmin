import type {
  ApiEnvelope,
  FanGrowthDatasetResponse,
  FanGrowthDatasetsResponse,
  FanGrowthDatasetUpsertRequest,
  FanGrowthPeriodsResponse,
} from "./apiTypes";
import { buildApiUrl, dataSourceMode, type DataSourceMode } from "./config";
import {
  getDataset as getLocalDataset,
  getDatasets as getLocalDatasets,
  resolveAndUpsertDataset as resolveAndUpsertLocalDataset,
} from "./storage";
import {
  getStaticDataset,
  getStaticDatasets,
} from "./staticData";
import type {
  FanGrowthDataset,
  FanGrowthPeriodSummary,
  FanGrowthUploadDataset,
} from "../features/fan-growth/fanGrowthTypes";
import type { FanGrowthCategory } from "./types";
import { getAdminPassword } from "./admin";
import {
  comparePeriodIdsAsc,
  sortPeriodSummaries,
} from "../features/fan-growth/fanGrowthUtils";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? {});

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;

  try {
    response = await fetch(buildApiUrl(path), {
      ...init,
      headers,
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("서버 연결에 실패했습니다.");
    }

    throw error;
  }

  let payload: ApiEnvelope<T> | null = null;

  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}.`);
    }

    throw new Error("서버 응답을 읽지 못했습니다.");
  }

  if (!response.ok) {
    const message =
      payload?.success === false
        ? payload.error.message
        : `Request failed with status ${response.status}.`;
    throw new Error(message);
  }

  if (payload.success === false) {
    throw new Error(payload.error.message);
  }

  return payload.data;
}

function withAdminPassword(init: RequestInit = {}): RequestInit {
  const password = getAdminPassword();
  if (!password) {
    throw new Error("관리자 로그인이 필요합니다.");
  }

  const headers = new Headers(init.headers ?? {});
  headers.set("x-admin-password", password);
  return { ...init, headers };
}

export type DataRepository = {
  mode: DataSourceMode;
  listDatasets: (category: FanGrowthCategory) => Promise<FanGrowthDataset[]>;
  listPeriods: (category: FanGrowthCategory) => Promise<FanGrowthPeriodSummary[]>;
  getDataset: (
    category: FanGrowthCategory,
    periodId: string,
  ) => Promise<FanGrowthDataset | null>;
  upsertDataset: (
    dataset: FanGrowthUploadDataset,
  ) => Promise<FanGrowthDataset>;
};

function buildLocalPeriodSummary(dataset: FanGrowthDataset): FanGrowthPeriodSummary {
  return {
    category: dataset.category,
    periodId: dataset.periodId,
    periodLabel: dataset.periodLabel,
    uploadedAt: dataset.uploadedAt,
    recordCount: dataset.records.length,
  };
}

async function getMergedLocalDatasets(): Promise<FanGrowthDataset[]> {
  const [staticDatasets, localDatasets] = await Promise.all([
    getStaticDatasets(),
    Promise.resolve(getLocalDatasets()),
  ]);
  const merged = new Map<string, FanGrowthDataset>();

  for (const dataset of staticDatasets) {
    merged.set(`${dataset.category}:${dataset.periodId}`, dataset);
  }

  for (const dataset of localDatasets) {
    merged.set(`${dataset.category}:${dataset.periodId}`, dataset);
  }

  return [...merged.values()];
}

async function listPeriods(
  category: FanGrowthCategory,
): Promise<FanGrowthPeriodSummary[]> {
  if (dataSourceMode === "local") {
    const datasets = await listDatasets(category);
    return sortPeriodSummaries(datasets.map(buildLocalPeriodSummary));
  }

  const data = await requestJson<FanGrowthPeriodsResponse>(
    `/fan-growth/periods?category=${encodeURIComponent(category)}`,
  );
  return data.periods;
}

async function listDatasets(
  category: FanGrowthCategory,
): Promise<FanGrowthDataset[]> {
  const datasets = dataSourceMode === "local"
    ? await getMergedLocalDatasets()
    : (
        await requestJson<FanGrowthDatasetsResponse>(
          `/fan-growth/datasets?category=${encodeURIComponent(category)}`,
        )
      ).datasets;

  return datasets
    .filter((dataset) => dataset.category === category)
    .sort((left, right) => comparePeriodIdsAsc(left.periodId, right.periodId));
}

async function getDataset(
  category: FanGrowthCategory,
  periodId: string,
): Promise<FanGrowthDataset | null> {
  if (dataSourceMode === "local") {
    const localDataset = getLocalDataset(category, periodId);
    if (localDataset) {
      return localDataset;
    }

    return getStaticDataset(category, periodId);
  }

  const data = await requestJson<FanGrowthDatasetResponse>(
    `/fan-growth/dataset?category=${encodeURIComponent(category)}&period=${encodeURIComponent(periodId)}`,
  );
  return data.dataset;
}

async function upsertDataset(
  dataset: FanGrowthUploadDataset,
): Promise<FanGrowthDataset> {
  if (dataSourceMode === "local") {
    return resolveAndUpsertLocalDataset(dataset);
  }

  const data = await requestJson<FanGrowthDatasetResponse>("/fan-growth/dataset", withAdminPassword({
    method: "POST",
    body: JSON.stringify(dataset satisfies FanGrowthDatasetUpsertRequest),
  }));

  if (!data.dataset) {
    throw new Error("업로드한 데이터를 다시 확인할 수 없습니다.");
  }

  return data.dataset;
}

export const dataRepository: DataRepository = {
  mode: dataSourceMode,
  listDatasets,
  listPeriods,
  getDataset,
  upsertDataset,
};
