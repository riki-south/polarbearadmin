export type DataSourceMode = "local" | "api";

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() ?? "";

export const apiBaseUrl = rawApiBaseUrl.replace(/\/+$/, "");
export const dataSourceMode: DataSourceMode = apiBaseUrl ? "api" : "local";

export function buildApiUrl(path: string): string {
  if (!apiBaseUrl) {
    throw new Error("VITE_API_BASE_URL is not configured.");
  }

  return `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
