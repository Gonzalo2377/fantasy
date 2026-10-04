import Link from "next/link";
import { redirect } from "next/navigation";
import { login } from "@/app/actions";
import { ActionForm, Submit } from "@/components/ActionForm";
import { Logo } from "@/components/Logo";
import { currentUser } from "@/lib/auth";

export const metadata = { title: "Entrar" };

export default async function LoginPage() {
  if (await currentUser()) redirect("/");
  return (
    <main className="safe-top flex min-h-dvh flex-col justify-center px-5 py-10">
      <div className="mb-8 flex flex-col items-center text-center">
        <Logo size={72} />
        <h1 className="mt-3 text-2xl font-extrabold">Fantasy Europa</h1>
        <p className="text-sm text-muted">Masculino y femenino. Un solo equipo.</p>
      </div>
      <ActionForm action={login} className="card space-y-3">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <label className="label" htmlFor="password">Contraseña</label>
          <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <Submit>Entrar</Submit>
      </ActionForm>
      <p className="mt-6 text-center text-sm text-muted">
        ¿No tienes cuenta? <Link href="/registro" className="font-semibold text-brand-2">Regístrate</Link>
      </p>
    </main>
  );
}
