import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { ServiceWorker } from "@/components/ServiceWorker";
import { isDemoDb } from "@/db";
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
        {isDemoDb && (
          <div className="bg-amber-400 px-4 py-1.5 text-center text-xs font-medium text-amber-950">
            Modo demo: datos de ejemplo que se reinician solos. Prueba la liga del CE Europa con el código EUROPA
          </div>
        )}
        <div className="mx-auto min-h-dvh max-w-xl pb-24">{children}</div>
        <BottomNav />
        <ServiceWorker />
      </body>
    </html>
  );
}
