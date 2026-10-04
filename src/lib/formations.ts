import type { Position } from "@/db/schema";

export const FORMATIONS: Record<string, Record<Position, number>> = {
  "4-4-2": { POR: 1, DEF: 4, MED: 4, DEL: 2 },
  "4-3-3": { POR: 1, DEF: 4, MED: 3, DEL: 3 },
  "3-5-2": { POR: 1, DEF: 3, MED: 5, DEL: 2 },
  "3-4-3": { POR: 1, DEF: 3, MED: 4, DEL: 3 },
  "4-5-1": { POR: 1, DEF: 4, MED: 5, DEL: 1 },
  "5-3-2": { POR: 1, DEF: 5, MED: 3, DEL: 2 },
  "5-4-1": { POR: 1, DEF: 5, MED: 4, DEL: 1 },
};

export const POSITIONS: Position[] = ["POR", "DEF", "MED", "DEL"];

export const POSITION_LABEL: Record<Position, string> = {
  POR: "Portero/a",
  DEF: "Defensa",
  MED: "Centrocampista",
  DEL: "Delantero/a",
};

/** Plantilla por defecto al entrar en una liga. */
export const STARTING_SQUAD: Record<Position, number> = { POR: 1, DEF: 4, MED: 4, DEL: 2 };
export const MAX_SQUAD = 18;

export function validateLineup(
  formation: string,
  starters: { id: number; position: Position }[],
): string | null {
  const shape = FORMATIONS[formation];
  if (!shape) return "Formación no válida";
  if (new Set(starters.map((s) => s.id)).size !== starters.length) return "Jugador repetido";
  for (const pos of POSITIONS) {
    const n = starters.filter((s) => s.position === pos).length;
    if (n > shape[pos]) return `Demasiados ${POSITION_LABEL[pos].toLowerCase()}s para ${formation}`;
  }
  return null;
}
