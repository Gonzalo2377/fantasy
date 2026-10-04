import { describe, expect, it } from "vitest";
import { scoreLine, type MatchLine } from "@/lib/scoring";
import { isAdult, ageOn } from "@/lib/age";
import { validateLineup } from "@/lib/formations";
import { pickWinner, sample } from "@/lib/market-logic";
import { nextMarketReset, madridToUtc, fromLocalInput, toLocalInput } from "@/lib/time";

const base: MatchLine = {
  position: "DEF", minutes: 90, goals: 0, ownGoals: 0, yellow: 0, red: false,
  penSaved: 0, penMissed: 0, teamGoalsFor: 1, teamGoalsAgainst: 0,
};

describe("scoring", () => {
  it("no minutes, no points", () => {
    expect(scoreLine({ ...base, minutes: 0, goals: 2 })).toBe(0);
  });
  it("defender full match, clean sheet, win", () => {
    expect(scoreLine(base)).toBe(2 + 3 + 2);
  });
  it("striker scores twice in a 3-2 win", () => {
    expect(scoreLine({ ...base, position: "DEL", goals: 2, teamGoalsFor: 3, teamGoalsAgainst: 2 })).toBe(2 + 8 + 2);
  });
  it("goalkeeper concedes 4 in a loss, gets a yellow", () => {
    expect(scoreLine({ ...base, position: "POR", teamGoalsFor: 0, teamGoalsAgainst: 4, yellow: 1 })).toBe(2 - 2 - 1);
  });
  it("red card replaces yellows; sub under 60 gets no clean sheet", () => {
    expect(scoreLine({ ...base, minutes: 30, yellow: 2, red: true, teamGoalsFor: 0, teamGoalsAgainst: 0 })).toBe(1 + 1 - 3);
  });
});

describe("age", () => {
  const on = new Date(Date.UTC(2026, 9, 4));
  it("turns 18 on birthday", () => {
    expect(isAdult("2008-10-04", on)).toBe(true);
    expect(isAdult("2008-10-05", on)).toBe(false);
    expect(ageOn("1990-01-01", on)).toBe(36);
  });
  it("rejects malformed dates", () => {
    expect(isAdult("04/10/2000", on)).toBe(false);
  });
});

describe("lineup", () => {
  it("rejects too many defenders", () => {
    const xi = [1, 2, 3, 4, 5].map((id) => ({ id, position: "DEF" as const }));
    expect(validateLineup("4-4-2", xi)).toMatch(/Demasiados/);
    expect(validateLineup("5-3-2", xi)).toBeNull();
  });
  it("rejects duplicates", () => {
    expect(validateLineup("4-4-2", [{ id: 1, position: "POR" }, { id: 1, position: "POR" }])).toMatch(/repetido/);
  });
});

describe("market", () => {
  it("highest affordable bid wins, earliest on tie", () => {
    const bids = [
      { memberId: 1, amount: 500, createdAt: 2 },
      { memberId: 2, amount: 900, createdAt: 3 },
      { memberId: 3, amount: 500, createdAt: 1 },
    ];
    expect(pickWinner(bids, 100, () => true)?.memberId).toBe(2);
    expect(pickWinner(bids, 100, (m) => m !== 2)?.memberId).toBe(3);
    expect(pickWinner(bids, 1000, () => true)).toBeNull();
  });
  it("sample returns unique items", () => {
    const s = sample([1, 2, 3, 4, 5], 3);
    expect(new Set(s).size).toBe(3);
    expect(sample([1, 2], 5)).toHaveLength(2);
  });
});

describe("time", () => {
  it("market resets at 08:00 Madrid (summer = 06:00 UTC)", () => {
    const now = Date.UTC(2026, 6, 1, 5, 0);
    expect(new Date(nextMarketReset(now)).toISOString()).toBe("2026-07-01T06:00:00.000Z");
    const after = Date.UTC(2026, 6, 1, 6, 0);
    expect(new Date(nextMarketReset(after)).toISOString()).toBe("2026-07-02T06:00:00.000Z");
  });
  it("winter offset is +1", () => {
    expect(new Date(madridToUtc(2026, 1, 15, 8)).toISOString()).toBe("2026-01-15T07:00:00.000Z");
  });
  it("local input round-trips", () => {
    const t = fromLocalInput("2026-11-08T12:00");
    expect(toLocalInput(t)).toBe("2026-11-08T12:00");
  });
});
