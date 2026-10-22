import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const manifest = JSON.parse(
  readFileSync(join(projectRoot, "public/data/fan-growth.json"), "utf8"),
);
const registry = JSON.parse(
  readFileSync(join(projectRoot, "data-source/fan-growth/member-registry.json"), "utf8"),
);

function getDataset(category, periodId) {
  return manifest.datasets.find(
    (dataset) => dataset.category === category && dataset.periodId === periodId,
  );
}

test("every generated record has a group-scoped unique memberId", () => {
  assert.equal(manifest.datasetCount, manifest.datasets.length);

  for (const dataset of manifest.datasets) {
    const expectedPattern = dataset.category === "south-monthly" ? /^S\d{3,}$/ : /^N\d{3,}$/;
    const memberIds = dataset.records.map((record) => record.memberId);

    assert.equal(new Set(memberIds).size, memberIds.length, `${dataset.category} ${dataset.periodId}`);
    assert.ok(memberIds.every((memberId) => expectedPattern.test(memberId)));
    assert.ok(dataset.records.every((record) => !("id" in record)));
  }
});

test("every generated memberId exists in the canonical registry", () => {
  const registered = {
    south: new Set(registry.south.map((member) => member.memberId)),
    north: new Set(registry.north.map((member) => member.memberId)),
  };

  assert.equal(registered.south.size, registry.south.length);
  assert.equal(registered.north.size, registry.north.length);
  for (const dataset of manifest.datasets) {
    const group = dataset.category === "south-monthly" ? "south" : "north";
    assert.ok(
      dataset.records.every((record) => registered[group].has(record.memberId)),
      `${dataset.category} ${dataset.periodId}`,
    );
  }
});

test("July baseline order defines south and north memberIds", () => {
  const south = getDataset("south-monthly", "2026-07");
  const north = getDataset("north-monthly", "2026-07");

  assert.ok(south);
  assert.ok(north);
  assert.deepEqual(
    south.records.map((record) => record.memberId),
    Array.from({ length: 30 }, (_, index) => `S${String(index + 1).padStart(3, "0")}`),
  );
  assert.deepEqual(
    north.records.map((record) => record.memberId),
    Array.from({ length: 30 }, (_, index) => `N${String(index + 1).padStart(3, "0")}`),
  );
});

test("renamed members retain identity and previous fan continuity", () => {
  const may = getDataset("south-monthly", "2026-05");
  const june = getDataset("south-monthly", "2026-06");
  const mayRecord = may.records.find((record) => record.memberId === "S030");
  const juneRecord = june.records.find((record) => record.memberId === "S030");

  assert.equal(mayRecord.name, "츄휴");
  assert.equal(juneRecord.name, "츄츄");
  assert.equal(juneRecord.previousFans, mayRecord.currentFans);
});
