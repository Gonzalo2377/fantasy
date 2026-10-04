import "server-only";
import { and, asc, desc, eq, gt, inArray, isNull, lte, notInArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Position } from "@/db/schema";
import { latestAllowedBirthDate } from "@/lib/age";
import { FORMATIONS, MAX_SQUAD, POSITIONS, STARTING_SQUAD, validateLineup } from "@/lib/formations";
import { pickWinner, sample } from "@/lib/market-logic";
import { money } from "@/lib/money";
import { MIN_PLAYER_VALUE, scoreLine, valueDeltaFor } from "@/lib/scoring";
import { nextMarketReset } from "@/lib/time";

const { players, leagues, members, ownerships, listings, bids, lineups, gameweeks, matches, playerStats, activity } =
  schema;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Db = typeof db | Tx;

export class GameError extends Error {}

/* ---------------------------------------------------------------- Jugadores */

/** Solo jugadores activos y mayores de edad pueden aparecer en el juego. */
export function eligibleWhere() {
  return and(eq(players.active, true), lte(players.birthDate, latestAllowedBirthDate()));
}

export async function eligiblePlayers(d: Db = db) {
  return d.select().from(players).where(eligibleWhere());
}

async function freePlayerIds(d: Db, leagueId: number, extraExclude: number[] = []) {
  const owned = await d.select({ id: ownerships.playerId }).from(ownerships).where(eq(ownerships.leagueId, leagueId));
  const exclude = [...owned.map((o) => o.id), ...extraExclude];
  const rows = await d
    .select({ id: players.id, position: players.position })
    .from(players)
    .where(exclude.length ? and(eligibleWhere(), notInArray(players.id, exclude)) : eligibleWhere());
  return rows;
}

/* ---------------------------------------------------------------- Jornadas */

/** Jornada abierta para alineaciones: la primera cuyo cierre aún no ha pasado. */
export async function openGameweek(d: Db = db) {
  const [gw] = await d
    .select()
    .from(gameweeks)
    .where(gt(gameweeks.deadline, Date.now()))
    .orderBy(asc(gameweeks.deadline))
    .limit(1);
  return gw ?? null;
}

/** Jornada "actual" para el panel de partidos: la última cerrada si tiene partidos sin terminar, si no la abierta. */
export async function currentGameweek() {
  const [lastLocked] = await db
    .select()
    .from(gameweeks)
    .where(lte(gameweeks.deadline, Date.now()))
    .orderBy(desc(gameweeks.deadline))
    .limit(1);
  if (lastLocked) {
    const pending = await db
      .select({ n: sql<number>`count(*)` })
      .from(matches)
      .where(and(eq(matches.gameweekId, lastLocked.id), inArray(matches.status, ["scheduled", "live"])));
    if (pending[0].n > 0) return lastLocked;
  }
  return (await openGameweek()) ?? lastLocked ?? null;
}

/* ---------------------------------------------------------------- Ligas */

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function createLeague(opts: { name: string; isPublic: boolean; ownerId: number | null; maxMembers?: number }) {
  for (let i = 0; i < 5; i++) {
    try {
      const [l] = await db
        .insert(leagues)
        .values({
          name: opts.name,
          isPublic: opts.isPublic,
          ownerId: opts.ownerId,
          code: randomCode(),
          maxMembers: opts.maxMembers ?? (opts.isPublic ? 8 : 10),
          createdAt: Date.now(),
        })
        .returning();
      return l;
    } catch (e) {
      if (i === 4) throw e;
    }
  }
  throw new GameError("No se pudo crear la liga");
}

async function log(d: Db, leagueId: number, text: string) {
  await d.insert(activity).values({ leagueId, text, createdAt: Date.now() });
}

