import assert from "node:assert/strict";
import test from "node:test";
import {
  isPeriodIdValidForCategory,
  normalizeMemberId,
  parseNonNegativeInteger,
} from "../server/shared/fan-growth-validation.mjs";

test("monthly periods reject impossible months", () => {
  assert.equal(isPeriodIdValidForCategory("south-monthly", "2026-01"), true);
  assert.equal(isPeriodIdValidForCategory("north-monthly", "2026-12"), true);
  assert.equal(isPeriodIdValidForCategory("south-monthly", "2026-00"), false);
  assert.equal(isPeriodIdValidForCategory("south-monthly", "2026-13"), false);
});

test("weekly periods use two-digit valid ISO weeks", () => {
  assert.equal(isPeriodIdValidForCategory("north-weekly", "2026-W01"), true);
  assert.equal(isPeriodIdValidForCategory("north-weekly", "2026-W53"), true);
  assert.equal(isPeriodIdValidForCategory("north-weekly", "2026-W1"), false);
  assert.equal(isPeriodIdValidForCategory("north-weekly", "2026-W00"), false);
  assert.equal(isPeriodIdValidForCategory("north-weekly", "2026-W54"), false);
});

test("member IDs and fan counts use strict canonical forms", () => {
  assert.equal(normalizeMemberId(" s001 ", "south-monthly"), "S001");
  assert.equal(normalizeMemberId("N032", "north-weekly"), "N032");
  assert.equal(normalizeMemberId("S000", "south-monthly"), null);
  assert.equal(normalizeMemberId("N001", "south-monthly"), null);
  assert.equal(parseNonNegativeInteger("1,234"), 1234);
  assert.equal(parseNonNegativeInteger(1.5), undefined);
  assert.equal(parseNonNegativeInteger(-1), undefined);
});
