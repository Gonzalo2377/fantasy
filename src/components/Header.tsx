import Link from "next/link";

export function Header({ title, subtitle, back, right }: { title: string; subtitle?: string; back?: string; right?: React.ReactNode }) {
  return (
    <header className="safe-top sticky top-0 z-30 bg-brand text-white">
      <div className="flex min-h-14 items-center gap-2 px-4 py-2">
        {back && (
          <Link href={back} aria-label="Volver" className="-ml-2 rounded-full p-2 active:bg-white/10">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M15 18l-6-6 6-6" /></svg>
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold leading-tight">{title}</h1>
          {subtitle && <p className="truncate text-xs text-white/75">{subtitle}</p>}
        </div>
        {right}
      </div>
    </header>
  );
}
