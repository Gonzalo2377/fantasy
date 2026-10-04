/** Normaliza nombres: "GARCÍA LÓPEZ, JOAN" y "Joan Garcia Lopez" producen los mismos tokens. */
export function nameTokens(name: string): string[] {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s,.'-]/g, " ")
    .split(/[\s,.'-]+/)
    .filter((t) => t.length > 1 && !["de", "del", "la", "i", "y"].includes(t));
}

/** Puntuación de parecido entre 0 y 1. */
export function nameSimilarity(a: string, b: string): number {
  const ta = new Set(nameTokens(a));
  const tb = new Set(nameTokens(b));
  if (!ta.size || !tb.size) return 0;
  let common = 0;
  for (const t of ta) if (tb.has(t)) common++;
  return common / Math.min(ta.size, tb.size);
}

export function bestMatch<T extends { id: number; name: string; actaName?: string | null }>(
  name: string,
  roster: T[],
): T | null {
  let best: T | null = null;
  let bestScore = 0;
  for (const p of roster) {
    const s = Math.max(nameSimilarity(name, p.name), p.actaName ? nameSimilarity(name, p.actaName) : 0);
    if (s > bestScore) {
      best = p;
      bestScore = s;
    }
  }
  return bestScore >= 0.99 || (bestScore >= 0.66 && nameTokens(name).length >= 2) ? best : null;
}
