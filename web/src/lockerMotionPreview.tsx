import { RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./locker-motion-preview.css";

const gifUrl = "/assets/characters/locker-motion-v1/saya-interaction-v3.gif";
const posterUrl = gifUrl;
const gifDurationMs = 7_200;

function SayaMotionPreview() {
  const [reducedMotion] = useState(() => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
  const [playToken, setPlayToken] = useState(() => reducedMotion ? -1 : 0);
  const [playing, setPlaying] = useState(() => !reducedMotion);

  useEffect(() => {
    if (playToken < 0) {
      setPlaying(false);
      return;
    }
    setPlaying(true);
    const timer = window.setTimeout(() => setPlaying(false), gifDurationMs);
    return () => window.clearTimeout(timer);
  }, [playToken]);

  const replay = () => {
    setPlaying(true);
    setPlayToken((token) => token + 1);
  };
  const src = playToken < 0 || !playing ? posterUrl : `${gifUrl}?play=${playToken}`;

  return <main className="saya-motion-preview">
    <header className="saya-motion-header">
      <div><small>LOCKER MOTION PROTOTYPE</small><h1>纱夜 · 训练后互动演出</h1></div>
      <p>15 张完整关键帧逐格播放，结束后切回正式更衣室立绘；点击画面可再次播放。</p>
    </header>

    <section className="saya-motion-layout">
      <button
        type="button"
        className={`saya-motion-stage${playing ? " is-playing" : " is-resting"}`}
        onClick={replay}
        aria-label={playing ? "纱夜互动演出正在播放，点击重新播放" : "重新播放纱夜互动演出"}
      >
        <img
          key={playToken}
          className="saya-motion-gif"
          src={src}
          alt={playing ? "纱夜训练后擦汗并发现玩家的连续演出" : "纱夜在更衣室放下手站定的正式立绘"}
          draggable={false}
        />
        <span className="saya-motion-replay"><RotateCcw aria-hidden="true" />{playing ? "连续演出播放中" : "点击画面再次播放"}</span>
      </button>

      <aside className="saya-motion-notes">
        <div><small>当前状态</small><strong>{playing ? "逐帧 GIF 播放中" : "正式立绘 · 已定格"}</strong></div>
        <ul className="saya-motion-checks">
          <li><b>01</b><span><strong>15 张独立帧</strong><small>无光流补间与交叉淡化</small></span></li>
          <li><b>02</b><span><strong>完整画面</strong><small>每一帧都含人物和更衣室</small></span></li>
          <li><b>03</b><span><strong>回到正式立绘</strong><small>演出结束切回更衣室原图</small></span></li>
        </ul>
        <p>演出流程：闭眼喘息 → 擦汗 → 察觉玩家 → 脸红害羞 → 切回正式更衣室立绘。编码仅按帧停留，不生成算法中间画面，也不执行运行时抠图。</p>
      </aside>
    </section>
  </main>;
}

const root = createRoot(document.getElementById("root")!);
root.render(<SayaMotionPreview />);
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount());
