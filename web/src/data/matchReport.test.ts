import { describe, expect, it } from "vitest";
import { playableCharacters } from "./gameData";
import { buildTournamentCharacters, TOURNAMENT_STARTER_CHARACTER_IDS } from "./tournamentSquad";
import { recommendLineup, simulateMatch, type FormationId, type MatchResult } from "./matchSimulator";
import { clubBlueprints, counterFormations, type TournamentStage } from "./tournamentJourney";
import { attributionKeyLabels, buildMatchAttribution } from "./matchReport";

const starterSquad = {
  collection: Object.fromEntries(TOURNAMENT_STARTER_CHARACTER_IDS.map((id) => [id, 1])),
  characterProgress: Object.fromEntries(TOURNAMENT_STARTER_CHARACTER_IDS.map((id) => [id, { focus: { attack: 0, playmaking: 0, defense: 0 }, breakthroughRank: 0 }])),
  skillInventory: {},
  skillLoadouts: {},
};

function base(opponentIndex = 0) {
  const homePlayers = buildTournamentCharacters(playableCharacters, starterSquad);
  const starterIds = new Set<string>(TOURNAMENT_STARTER_CHARACTER_IDS);
  const awayPlayers = playableCharacters.filter((player) => !starterIds.has(player.character_id));
  const opponent = clubBlueprints[opponentIndex];
  return { homePlayers, awayPlayers, opponent };
}

function attributionFor(input: {
  homeAttackFormationId: FormationId;
  homeDefenseFormationId: FormationId;
  awayAttackFormationId: FormationId;
  awayDefenseFormationId: FormationId;
  opponentIndex?: number;
  stage?: TournamentStage;
  result?: MatchResult;
}) {
  const { homePlayers, awayPlayers, opponent } = base(input.opponentIndex);
  const homeLineup = recommendLineup(homePlayers, input.homeAttackFormationId, input.homeDefenseFormationId);
  const awayLineup = recommendLineup(awayPlayers, input.awayAttackFormationId, input.awayDefenseFormationId);
  const result = input.result ?? simulateMatch({
    characters: [...homePlayers, ...awayPlayers],
    homeLineup,
    homeAttackFormationId: input.homeAttackFormationId,
    homeDefenseFormationId: input.homeDefenseFormationId,
    awayLineup,
    awayAttackFormationId: input.awayAttackFormationId,
    awayDefenseFormationId: input.awayDefenseFormationId,
    fixtureSeed: 42,
  });
  return buildMatchAttribution({
    homePlayers,
    awayPlayers,
    opponent,
    homeLineup,
    awayLineup,
    homeAttackFormationId: input.homeAttackFormationId,
    homeDefenseFormationId: input.homeDefenseFormationId,
    awayAttackFormationId: input.awayAttackFormationId,
    awayDefenseFormationId: input.awayDefenseFormationId,
    stage: input.stage ?? "round_of_16",
    result,
  });
}

