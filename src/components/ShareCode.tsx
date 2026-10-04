"use client";
import { useState } from "react";
import { APP_NAME } from "@/lib/brand";

export function ShareCode({ code, name }: { code: string; name: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="chip gap-1 bg-white/15 px-3 py-1 text-white"
      onClick={async () => {
        const text = `Únete a mi liga "${name}" en ${APP_NAME} con el código ${code}: ${location.origin}`;
        try {
          if (navigator.share) await navigator.share({ title: APP_NAME, text });
          else {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }
        } catch {}
      }}
    >
      {copied ? "¡Copiado!" : <>Código <b className="tracking-widest">{code}</b> ↗</>}
    </button>
  );
}
