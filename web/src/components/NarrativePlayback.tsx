import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatNarrativeDisplayText } from "../data/scriptPagination";
import "./NarrativePlayback.css";

const AUTO_PLAY_STORAGE_KEY = "ball-girl:narrative-auto-play-v1";
const LINE_REVEAL_DELAY_MS = 760;

export function narrativeDisplayLines(text: string): string[] {
  return formatNarrativeDisplayText(text).split("\n");
}

export function narrativeAutoAdvanceDelay(text: string): number {
  const characterCount = text.replace(/\s/gu, "").length;
  return Math.min(6_500, Math.max(2_500, characterCount * 110));
}

function initialAutoPlay(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(AUTO_PLAY_STORAGE_KEY) !== "paused";
}

function initialReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type PlaybackOptions = {
  text: string;
  sequenceKey: string;
  onAdvance: () => void;
  paused?: boolean;
};

export function useNarrativePlayback({ text, sequenceKey, onAdvance, paused = false }: PlaybackOptions) {
  const lines = useMemo(() => narrativeDisplayLines(text), [text]);
  const revealKey = `${sequenceKey}\u0000${text}`;
  const onAdvanceRef = useRef(onAdvance);
  const [autoPlaying, setAutoPlaying] = useState(initialAutoPlay);
  const [reducedMotion, setReducedMotion] = useState(initialReducedMotion);
  const [documentVisible, setDocumentVisible] = useState(() => typeof document === "undefined" || !document.hidden);
  const [reveal, setReveal] = useState({ key: revealKey, count: reducedMotion ? lines.length : 1 });
  onAdvanceRef.current = onAdvance;

  const initialLineCount = reducedMotion ? lines.length : 1;
  const visibleLineCount = reveal.key === revealKey ? Math.min(reveal.count, lines.length) : initialLineCount;
  const fullyRevealed = visibleLineCount >= lines.length;

  useEffect(() => {
    setReveal({ key: revealKey, count: initialLineCount });
  }, [initialLineCount, revealKey]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => setReducedMotion(media.matches);
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => setDocumentVisible(!document.hidden);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(AUTO_PLAY_STORAGE_KEY, autoPlaying ? "playing" : "paused");
  }, [autoPlaying]);

  useEffect(() => {
    if (paused || !autoPlaying || !documentVisible) return;
    const timer = window.setTimeout(() => {
      if (!fullyRevealed) {
        setReveal((current) => current.key === revealKey
          ? { ...current, count: Math.min(lines.length, current.count + 1) }
          : { key: revealKey, count: initialLineCount });
        return;
      }
      onAdvanceRef.current();
    }, fullyRevealed ? narrativeAutoAdvanceDelay(text) : LINE_REVEAL_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [autoPlaying, documentVisible, fullyRevealed, initialLineCount, lines.length, paused, revealKey, text, visibleLineCount]);

  const requestAdvance = useCallback(() => {
    if (!fullyRevealed) {
      setReveal({ key: revealKey, count: lines.length });
      return;
    }
    onAdvanceRef.current();
  }, [fullyRevealed, lines.length, revealKey]);

  const toggleAutoPlay = useCallback(() => setAutoPlaying((current) => !current), []);

  return { autoPlaying, fullyRevealed, lines, requestAdvance, toggleAutoPlay, visibleLineCount };
}

type Playback = ReturnType<typeof useNarrativePlayback>;

export function NarrativeText({ playback }: { playback: Playback }) {
  return <span className="narrative-text" aria-live="polite">{playback.lines.map((line, index) => {
    const revealed = index < playback.visibleLineCount;
    return <span key={`${index}-${line}`} className={`narrative-line${revealed ? " is-revealed" : ""}`} aria-hidden={!revealed}>
      {line}{index < playback.lines.length - 1 ? "\n" : null}
    </span>;
  })}</span>;
}

export function NarrativeAutoPlayToggle({ playback }: { playback: Playback }) {
  return <button
    className={`narrative-autoplay-toggle${playback.autoPlaying ? " is-playing" : ""}`}
    type="button"
    data-sfx="none"
    aria-pressed={playback.autoPlaying}
    onClick={(event) => { event.stopPropagation(); playback.toggleAutoPlay(); }}
  >{playback.autoPlaying ? "自动播放中" : "自动播放已暂停"}</button>;
}