export async function joinLeague(userId: number, leagueId: number, teamName: string) {
  return db.transaction(
    async (tx) => {
      const league = await tx.query.leagues.findFirst({ where: eq(leagues.id, leagueId) });
      if (!league) throw new GameError("La liga no existe");
      const existing = await tx.query.members.findFirst({
        where: and(eq(members.leagueId, leagueId), eq(members.userId, userId)),
      });
      if (existing) return existing;
      const [{ n }] = await tx
        .select({ n: sql<number>`count(*)` })
        .from(members)
        .where(eq(members.leagueId, leagueId));
      if (n >= league.maxMembers) throw new GameError("La liga está completa");

      // Equipo por defecto: jugadores libres al azar por posición.
      const free = await freePlayerIds(tx, leagueId);
      const squad: number[] = [];
      for (const pos of POSITIONS) {
        const pool = free.filter((p) => p.position === pos).map((p) => p.id);
        squad.push(...sample(pool, STARTING_SQUAD[pos]));
      }
      const needed = Object.values(STARTING_SQUAD).reduce((a, b) => a + b, 0);
      if (squad.length < needed) throw new GameError("No quedan jugadores libres suficientes en esta liga");

      const [member] = await tx
        .insert(members)
        .values({ leagueId, userId, teamName, cash: league.startingCash, createdAt: Date.now() })
        .returning();
      const now = Date.now();
      await tx.insert(ownerships).values(
        squad.map((playerId) => ({ leagueId, memberId: member.id, playerId, boughtFor: 0, acquiredAt: now })),
      );
      const gw = await openGameweek(tx);
      if (gw) {
        await tx.insert(lineups).values({
          memberId: member.id,
          gameweekId: gw.id,
          formation: "4-4-2",
          playerIds: JSON.stringify(squad),
          captainId: null,
        });
      }
      await log(tx, leagueId, `${teamName} se ha unido a la liga`);
      return member;
    },
    { behavior: "immediate" },
  );
}

/** Entra en una liga pública con hueco; si no hay, crea una nueva. */
export async function joinPublicLeague(userId: number, teamName: string) {
  const pub = await db
    .select({
      id: leagues.id,
      maxMembers: leagues.maxMembers,
      n: sql<number>`(select count(*) from members m where m.league_id = ${leagues.id})`,
      mine: sql<number>`(select count(*) from members m where m.league_id = ${leagues.id} and m.user_id = ${userId})`,
    })
    .from(leagues)
    .where(eq(leagues.isPublic, true))
    .orderBy(asc(leagues.id));
  const target = pub.find((l) => l.mine === 0 && l.n < l.maxMembers);
  const leagueId =
    target?.id ?? (await createLeague({ name: `Liga Pública #${pub.length + 1}`, isPublic: true, ownerId: null })).id;
  const member = await joinLeague(userId, leagueId, teamName);
  return member;
}

export async function getMembership(userId: number, leagueId: number) {
  const member = await db.query.members.findFirst({
    where: and(eq(members.leagueId, leagueId), eq(members.userId, userId)),
  });
  const league = await db.query.leagues.findFirst({ where: eq(leagues.id, leagueId) });
  return { member: member ?? null, league: league ?? null };
}

/* ---------------------------------------------------------------- Plantilla y alineación */

export async function squadOf(memberId: number, d: Db = db) {
  return d
    .select({
      ownershipId: ownerships.id,
      boughtFor: ownerships.boughtFor,
      id: players.id,
      name: players.name,
      position: players.position,
      value: players.value,
      shirtNumber: players.shirtNumber,
      clubTeamId: players.clubTeamId,
      teamShort: schema.clubTeams.shortName,
      gender: schema.clubTeams.gender,
    })
    .from(ownerships)
    .innerJoin(players, eq(players.id, ownerships.playerId))
    .innerJoin(schema.clubTeams, eq(schema.clubTeams.id, players.clubTeamId))
    .where(eq(ownerships.memberId, memberId));
}

/** Alineación vigente para una jornada (la propia o la última anterior). */
async function effectiveLineup(d: Db, memberId: number, gw: { id: number; deadline: number }) {
  const [row] = await d
    .select({ l: lineups, deadline: gameweeks.deadline })
    .from(lineups)
    .innerJoin(gameweeks, eq(gameweeks.id, lineups.gameweekId))
    .where(and(eq(lineups.memberId, memberId), lte(gameweeks.deadline, gw.deadline)))
    .orderBy(desc(gameweeks.deadline))
    .limit(1);
  return row?.l ?? null;
}

