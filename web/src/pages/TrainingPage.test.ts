import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TournamentCaptainProvider } from "../components/TournamentCaptainContext";
import { roster } from "../data/gameData";
import {
  buildTournamentCharacters,
  sortTournamentPlayers,
  TOURNAMENT_MAX_FOCUS,
  trainingFocusPreview,
  trainingFocusTotal,
} from "../data/tournamentSquad";
import { createTournamentSave } from "../storage/tournamentSaveStorage";
import {
  buildFirstTrainingGuideSteps,
  buildTrainingResultEntry,
  filterTrainingPlayers,
  resolveTrainingNoActionGuide,
  selectFirstTrainingPlayers,
  shouldPromptForMatchAfterTraining,
  TrainingPage,
  trainingGoToMatchActionLabel,
  trainingNoActionPrompt,
  trainingSystemIntroduction,
} from "./TrainingPage";

const STARTER_IDS = Object.keys(createTournamentSave(7).squad.collection);

function buildGuide(registeredIds: string[]) {
  const squad = createTournamentSave(7).squad;
  const registered = new Set(registeredIds);
  const registeredPlayers = sortTournamentPlayers(buildTournamentCharacters(roster.characters, squad).filter((player) => registered.has(player.character_id)));
  const rosterOrder = [...registeredPlayers].sort((left, right) =>
    Number(trainingFocusTotal(left.focus) >= TOURNAMENT_MAX_FOCUS) - Number(trainingFocusTotal(right.focus) >= TOURNAMENT_MAX_FOCUS),
  );
  const picks = selectFirstTrainingPlayers(registeredPlayers, rosterOrder);
  return { picks, steps: buildFirstTrainingGuideSteps(picks, rosterOrder, 10) };
}

function assertGuideIsProgressable(registeredIds: string[], steps: ReturnType<typeof buildGuide>["steps"]) {
  const registered = new Set(registeredIds);
  const playerTargets = steps.map((step) => step.target).filter((target) => target.startsWith("training-player-"));
  expect(playerTargets.length).toBeGreaterThan(0);
  for (const target of playerTargets) {
    expect(registered.has(target.replace("training-player-", ""))).toBe(true);
  }
  const controls = new Set(["training-direction-defense", "training-roster-next", "training-run"]);
  for (const step of steps) {
    if (step.target.startsWith("training-player-")) continue;
    expect(controls.has(step.target)).toBe(true);
  }
  expect(steps[0].guideId).toBe("training-first-defense");
  expect(steps[steps.length - 1].guideId).toBe("training-first-run");
  expect(steps.length).toBeGreaterThanOrEqual(5);
}

