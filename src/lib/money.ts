export function money(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toLocaleString("es-ES", { maximumFractionDigits: 2 })} M€`;
  if (abs >= 1_000) return `${sign}${Math.round(abs / 1_000).toLocaleString("es-ES")} mil €`;
  return `${sign}${abs} €`;
}
