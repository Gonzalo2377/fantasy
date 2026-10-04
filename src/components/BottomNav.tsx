"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const KEY = "fe:lastLeague";

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  home: "M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10",
  trophy: "M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM17 5h3v2a4 4 0 0 1-3 4M7 5H4v2a4 4 0 0 0 3 4",
  shirt: "M8 3l-5 3 2 5 3-1v11h8V10l3 1 2-5-5-3a4 4 0 0 1-8 0z",
  market: "M3 7h18l-2 13H5L3 7zM8 7a4 4 0 0 1 8 0",
  ball: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7l4 3-1.5 5h-5L8 10l4-3z",
};

export function BottomNav() {
  const pathname = usePathname();
  const [league, setLeague] = useState<string | null>(null);

  useEffect(() => {
    const m = pathname.match(/^\/liga\/(\d+)/);
    try {
      if (m) localStorage.setItem(KEY, m[1]);
      setLeague(m?.[1] ?? localStorage.getItem(KEY));
    } catch {
      setLeague(m?.[1] ?? null);
    }
  }, [pathname]);

  if (["/login", "/registro"].includes(pathname) || pathname.startsWith("/admin")) return null;

  const items = [
    { href: "/", label: "Inicio", icon: ICONS.home, active: pathname === "/" },
    { href: league ? `/liga/${league}` : "/", label: "Liga", icon: ICONS.trophy, active: /^\/liga\/\d+$/.test(pathname) },
    { href: league ? `/liga/${league}/equipo` : "/", label: "Equipo", icon: ICONS.shirt, active: pathname.endsWith("/equipo") },
    { href: league ? `/liga/${league}/mercado` : "/", label: "Mercado", icon: ICONS.market, active: pathname.endsWith("/mercado") },
    { href: "/partidos", label: "Partidos", icon: ICONS.ball, active: pathname.startsWith("/partidos") },
  ];

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur">
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {items.map((it) => (
          <li key={it.label}>
            <Link
              href={it.href}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${it.active ? "text-brand-2" : "text-muted"}`}
            >
              <Icon d={it.icon} />
              {it.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
