import { useEffect, useState, type ReactNode } from "react";

export const MIN_VIEWPORT_WIDTH = 1280;
export const MIN_VIEWPORT_HEIGHT = 720;

export function isSupportedViewport(width: number, height: number) {
  return width >= MIN_VIEWPORT_WIDTH && height >= MIN_VIEWPORT_HEIGHT;
}

function currentViewport() {
  if (typeof window === "undefined") return { width: 0, height: 0 };
  return { width: window.innerWidth, height: window.innerHeight };
}

export function ViewportSupportGate({ children }: { children: ReactNode }) {
  const [viewport, setViewport] = useState(currentViewport);

  useEffect(() => {
    const update = () => setViewport(currentViewport());
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (isSupportedViewport(viewport.width, viewport.height)) return children;
  return <main className="viewport-support-gate" role="alert" aria-live="polite">
    <div aria-hidden="true">↔</div>
    <h1>请使用桌面大屏打开游戏</h1>
    <p>《激射！绿茵少女！》最低需要 <strong>1280 × 720</strong> 的可用窗口。</p>
    <small>当前窗口 {viewport.width} × {viewport.height}；请放大浏览器或更换桌面设备。</small>
  </main>;
}
