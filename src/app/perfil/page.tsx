import Link from "next/link";
import { logout } from "@/app/actions";
import { Header } from "@/components/Header";
import { InstallButton } from "@/components/InstallButton";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Perfil" };

export default async function ProfilePage() {
  const user = await requireUser();
  return (
    <>
      <Header title="Perfil" back="/" />
      <main className="space-y-3 px-4 pt-4">
        <div className="card">
          <p className="text-lg font-bold">{user.name}</p>
          <p className="text-sm text-muted">{user.email}</p>
        </div>
        <InstallButton />
        <Link href="/reglas" className="btn-ghost w-full">Cómo se puntúa</Link>
        {user.isAdmin && <Link href="/admin" className="btn-ghost w-full">Panel de administración</Link>}
        <form action={logout}>
          <button className="btn-ghost w-full text-bad">Cerrar sesión</button>
        </form>
      </main>
    </>
  );
}
