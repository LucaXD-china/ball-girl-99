import { RotateCcw, Shirt } from "lucide-react";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./locker-motion-preview.css";

const motionUrl = "/assets/characters/locker-motion-v1/naya-beach-interaction-v2.webp";
const posterUrl = motionUrl;
const motionDurationMs = 5_000;

function NayaMotionPreview() {
  const [reducedMotion] = useState(() => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
  const [playToken, setPlayToken] = useState(() => reducedMotion ? -1 : 0);
  const [playing, setPlaying] = useState(() => !reducedMotion);

  useEffect(() => {
    if (playToken < 0) {
      setPlaying(false);
      return;
    }
    setPlaying(true);
    const timer = window.setTimeout(() => setPlaying(false), motionDurationMs);
    return () => window.clearTimeout(timer);
  }, [playToken]);

  const replay = () => setPlayToken((token) => token + 1);
  const src = playToken < 0 || !playing ? posterUrl : `${motionUrl}?play=${playToken}`;

  return <main className="saya-motion-preview">
    <header className="saya-motion-header">
      <div><small>LOCKER MOTION PROTOTYPE</small><h1>娜雅 · 海滩球场秀技演出</h1></div>
      <p>金色时分的海滩球场，16 张完整关键帧连续播放张扬秀技，勾手挑衅后停止；点击画面可再次播放。</p>
    </header>

    <section className="saya-motion-layout">
      <button
        type="button"
        className={`saya-motion-stage${playing ? " is-playing" : " is-resting"}`}
        onClick={replay}
        aria-label={playing ? "娜雅秀技演出正在播放，点击重新播放" : "重新播放娜雅秀技演出"}
      >
        <img
          key={playToken}
          className="saya-motion-gif"
          src={src}
          alt={playing ? "娜雅在金色时分海滩球场颠球挑衅的连续演出" : "娜雅在海滩球场定格的自信立绘"}
          draggable={false}
        />
        <span className="saya-motion-replay"><RotateCcw aria-hidden="true" />{playing ? "连续演出播放中" : "点击画面再次播放"}</span>
      </button>

      <aside className="saya-motion-notes">
        <div><small>当前状态</small><strong>{playing ? "逐帧 WebP 播放中" : "定格立绘 · 已停住"}</strong></div>
        <ul className="saya-motion-checks">
          <li><b>01</b><span><strong>16 张独立帧</strong><small>重点动作增加短过渡帧</small></span></li>
          <li><b>02</b><span><strong>完整画面</strong><small>每一帧都含人物和海滩球场</small></span></li>
          <li><b>03</b><span><strong>勾手处停止</strong><small>不再进入双臂展开动作</small></span></li>
        </ul>
        <p><Shirt aria-hidden="true" /> 演出流程：颠球起势 → 膝颠球 → 踩单车 → 挑球过肩 → 发现你 → 渐进勾手挑衅 → 停止。编码仅按帧停留，不生成算法中间画面，也不执行运行时抠图。</p>
      </aside>
    </section>
  </main>;
}

const root = createRoot(document.getElementById("root")!);
root.render(<NayaMotionPreview />);
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount());