describe("tournament training center", () => {
  it("filters training players by keyword, position, star rating, and faction without changing roster order", () => {
    const squad = createTournamentSave(7).squad;
    const players = sortTournamentPlayers(buildTournamentCharacters(roster.characters, squad));
    const target = players[0]!;

    expect(filterTrainingPlayers(players, { query: "", positionGroup: "all", stars: 0, factionId: "all" }).map((player) => player.character_id)).toEqual(players.map((player) => player.character_id));
    expect(filterTrainingPlayers(players, { query: target.name, positionGroup: "all", stars: 0, factionId: "all" }).map((player) => player.character_id)).toEqual([target.character_id]);
    expect(filterTrainingPlayers(players, { query: "", positionGroup: "keeper", stars: 0, factionId: "all" }).every((player) => player.position.includes("GK") || player.alternative_positions.some((position) => position.includes("GK")))).toBe(true);
    expect(filterTrainingPlayers(players, { query: "", positionGroup: "all", stars: target.stars, factionId: "all" }).every((player) => player.stars === target.stars)).toBe(true);
    expect(filterTrainingPlayers(players, { query: "", positionGroup: "all", stars: 0, factionId: target.faction_id }).every((player) => player.faction_id === target.faction_id)).toBe(true);
  });

  it("keeps exactly the three training direction entrances", () => {
    const squad = createTournamentSave(7).squad;
    const registeredIds = Object.keys(squad.collection);
    const markup = renderToStaticMarkup(createElement(TrainingPage, {
      guideScope: "training-preview",
      managerNickname: "测试经理",
      squad,
      registeredIds,
      day: 2,
      fixtureDay: 11,
      fixtureName: "16强第一回合",
      remainingDays: 9,
      onTrain: () => createTournamentSave(7),
      onBackToOffice: () => undefined,
      onGoToMatch: () => undefined,
    }));

    expect(markup.match(/training-module-card/g)).toHaveLength(3);
    expect(markup).toContain("进攻");
    expect(markup).toContain("组织");
    expect(markup).toContain("防守");
    expect(markup).not.toContain("观察下一场对手");
    expect(markup).toContain("单次最多：主属性 射门 +2.4");
    expect(markup).toContain("副属性 速度 +1.0");
    expect(markup).not.toContain("+0.8");
    expect(markup).not.toContain("绿茵少女 · TRAINING FILE");
    expect(markup).not.toContain("技能训练");
    expect(markup).not.toContain("球员训练");
    expect(markup).not.toContain("技能研习库");
    expect(markup).not.toContain("长期训练室");
  });

  it("caps the exact player preview at 99 instead of promising the full nominal bonus", () => {
    const player = roster.characters[0]!;
    const preview = trainingFocusPreview({
      ...player,
      attributes: { ...player.attributes, shooting: 98.4, pace: 98.6 },
    }, "attack");

    expect(preview.main).toMatchObject({ before: 98.4, after: 99 });
    expect(preview.sub).toMatchObject({ before: 98.6, after: 99 });
  });

  it("reports the committed before-and-after current OVR in the training result", () => {
    const save = createTournamentSave(7);
    const beforePlayers = buildTournamentCharacters(roster.characters, save.squad);
    const before = beforePlayers.find((player) => player.position.split("/")[0] === "ST")!;
    const nextSquad = {
      ...save.squad,
      characterProgress: {
        ...save.squad.characterProgress,
        [before.character_id]: { ...save.squad.characterProgress[before.character_id], focus: { attack: 1, playmaking: 0, defense: 0 } },
      },
    };
    const after = buildTournamentCharacters(roster.characters, nextSquad).find((player) => player.character_id === before.character_id)!;
    const result = buildTrainingResultEntry(before, after, "attack");

    expect(result.overall).toEqual({ before: before.currentOverall, after: after.currentOverall });
    expect(result.overall.after).toBeGreaterThan(result.overall.before);
    expect(result.main).toMatchObject({ label: "射门", before: before.attributes.shooting });
  });

  it("does not force the first-training walkthrough on Naya or Irena routes", () => {
    const squad = createTournamentSave(7).squad;
    const props = {
      guideScope: "training-route-preview",
      managerNickname: "测试经理",
      squad,
      registeredIds: Object.keys(squad.collection),
      day: 2,
      fixtureDay: 11,
      fixtureName: "16强第一回合",
      remainingDays: 9,
      onTrain: () => createTournamentSave(7),
      onBackToOffice: () => undefined,
      onGoToMatch: () => undefined,
    };
    for (const captainId of ["naya", "irena"] as const) {
      const markup = renderToStaticMarkup(createElement(TournamentCaptainProvider, { captainId, children: createElement(TrainingPage, props) }));
      expect(markup).not.toContain("is-required");
    }
  });

  it("uses the three-line Ferguson quote instead of the old training slogan", () => {
    const squad = createTournamentSave(7).squad;
    const markup = renderToStaticMarkup(createElement(TrainingPage, {
      guideScope: "training-quote-preview",
      managerNickname: "测试经理",
      squad,
      registeredIds: Object.keys(squad.collection),
      day: 2,
      fixtureDay: 17,
      fixtureName: "16强第一回合",
      remainingDays: 15,
      onTrain: () => createTournamentSave(7),
      onBackToOffice: () => undefined,
      onGoToMatch: () => undefined,
    }));

    expect(markup).toContain("You have to have a good imagination to be a top coach");
    expect(markup).toContain("要成为顶级教练，你必须拥有丰富的想象力");
    expect(markup).toContain("亚历克斯·弗格森爵士");
    expect(markup).not.toContain("让每一次训练");
    expect(markup).not.toContain("等级改变球员属性");
  });

  it("has Saya explain the three directions and the six-session cap", () => {
    expect(trainingSystemIntroduction.message).toContain("进攻练射门");
    expect(trainingSystemIntroduction.message).toContain("组织练传球");
    expect(trainingSystemIntroduction.message).toContain("防守练防守");
    expect(trainingSystemIntroduction.message).toContain("最多练 6 次");
    expect(trainingSystemIntroduction.message.length).toBeLessThanOrEqual(44);
  });

  it("uses the requested out-of-action warning copy", () => {
    expect(trainingNoActionPrompt.title).toBe("该去比赛了");
    expect(trainingNoActionPrompt.message).toBe("要来不及啦经理，快去比赛！");
  });

  it("offers a direct go-to-match action instead of bouncing through the office", () => {
    expect(trainingGoToMatchActionLabel).toBe("前往比赛");
  });

  it("routes the exhausted-window prompt straight to the match", () => {
    expect(resolveTrainingNoActionGuide()).toMatchObject({ guideId: "training-no-action-exit", kind: "match", title: trainingNoActionPrompt.title, actionLabel: trainingGoToMatchActionLabel });
  });

  it("prompts for the match as soon as the last available training finishes", () => {
    expect(shouldPromptForMatchAfterTraining(5)).toBe(true);
    expect(shouldPromptForMatchAfterTraining(9)).toBe(true);
    expect(shouldPromptForMatchAfterTraining(10)).toBe(false);
  });

  it("keeps the narrative trio (纱夜/哈特/埃斯特) and the flip step for the default roster", () => {
    const { picks, steps } = buildGuide(STARTER_IDS);
    expect(picks.map((pick) => pick.role)).toEqual(["captain", "gk", "defender"]);
    expect(picks.map((pick) => pick.player.character_id)).toEqual(["founder_sakura_link_4", "fog_eleanor_hart", "sol_martina_esteve"]);
    expect(steps.map((step) => step.target)).toEqual([
      "training-direction-defense",
      "training-player-founder_sakura_link_4",
      "training-player-fog_eleanor_hart",
      "training-roster-next",
      "training-player-sol_martina_esteve",
      "training-run",
    ]);
    expect(steps[2].message).toContain("门将哈特");
    expect(steps[4].message).toContain("埃斯特");
    expect(steps[0].message).not.toContain("训练只改六项基础属性，不改变综合");
  });

  it("picks another registered goalkeeper when 哈特 is not brought", () => {
    const ids = STARTER_IDS.filter((id) => id !== "fog_eleanor_hart");
    const { picks, steps } = buildGuide(ids);
    const gk = picks.find((pick) => pick.role === "gk");
    expect(gk).toBeDefined();
    expect(ids).toContain(gk!.player.character_id);
    expect(gk!.player.character_id).not.toBe("fog_eleanor_hart");
    expect(someStepFor(steps, "training-first-gk")?.message).toContain(gk!.player.name);
    assertGuideIsProgressable(ids, steps);
  });

  it("falls back to three defenders when the roster carries no goalkeeper", () => {
    const ids = STARTER_IDS.filter((id) => !["fog_eleanor_hart", "gold_isadora_freitas"].includes(id));
    const { picks, steps } = buildGuide(ids);
    expect(picks).toHaveLength(3);
    expect(picks.some((pick) => pick.role === "gk")).toBe(false);
    expect(steps.some((step) => step.guideId === "training-first-gk")).toBe(false);
    expect(new Set(picks.map((pick) => pick.player.character_id)).size).toBe(3);
    for (const pick of picks) {
      expect(ids).toContain(pick.player.character_id);
      expect(trainingFocusTotal(pick.player.focus)).toBeLessThan(TOURNAMENT_MAX_FOCUS);
    }
    assertGuideIsProgressable(ids, steps);
  });

  it("prefers an outfield defender as captain when 纱夜 is not brought", () => {
    const ids = STARTER_IDS.filter((id) => id !== "founder_sakura_link_4");
    const { picks, steps } = buildGuide(ids);
    const captain = picks.find((pick) => pick.role === "captain");
    expect(captain).toBeDefined();
    expect(captain!.player.character_id).not.toBe("founder_sakura_link_4");
    expect(captain!.player.position.split("/")[0]).not.toBe("GK");
    assertGuideIsProgressable(ids, steps);
  });

  it("reports no steps when fewer than three trainable registered players exist", () => {
    const squad = createTournamentSave(7).squad;
    const onlyIds = ["founder_sakura_link_4"];
    const registered = new Set(onlyIds);
    const registeredPlayers = sortTournamentPlayers(buildTournamentCharacters(roster.characters, squad).filter((player) => registered.has(player.character_id)));
    const rosterOrder = [...registeredPlayers];
    const picks = selectFirstTrainingPlayers(registeredPlayers, rosterOrder);
    expect(buildFirstTrainingGuideSteps(picks, rosterOrder, 10)).toEqual([]);
  });
});

function someStepFor<T extends { guideId: string }>(steps: T[], guideId: string): T | undefined {
  return steps.find((step) => step.guideId === guideId);
}
