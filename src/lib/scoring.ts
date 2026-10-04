import type { Position } from "@/db/schema";

export interface MatchLine {
  position: Position;
  minutes: number;
  goals: number;
  ownGoals: number;
  yellow: number;
  red: boolean;
  penSaved: number;
  penMissed: number;
  /** Goles del equipo del jugador en el partido. */
  teamGoalsFor: number;
  /** Goles encajados por el equipo del jugador en el partido. */
  teamGoalsAgainst: number;
}

/** Reglas de puntuación. Se muestran tal cual en la página "Cómo se puntúa". */
export const RULES = {
  playedUnder60: 1,
  played60: 2,
  goal: { POR: 7, DEF: 6, MED: 5, DEL: 4 } as Record<Position, number>,
  cleanSheet: { POR: 4, DEF: 3, MED: 1, DEL: 0 } as Record<Position, number>,
  /** Por cada 2 goles encajados (solo POR y DEF). */
  per2Conceded: -1,
  win: 2,
  draw: 1,
  loss: 0,
  yellow: -1,
  /** Segunda amarilla: se cuenta como roja (las amarillas no se suman). */
  red: -3,
  ownGoal: -2,
  penSaved: 5,
  penMissed: -2,
};

export function scoreLine(l: MatchLine): number {
  if (l.minutes <= 0) return 0;
  let pts = l.minutes >= 60 ? RULES.played60 : RULES.playedUnder60;

  pts += l.goals * RULES.goal[l.position];

  if (l.minutes >= 60 && l.teamGoalsAgainst === 0) pts += RULES.cleanSheet[l.position];
  if (l.position === "POR" || l.position === "DEF") {
    pts += Math.floor(l.teamGoalsAgainst / 2) * RULES.per2Conceded;
  }

  if (l.teamGoalsFor > l.teamGoalsAgainst) pts += RULES.win;
  else if (l.teamGoalsFor === l.teamGoalsAgainst) pts += RULES.draw;
  else pts += RULES.loss;

  if (l.red) pts += RULES.red;
  else pts += Math.min(l.yellow, 1) * RULES.yellow;

  pts += l.ownGoals * RULES.ownGoal;
  pts += l.penSaved * RULES.penSaved;
  pts += l.penMissed * RULES.penMissed;
  return pts;
}

/** Variación de valor de mercado tras un partido. */
export function valueDeltaFor(points: number, minutes: number): number {
  if (minutes <= 0) return -20_000;
  return (points - 3) * 40_000;
}

export const MIN_PLAYER_VALUE = 150_000;
