import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { put } from "@vercel/blob";

const projectRoot = resolve(import.meta.dirname, "..");
const publicDataRoot = resolve(
  process.argv[2] ?? resolve(projectRoot, "public", "data", "fan-growth"),
);
const registryPath = resolve(publicDataRoot, "member-registry.json");
const catalogPath = resolve(publicDataRoot, "catalog.json");
const monthlyCategories = new Set(["south-monthly", "north-monthly"]);

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

const registry = await readJson(registryPath);
const sourceCatalog = await readJson(catalogPath);
const datasets = (sourceCatalog.datasets ?? []).filter((dataset) => monthlyCategories.has(dataset.category));
const catalog = {
  generatedAt: new Date().toISOString(),
  datasetCount: datasets.length,
  periods: datasets.map(({ category, periodId, periodLabel, uploadedAt, records }) => ({
    category,
    periodId,
    periodLabel,
    uploadedAt,
    recordCount: records.length,
  })),
  datasets,
};

const uploads = [
  ["fan-growth/member-registry.json", registry],
  ["fan-growth/catalog.json", catalog],
  ...datasets.map((dataset) => [
    `fan-growth/${dataset.category}-${dataset.periodId}.json`,
    dataset,
  ]),
];

for (const [pathname, payload] of uploads) {
  await put(pathname, `${JSON.stringify(payload, null, 2)}\n`, {
    access: "public",
    contentType: "application/json; charset=utf-8",
    allowOverwrite: true,
    cacheControlMaxAge: 60,
  });
  console.log(`Uploaded ${pathname}`);
}

console.log(`Seeded ${datasets.length} monthly datasets and the member registry from ${publicDataRoot}.`);
