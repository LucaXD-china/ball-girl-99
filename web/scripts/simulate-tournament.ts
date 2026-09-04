import { factionMeta, type FactionId } from "../src/data/gameData";
import { tournamentCaptainIds, type TournamentCaptainId } from "../src/data/tournamentCaptain";
import { stageMeta, stageOrder, type TournamentStage } from "../src/data/tournamentJourney";
import {
  simulateTournamentBatch,
  type BreakthroughStrategy,
  type RecruitmentStrategy,
  type TournamentBatchReport,
  type TrainingStrategy,
} from "../src/data/tournamentFlowSimulator";

type CliOptions = {
  runs: number;
  seedStart: number;
  captainId: TournamentCaptainId;
  recruitmentStrategy?: RecruitmentStrategy;
  focusedFactionId?: FactionId;
  trainingStrategy?: TrainingStrategy;
  breakthroughStrategy?: BreakthroughStrategy;
  sampleCount: number;
  json: boolean;
};

const factionIds = Object.keys(factionMeta) as FactionId[];

function help() {
  console.log(`杯赛全流程数值模拟（无需启动 Web 项目）

用法：npm run simulate:cup -- [选项]

  --runs <数量>                 模拟届数，默认 100
  --seed-start <种子>           起始种子，默认 1
  --captain <saya|naya|irena>   队长路线，默认 saya
  --recruit <expert|focused|random>
                                覆盖玩家策略的抽卡方式
  --faction <阵营 ID>           focused 策略的目标阵营，默认 sakura_link
  --training <expert|none>      Expert 最优训练或完全不训练
  --breakthrough <auto|none>    覆盖玩家策略的升星方式
  --details <数量>              展示前几届逐场明细，默认 3；0 为关闭
  --json                        只输出机器可读 JSON
  --help                        显示帮助

阵营 ID：${factionIds.join(", ")}`);
}

function integer(value: string | undefined, flag: string, minimum: number) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum) throw new Error(`${flag} 必须是不小于 ${minimum} 的整数`);
  return parsed;
}

function choice<T extends string>(value: string | undefined, choices: readonly T[], flag: string): T {
  if (!value || !choices.includes(value as T)) throw new Error(`${flag} 必须是 ${choices.join("、")} 之一`);
  return value as T;
}

function parseArgs(argv: string[]): CliOptions | null {
  const options: CliOptions = {
    runs: 100,
    seedStart: 1,
    captainId: "saya",
    sampleCount: 3,
    json: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--help" || flag === "-h") return null;
    if (flag === "--json") { options.json = true; continue; }
    const value = argv[++index];
    if (flag === "--runs") options.runs = integer(value, flag, 1);
    else if (flag === "--seed-start") options.seedStart = integer(value, flag, 0);
    else if (flag === "--details") options.sampleCount = integer(value, flag, 0);
    else if (flag === "--captain") options.captainId = choice(value, tournamentCaptainIds, flag);
    else if (flag === "--recruit") options.recruitmentStrategy = choice(value, ["expert", "focused", "random"] as const, flag);
    else if (flag === "--training") options.trainingStrategy = choice(value, ["expert", "none"] as const, flag);
    else if (flag === "--breakthrough") options.breakthroughStrategy = choice(value, ["auto", "none"] as const, flag);
    else if (flag === "--faction") options.focusedFactionId = choice(value, factionIds, flag);
    else throw new Error(`未知选项：${flag}`);
  }
  return options;
}

const percent = (value: number | null) => value === null ? "—" : `${(value * 100).toFixed(1)}%`;
const fixed = (value: number) => value.toFixed(2);

function printReport(report: TournamentBatchReport) {
  console.log("杯赛全流程数值模拟");
  console.log(`队长 ${report.options.captainId}｜玩家 expert｜样本 ${report.runs} 届｜种子 ${report.seedStart}–${report.seedStart + report.runs - 1}｜抽卡 ${report.options.recruitmentStrategy}｜训练 ${report.options.trainingStrategy}｜升星 ${report.options.breakthroughStrategy}`);
  console.log("");
  console.log(`夺冠率 ${percent(report.championRate)}｜零六星率 ${percent(report.zeroSixStarRate)}｜平均比赛 ${fixed(report.averages.matches)} 场`);
  console.log(`场均比分 ${fixed(report.averages.goalsFor)} : ${fixed(report.averages.goalsAgainst)}｜场均预期进球 ${fixed(report.averages.xgFor)} : ${fixed(report.averages.xgAgainst)}｜射门 ${fixed(report.averages.shotsFor)} : ${fixed(report.averages.shotsAgainst)}｜控球 ${fixed(report.averages.possession)}%`);
  console.log(`平均不同球员 ${fixed(report.averages.uniquePlayers)}｜平均升星 ${fixed(report.averages.breakthroughs)} 次｜平均六星 ${fixed(report.averages.sixStarCards)} 张`);
  console.log("");
  console.log("结果分布");
  for (const stage of stageOrder) console.log(`  ${stageMeta[stage].name}淘汰 ${report.outcomes[stage]}（${percent(report.outcomes[stage] / report.runs)}）`);
  console.log(`  冠军 ${report.outcomes.champion}（${percent(report.championRate)}）`);
  console.log("");
  console.log("条件晋级率（进入该轮后的晋级概率）");
  for (const stage of stageOrder) console.log(`  ${stageMeta[stage].name} ${percent(report.stageAdvanceRates[stage])}`);
  console.log("");
  console.log("羁绊激活场次");
  for (const factionId of Object.keys(report.factionBondMatchCounts) as FactionId[]) {
    const count = report.factionBondMatchCounts[factionId];
    if (count) console.log(`  ${factionMeta[factionId].name} ${count}`);
  }
  console.log("");
  console.log(`Expert 训练课次｜进攻 ${report.trainingFocusSessions.attack}｜组织 ${report.trainingFocusSessions.playmaking}｜防守 ${report.trainingFocusSessions.defense}`);
  for (const sample of report.samples) {
    console.log("");
    console.log(`种子 ${sample.seed}｜${sample.outcome === "champion" ? "冠军" : `${stageMeta[sample.eliminatedStage as TournamentStage].name}淘汰`}｜六星 ${sample.recruitment.rarityCounts[6]}｜不同球员 ${sample.recruitment.uniquePlayers}｜升星 ${sample.recruitment.breakthroughs}`);
    for (const match of sample.matches) {
      const suffix = match.penalties ? `，点球 ${match.penalties[0]}:${match.penalties[1]}` : match.extraTime ? `，加时 ${match.extraTime[0]}:${match.extraTime[1]}` : "";
      console.log(`  Day ${match.day} ${stageMeta[match.stage].name}${match.leg === 2 ? "次回合" : match.stage === "final" ? "" : "首回合"} vs ${match.opponent}：${match.score[0]}:${match.score[1]}${suffix}（xG ${fixed(match.homeXg)}:${fixed(match.awayXg)}）`);
    }
  }
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (!options) help();
  else {
    const report = simulateTournamentBatch(options);
    if (options.json) console.log(JSON.stringify(report, null, 2));
    else printReport(report);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
