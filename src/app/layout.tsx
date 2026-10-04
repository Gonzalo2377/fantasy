import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { ServiceWorker } from "@/components/ServiceWorker";
import { dbConfigured } from "@/db";
import { APP_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: "El fantasy de tu club: todos sus equipos +18, masculino y femenino.",
  manifest: "/manifest.webmanifest",
  applicationName: APP_NAME,
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "black-translucent" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0b3f91" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1020" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="antialiased">
        {dbConfigured ? (
          <>
            <div className="mx-auto min-h-dvh max-w-xl pb-24">{children}</div>
            <BottomNav />
          </>
        ) : (
          <main className="mx-auto max-w-xl space-y-3 px-5 py-12">
            <h1 className="text-2xl font-extrabold">Falta conectar la base de datos</h1>
            <p>En Vercel la app necesita una base de datos para guardar usuarios, ligas y fichajes.</p>
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              <li>En el proyecto de Vercel: <b>Storage → Create Database → Turso</b> (o crea una en turso.tech).</li>
              <li>Comprueba que en <b>Settings → Environment Variables</b> están la URL (<code>libsql://…</code>) y el token.</li>
              <li>Vuelve a desplegar (<b>Deployments → Redeploy</b>).</li>
            </ol>
          </main>
        )}
        <ServiceWorker />
      </body>
    </html>
  );
}
