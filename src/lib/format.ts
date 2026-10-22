export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return value.toLocaleString("ko-KR");
}

export function formatRate(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}%`;
}

export function formatSignedNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toLocaleString("ko-KR")}`;
}

export function formatDateTime(value: string): string {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}
