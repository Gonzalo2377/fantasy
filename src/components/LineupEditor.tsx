"use client";
import { useMemo, useState, useTransition } from "react";
import type { Position } from "@/db/schema";
import { saveLineupAction, listForSaleAction, sellNowAction } from "@/app/actions";
import { ActionForm, Submit } from "@/components/ActionForm";
import { PointsPill, PosBadge, TeamTag } from "@/components/PlayerBits";
import { FORMATIONS, POSITIONS, POSITION_LABEL } from "@/lib/formations";
import { money } from "@/lib/money";

export type SquadPlayer = {
  id: number;
  name: string;
  position: Position;
  value: number;
  teamShort: string;
  gender: "M" | "F";
  total: number;
  last: number[];
  listed: boolean;
};

type Slots = Record<Position, (number | null)[]>;

function buildSlots(formation: string, ids: number[], squad: SquadPlayer[]): Slots {
  const shape = FORMATIONS[formation];
  const byId = new Map(squad.map((p) => [p.id, p]));
  const slots = {} as Slots;
  for (const pos of POSITIONS) {
    const chosen = ids.filter((id) => byId.get(id)?.position === pos).slice(0, shape[pos]);
    slots[pos] = [...chosen, ...Array(shape[pos] - chosen.length).fill(null)];
  }
  return slots;
}

function shortName(n: string) {
  const parts = n.split(" ");
  return parts.length > 1 ? `${parts[0][0]}. ${parts[1]}` : n;
}

