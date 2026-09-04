import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { roster } from "../data/gameData";
import { buildTournamentCharacters, calculateTournamentCurrentOverall, emptyTrainingFocus } from "../data/tournamentSquad";
import { createTournamentSave } from "../storage/tournamentSaveStorage";
import { belongsToPositionGroup, formatAttributeValue, LockerRoomPage, playerSwipeDirection, PlayerDossier } from "./LockerRoomPage";

describe("locker room position filters", () => {
  it("accepts deliberate horizontal player swipes and ignores short or vertical drags", () => {
    expect(playerSwipeDirection(-96, 12)).toBe(1);
    expect(playerSwipeDirection(96, 12)).toBe(-1);
    expect(playerSwipeDirection(64, 0)).toBe(0);
    expect(playerSwipeDirection(100, 90)).toBe(0);
  });

  it("uses both main and alternative positions without mixing unrelated groups", () => {
    expect(belongsToPositionGroup({ position: "CB", alternative_positions: ["CDM"] }, "defender")).toBe(true);
    expect(belongsToPositionGroup({ position: "CB", alternative_positions: ["CDM"] }, "midfielder")).toBe(true);
    expect(belongsToPositionGroup({ position: "LB/CB", alternative_positions: [] }, "defender")).toBe(true);
    expect(belongsToPositionGroup({ position: "LW", alternative_positions: ["CAM"] }, "forward")).toBe(true);
    expect(belongsToPositionGroup({ position: "GK", alternative_positions: [] }, "forward")).toBe(false);
  });

  it("shows every owned player before registration lock and only registered players afterward", () => {
    const initialSquad = createTournamentSave(7).squad;
    const registeredIds = Object.keys(initialSquad.collection);
    const extraId = roster.characters.find(({ character_id }) => !initialSquad.collection[character_id])!.character_id;
    const squad = { ...initialSquad, collection: { ...initialSquad.collection, [extraId]: 1 }, characterProgress: { ...initialSquad.characterProgress, [extraId]: { focus: { attack: 0, playmaking: 0, defense: 0 }, breakthroughRank: 0 } } };
    const renderLocker = (visibleCharacterIds?: string[]) => renderToStaticMarkup(createElement(LockerRoomPage, {
      squad,
      visibleCharacterIds,
      onBackToOffice: () => undefined,
    }));

    expect(renderLocker().match(/class="player-card-tile/g)).toHaveLength(19);
    expect(renderLocker(registeredIds).match(/class="player-card-tile/g)).toHaveLength(18);
  });

  it("renders Saya with her five-star card and rarity", () => {
    const squad = createTournamentSave(7).squad;
    const markup = renderToStaticMarkup(createElement(LockerRoomPage, {
      squad,
      onBackToOffice: () => undefined,
    }));

    expect(markup).toContain("查看纱夜详情，5星");
    expect(markup).toContain('src="/assets/cards/founder-card-art-v2/founder_sakura_link_4.webp?v=785c3ae37356"');
    expect(markup).not.toContain("查看纱夜详情，6星");
  });

  it("keeps the player's short nickname in the right system panel", () => {
    const squad = createTournamentSave(7).squad;
    const saya = buildTournamentCharacters(roster.characters, squad).find(({ character_id }) => character_id === "founder_sakura_link_4")!;
    const markup = renderToStaticMarkup(createElement(PlayerDossier, {
      player: saya,
      activeTab: "overview",
      onTabChange: () => undefined,
    }));

    const visualStage = markup.slice(markup.indexOf('class="dossier-visual-stage"'), markup.indexOf('class="dossier-system-panel"'));
    const systemPanel = markup.slice(markup.indexOf('class="dossier-system-panel"'));
    expect(visualStage).not.toContain("球员昵称");
    expect(systemPanel).toContain('aria-label="球员昵称 纱夜，阵营 樱华连结"');
    expect(systemPanel).toContain('<small>球员昵称</small><strong>纱夜</strong>');
    expect(systemPanel).toContain('樱华连结 ｜ 月城纱夜');
  });

  it("loads Saya's locker interaction in her dossier without changing other players", () => {
    const players = buildTournamentCharacters(roster.characters, createTournamentSave(7).squad);
    const saya = players.find(({ character_id }) => character_id === "founder_sakura_link_4")!;
    const anotherPlayer = players.find(({ character_id }) => character_id !== "founder_sakura_link_4")!;
    const renderDossier = (player: typeof saya) => renderToStaticMarkup(createElement(PlayerDossier, {
      player,
      activeTab: "overview",
      onTabChange: () => undefined,
    }));

    const sayaMarkup = renderDossier(saya);
    expect(sayaMarkup).toContain("/assets/characters/locker-motion-v1/saya-interaction-v3.gif?play=0");
    expect(sayaMarkup).toContain('aria-label="纱夜更衣室互动演出播放中"');
    expect(sayaMarkup).toContain('class="locker-artwork rarity-5 detail standee-artwork"');
    expect(sayaMarkup).toContain('class="saya-locker-replay"');
    expect(renderDossier(anotherPlayer)).not.toContain("saya-locker-motion");
  });

  it("loads Naya's 16-frame interaction through the same locker OS presentation", () => {
    const players = buildTournamentCharacters(roster.characters, createTournamentSave(7, "recruitment", "naya").squad);
    const naya = players.find(({ character_id }) => character_id === "founder_samba_union_7")!;
    const markup = renderToStaticMarkup(createElement(PlayerDossier, {
      player: naya,
      activeTab: "overview",
      onTabChange: () => undefined,
    }));

    expect(markup).toContain("/assets/characters/locker-motion-v1/naya-beach-interaction-v2.webp?play=0");
    expect(markup).toContain('aria-label="娜雅更衣室互动演出播放中"');
    expect(markup).toContain('aria-label="重新播放娜雅更衣室互动演出"');
    expect(markup).toContain('class="saya-locker-motion"');
  });

  it("loads Irena's shy-coach interaction through the same locker OS presentation", () => {
    const players = buildTournamentCharacters(roster.characters, createTournamentSave(7, "recruitment", "irena").squad);
    const irena = players.find(({ character_id }) => character_id === "founder_scarlet_toros_6")!;
    const markup = renderToStaticMarkup(createElement(PlayerDossier, {
      player: irena,
      activeTab: "overview",
      onTabChange: () => undefined,
    }));

    expect(markup).toContain("/assets/characters/locker-motion-v1/irena-chibi-os-v2.webp?play=0");
    expect(markup).toContain('aria-label="伊蕾娜更衣室互动演出播放中"');
    expect(markup).toContain('aria-label="重新播放伊蕾娜更衣室互动演出"');
    expect(markup).toContain("伊蕾娜装大人讲战术、被发现后害羞的互动演出");
  });

  it("shows goalkeeper attributes instead of outfield attributes", () => {
    const giulia = roster.characters.find(({ character_id }) => character_id === "azure_giulia_bellini")!;
    const markup = renderToStaticMarkup(createElement(PlayerDossier, {
      player: { ...giulia, copies: 1, focus: emptyTrainingFocus(), breakthroughRank: 0, currentOverall: calculateTournamentCurrentOverall(giulia, emptyTrainingFocus(), 0) },
      activeTab: "overview",
      onTabChange: () => undefined,
    }));

    const attributes = markup.slice(markup.indexOf("attribute-section"), markup.indexOf("role-summary"));
    expect(attributes).toContain("扑救");
    expect(attributes).toContain("反应");
    expect(attributes).not.toContain("射门");
  });

  it("shows the same current OVR on the locker tile and player dossier", () => {
    const squad = createTournamentSave(7).squad;
    const player = buildTournamentCharacters(roster.characters, squad).find(({ stars }) => stars === 4)!;
    const lockerMarkup = renderToStaticMarkup(createElement(LockerRoomPage, { squad, onBackToOffice: () => undefined }));
    const dossierMarkup = renderToStaticMarkup(createElement(PlayerDossier, { player, activeTab: "overview", onTabChange: () => undefined }));

    expect(player.currentOverall).not.toBe(player.attributes.overall);
    expect(lockerMarkup).toContain(`<small>综合</small><strong>${player.currentOverall}</strong>`);
    expect(dossierMarkup).toContain(`<small>综合</small><strong>${player.currentOverall}</strong>`);
  });

  it("renders calculated decimal attributes as integers in the dossier", () => {
    const saya = buildTournamentCharacters(roster.characters, createTournamentSave(7).squad).find(({ character_id }) => character_id === "founder_sakura_link_4")!;
    const markup = renderToStaticMarkup(createElement(PlayerDossier, {
      player: { ...saya, attributes: { ...saya.attributes, shooting: 84.4 }, copies: 1, focus: { attack: 1, playmaking: 0, defense: 0 }, breakthroughRank: 0 },
      activeTab: "overview",
      onTabChange: () => undefined,
    }));

    expect(formatAttributeValue(84.4)).toBe("84");
    expect(formatAttributeValue(84.5)).toBe("85");
    expect(markup).toContain("<span>射门</span><strong>84</strong>");
  });

  it("explains that duplicate cards star up automatically", () => {
    const squad = createTournamentSave(7).squad;
    const saya = buildTournamentCharacters(roster.characters, squad).find(({ character_id }) => character_id === "founder_sakura_link_4")!;
    const markup = renderToStaticMarkup(createElement(PlayerDossier, {
      player: { ...saya, copies: 2 },
      activeTab: "growth",
      onTabChange: () => undefined,
    }));

    expect(markup).toContain("抽到重复卡会自动升星，不需要额外操作");
    expect(markup).not.toContain("消耗 1 张重复卡升星");
  });
});
