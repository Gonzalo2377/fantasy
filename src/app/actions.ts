"use server";
import bcrypt from "bcryptjs";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { createSession, currentUser, destroySession, isAdminEmail } from "@/lib/auth";
import {
  GameError,
  cancelBid,
  createLeague,
  joinLeague,
  joinPublicLeague,
  listForSale,
  placeBid,
  saveLineup,
  sellNow,
  withdrawListing,
} from "@/lib/game";

type Result = { error?: string; ok?: string } | undefined;

async function guard<T>(fn: () => Promise<T>): Promise<Result | T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof GameError) return { error: e.message };
    throw e;
  }
}

async function memberFor(leagueId: number) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const member = await db.query.members.findFirst({
    where: and(eq(schema.members.leagueId, leagueId), eq(schema.members.userId, user.id)),
  });
  if (!member) throw new GameError("No perteneces a esta liga");
  return member;
}

/* ------------------------------------------------------------ Cuenta */

const registerSchema = z.object({
  name: z.string().trim().min(2, "Pon tu nombre").max(40),
  email: z.string().trim().toLowerCase().email("Email no válido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  adult: z.literal("on", { message: "Debes ser mayor de edad para jugar" }),
});

export async function register(_: Result, form: FormData): Promise<Result> {
  const parsed = registerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, password } = parsed.data;
  const exists = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  if (exists) return { error: "Ya existe una cuenta con ese email" };
  const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(schema.users);
  const [user] = await db
    .insert(schema.users)
    .values({
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      isAdmin: n === 0 || isAdminEmail(email),
      createdAt: Date.now(),
    })
    .returning();
  await createSession(user.id);
  redirect("/");
}

export async function login(_: Result, form: FormData): Promise<Result> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const user = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return { error: "Email o contraseña incorrectos" };
  if (!user.isAdmin && isAdminEmail(email)) await db.update(schema.users).set({ isAdmin: true }).where(eq(schema.users.id, user.id));
  await createSession(user.id);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

/* ------------------------------------------------------------ Ligas */

function teamNameFrom(form: FormData, fallback: string) {
  const t = String(form.get("teamName") ?? "").trim().slice(0, 30);
  return t.length >= 2 ? t : fallback;
}

export async function joinPublic(_: Result, form: FormData): Promise<Result> {
  const user = await currentUser();
  if (!user) redirect("/login");
  const res = await guard(() => joinPublicLeague(user.id, teamNameFrom(form, `Equipo de ${user.name}`)));
  if (res && "error" in res) return res as Result;
  redirect(`/liga/${(res as { leagueId: number }).leagueId}/equipo`);
}

export async function createPrivate(_: Result, form: FormData): Promise<Result> {
  const user = await currentUser();
  if (!user) redirect("/login");
  const name = String(form.get("name") ?? "").trim().slice(0, 40);
  if (name.length < 3) return { error: "Ponle un nombre a la liga" };
  const max = Math.min(12, Math.max(2, Number(form.get("maxMembers") ?? 10)));
  const league = await createLeague({ name, isPublic: false, ownerId: user.id, maxMembers: max });
  const res = await guard(() => joinLeague(user.id, league.id, teamNameFrom(form, `Equipo de ${user.name}`)));
  if (res && "error" in res) return res as Result;
  redirect(`/liga/${league.id}`);
}

export async function joinByCode(_: Result, form: FormData): Promise<Result> {
  const user = await currentUser();
  if (!user) redirect("/login");
  const code = String(form.get("code") ?? "").trim().toUpperCase();
  const league = await db.query.leagues.findFirst({ where: eq(schema.leagues.code, code) });
  if (!league) return { error: "No existe ninguna liga con ese código" };
  const res = await guard(() => joinLeague(user.id, league.id, teamNameFrom(form, `Equipo de ${user.name}`)));
  if (res && "error" in res) return res as Result;
  redirect(`/liga/${league.id}/equipo`);
}

/* ------------------------------------------------------------ Alineación */

export async function saveLineupAction(
  leagueId: number,
  formation: string,
  playerIds: number[],
  captainId: number | null,
): Promise<Result> {
  return guard(async () => {
    const member = await memberFor(leagueId);
    await saveLineup(member.id, formation, playerIds, captainId);
    revalidatePath(`/liga/${leagueId}/equipo`);
    return { ok: "Alineación guardada" };
  }) as Promise<Result>;
}

/* ------------------------------------------------------------ Mercado */

export async function bidAction(_: Result, form: FormData): Promise<Result> {
  const leagueId = Number(form.get("leagueId"));
  const listingId = Number(form.get("listingId"));
  const amount = Math.round(Number(String(form.get("amount") ?? "").replace(/[^\d]/g, "")));
  return guard(async () => {
    const member = await memberFor(leagueId);
    await placeBid(member.id, listingId, amount);
    revalidatePath(`/liga/${leagueId}/mercado`);
    return { ok: "Puja registrada. Es secreta hasta el cierre." };
  }) as Promise<Result>;
}

export async function cancelBidAction(_: Result, form: FormData): Promise<Result> {
  const leagueId = Number(form.get("leagueId"));
  return guard(async () => {
    const member = await memberFor(leagueId);
    await cancelBid(member.id, Number(form.get("listingId")));
    revalidatePath(`/liga/${leagueId}/mercado`);
    return { ok: "Puja retirada" };
  }) as Promise<Result>;
}

export async function sellNowAction(_: Result, form: FormData): Promise<Result> {
  const leagueId = Number(form.get("leagueId"));
  return guard(async () => {
    const member = await memberFor(leagueId);
    await sellNow(member.id, Number(form.get("playerId")));
    revalidatePath(`/liga/${leagueId}`, "layout");
    return { ok: "Jugador vendido" };
  }) as Promise<Result>;
}

export async function listForSaleAction(_: Result, form: FormData): Promise<Result> {
  const leagueId = Number(form.get("leagueId"));
  const price = Math.round(Number(String(form.get("price") ?? "").replace(/[^\d]/g, "")));
  return guard(async () => {
    const member = await memberFor(leagueId);
    await listForSale(member.id, Number(form.get("playerId")), price);
    revalidatePath(`/liga/${leagueId}`, "layout");
    return { ok: "Jugador en el mercado hasta el próximo cierre" };
  }) as Promise<Result>;
}

export async function withdrawListingAction(_: Result, form: FormData): Promise<Result> {
  const leagueId = Number(form.get("leagueId"));
  return guard(async () => {
    const member = await memberFor(leagueId);
    await withdrawListing(member.id, Number(form.get("listingId")));
    revalidatePath(`/liga/${leagueId}`, "layout");
    return { ok: "Retirado del mercado" };
  }) as Promise<Result>;
}
