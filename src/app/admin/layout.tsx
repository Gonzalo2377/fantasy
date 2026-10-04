import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <header className="safe-top sticky top-0 z-30 bg-[#111827] text-white">
        <div className="flex items-center gap-2 px-4 py-3">
          <Link href="/" className="text-sm text-white/70">← App</Link>
          <h1 className="flex-1 text-center font-bold">Administración</h1>
          <span className="w-10" />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 text-sm">
          {[["/admin", "Hoy"], ["/admin/jornadas", "Jornadas"], ["/admin/jugadores", "Jugadores"], ["/admin/equipos", "Equipos"]].map(([h, l]) => (
            <Link key={h} href={h} className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 font-semibold">{l}</Link>
          ))}
        </nav>
      </header>
      <main className="px-4 py-4">{children}</main>
    </>
  );
}
