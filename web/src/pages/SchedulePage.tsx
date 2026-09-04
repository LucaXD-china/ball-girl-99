import { ArrowLeft, Check, Play, Share2, Trophy } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Portrait } from "../components/MatchPortrait";
import { SayaGuide } from "../components/SayaGuide";
import { useTournamentCaptain } from "../components/TournamentCaptainContext";
import { captainGuideMessage } from "../data/captainGuideCopy";
import { playableCharacters, type Character } from "../data/gameData";
import { formatPlayerPositions } from "../data/lockerRoomData";
import { resolveMatchDaySceneUrl } from "../data/matchDayScenes";
import { deriveTournamentBracket, type BracketMatch, type TournamentBracket } from "../data/tournamentBracket";
import { tournamentEndingFor } from "../data/tournamentEnding";
import type { TournamentCaptainId } from "../data/tournamentCaptain";
import { clubBlueprints, playerClub, stageMeta, stageOrder, TOURNAMENT_PLAYER_CLUB_ID, type ClubBlueprint, type TournamentFixture } from "../data/tournamentJourney";
import { buildTournamentCharacters } from "../data/tournamentSquad";
import { summarizeTournamentJourney, type TournamentSummaryEntry } from "../data/tournamentSummary";
import { downloadJourneyReport } from "../services/journeyReportImage";
import type { TournamentCampaignState, TournamentSquadState } from "../storage/tournamentSaveStorage";
import { twoLegAggregateScore } from "./MatchPage";
import { TournamentEndingPage } from "./TournamentEndingPage";

type Props = {
  guideScope: string;
  managerNickname: string;
  clubName: string;
  squad: TournamentSquadState;
  campaign: TournamentCampaignState;
  onBackToOffice: () => void;
  onConfirmDraw: () => void;
  onRestart: () => void;
  onStoryPresentationChange?: (open: boolean) => void;
};

export function SchedulePage({ guideScope, managerNickname, clubName, squad, campaign, onBackToOffice, onConfirmDraw, onRestart, onStoryPresentationChange }: Props) {
  const allOwnedPlayers = useMemo(
    () => buildTournamentCharacters(playableCharacters, squad),
    [squad.characterProgress, squad.collection],
  );
  if (campaign.phase === "draw") {
    const opponent = clubBlueprints.find(({ id }) => id === campaign.route[0]);
    if (!opponent) return null;
    return <TournamentDrawView guideScope={guideScope} opponent={opponent} bracketIds={campaign.bracket} clubName={clubName} onConfirm={onConfirmDraw} onBack={onBackToOffice} />;
  }
  if (campaign.phase === "finished") {
    if (!campaign.outcome) return null;
    return <TournamentEndView guideScope={guideScope} outcome={campaign.outcome} results={campaign.results} fixtures={campaign.fixtures} registeredIds={campaign.registration.registeredIds} managerNickname={managerNickname} clubName={clubName} captainId={campaign.captainId ?? "saya"} players={allOwnedPlayers} onRestart={onRestart} onBack={onBackToOffice} onStoryPresentationChange={onStoryPresentationChange} />;
  }
  return <TournamentBracketScreen clubName={clubName} campaign={campaign} onBack={onBackToOffice} />;
}

function resolveBracketTeam(teamId: string | null, clubName: string) {
  if (!teamId) return { name: "待定", crestUrl: null };
  if (teamId === TOURNAMENT_PLAYER_CLUB_ID) return { name: clubName, crestUrl: playerClub.crestUrl };
  const club = clubBlueprints.find(({ id }) => id === teamId);
  return club ? { name: club.name, crestUrl: club.crestUrl } : { name: "待定", crestUrl: null };
}

