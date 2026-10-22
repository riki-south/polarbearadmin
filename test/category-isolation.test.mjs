import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFanGrowthDatasetObjectKey,
  isFanGrowthDatasetObjectKey,
} from "../server/lib/category-keys.mjs";
import { requireCategory } from "../server/lib/http.mjs";
import { selectPreferredDatasetObjectKeys } from "../server/lib/fan-growth.mjs";

const PREFIX = "fan-growth/";
const buildDatasetObjectKey = (category, periodId) =>
  buildFanGrowthDatasetObjectKey(PREFIX, category, periodId);
const isDatasetObjectKey = (objectKey, category) =>
  isFanGrowthDatasetObjectKey(PREFIX, objectKey, category);

test("fan groups use isolated storage keys", () => {
  const south = buildDatasetObjectKey("south-monthly", "2026-07");
  const northWeekly = buildDatasetObjectKey("north-weekly", "2026-W27");
  const northMonthly = buildDatasetObjectKey("north-monthly", "2026-07");

  assert.equal(south, "fan-growth/south-monthly-2026-07.json");
  assert.equal(northWeekly, "fan-growth/north-weekly-2026-W27.json");
  assert.equal(northMonthly, "fan-growth/north-monthly-2026-07.json");
  assert.equal(new Set([south, northWeekly, northMonthly]).size, 3);

  assert.equal(isDatasetObjectKey(south, "south-monthly"), true);
  assert.equal(isDatasetObjectKey(south, "north-monthly"), false);
  assert.equal(isDatasetObjectKey(northMonthly, "south-monthly"), false);
  assert.equal(isDatasetObjectKey(northWeekly, "north-weekly"), true);
});

test("legacy categories migrate to one explicit group only", () => {
  assert.equal(requireCategory("monthly"), "south-monthly");
  assert.equal(requireCategory("weekly"), "north-weekly");
  assert.equal(
    isDatasetObjectKey("fan-growth/monthly-2026-07.json", "south-monthly"),
    true,
  );
  assert.equal(
    isDatasetObjectKey("fan-growth/monthly-2026-07.json", "north-monthly"),
    false,
  );
  assert.equal(
    isDatasetObjectKey("fan-growth/weekly-2026-W27.json", "north-weekly"),
    true,
  );
});

test("period formats cannot cross monthly and weekly groups", () => {
  assert.throws(
    () => buildDatasetObjectKey("north-weekly", "2026-07"),
    /YYYY-WNN/,
  );
  assert.throws(
    () => buildDatasetObjectKey("north-monthly", "2026-W27"),
    /YYYY-MM/,
  );
});

test("an explicit dataset key wins over its legacy key before files are read", () => {
  assert.deepEqual(
    selectPreferredDatasetObjectKeys("south-monthly", [
      "fan-growth/monthly-2026-07.json",
      "fan-growth/south-monthly-2026-07.json",
      "fan-growth/monthly-2026-13.json",
    ]),
    ["fan-growth/south-monthly-2026-07.json"],
  );
});
