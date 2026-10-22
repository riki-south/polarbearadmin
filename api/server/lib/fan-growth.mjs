import {
  badRequest,
  parseJsonBody,
  requireAdminPassword,
  requireCategory,
  requirePeriodId,
} from "./http.mjs";
import { listCollectionKeys, readJsonObject, writeJsonObject } from "./storage.mjs";
import {
  buildFanGrowthDatasetObjectKey,
  getLegacyCategory,
  isFanGrowthDatasetObjectKey,
  isMonthlyCategory,
} from "./category-keys.mjs";
import {
  FAN_GROWTH_CATEGORIES,
  getExpectedMemberIdPrefix,
  isPeriodIdValidForCategory,
  normalizeMemberId,
  parseNonNegativeInteger,
} from "../shared/fan-growth-validation.mjs";

const FAN_GROWTH_PREFIX = process.env.FAN_GROWTH_PREFIX ?? "fan-growth/";
const FAN_GROWTH_SUFFIX = ".json";
const FAN_GROWTH_CATALOG_KEY = `${FAN_GROWTH_PREFIX}catalog.json`;
const FAN_GROWTH_REGISTRY_KEY = `${FAN_GROWTH_PREFIX}member-registry.json`;
const MONTHLY_PERIOD_PATTERN = /^(\d{4})-(\d{2})$/;
const WEEKLY_PERIOD_PATTERN = /^(\d{4})-W(\d{2})$/i;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

function requireCategoryPeriodId(category, periodId) {
  const normalizedPeriodId = requirePeriodId(periodId);

  if (!isPeriodIdValidForCategory(category, normalizedPeriodId)) {
    if (isMonthlyCategory(category)) {
    throw badRequest("Monthly periodId must use YYYY-MM format.");
    }
    throw badRequest("Weekly periodId must use YYYY-WNN format.");
  }

  return normalizedPeriodId;
}

export function buildDatasetObjectKey(category, periodId) {
  const normalizedCategory = requireCategory(category);
  const normalizedPeriodId = requireCategoryPeriodId(normalizedCategory, periodId);
  return buildFanGrowthDatasetObjectKey(
    FAN_GROWTH_PREFIX,
    normalizedCategory,
    normalizedPeriodId,
  );
}

function buildLegacyDatasetObjectKey(category, periodId) {
  const legacyCategory = getLegacyCategory(category);
  return legacyCategory
    ? `${FAN_GROWTH_PREFIX}${legacyCategory}-${requireCategoryPeriodId(category, periodId)}${FAN_GROWTH_SUFFIX}`
    : null;
}

export function isDatasetObjectKey(objectKey, category) {
  const normalizedCategory = requireCategory(category);
  return isFanGrowthDatasetObjectKey(
    FAN_GROWTH_PREFIX,
    objectKey,
    normalizedCategory,
  );
}

function isLikelyBrokenName(name) {
  return (
    String(name).includes("\uFFFD") ||
    /[\uF900-\uFAFF]/.test(String(name)) ||
    /\?{2,}/.test(String(name)) ||
    /\?[^\x00-\x7F]/.test(String(name)) ||
    /[^\x00-\x7F]\?/.test(String(name))
  );
}

function readRequiredString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw badRequest(`${label} is required.`);
  }

  return value.trim();
}

function readMemberId(value, category, label) {
  const memberId = normalizeMemberId(value, category);
  const expectedPrefix = getExpectedMemberIdPrefix(category);

  if (!memberId) {
    throw badRequest(`${label} must use the ${expectedPrefix}001 format.`);
  }

  return memberId;
}

function readOptionalNumber(value, label) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = parseNonNegativeInteger(value);
  if (parsed === undefined) {
    throw badRequest(`${label} must be a non-negative integer.`);
  }

  return parsed;
}

