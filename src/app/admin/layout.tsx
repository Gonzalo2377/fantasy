import Link from "next/link";
import { chooseAdminClub } from "@/app/admin/actions";
import { adminClub } from "@/lib/admin-club";
import { requireAdmin } from "@/lib/auth";
import { listClubs } from "@/lib/clubs";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const [clubs, club] = await Promise.all([listClubs(), adminClub()]);
  return (
    <>
      <header className="safe-top sticky top-0 z-30 bg-[#111827] text-white">
        <div className="flex items-center gap-2 px-4 py-3">
          <Link href="/" className="text-sm text-white/70">← App</Link>
          <h1 className="flex-1 text-center font-bold">Administración</h1>
          <span className="w-10" />
        </div>
        {clubs.length > 0 && (
          <form action={chooseAdminClub} className="flex gap-2 px-4 pb-2">
            <select name="clubId" defaultValue={club?.id} className="min-w-0 flex-1 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold">
              {clubs.map((c) => <option key={c.id} value={c.id} className="text-black">{c.name}</option>)}
            </select>
            <button className="rounded-lg bg-white/20 px-3 py-1.5 text-sm font-semibold">Cambiar</button>
          </form>
        )}
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 text-sm">
          {[["/admin", "Hoy"], ["/admin/jornadas", "Jornadas"], ["/admin/jugadores", "Jugadores"], ["/admin/equipos", "Equipos"], ["/admin/clubes", "Clubs"]].map(([h, l]) => (
            <Link key={h} href={h} className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 font-semibold">{l}</Link>
          ))}
        </nav>
      </header>
      <main className="px-4 py-4">{children}</main>
    </>
  );
}
