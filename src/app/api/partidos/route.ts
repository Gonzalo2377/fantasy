import { NextResponse } from "next/server";
import { matchday } from "@/lib/matchday";

export const dynamic = "force-dynamic";

/** /api/partidos?club=ID[&jornada=ID] */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const club = Number(params.get("club"));
  if (!Number.isInteger(club) || club <= 0) return NextResponse.json({ error: "Falta el club" }, { status: 400 });
  const gw = params.get("jornada");
  const data = await matchday(club, gw ? Number(gw) : undefined);
  return NextResponse.json(data, { headers: { "cache-control": "no-store" } });
}