/** Garantiza que existe la alineación de la jornada abierta, copiando la anterior sin jugadores vendidos. */
export async function ensureOpenLineup(memberId: number, d: Db = db) {
  const gw = await openGameweek(d);
  if (!gw) return null;
  const own = await d.query.lineups.findFirst({
    where: and(eq(lineups.memberId, memberId), eq(lineups.gameweekId, gw.id)),
  });
  if (own) return { gw, lineup: own };
  const prev = await effectiveLineup(d, memberId, gw);
  const owned = new Set((await squadOf(memberId, d)).map((p) => p.id));
  const ids = prev ? (JSON.parse(prev.playerIds) as number[]).filter((id) => owned.has(id)) : [];
  const [created] = await d
    .insert(lineups)
    .values({
      memberId,
      gameweekId: gw.id,
      formation: prev?.formation ?? "4-4-2",
      playerIds: JSON.stringify(ids),
      captainId: prev?.captainId && owned.has(prev.captainId) ? prev.captainId : null,
    })
    .returning();
  return { gw, lineup: created };
}

async function removeFromOpenLineup(d: Db, memberId: number, playerId: number) {
  const res = await ensureOpenLineup(memberId, d);
  if (!res) return;
  const ids = (JSON.parse(res.lineup.playerIds) as number[]).filter((id) => id !== playerId);
  await d
    .update(lineups)
    .set({
      playerIds: JSON.stringify(ids),
      captainId: res.lineup.captainId === playerId ? null : res.lineup.captainId,
    })
    .where(eq(lineups.id, res.lineup.id));
}

export async function saveLineup(memberId: number, formation: string, playerIds: number[], captainId: number | null) {
  const res = await ensureOpenLineup(memberId);
  if (!res) throw new GameError("No hay ninguna jornada abierta");
  const squad = await squadOf(memberId);
  const byId = new Map(squad.map((p) => [p.id, p]));
  const starters = playerIds.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => !!p);
  if (starters.length !== playerIds.length) throw new GameError("Hay jugadores que no son tuyos");
  if (!FORMATIONS[formation]) throw new GameError("Formación no válida");
  const err = validateLineup(formation, starters);
  if (err) throw new GameError(err);
  if (captainId && !playerIds.includes(captainId)) throw new GameError("El capitán debe ser titular");
  await db
    .update(lineups)
    .set({ formation, playerIds: JSON.stringify(playerIds), captainId })
    .where(eq(lineups.id, res.lineup.id));
}

/* ---------------------------------------------------------------- Mercado */

