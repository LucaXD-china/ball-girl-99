import { describe, expect, it } from "vitest";
import { attackFormations, cupFactionBondEffects, cupFactionBondProfiles, positionFit, recommendLineup, simulateMatch } from "./matchSimulator";
import {
  clubBlueprints,
  adaptOpponentForSecondLeg,
  counterFormations,
  fixtureSeed,
  generateOpponent,
  generateTournament,
  nativeSixStarTargetForStage,
  opponentRarityTargetForPool,
  opponentRarityTargets,
  playerClub,
  stageOrder,
  TOURNAMENT_ROSTER_SIZE,
  tournamentPreparationEffects,
} from "./tournamentJourney";
import { STORY_OPPONENT_IDS } from "./opponentStories";
import { TOURNAMENT_STARTER_CHARACTER_IDS } from "./tournamentSquad";
import { roster } from "./gameData";
import { tournamentCaptainIds, tournamentCaptainRoutes, zeroOpponentRarityBonus } from "./tournamentCaptain";
import { resolveCharacterArtwork, resolveDisplayCharacterCard, characterArtworkAssetId } from "../services/assetResolver";

const starterIds: string[] = [...TOURNAMENT_STARTER_CHARACTER_IDS];

describe("99-day tournament data layered on the existing match system", () => {
  it("injects each story founder exactly once across every supported opponent formation", () => {
    for (const [index, blueprint] of clubBlueprints.entries()) {
      for (const [stage, founderId, allowed] of [
        ["semi_final", "founder_samba_union_7", ["RW", "RM", "LW", "LM", "ST", "CAM"]],
        ["final", "founder_scarlet_toros_6", ["CAM", "CM", "CDM", "RM", "LM"]],
      ] as const) {
        const opponent = generateOpponent({ id: `${stage}-${index}`, stage, leg: 1, day: stage === "final" ? 99 : 72, opponentBlueprintId: blueprint.id }, 700 + index, [], [], "saya", zeroOpponentRarityBonus);
        const ids = Object.values(opponent.lineup);
        expect(ids.filter((id) => id === founderId), `${blueprint.attackFormationId} ${stage}`).toHaveLength(1);
        expect(new Set(ids)).toHaveLength(11);
        const slot = Object.entries(opponent.lineup).find(([, id]) => id === founderId)![0];
        const position = attackFormations[opponent.attackFormationId].slots.find(({ id }) => id === slot)!.position;
        expect(allowed).toContain(position);
      }
    }
  });

  it("contains 15 fictional opponent identities and seven fixed matchdays", () => {
    expect(clubBlueprints).toHaveLength(15);
    expect(new Set(clubBlueprints.map(({ id }) => id)).size).toBe(15);
    expect(clubBlueprints.map(({ name }) => name)).toEqual([
      "流光竞技", "北境联队", "山岳竞技", "白曜城", "苍月竞技",
      "绯红联队", "赤潮联队", "靛蓝竞技", "铁幕城", "黄金联队",
      "永恒竞技", "翡翠联队", "紫晶城", "蔚蓝竞技", "赤电联队",
    ]);
    expect(new Set(clubBlueprints.map(({ shortName }) => shortName)).size).toBe(15);
    expect(clubBlueprints.every(({ shortName }) => [...shortName].length === 2)).toBe(true);
    expect(new Set(clubBlueprints.map(({ crestUrl }) => crestUrl)).size).toBe(15);
    expect(clubBlueprints.every(({ id, crestUrl }) =>
      crestUrl === `/assets/opponents/club-crests-v1/${id}.svg`,
    )).toBe(true);
    expect(playerClub.crestUrl).toBe("/assets/clubs/player-club-crest-v1.svg");
    expect(JSON.stringify(clubBlueprints)).not.toMatch(/Manchester United|Paris Saint-Germain|Arsenal|Bayern|Real Madrid|Manchester City|Barcelona|Liverpool|Internazionale|Atletico|Dortmund|Sporting|Aston Villa|Napoli|Leipzig|巴黎圣日耳曼|阿森纳|拜仁慕尼黑|皇家马德里|曼城|巴塞罗那|利物浦|国际米兰|马德里竞技|多特蒙德|罗马|葡萄牙体育|阿斯顿维拉|那不勒斯|莱比锡|prototype|source/i);
    const tournament = generateTournament(20260814);
    expect(tournament.fixtures.map(({ day }) => day)).toEqual([18, 29, 45, 56, 72, 83, 99]);
    expect(tournament.fixtures.map(({ leg }) => leg)).toEqual([1, 2, 1, 2, 1, 2, 1]);
  });

  it("switches both AI formations in leg two only after both first-leg axes were countered", () => {
    const opponent = generateOpponent({ id: "test-1", stage: "round_of_16", leg: 1, day: 18, opponentBlueprintId: "north_foundry" }, 17, [], [], "saya", zeroOpponentRarityBonus);
    const playerCounter = counterFormations(opponent);
    const adapted = adaptOpponentForSecondLeg(opponent, {
      homeAttackFormationId: playerCounter.attackFormationId,
      homeDefenseFormationId: playerCounter.defenseFormationId,
    });
    expect(adapted.attackFormationId).not.toBe(opponent.attackFormationId);
    expect(adapted.defenseFormationId).not.toBe(opponent.defenseFormationId);
    expect(adapted.lineup.gk).toBeTruthy();
    expect(adapted.characters.find(({ character_id }) => character_id === adapted.lineup.gk)?.position).toBe("GK");
    expect(adaptOpponentForSecondLeg(opponent, {
      homeAttackFormationId: opponent.attackFormationId,
      homeDefenseFormationId: opponent.defenseFormationId,
    })).toBe(opponent);
  });

  it("evaluates the second-leg matchup against the AI's adapted formations", () => {
    const opponent = generateOpponent({ id: "adapted-effects", stage: "round_of_16", leg: 1, day: 18, opponentBlueprintId: "north_foundry" }, 17, [], [], "saya", zeroOpponentRarityBonus);
    const playerCounter = counterFormations(opponent);
    const adapted = adaptOpponentForSecondLeg(opponent, {
      homeAttackFormationId: playerCounter.attackFormationId,
      homeDefenseFormationId: playerCounter.defenseFormationId,
    });
    const base = tournamentPreparationEffects({ characters: [], lineup: {}, ...playerCounter, opponent, stage: "round_of_16" });
    const current = tournamentPreparationEffects({ characters: [], lineup: {}, ...playerCounter, opponent: adapted, stage: "round_of_16" });
    expect(current.effects).not.toEqual(base.effects);
    expect(current.layers).not.toEqual(base.layers);
  });

  it("reuses an opponent goalkeeper when every fresh natural keeper is exhausted", () => {
    const usedGoalkeepers = roster.characters.filter(({ position }) => position === "GK").map(({ character_id }) => character_id);
    const opponent = generateOpponent({ id: "keeper-fallback", stage: "final", leg: 1, day: 99, opponentBlueprintId: "lumiere_crown" }, 27, [], usedGoalkeepers, "irena", zeroOpponentRarityBonus);
    const goalkeeper = opponent.characters.find(({ character_id }) => character_id === opponent.lineup.gk);
    expect(goalkeeper?.position).toBe("GK");
    expect(usedGoalkeepers).toContain(goalkeeper?.character_id);
  });

  it("builds 1,000 deterministic routes with four legal opponent XIs", () => {
    const registeredIds = starterIds;
    expect(registeredIds).toHaveLength(TOURNAMENT_ROSTER_SIZE);
    for (let seed = 1; seed <= 1_000; seed += 1) {
      const tournament = generateTournament(seed);
      expect(generateTournament(seed)).toEqual(tournament);
      expect(new Set(tournament.route).size).toBe(4);
      expect(STORY_OPPONENT_IDS).toContain(tournament.route[2]);
      expect(STORY_OPPONENT_IDS).toContain(tournament.route[3]);
      const used: string[] = [];
      for (const stage of stageOrder) {
        const fixture = tournament.fixtures.find((item) => item.stage === stage)!;
        const opponent = generateOpponent(fixture, seed, registeredIds, used, "saya", zeroOpponentRarityBonus);
        expect(opponent.characters).toHaveLength(11);
        expect(opponent.characters.find(({ character_id }) => character_id === opponent.lineup.gk)?.position).toBe("GK");
        const rarityTarget = opponentRarityTargets[stage];
        const sixStarCount = opponent.characters.filter(({ stars }) => stars === 6).length;
        const nativeSixStarCount = opponent.characters.filter(({ stars, opponentPromotion }) => stars === 6 && !opponentPromotion).length;
        const fiveStarCount = opponent.characters.filter(({ stars }) => stars === 5).length;
        // 半决赛/决赛会注入剧情核心（5★），可能挤掉一个 6★/5★ 名额，故允许 ±1 浮动。
        expect(sixStarCount, `${seed} ${stage}`).toBeGreaterThanOrEqual(rarityTarget.sixStar - 1);
        expect(sixStarCount, `${seed} ${stage}`).toBeLessThanOrEqual(rarityTarget.sixStar);
        expect(nativeSixStarCount, `${seed} ${stage} native six stars`).toBe(nativeSixStarTargetForStage(stage, rarityTarget.sixStar));
        expect(fiveStarCount, `${seed} ${stage} ${opponent.attackFormationId}`).toBeGreaterThanOrEqual(rarityTarget.fiveStar);
        expect(fiveStarCount, `${seed} ${stage} ${opponent.attackFormationId}`).toBeLessThanOrEqual(rarityTarget.fiveStar + 1);
        expect(new Set(opponent.templateCharacterIds).size).toBe(11);
        expect(opponent.characters.filter((player) => player.opponentPromotion && used.includes(player.character_id)).length, `${seed} ${stage} repeated promotions`).toBeLessThanOrEqual(1);
        expect(opponent.characters.filter((player) => player.stars >= 5 && used.includes(player.character_id)).length, `${seed} ${stage} repeated high stars`)
          .toBeLessThanOrEqual(nativeSixStarTargetForStage(stage, rarityTarget.sixStar) + 1);
        for (const [slotId, characterId] of Object.entries(opponent.lineup)) {
          const player = opponent.characters.find(({ character_id }) => character_id === characterId);
          const slot = attackFormations[opponent.attackFormationId].slots.find(({ id }) => id === slotId);
          if (player && player.stars >= 5 && slot) expect(positionFit(player, slot.position), `${seed} ${stage} ${opponent.attackFormationId} ${player.character_id} -> ${slot.id}`).toBe(1);
          if (player?.opponentPromotion) {
            expect(player.opponentPromotion.baseStars).toBeLessThan(5);
            expect(player.opponentPromotion.targetStars).toBe(player.stars);
          }
        }
        expect(opponent.templateCharacterIds.some((id) => registeredIds.includes(id))).toBe(false);
        // 高星优先换用同位置低星升星，避免跨轮重复；对手专属核心走 character.locker.* / character.six-star.* 立绘。
        expect(opponent.characters.every((player) => {
          const artworkStars = player.opponentPromotion?.baseStars ?? player.stars;
          return resolveCharacterArtwork(characterArtworkAssetId(player.character_id, artworkStars)).status === "ready"
            || resolveDisplayCharacterCard(player.character_id, artworkStars).status === "ready";
        })).toBe(true);
        used.push(...opponent.templateCharacterIds);
      }
      expect(used).toHaveLength(44);
    }
  }, 30_000);

  it("promotes unused natural-position low-star templates when native high stars have appeared", () => {
    const tournament = generateTournament(9917, "saya");
    const fixture = tournament.fixtures.find(({ stage }) => stage === "final")!;
    const usedHighStars = roster.characters.filter(({ stars }) => stars >= 5).map(({ character_id }) => character_id);
    const opponent = generateOpponent(fixture, 9917, [], usedHighStars, "saya");
    const promoted = opponent.characters.filter(({ opponentPromotion }) => Boolean(opponentPromotion));
    expect(promoted.length).toBeGreaterThan(0);
    for (const player of promoted) {
      const slotId = Object.entries(opponent.lineup).find(([, characterId]) => characterId === player.character_id)![0];
      const slot = attackFormations[opponent.attackFormationId].slots.find(({ id }) => id === slotId)!;
      expect(positionFit(player, slot.position)).toBe(1);
      expect(player.attributes.overall).toBeGreaterThanOrEqual(player.stars === 6 ? 90 : 86);
    }
  });

  it("reserves an increasing share of native six-star cards for later rounds", () => {
    for (const captainId of tournamentCaptainIds) {
      const tournament = generateTournament(9917, captainId);
      const used: string[] = [];
      for (const stage of stageOrder) {
        const fixture = tournament.fixtures.find((item) => item.stage === stage)!;
        const bonus = tournamentCaptainRoutes[captainId].opponentRarityByStage[stage];
        const target = opponentRarityTargets[stage].sixStar + bonus.sixStar;
        const opponent = generateOpponent(fixture, 9917, [], used, captainId, bonus);
        expect(opponent.characters.filter(({ stars }) => stars === 6)).toHaveLength(target);
        expect(opponent.characters.filter(({ stars, opponentPromotion }) => stars === 6 && !opponentPromotion))
          .toHaveLength(nativeSixStarTargetForStage(stage, target));
        used.push(...opponent.templateCharacterIds);
      }
    }
  });

  it("gives generated opponents one fixed heritage bond instead of random lineup bonds", () => {
    for (const blueprint of clubBlueprints) {
      const opponent = generateOpponent({ id: `bond-${blueprint.id}`, stage: "quarter_final", leg: 1, day: 45, opponentBlueprintId: blueprint.id }, 71, [], [], "irena", zeroOpponentRarityBonus);
      expect(new Set(opponent.characters.map(({ tournamentOpponentBondFactionId }) => tournamentOpponentBondFactionId))).toEqual(new Set([blueprint.heritageFactionId]));
      const effects = cupFactionBondEffects(opponent.characters);
      const profile = cupFactionBondProfiles[blueprint.heritageFactionId];
      expect(effects[profile.ability]).toBe(profile.bonus);
      expect(Object.entries(effects).filter(([, value]) => value > 0)).toHaveLength(1);
    }
  });

  it("aligns the drawn bracket with the fixed player route", () => {
    for (const seed of [1, 7, 9917, 20260814]) {
      const tournament = generateTournament(seed);
      const playerIndex = tournament.bracket.indexOf("player_club");
      const playerR16Match = playerIndex >> 1;
      const playerQuarterFinal = playerIndex >> 2;
      const playerSemiFinal = playerIndex >> 3;
      expect(tournament.bracket[playerIndex ^ 1]).toBe(tournament.route[0]);
      expect(tournament.bracket[(playerR16Match ^ 1) * 2]).toBe(tournament.route[1]);
      expect(tournament.bracket[(playerQuarterFinal ^ 1) * 4]).toBe(tournament.route[2]);
      expect(tournament.bracket[(playerSemiFinal ^ 1) * 8]).toBe(tournament.route[3]);
      expect(new Set(tournament.bracket)).toHaveLength(16);
    }
  });

  it("changes fixed late-round opponents and founder lineups with the captain route", () => {
    for (const seed of [1, 7, 9917]) {
      const nayaTournament = generateTournament(seed, "naya");
      expect(STORY_OPPONENT_IDS).not.toContain(nayaTournament.route[2]);
      expect(STORY_OPPONENT_IDS).toContain(nayaTournament.route[3]);
      const nayaSemi = generateOpponent(nayaTournament.fixtures.find(({ stage }) => stage === "semi_final")!, seed, [], [], "naya");
      const nayaFinal = generateOpponent(nayaTournament.fixtures.find(({ stage }) => stage === "final")!, seed, [], [], "naya");
      expect(nayaSemi.templateCharacterIds).not.toContain("founder_samba_union_7");
      expect(nayaFinal.templateCharacterIds).toContain("founder_scarlet_toros_6");

      const irenaTournament = generateTournament(seed, "irena");
      for (const fixture of irenaTournament.fixtures.filter(({ leg }) => leg === 1)) {
        const opponent = generateOpponent(fixture, seed, [], [], "irena");
        expect(opponent.templateCharacterIds).not.toContain("founder_sakura_link_4");
        expect(opponent.templateCharacterIds).not.toContain("founder_samba_union_7");
        expect(opponent.templateCharacterIds).not.toContain("founder_scarlet_toros_6");
      }
    }
  });

  it("reserves scarce five-star and six-star templates for later rounds", () => {
    expect(stageOrder.map((stage) => opponentRarityTargetForPool(stage, 10, 8))).toEqual([
      { fiveStar: 1, sixStar: 0 }, { fiveStar: 2, sixStar: 1 }, { fiveStar: 3, sixStar: 2 }, { fiveStar: 4, sixStar: 3 },
    ]);
    expect(stageOrder.map((stage) => opponentRarityTargetForPool(stage, 6, 4))).toEqual([
      { fiveStar: 0, sixStar: 0 }, { fiveStar: 1, sixStar: 1 }, { fiveStar: 2, sixStar: 1 }, { fiveStar: 3, sixStar: 2 },
    ]);
  });

  it("keeps the fixture seed independent from lineup and ignores legacy skill loadouts", () => {
    const seed = fixtureSeed(88, "final", 1);
    const homePlayers = roster.characters.slice(0, 44);
    const awayPlayers = roster.characters.slice(44);
    const homeLineup = recommendLineup(homePlayers, "4-2-3-1", "4-4-2");
    const awayLineup = recommendLineup(awayPlayers, "4-3-3", "4-3-3");
    const base = simulateMatch({ characters: roster.characters, homeLineup, homeAttackFormationId: "4-2-3-1", homeDefenseFormationId: "4-4-2", awayLineup, awayAttackFormationId: "4-3-3", awayDefenseFormationId: "4-3-3", fixtureSeed: seed });
    const changed = simulateMatch({ characters: roster.characters, homeLineup, homeAttackFormationId: "4-2-3-1", homeDefenseFormationId: "4-4-2", awayLineup, awayAttackFormationId: "4-3-3", awayDefenseFormationId: "4-3-3", fixtureSeed: seed, homeSkillLoadouts: { [Object.values(homeLineup)[0]!]: ["basic_handling"] } });
    expect(base.seed).toBe(seed);
    expect(changed.seed).toBe(seed);
    expect(changed).toEqual(base);
    expect(simulateMatch({ characters: roster.characters, homeLineup, homeAttackFormationId: "4-2-3-1", homeDefenseFormationId: "4-4-2", awayLineup, awayAttackFormationId: "4-3-3", awayDefenseFormationId: "4-3-3", fixtureSeed: seed })).toEqual(base);
  });

});
