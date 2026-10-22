import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  FAN_GROWTH_CATEGORIES,
  getExpectedMemberIdPrefix,
  isMonthlyCategory,
  isPeriodIdValidForCategory,
  normalizeMemberId,
  parseNonNegativeInteger,
} from "../server/shared/fan-growth-validation.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const sourceDir = path.join(projectRoot, "data-source", "fan-growth");
const outputDir = path.join(projectRoot, "public", "data");
const datasetsOutputDir = path.join(outputDir, "fan-growth");
const outputFile = path.join(outputDir, "fan-growth.json");
const registrySourceFile = path.join(sourceDir, "member-registry.json");
const catalogOutputFile = path.join(datasetsOutputDir, "catalog.json");
const registryOutputFile = path.join(datasetsOutputDir, "member-registry.json");
const SOURCE_ENCODING_CANDIDATES = ["utf-8", "euc-kr", "windows-949"];

const MONTHLY_PERIOD_PATTERN = /^\d{4}-\d{2}$/;
const WEEKLY_PERIOD_PATTERN = /^\d{4}-W\d{2}$/i;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

function isObject(value) {
  return typeof value === "object" && value !== null;
}

function isLikelyBrokenString(value) {
  return (
    value.includes("\uFFFD") ||
    /[\uF900-\uFAFF]/.test(value) ||
    /\?{2,}/.test(value) ||
    /\?[^\x00-\x7F]/.test(value) ||
    /[^\x00-\x7F]\?/.test(value)
  );
}

function countSuspiciousStrings(value) {
  if (typeof value === "string") {
    return isLikelyBrokenString(value) ? 1 : 0;
  }

  if (Array.isArray(value)) {
    return value.reduce((count, item) => count + countSuspiciousStrings(item), 0);
  }

  if (isObject(value)) {
    return Object.values(value).reduce(
      (count, item) => count + countSuspiciousStrings(item),
      0,
    );
  }

  return 0;
}

function readString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} is required.`);
  }

  return value.trim();
}

function readName(value, label) {
  if (typeof value !== "string") {
    throw new Error(`${label} is required.`);
  }

  const trimmed = value.trim();
  return trimmed === "" ? "_" : trimmed;
}

function readMemberId(value, category, label) {
  const memberId = normalizeMemberId(value, category);
  const expectedPrefix = getExpectedMemberIdPrefix(category);

  if (!memberId) {
    throw new Error(`${label} must use the ${expectedPrefix}001 format.`);
  }

  return memberId;
}

function readOptionalNumber(value, label) {
  const parsed = parseNonNegativeInteger(value);

  if (parsed === undefined && value !== undefined && value !== null && value !== "") {
    throw new Error(`${label} must be a non-negative safe integer.`);
  }

  return parsed;
}

function readRequiredNumber(value, label) {
  const parsed = readOptionalNumber(value, label);
  if (parsed === undefined) {
    throw new Error(`${label} is required.`);
  }

  return parsed;
}

function buildDefaultPeriodLabel(category, periodId) {
  if (isMonthlyCategory(category) && MONTHLY_PERIOD_PATTERN.test(periodId)) {
    const [year, month] = periodId.split("-");
    return `${year}\uB144 ${Number(month)}\uC6D4`;
  }

  if (category === "north-weekly" && WEEKLY_PERIOD_PATTERN.test(periodId)) {
    const [year, week] = periodId.split("-W");
    return `${year}\uB144 ${Number(week)}\uC8FC\uCC28`;
  }

  return periodId;
}

function comparePeriodIdsDesc(left, right) {
  if (MONTHLY_PERIOD_PATTERN.test(left) && MONTHLY_PERIOD_PATTERN.test(right)) {
    const [leftYear, leftMonth] = left.split("-").map(Number);
    const [rightYear, rightMonth] = right.split("-").map(Number);
    return rightYear * 100 + rightMonth - (leftYear * 100 + leftMonth);
  }

  if (WEEKLY_PERIOD_PATTERN.test(left) && WEEKLY_PERIOD_PATTERN.test(right)) {
    const [leftYear, leftWeek] = left.split("-W").map(Number);
    const [rightYear, rightWeek] = right.split("-W").map(Number);
    return rightYear * 100 + rightWeek - (leftYear * 100 + leftWeek);
  }

  return right.localeCompare(left, "ko-KR");
}

function comparePeriodIdsAsc(left, right) {
  return -comparePeriodIdsDesc(left, right);
}

function getIsoWeekStartDate(year, week) {
  const januaryFourth = new Date(Date.UTC(year, 0, 4));
  const day = januaryFourth.getUTCDay() || 7;
  const weekOneMonday = new Date(januaryFourth.getTime() - (day - 1) * DAY_IN_MS);
  return new Date(weekOneMonday.getTime() + (week - 1) * 7 * DAY_IN_MS);
}

function getIsoWeekYearAndNumber(date) {
  const normalized = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = normalized.getUTCDay() || 7;
  normalized.setUTCDate(normalized.getUTCDate() + 4 - day);
  const year = normalized.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((normalized.getTime() - yearStart.getTime()) / DAY_IN_MS + 1) / 7);
  return { year, week };
}

function getPreviousPeriodId(category, periodId) {
  if (isMonthlyCategory(category) && MONTHLY_PERIOD_PATTERN.test(periodId)) {
    const [year, month] = periodId.split("-").map(Number);
    const previous = new Date(Date.UTC(year, month - 1, 1));
    previous.setUTCMonth(previous.getUTCMonth() - 1);
    return `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  if (category === "north-weekly" && WEEKLY_PERIOD_PATTERN.test(periodId)) {
    const [year, week] = periodId.split("-W").map(Number);
    const currentWeekStart = getIsoWeekStartDate(year, week);
    const previousWeekStart = new Date(currentWeekStart.getTime() - 7 * DAY_IN_MS);
    const previousWeek = getIsoWeekYearAndNumber(previousWeekStart);
    return `${previousWeek.year}-W${String(previousWeek.week).padStart(2, "0")}`;
  }

  return null;
}

