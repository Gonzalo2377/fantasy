export const TZ = "Europe/Madrid";
/** Hora local (Madrid) a la que se cierra y renueva el mercado cada día. */
export const MARKET_RESET_HOUR = 8;

function tzOffsetMs(at: Date, timeZone = TZ): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** Convierte una fecha/hora local de Madrid a timestamp (ms). */
export function madridToUtc(y: number, mo: number, d: number, h = 0, mi = 0): number {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const off = tzOffsetMs(new Date(guess));
  const t = guess - off;
  // Corrección si el cambio de horario cae entre medias.
  const off2 = tzOffsetMs(new Date(t));
  return guess - off2;
}

/** Siguiente instante (estrictamente posterior a `now`) en que en Madrid son las MARKET_RESET_HOUR:00. */
export function nextMarketReset(now: number = Date.now()): number {
  const local = new Date(now + tzOffsetMs(new Date(now)));
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth() + 1;
  const d = local.getUTCDate();
  let t = madridToUtc(y, m, d, MARKET_RESET_HOUR);
  if (t <= now) {
    const tomorrow = new Date(Date.UTC(y, m - 1, d + 1));
    t = madridToUtc(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth() + 1, tomorrow.getUTCDate(), MARKET_RESET_HOUR);
  }
  return t;
}

export function formatDateTime(ms: number): string {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(ms);
}

/** Para <input type="datetime-local"> en hora de Madrid. */
export function toLocalInput(ms: number): string {
  const local = new Date(ms + tzOffsetMs(new Date(ms)));
  return local.toISOString().slice(0, 16);
}

export function fromLocalInput(v: string): number {
  const [date, time] = v.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = (time ?? "00:00").split(":").map(Number);
  return madridToUtc(y, m, d, h, mi);
}