function normalizeStoredRecord(record, category, index) {
  if (!record || typeof record !== "object") {
    throw badRequest(`records[${index}] must be an object.`);
  }

  const previousFans = readOptionalNumber(record.previousFans, "previousFans");
  const currentFans = readOptionalNumber(record.currentFans, "currentFans");

  if (previousFans === undefined) {
    throw badRequest("previousFans is required.");
  }

  if (currentFans === undefined) {
    throw badRequest("currentFans is required.");
  }

  return {
    memberId: readMemberId(record.memberId ?? record.memberID, category, "memberId"),
    name: readRequiredString(record.name, "name"),
    previousFans,
    currentFans,
  };
}

function normalizeStoredDataset(payload, expectedCategory) {
  if (!payload || typeof payload !== "object") {
    throw badRequest("Stored dataset must be an object.");
  }

  const category = requireCategory(payload.category);
  if (expectedCategory && category !== requireCategory(expectedCategory)) {
    throw badRequest(
      `Stored dataset category ${category} does not match ${expectedCategory}.`,
    );
  }
  const periodId = requireCategoryPeriodId(category, payload.periodId);
  const periodLabel = readRequiredString(payload.periodLabel, "periodLabel");

  if (!Array.isArray(payload.records)) {
    throw badRequest("records must be an array.");
  }

  const records = payload.records.map((record, index) =>
    normalizeStoredRecord(record, category, index),
  );
  const seenMemberIds = new Set();

  for (const record of records) {
    if (seenMemberIds.has(record.memberId)) {
      throw badRequest(`Duplicate memberId found: ${record.memberId}`);
    }
    seenMemberIds.add(record.memberId);
  }

  return {
    category,
    periodId,
    periodLabel,
    uploadedAt:
      typeof payload.uploadedAt === "string" && payload.uploadedAt.trim() !== ""
        ? payload.uploadedAt.trim()
        : new Date().toISOString(),
    records,
  };
}

function getIsoWeekStartDate(year, week) {
  const januaryFourth = new Date(Date.UTC(year, 0, 4));
  const day = januaryFourth.getUTCDay() || 7;
  const weekOneMonday = new Date(januaryFourth.getTime() - (day - 1) * DAY_IN_MS);
  return new Date(weekOneMonday.getTime() + (week - 1) * 7 * DAY_IN_MS);
}

function getIsoWeekYearAndNumber(date) {
  const normalized = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = normalized.getUTCDay() || 7;
  normalized.setUTCDate(normalized.getUTCDate() + 4 - day);
  const year = normalized.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil((((normalized.getTime() - yearStart.getTime()) / DAY_IN_MS) + 1) / 7);
  return { year, week };
}

