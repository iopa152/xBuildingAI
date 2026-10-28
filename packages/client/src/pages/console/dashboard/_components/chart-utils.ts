export const CHART_COLORS = ["#5470c6", "#91cc75", "#fac858", "#ee6666", "#73c0de"];

export function formatMoney(value: number) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

export function formatDateLabel(value: string) {
  return typeof value === "string" ? value.slice(5) : String(value);
}
