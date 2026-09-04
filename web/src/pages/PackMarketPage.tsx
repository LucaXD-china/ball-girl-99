import {
  ArrowLeft,
  ChevronRight,
  Coins,
  Lock,
  PackageOpen,
  ShieldCheck,
  Shirt,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { assetUrl } from "../services/assetUrl";
import { PlayerCardArtwork, PlayerCardInspector } from "../components/PlayerCardInspector";
import { SayaGuide } from "../components/SayaGuide";
import { factionMeta, roster, type FactionId } from "../data/gameData";
import {
  TOURNAMENT_PACK_SIZE,
  openTournamentRecruitment,
  rarityRates,
  type TournamentRecruitmentResult,
} from "../data/tournamentRecruitment";
import { formatPlayerPositions, positionLabels } from "../data/lockerRoomData";
import { cupFactionBondProfiles } from "../data/matchSimulator";
import { TOURNAMENT_ROSTER_SIZE } from "../data/tournamentJourney";
import { tournamentCaptainRoutes } from "../data/tournamentCaptain";
import type { TournamentCaptainId } from "../data/tournamentCaptain";
import { captainGuideMessage } from "../data/captainGuideCopy";
import { useTournamentCaptain } from "../components/TournamentCaptainContext";
import { playSfx } from "../services/SoundEffects";
import type { TournamentSaveV6 } from "../storage/tournamentSaveStorage";

type RevealPhase = "sealed" | "glow" | "count" | "cards" | "summary";

export function canBeginPackTear(phase: RevealPhase): boolean {
  return phase === "sealed";
}

export function shouldPlayLotteryResult(phase: RevealPhase): boolean {
  return phase === "count";
}

export function isFirstTenRecruitmentRequired(captainId: TournamentCaptainId, pullsMade: number, firstTenGuaranteeUsed: boolean) {
  return captainId === "saya" && pullsMade === 0 && !firstTenGuaranteeUsed;
}

type Props = {
  guideScope: string;
  save: TournamentSaveV6;
  onOpenPack: (opened: TournamentRecruitmentResult) => TournamentSaveV6;
  onBackToOffice: () => void;
  onGoLocker: () => void;
  onLock: () => void;
};

export const recruitmentFactionIds = (Object.keys(factionMeta) as FactionId[])
  .filter((factionId) => roster.characters.some((character) => character.faction_id === factionId));

type RecruitmentGuideState = {
  pullsMade: number;
  firstTenGuaranteeUsed: boolean;
  canLock: boolean;
  selectedFaction: FactionId;
  recruitmentBudget: number;
  captainId?: TournamentCaptainId;
};

export function packMarketGuidePrompt({ pullsMade, firstTenGuaranteeUsed, canLock, selectedFaction, recruitmentBudget, captainId = "saya" }: RecruitmentGuideState) {
  const route = tournamentCaptainRoutes[captainId];
  if (pullsMade === 0 && !firstTenGuaranteeUsed) {
    if (selectedFaction !== route.factionId) {
      return {
        guideId: "recruitment-faction-sakura",
        title: "先认识一下阵营卡包",
        message: captainGuideMessage(captainId, "recruitment-faction", "不同阵营有不同风格。我也来自樱华连结，先看看我们的卡包吧。"),
        target: `recruitment-faction-${route.factionId}`,
        variant: "guide" as const,
        required: captainId === "saya",
      };
    }
    return {
      guideId: "recruitment-first-ten",
      title: "先招募一些同阵营伙伴吧",
      message: captainGuideMessage(captainId, "recruitment-first-ten", "樱华连结擅长接应和穿插。先开启一次十连；重复卡会自动帮你升星，不需要额外操作。"),
      target: "recruitment-ten-pull",
      relatedTarget: "recruitment-faction-dossier",
      variant: "guide" as const,
      required: captainId === "saya",
    };
  }
  if (pullsMade < recruitmentBudget) return null;
  if (canLock) {
    return {
      guideId: "recruitment-finish",
      title: "招募完成，去锁定名单吧",
      message: captainGuideMessage(captainId, "recruitment-finish", `补强完成了。接下来选出${TOURNAMENT_ROSTER_SIZE}人名单，准备出征吧。`),
      target: "recruitment-lock",
      variant: "remind" as const,
      required: captainId === "saya",
    };
  }
  return null;
}

export function recruitmentTopTierPositions(factionId: FactionId, maximumStars: 4 | 5 | 6) {
  const positions = roster.characters
    .filter((character) => character.faction_id === factionId && character.stars === maximumStars)
    .map((character) => positionLabels[character.position] ?? character.position)
    .filter((position, index, values) => values.indexOf(position) === index);
  return positions.join("、") || "—";
}

export function recruitmentTopTierLabel(maximumStars: 4 | 5 | 6) {
  return `${({ 4: "四", 5: "五", 6: "六" } as const)[maximumStars]}星位置`;
}

export function recruitmentSixStarPityText(maximumStars: 4 | 5 | 6, pullsSinceSixStar: number) {
  return maximumStars === 6 ? `${pullsSinceSixStar} / 50` : "本难度不会抽取六星";
}

export function recruitmentFirstTenText(maximumStars: 4 | 5 | 6, used: boolean) {
  if (used) return "已完成";
  return maximumStars === 6 ? "必得 5★+" : `必得 ${maximumStars}★`;
}

export function formatRecruitmentRate(rate: number) {
  return `${Number((rate * 100).toFixed(2))}%`;
}

function PackCover({ factionId, compact = false }: { factionId: FactionId; compact?: boolean }) {
  const faction = factionMeta[factionId];
  return (
    <div
      className={`pack-cover-art${compact ? " compact" : ""}`}
      style={{ "--faction-color": faction.color } as CSSProperties}
      aria-hidden="true"
    >
      <img className="pack-cover-image" src={assetUrl(`/assets/packs/factions-v2/${factionId}.png`)} alt="" />
      <div className="pack-cover-copy">
        <small>PLAYER CARD · FACTION</small>
        <strong>{faction.name}</strong>
        <span>阵营定向封装</span>
      </div>
    </div>
  );
}

function FactionCrest({ factionId }: { factionId: FactionId }) {
  return <svg className="pack-faction-crest" viewBox="0 0 64 72" aria-hidden="true"><use href={assetUrl(`/assets/packs/faction-crests-v1.svg#crest-${factionId}`)} /></svg>;
}

export function PackResultFooter({ onBackToShop }: { onBackToShop: () => void }) {
  return (
    <div className="pack-result-footer">
      <p className="pack-result-locker-tip"><Shirt aria-hidden="true" />新获得和球队已有的球员都已进入更衣室，可随时查看资料与能力。</p>
      <div className="pack-result-actions"><button type="button" onClick={onBackToShop}><PackageOpen aria-hidden="true" />返回球星卡商店</button></div>
    </div>
  );
}

export function PackMarketPage({ guideScope, save, onOpenPack, onBackToOffice, onGoLocker, onLock }: Props) {
  const { captainId } = useTournamentCaptain();
  const captainRoute = tournamentCaptainRoutes[captainId];
  const [selectedFaction, setSelectedFaction] = useState<FactionId>(captainRoute.factionId);
  const [currentSave, setCurrentSave] = useState(save);
  const [openedPack, setOpenedPack] = useState<TournamentRecruitmentResult | null>(null);
  const [phase, setPhase] = useState<RevealPhase>("sealed");
  const [dragDistance, setDragDistance] = useState(0);
  const [cardIndex, setCardIndex] = useState(0);
  const [inspectedCardIndex, setInspectedCardIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dragStartX = useRef<number | null>(null);
  const dragDistanceRef = useRef(0);
  const timer = useRef<number | null>(null);

  useEffect(() => setCurrentSave(save), [save]);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  const selectedMeta = factionMeta[selectedFaction];
  const recruitment = currentSave.campaign.recruitment;
  const recruitmentBudget = captainRoute.recruitmentBudget;
  const displayedRates = rarityRates(0, captainRoute.recruitmentStarCap);
  const canLock = Object.keys(currentSave.squad.collection).length >= TOURNAMENT_ROSTER_SIZE;
  const firstTenRequired = isFirstTenRecruitmentRequired(captainId, recruitment.pullsMade, recruitment.progress.firstTenGuaranteeUsed);
  const factionSelectionRequired = firstTenRequired && selectedFaction !== captainRoute.factionId;
  const guidePrompt = packMarketGuidePrompt({
    pullsMade: recruitment.pullsMade,
    firstTenGuaranteeUsed: recruitment.progress.firstTenGuaranteeUsed,
    canLock,
    selectedFaction,
    recruitmentBudget,
    captainId,
  });

  function purchasePack(drawCount: 1 | typeof TOURNAMENT_PACK_SIZE) {
    setError(null);
    if (recruitment.budgetRemaining < drawCount || recruitment.pullsMade + drawCount > recruitmentBudget) {
      setError(`本届赛事的${recruitmentBudget}抽补强预算不足。`);
      return;
    }
    const opened = openTournamentRecruitment(
      roster.characters,
      selectedFaction,
      currentSave.squad.collection,
      recruitment.progress,
      Math.random,
      drawCount,
      captainRoute.recruitmentStarCap,
    );
    try {
      const nextSave = onOpenPack(opened);
      setCurrentSave(nextSave);
      setOpenedPack(opened);
      setPhase("sealed");
      setDragDistance(0);
      setCardIndex(0);
      setInspectedCardIndex(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "卡包购买失败");
    }
  }

  function beginTear() {
    if (!openedPack || !canBeginPackTear(phase)) return;
    playSfx("lottery-slide");
    dragDistanceRef.current = 180;
    setDragDistance(180);
    setPhase("glow");
    timer.current = window.setTimeout(() => enterRevealPhase("count"), 1250);
  }

  function enterRevealPhase(nextPhase: RevealPhase) {
    if (shouldPlayLotteryResult(nextPhase)) playSfx("lottery-result");
    setPhase(nextPhase);
  }

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (phase !== "sealed") return;
    dragStartX.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    if (dragStartX.current === null || phase !== "sealed") return;
    const nextDistance = Math.min(180, Math.max(0, event.clientX - dragStartX.current));
    dragDistanceRef.current = nextDistance;
    setDragDistance(nextDistance);
  }

  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    if (dragStartX.current === null) return;
    const shouldOpen = dragDistanceRef.current >= 108;
    dragStartX.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (shouldOpen) beginTear();
    else {
      dragDistanceRef.current = 0;
      setDragDistance(0);
    }
  }

  function nextCard() {
    if (!openedPack) return;
    if (cardIndex < openedPack.cards.length - 1) setCardIndex((index) => index + 1);
    else enterRevealPhase("summary");
  }

  function revealFirstCard() {
    enterRevealPhase("cards");
  }

  function skipToSummary() {
    enterRevealPhase("summary");
  }

  function closeReveal() {
    setOpenedPack(null);
    setPhase("sealed");
    setDragDistance(0);
    dragDistanceRef.current = 0;
    setCardIndex(0);
    setInspectedCardIndex(null);
  }

  function selectFaction(factionId: FactionId) {
    playSfx("common");
    setSelectedFaction(factionId);
    setError(null);
  }

  return (
    <div className="pack-market-screen" style={{ "--faction-color": selectedMeta.color } as CSSProperties}>
      <header className="pack-market-heading">
        <button type="button" className="pack-market-back" disabled={firstTenRequired} onClick={onBackToOffice} aria-label="返回经理办公室"><ArrowLeft aria-hidden="true" /></button>
        <button type="button" className="pack-locker-link" data-saya-guide-target="recruitment-locker" disabled={firstTenRequired} onClick={onGoLocker} aria-label="前往球员更衣室查看已有球员"><Shirt aria-hidden="true" /><span><b>球员更衣室</b><small>查看已有球员</small></span></button>
        <div className="pack-wallet"><Coins aria-hidden="true" /><span><small>Day 1补强 · {recruitment.pullsMade}/{recruitmentBudget}抽</small><strong>{recruitment.budgetRemaining} 抽</strong></span></div>
        <button type="button" className="pack-recruitment-lock" data-saya-guide-target="recruitment-lock" data-sfx="confirm" disabled={firstTenRequired || !canLock} onClick={onLock} aria-label={canLock ? `结束补强，进入${TOURNAMENT_ROSTER_SIZE}人名单注册` : `结束补强，至少获得${TOURNAMENT_ROSTER_SIZE}名球员`}><Lock aria-hidden="true" /><span><b>结束补强</b><small>{canLock ? `进入${TOURNAMENT_ROSTER_SIZE}人名单注册` : `至少获得${TOURNAMENT_ROSTER_SIZE}名球员`}</small></span></button>
      </header>

      <main className="pack-shop-stage">
        <nav className="pack-faction-rail" aria-label="选择阵营卡包">
          <div className="pack-rail-heading"><small>FACTIONS</small><strong>阵营货架</strong></div>
          <div className="pack-rail-list">
            {recruitmentFactionIds.map((factionId) => (
              <button type="button" key={factionId} className={`${selectedFaction === factionId ? "selected" : ""}${factionSelectionRequired && factionId === "sakura_link" ? " saya-guide-forced-target" : ""}`} data-saya-guide-target={`recruitment-faction-${factionId}`} data-sfx="none" style={{ "--rail-color": factionMeta[factionId].color } as CSSProperties} onClick={() => selectFaction(factionId)} aria-pressed={selectedFaction === factionId} disabled={firstTenRequired && (!factionSelectionRequired || factionId !== "sakura_link")}>
                <i><FactionCrest factionId={factionId} /></i>
                <span><strong>{factionMeta[factionId].name}</strong></span>
              </button>
            ))}
          </div>
        </nav>

        <section className="pack-counter-display" aria-label={`${selectedMeta.name}卡包柜台`}>
          <div key={selectedFaction} className="pack-counter-pack"><PackCover factionId={selectedFaction} /></div>
          <div className="pack-counter-purchase">
            <div className="pack-purchase-actions">
              <button type="button" className="pack-buy-button single-pull" data-sfx="confirm" onClick={() => purchasePack(1)} disabled={firstTenRequired || recruitment.budgetRemaining < 1 || recruitment.pullsMade >= recruitmentBudget}>
                <PackageOpen aria-hidden="true" /><span>单抽<strong><Coins aria-hidden="true" />1</strong></span>
              </button>
              <button type="button" className={`pack-buy-button ten-pull${firstTenRequired && !factionSelectionRequired ? " saya-guide-forced-target" : ""}`} data-saya-guide-target="recruitment-ten-pull" data-sfx="confirm" onClick={() => purchasePack(TOURNAMENT_PACK_SIZE)} disabled={factionSelectionRequired || recruitment.budgetRemaining < TOURNAMENT_PACK_SIZE || recruitment.pullsMade + TOURNAMENT_PACK_SIZE > recruitmentBudget}>
                <PackageOpen aria-hidden="true" /><span>十连抽<strong><Coins aria-hidden="true" />{TOURNAMENT_PACK_SIZE}</strong></span>
              </button>
            </div>
            {error ? <p className="pack-error" role="alert">{error}</p> : null}
          </div>
        </section>

        <aside className="pack-faction-dossier" data-saya-guide-target="recruitment-faction-dossier" aria-label={`${selectedMeta.name}阵营介绍`}>
          <div className="pack-dossier-tab"><i />FACTION FILE</div>
          <h2>{selectedMeta.name}</h2>
          <p className="pack-faction-intro">同阵营三人激活：{cupFactionBondProfiles[selectedFaction].effectLabel}。</p>
          <dl className="pack-dossier-facts">
            <div><dt>{recruitmentTopTierLabel(captainRoute.recruitmentStarCap)}</dt><dd>{recruitmentTopTierPositions(selectedFaction, captainRoute.recruitmentStarCap)}</dd></div>
          </dl>
          <div className="pack-rate-row" aria-label="卡包星级概率">
            {([3, 4, 5, 6] as const).map((stars) => <span key={stars}><b>{stars}★</b><strong>{formatRecruitmentRate(displayedRates[stars])}</strong></span>)}
          </div>
          <dl className="pack-pity-status">
            <div><dt><ShieldCheck aria-hidden="true" />首次十连</dt><dd>{recruitmentFirstTenText(captainRoute.recruitmentStarCap, recruitment.progress.firstTenGuaranteeUsed)}</dd></div>
            <div><dt><Sparkles aria-hidden="true" />六星保底进度</dt><dd>{recruitmentSixStarPityText(captainRoute.recruitmentStarCap, recruitment.progress.pullsSinceSixStar)}</dd></div>
          </dl>
          <p className="pack-dossier-footnote">本包只包含该阵营可招募球员；御三家不进入招募池。{captainRoute.recruitmentStarCap === 6 ? "首次十连保底不影响此前单抽，任意阵营每一抽都可按正常2%概率获得六星。" : `本难度最高只能抽取${recruitmentTopTierLabel(captainRoute.recruitmentStarCap).replace("位置", "角色")}，不会抽取六星。`}</p>
        </aside>
      </main>

      {openedPack ? (
        <div className={`pack-reveal-overlay phase-${phase} tier-${openedPack.revealTier}`} role="dialog" aria-modal="true" aria-label={`${factionMeta[openedPack.factionId].name}卡包开启`}>
          {openedPack.revealTier === "six-star" ? <div className="pack-burst" aria-hidden="true">{Array.from({ length: 18 }, (_, index) => <i key={index} style={{ "--burst-index": index } as CSSProperties} />)}</div> : null}

          {phase === "sealed" || phase === "glow" ? (
            <div className="pack-tear-stage">
              <p>{phase === "sealed" ? "按住撕口，从左向右划开封条" : openedPack.revealTier === "six-star" ? "裂缝过载 · 最高稀有度反应！" : openedPack.revealTier === "gold" ? "裂缝中渗出金色信号" : "裂缝中渗出淡蓝信号"}</p>
              <div
                className="pack-tear-target"
                onPointerDown={pointerDown}
                onPointerMove={pointerMove}
                onPointerUp={pointerUp}
                onPointerCancel={() => { dragStartX.current = null; dragDistanceRef.current = 0; setDragDistance(0); }}
                style={{
                  "--tear-x": `${Math.round((dragDistance / 180) * 100)}%`,
                  "--tear-opacity": Math.max(.12, dragDistance / 180),
                  "--lid-lift": `${Math.round((dragDistance / 180) * -13)}px`,
                  "--lid-angle": `${((dragDistance / 180) * -2.2).toFixed(2)}deg`,
                  "--body-drop": `${Math.round((dragDistance / 180) * 7)}px`,
                } as CSSProperties}
              >
                <span className="pack-inner-cards" aria-hidden="true"><i /><i /><i /></span>
                <span className="pack-tear-layer pack-tear-body"><PackCover factionId={openedPack.factionId} /></span>
                <span className="pack-tear-layer pack-tear-lid"><PackCover factionId={openedPack.factionId} /></span>
                <span className="pack-crack-spill" aria-hidden="true"><i /><i /><i /></span>
                <span className="pack-tear-rip" aria-hidden="true" />
                <span className="pack-tear-handle"><b>TEAR</b><i>→</i></span>
              </div>
              {phase === "sealed" ? <button type="button" data-sfx="none" onClick={beginTear}>点击也可撕开</button> : null}
            </div>
          ) : null}

          {phase === "count" ? (
            <div className="pack-count-actions">
              <button type="button" className="pack-count-reveal" data-sfx="none" onClick={revealFirstCard}>
                <small>本次封装</small><strong>{openedPack.cards.length}</strong><span>张球员卡</span><b>逐张展开 <ChevronRight aria-hidden="true" /></b>
              </button>
              {openedPack.cards.length > 1 ? <button type="button" className="pack-skip-reveal" data-sfx="none" aria-label="跳过逐张查看，直接显示全部结果" onClick={skipToSummary}>跳过</button> : null}
            </div>
          ) : null}

          {phase === "cards" ? (
            <article className={`single-card-reveal rarity-${openedPack.cards[cardIndex].character.stars}`}>
              <div className="reveal-progress"><span>{cardIndex + 1}</span><i>/</i><b>{openedPack.cards.length}</b></div>
              <PlayerCardArtwork key={`${openedPack.cards[cardIndex].character.character_id}-${cardIndex}`} player={openedPack.cards[cardIndex].character} reveal />
              <div className="reveal-card-copy">
                <small>{factionMeta[openedPack.cards[cardIndex].character.faction_id].name} · {formatPlayerPositions(openedPack.cards[cardIndex].character)}</small>
                <h2>{openedPack.cards[cardIndex].character.name}</h2>
                <p>{openedPack.cards[cardIndex].isNew ? "NEW · 首次加入收藏" : `重复卡 · 当前第 ${openedPack.cards[cardIndex].copyNumber} 张`}</p>
                <div className="reveal-card-actions">
                  <button type="button" data-sfx={cardIndex < openedPack.cards.length - 1 ? "none" : undefined} onClick={nextCard}>{cardIndex === openedPack.cards.length - 1 ? "查看结算" : "下一张"}<ChevronRight aria-hidden="true" /></button>
                  {cardIndex < openedPack.cards.length - 1 ? <button type="button" className="pack-skip-reveal" data-sfx="none" aria-label="跳过逐张查看，直接显示全部结果" onClick={skipToSummary}>跳过</button> : null}
                </div>
              </div>
            </article>
          ) : null}

          {phase === "summary" ? (
            <section className="pack-result-summary">
              <div className={`pack-result-grid${openedPack.cards.length === 1 ? " single-result" : ""}`}>
                {openedPack.cards.map((card, index) => (
                  <button
                    type="button"
                    className="pack-result-card"
                    key={`${card.character.character_id}-${index}`}
                    style={{ "--result-index": index } as CSSProperties}
                    onClick={() => setInspectedCardIndex(index)}
                    aria-label={`查看${card.character.name}详情，${card.character.stars}星，${card.isNew ? "新球员" : `重复卡，已自动升星，第${card.copyNumber}张`}`}
                  >
                    <PlayerCardArtwork player={card.character} />
                    <span>{card.isNew ? "NEW" : "自动升星"}</span>
                  </button>
                ))}
              </div>
              <PackResultFooter onBackToShop={closeReveal} />
              {inspectedCardIndex !== null ? (() => {
                const inspectedCard = openedPack.cards[inspectedCardIndex];
                const player = inspectedCard.character;
                return <PlayerCardInspector
                  player={player}
                  eyebrow={`本次第 ${inspectedCardIndex + 1} 张 · ${factionMeta[player.faction_id].name}`}
                  status={inspectedCard.isNew ? "NEW · 首次加入收藏" : `重复卡 · 已自动升星 · 当前第 ${inspectedCard.copyNumber} 张`}
                  ariaLabel={`${player.name}抽卡详情`}
                  onClose={() => setInspectedCardIndex(null)}
                />;
              })() : null}
            </section>
          ) : null}
        </div>
      ) : null}
      {!openedPack && guidePrompt ? <SayaGuide scope={guideScope} {...guidePrompt} /> : null}
    </div>
  );
}