function getPreviousPeriodId(category, periodId) {
  const monthlyMatch = MONTHLY_PERIOD_PATTERN.exec(periodId);
  if (isMonthlyCategory(category) && monthlyMatch) {
    const year = Number(monthlyMatch[1]);
    const month = Number(monthlyMatch[2]);
    const previous = new Date(Date.UTC(year, month - 1, 1));
    previous.setUTCMonth(previous.getUTCMonth() - 1);
    return `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  const weeklyMatch = WEEKLY_PERIOD_PATTERN.exec(periodId);
  if (category === "north-weekly" && weeklyMatch) {
    const year = Number(weeklyMatch[1]);
    const week = Number(weeklyMatch[2]);
    const currentWeekStart = getIsoWeekStartDate(year, week);
    const previousWeekStart = new Date(currentWeekStart.getTime() - 7 * DAY_IN_MS);
    const previousWeek = getIsoWeekYearAndNumber(previousWeekStart);
    return `${previousWeek.year}-W${String(previousWeek.week).padStart(2, "0")}`;
  }

  return null;
}

function comparePeriodIdsDesc(left, right) {
  const leftMonthly = MONTHLY_PERIOD_PATTERN.exec(left);
  const rightMonthly = MONTHLY_PERIOD_PATTERN.exec(right);

  if (leftMonthly && rightMonthly) {
    const leftValue = Number(leftMonthly[1]) * 100 + Number(leftMonthly[2]);
    const rightValue = Number(rightMonthly[1]) * 100 + Number(rightMonthly[2]);
    return rightValue - leftValue;
  }

  const leftWeekly = WEEKLY_PERIOD_PATTERN.exec(left);
  const rightWeekly = WEEKLY_PERIOD_PATTERN.exec(right);

  if (leftWeekly && rightWeekly) {
    const leftValue = Number(leftWeekly[1]) * 100 + Number(leftWeekly[2]);
    const rightValue = Number(rightWeekly[1]) * 100 + Number(rightWeekly[2]);
    return rightValue - leftValue;
  }

  return right.localeCompare(left, "ko-KR");
}

function normalizeUploadRecord(record, category, index) {
  if (!record || typeof record !== "object") {
    throw badRequest(`records[${index}] must be an object.`);
  }

  const name = readRequiredString(record.name, "name");
  const memberId = readMemberId(
    record.memberId ?? record.memberID,
    category,
    "memberId",
  );
  if (isLikelyBrokenName(name)) {
    throw badRequest(`${name}: 닉네임 인코딩이 깨진 것으로 보입니다. JSON을 UTF-8로 다시 저장해 주세요.`);
  }

  const currentFans = readOptionalNumber(record.currentFans, "currentFans");
  if (currentFans === undefined) {
    throw badRequest("currentFans is required.");
  }

  return {
    memberId,
    name,
    previousFans: readOptionalNumber(record.previousFans, "previousFans"),
    currentFans,
  };
}

function normalizeUploadDataset(payload) {
  if (!payload || typeof payload !== "object") {
    throw badRequest("Upload dataset must be an object.");
  }

  const category = requireCategory(payload.category);
  const periodId = requireCategoryPeriodId(category, payload.periodId);
  const periodLabel = readRequiredString(payload.periodLabel, "periodLabel");

  if (!Array.isArray(payload.records)) {
    throw badRequest("records must be an array.");
  }

  const seenMemberIds = new Set();
  const records = payload.records.map((record, index) => {
    const normalizedRecord = normalizeUploadRecord(record, category, index);

    if (seenMemberIds.has(normalizedRecord.memberId)) {
      throw badRequest(`Duplicate memberId found: ${normalizedRecord.memberId}`);
    }

    seenMemberIds.add(normalizedRecord.memberId);
    return normalizedRecord;
  });

  return {
    category,
    periodId,
    periodLabel,
    uploadedAt: new Date().toISOString(),
    records,
  };
}

async function getRegisteredMemberIds(category) {
  const registry = await readJsonObject(FAN_GROWTH_REGISTRY_KEY);
  const group = category === "south-monthly" ? "south" : "north";
  const members = registry?.[group];

  if (!Array.isArray(members)) {
    throw new Error(`Member registry is missing the ${group} group.`);
  }

  const memberIds = new Set();
  for (const [index, member] of members.entries()) {
    const memberId = normalizeMemberId(member?.memberId, category);
    if (!memberId || typeof member?.name !== "string" || member.name.trim() === "") {
      throw new Error(`Member registry ${group}[${index}] is invalid.`);
    }
    if (memberIds.has(memberId)) {
      throw new Error(`Member registry contains duplicate memberId ${memberId}.`);
    }
    memberIds.add(memberId);
  }

  return memberIds;
}

async function validateRegisteredMembers(dataset) {
  const registeredMemberIds = await getRegisteredMemberIds(dataset.category);
  for (const record of dataset.records) {
    if (!registeredMemberIds.has(record.memberId)) {
      throw badRequest(
        `${record.memberId} is not registered. Update member-registry.json before uploading.`,
      );
    }
  }
}

async function getDatasetByCategoryAndPeriod(category, periodId) {
  const normalizedCategory = requireCategory(category);
  const normalizedPeriodId = requireCategoryPeriodId(normalizedCategory, periodId);
  const catalogDatasets = await getDatasetsFromCatalog(normalizedCategory);
  if (catalogDatasets !== null) {
    const catalogDataset = catalogDatasets.find(
      (dataset) => dataset.periodId === normalizedPeriodId,
    );
    if (catalogDataset) return catalogDataset;

    const explicitPayload = await readJsonObject(
      buildDatasetObjectKey(normalizedCategory, normalizedPeriodId),
    );
    return explicitPayload
      ? normalizeStoredDataset(explicitPayload, normalizedCategory)
      : null;
  }
  const candidateKeys = [
    buildDatasetObjectKey(normalizedCategory, normalizedPeriodId),
    buildLegacyDatasetObjectKey(normalizedCategory, normalizedPeriodId),
  ].filter(Boolean);

  for (const objectKey of candidateKeys) {
    const payload = await readJsonObject(objectKey);
    if (payload) {
      return normalizeStoredDataset(payload, normalizedCategory);
    }
  }

  return null;
}

async function resolveUploadDataset(uploadDataset) {
  const previousPeriodId = getPreviousPeriodId(uploadDataset.category, uploadDataset.periodId);
  const previousDataset = previousPeriodId
    ? await getDatasetByCategoryAndPeriod(uploadDataset.category, previousPeriodId)
    : null;
  const previousMap = new Map(
    (previousDataset?.records ?? []).map((record) => [record.memberId, record]),
  );

  return {
    category: uploadDataset.category,
    periodId: uploadDataset.periodId,
    periodLabel: uploadDataset.periodLabel,
    uploadedAt: uploadDataset.uploadedAt,
    records: uploadDataset.records.map((record) => ({
      memberId: record.memberId,
      name: record.name,
      previousFans:
        record.previousFans ??
        previousMap.get(record.memberId)?.currentFans ??
        0,
      currentFans: record.currentFans,
    })),
  };
}

function toSummary(dataset) {
  return {
    category: dataset.category,
    periodId: dataset.periodId,
    periodLabel: dataset.periodLabel,
    uploadedAt: dataset.uploadedAt,
    recordCount: dataset.records.length,
  };
}

function sortDatasets(datasets) {
  return datasets.sort((left, right) => {
    const periodOrder = comparePeriodIdsDesc(left.periodId, right.periodId);
    if (periodOrder !== 0) return periodOrder;
    return right.uploadedAt.localeCompare(left.uploadedAt);
  });
}

async function getDatasetsFromCatalog(category) {
  const catalog = await readJsonObject(FAN_GROWTH_CATALOG_KEY);
  if (catalog === null) return null;
  if (!Array.isArray(catalog.datasets)) {
    throw new Error("Fan-growth catalog does not contain a datasets array.");
  }

  return sortDatasets(
    catalog.datasets
      .filter((dataset) => dataset?.category === category)
      .map((dataset) => normalizeStoredDataset(dataset, category)),
  );
}

export function selectPreferredDatasetObjectKeys(category, objectKeys) {
  const normalizedCategory = requireCategory(category);
  const legacyCategory = getLegacyCategory(normalizedCategory);
  const explicitPrefix = `${FAN_GROWTH_PREFIX}${normalizedCategory}-`;
  const legacyPrefix = legacyCategory
    ? `${FAN_GROWTH_PREFIX}${legacyCategory}-`
    : null;
  const keysByPeriod = new Map();

  for (const objectKey of objectKeys) {
    if (!isDatasetObjectKey(objectKey, normalizedCategory)) continue;
    const matchingPrefix = objectKey.startsWith(explicitPrefix)
      ? explicitPrefix
      : legacyPrefix;
    if (!matchingPrefix) continue;
    const periodId = objectKey.slice(matchingPrefix.length, -FAN_GROWTH_SUFFIX.length);
    if (!isPeriodIdValidForCategory(normalizedCategory, periodId)) continue;

    const existing = keysByPeriod.get(periodId);
    if (!existing || matchingPrefix === explicitPrefix) {
      keysByPeriod.set(periodId, objectKey);
    }
  }

  return [...keysByPeriod.values()];
}

async function scanDatasetsByCategory(category) {
  const normalizedCategory = requireCategory(category);
  const legacyCategory = getLegacyCategory(normalizedCategory);
  const prefixes = [
    `${FAN_GROWTH_PREFIX}${normalizedCategory}-`,
    ...(legacyCategory ? [`${FAN_GROWTH_PREFIX}${legacyCategory}-`] : []),
  ];
  const objectKeys = selectPreferredDatasetObjectKeys(
    normalizedCategory,
    (await Promise.all(prefixes.map((prefix) => listCollectionKeys(prefix)))).flat(),
  );

  const datasets = await Promise.all(
    objectKeys.map(async (objectKey) => {
      const payload = await readJsonObject(objectKey);
      if (!payload) {
        throw badRequest(`Could not read dataset: ${objectKey}`);
      }

      return normalizeStoredDataset(payload, normalizedCategory);
    }),
  );
  return sortDatasets(datasets);
}

async function getDatasetsByCategory(category, { skipCatalog = false } = {}) {
  const normalizedCategory = requireCategory(category);
  if (!skipCatalog) {
    const catalogDatasets = await getDatasetsFromCatalog(normalizedCategory);
    if (catalogDatasets !== null) return catalogDatasets;
  }
  return await scanDatasetsByCategory(normalizedCategory);
}

async function updateCatalog(resolvedDataset) {
  const catalog = await readJsonObject(FAN_GROWTH_CATALOG_KEY);
  const existingDatasets = Array.isArray(catalog?.datasets)
    ? catalog.datasets.map((dataset) => normalizeStoredDataset(dataset))
    : (
        await Promise.all(
          FAN_GROWTH_CATEGORIES.map((category) =>
            getDatasetsByCategory(category, { skipCatalog: true }),
          ),
        )
      ).flat();
  const datasets = existingDatasets.filter(
    (dataset) =>
      dataset.category !== resolvedDataset.category ||
      dataset.periodId !== resolvedDataset.periodId,
  );
  datasets.push(resolvedDataset);
  datasets.sort((left, right) => {
    const categoryOrder = FAN_GROWTH_CATEGORIES.indexOf(left.category) -
      FAN_GROWTH_CATEGORIES.indexOf(right.category);
    return categoryOrder || comparePeriodIdsDesc(left.periodId, right.periodId);
  });

  await writeJsonObject(FAN_GROWTH_CATALOG_KEY, {
    generatedAt: new Date().toISOString(),
    datasetCount: datasets.length,
    periods: datasets.map(toSummary),
    datasets,
  });
}

export async function listFanGrowthDatasets(category) {
  return {
    datasets: await getDatasetsByCategory(category),
  };
}

export async function listFanGrowthPeriods(category) {
  const datasets = await getDatasetsByCategory(category);

  return {
    periods: datasets.map(toSummary),
  };
}

export async function getFanGrowthDataset(category, periodId) {
  const dataset = await getDatasetByCategoryAndPeriod(category, periodId);
  return {
    dataset,
  };
}

export async function upsertFanGrowthDataset(bodyText, event) {
  requireAdminPassword(event);
  const payload = parseJsonBody(bodyText);
  const uploadDataset = normalizeUploadDataset(payload);
  await validateRegisteredMembers(uploadDataset);
  const resolvedDataset = await resolveUploadDataset(uploadDataset);

  await writeJsonObject(
    buildDatasetObjectKey(resolvedDataset.category, resolvedDataset.periodId),
    resolvedDataset,
  );
  await updateCatalog(resolvedDataset);

  return {
    dataset: resolvedDataset,
  };
}
