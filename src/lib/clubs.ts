import "server-only";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";

export type Club = typeof schema.clubs.$inferSelect;

export async function listClubs() {
  return db.select().from(schema.clubs).orderBy(asc(schema.clubs.name));
}

export async function getClub(id: number) {
  return (await db.query.clubs.findFirst({ where: eq(schema.clubs.id, id) })) ?? null;
}

/** Clubs de las ligas en las que juega el usuario (sin repetir, en orden de entrada). */
export async function clubsOfUser(userId: number) {
  const rows = await db
    .select({ club: schema.clubs })
    .from(schema.members)
    .innerJoin(schema.leagues, eq(schema.leagues.id, schema.members.leagueId))
    .innerJoin(schema.clubs, eq(schema.clubs.id, schema.leagues.clubId))
    .where(eq(schema.members.userId, userId))
    .orderBy(asc(schema.members.createdAt));
  const seen = new Map<number, Club>();
  for (const r of rows) if (!seen.has(r.club.id)) seen.set(r.club.id, r.club);
  return [...seen.values()];
}
