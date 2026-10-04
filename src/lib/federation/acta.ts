import { bestMatch } from "./names";

export interface ParsedActaPlayer {
  name: string;
  starter: boolean;
  minutes: number;
  goals: number;
  ownGoals: number;
  yellow: number;
  red: boolean;
}

export interface ParsedActa {
  goalsFor: number | null;
  goalsAgainst: number | null;
  players: ParsedActaPlayer[];
  warnings: string[];
}

const SECTION = {
  starters: /^(titulars|titulares|alineaci[oó]n|once inicial)$/i,
  subs: /^(suplents|suplentes|reservas)$/i,
  goals: /^(gols|goles)$/i,
  cards: /^(targetes|tarjetas|amonestacions|amonestaciones)$/i,
  changes: /^(substitucions|sustituciones|canvis|cambios)$/i,
  other: /^(equip t[eè]cnic|cuerpo t[eé]cnico|[aà]rbitres?|árbitros|observacions|observaciones|incid[eè]ncies)/i,
};

/**
 * Parser tolerante de actas (texto plano extraído de la web de la federación).
 * Trabaja por secciones; solo se queda con los jugadores que encajan en la plantilla del club.
 *
 * Formatos que reconoce por línea:
 *   Titulares/suplentes:  "7 GARCIA LOPEZ, JOAN"
 *   Goles:                "23' GARCIA LOPEZ, JOAN"  (añade "(p.p.)" o "pròpia" para gol en propia)
 *   Tarjetas:             "45' GARCIA LOPEZ, JOAN  Groga|Amarilla|Vermella|Roja|Doble groga"
 *   Cambios:              "60' Entra GARCIA, JOAN  Surt PEREZ, MARC"  (o "Entra: ... Sale: ...")
 */
export function parseActaText(
  text: string,
  roster: { id: number; name: string; actaName?: string | null }[],
  matchMinutes = 90,
): ParsedActa {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const warnings: string[] = [];
  const players = new Map<number, ParsedActaPlayer & { on: number; off: number | null }>();
  const ensure = (raw: string, starter: boolean) => {
    const p = bestMatch(raw, roster);
    if (!p) return null;
    if (!players.has(p.id))
      players.set(p.id, {
        name: p.name, starter, minutes: 0, goals: 0, ownGoals: 0, yellow: 0, red: false,
        on: starter ? 0 : -1, off: null,
      });
    return players.get(p.id)!;
  };
  const minuteOf = (l: string) => {
    const m = l.match(/(\d{1,3})\s*(?:\+\s*\d+)?\s*['’´]/);
    return m ? Number(m[1]) : null;
  };
  const stripMinute = (l: string) => l.replace(/^\s*\d{1,3}\s*(?:\+\s*\d+)?\s*['’´]?\s*/, "");

  let goalsFor: number | null = null;
  let goalsAgainst: number | null = null;
  const score = text.match(/(\d{1,2})\s*[-–]\s*(\d{1,2})/);
  if (score) {
    goalsFor = Number(score[1]);
    goalsAgainst = Number(score[2]);
    warnings.push("Marcador detectado como local-visitante: revisa si el club jugaba fuera.");
  }

  let section: keyof typeof SECTION | null = null;
  for (const line of lines) {
    const header = (Object.keys(SECTION) as (keyof typeof SECTION)[]).find((k) => SECTION[k].test(line));
    if (header) {
      section = header;
      continue;
    }
    if (!section || section === "other") continue;

    if (section === "starters" || section === "subs") {
      ensure(line.replace(/^\d{1,2}\s+/, ""), section === "starters");
    } else if (section === "goals") {
      const own = /\b(p\.?\s?p\.?|pr[oò]pia|propia)\b/i.test(line);
      const p = ensure(stripMinute(line).replace(/\(.*?\)/g, ""), false);
      if (p) {
        if (own) p.ownGoals++;
        else p.goals++;
      }
    } else if (section === "cards") {
      const isRed = /(vermella|roja|doble)/i.test(line);
      const name = stripMinute(line).replace(/(doble\s+)?(groga|amarilla|vermella|roja)/gi, "");
      const p = ensure(name, false);
      if (!p) continue;
      if (isRed) {
        p.red = true;
        const min = minuteOf(line);
        if (min != null) p.off = min;
      } else p.yellow++;
    } else if (section === "changes") {
      const min = minuteOf(line) ?? 0;
      const m = stripMinute(line).match(/entra:?\s*(.+?)\s*(?:surt|sale):?\s*(.+)$/i);
      if (!m) {
        warnings.push(`Cambio no reconocido: "${line}"`);
        continue;
      }
      const inn = ensure(m[1], false);
      const out = ensure(m[2], false);
      if (inn) inn.on = min;
      if (out) out.off = min;
    }
  }

  const result: ParsedActaPlayer[] = [];
  for (const p of players.values()) {
    const on = p.on;
    const minutes = on < 0 ? 0 : Math.max(0, (p.off ?? matchMinutes) - on);
    const { on: _on, off: _off, ...rest } = p;
    void _on;
    void _off;
    result.push({ ...rest, minutes: minutes || (on >= 0 ? 1 : 0) });
  }
  if (!result.length) warnings.push("No se ha reconocido ningún jugador de la plantilla en el acta.");
  return { goalsFor, goalsAgainst, players: result, warnings };
}

/** Descarga una acta y la convierte a texto plano con saltos de línea por bloque. */
export async function fetchActaText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 FantasyEuropa/1.0" }, cache: "no-store" });
  if (!res.ok) throw new Error(`La federación respondió ${res.status}`);
  const html = await res.text();
  const { load } = await import("cheerio");
  const $ = load(html);
  $("script,style,noscript").remove();
  $("br,p,div,tr,li,h1,h2,h3,h4,h5,h6,td,th").each((_, el) => {
    $(el).append("\n");
  });
  return $("body").text();
}
