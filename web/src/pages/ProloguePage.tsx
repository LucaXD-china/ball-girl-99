import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  CLUB_NAME_PROMPT_BEAT,
  NICKNAME_PROMPT_BEAT,
  NICKNAME_PROMPT_FRAME,
  PROLOGUE_ASSET_ID,
  prologueBeats,
} from "../data/openingScript";
import { NarrativeAutoPlayToggle, NarrativeText, useNarrativePlayback } from "../components/NarrativePlayback";
import { paginateNarrativeText } from "../data/scriptPagination";
import { resolveAsset } from "../services/assetResolver";

type Props = {
  initialBeat: number;
  nickname: string;
  nicknameConfirmed: boolean;
  clubName: string;
  onBeatChange: (beat: number) => void;
  onNicknameConfirm: (nickname: string) => Promise<void>;
  onClubNameConfirm: (clubName: string) => void;
  onComplete: () => void;
};

type Prompt = "nickname" | "club" | null;

export function ProloguePage({ initialBeat, nickname, nicknameConfirmed, clubName, onBeatChange, onNicknameConfirm, onClubNameConfirm, onComplete }: Props) {
  const [beat, setBeat] = useState(initialBeat);
  const [page, setPage] = useState(0);
  const [prompt, setPrompt] = useState<Prompt>(null);
  const [error, setError] = useState<string | null>(null);
  const beats = useMemo(() => prologueBeats(nickname, clubName), [clubName, nickname]);
  const current = beats[Math.min(beat, beats.length - 1)];
  const pages = paginateNarrativeText(current.text);
  const currentPage = pages[Math.min(page, pages.length - 1)];
  const frame = prompt === "nickname" ? NICKNAME_PROMPT_FRAME : current.frame;
  const background = resolveAsset(PROLOGUE_ASSET_ID, frame);
  const prefetchFrame = prompt === "nickname"
    ? beats[beat + 1]?.frame
    : beat === NICKNAME_PROMPT_BEAT && !nicknameConfirmed
      ? NICKNAME_PROMPT_FRAME
      : beats[beat + 1]?.frame;
  const prefetchBackground = prefetchFrame ? resolveAsset(PROLOGUE_ASSET_ID, prefetchFrame) : null;
  const prefetchUrl = prefetchBackground?.status === "ready" ? prefetchBackground.url : null;

  useEffect(() => {
    if (!prefetchUrl) return;
    const image = new window.Image();
    image.src = prefetchUrl;
  }, [prefetchUrl]);

  function moveTo(nextBeat: number) {
    setPage(0);
    setBeat(nextBeat);
    onBeatChange(nextBeat);
  }

  function advance() {
    if (page < pages.length - 1) {
      setPage((currentPageIndex) => currentPageIndex + 1);
      return;
    }
    if (beat === NICKNAME_PROMPT_BEAT && !nicknameConfirmed) {
      setPrompt("nickname");
      return;
    }
    if (beat === CLUB_NAME_PROMPT_BEAT && !clubName) {
      setPrompt("club");
      return;
    }
    if (beat >= beats.length - 1) {
      onComplete();
      return;
    }
    moveTo(beat + 1);
  }

  const playback = useNarrativePlayback({ text: currentPage, sequenceKey: `${beat}:${page}`, onAdvance: advance, paused: Boolean(prompt) });

  function skip() {
    if (!nicknameConfirmed) {
      moveTo(NICKNAME_PROMPT_BEAT);
      setPrompt("nickname");
      return;
    }
    if (!clubName) {
      moveTo(CLUB_NAME_PROMPT_BEAT);
      setPrompt("club");
      return;
    }
    onComplete();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      if (prompt === "nickname") {
        await onNicknameConfirm(String(form.get("nickname") ?? ""));
        setPrompt(null);
        moveTo(NICKNAME_PROMPT_BEAT + 1);
      } else if (prompt === "club") {
        onClubNameConfirm(String(form.get("clubName") ?? ""));
        setPrompt(null);
        moveTo(CLUB_NAME_PROMPT_BEAT + 1);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "输入无法保存");
    }
  }

  return (
    <main
      className={`prologue-screen tone-${current.tone}`}
      data-prologue-beat={beat}
      data-prologue-chapter={current.chapter}
      data-prologue-frame={frame}
      data-narrative-page={page}
      data-narrative-page-count={pages.length}
      onClick={playback.requestAdvance}
    >
      {background.status === "ready" ? (
        <img key={frame} className="prologue-scene" src={background.url} alt="" aria-hidden="true" />
      ) : null}
      <button className="prologue-skip" type="button" data-sfx="none" onClick={(event) => { event.stopPropagation(); skip(); }}>跳过剧情</button>
      {!prompt ? <NarrativeAutoPlayToggle playback={playback} /> : null}
      <button className="prologue-dialogue" type="button" data-sfx="none" aria-label="继续剧情" onClick={(event) => { event.stopPropagation(); playback.requestAdvance(); }}>
        <NarrativeText playback={playback} />
      </button>

      {prompt ? (
        <div className="prologue-prompt-backdrop" onClick={(event) => event.stopPropagation()}>
          <form className="prologue-prompt" onSubmit={submit} aria-label={prompt === "nickname" ? "填写昵称" : "填写球队名"}>
            <label htmlFor="prologue-input">{prompt === "nickname" ? "你的昵称" : "球队名称"}</label>
            <input
              id="prologue-input"
              name={prompt === "nickname" ? "nickname" : "clubName"}
              defaultValue={prompt === "nickname" ? nickname : clubName}
              autoComplete={prompt === "nickname" ? "nickname" : "off"}
              minLength={prompt === "nickname" ? 1 : 2}
              maxLength={prompt === "nickname" ? 16 : 20}
              autoFocus
              required
            />
            {error ? <p role="alert">{error}</p> : null}
            <button type="submit" data-sfx="confirm">确认</button>
          </form>
        </div>
      ) : null}
    </main>
  );
}
