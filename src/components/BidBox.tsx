"use client";
import { useState } from "react";
import { bidAction, cancelBidAction, withdrawListingAction } from "@/app/actions";
import { ActionForm, Submit } from "@/components/ActionForm";
import { money } from "@/lib/money";

export function BidBox({ leagueId, listingId, minPrice, myBid, mine }: { leagueId: number; listingId: number; minPrice: number; myBid: number | null; mine: boolean }) {
  const [amount, setAmount] = useState(String(myBid ?? minPrice));
  if (mine) {
    return (
      <ActionForm action={withdrawListingAction} className="mt-3">
        <input type="hidden" name="leagueId" value={leagueId} />
        <input type="hidden" name="listingId" value={listingId} />
        <Submit className="btn-ghost btn-sm w-full">Retirar del mercado</Submit>
      </ActionForm>
    );
  }
  const n = Number(amount.replace(/[^\d]/g, "")) || 0;
  const bump = (pct: number) => setAmount(String(Math.round((Math.max(n, minPrice) * (1 + pct)) / 10_000) * 10_000));
  return (
    <div className="mt-3 space-y-2">
      <ActionForm action={bidAction}>
        <input type="hidden" name="leagueId" value={leagueId} />
        <input type="hidden" name="listingId" value={listingId} />
        <div className="flex gap-2">
          <input
            className="input flex-1 tabular-nums"
            name="amount"
            inputMode="numeric"
            value={n ? n.toLocaleString("es-ES") : ""}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
            aria-label="Cantidad de la puja en euros"
          />
          <Submit className="btn" pendingText="…">{myBid ? "Cambiar" : "Pujar"}</Submit>
        </div>
        <div className="mt-2 flex gap-2">
          {[0.05, 0.1, 0.25].map((p) => (
            <button key={p} type="button" className="chip bg-surface-2 px-3 py-1" onClick={() => bump(p)}>+{p * 100}%</button>
          ))}
          <span className="ml-auto self-center text-xs text-muted">{money(n)}</span>
        </div>
      </ActionForm>
      {myBid && (
        <ActionForm action={cancelBidAction}>
          <input type="hidden" name="leagueId" value={leagueId} />
          <input type="hidden" name="listingId" value={listingId} />
          <Submit className="text-sm font-semibold text-bad">Retirar mi puja de {money(myBid)}</Submit>
        </ActionForm>
      )}
    </div>
  );
}
