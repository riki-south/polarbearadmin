import type { FanGrowthCategory } from "../../lib/types";
import { getMemberRegistry, type MemberRegistry } from "../../lib/memberRegistry";
import {
  getExpectedMemberIdPrefix,
  isMonthlyCategory as isSharedMonthlyCategory,
  isPeriodIdValidForCategory,
  normalizeMemberId,
  parseNonNegativeInteger,
} from "../../../api/server/shared/fan-growth-validation.mjs";
import type {
  FanGrowthComputedRecord,
  FanGrowthDataset,
  FanGrowthPeriodSummary,
  FanGrowthRecord,
  FanGrowthTrendPoint,
  FanGrowthUploadDataset,
  FanGrowthUploadRecord,
} from "./fanGrowthTypes";

const MONTHLY_PERIOD_PATTERN = /^(\d{4})-(\d{2})$/;
const WEEKLY_PERIOD_PATTERN = /^(\d{4})-W(\d{2})$/i;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
export const FAN_GROWTH_CATEGORIES: FanGrowthCategory[] = [
  "south-monthly",
  "north-monthly",
];

export function isMonthlyCategory(category: FanGrowthCategory): boolean {
  return isSharedMonthlyCategory(category);
}

export function isNorthCategory(category: FanGrowthCategory): boolean {
  return category === "north-weekly" || category === "north-monthly";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isLikelyBrokenString(value: string): boolean {
  return (
    value.includes("\uFFFD") ||
    /[\uF900-\uFAFF]/.test(value) ||
    /\?{2,}/.test(value) ||
    /\?[^\x00-\x7F]/.test(value) ||
    /[^\x00-\x7F]\?/.test(value)
  );
}

function readString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} 값이 필요합니다.`);
  }

  return value.trim();
}

function readName(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`${label} 값이 필요합니다.`);
  }

  const trimmed = value.trim();
  return trimmed === "" ? "_" : trimmed;
}

export function normalizeUploadedMemberRegistry(payload: unknown): MemberRegistry {
  if (!isObject(payload) || !Array.isArray(payload.south) || !Array.isArray(payload.north)) {
    throw new Error("JSON에 south와 north 배열이 필요합니다.");
  }

  const normalizeGroup = (
    records: unknown[],
    category: FanGrowthCategory,
    groupName: "south" | "north",
  ) => {
    const seenMemberIds = new Set<string>();
    return records.map((record, index) => {
      if (!isObject(record)) {
        throw new Error(`${groupName}[${index}] 항목은 객체여야 합니다.`);
      }

      const memberId = normalizeMemberId(record.memberId, category);
      if (!memberId) {
        throw new Error(`${groupName}[${index}].memberId 형식이 올바르지 않습니다.`);
      }
      if (seenMemberIds.has(memberId)) {
        throw new Error(`${groupName}에 중복된 memberId가 있습니다: ${memberId}`);
      }
      seenMemberIds.add(memberId);

      const name = readName(record.name, `${groupName}[${index}].name`);
      if (isLikelyBrokenString(name)) {
        throw new Error(`${groupName}[${index}].name의 문자 인코딩을 확인해 주세요.`);
      }

      return { memberId, name };
    });
  };

  const registry: MemberRegistry = {
    south: normalizeGroup(payload.south, "south-monthly", "south"),
    north: normalizeGroup(payload.north, "north-monthly", "north"),
  };
  const currentRegistry = getMemberRegistry();

  for (const groupName of ["south", "north"] as const) {
    const nextIds = new Set(registry[groupName].map((member) => member.memberId));
    const removedIds = currentRegistry[groupName]
      .map((member) => member.memberId)
      .filter((memberId) => !nextIds.has(memberId));
    if (removedIds.length > 0) {
      throw new Error(
        `기존 ${groupName} memberId는 삭제할 수 없습니다: ${removedIds.join(", ")}. 기존 ID를 유지한 전체 레지스트리를 선택해 주세요.`,
      );
    }
  }

  return registry;
}

function readOptionalNumber(value: unknown, label: string): number | undefined {
  const parsed = parseNonNegativeInteger(value);

  if (parsed === undefined && value !== undefined && value !== null && value !== "") {
    throw new Error(`${label}는 0 이상의 안전한 정수여야 합니다.`);
  }

  return parsed;
}

function readRequiredNumber(value: unknown, label: string): number {
  const parsed = readOptionalNumber(value, label);
  if (parsed === undefined) {
    throw new Error(`${label} 값이 필요합니다.`);
  }

  return parsed;
}

function readMemberId(
  value: unknown,
  category: FanGrowthCategory,
  label: string,
): string {
  const memberId = normalizeMemberId(value, category);
  const expectedPrefix = getExpectedMemberIdPrefix(category);

  if (!memberId) {
    throw new Error(`${label}는 ${expectedPrefix}001 형식이어야 합니다.`);
  }

  return memberId;
}

function isLikelyBrokenName(name: string): boolean {
  return (
    name.includes("\uFFFD") ||
    /[\uF900-\uFAFF]/.test(name) ||
    /\?{2,}/.test(name) ||
    /\?[^\x00-\x7F]/.test(name) ||
    /[^\x00-\x7F]\?/.test(name)
  );
}

function normalizeUploadRecord(
  value: unknown,
  category: FanGrowthCategory,
  index: number,
): FanGrowthUploadRecord {
  if (!isObject(value)) {
    throw new Error(`${index + 1}번째 항목이 객체 형식이 아닙니다.`);
  }

  const name = readName(value.name ?? value.nickname, `${index + 1}번째 이름`);
  const memberId = readMemberId(
    value.memberId ?? value.memberID,
    category,
    `${index + 1}번째 memberId`,
  );
  if (isLikelyBrokenName(name)) {
    throw new Error(`${name}: 닉네임 인코딩이 깨진 것으로 보입니다. JSON을 UTF-8로 다시 저장해 주세요.`);
  }

  const currentFans = readRequiredNumber(
    value.currentFans ?? value.currentFanCount ?? value.current ?? value.after,
    `${name}의 이번 팬 수`,
  );
  const previousFans = readOptionalNumber(
    value.previousFans ?? value.previousFanCount ?? value.previous ?? value.before,
    `${name}의 직전 팬 수`,
  );

  return {
    memberId,
    name,
    previousFans,
    currentFans,
  };
}

export function comparePeriodIdsDesc(left: string, right: string): number {
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

export function comparePeriodIdsAsc(left: string, right: string): number {
  return -comparePeriodIdsDesc(left, right);
}

function getIsoWeekStartDate(year: number, week: number): Date {
  const januaryFourth = new Date(Date.UTC(year, 0, 4));
  const day = januaryFourth.getUTCDay() || 7;
  const weekOneMonday = new Date(januaryFourth.getTime() - (day - 1) * DAY_IN_MS);
  return new Date(weekOneMonday.getTime() + (week - 1) * 7 * DAY_IN_MS);
}

function getIsoWeekYearAndNumber(date: Date): { year: number; week: number } {
  const normalized = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = normalized.getUTCDay() || 7;
  normalized.setUTCDate(normalized.getUTCDate() + 4 - day);
  const year = normalized.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil((((normalized.getTime() - yearStart.getTime()) / DAY_IN_MS) + 1) / 7);
  return { year, week };
}

export function buildDefaultPeriodLabel(
  category: FanGrowthCategory,
  periodId: string,
): string {
  const monthlyMatch = MONTHLY_PERIOD_PATTERN.exec(periodId);
  if (isMonthlyCategory(category) && monthlyMatch) {
    return `${monthlyMatch[1]}년 ${Number(monthlyMatch[2])}월`;
  }

  const weeklyMatch = WEEKLY_PERIOD_PATTERN.exec(periodId);
  if (category === "north-weekly" && weeklyMatch) {
    return `${weeklyMatch[1]}년 ${Number(weeklyMatch[2])}주차`;
  }

  return periodId;
}

export function getPreviousPeriodId(
  category: FanGrowthCategory,
  periodId: string,
): string | null {
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

export function normalizeUploadedDataset(
  payload: unknown,
  category: FanGrowthCategory,
): FanGrowthUploadDataset {
  if (!isObject(payload)) {
    throw new Error("JSON 최상위 형식은 객체여야 합니다.");
  }

  const periodId = readString(
    payload.periodId ??
      payload.period ??
      (isMonthlyCategory(category) ? payload.month : payload.week),
    "periodId",
  );

  if (!isPeriodIdValidForCategory(category, periodId)) {
    throw new Error(
      isMonthlyCategory(category)
        ? "월간 데이터의 periodId는 실제 월을 나타내는 YYYY-MM 형식이어야 합니다."
        : "주간 데이터의 periodId는 실제 ISO 주차를 나타내는 YYYY-WNN 형식이어야 합니다.",
    );
  }

  if (typeof payload.category === "string") {
    const payloadCategory = payload.category.trim();
    const compatible =
      payloadCategory === category ||
      (payloadCategory === "monthly" && isMonthlyCategory(category)) ||
      (payloadCategory === "weekly" && category === "north-weekly");

    if (!compatible) {
      throw new Error("선택한 팬 그룹과 JSON의 category가 일치하지 않습니다.");
    }
  }

  if (!Array.isArray(payload.records)) {
    throw new Error("records 배열이 필요합니다.");
  }

  const records = payload.records.map((record, index) =>
    normalizeUploadRecord(record, category, index),
  );
  const duplicateMemberIds = new Set<string>();
  const registryGroup = category === "south-monthly" ? "south" : "north";
  const registeredMemberIds = new Set(
    getMemberRegistry()[registryGroup].map((member) => member.memberId),
  );

  for (const record of records) {
    if (duplicateMemberIds.has(record.memberId)) {
      throw new Error(`중복된 memberId가 있습니다: ${record.memberId}`);
    }
    duplicateMemberIds.add(record.memberId);

    if (!registeredMemberIds.has(record.memberId)) {
      throw new Error(
        `등록되지 않은 memberId입니다: ${record.memberId}. member-registry.json을 먼저 갱신해 주세요.`,
      );
    }
  }

  return {
    category,
    periodId,
    periodLabel:
      typeof payload.periodLabel === "string" && payload.periodLabel.trim() !== ""
        ? payload.periodLabel.trim()
        : buildDefaultPeriodLabel(category, periodId),
    uploadedAt: new Date().toISOString(),
    records,
  };
}

export function resolveUploadDataset(
  uploadDataset: FanGrowthUploadDataset,
  previousDataset: FanGrowthDataset | null,
): FanGrowthDataset {
  const previousMap = new Map<string, FanGrowthRecord>(
    (previousDataset?.records ?? []).map((record) => [record.memberId, record]),
  );

  const records = uploadDataset.records.map((record) => {
    const fallbackPreviousFans = previousMap.get(record.memberId)?.currentFans ?? 0;

    return {
      memberId: record.memberId,
      name: record.name.trim(),
      previousFans: record.previousFans ?? fallbackPreviousFans,
      currentFans: record.currentFans,
    };
  });

  return {
    category: uploadDataset.category,
    periodId: uploadDataset.periodId,
    periodLabel: uploadDataset.periodLabel,
    uploadedAt: uploadDataset.uploadedAt,
    records,
  };
}

export function buildComputedRecords(records: FanGrowthRecord[]): FanGrowthComputedRecord[] {
  return [...records]
    .map((record) => {
      const increase = record.currentFans - record.previousFans;
      const isNew = record.previousFans === 0;

      return {
        ...record,
        isNew,
        increase,
        increaseRate: isNew ? null : (increase / record.previousFans) * 100,
      };
    })
    .sort((left, right) => {
      if (left.isNew !== right.isNew) {
        return left.isNew ? 1 : -1;
      }
      if (right.increase !== left.increase) return right.increase - left.increase;
      if (right.currentFans !== left.currentFans) return right.currentFans - left.currentFans;
      return left.name.localeCompare(right.name, "ko-KR");
    });
}

export function sortPeriodSummaries(
  periods: FanGrowthPeriodSummary[],
): FanGrowthPeriodSummary[] {
  return [...periods].sort((left, right) => {
    const periodOrder = comparePeriodIdsDesc(left.periodId, right.periodId);
    if (periodOrder !== 0) return periodOrder;
    return right.uploadedAt.localeCompare(left.uploadedAt);
  });
}

export function getCategoryTitle(category: FanGrowthCategory): string {
  if (category === "south-monthly") return "월간 남극곰";
  if (category === "north-monthly") return "월간 북극곰";
  return "주간 북극곰";
}

export function getCategoryUnit(category: FanGrowthCategory): string {
  return isMonthlyCategory(category) ? "달" : "주";
}

export function buildTrendPoints(
  memberId: string,
  datasets: FanGrowthDataset[],
  selectedPeriodId?: string,
): FanGrowthTrendPoint[] {
  const ordered = [...datasets].sort((left, right) => comparePeriodIdsAsc(left.periodId, right.periodId));
  const selectedIndex = selectedPeriodId
    ? ordered.findIndex((dataset) => dataset.periodId === selectedPeriodId)
    : ordered.length - 1;
  if (selectedIndex < 0) return [];

  return ordered
    .slice(Math.max(0, selectedIndex - 6), selectedIndex + 1)
    .flatMap((dataset) => {
      const record = dataset.records.find((item) => item.memberId === memberId);

      if (!record) return [];

      return [
        {
          periodId: dataset.periodId,
          periodLabel: dataset.periodLabel,
          previousFans: record.previousFans,
          currentFans: record.currentFans,
          increase: record.currentFans - record.previousFans,
          averageIncrease:
            dataset.records.length === 0
              ? 0
              : dataset.records.reduce(
                  (sum, item) => sum + item.currentFans - item.previousFans,
                  0,
                ) / dataset.records.length,
        },
      ];
    });
}