function normalizeRecord(record, category, index) {
  if (!isObject(record)) {
    throw new Error(`Record ${index + 1} must be an object.`);
  }

  const name = readName(record.name ?? record.nickname, `records[${index}].name`);
  const memberId = readMemberId(
    record.memberId ?? record.memberID,
    category,
    `records[${index}].memberId`,
  );
  const currentFans = readRequiredNumber(
    record.currentFans ?? record.currentFanCount ?? record.current ?? record.after,
    `${name}.currentFans`,
  );
  const previousFans = readOptionalNumber(
    record.previousFans ?? record.previousFanCount ?? record.previous ?? record.before,
    `${name}.previousFans`,
  );

  return {
    memberId,
    name,
    previousFans,
    currentFans,
  };
}

function normalizeUploadDataset(payload, category, fallbackPeriodId, uploadedAt) {
  if (!isObject(payload)) {
    throw new Error("The dataset file must contain a JSON object.");
  }

  const periodId = readString(
    payload.periodId ??
      payload.period ??
      (isMonthlyCategory(category) ? payload.month : payload.week) ??
      fallbackPeriodId,
    "periodId",
  );

  if (!isPeriodIdValidForCategory(category, periodId)) {
    throw new Error(
      isMonthlyCategory(category)
        ? `${category} periodId must be a real month in YYYY-MM format.`
        : "north-weekly periodId must be a real ISO week in YYYY-WNN format.",
    );
  }

  if (!Array.isArray(payload.records)) {
    throw new Error("records must be an array.");
  }

  const records = payload.records.map((record, index) =>
    normalizeRecord(record, category, index),
  );
  const duplicateMemberIds = new Set();

  for (const record of records) {
    if (duplicateMemberIds.has(record.memberId)) {
      throw new Error(`Duplicate memberId found: ${record.memberId}`);
    }
    duplicateMemberIds.add(record.memberId);
  }

  return {
    category,
    periodId,
    periodLabel:
      typeof payload.periodLabel === "string" && payload.periodLabel.trim() !== ""
        ? payload.periodLabel.trim()
        : buildDefaultPeriodLabel(category, periodId),
    uploadedAt,
    records,
  };
}

function resolveUploadDataset(uploadDataset, previousDataset) {
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
      name: record.name.trim(),
      previousFans:
        record.previousFans ?? previousMap.get(record.memberId)?.currentFans ?? 0,
      currentFans: record.currentFans,
    })),
  };
}

function buildPeriodSummary(dataset) {
  return {
    category: dataset.category,
    periodId: dataset.periodId,
    periodLabel: dataset.periodLabel,
    uploadedAt: dataset.uploadedAt,
    recordCount: dataset.records.length,
  };
}

function parseJsonWithEncoding(raw, encoding) {
  const decoded = new TextDecoder(encoding).decode(raw).replace(/^\uFEFF/, "");
  const payload = JSON.parse(decoded);

  return {
    payload,
    suspiciousStringCount: countSuspiciousStrings(payload),
  };
}