export function TournamentBracketView({ bracket, clubName }: { bracket: TournamentBracket; clubName: string }) {
  const [roundOf16, quarterFinals, semiFinals, final] = bracket.rounds;
  const champion = resolveBracketTeam(bracket.championId, clubName);
  const championKnown = bracket.championId !== null;

  const renderTeamSlot = (teamId: string | null, isWinner: boolean) => {
    if (teamId === null) return <span className="bracket-slot is-pending"><i>?</i><b>待定</b></span>;
    const team = resolveBracketTeam(teamId, clubName);
    const isPlayer = teamId === TOURNAMENT_PLAYER_CLUB_ID;
    return (
      <span className={isPlayer ? "player-team" : undefined}>
        <img src={team.crestUrl ?? undefined} alt="" />
        <b>{team.name}</b>
        {isWinner ? <em>晋级</em> : null}
      </span>
    );
  };

  const renderMatch = (match: BracketMatch) => (
    <article key={match.index} className={match.involvesPlayer ? "player-path" : undefined}>
      {renderTeamSlot(match.leftTeamId, match.winnerId !== null && match.winnerId === match.leftTeamId)}
      {renderTeamSlot(match.rightTeamId, match.winnerId !== null && match.winnerId === match.rightTeamId)}
    </article>
  );

  return (
    <div className="draw-bracket">
      <section className="draw-bracket-half left-half">
        <section className="draw-bracket-round round-of-16">
          <header><small>ROUND OF 16</small><strong>16强</strong></header>
          <div>{roundOf16.matches.slice(0, 4).map(renderMatch)}</div>
        </section>
        <section className="draw-bracket-round quarter-finals">
          <header><small>QUARTER-FINALS</small><strong>八强</strong></header>
          <div>{quarterFinals.matches.slice(0, 2).map(renderMatch)}</div>
        </section>
        <section className="draw-bracket-round semi-finals">
          <header><strong>半决赛</strong><small>SEMI-FINALS</small></header>
          <div>{semiFinals.matches.slice(0, 1).map(renderMatch)}</div>
        </section>
      </section>
      <section className="draw-final-stage">
        <header><small>FINAL</small><strong>决赛</strong></header>
        <div className="draw-trophy-focus"><span><Trophy aria-hidden="true" /></span><small>ROAD TO GLORY</small><strong>冠军之路</strong></div>
        {final.matches.map(renderMatch)}
        <div className="draw-champion-slot">
          <Trophy aria-hidden="true" />
          <span><small>CHAMPION</small><strong>{championKnown ? champion.name : "冠军"}</strong></span>
        </div>
      </section>
      <section className="draw-bracket-half right-half">
        <section className="draw-bracket-round semi-finals">
          <header><strong>半决赛</strong><small>SEMI-FINALS</small></header>
          <div>{semiFinals.matches.slice(1, 2).map(renderMatch)}</div>
        </section>
        <section className="draw-bracket-round quarter-finals">
          <header><strong>八强</strong><small>QUARTER-FINALS</small></header>
          <div>{quarterFinals.matches.slice(2, 4).map(renderMatch)}</div>
        </section>
        <section className="draw-bracket-round round-of-16">
          <header><strong>16强</strong><small>ROUND OF 16</small></header>
          <div>{roundOf16.matches.slice(4, 8).map(renderMatch)}</div>
        </section>
      </section>
    </div>
  );
}

function TournamentBracketScreen({ clubName, campaign, onBack }: { clubName: string; campaign: TournamentCampaignState; onBack: () => void }) {
  const currentStageIndex = stageOrder.indexOf(campaign.fixtures[campaign.currentFixtureIndex]?.stage ?? "round_of_16");
  const bracket = useMemo(() => deriveTournamentBracket(campaign, currentStageIndex), [campaign, currentStageIndex]);

  return (
    <div className="schedule-screen tournament-draw-screen">
      <header className="schedule-heading draw-page-heading">
        <button type="button" className="schedule-back" onClick={onBack} aria-label="返回经理办公室"><ArrowLeft aria-hidden="true" /></button>
        <div><p>CHAMPIONS LEAGUE BRACKET</p><h1>赛程晋级图</h1><span>每轮更新晋级队伍，未决出的对阵保持待定</span></div>
      </header>
      <main className="draw-bracket-layout bracket-only">
        <section className="draw-bracket-board" aria-label="冠军联赛赛程晋级图">
          <TournamentBracketView bracket={bracket} clubName={clubName} />
        </section>
      </main>
    </div>
  );
}

