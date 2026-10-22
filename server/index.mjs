import {
  getFanGrowthDataset,
  listFanGrowthDatasets,
  listFanGrowthPeriods,
  upsertMemberRegistry,
  upsertFanGrowthDataset,
} from "./lib/fan-growth.mjs";
import { requireAdminPassword } from "./lib/http.mjs";

const origins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function resolveOrigin(event) {
  const requestOrigin = event?.headers?.origin ?? event?.headers?.Origin ?? "";
  if (!requestOrigin) return origins[0] ?? null;
  return origins.includes(requestOrigin) ? requestOrigin : null;
}

function response(event, statusCode, payload) {
  const origin = resolveOrigin(event);
  return {
    statusCode,
    headers: {
      "access-control-allow-headers": "content-type,x-admin-password",
      "access-control-allow-methods": "GET,OPTIONS,POST",
      ...(origin ? { "access-control-allow-origin": origin } : {}),
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
      vary: "Origin",
    },
    body: JSON.stringify(payload),
  };
}

export async function handler(event) {
  const method = event?.requestContext?.http?.method ?? "GET";
  const path = (event?.rawPath ?? "/").replace(/^\/v1(?=\/|$)/, "");

  try {
    if (method === "OPTIONS") return response(event, 204, {});
    if (method === "GET" && path === "/health") {
      return response(event, 200, { success: true, data: { status: "ok" } });
    }
    if (method === "GET" && path === "/fan-growth/periods") {
      return response(event, 200, {
        success: true,
        data: await listFanGrowthPeriods(event.queryStringParameters?.category),
      });
    }
    if (method === "GET" && path === "/fan-growth/datasets") {
      return response(event, 200, {
        success: true,
        data: await listFanGrowthDatasets(event.queryStringParameters?.category),
      });
    }
    if (method === "GET" && path === "/fan-growth/dataset") {
      return response(event, 200, {
        success: true,
        data: await getFanGrowthDataset(
          event.queryStringParameters?.category,
          event.queryStringParameters?.period,
        ),
      });
    }
    if (method === "POST" && path === "/admin/session") {
      requireAdminPassword(event);
      return response(event, 200, { success: true, data: { authenticated: true } });
    }
    if (method === "POST" && path === "/admin/member-registry") {
      return response(event, 200, {
        success: true,
        data: await upsertMemberRegistry(event.body, event),
      });
    }
    if (method === "POST" && path === "/fan-growth/dataset") {
      return response(event, 200, {
        success: true,
        data: await upsertFanGrowthDataset(event.body, event),
      });
    }
    return response(event, 404, {
      success: false,
      error: { code: "NOT_FOUND", message: "No route matched." },
    });
  } catch (error) {
    const statusCode = typeof error?.statusCode === "number" ? error.statusCode : 500;
    const code = typeof error?.code === "string" ? error.code : "INTERNAL_ERROR";
    const requestId = event?.requestContext?.requestId ?? "unknown";
    console.error(JSON.stringify({
      event: "FanApiRequestFailed",
      requestId,
      method,
      path,
      statusCode,
      code,
      errorName: error?.name ?? "Error",
    }));
    return response(event, statusCode, {
      success: false,
      error: {
        code,
        message: statusCode >= 500 ? "The server could not process the request." : error?.message ?? "Request failed.",
        requestId,
      },
    });
  }
}