/** Resuelve las subastas caducadas y genera el mercado del día si hace falta. Idempotente. */
export async function settleMarket(leagueId: number) {
  const now = Date.now();
  await db.transaction(
    async (tx) => {
      const expired = await tx
        .select()
        .from(listings)
        .where(and(eq(listings.leagueId, leagueId), eq(listings.status, "open"), lte(listings.closesAt, now)))
        .orderBy(asc(listings.id));

      if (expired.length) {
        const ms = await tx.select().from(members).where(eq(members.leagueId, leagueId));
        const cash = new Map(ms.map((m) => [m.id, m.cash]));
        const names = new Map(ms.map((m) => [m.id, m.teamName]));
        const squadSize = new Map<number, number>();
        for (const m of ms) {
          const [{ n }] = await tx
            .select({ n: sql<number>`count(*)` })
            .from(ownerships)
            .where(eq(ownerships.memberId, m.id));
          squadSize.set(m.id, n);
        }

        for (const l of expired) {
          const player = await tx.query.players.findFirst({ where: eq(players.id, l.playerId) });
          const owner = await tx.query.ownerships.findFirst({
            where: and(eq(ownerships.leagueId, leagueId), eq(ownerships.playerId, l.playerId)),
          });
          // Si el jugador ya no está en manos de quien lo vendía (o ya tiene dueño), se anula.
          const valid = l.sellerMemberId ? owner?.memberId === l.sellerMemberId : !owner;
          const lbids = valid ? await tx.select().from(bids).where(eq(bids.listingId, l.id)) : [];
          const winner = pickWinner(
            lbids.filter((b) => b.memberId !== l.sellerMemberId),
            l.minPrice,
            (mid, amount) => (cash.get(mid) ?? 0) >= amount && (squadSize.get(mid) ?? 0) < MAX_SQUAD,
          );
          if (!winner || !player) {
            await tx.update(listings).set({ status: "unsold" }).where(eq(listings.id, l.id));
            continue;
          }
          cash.set(winner.memberId, cash.get(winner.memberId)! - winner.amount);
          squadSize.set(winner.memberId, squadSize.get(winner.memberId)! + 1);
          await tx
            .update(members)
            .set({ cash: sql`${members.cash} - ${winner.amount}` })
            .where(eq(members.id, winner.memberId));
          if (l.sellerMemberId && owner) {
            cash.set(l.sellerMemberId, (cash.get(l.sellerMemberId) ?? 0) + winner.amount);
            squadSize.set(l.sellerMemberId, (squadSize.get(l.sellerMemberId) ?? 1) - 1);
            await tx
              .update(members)
              .set({ cash: sql`${members.cash} + ${winner.amount}` })
              .where(eq(members.id, l.sellerMemberId));
            await removeFromOpenLineup(tx, l.sellerMemberId, l.playerId);
            await tx
              .update(ownerships)
              .set({ memberId: winner.memberId, boughtFor: winner.amount, acquiredAt: now })
              .where(eq(ownerships.id, owner.id));
          } else {
            await tx.insert(ownerships).values({
              leagueId,
              memberId: winner.memberId,
              playerId: l.playerId,
              boughtFor: winner.amount,
              acquiredAt: now,
            });
          }
          await tx
            .update(listings)
            .set({ status: "sold", winnerMemberId: winner.memberId, finalPrice: winner.amount })
            .where(eq(listings.id, l.id));
          const from = l.sellerMemberId ? ` a ${names.get(l.sellerMemberId)}` : "";
          const rivals = lbids.length > 1 ? ` (${lbids.length} pujas)` : "";
          await log(
            tx,
            leagueId,
            `${names.get(winner.memberId)} ficha a ${player.name}${from} por ${money(winner.amount)}${rivals}`,
          );
        }
      }

      const [{ open }] = await tx
        .select({ open: sql<number>`count(*)` })
        .from(listings)
        .where(and(eq(listings.leagueId, leagueId), eq(listings.status, "open"), isNull(listings.sellerMemberId)));
      if (open === 0) {
        const league = await tx.query.leagues.findFirst({ where: eq(leagues.id, leagueId) });
        const free = await freePlayerIds(tx, leagueId);
        const pick = sample(free, league?.marketSize ?? 8);
        if (pick.length) {
          const vals = await tx.select({ id: players.id, value: players.value }).from(players).where(
            inArray(
              players.id,
              pick.map((p) => p.id),
            ),
          );
          const closesAt = nextMarketReset(now);
          await tx
            .insert(listings)
            .values(vals.map((v) => ({ leagueId, playerId: v.id, sellerMemberId: null, minPrice: v.value, closesAt })));
        }
      }
    },
    { behavior: "immediate" },
  );
}

export async function placeBid(memberId: number, listingId: number, amount: number) {
  const member = await db.query.members.findFirst({ where: eq(members.id, memberId) });
  const listing = await db.query.listings.findFirst({ where: eq(listings.id, listingId) });
  if (!member || !listing || listing.leagueId !== member.leagueId) throw new GameError("Subasta no encontrada");
  if (listing.status !== "open" || listing.closesAt <= Date.now()) throw new GameError("La subasta ya ha cerrado");
  if (listing.sellerMemberId === memberId) throw new GameError("No puedes pujar por tu propio jugador");
  if (!Number.isFinite(amount) || amount < listing.minPrice)
    throw new GameError(`La puja mínima es ${money(listing.minPrice)}`);
  if (amount > member.cash) throw new GameError("No tienes suficiente dinero");
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(ownerships)
    .where(eq(ownerships.memberId, memberId));
  if (n >= MAX_SQUAD) throw new GameError(`Tu plantilla ya tiene ${MAX_SQUAD} jugadores`);
  await db
    .insert(bids)
    .values({ listingId, memberId, amount: Math.round(amount), createdAt: Date.now() })
    .onConflictDoUpdate({
      target: [bids.listingId, bids.memberId],
      set: { amount: Math.round(amount), createdAt: Date.now() },
    });
}

