import { aiWinner, stageOrder, TOURNAMENT_PLAYER_CLUB_ID, type TournamentStage } from "./tournamentJourney";

// 晋级图推导：从存档的签表、玩家实际赛果和确定性 AI 晋级结果还原 16→8→4→2。
// 只揭示已经走过的轮次；当前轮展示玩家已确定的对手，未来轮次保持「待定」。
// 半决赛和决赛的玩家路线由 generateTournament() 固定在故事球队池中，因此显示时优先遵循 route。

export type BracketMatch = {
  stage: TournamentStage;
  index: number;
  leftTeamId: string | null;
  rightTeamId: string | null;
  winnerId: string | null;
  involvesPlayer: boolean;
  playerSide: "left" | "right" | null;
};

export type BracketRound = {
  stage: TournamentStage;
  matches: BracketMatch[];
};

export type TournamentBracket = {
  rounds: BracketRound[];
  championId: string | null;
  playerEliminated: boolean;
};

// 结构子集，避免 import 存档模块造成循环依赖；`TournamentCampaignState` 结构上满足该类型。
export type BracketCampaignInput = {
  campaignSeed: number;
  bracket: string[];
  route: string[];
  fixtures: Array<{ id: string; stage: TournamentStage; leg: 1 | 2 }>;
  results: Array<{ fixtureId: string; advanced?: boolean }>;
  outcome: "champion" | "eliminated" | null;
};

// 玩家在某个阶段的晋级结果：两回合取次回合的 advanced，决赛取唯一一场的 advanced。
export function playerAdvancementForStage(
  campaign: Pick<BracketCampaignInput, "fixtures" | "results">,
  stage: TournamentStage,
): boolean | undefined {
  const fixtures = campaign.fixtures.filter((fixture) => fixture.stage === stage);
  const decisive = fixtures.length === 1 ? fixtures[0] : fixtures.find((fixture) => fixture.leg === 2);
  if (!decisive) return undefined;
  return campaign.results.find((entry) => entry.fixtureId === decisive.id)?.advanced;
}

// 玩家在 16 强签表中的下标；其后续轮次的「赛道」由该下标逐轮右移得到。
export function playerBracketIndex(bracket: string[]) {
  return bracket.indexOf(TOURNAMENT_PLAYER_CLUB_ID);
}

// `currentStageIndex`：玩家当前所在轮次（0=16强 … 3=决赛），4 表示赛事已结束。
// 当前轮之前的 AI 对阵已按同一 seed 结算；当前轮只显示玩家路线，不提前揭示下一轮。
export function deriveTournamentBracket(campaign: BracketCampaignInput, currentStageIndex = 0): TournamentBracket {
  const { bracket } = campaign;
  if (bracket.length !== 16) throw new Error("晋级图需要 16 支球队的完整签表");
  const playerIdx = playerBracketIndex(bracket);
  if (playerIdx < 0) throw new Error("签表中缺少玩家俱乐部");
  const revealThrough = Math.max(0, Math.min(stageOrder.length - 1, currentStageIndex));

  const rounds: BracketRound[] = [];
  let entrants = [...bracket] as Array<string | null>;
  let playerAlive = true;
  for (let round = 0; round < stageOrder.length; round += 1) {
    const stage = stageOrder[round];
    const matchCount = 8 >> round;
    const playerMatchIndex = playerIdx >> (round + 1);
    const matches: BracketMatch[] = [];
    const winners: Array<string | null> = [];
    for (let index = 0; index < matchCount; index += 1) {
      let leftTeamId = entrants[index * 2] ?? null;
      let rightTeamId = entrants[index * 2 + 1] ?? null;
      const involvesPlayer = playerAlive && index === playerMatchIndex;
      const playerSide: "left" | "right" | null = involvesPlayer
        ? ((playerIdx >> round) & 1) === 0 ? "left" : "right"
        : null;

      let winnerId: string | null = null;

      if (round > 0) {
        const advancedIntoRound = playerAdvancementForStage(campaign, stageOrder[round - 1]) === true;
        if (involvesPlayer && !advancedIntoRound) {
          leftTeamId = null;
          rightTeamId = null;
        } else if (involvesPlayer && revealThrough >= round) {
          // 玩家路线的对手由赛事路线确定；半决赛与决赛因此不会被普通 AI 推导覆盖。
          const opponent = campaign.route[round] ?? null;
          if (playerSide === "left") { leftTeamId = TOURNAMENT_PLAYER_CLUB_ID; rightTeamId = opponent; }
          else { leftTeamId = opponent; rightTeamId = TOURNAMENT_PLAYER_CLUB_ID; }
        }
      }

      if (round === 2 && !involvesPlayer && index === 1 - playerMatchIndex && revealThrough >= round) {
        // 玩家半决赛另一侧的决赛球队同样来自固定故事池。将它放回另一场半决赛，
        // 避免用初始签表的普通 AI 结果制造与最终路线冲突的对阵。
        const fixedFinalOpponent = campaign.route[3] ?? null;
        if (fixedFinalOpponent && leftTeamId !== fixedFinalOpponent && rightTeamId !== fixedFinalOpponent) {
          if (leftTeamId) rightTeamId = fixedFinalOpponent;
          else leftTeamId = fixedFinalOpponent;
        }
      }

      if (involvesPlayer) {
        const advanced = playerAdvancementForStage(campaign, stage);
        if (advanced === true) winnerId = TOURNAMENT_PLAYER_CLUB_ID;
        else if (advanced === false) {
          winnerId = playerSide === "left" ? rightTeamId : leftTeamId;
          playerAlive = false;
        }
      } else if (round < revealThrough && leftTeamId && rightTeamId) {
        // 其他比赛与玩家路线同样按 seed 确定性结算，刷新后不会换晋级队伍。
        const fixedRouteWinner = campaign.route.slice(round + 1).find((id) => id === leftTeamId || id === rightTeamId);
        winnerId = fixedRouteWinner ?? aiWinner(leftTeamId, rightTeamId, campaign.campaignSeed, round, index);
      }

      matches.push({ stage, index, leftTeamId, rightTeamId, winnerId, involvesPlayer, playerSide });
      winners.push(winnerId);
    }
    rounds.push({ stage, matches });
    entrants = winners;
  }

  return {
    rounds,
    championId: rounds[stageOrder.length - 1].matches[0]?.winnerId ?? null,
    playerEliminated: campaign.outcome === "eliminated",
  };
}