export function LineupEditor({
  leagueId,
  squad,
  initialFormation,
  initialIds,
  initialCaptain,
  locked,
}: {
  leagueId: number;
  squad: SquadPlayer[];
  initialFormation: string;
  initialIds: number[];
  initialCaptain: number | null;
  locked: boolean;
}) {
  const [formation, setFormation] = useState(initialFormation);
  const [slots, setSlots] = useState<Slots>(() => buildSlots(initialFormation, initialIds, squad));
  const [captain, setCaptain] = useState<number | null>(initialCaptain);
  const [picking, setPicking] = useState<{ pos: Position; idx: number } | null>(null);
  const [detail, setDetail] = useState<SquadPlayer | null>(null);
  const [msg, setMsg] = useState<{ error?: string; ok?: string }>();
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const byId = useMemo(() => new Map(squad.map((p) => [p.id, p])), [squad]);
  const starters = POSITIONS.flatMap((p) => slots[p]).filter((x): x is number => x != null);

  const changeFormation = (f: string) => {
    setFormation(f);
    setSlots(buildSlots(f, starters, squad));
    setDirty(true);
  };

  const assign = (playerId: number | null) => {
    if (!picking) return;
    setSlots((prev) => {
      const next = { ...prev, [picking.pos]: [...prev[picking.pos]] };
      next[picking.pos][picking.idx] = playerId;
      return next;
    });
    if (captain && captain === slots[picking.pos][picking.idx]) setCaptain(null);
    setPicking(null);
    setDirty(true);
  };

  const save = () =>
    start(async () => {
      const res = await saveLineupAction(leagueId, formation, starters, captain);
      setMsg(res);
      if (!res?.error) setDirty(false);
    });

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <select className="input w-auto font-semibold" value={formation} disabled={locked} onChange={(e) => changeFormation(e.target.value)} aria-label="Formación">
          {Object.keys(FORMATIONS).map((f) => <option key={f}>{f}</option>)}
        </select>
        <span className="flex-1 text-right text-sm text-muted">{starters.length}/11 titulares</span>
      </div>

      <div className="pitch relative overflow-hidden rounded-2xl border-2 border-white/30 px-2 py-4">
        <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t-2 border-white/25" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/25" />
        {(["DEL", "MED", "DEF", "POR"] as Position[]).map((pos) => (
          <div key={pos} className="relative flex justify-around py-2">
            {slots[pos].map((pid, idx) => {
              const p = pid ? byId.get(pid) : null;
              return (
                <button
                  key={idx}
                  disabled={locked}
                  onClick={() => setPicking({ pos, idx })}
                  className="flex w-16 flex-col items-center gap-1 text-white disabled:cursor-default"
                >
                  <span className={`relative flex h-11 w-11 items-center justify-center rounded-full border-2 text-xs font-bold shadow-md ${p ? `pos-${pos} border-white` : "border-dashed border-white/70 bg-black/15"}`}>
                    {p ? (p.gender === "F" ? "♀" : "♂") : "+"}
                    {p && captain === p.id && <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-black text-black">C</span>}
                  </span>
                  <span className="w-full truncate rounded bg-black/45 px-1 text-[10px] font-semibold leading-4">{p ? shortName(p.name) : pos}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {!locked && (
        <div className="sticky bottom-20 z-20 mt-3">
          <button className="btn w-full shadow-lg" disabled={pending || !dirty} onClick={save}>
            {pending ? "Guardando…" : dirty ? "Guardar alineación" : "Alineación guardada ✓"}
          </button>
          {msg?.error && <p className="mt-1 text-center text-sm font-medium text-bad">{msg.error}</p>}
        </div>
      )}

      <h2 className="section-title">Plantilla ({squad.length})</h2>
      <ul className="overflow-hidden rounded-2xl border border-border bg-surface">
        {[...squad].sort((a, b) => POSITIONS.indexOf(a.position) - POSITIONS.indexOf(b.position) || b.total - a.total).map((p) => (
          <li key={p.id} className="border-b border-border last:border-0">
            <button onClick={() => setDetail(p)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left active:bg-surface-2">
              <PosBadge position={p.position} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {p.name} {starters.includes(p.id) && <span className="text-xs text-good">● titular</span>}
                  {p.listed && <span className="ml-1 text-xs text-accent">en venta</span>}
                </p>
                <p className="flex items-center gap-1 text-xs text-muted"><TeamTag short={p.teamShort} gender={p.gender} /> {money(p.value)}</p>
              </div>
              <PointsPill points={p.total} />
            </button>
          </li>
        ))}
      </ul>

      {picking && (
        <Sheet onClose={() => setPicking(null)} title={`Elegir ${POSITION_LABEL[picking.pos].toLowerCase()}`}>
          <ul className="space-y-1">
            {squad
              .filter((p) => p.position === picking.pos)
              .sort((a, b) => b.total - a.total)
              .map((p) => {
                const inUse = starters.includes(p.id) && slots[picking.pos][picking.idx] !== p.id;
                return (
                  <li key={p.id}>
                    <button
                      disabled={inUse}
                      onClick={() => assign(p.id)}
                      className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left active:bg-surface-2 disabled:opacity-40"
                    >
                      <PosBadge position={p.position} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{p.name}</span>
                        <span className="text-xs text-muted">{p.teamShort} · últimos: {p.last.length ? p.last.join(", ") : "—"}</span>
                      </span>
                      <PointsPill points={p.total} />
                    </button>
                  </li>
                );
              })}
          </ul>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {slots[picking.pos][picking.idx] && (
              <>
                <button className="btn-ghost" onClick={() => assign(null)}>Quitar</button>
                <button
                  className="btn-ghost"
                  onClick={() => {
                    setCaptain(slots[picking.pos][picking.idx]);
                    setDirty(true);
                    setPicking(null);
                  }}
                >
                  Hacer capitán (x2)
                </button>
              </>
            )}
          </div>
        </Sheet>
      )}

      {detail && (
        <Sheet onClose={() => setDetail(null)} title={detail.name}>
          <div className="mb-4 flex items-center gap-2 text-sm">
            <PosBadge position={detail.position} /> <TeamTag short={detail.teamShort} gender={detail.gender} />
            <span className="text-muted">Valor {money(detail.value)} · {detail.total} pts</span>
          </div>
          <a href={`/jugador/${detail.id}`} className="btn-ghost mb-3 w-full">Ver ficha</a>
          {!detail.listed && (
            <ActionForm action={listForSaleAction} className="card mb-3 space-y-2">
              <input type="hidden" name="leagueId" value={leagueId} />
              <input type="hidden" name="playerId" value={detail.id} />
              <label className="label" htmlFor="price">Precio mínimo en el mercado (€)</label>
              <input className="input" id="price" name="price" inputMode="numeric" defaultValue={detail.value} />
              <Submit className="btn w-full">Poner en el mercado</Submit>
            </ActionForm>
          )}
          <ActionForm action={sellNowAction} confirm={`¿Vender a ${detail.name} ya por ${money(detail.value)}?`}>
            <input type="hidden" name="leagueId" value={leagueId} />
            <input type="hidden" name="playerId" value={detail.id} />
            <Submit className="btn-ghost w-full text-bad">Vender ya por {money(detail.value)}</Submit>
          </ActionForm>
        </Sheet>
      )}
    </div>
  );
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        role="dialog"
        aria-label={title}
        className="safe-bottom max-h-[85dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-surface p-4 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border" />
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="rounded-full p-2 text-muted" aria-label="Cerrar">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
