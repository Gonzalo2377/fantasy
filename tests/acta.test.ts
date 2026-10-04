import { describe, expect, it } from "vitest";
import { parseActaText } from "@/lib/federation/acta";
import { bestMatch, nameSimilarity } from "@/lib/federation/names";

const roster = [
  { id: 1, name: "Joan García López" },
  { id: 2, name: "Marc Pérez Soler" },
  { id: 3, name: "Laia Puig Vidal" },
  { id: 4, name: "Pau Ferrer", actaName: "FERRER CASAS, PAU" },
];

describe("names", () => {
  it("matches acta format against display name", () => {
    expect(nameSimilarity("GARCIA LOPEZ, JOAN", "Joan García López")).toBe(1);
    expect(bestMatch("PEREZ SOLER, MARC", roster)?.id).toBe(2);
    expect(bestMatch("FERRER CASAS, PAU", roster)?.id).toBe(4);
    expect(bestMatch("RIVAL JUGADOR, ALGU", roster)).toBeNull();
  });
});

describe("acta parser", () => {
  const acta = `
CE Europa 2 - 1 UE Rival
Titulars
1 GARCIA LOPEZ, JOAN
5 PEREZ SOLER, MARC
9 OTRO RIVAL, NOM
Suplents
14 FERRER CASAS, PAU
Gols
12' GARCIA LOPEZ, JOAN
80' FERRER CASAS, PAU
55' PEREZ SOLER, MARC (p.p.)
Targetes
30' PEREZ SOLER, MARC Groga
Substitucions
70' Entra FERRER CASAS, PAU Surt PEREZ SOLER, MARC
Àrbitre
SENYOR ARBITRE
`;
  const r = parseActaText(acta, roster);
  const byName = Object.fromEntries(r.players.map((p) => [p.name, p]));
  it("reads score", () => {
    expect([r.goalsFor, r.goalsAgainst]).toEqual([2, 1]);
  });
  it("computes minutes from substitutions", () => {
    expect(byName["Joan García López"].minutes).toBe(90);
    expect(byName["Marc Pérez Soler"].minutes).toBe(70);
    expect(byName["Pau Ferrer"].minutes).toBe(20);
  });
  it("reads goals, own goals and cards", () => {
    expect(byName["Joan García López"].goals).toBe(1);
    expect(byName["Pau Ferrer"].goals).toBe(1);
    expect(byName["Marc Pérez Soler"].ownGoals).toBe(1);
    expect(byName["Marc Pérez Soler"].yellow).toBe(1);
  });
  it("ignores players not in roster", () => {
    expect(r.players).toHaveLength(3);
  });
});
