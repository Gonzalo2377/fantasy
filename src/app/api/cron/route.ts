import { and, eq, isNotNull, lte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { fetchActaText, parseActaText } from "@/lib/federation/acta";
import { applyActa, settleMarket } from "@/lib/game";

export const dynamic = "force-dynamic";

/**
 * Tarea periódica (Vercel Cron u otro planificador):
 *  1. Cierra los mercados caducados y genera los nuevos.
 *  2. Si AUTO_IMPORT_ACTAS=1, intenta leer las actas de los partidos ya jugados que tengan URL.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const out: { markets: number; actas: string[] } = { markets: 0, actas: [] };

  for (const l of await db.select({ id: schema.leagues.id }).from(schema.leagues)) {
    await settleMarket(l.id);
    out.markets++;
  }

  if (process.env.AUTO_IMPORT_ACTAS === "1") {
    const pending = await db
      .select()
      .from(schema.matches)
      .where(
        and(
          eq(schema.matches.statsApplied, false),
          isNotNull(schema.matches.actaUrl),
          lte(schema.matches.kickoff, Date.now() - 150 * 60_000),
        ),
      );
    for (const m of pending) {
      try {
        const roster = await db.select().from(schema.players).where(eq(schema.players.clubTeamId, m.clubTeamId));
        const parsed = parseActaText(await fetchActaText(m.actaUrl!), roster);
        // Solo se aplica si la lectura parece completa; si no, queda para revisión manual en /admin.
        if (parsed.players.filter((p) => p.minutes > 0).length < 11 || parsed.goalsFor == null || parsed.goalsAgainst == null) {
          out.actas.push(`#${m.id}: lectura incompleta, revisar a mano`);
          continue;
        }
        const byName = new Map(roster.map((p) => [p.name, p.id]));
        const [gf, ga] = m.isHome ? [parsed.goalsFor, parsed.goalsAgainst] : [parsed.goalsAgainst, parsed.goalsFor];
        await applyActa(
          m.id,
          gf,
          ga,
          parsed.players.map((p) => ({ playerId: byName.get(p.name)!, minutes: p.minutes, goals: p.goals, ownGoals: p.ownGoals, yellow: p.yellow, red: p.red, penSaved: 0, penMissed: 0 })),
        );
        out.actas.push(`#${m.id}: aplicada`);
      } catch (e) {
        out.actas.push(`#${m.id}: ${(e as Error).message}`);
      }
    }
  }
  return NextResponse.json(out);
}