export function TournamentEndView({ guideScope, outcome, results, fixtures, registeredIds, managerNickname, clubName, captainId = "saya", players, onRestart, onBack, onStoryPresentationChange }: { guideScope: string; outcome: "champion" | "eliminated"; results: TournamentSummaryEntry[]; fixtures: TournamentFixture[]; registeredIds: string[]; managerNickname: string; clubName: string; captainId?: TournamentCaptainId; players: Character[]; onRestart: () => void; onBack: () => void; onStoryPresentationChange?: (open: boolean) => void }) {
  const [endingStarted, setEndingStarted] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const endingId = tournamentEndingFor(outcome, results, fixtures, captainId);
  const registeredPlayers = players.filter(({ character_id }) => registeredIds.includes(character_id));
  const summary = summarizeTournamentJourney(results, outcome, registeredPlayers, fixtures, endingId);
  const playersById = new Map(players.map((player) => [player.character_id, player]));
  const tournamentMvp = summary.tournamentMvp ? { performance: summary.tournamentMvp, player: playersById.get(summary.tournamentMvp.characterId) } : null;
  const fixtureMap = new Map(fixtures.map((fixture) => [fixture.id, fixture]));
  const venueSceneUrl = resolveMatchDaySceneUrl({ phase: "end" });

  useEffect(() => {
    onStoryPresentationChange?.(endingStarted);
    return () => onStoryPresentationChange?.(false);
  }, [endingStarted, onStoryPresentationChange]);

  async function shareReport() {
    if (exporting) return;
    setExporting(true);
    setExported(false);
    try {
      await downloadJourneyReport({
        clubName,
        managerNickname,
        outcome,
        score: summary.score,
        evaluation: summary.evaluation,
        matches: summary.matches,
        wins: summary.wins,
        draws: summary.draws,
        losses: summary.losses,
        goalsFor: summary.goalsFor,
        goalsAgainst: summary.goalsAgainst,
        squadStrength: summary.squadStrength,
        averageStars: summary.averageStars,
        averageOverall: summary.averageOverall,
        mvp: tournamentMvp?.player && tournamentMvp.performance ? {
          name: tournamentMvp.player.name,
          averageRating: tournamentMvp.performance.averageRating,
          appearances: tournamentMvp.performance.appearances,
          goals: tournamentMvp.performance.goals,
          assists: tournamentMvp.performance.assists,
        } : undefined,
        fixtures: results.map((entry) => {
          const fixture = fixtureMap.get(entry.fixtureId);
          const home = entry.result.homeScore + (entry.extraTime?.player ?? 0);
          const away = entry.result.awayScore + (entry.extraTime?.opponent ?? 0);
          const detail = entry.penalties
            ? `点球 ${entry.penalties.player}:${entry.penalties.opponent}`
            : entry.extraTime ? "加时" : undefined;
          return {
            day: fixture?.day ?? "—",
            stage: fixture ? fixture.stage === "final" ? "决赛" : `${stageMeta[fixture.stage].name}第${fixture.leg}回合` : "淘汰赛",
            opponent: entry.result.awayName,
            score: `${home}:${away}`,
            detail,
            outcome: home > away ? "win" as const : home < away ? "loss" as const : "draw" as const,
          };
        }),
      });
      setExported(true);
    } catch (error) {
      console.error("征程报告导出失败", error);
    } finally {
      setExporting(false);
    }
  }

  if (endingStarted) return <TournamentEndingPage endingId={endingId} managerNickname={managerNickname} clubName={clubName} captainId={captainId} onBackToOffice={onBack} onRestart={onRestart} />;
  return <div className="schedule-screen tournament-end-screen" data-match-day-scene={venueSceneUrl ? "ready" : undefined} style={venueSceneUrl ? { "--match-day-scene": `url("${venueSceneUrl}")` } as CSSProperties : undefined}>
    <header className="journey-summary-hero"><div className="journey-score-ring"><strong>{summary.score}</strong><span>征程评分</span></div><div className="journey-club-summary"><img src={playerClub.crestUrl} alt={`${clubName}队徽`} /><small>{outcome === "champion" ? "DAY 99 · CHAMPIONS" : "TOURNAMENT JOURNEY ENDED"}</small><h1>{outcome === "champion" ? "99日争冠完成" : "本届征程结束"}</h1><p>{managerNickname}带领{clubName}完成了{summary.matches}场淘汰赛，交出{summary.wins}胜{summary.draws}平{summary.losses}负、{summary.goalsFor}进球的答卷。</p></div><span className="journey-evaluation"><Trophy aria-hidden="true" /><small>杯赛评价</small><strong>{summary.evaluation}</strong></span></header>
    <main className="journey-summary-grid">
      <section className="journey-stat-panel"><header><span>经理战报</span><small>MANAGER REVIEW</small></header><dl><div><dt>比赛</dt><dd>{summary.matches}</dd></div><div><dt>战绩</dt><dd>{summary.wins}-{summary.draws}-{summary.losses}</dd></div><div><dt>进失球</dt><dd>{summary.goalsFor}:{summary.goalsAgainst}</dd></div><div><dt>名单强度</dt><dd>{summary.squadStrength}</dd></div></dl><p>锁定18人平均 {summary.averageStars}★ / Overall {summary.averageOverall}；征程评分由名单基础与最终排名综合计算。</p></section>
      <section className="journey-mvp-panel"><header><span>赛事 MVP</span><small>PLAYER OF THE TOURNAMENT</small></header>{tournamentMvp?.player ? <div className="journey-mvp-feature"><Portrait player={tournamentMvp.player} preferStandee /><div><small>{"★".repeat(tournamentMvp.player.stars)} · {formatPlayerPositions(tournamentMvp.player)}</small><h2>{tournamentMvp.player.name}</h2><strong>{tournamentMvp.performance.averageRating.toFixed(1)}<span>赛事均分</span></strong><p>{tournamentMvp.performance.appearances}场 · {tournamentMvp.performance.goals}球 · {tournamentMvp.performance.assists}助攻 · {tournamentMvp.performance.skillTriggers}次技能</p></div></div> : <p className="journey-no-mvp">暂无足够比赛数据</p>}</section>
      <section className="journey-timeline"><header><span>完整征程</span><small>FIXTURE HISTORY</small></header><div>{results.map((entry) => { const fixture = fixtureMap.get(entry.fixtureId); const legHome = entry.result.homeScore + (entry.extraTime?.player ?? 0); const legAway = entry.result.awayScore + (entry.extraTime?.opponent ?? 0); const firstLeg = fixture?.leg === 2 ? results.find((other) => { const otherFixture = fixtureMap.get(other.fixtureId); return otherFixture?.stage === fixture.stage && otherFixture.leg === 1; }) : undefined; const aggregate = firstLeg ? twoLegAggregateScore({ home: firstLeg.result.homeScore, away: firstLeg.result.awayScore }, legHome, legAway) : undefined; const detail = [aggregate ? `总比分 ${aggregate.home}:${aggregate.away}` : null, entry.penalties ? `点球 ${entry.penalties.player}:${entry.penalties.opponent}` : entry.extraTime ? "加时" : null].filter(Boolean).join(" · "); const legOutcome = legHome > legAway ? "is-win" : legHome < legAway ? "is-loss" : "is-draw"; return <article key={entry.fixtureId} className={`journey-fixture ${legOutcome}`}><time>Day {fixture?.day ?? "—"}</time><span><strong>{fixture ? fixture.stage === "final" ? "决赛" : `${stageMeta[fixture.stage].name}第${fixture.leg}回合` : "淘汰赛"}</strong><small>{clubName} vs {entry.result.awayName}</small></span><b>{legHome}:{legAway}</b>{detail ? <em>{detail}</em> : null}</article>; })}</div></section>
    </main>
    <div className="journey-summary-actions"><button type="button" onClick={onBack}><ArrowLeft aria-hidden="true" />返回办公室</button><button type="button" onClick={shareReport} disabled={exporting} title="将整份征程报告导出为 PNG 图片"><Share2 aria-hidden="true" />{exporting ? "导出中…" : exported ? "已导出" : "分享报告"}</button><button type="button" data-saya-guide-target="journey-ending" onClick={() => setEndingStarted(true)}><Play aria-hidden="true" />进入结局</button></div>
    <SayaGuide scope={guideScope} guideId="journey-ending" title="这是属于我们的结局" message={captainGuideMessage(captainId, "journey-ending", "经理，谢谢你陪大家走到这里。一起去看看结局吧。")} target="journey-ending" variant="celebrate" preferredPlacement="bottom-left" />
  </div>;
}

