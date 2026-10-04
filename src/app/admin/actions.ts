"use server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import type { MatchStatus, Position } from "@/db/schema";
import { isAdult } from "@/lib/age";
import { requireAdmin } from "@/lib/auth";
import { fetchActaText, parseActaText } from "@/lib/federation/acta";
import { applyActa, type ActaLine } from "@/lib/game";
import { fromLocalInput } from "@/lib/time";

type Result = { error?: string; ok?: string } | undefined;
const POS = ["POR", "DEF", "MED", "DEL"];

/* ------------------------------------------------------------ Equipos */

export async function saveTeam(_: Result, form: FormData): Promise<Result> {
  await requireAdmin();
  const id = Number(form.get("id") || 0);
  const values = {
    name: String(form.get("name") ?? "").trim(),
    shortName: String(form.get("shortName") ?? "").trim(),
    gender: (form.get("gender") === "F" ? "F" : "M") as "M" | "F",
    competition: String(form.get("competition") ?? "").trim(),
    federation: String(form.get("federation") ?? "FCF"),
    federationUrl: String(form.get("federationUrl") ?? "").trim() || null,
  };
  if (!values.name || !values.shortName) return { error: "Nombre y abreviatura son obligatorios" };
  if (id) await db.update(schema.clubTeams).set(values).where(eq(schema.clubTeams.id, id));
  else await db.insert(schema.clubTeams).values(values);
  revalidatePath("/admin", "layout");
  return { ok: "Equipo guardado" };
}

/* ------------------------------------------------------------ Jugadores */

export async function savePlayer(_: Result, form: FormData): Promise<Result> {
  await requireAdmin();
  const id = Number(form.get("id") || 0);
  const birthDate = String(form.get("birthDate") ?? "");
  const position = String(form.get("position") ?? "") as Position;
  if (!POS.includes(position)) return { error: "Posición no válida" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return { error: "Fecha de nacimiento no válida" };
  const values = {
    name: String(form.get("name") ?? "").trim(),
    actaName: String(form.get("actaName") ?? "").trim() || null,
    birthDate,
    position,
    clubTeamId: Number(form.get("clubTeamId")),
    shirtNumber: Number(form.get("shirtNumber")) || null,
    value: Math.max(100_000, Number(form.get("value")) || 1_000_000),
    active: form.get("active") === "on",
  };
  if (values.name.length < 2) return { error: "Nombre obligatorio" };
  if (id) await db.update(schema.players).set(values).where(eq(schema.players.id, id));
  else await db.insert(schema.players).values(values);
  revalidatePath("/admin/jugadores");
  return { ok: isAdult(birthDate) ? "Jugador guardado" : "Guardado, pero es menor de edad: no aparecerá en el juego" };
}

/**
 * Importación CSV (separador ; o ,). Columnas:
 * nombre;fecha_nacimiento(AAAA-MM-DD);posicion(POR/DEF/MED/DEL);equipo(abreviatura);dorsal;valor;nombre_acta
 */
export async function importPlayersCsv(_: Result, form: FormData): Promise<Result> {
  await requireAdmin();
  const text = String(form.get("csv") ?? "");
  const teams = await db.select().from(schema.clubTeams);
  const byShort = new Map(teams.map((t) => [t.shortName.toLowerCase(), t.id]));
  const rows = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let ok = 0;
  let minors = 0;
  const errors: string[] = [];
  for (const [i, line] of rows.entries()) {
    const c = line.split(/[;,\t]/).map((x) => x.trim());
    if (i === 0 && /nombre/i.test(c[0])) continue;
    const [name, birthDate, position, team, num, value, actaName] = c;
    const teamId = byShort.get((team ?? "").toLowerCase());
    if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate ?? "") || !POS.includes((position ?? "").toUpperCase()) || !teamId) {
      errors.push(`Línea ${i + 1}`);
      continue;
    }
    if (!isAdult(birthDate)) minors++;
    await db.insert(schema.players).values({
      name,
      birthDate,
      position: position.toUpperCase() as Position,
      clubTeamId: teamId,
      shirtNumber: Number(num) || null,
      value: Number(value) || 1_000_000,
      actaName: actaName || null,
    });
    ok++;
  }
  revalidatePath("/admin/jugadores");
  if (errors.length) return { error: `Importados ${ok}. Con errores: ${errors.slice(0, 10).join(", ")}${errors.length > 10 ? "…" : ""}` };
  return { ok: `Importados ${ok} jugadores${minors ? ` (${minors} menores de edad quedan excluidos del juego)` : ""}` };
}

/* ------------------------------------------------------------ Jornadas y partidos */

