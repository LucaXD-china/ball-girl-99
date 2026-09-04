import { simulateTournamentBatch } from "../src/data/tournamentFlowSimulator";
import {
  tournamentCaptainIds,
  tournamentCaptainRoutes,
  type StageOpponentRarityPlan,
  type TournamentCaptainId,
} from "../src/data/tournamentCaptain";
import { stageOrder, type TournamentStage } from "../src/data/tournamentJourney";

type StageRateBands = Record<TournamentStage, readonly [number, number]>;

type HistoricalReference = {
  championRateMax: number;
  stageAdvanceRates: StageRateBands;
};

// 2026-08-28 羁绊增强前的历史验收带。现在只用于比较，不再作为失败门槛：
// 玩家通过阵容构筑获得的难度下降是被允许的，不据此反向提高对手星级。
const historicalReferences: Record<TournamentCaptainId, HistoricalReference> = {
  saya: {
    championRateMax: .3,
    stageAdvanceRates: { round_of_16: [.78, .83], quarter_final: [.78, .84], semi_final: [.55, .64], final: [.68, .78] },
  },
  naya: {
    championRateMax: .15,
    stageAdvanceRates: { round_of_16: [.72, .79], quarter_final: [.61, .69], semi_final: [.49, .58], final: [.38, .5] },
  },
  irena: {
    championRateMax: .05,
    stageAdvanceRates: { round_of_16: [.63, .71], quarter_final: [.57, .65], semi_final: [.4, .51], final: [.14, .24] },
  },
};

function integerFlag(name: string, fallback: number) {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  const value = Number(process.argv[index + 1]);
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${name} 必须是正整数`);
  return value;
}

function planFlag(): StageOpponentRarityPlan | null {
  const index = process.argv.indexOf("--plan");
  if (index < 0) return null;
  const values = process.argv[index + 1]?.split(",").map(Number);
  if (!values || values.length !== 8 || values.some((value) => !Number.isInteger(value) || value < 0 || value > 10)) {
    throw new Error("--plan 必须按四阶段依次提供 五星,六星 共八个非负整数");
  }
  return Object.fromEntries(stageOrder.map((stage, index) => [stage, { fiveStar: values[index * 2]!, sixStar: values[index * 2 + 1]! }])) as StageOpponentRarityPlan;
}

function reportFor(captainId: TournamentCaptainId, plan: StageOpponentRarityPlan, runs: number, seedStart: number) {
  return simulateTournamentBatch({
    runs,
    seedStart,
    captainId,
    opponentRarityByStage: plan,
    sampleCount: 0,
  });
}

const runs = integerFlag("--runs", 1_000);
const seedStart = integerFlag("--seed-start", 1);
const requestedCaptain = process.argv.includes("--captain")
  ? process.argv[process.argv.indexOf("--captain") + 1] as TournamentCaptainId
  : null;
if (requestedCaptain && !tournamentCaptainIds.includes(requestedCaptain)) throw new Error("--captain 必须是 saya、naya 或 irena");
const captainIds = requestedCaptain ? [requestedCaptain] : tournamentCaptainIds;
const requestedPlan = planFlag();
if (requestedPlan && captainIds.length !== 1) throw new Error("--plan 只能与单个 --captain 一起使用");

for (const captainId of captainIds) {
  const historicalReference = historicalReferences[captainId];
  const plan = requestedPlan ?? tournamentCaptainRoutes[captainId].opponentRarityByStage;
  const expert = reportFor(captainId, plan, runs, seedStart);
  console.log(JSON.stringify({
    captainId,
    historicalReference,
    opponentRarityByStage: plan,
    expert: {
      championRate: expert.championRate,
      stageAdvanceRates: expert.stageAdvanceRates,
      trainingFocusSessions: expert.trainingFocusSessions,
      factionPackCounts: expert.factionPackCounts,
      aboveFormerChampionCeiling: expert.championRate > historicalReference.championRateMax,
    },
    runs,
    seedStart,
    seedEnd: seedStart + runs - 1,
  }));
}
