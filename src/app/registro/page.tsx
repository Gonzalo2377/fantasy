import Link from "next/link";
import { redirect } from "next/navigation";
import { register } from "@/app/actions";
import { ActionForm, Submit } from "@/components/ActionForm";
import { Logo } from "@/components/Logo";
import { currentUser } from "@/lib/auth";

export const metadata = { title: "Crear cuenta" };

export default async function RegisterPage() {
  if (await currentUser()) redirect("/");
  return (
    <main className="safe-top flex min-h-dvh flex-col justify-center px-5 py-10">
      <div className="mb-6 flex flex-col items-center text-center">
        <Logo size={64} />
        <h1 className="mt-3 text-2xl font-extrabold">Crea tu cuenta</h1>
      </div>
      <ActionForm action={register} className="card space-y-3">
        <div>
          <label className="label" htmlFor="name">Nombre</label>
          <input className="input" id="name" name="name" autoComplete="nickname" required minLength={2} maxLength={40} />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <label className="label" htmlFor="password">Contraseña</label>
          <input className="input" id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
        </div>
        <label className="flex items-start gap-3 py-1 text-sm">
          <input type="checkbox" name="adult" className="mt-0.5 h-5 w-5 accent-[var(--brand)]" required />
          <span>Confirmo que soy mayor de 18 años.</span>
        </label>
        <Submit>Crear cuenta</Submit>
      </ActionForm>
      <p className="mt-6 text-center text-sm text-muted">
        ¿Ya tienes cuenta? <Link href="/login" className="font-semibold text-brand-2">Entra</Link>
      </p>
    </main>
  );
}
