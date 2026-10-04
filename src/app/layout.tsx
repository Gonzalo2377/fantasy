import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { ServiceWorker } from "@/components/ServiceWorker";
import { isDemoDb } from "@/db";

export const metadata: Metadata = {
  title: { default: "Fantasy Europa", template: "%s · Fantasy Europa" },
  description: "El fantasy de todos los equipos +18 del CE Europa: masculino y femenino.",
  manifest: "/manifest.webmanifest",
  applicationName: "Fantasy Europa",
  appleWebApp: { capable: true, title: "Fantasy Europa", statusBarStyle: "black-translucent" },
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
            Modo demo: datos de ejemplo que se reinician solos. Entra con laia@europa.test / europa1234
          </div>
        )}
        <div className="mx-auto min-h-dvh max-w-xl pb-24">{children}</div>
        <BottomNav />
        <ServiceWorker />
      </body>
    </html>
  );
}
