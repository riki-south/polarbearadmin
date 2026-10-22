import { timingSafeEqual } from "node:crypto";
import {
  isPeriodIdValidForCategory,
  normalizeFanGrowthCategory,
} from "../shared/fan-growth-validation.mjs";

export function badRequest(message) {
  const error = new Error(message);
  error.code = "VALIDATION_ERROR";
  error.statusCode = 400;
  return error;
}

export function parseJsonBody(bodyText) {
  if (!bodyText) {
    throw badRequest("Request body is required.");
  }

  try {
    return JSON.parse(bodyText);
  } catch {
    throw badRequest("Request body must be valid JSON.");
  }
}

export function requireMonth(month) {
  if (!isPeriodIdValidForCategory("south-monthly", month)) {
    throw badRequest("month must use YYYY-MM format.");
  }

  return month;
}

export function requireCategory(category) {
  const normalizedCategory = normalizeFanGrowthCategory(category);
  if (!normalizedCategory) {
    throw badRequest(
      "category must be south-monthly, north-weekly, or north-monthly.",
    );
  }

  return normalizedCategory;
}

export function requirePeriodId(periodId) {
  if (!periodId || typeof periodId !== "string" || periodId.trim() === "") {
    throw badRequest("period must be a non-empty string.");
  }

  return periodId.trim();
}

export function requireAdminPassword(event) {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  const supplied = event?.headers?.["x-admin-password"] ?? event?.headers?.["X-Admin-Password"] ?? "";
  const expectedBuffer = Buffer.from(expected, "utf8");
  const suppliedBuffer = Buffer.from(supplied, "utf8");

  if (
    expectedBuffer.length === 0 ||
    expectedBuffer.length !== suppliedBuffer.length ||
    !timingSafeEqual(expectedBuffer, suppliedBuffer)
  ) {
    const error = new Error("Administrator password is required.");
    error.code = "FORBIDDEN";
    error.statusCode = 403;
    throw error;
  }
}