export function TournamentDrawView({ guideScope, opponent, bracketIds, clubName, onConfirm, onBack }: { guideScope: string; opponent: ClubBlueprint; bracketIds: string[]; clubName: string; onConfirm: () => void; onBack: () => void }) {
  const { captainId } = useTournamentCaptain();
  const [isEnvelopeOpened, setIsEnvelopeOpened] = useState(false);
  const bracketTeams = bracketIds.map((id) => id === TOURNAMENT_PLAYER_CLUB_ID ? { id, ...playerClub, name: clubName } : clubBlueprints.find((club) => club.id === id)).filter((club): club is { id: string; name: string; shortName: string; nickname: string; crestUrl: string } => Boolean(club));
  const roundOf16 = Array.from({ length: 8 }, (_, index) => bracketTeams.slice(index * 2, index * 2 + 2));
  const renderRoundOf16Pair = (pair: typeof roundOf16[number], matchIndex: number) => <article key={matchIndex} className={pair.some(({ id }) => id === TOURNAMENT_PLAYER_CLUB_ID) ? "player-path" : undefined}>{pair.map((team) => <span key={team.id} className={team.id === TOURNAMENT_PLAYER_CLUB_ID ? "player-team" : team.id === opponent.id ? "next-opponent" : undefined}><img src={team.crestUrl} alt="" /><b>{team.name}</b>{team.id === opponent.id ? <em>下一轮</em> : null}</span>)}</article>;
  const renderPendingPair = (first: string, second: string, key: number) => <article key={key}><span><i>{key * 2 + 1}</i><b>{first}</b></span><span><i>{key * 2 + 2}</i><b>{second}</b></span></article>;
  return (
    <div className="schedule-screen tournament-draw-screen">
      <header className="schedule-heading draw-page-heading"><button type="button" className="schedule-back" onClick={onBack} aria-label="返回经理办公室"><ArrowLeft aria-hidden="true" /></button><div>{isEnvelopeOpened ? <p>DAY 2 · CHAMPIONS LEAGUE DRAW</p> : null}<h1>{isEnvelopeOpened ? "冠军联赛16强签表" : "冠军联赛"}</h1></div></header>
      {!isEnvelopeOpened ? <main className="draw-envelope-stage">
        <section className="draw-envelope" aria-label="16强抽签信封">
          <div className="draw-envelope-flap" aria-hidden="true" />
          <button type="button" className="draw-envelope-seal" aria-label="撕开信封，揭晓对手" data-sfx="lottery-slide" onClick={() => setIsEnvelopeOpened(true)}>CL</button>
          <div className="draw-envelope-copy"><strong>冠军联赛 · 启程</strong></div>
        </section>
      </main> : <main className="draw-bracket-layout draw-revealed">
        <section className="draw-next-opponent"><div><small>ROUND OF 16</small><strong>下一轮对手已经确定</strong></div><div className="draw-next-versus"><span><img src={playerClub.crestUrl} alt={`${clubName}队徽`} /><b>{clubName}</b></span><em>VS</em><span><img src={opponent.crestUrl} alt={`${opponent.name}队徽`} /><b>{opponent.name}</b></span></div></section>
        <section className="draw-bracket-board" aria-label="冠军联赛16强完整晋级图">
          <div className="draw-bracket">
            <section className="draw-bracket-half left-half">
              <section className="draw-bracket-round round-of-16"><header><small>ROUND OF 16</small><strong>16强</strong></header><div>{roundOf16.slice(0, 4).map(renderRoundOf16Pair)}</div></section>
              <section className="draw-bracket-round quarter-finals"><header><small>QUARTER-FINALS</small><strong>八强</strong></header><div>{renderPendingPair("16强第1场胜者", "16强第2场胜者", 0)}{renderPendingPair("16强第3场胜者", "16强第4场胜者", 1)}</div></section>
              <section className="draw-bracket-round semi-finals"><header><small>SEMI-FINALS</small><strong>半决赛</strong></header><div>{renderPendingPair("八强第1场胜者", "八强第2场胜者", 0)}</div></section>
            </section>
            <section className="draw-final-stage">
              <header><small>FINAL</small><strong>决赛</strong></header>
              <div className="draw-trophy-focus"><span><Trophy aria-hidden="true" /></span><small>ROAD TO GLORY</small><strong>冠军之路</strong></div>
              <article><span><i>1</i><b>半决赛第1场胜者</b></span><span><i>2</i><b>半决赛第2场胜者</b></span></article>
              <div className="draw-champion-slot"><Trophy aria-hidden="true" /><span><small>CHAMPION</small><strong>冠军</strong></span></div>
            </section>
            <section className="draw-bracket-half right-half">
              <section className="draw-bracket-round semi-finals"><header><strong>半决赛</strong><small>SEMI-FINALS</small></header><div>{renderPendingPair("八强第3场胜者", "八强第4场胜者", 1)}</div></section>
              <section className="draw-bracket-round quarter-finals"><header><strong>八强</strong><small>QUARTER-FINALS</small></header><div>{renderPendingPair("16强第5场胜者", "16强第6场胜者", 2)}{renderPendingPair("16强第7场胜者", "16强第8场胜者", 3)}</div></section>
              <section className="draw-bracket-round round-of-16"><header><strong>16强</strong><small>ROUND OF 16</small></header><div>{roundOf16.slice(4).map((pair, index) => renderRoundOf16Pair(pair, index + 4))}</div></section>
            </section>
          </div>
        </section>
      </main>}
      {isEnvelopeOpened ? <><footer className="draw-confirm-bar"><div><Check aria-hidden="true" /><span><strong>16强签位确认完成</strong><small>接受结果后返回经理办公室，开始下一轮备战。</small></span></div><button type="button" data-saya-guide-target="draw-confirm" data-sfx="confirm" onClick={onConfirm}><Check aria-hidden="true" />接受抽签结果</button></footer>
      <SayaGuide scope={guideScope} guideId="draw-confirm" title="这就是我们的晋级路线" message={captainGuideMessage(captainId, "draw-confirm", "先记住第一位对手，后面的路我们一场场走。确认吧。")} target="draw-confirm" variant="welcome" /></> : null}
    </div>
  );
}
