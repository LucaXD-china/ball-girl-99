import { useEffect, useState, type ReactNode } from "react";
import { TournamentApp } from "./TournamentApp";
import { tournamentEndingFor } from "./data/tournamentEnding";
import { unlockedTournamentCaptainIds } from "./data/tournamentCaptain";
import { AuthPage } from "./pages/AuthPage";
import { ProloguePage } from "./pages/ProloguePage";
import { MusicDirector, type MusicScene } from "./services/MusicDirector";
import { SoundEffects } from "./services/SoundEffects";
import { bindGuestAccount, loadActiveLocalAccount, logoutLocalAccount, updateLocalNickname, type PlayerAccount } from "./storage/localAccountStore";
import { loadOpeningJourney, updateOpeningJourney, validateClubName, type OpeningJourneyState } from "./storage/openingJourneyStorage";
import { loadStoryArchive, unlockStories, type StoryArchiveState } from "./storage/storyArchiveStorage";
import { loadTournamentSave } from "./storage/tournamentSaveStorage";

function AppFrame({ musicScene, children }: { musicScene: MusicScene; children: ReactNode }) {
  return <><MusicDirector scene={musicScene} /><SoundEffects />{children}</>;
}

export function App() {
  const [account, setAccount] = useState<PlayerAccount | null>(null);
  const [cachedAccount, setCachedAccount] = useState<PlayerAccount | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [opening, setOpening] = useState<OpeningJourneyState | null>(null);
  const [storyArchive, setStoryArchive] = useState<StoryArchiveState | null>(null);
  const [tournamentMusicScene, setTournamentMusicScene] = useState<MusicScene>("quest");

  useEffect(() => {
    let active = true;
    void loadActiveLocalAccount()
      .then((player) => { if (active) setCachedAccount(player); })
      .catch(() => { if (active) setCachedAccount(null); })
      .finally(() => { if (active) setAuthReady(true); });
    return () => { active = false; };
  }, []);

  async function authenticated(player: PlayerAccount) {
    const nextOpening = loadOpeningJourney(player.uid);
    const tournament = loadTournamentSave(player.uid);
    const storyIds = [
      ...(nextOpening.prologueCompleted ? ["PROLOGUE-01", "PROLOGUE-02", "PROLOGUE-03"] as const : []),
      ...(nextOpening.day1StoryCompleted ? ["DAY1-01"] as const : []),
      ...(tournament.campaign.phase === "finished" && tournament.campaign.outcome
        ? [tournamentEndingFor(tournament.campaign.outcome, tournament.campaign.results, tournament.campaign.fixtures, tournament.campaign.captainId ?? "saya")]
        : []),
    ];
    let archive = await loadStoryArchive(player.uid);
    if (storyIds.length > 0) archive = await unlockStories(player.uid, [...storyIds], tournament.campaign.captainId ?? "saya");
    setAccount(player);
    setCachedAccount(player);
    setOpening(nextOpening);
    setStoryArchive(archive);
  }

  async function updateNickname(nickname: string) {
    if (!account) throw new Error("请先登录");
    const updated = await updateLocalNickname(account.uid, nickname);
    setAccount(updated);
    return updated;
  }

  async function bindAccount(input: { account: string; password: string; passwordConfirmation: string }) {
    if (!account?.isGuest) throw new Error("当前账号不是游客账号");
    const updated = await bindGuestAccount(input);
    setAccount(updated);
    setCachedAccount(updated);
    return updated;
  }

  async function logout() {
    await logoutLocalAccount();
    setAccount(null);
    setCachedAccount(null);
    setOpening(null);
    setStoryArchive(null);
  }

  if (!authReady) return <AppFrame musicScene="silent"><div className="app-loading" role="status">正在读取本机账号…</div></AppFrame>;
  if (!account) return <AppFrame musicScene="theme"><AuthPage cachedAccount={cachedAccount} onAuthenticated={authenticated} /></AppFrame>;
  if (!opening || !storyArchive) return <AppFrame musicScene="silent">{null}</AppFrame>;

  if (!opening.prologueCompleted) {
    return <AppFrame musicScene="silent"><ProloguePage
      initialBeat={opening.prologueBeat}
      nickname={account.nickname}
      nicknameConfirmed={opening.nicknameConfirmed}
      clubName={opening.clubName}
      onBeatChange={(prologueBeat) => setOpening(updateOpeningJourney(account.uid, { prologueBeat }))}
      onNicknameConfirm={async (nickname) => {
        const updated = await updateLocalNickname(account.uid, nickname);
        setAccount(updated);
        setOpening(updateOpeningJourney(account.uid, { nicknameConfirmed: true }));
      }}
      onClubNameConfirm={(input) => setOpening(updateOpeningJourney(account.uid, { clubName: validateClubName(input) }))}
      onComplete={() => {
        setOpening(updateOpeningJourney(account.uid, { prologueCompleted: true }));
        void unlockStories(account.uid, ["PROLOGUE-01", "PROLOGUE-02", "PROLOGUE-03"]).then(setStoryArchive);
      }}
    /></AppFrame>;
  }

  return <AppFrame musicScene={tournamentMusicScene}><TournamentApp
    account={account}
    opening={opening}
    storyArchive={storyArchive}
    availableCaptainIds={unlockedTournamentCaptainIds(storyArchive.unlockedAt)}
    onStoryArchiveChange={setStoryArchive}
    onUnlockStories={(storyIds, captainId) => unlockStories(account.uid, storyIds, captainId)}
    onUpdateNickname={updateNickname}
    onBindAccount={bindAccount}
    onLogout={logout}
    onMusicSceneChange={setTournamentMusicScene}
    onDay1StoryReset={() => setOpening(updateOpeningJourney(account.uid, { day1StoryBeat: 0, day1StoryCompleted: false }))}
    onDay1StoryBeatChange={(day1StoryBeat) => setOpening(updateOpeningJourney(account.uid, { day1StoryBeat }))}
    onDay1StoryComplete={() => {
      setOpening(updateOpeningJourney(account.uid, { day1StoryCompleted: true }));
      void unlockStories(account.uid, ["DAY1-01"]).then(setStoryArchive);
    }}
  /></AppFrame>;
}