describe("web match attribution report", () => {
  it("returns four labeled lines plus a luck copy", () => {
    const attribution = attributionFor({
      homeAttackFormationId: "4-2-3-1",
      homeDefenseFormationId: "4-4-2",
      awayAttackFormationId: clubBlueprints[0].attackFormationId,
      awayDefenseFormationId: clubBlueprints[0].defenseFormationId,
    });
    expect(attribution.lines.map((line) => line.key)).toEqual(["formation_counter", "squad_strength", "lineup_fit", "bond"]);
    expect(typeof attribution.luckCopy).toBe("string");
    expect(attribution.luckCopy.length).toBeGreaterThan(0);
    for (const line of attribution.lines) {
      expect(attributionKeyLabels[line.key]).toBeTruthy();
      expect(line.copy.length).toBeGreaterThan(0);
      expect(["big", "small", "none"]).toContain(line.impact);
      expect(["up", "down", "even"]).toContain(line.direction);
    }
  });

  it("warns that the opponent may adapt when both formation axes counter", () => {
    const { opponent } = base(1);
    const counter = counterFormations(opponent);
    const attribution = attributionFor({
      homeAttackFormationId: counter.attackFormationId,
      homeDefenseFormationId: counter.defenseFormationId,
      awayAttackFormationId: opponent.attackFormationId,
      awayDefenseFormationId: opponent.defenseFormationId,
      opponentIndex: 1,
    });
    const line = attribution.lines.find((item) => item.key === "formation_counter")!;
    expect(line.direction).toBe("up");
    expect(["small", "big"]).toContain(line.impact);
    expect(line.copy).toBe("本轮阵型完克对手，当心对手变阵。");
  });

  it("keeps the factual counter copy when only one formation axis counters", () => {
    const { opponent } = base();
    const attribution = attributionFor({
      homeAttackFormationId: "3-5-2",
      homeDefenseFormationId: "4-4-2",
      awayAttackFormationId: opponent.attackFormationId,
      awayDefenseFormationId: opponent.defenseFormationId,
    });
    const line = attribution.lines.find((item) => item.key === "formation_counter")!;
    expect(line.direction).toBe("up");
    expect(line.copy).toBe("阵型对位克制了对手。");
  });

  it("reports bad luck when xG is higher but the match is lost", () => {
    const { homePlayers, awayPlayers, opponent } = base();
    const homeAttackFormationId: FormationId = "4-2-3-1";
    const homeDefenseFormationId: FormationId = "4-4-2";
    const homeLineup = recommendLineup(homePlayers, homeAttackFormationId, homeDefenseFormationId);
    const awayLineup = recommendLineup(awayPlayers, opponent.attackFormationId, opponent.defenseFormationId);
    const result = simulateMatch({
      characters: [...homePlayers, ...awayPlayers],
      homeLineup,
      homeAttackFormationId,
      homeDefenseFormationId,
      awayLineup,
      awayAttackFormationId: opponent.attackFormationId,
      awayDefenseFormationId: opponent.defenseFormationId,
      fixtureSeed: 42,
    });
    const lostWithMoreXg: MatchResult = { ...result, homeScore: 0, awayScore: 1, homeXg: 2.1, awayXg: 0.8 };
    const attribution = buildMatchAttribution({
      homePlayers,
      awayPlayers,
      opponent,
      homeLineup,
      awayLineup,
      homeAttackFormationId,
      homeDefenseFormationId,
      awayAttackFormationId: opponent.attackFormationId,
      awayDefenseFormationId: opponent.defenseFormationId,
      stage: "round_of_16",
      result: lostWithMoreXg,
    });
    expect(attribution.luckCopy).toContain("运气略差");
  });

  it("reports multiple active bonds as a significant match factor", () => {
    const { homePlayers: originalHomePlayers, awayPlayers, opponent } = base();
    const homeAttackFormationId: FormationId = "4-2-3-1";
    const homeDefenseFormationId: FormationId = "4-4-2";
    const homeLineup = recommendLineup(originalHomePlayers, homeAttackFormationId, homeDefenseFormationId);
    const starterIds = Object.values(homeLineup).filter((id): id is string => Boolean(id));
    const factions = ["fog_court", "fog_court", "fog_court", "iron_engine", "iron_engine", "iron_engine", "gaul_iris", "scarlet_toros", "samba_union", "pampas_silver", "sakura_link"] as const;
    const factionById = new Map(starterIds.map((id, index) => [id, factions[index]!]));
    const homePlayers = originalHomePlayers.map((player) => ({ ...player, faction_id: factionById.get(player.character_id) ?? player.faction_id }));
    const awayLineup = recommendLineup(awayPlayers, opponent.attackFormationId, opponent.defenseFormationId);
    const result = simulateMatch({
      characters: [...homePlayers, ...awayPlayers],
      homeLineup,
      homeAttackFormationId,
      homeDefenseFormationId,
      awayLineup,
      awayAttackFormationId: opponent.attackFormationId,
      awayDefenseFormationId: opponent.defenseFormationId,
      fixtureSeed: 73,
    });

    const attribution = buildMatchAttribution({
      homePlayers,
      awayPlayers,
      opponent,
      homeLineup,
      awayLineup,
      homeAttackFormationId,
      homeDefenseFormationId,
      awayAttackFormationId: opponent.attackFormationId,
      awayDefenseFormationId: opponent.defenseFormationId,
      stage: "round_of_16",
      result,
    });

    expect(attribution.lines.find(({ key }) => key === "bond")).toMatchObject({
      impact: "big",
      direction: "up",
      copy: "本场激活了 2 个羁绊，已经形成显著加成。",
    });
  });
});
