export interface BidLike {
  memberId: number;
  amount: number;
  createdAt: number;
}

/**
 * Decide quién gana una subasta: la puja más alta (en empate, la más antigua)
 * de un participante que todavía tenga dinero y hueco en la plantilla.
 */
export function pickWinner<B extends BidLike>(
  bids: B[],
  minPrice: number,
  canAfford: (memberId: number, amount: number) => boolean,
): B | null {
  const sorted = [...bids]
    .filter((b) => b.amount >= minPrice)
    .sort((a, b) => b.amount - a.amount || a.createdAt - b.createdAt);
  return sorted.find((b) => canAfford(b.memberId, b.amount)) ?? null;
}

/** Selección aleatoria sin repetición (Fisher–Yates parcial). */
export function sample<T>(arr: T[], n: number, rnd: () => number = Math.random): T[] {
  const a = [...arr];
  const k = Math.min(n, a.length);
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(rnd() * (a.length - i));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, k);
}
