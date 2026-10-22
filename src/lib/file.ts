const JSON_ENCODING_CANDIDATES = ["utf-8", "euc-kr", "windows-949"] as const;

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

function countSuspiciousStrings(value: unknown): number {
  if (typeof value === "string") {
    return isLikelyBrokenString(value) ? 1 : 0;
  }

  if (Array.isArray(value)) {
    return value.reduce((count, item) => count + countSuspiciousStrings(item), 0);
  }

  if (isObject(value)) {
    return Object.values(value).reduce<number>(
      (count, item) => count + countSuspiciousStrings(item),
      0,
    );
  }

  return 0;
}

function parseJsonWithEncoding(raw: Uint8Array, encoding: string) {
  const text = new TextDecoder(encoding).decode(raw).replace(/^\uFEFF/, "");
  const payload = JSON.parse(text) as unknown;

  return {
    payload,
    suspiciousStringCount: countSuspiciousStrings(payload),
  };
}

export async function readJsonFile(file: File): Promise<unknown> {
  const raw = new Uint8Array(await file.arrayBuffer());
  let bestResult: { payload: unknown; suspiciousStringCount: number } | null = null;
  let lastError: Error | null = null;

  for (const encoding of JSON_ENCODING_CANDIDATES) {
    try {
      const result = parseJsonWithEncoding(raw, encoding);

      if (
        !bestResult ||
        result.suspiciousStringCount < bestResult.suspiciousStringCount
      ) {
        bestResult = result;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Failed to parse JSON file.");
    }
  }

  if (bestResult) {
    return bestResult.payload;
  }

  throw lastError ?? new Error("Failed to parse JSON file.");
}
