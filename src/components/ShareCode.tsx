"use client";
import { useState } from "react";

export function ShareCode({ code, name }: { code: string; name: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="chip gap-1 bg-white/15 px-3 py-1 text-white"
      onClick={async () => {
        const text = `Únete a mi liga "${name}" en Fantasy Europa con el código ${code}: ${location.origin}`;
        try {
          if (navigator.share) await navigator.share({ title: "Fantasy Europa", text });
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