export async function cancelBid(memberId: number, listingId: number) {
  await db.delete(bids).where(and(eq(bids.listingId, listingId), eq(bids.memberId, memberId)));
}

/** Venta inmediata al juego por el valor de mercado actual. */
export async function sellNow(memberId: number, playerId: number) {
  await db.transaction(
    async (tx) => {
      const own = await tx.query.ownerships.findFirst({
        where: and(eq(ownerships.memberId, memberId), eq(ownerships.playerId, playerId)),
      });
      if (!own) throw new GameError("Ese jugador no es tuyo");
      const [{ n }] = await tx
        .select({ n: sql<number>`count(*)` })
        .from(ownerships)
        .where(eq(ownerships.memberId, memberId));
      if (n <= 11) throw new GameError("Necesitas al menos 11 jugadores en plantilla");
      const player = (await tx.query.players.findFirst({ where: eq(players.id, playerId) }))!;
      const member = (await tx.query.members.findFirst({ where: eq(members.id, memberId) }))!;
      await removeFromOpenLineup(tx, memberId, playerId);
      await tx.delete(ownerships).where(eq(ownerships.id, own.id));
      await tx
        .update(listings)
        .set({ status: "unsold" })
        .where(and(eq(listings.playerId, playerId), eq(listings.sellerMemberId, memberId), eq(listings.status, "open")));
      await tx.update(members).set({ cash: member.cash + player.value }).where(eq(members.id, memberId));
      await log(tx, member.leagueId, `${member.teamName} vende a ${player.name} al mercado por ${money(player.value)}`);
    },
    { behavior: "immediate" },
  );
}

/** Pone un jugador propio en el mercado del día; los rivales pujan y se resuelve al cierre. */
export async function listForSale(memberId: number, playerId: number, minPrice: number) {
  const member = await db.query.members.findFirst({ where: eq(members.id, memberId) });
  const own = await db.query.ownerships.findFirst({
    where: and(eq(ownerships.memberId, memberId), eq(ownerships.playerId, playerId)),
  });
  if (!member || !own) throw new GameError("Ese jugador no es tuyo");
  const already = await db.query.listings.findFirst({
    where: and(eq(listings.playerId, playerId), eq(listings.leagueId, member.leagueId), eq(listings.status, "open")),
  });
  if (already) throw new GameError("Ya está en el mercado");
  await db.insert(listings).values({
    leagueId: member.leagueId,
    playerId,
    sellerMemberId: memberId,
    minPrice: Math.max(1, Math.round(minPrice)),
    closesAt: nextMarketReset(),
  });
}

export async function withdrawListing(memberId: number, listingId: number) {
  await db
    .update(listings)
    .set({ status: "unsold" })
    .where(and(eq(listings.id, listingId), eq(listings.sellerMemberId, memberId), eq(listings.status, "open")));
}

/* ---------------------------------------------------------------- Actas y puntos */

export interface ActaLine {
  playerId: number;
  minutes: number;
  goals: number;
  ownGoals: number;
  yellow: number;
  red: boolean;
  penSaved: number;
  penMissed: number;
}

