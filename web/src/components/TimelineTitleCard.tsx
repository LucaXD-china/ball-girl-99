import { useEffect, useState } from "react";

export function TimelineTitleCard({ day, label, onComplete }: { day: number; label: string; onComplete: () => void }) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finish = window.setTimeout(onComplete, reduced ? 1000 : 1600);
    const fade = reduced ? undefined : window.setTimeout(() => setLeaving(true), 1250);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault(); onComplete();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => { window.clearTimeout(finish); if (fade) window.clearTimeout(fade); window.removeEventListener("keydown", onKeyDown); };
  }, [onComplete]);
  return <div className={`timeline-title-card${leaving ? " leaving" : ""}`} role="dialog" aria-label={`DAY ${day} / 99，${label}`} onClick={onComplete}>
    <div className="timeline-title-card-copy"><strong>DAY {day} / 99</strong><span>{day === 99 ? "决赛日" : `距决赛 ${99 - day} 天`}</span><em>{label}</em></div>
  </div>;
}
