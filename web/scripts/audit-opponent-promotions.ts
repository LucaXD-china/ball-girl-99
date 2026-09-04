import { tournamentCaptainIds, tournamentCaptainRoutes } from "../src/data/tournamentCaptain";
import { generateOpponent, generateTournament, stageOrder } from "../src/data/tournamentJourney";

const runsFlagIndex = process.argv.indexOf("--runs");
const seedStartFlagIndex = process.argv.indexOf("--seed-start");
const runs = runsFlagIndex >= 0 ? Number(process.argv[runsFlagIndex + 1]) : 1_000;
const seedStart = seedStartFlagIndex >= 0 ? Number(process.argv[seedStartFlagIndex + 1]) : 1;
if (!Number.isSafeInteger(runs) || runs < 1) throw new Error("--runs 必须是正整数");
if (!Number.isSafeInteger(seedStart) || seedStart < 0) throw new Error("--seed-start 必须是非负整数");

for (const captainId of tournamentCaptainIds) {
  const totals = Object.fromEntries(stageOrder.map((stage) => [stage, {
    teams: 0,
    fiveStar: 0,
    sixStar: 0,
    nativeSixStar: 0,
    promotedFiveStar: 0,
    promotedSixStar: 0,
    repeatedHighStar: 0,
  }]));
  for (let seed = seedStart; seed < seedStart + runs; seed += 1) {
    const tournament = generateTournament(seed, captainId);
    const usedIds: string[] = [];
    for (const stage of stageOrder) {
      const fixture = tournament.fixtures.find((item) => item.stage === stage)!;
      const opponent = generateOpponent(
        fixture,
        seed,
        [],
        usedIds,
        captainId,
        tournamentCaptainRoutes[captainId].opponentRarityByStage[stage],
      );
      const stageTotals = totals[stage];
      stageTotals.teams += 1;
      for (const player of opponent.characters) {
        stageTotals.fiveStar += Number(player.stars === 5);
        stageTotals.sixStar += Number(player.stars === 6);
        stageTotals.nativeSixStar += Number(player.stars === 6 && !player.opponentPromotion);
        stageTotals.promotedFiveStar += Number(player.opponentPromotion?.targetStars === 5);
        stageTotals.promotedSixStar += Number(player.opponentPromotion?.targetStars === 6);
        stageTotals.repeatedHighStar += Number(player.stars >= 5 && usedIds.includes(player.character_id));
      }
      usedIds.push(...opponent.templateCharacterIds);
    }
  }
  console.log(JSON.stringify({
    captainId,
    runs,
    seedStart,
    seedEnd: seedStart + runs - 1,
    registeredIds: "empty-controlled-pool",
    stages: Object.fromEntries(stageOrder.map((stage) => {
      const { teams, ...counts } = totals[stage];
      return [stage, Object.fromEntries(Object.entries(counts).map(([key, value]) => [key, Number((value / teams).toFixed(3))]))];
    })),
  }));
}
