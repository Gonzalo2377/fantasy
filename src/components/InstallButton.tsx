"use client";
import { useEffect, useState } from "react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Botón para instalar la web como app (Android/Chrome) o instrucciones para iPhone. */
export function InstallButton() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(true);
  const [ios, setIos] = useState(false);
  const [showIos, setShowIos] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (installed || (!evt && !ios)) return null;

  return (
    <div className="card flex items-center gap-3 border-brand-2/40 bg-brand/5">
      <div className="text-2xl" aria-hidden>📲</div>
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold">Instala la app</p>
        {showIos ? (
          <p className="text-muted">Pulsa <b>Compartir</b> <span aria-hidden>⎋</span> y luego <b>«Añadir a pantalla de inicio»</b>.</p>
        ) : (
          <p className="text-muted">Acceso directo desde tu pantalla de inicio.</p>
        )}
      </div>
      {!showIos && (
        <button
          className="btn btn-sm"
          onClick={async () => {
            if (evt) {
              await evt.prompt();
              setEvt(null);
            } else setShowIos(true);
          }}
        >
          Instalar
        </button>
      )}
    </div>
  );
}