/** Guarda el acta de un partido, calcula puntos y ajusta el valor de mercado. Se puede re-aplicar. */
export async function applyActa(matchId: number, goalsFor: number, goalsAgainst: number, lines: ActaLine[]) {
  await db.transaction(
    async (tx) => {
      const match = await tx.query.matches.findFirst({ where: eq(matches.id, matchId) });
      if (!match) throw new GameError("Partido no encontrado");

      // Revertir valores aplicados previamente.
      const prev = await tx.select().from(playerStats).where(eq(playerStats.matchId, matchId));
      for (const p of prev) {
        if (p.valueDelta)
          await tx
            .update(players)
            .set({ value: sql`max(${MIN_PLAYER_VALUE}, ${players.value} - ${p.valueDelta})` })
            .where(eq(players.id, p.playerId));
      }
      await tx.delete(playerStats).where(eq(playerStats.matchId, matchId));

      const ids = lines.map((l) => l.playerId);
      const ps = ids.length ? await tx.select().from(players).where(inArray(players.id, ids)) : [];
      const pos = new Map<number, Position>(ps.map((p) => [p.id, p.position]));
      for (const l of lines) {
        const position = pos.get(l.playerId);
        if (!position) continue;
        const points = scoreLine({ ...l, position, teamGoalsFor: goalsFor, teamGoalsAgainst: goalsAgainst });
        const valueDelta = valueDeltaFor(points, l.minutes);
        await tx.insert(playerStats).values({ matchId, ...l, points, valueDelta });
        await tx
          .update(players)
          .set({ value: sql`max(${MIN_PLAYER_VALUE}, ${players.value} + ${valueDelta})` })
          .where(eq(players.id, l.playerId));
      }
      await tx
        .update(matches)
        .set({ goalsFor, goalsAgainst, status: "finished", statsApplied: true, minute: null, updatedAt: Date.now() })
        .where(eq(matches.id, matchId));
    },
    { behavior: "immediate" },
  );
}

/* ---------------------------------------------------------------- Clasificación */

export async function standings(leagueId: number) {
  const ms = await db.select().from(members).where(eq(members.leagueId, leagueId));
  const gws = await db
    .select()
    .from(gameweeks)
    .where(lte(gameweeks.deadline, Date.now()))
    .orderBy(asc(gameweeks.deadline));

  const pointsByGw = new Map<number, Map<number, number>>(); // gw -> player -> points
  if (gws.length) {
    const rows = await db
      .select({ gw: matches.gameweekId, playerId: playerStats.playerId, points: playerStats.points })
      .from(playerStats)
      .innerJoin(matches, eq(matches.id, playerStats.matchId))
      .where(
        inArray(
          matches.gameweekId,
          gws.map((g) => g.id),
        ),
      );
    for (const r of rows) {
      const m = pointsByGw.get(r.gw) ?? new Map();
      m.set(r.playerId, (m.get(r.playerId) ?? 0) + r.points);
      pointsByGw.set(r.gw, m);
    }
  }

  const table = [];
  for (const m of ms) {
    const perGw: { gameweekId: number; number: number; points: number }[] = [];
    for (const gw of gws) {
      const lu = await effectiveLineup(db, m.id, gw);
      const pts = pointsByGw.get(gw.id);
      let total = 0;
      if (lu && pts) {
        for (const pid of JSON.parse(lu.playerIds) as number[]) {
          const p = pts.get(pid) ?? 0;
          total += pid === lu.captainId ? p * 2 : p;
        }
      }
      perGw.push({ gameweekId: gw.id, number: gw.number, points: total });
    }
    const squad = await squadOf(m.id);
    table.push({
      member: m,
      total: perGw.reduce((a, b) => a + b.points, 0),
      last: perGw.at(-1)?.points ?? 0,
      perGw,
      teamValue: squad.reduce((a, p) => a + p.value, 0),
    });
  }
  table.sort((a, b) => b.total - a.total || b.teamValue - a.teamValue);
  return { table, gameweeks: gws };
}

/** Puntos totales y últimos partidos de cada jugador (para listas y fichas). */
export async function playerPointsSummary() {
  const rows = await db
    .select({ playerId: playerStats.playerId, points: playerStats.points, kickoff: matches.kickoff })
    .from(playerStats)
    .innerJoin(matches, eq(matches.id, playerStats.matchId))
    .orderBy(desc(matches.kickoff));
  const out = new Map<number, { total: number; last: number[] }>();
  for (const r of rows) {
    const s = out.get(r.playerId) ?? { total: 0, last: [] };
    s.total += r.points;
    if (s.last.length < 5) s.last.push(r.points);
    out.set(r.playerId, s);
  }
  return out;
}
