import { NextResponse } from "next/server";
import { matchday } from "@/lib/matchday";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const gw = new URL(req.url).searchParams.get("jornada");
  const data = await matchday(gw ? Number(gw) : undefined);
  return NextResponse.json(data, { headers: { "cache-control": "no-store" } });
}
