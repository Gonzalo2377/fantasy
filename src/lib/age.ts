/** Edad mínima para participar en el juego (cumplimiento normativo). */
export const MIN_AGE = 18;

export function ageOn(birthDate: string, on: Date = new Date()): number {
  const [y, m, d] = birthDate.split("-").map(Number);
  let age = on.getUTCFullYear() - y;
  const beforeBirthday = on.getUTCMonth() + 1 < m || (on.getUTCMonth() + 1 === m && on.getUTCDate() < d);
  if (beforeBirthday) age--;
  return age;
}

export function isAdult(birthDate: string, on: Date = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return false;
  return ageOn(birthDate, on) >= MIN_AGE;
}

/** Fecha de nacimiento más reciente permitida hoy (YYYY-MM-DD), útil para filtrar en SQL. */
export function latestAllowedBirthDate(on: Date = new Date()): string {
  const y = on.getUTCFullYear() - MIN_AGE;
  const m = String(on.getUTCMonth() + 1).padStart(2, "0");
  const d = String(on.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