function decodeSourceJson(raw) {
  let bestResult = null;
  let lastError = null;

  for (const encoding of SOURCE_ENCODING_CANDIDATES) {
    try {
      const result = parseJsonWithEncoding(raw, encoding);

      if (
        !bestResult ||
        result.suspiciousStringCount < bestResult.suspiciousStringCount
      ) {
        bestResult = result;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Failed to parse source JSON.");
    }
  }

  if (bestResult) {
    return bestResult.payload;
  }

  throw lastError ?? new Error("Failed to parse source JSON.");
}

async function loadMemberRegistry() {
  const payload = decodeSourceJson(await readFile(registrySourceFile));
  if (!isObject(payload) || !Array.isArray(payload.south) || !Array.isArray(payload.north)) {
    throw new Error("member-registry.json must contain south and north arrays.");
  }

  const normalizeGroup = (records, category, label) => {
    const seenMemberIds = new Set();

    return records.map((record, index) => {
      if (!isObject(record)) {
        throw new Error(`${label}[${index}] must be an object.`);
      }

      const memberId = readMemberId(record.memberId, category, `${label}[${index}].memberId`);
      if (seenMemberIds.has(memberId)) {
        throw new Error(`Duplicate memberId in registry: ${memberId}`);
      }
      seenMemberIds.add(memberId);

      return {
        memberId,
        name: readName(record.name, `${label}[${index}].name`),
      };
    });
  };

  return {
    south: normalizeGroup(payload.south, "south-monthly", "south"),
    north: normalizeGroup(payload.north, "north-weekly", "north"),
  };
}

async function readSourceFiles() {
  try {
    const entries = await readdir(sourceDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".json"))
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right, "en"));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function loadUploadDataset(filename) {
  const filePath = path.join(sourceDir, filename);
  const category = filename.startsWith("south-monthly-") || filename.startsWith("monthly-")
    ? "south-monthly"
    : filename.startsWith("north-monthly-")
      ? "north-monthly"
      : filename.startsWith("north-weekly-") || /^weekly[-_]/i.test(filename)
        ? "north-weekly"
        : null;

  if (!category) {
    return null;
  }

  const fallbackPeriodId = filename
    .replace(/^(south-monthly|north-monthly|north-weekly|monthly|weekly)[-_]/i, "")
    .replace(/^fans[-_]/i, "")
    .replace(/\.json$/i, "")
    .replaceAll("_", "-");
  const [raw, fileInfo] = await Promise.all([readFile(filePath), stat(filePath)]);
  const payload = decodeSourceJson(raw);
  const uploadedAt =
    typeof payload?.uploadedAt === "string" && payload.uploadedAt.trim() !== ""
      ? payload.uploadedAt.trim()
      : fileInfo.mtime.toISOString();

  return normalizeUploadDataset(payload, category, fallbackPeriodId, uploadedAt);
}

async function buildManifest(memberRegistry) {
  const filenames = await readSourceFiles();
  const uploads = [];

  for (const filename of filenames) {
    const dataset = await loadUploadDataset(filename);
    if (dataset) {
      uploads.push(dataset);
    }
  }

  const resolvedDatasets = [];

  for (const category of FAN_GROWTH_CATEGORIES) {
    const categoryDatasets = uploads
      .filter((dataset) => dataset.category === category)
      .sort((left, right) => comparePeriodIdsAsc(left.periodId, right.periodId));

    const resolvedByPeriod = new Map();
    const sourcePeriods = new Set();
    const registeredMemberIds = new Set(
      (category === "south-monthly" ? memberRegistry.south : memberRegistry.north)
        .map((record) => record.memberId),
    );

    for (const uploadDataset of categoryDatasets) {
      if (sourcePeriods.has(uploadDataset.periodId)) {
        throw new Error(`Duplicate source period found: ${category} ${uploadDataset.periodId}`);
      }
      sourcePeriods.add(uploadDataset.periodId);

      for (const record of uploadDataset.records) {
        if (!registeredMemberIds.has(record.memberId)) {
          throw new Error(
            `${category} ${uploadDataset.periodId}: unregistered memberId ${record.memberId}`,
          );
        }
      }

      const previousPeriodId = getPreviousPeriodId(category, uploadDataset.periodId);
      const previousDataset = previousPeriodId
        ? resolvedByPeriod.get(previousPeriodId) ?? null
        : null;
      const resolvedDataset = resolveUploadDataset(uploadDataset, previousDataset);

      resolvedByPeriod.set(resolvedDataset.periodId, resolvedDataset);
    }

    resolvedDatasets.push(...resolvedByPeriod.values());
  }

  const datasets = resolvedDatasets.sort((left, right) => {
    if (left.category !== right.category) {
      return left.category.localeCompare(right.category, "en");
    }

    const periodOrder = comparePeriodIdsDesc(left.periodId, right.periodId);
    if (periodOrder !== 0) {
      return periodOrder;
    }

    return right.uploadedAt.localeCompare(left.uploadedAt);
  });

  return {
    generatedAt: new Date().toISOString(),
    datasetCount: datasets.length,
    periods: datasets.map(buildPeriodSummary),
    datasets,
  };
}

async function main() {
  const memberRegistry = await loadMemberRegistry();
  const manifest = await buildManifest(memberRegistry);
  await rm(datasetsOutputDir, { recursive: true, force: true });
  await Promise.all([
    mkdir(outputDir, { recursive: true }),
    mkdir(datasetsOutputDir, { recursive: true }),
  ]);
  await Promise.all([
    writeFile(outputFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8"),
    writeFile(catalogOutputFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8"),
    writeFile(registryOutputFile, `${JSON.stringify(memberRegistry, null, 2)}\n`, "utf8"),
    ...manifest.datasets.map((dataset) =>
      writeFile(
        path.join(datasetsOutputDir, `${dataset.category}-${dataset.periodId}.json`),
        `${JSON.stringify(dataset, null, 2)}\n`,
        "utf8",
      ),
    ),
  ]);
  console.log(
    `Generated ${path.relative(projectRoot, outputFile)} from ${path.relative(projectRoot, sourceDir)} (${manifest.datasetCount} datasets).`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
