import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { shouldStronglyGuideRecruitmentFromOffice, TournamentApp } from "./TournamentApp";
import { generateTournament } from "./data/tournamentJourney";
import { createTournamentSave, tournamentSaveKey } from "./storage/tournamentSaveStorage";

describe("office recruitment guidance", () => {
  it("releases Saya's strong shop guidance after the first ten-pull", () => {
    expect(shouldStronglyGuideRecruitmentFromOffice("saya", false)).toBe(true);
    expect(shouldStronglyGuideRecruitmentFromOffice("saya", true)).toBe(false);
    expect(shouldStronglyGuideRecruitmentFromOffice("naya", false)).toBe(false);
    expect(shouldStronglyGuideRecruitmentFromOffice("irena", false)).toBe(false);
  });
});

describe("opponent story presentation", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("locks opponent scouting on match day and explains why", () => {
    const values = new Map<string, string>();
    const save = createTournamentSave(13, "preparation");
    const tournament = generateTournament(save.campaign.campaignSeed);
    save.campaign.fixtures = tournament.fixtures;
    save.campaign.route = tournament.route;
    save.campaign.bracket = tournament.bracket;
    const fixture = tournament.fixtures[0];
    save.campaign.phase = "preparation";
    save.campaign.day = fixture.day;
    values.set(tournamentSaveKey("manager"), JSON.stringify(save));
    values.set("ball-girl:tournament-guide:v1:manager", JSON.stringify(["office-saya-introduction-v1"]));
    const storyArchive = { schemaVersion: 2 as const, unlockedAt: {}, endingVariants: {}, updatedAt: "2026-08-22T00:00:00.000Z" };
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    });

    const html = renderToStaticMarkup(createElement(TournamentApp, {
      account: { uid: "manager", account: "manager", nickname: "测试", isGuest: false, createdAt: "2026-08-22T00:00:00.000Z", updatedAt: "2026-08-22T00:00:00.000Z" },
      opening: { schemaVersion: 1, prologueBeat: 3, nicknameConfirmed: true, clubName: "晴空少女", prologueCompleted: true, day1StoryBeat: 32, day1StoryCompleted: true, updatedAt: "2026-08-22T00:00:00.000Z" },
      storyArchive,
      onStoryArchiveChange: () => undefined,
      onUnlockStories: async () => storyArchive,
      onUpdateNickname: async () => { throw new Error("not used"); },
      onBindAccount: async () => { throw new Error("not used"); },
      onLogout: async () => undefined,
    }));

    expect(html).toContain('data-saya-guide-target="office-scout-report" disabled="" title="比赛日已到，无法观察对手"');
    expect(html).toContain("比赛日已到，无法观察对手");
  });

  it("renders the Ivory Capital artwork without the office navigation", () => {
    const values = new Map<string, string>();
    const save = createTournamentSave(7, "story");
    save.campaign.pendingStoryId = "OPPONENT-ivory_capital";
    save.campaign.day = 57;
    save.campaign.shownTimelineCardIds = ["DAY-57"];
    values.set(tournamentSaveKey("manager"), JSON.stringify(save));
    const storyArchive = { schemaVersion: 2 as const, unlockedAt: {}, endingVariants: {}, updatedAt: "2026-08-22T00:00:00.000Z" };
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    });

    const html = renderToStaticMarkup(createElement(TournamentApp, {
      account: { uid: "manager", account: "manager", nickname: "测试", isGuest: false, createdAt: "2026-08-22T00:00:00.000Z", updatedAt: "2026-08-22T00:00:00.000Z" },
      opening: { schemaVersion: 1, prologueBeat: 3, nicknameConfirmed: true, clubName: "晴空少女", prologueCompleted: true, day1StoryBeat: 32, day1StoryCompleted: true, updatedAt: "2026-08-22T00:00:00.000Z" },
      storyArchive,
      onStoryArchiveChange: () => undefined,
      onUnlockStories: async () => storyArchive,
      onUpdateNickname: async () => { throw new Error("not used"); },
      onBindAccount: async () => { throw new Error("not used"); },
      onLogout: async () => undefined,
    }));

    expect(html).toContain('data-opponent-story="ivory_capital"');
    expect(html).toContain('/assets/scenes/opponent-stories-v2/ivory-capital.png');
    expect(html).not.toContain('class="game-dock"');
    expect(html).not.toContain('aria-label="游戏主菜单"');
  });

  it("renders the Day 1 story immediately after the Day 1 title card", () => {
    const values = new Map<string, string>();
    const save = createTournamentSave(11, "recruitment");
    save.campaign.shownTimelineCardIds = ["DAY-1"];
    values.set(tournamentSaveKey("manager"), JSON.stringify(save));
    const storyArchive = { schemaVersion: 2 as const, unlockedAt: {}, endingVariants: {}, updatedAt: "2026-08-22T00:00:00.000Z" };
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    });

    const html = renderToStaticMarkup(createElement(TournamentApp, {
      account: { uid: "manager", account: "manager", nickname: "测试", isGuest: false, createdAt: "2026-08-22T00:00:00.000Z", updatedAt: "2026-08-22T00:00:00.000Z" },
      opening: { schemaVersion: 1, prologueBeat: 3, nicknameConfirmed: true, clubName: "晴空少女", prologueCompleted: true, day1StoryBeat: 0, day1StoryCompleted: false, updatedAt: "2026-08-22T00:00:00.000Z" },
      storyArchive,
      onStoryArchiveChange: () => undefined,
      onUnlockStories: async () => storyArchive,
      onUpdateNickname: async () => { throw new Error("not used"); },
      onBindAccount: async () => { throw new Error("not used"); },
      onLogout: async () => undefined,
      onDay1StoryBeatChange: () => undefined,
      onDay1StoryComplete: () => undefined,
    }));

    expect(html).toContain('data-day1-story-beat="0"');
    expect(html).toContain("冠军联赛重要吗？");
    expect(html).not.toContain('aria-label="游戏主菜单"');
  });
});
