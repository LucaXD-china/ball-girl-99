import { describe, expect, it } from "vitest";
import { simulateTournamentBatch, simulateTournamentFlow } from "./tournamentFlowSimulator";

describe("tournament flow simulator", () => {
  it("replays the same full cup deterministically", () => {
    const options = { seed: 20260816, trainingStrategy: "expert" as const, breakthroughStrategy: "auto" as const };
    expect(simulateTournamentFlow(options)).toEqual(simulateTournamentFlow(options));
  });

  it("runs recruitment through a terminal knockout result", () => {
    const result = simulateTournamentFlow({ seed: 7 });
    expect(Object.values(result.recruitment.rarityCounts).reduce((sum, count) => sum + count, 0)).toBe(60);
    expect(result.registeredIds).toHaveLength(18);
    expect(new Set(result.registeredIds)).toHaveLength(18);
    expect(result.matches.length).toBeGreaterThanOrEqual(2);
    expect(result.matches.length).toBeLessThanOrEqual(7);
    expect(["champion", "eliminated"]).toContain(result.outcome);
  });

  it("uses the reduced recruitment budgets on the advanced captain routes", () => {
    const naya = simulateTournamentFlow({ seed: 8, captainId: "naya" });
    const irena = simulateTournamentFlow({ seed: 9, captainId: "irena" });
    expect(Object.values(naya.recruitment.rarityCounts).reduce((sum, count) => sum + count, 0)).toBe(50);
    expect(Object.values(irena.recruitment.rarityCounts).reduce((sum, count) => sum + count, 0)).toBe(40);
  });

  it("keeps focused recruitment on the selected faction", () => {
    const result = simulateTournamentFlow({ seed: 19, recruitmentStrategy: "focused", focusedFactionId: "fog_court", trainingStrategy: "none" });
    expect(new Set(result.recruitment.packFactions)).toEqual(new Set(["fog_court"]));
  });

  it("uses one documented expert strategy", () => {
    const expert = simulateTournamentBatch({ runs: 1, sampleCount: 0 });
    expect(expert.options).toMatchObject({ recruitmentStrategy: "expert", trainingStrategy: "expert", breakthroughStrategy: "auto" });
    expect(Object.values(expert.trainingFocusSessions).reduce((sum, count) => sum + count, 0)).toBeGreaterThan(0);
  });

  it("chooses one, two, or three bonds when each is the best matchup", () => {
    const counts = new Set<number>();
    for (let seed = 1; seed <= 20; seed += 1) {
      const result = simulateTournamentFlow({ seed, captainId: "saya", trainingStrategy: "expert" });
      for (const match of result.matches) counts.add(match.activeFactionBonds.length);
    }
    expect(counts).toEqual(new Set([1, 2, 3]));
  }, 30_000);

  it("runs every expert route to one terminal outcome", () => {
    for (const captainId of ["saya", "naya", "irena"] as const) {
      const report = simulateTournamentBatch({ runs: 20, seedStart: 1, captainId, sampleCount: 1 });
      expect(Object.values(report.outcomes).reduce((sum, count) => sum + count, 0), captainId).toBe(20);
      expect(report.samples, captainId).toHaveLength(1);
    }
  }, 30_000);
});
