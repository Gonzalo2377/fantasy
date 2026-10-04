"use client";
import { useEffect, useState, useTransition } from "react";
import { parseActa, saveActa } from "@/app/admin/actions";
import type { Position } from "@/db/schema";
import type { ActaLine } from "@/lib/game";

type Row = ActaLine & { name: string; position: Position };
const NUM_FIELDS: [keyof ActaLine, string][] = [
  ["minutes", "Min"],
  ["goals", "Gol"],
  ["yellow", "Am."],
  ["ownGoals", "PP"],
  ["penSaved", "PenP"],
  ["penMissed", "PenF"],
];

export function ActaEditor({ clubLabel, matchId, roster, initial, goalsFor, goalsAgainst, actaUrl }: {
  clubLabel: string;
  matchId: number;
  roster: { id: number; name: string; position: Position }[];
  initial: ActaLine[];
  goalsFor: number;
  goalsAgainst: number;
  actaUrl: string | null;
}) {
  const blank = (id: number): ActaLine => ({ playerId: id, minutes: 0, goals: 0, ownGoals: 0, yellow: 0, red: false, penSaved: 0, penMissed: 0 });
  const [rows, setRows] = useState<Row[]>(() =>
    roster.map((p) => {
      const s = initial.find((l) => l.playerId === p.id);
      const base = s
        ? { playerId: p.id, minutes: s.minutes, goals: s.goals, ownGoals: s.ownGoals, yellow: s.yellow, red: s.red, penSaved: s.penSaved, penMissed: s.penMissed }
        : blank(p.id);
      return { ...base, name: p.name, position: p.position };
    }),
  );
  const [gf, setGf] = useState(goalsFor);
  const [ga, setGa] = useState(goalsAgainst);
  // El marcador en directo manda: si cambia, el resultado del acta se actualiza.
  useEffect(() => setGf(goalsFor), [goalsFor]);
  useEffect(() => setGa(goalsAgainst), [goalsAgainst]);
  const [url, setUrl] = useState(actaUrl ?? "");
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ error?: string; ok?: string; warnings?: string[] }>();
  const [pending, start] = useTransition();

  const set = (i: number, k: keyof ActaLine, v: number | boolean) =>
    setRows((r) => r.map((row, j) => (j === i ? { ...row, [k]: v } : row)));

  const importFrom = (src: { url?: string; text?: string }) =>
    start(async () => {
      const res = await parseActa(matchId, src);
      if ("error" in res) return setMsg({ error: res.error });
      setRows((prev) =>
        prev.map((row) => {
          const l = res.lines.find((x) => x.playerId === row.playerId);
          return l
            ? { ...row, minutes: l.minutes, goals: l.goals, ownGoals: l.ownGoals, yellow: l.yellow, red: l.red }
            : { ...row, ...blank(row.playerId) };
        }),
      );
      if (res.goalsFor != null) setGf(res.goalsFor);
      if (res.goalsAgainst != null) setGa(res.goalsAgainst);
      setMsg({ ok: `Importados ${res.lines.length} jugadores. Revisa y guarda.`, warnings: res.warnings });
    });

  return (
    <div className="space-y-3">
      <details className="card">
        <summary className="font-semibold">Importar desde la federación</summary>
        <div className="mt-3 space-y-2">
          <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL del acta" />
          <button className="btn-ghost btn-sm w-full" disabled={!url || pending} onClick={() => importFrom({ url })}>Descargar y leer acta</button>
          <textarea className="input min-h-28 py-2 text-xs" value={text} onChange={(e) => setText(e.target.value)} placeholder="…o pega aquí el texto del acta" />
          <button className="btn-ghost btn-sm w-full" disabled={!text || pending} onClick={() => importFrom({ text })}>Leer texto pegado</button>
        </div>
      </details>

      <div className="card flex items-center justify-center gap-3">
        <span className="text-sm font-semibold">Resultado</span>
        <input className="input w-16 text-center" inputMode="numeric" value={gf} onChange={(e) => setGf(Number(e.target.value) || 0)} aria-label={`Goles ${clubLabel}`} />
        <span>–</span>
        <input className="input w-16 text-center" inputMode="numeric" value={ga} onChange={(e) => setGa(Number(e.target.value) || 0)} aria-label="Goles rival" />
      </div>

      <div className="-mx-4 overflow-x-auto px-4">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="py-1">Jugador</th>
              {NUM_FIELDS.map(([, l]) => <th key={l} className="w-12 text-center">{l}</th>)}
              <th className="w-10 text-center">Roja</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.playerId} className={`border-t border-border ${r.minutes > 0 ? "" : "opacity-60"}`}>
                <td className="max-w-40 truncate py-1 pr-2"><span className={`chip pos-${r.position} mr-1`}>{r.position}</span>{r.name}</td>
                {NUM_FIELDS.map(([k]) => (
                  <td key={k} className="px-0.5">
                    <input
                      className="h-9 w-12 rounded-lg border border-border bg-surface text-center tabular-nums"
                      inputMode="numeric"
                      value={String(r[k])}
                      onChange={(e) => set(i, k, Number(e.target.value.replace(/\D/g, "")) || 0)}
                      onFocus={(e) => e.target.select()}
                      aria-label={`${k} ${r.name}`}
                    />
                  </td>
                ))}
                <td className="text-center"><input type="checkbox" className="h-5 w-5" checked={r.red} onChange={(e) => set(i, "red", e.target.checked)} aria-label={`Roja ${r.name}`} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <button className="btn-ghost btn-sm" onClick={() => setRows((rs) => rs.map((r) => ({ ...r, minutes: r.minutes || 90 })))}>Todos 90&apos;</button>
        <button className="btn flex-1" disabled={pending} onClick={() => start(async () => setMsg(await saveActa(matchId, gf, ga, rows)))}>
          {pending ? "Guardando…" : "Guardar acta y calcular puntos"}
        </button>
      </div>
      {msg?.error && <p className="text-sm font-medium text-bad">{msg.error}</p>}
      {msg?.ok && <p className="text-sm font-medium text-good">{msg.ok}</p>}
      {msg?.warnings?.map((w) => <p key={w} className="text-xs text-muted">⚠️ {w}</p>)}
    </div>
  );
}