export async function saveGameweek(_: Result, form: FormData): Promise<Result> {
  await requireAdmin();
  const number = Number(form.get("number"));
  const deadline = fromLocalInput(String(form.get("deadline") ?? ""));
  if (!number || !Number.isFinite(deadline)) return { error: "Datos no válidos" };
  const id = Number(form.get("id") || 0);
  const values = { number, name: String(form.get("name") || `Jornada ${number}`), deadline };
  try {
    if (id) await db.update(schema.gameweeks).set(values).where(eq(schema.gameweeks.id, id));
    else await db.insert(schema.gameweeks).values(values);
  } catch {
    return { error: "Ya existe una jornada con ese número" };
  }
  revalidatePath("/admin/jornadas");
  return { ok: "Jornada guardada" };
}

export async function saveMatch(_: Result, form: FormData): Promise<Result> {
  await requireAdmin();
  const id = Number(form.get("id") || 0);
  const values = {
    gameweekId: Number(form.get("gameweekId")),
    clubTeamId: Number(form.get("clubTeamId")),
    opponent: String(form.get("opponent") ?? "").trim(),
    isHome: form.get("isHome") === "on",
    kickoff: fromLocalInput(String(form.get("kickoff") ?? "")),
    actaUrl: String(form.get("actaUrl") ?? "").trim() || null,
    updatedAt: Date.now(),
  };
  if (!values.opponent || !values.gameweekId || !values.clubTeamId) return { error: "Faltan datos" };
  if (id) await db.update(schema.matches).set(values).where(eq(schema.matches.id, id));
  else await db.insert(schema.matches).values(values);
  revalidatePath("/admin", "layout");
  return { ok: "Partido guardado" };
}

/** Control del marcador en directo. */
export async function updateLive(
  matchId: number,
  patch: { status?: MatchStatus; minute?: number | null; goalsFor?: number; goalsAgainst?: number },
) {
  await requireAdmin();
  const m = await db.query.matches.findFirst({ where: eq(schema.matches.id, matchId) });
  if (!m) return;
  const next = {
    status: patch.status ?? m.status,
    minute: patch.minute !== undefined ? patch.minute : m.minute,
    goalsFor: Math.max(0, patch.goalsFor ?? m.goalsFor),
    goalsAgainst: Math.max(0, patch.goalsAgainst ?? m.goalsAgainst),
    updatedAt: Date.now(),
  };
  if (patch.status === "live" && m.status === "scheduled" && next.minute == null) next.minute = 1;
  await db.update(schema.matches).set(next).where(eq(schema.matches.id, matchId));
  revalidatePath(`/admin/partido/${matchId}`);
  revalidatePath("/partidos");
}

/* ------------------------------------------------------------ Actas */

export async function saveActa(matchId: number, goalsFor: number, goalsAgainst: number, lines: ActaLine[]): Promise<Result> {
  await requireAdmin();
  const clean = lines
    .filter((l) => l.minutes > 0)
    .map((l) => ({
      playerId: l.playerId,
      minutes: Math.min(130, Math.max(0, Math.round(l.minutes))),
      goals: Math.max(0, Math.round(l.goals)),
      ownGoals: Math.max(0, Math.round(l.ownGoals)),
      yellow: Math.min(2, Math.max(0, Math.round(l.yellow))),
      red: !!l.red || l.yellow >= 2,
      penSaved: Math.max(0, Math.round(l.penSaved)),
      penMissed: Math.max(0, Math.round(l.penMissed)),
    }));
  await applyActa(matchId, goalsFor, goalsAgainst, clean);
  revalidatePath("/", "layout");
  return { ok: `Acta guardada: ${clean.length} jugadores puntuados` };
}

export async function parseActa(matchId: number, source: { url?: string; text?: string }) {
  await requireAdmin();
  const match = await db.query.matches.findFirst({ where: eq(schema.matches.id, matchId) });
  if (!match) return { error: "Partido no encontrado" };
  const roster = await db.select().from(schema.players).where(eq(schema.players.clubTeamId, match.clubTeamId));
  let text = source.text ?? "";
  if (source.url) {
    try {
      text = await fetchActaText(source.url);
    } catch (e) {
      return { error: `No se pudo descargar el acta: ${(e as Error).message}` };
    }
  }
  const parsed = parseActaText(text, roster);
  const byName = new Map(roster.map((p) => [p.name, p.id]));
  let goalsFor = parsed.goalsFor;
  let goalsAgainst = parsed.goalsAgainst;
  if (!match.isHome && goalsFor != null && goalsAgainst != null) [goalsFor, goalsAgainst] = [goalsAgainst, goalsFor];
  return {
    goalsFor,
    goalsAgainst,
    warnings: parsed.warnings,
    lines: parsed.players.map((p) => ({ ...p, playerId: byName.get(p.name)! })),
  };
}
