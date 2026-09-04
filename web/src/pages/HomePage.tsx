import { Binoculars, ChevronRight, FastForward, LogOut, Trophy, UserRoundPlus, Volleyball, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { SceneStage } from "../components/SceneStage";
import { mascotOptions } from "../data/founderMascotData";
import { captainOfficeIntroductions } from "../data/captainGuideCopy";
import { useTournamentCaptain } from "../components/TournamentCaptainContext";
import { playerClub } from "../data/tournamentJourney";
import { tournamentManagerOfficeScenes, type TournamentOfficeStage } from "../scenes/sceneDefinitions";
import type { PlayerAccount } from "../storage/localAccountStore";

type Props = {
  account: PlayerAccount;
  clubName: string;
  onUpdateNickname: (nickname: string) => Promise<PlayerAccount>;
  onBindAccount: (input: { account: string; password: string; passwordConfirmation: string }) => Promise<PlayerAccount>;
  onLogout: () => Promise<void>;
  officeGuidance: {
    title: string;
    message: string;
    target: string;
    strong?: boolean;
  };
  officeIntroduction: {
    pending: boolean;
    onComplete: () => void;
  };
  tournamentJourney: {
    day: number;
    phaseLabel: string;
    countdownLabel: string;
    guidance: string;
    primaryActionLabel: string;
    stage: TournamentOfficeStage;
    canAdvanceTime: boolean;
    scoutReportAvailable: boolean;
    scoutReportViewed: boolean;
    scoutReportUnavailableReason?: string;
    onPrimaryAction: () => void;
    onViewScoutReport: () => void;
    onAdvanceToMatch: () => void;
  };
};

export const officeSayaIntroductionSteps = [
  {
    message: "初次见面，经理。我是月城纱夜，是球队的中后卫，也是大家推选的队长。接下来的旅程，我会陪你一起度过。帮助你尽快熟悉球队的运营和操作。",
  },
  {
    message: "这是一段为期99天的冠军征程。我们要依次完成16强、八强、半决赛和决赛，共7场比赛。其中，前三轮比赛为主客场双赛。决赛则是单场决胜。",
  },
  {
    message: "下方是球队的常用入口。你可以在更衣室查看球员，去训练中心提升大家；赛程记录杯赛进度，球星卡商店用于补强阵容，剧情回顾则收录我们一起经历的故事。",
    target: "dock",
  },
  {
    message: "为了备战本届杯赛，管理层为我们提供了新的补强资金。一起去球星卡商店看看吧~",
  },
] as const;

export const officeTournamentStageLabels: Record<TournamentOfficeStage, string> = {
  day1: "16进8",
  round_of_16: "16进8",
  quarter_final: "8进4",
  semi_final: "半决赛",
  final: "决赛",
};

export function HomePage({ account, clubName, onUpdateNickname, onBindAccount, onLogout, officeGuidance, officeIntroduction, tournamentJourney }: Props) {
  const { captainId, route } = useTournamentCaptain();
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [bindOpen, setBindOpen] = useState(false);
  const [binding, setBinding] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [introductionStep, setIntroductionStep] = useState(0);
  const mascot = mascotOptions.find(({ anchorId }) => anchorId === route.mascotAnchorId) ?? mascotOptions[0];
  const scene = tournamentManagerOfficeScenes[tournamentJourney.stage];
  const introductionSteps = captainId === "saya" ? officeSayaIntroductionSteps : captainOfficeIntroductions[captainId].map((message) => ({ message }));
  const introduction = officeIntroduction.pending ? introductionSteps[introductionStep] : null;
  const strongGuidanceActive = !introduction && officeGuidance.strong !== false && (officeGuidance.target === "office-primary" || officeGuidance.target === "office-advance-match" || officeGuidance.target === "office-scout-report");
  const stageLabel = officeTournamentStageLabels[tournamentJourney.stage];
  const journeyProgress = Math.max(4, Math.min(100, tournamentJourney.day / 99 * 100));

  function advanceIntroduction() {
    if (introductionStep < introductionSteps.length - 1) {
      setIntroductionStep((current) => current + 1);
      return;
    }
    officeIntroduction.onComplete();
  }

  async function saveNickname(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileError(null);
    const nickname = String(new FormData(event.currentTarget).get("nickname") ?? "");
    try {
      await onUpdateNickname(nickname);
    } catch (reason) {
      setProfileError(reason instanceof Error ? reason.message : "昵称保存失败");
    }
  }

  async function bindAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileError(null);
    setBinding(true);
    const form = new FormData(event.currentTarget);
    const input = {
      account: String(form.get("account") ?? ""),
      password: String(form.get("password") ?? ""),
      passwordConfirmation: String(form.get("passwordConfirmation") ?? ""),
    };
    try {
      if (input.password !== input.passwordConfirmation) throw new Error("两次输入的密码不一致");
      await onBindAccount(input);
      setBindOpen(false);
    } catch (reason) {
      setProfileError(reason instanceof Error ? reason.message : "账号绑定失败");
    } finally {
      setBinding(false);
    }
  }

  return (
    <div className={`office-screen${introduction ? " introduction-active" : ""}${strongGuidanceActive ? " guidance-active" : ""}`} data-office-introduction-target={introduction && "target" in introduction ? introduction.target : undefined}>
      <SceneStage scene={scene} activeCharacterAnchorId={mascot.anchorId}>
        <button
          className="player-profile-entry"
          type="button"
          disabled={officeIntroduction.pending}
          aria-expanded={profileOpen}
          aria-controls="player-profile-panel"
          onClick={() => setProfileOpen((current) => !current)}
        >
          <span className="player-avatar"><img src={playerClub.crestUrl} alt={`${clubName}队徽`} /></span>
          <span className="player-profile-copy"><strong>{account.nickname}</strong><small>{clubName} · 球队经理</small></span>
        </button>

        {profileOpen ? (
          <aside className="player-profile-panel" id="player-profile-panel" aria-label="用户信息">
            <div className="profile-panel-heading">
              <div><small>MANAGER PROFILE</small><strong>{account.nickname}</strong></div>
              <button type="button" aria-label="关闭用户信息" onClick={() => setProfileOpen(false)}><X aria-hidden="true" /></button>
            </div>
            <dl className="profile-meta">
              <div><dt>俱乐部账号</dt><dd>{account.isGuest ? "游客试玩" : account.account}</dd></div>
              <div><dt>唯一 UID</dt><dd title={account.uid}>{account.uid}</dd></div>
            </dl>
            <form className="profile-nickname-form" onSubmit={saveNickname}>
              <label htmlFor="profile-nickname">玩家昵称</label>
              <div><input id="profile-nickname" name="nickname" defaultValue={account.nickname} maxLength={16} required /><button type="submit" data-sfx="confirm">保存</button></div>
              {profileError ? <p role="alert">{profileError}</p> : null}
            </form>
            {account.isGuest ? (
              <section className="guest-account-panel" aria-label="保存游客进度">
                <p>绑定账号后，当前浏览器的完整进度会保留；换设备仅恢复剧情档案。</p>
                {bindOpen ? (
                  <form className="guest-bind-form" onSubmit={bindAccount}>
                    <label>登录账号<input name="account" autoComplete="username" required maxLength={254} placeholder="英文账号名或邮箱地址" /></label>
                    <label>密码<input name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={64} placeholder="8–64 个字符" /></label>
                    <label>确认密码<input name="passwordConfirmation" type="password" autoComplete="new-password" required minLength={8} maxLength={64} placeholder="再次输入密码" /></label>
                    <div><button type="button" onClick={() => { setBindOpen(false); setProfileError(null); }} disabled={binding}>取消</button><button type="submit" data-sfx="confirm" disabled={binding}>{binding ? "绑定中…" : "绑定并保存"}</button></div>
                  </form>
                ) : (
                  <button className="guest-bind-action" type="button" onClick={() => { setBindOpen(true); setLogoutConfirmOpen(false); setProfileError(null); }}><UserRoundPlus aria-hidden="true" />绑定正式账号</button>
                )}
              </section>
            ) : null}
            {account.isGuest && logoutConfirmOpen ? (
              <section className="guest-logout-confirm" role="alert">
                <p>退出后将无法重新访问这个游客存档。建议先绑定账号。</p>
                <div><button type="button" onClick={() => setLogoutConfirmOpen(false)}>继续试玩</button><button type="button" data-sfx="confirm" onClick={() => void onLogout()}>确认退出</button></div>
              </section>
            ) : (
              <button className="profile-logout" type="button" data-sfx="confirm" onClick={() => account.isGuest ? setLogoutConfirmOpen(true) : void onLogout()}><LogOut aria-hidden="true" />{account.isGuest ? "退出游客试玩" : "退出登录"}</button>
            )}
          </aside>
        ) : null}

        {introduction ? <div className="office-introduction-scrim" aria-hidden="true" /> : null}
        {strongGuidanceActive ? <div className="saya-guide-scrim office-guidance-scrim" aria-hidden="true" /> : null}
        <aside className={`mascot-dialogue${introduction ? " is-introduction" : strongGuidanceActive ? " is-guidance" : ""}`} aria-label={introduction ? `${route.name}首次介绍` : `${route.name}操作引导`} aria-live="polite">
          <span className="mascot-dialogue-speaker">{route.name}</span>
          <p>{introduction?.message ?? officeGuidance.message}</p>
          {introduction ? <button className="mascot-dialogue-next" type="button" onClick={advanceIntroduction}>{introductionStep < introductionSteps.length - 1 ? "继续" : "开始吧"}</button> : null}
        </aside>

        <aside className="office-tournament-clock office-tournament-ticket" aria-label={`99日冠军征程，当前阶段${stageLabel}`}>
          <header><small>99日冠军征程</small><em>{stageLabel}</em></header>
          <div className="office-ticket-day"><span>DAY</span><strong>{String(tournamentJourney.day).padStart(2, "0")}</strong><i>/ 99</i></div>
          <footer><b>{tournamentJourney.countdownLabel}</b></footer>
          <div className="office-ticket-progress" role="progressbar" aria-label="99日征程进度" aria-valuemin={1} aria-valuemax={99} aria-valuenow={tournamentJourney.day}>
            <span style={{ width: `${journeyProgress}%` }}><Volleyball aria-hidden="true" /></span><Trophy aria-hidden="true" />
          </div>
        </aside>

        <div className="office-time-controls" title={officeIntroduction.pending ? `请先听完${route.name}的介绍` : undefined}>
          <button className={`office-primary-action${strongGuidanceActive && officeGuidance.target === "office-primary" ? " saya-guide-target saya-guide-forced-target" : ""}`} data-saya-guide-target="office-primary" data-sfx="confirm" type="button" disabled={officeIntroduction.pending} title={tournamentJourney.guidance} onClick={tournamentJourney.onPrimaryAction}><ChevronRight aria-hidden="true" /><span>{tournamentJourney.primaryActionLabel}{tournamentJourney.phaseLabel === "董事会特别任务" ? null : <small>{tournamentJourney.phaseLabel}</small>}</span></button>
          <button type="button" className={strongGuidanceActive && officeGuidance.target === "office-scout-report" ? "saya-guide-target saya-guide-forced-target" : undefined} data-saya-guide-target="office-scout-report" disabled={officeIntroduction.pending || (!tournamentJourney.scoutReportAvailable && !tournamentJourney.scoutReportViewed)} title={officeIntroduction.pending ? `请先听完${route.name}的介绍` : tournamentJourney.scoutReportUnavailableReason} onClick={tournamentJourney.onViewScoutReport}><Binoculars aria-hidden="true" /><span>{tournamentJourney.scoutReportViewed ? "球探报告" : "观察对手"}<small>{tournamentJourney.scoutReportViewed ? "回看对手情报" : tournamentJourney.scoutReportUnavailableReason ?? "消耗 5 天 · 对手阵型情报"}</small></span></button>
          <button className={strongGuidanceActive && officeGuidance.target === "office-advance-match" ? "saya-guide-target saya-guide-forced-target" : undefined} type="button" data-saya-guide-target="office-advance-match" data-sfx="confirm" disabled={officeIntroduction.pending || !tournamentJourney.canAdvanceTime} onClick={tournamentJourney.onAdvanceToMatch}><FastForward aria-hidden="true" /><span>推进至下一场<small>{tournamentJourney.countdownLabel}</small></span></button>
        </div>
      </SceneStage>
    </div>
  );
}
