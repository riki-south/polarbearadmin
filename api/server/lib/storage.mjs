import { get, list, put } from "@vercel/blob";

const BLOB_ACCESS = "public";

function isMissingBlob(error) {
  return error?.name === "BlobNotFoundError" || error?.status === 404 || error?.statusCode === 404;
}

async function readText(objectKey) {
  const result = await get(objectKey, { access: BLOB_ACCESS, useCache: false });
  if (!result || result.statusCode !== 200 || !result.stream) {
    const error = new Error(`Blob not found: ${objectKey}`);
    error.name = "NoSuchKey";
    error.statusCode = 404;
    throw error;
  }
  return await new Response(result.stream).text();
}

export async function readJsonObject(objectKey) {
  try {
    return JSON.parse(await readText(objectKey));
  } catch (error) {
    if (isMissingBlob(error) || error?.name === "NoSuchKey") return null;
    throw error;
  }
}

export async function readTextObject(objectKey) {
  try {
    return await readText(objectKey);
  } catch (error) {
    if (isMissingBlob(error) || error?.name === "NoSuchKey") return null;
    throw error;
  }
}

export async function listCollectionKeys(prefix) {
  const keys = [];
  let cursor;
  let hasMore = true;

  while (hasMore) {
    const page = await list({ prefix, cursor, limit: 1000 });
    keys.push(...page.blobs.map((blob) => blob.pathname));
    hasMore = page.hasMore;
    cursor = page.cursor;
  }

  return keys;
}

export async function writeJsonObject(objectKey, payload) {
  await put(objectKey, JSON.stringify(payload, null, 2), {
    access: BLOB_ACCESS,
    contentType: "application/json; charset=utf-8",
    allowOverwrite: true,
    cacheControlMaxAge: 60,
  });
}

function normalizeCollectionPayload(payload, objectKey) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object" && Array.isArray(payload.records)) {
    return payload.records;
  }
  throw new Error(`The object at ${objectKey} does not contain a supported collection payload.`);
}

export async function readCollection(objectKey) {
  const payload = await readJsonObject(objectKey);
  if (payload === null) return [];
  return normalizeCollectionPayload(payload, objectKey);
}

export async function writeCollection(objectKey, records) {
  await writeJsonObject(objectKey, records);
}
