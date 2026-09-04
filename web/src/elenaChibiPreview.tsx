import { RotateCcw, ClipboardList } from "lucide-react";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./locker-motion-preview.css";

const animUrl = "/assets/characters/locker-motion-v1/irena-chibi-os-v2.webp";
const posterUrl = animUrl;
const osDurationMs = 6_340;

function ElenaChibiPreview() {
  const [reducedMotion] = useState(() => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
  const [playToken, setPlayToken] = useState(() => reducedMotion ? -1 : 0);
  const [playing, setPlaying] = useState(() => !reducedMotion);

  useEffect(() => {
    if (playToken < 0) {
      setPlaying(false);
      return;
    }
    setPlaying(true);
    const timer = window.setTimeout(() => setPlaying(false), osDurationMs);
    return () => window.clearTimeout(timer);
  }, [playToken]);

  const replay = () => setPlayToken((token) => token + 1);
  const src = playToken < 0 || !playing ? posterUrl : `${animUrl}?play=${playToken}`;

  return <main className="saya-motion-preview">
    <header className="saya-motion-header">
      <div><small>CHIBI LITTLE COACH · OS</small><h1>伊蕾娜 · 装大人的小教练</h1></div>
      <p>伊蕾娜认真模仿成熟教练，发现玩家后墨镜滑落、慌张抱住战术板，最后红着脸害羞定格；15 帧完整演出，点击画面可重新播放。</p>
    </header>

    <section className="saya-motion-layout">
      <button
        type="button"
        className={`saya-motion-stage${playing ? " is-playing" : " is-resting"}`}
        onClick={replay}
        aria-label={playing ? "小教练演出正在播放，点击重新播放" : "重新播放小教练演出"}
      >
        <img
          key={playToken}
          className="saya-motion-gif"
          src={src}
          alt={playing ? "伊蕾娜装大人讲战术、被发现后害羞的连续演出" : "伊蕾娜抱着战术板害羞微笑的定格立绘"}
          draggable={false}
        />
        <span className="saya-motion-replay"><RotateCcw aria-hidden="true" />{playing ? "完整演出播放中" : "点击画面再次播放"}</span>
      </button>

      <aside className="saya-motion-notes">
        <div><small>当前状态</small><strong>{playing ? "动画播放中" : "害羞定格 · 已停住"}</strong></div>
        <ul className="saya-motion-checks">
          <li><b>01</b><span><strong>15 帧平滑</strong><small>8 关键帧 + 7 过渡帧</small></span></li>
          <li><b>02</b><span><strong>明确情绪转折</strong><small>装酷 → 被发现 → 害羞</small></span></li>
          <li><b>03</b><span><strong>版本化 WebP</strong><small>单次播放 + 害羞定格</small></span></li>
        </ul>
        <p><ClipboardList aria-hidden="true" /> 演出流程：认真看板 → 指点战术 → 昂首得意 → 听见玩家 → 墨镜滑落 → 慌张抱板 → 躲在板后 → 害羞微笑定格。</p>
      </aside>
    </section>
  </main>;
}

const root = createRoot(document.getElementById("root")!);
root.render(<ElenaChibiPreview />);
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount());
