import { X } from "lucide-react";
import { Fragment, useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { resolveAsset } from "../services/assetResolver";
import { CHIBI_SAYA_INTRODUCTION_GUIDE_ID, hasSeenTournamentGuide, rememberTournamentGuide } from "../storage/tournamentGuideStorage";
import { clampGuidePosition, type GuidePosition } from "./sayaGuidePosition";
import { useTournamentCaptain } from "./TournamentCaptainContext";
import { captainGuideIdentity } from "../data/captainGuideCopy";

export type SayaGuideVariant = "welcome" | "guide" | "think" | "remind" | "celebrate";

export const sayaChibiIntroduction = {
  title: "以后也请多关照",
  message: "我是小纱夜！离开办公室后，我会陪着你。点亮光处继续；挡住时，拖动我就好。",
} as const;

export function guideSpotlightStyle(rect: Pick<DOMRect, "left" | "top" | "width" | "height">, padding = 7): CSSProperties {
  return {
    left: rect.left - padding,
    top: rect.top - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
}

export function guidePlacementForTarget(
  rect: Pick<DOMRect, "left" | "top" | "width" | "height">,
  viewport: { width: number; height: number },
  preferredPlacement?: "bottom-left",
) {
  if (preferredPlacement === "bottom-left") return { horizontal: "left", vertical: "bottom" } as const;
  return {
    horizontal: rect.left + rect.width / 2 > viewport.width * .58 ? "left" : "right",
    vertical: rect.top + rect.height / 2 > viewport.height * .58 ? "top" : "bottom",
  } as const;
}

type Props = {
  guideId: string;
  scope: string;
  title: string;
  message: string;
  target: string;
  relatedTarget?: string;
  variant?: SayaGuideVariant;
  required?: boolean;
  preferredPlacement?: "bottom-left";
  persistent?: boolean;
  reopenable?: boolean;
  onAction?: () => void;
  actionLabel?: string;
  pages?: ReadonlyArray<{ title: string; message: string }>;
};

export function SayaGuide({ guideId, scope, title, message, target, relatedTarget, variant = "guide", required = false, preferredPlacement, persistent = false, reopenable = false, onAction, actionLabel, pages }: Props) {
  const { captainId } = useTournamentCaptain();
  const identity = captainGuideIdentity[captainId];
  const captainScope = captainId === "saya" ? scope : `${scope}:${captainId}`;
  const pageCount = pages?.length ?? 0;
  const hasPagination = pageCount > 0;
  const [pageIndex, setPageIndex] = useState(0);
  const safePageIndex = Math.min(pageIndex, Math.max(0, pageCount - 1));
  const activePage: { title: string; message: string } = pages && pages.length ? pages[safePageIndex] : { title, message };
  const [visible, setVisible] = useState(false);
  const [bubbleOpen, setBubbleOpen] = useState(true);
  const [placement, setPlacement] = useState<"left" | "right">("right");
  const [verticalPlacement, setVerticalPlacement] = useState<"top" | "bottom">("bottom");
  const [manualPosition, setManualPosition] = useState<GuidePosition | null>(null);
  const [dragging, setDragging] = useState(false);
  const [showingIntroduction, setShowingIntroduction] = useState(false);
  const [spotlightStyle, setSpotlightStyle] = useState<CSSProperties | null>(null);
  const guideRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const dragCleanupRef = useRef<(() => void) | null>(null);
  const artwork = resolveAsset(identity.assetId, showingIntroduction ? "welcome" : variant);

  useEffect(() => {
    const guideSeen = hasSeenTournamentGuide(window.localStorage, captainScope, guideId);
    setBubbleOpen(reopenable ? !guideSeen : !persistent);
    setPageIndex(0);
    setManualPosition(null);
    setDragging(false);
    dragRef.current = null;
    dragCleanupRef.current?.();
    const introductionPending = !persistent && !hasSeenTournamentGuide(window.localStorage, captainScope, CHIBI_SAYA_INTRODUCTION_GUIDE_ID);
    setShowingIntroduction(introductionPending);
    setVisible(persistent || reopenable || required || introductionPending || !guideSeen);
  }, [captainScope, guideId, persistent, reopenable, required]);

  useEffect(() => () => dragCleanupRef.current?.(), []);

  useEffect(() => {
    const keepInsideViewport = () => {
      const guide = guideRef.current;
      if (!guide) return;
      const rect = guide.getBoundingClientRect();
      setManualPosition((current) => {
        if (!current) return current;
        const next = clampGuidePosition({ x: rect.left, y: rect.top }, rect, { width: window.innerWidth, height: window.innerHeight });
        return next.x === current.x && next.y === current.y ? current : next;
      });
    };
    window.addEventListener("resize", keepInsideViewport);
    window.visualViewport?.addEventListener("resize", keepInsideViewport);
    return () => {
      window.removeEventListener("resize", keepInsideViewport);
      window.visualViewport?.removeEventListener("resize", keepInsideViewport);
    };
  }, []);

  const finishGuide = useCallback(() => {
    rememberTournamentGuide(window.localStorage, captainScope, guideId);
    onAction?.();
    if (reopenable) setBubbleOpen(false);
    else if (!required) setVisible(false);
  }, [captainScope, guideId, onAction, reopenable, required]);

  useEffect(() => {
    if (!visible || (reopenable && !bubbleOpen)) {
      setSpotlightStyle(null);
      return;
    }
    const targetElement = document.querySelector<HTMLElement>(`[data-saya-guide-target="${target}"]`);
    if (!targetElement) {
      setSpotlightStyle(null);
      return;
    }
    const relatedTargetElement = relatedTarget
      ? document.querySelector<HTMLElement>(`[data-saya-guide-target="${relatedTarget}"]`)
      : null;
    const updateTarget = () => {
      const targetRect = targetElement.getBoundingClientRect();
      const nextPlacement = guidePlacementForTarget(targetRect, { width: window.innerWidth, height: window.innerHeight }, preferredPlacement);
      setPlacement(nextPlacement.horizontal);
      setVerticalPlacement(nextPlacement.vertical);
      if (required && !showingIntroduction) setSpotlightStyle(guideSpotlightStyle(targetRect));
    };
    const targetRect = targetElement.getBoundingClientRect();
    updateTarget();
    if (!showingIntroduction && (targetRect.left < 0 || targetRect.right > window.innerWidth || targetRect.top < 0 || targetRect.bottom > window.innerHeight)) {
      targetElement.scrollIntoView({ block: "nearest", inline: "center" });
      window.requestAnimationFrame(updateTarget);
    }
    if (showingIntroduction) {
      window.addEventListener("resize", updateTarget);
      window.addEventListener("scroll", updateTarget, true);
      return () => {
        window.removeEventListener("resize", updateTarget);
        window.removeEventListener("scroll", updateTarget, true);
      };
    }
    const targetResizeObserver = required ? new ResizeObserver(updateTarget) : null;
    targetResizeObserver?.observe(targetElement);
    window.addEventListener("resize", updateTarget);
    window.addEventListener("scroll", updateTarget, true);
    targetElement.classList.add("saya-guide-target");
    relatedTargetElement?.classList.add("saya-guide-related-target");
    if (!hasPagination) targetElement.addEventListener("click", finishGuide, { once: true });
    return () => {
      setSpotlightStyle(null);
      targetResizeObserver?.disconnect();
      window.removeEventListener("resize", updateTarget);
      window.removeEventListener("scroll", updateTarget, true);
      targetElement.classList.remove("saya-guide-target");
      relatedTargetElement?.classList.remove("saya-guide-related-target");
      targetElement.removeEventListener("click", finishGuide);
    };
  }, [bubbleOpen, finishGuide, guideId, hasPagination, preferredPlacement, relatedTarget, reopenable, required, scope, showingIntroduction, target, visible]);

  if (!visible || artwork.status !== "ready") return null;

  function dismiss() {
    rememberTournamentGuide(window.localStorage, captainScope, guideId);
    setBubbleOpen(false);
  }

  function completeIntroduction() {
    rememberTournamentGuide(window.localStorage, captainScope, CHIBI_SAYA_INTRODUCTION_GUIDE_ID);
    setShowingIntroduction(false);
    if (!reopenable && !required && hasSeenTournamentGuide(window.localStorage, captainScope, guideId)) setVisible(false);
  }

  function reopenGuide() {
    setPageIndex(0);
    setBubbleOpen(true);
  }

  function moveGuide(position: GuidePosition) {
    const guide = guideRef.current;
    if (!guide) return;
    const rect = guide.getBoundingClientRect();
    const next = clampGuidePosition(position, rect, { width: window.innerWidth, height: window.innerHeight });
    setManualPosition(next);
  }

  function beginDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const rect = guideRef.current?.getBoundingClientRect();
    if (!rect) return;
    event.preventDefault();
    dragCleanupRef.current?.();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top };
    setManualPosition({ x: rect.left, y: rect.top });
    setDragging(true);
    const mascot = event.currentTarget;
    const cleanup = () => {
      window.removeEventListener("pointermove", continueDrag);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", finishDrag);
      dragCleanupRef.current = null;
    };
    const continueDrag = (moveEvent: globalThis.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== moveEvent.pointerId) return;
      moveGuide({ x: moveEvent.clientX - drag.offsetX, y: moveEvent.clientY - drag.offsetY });
    };
    const finishDrag = (endEvent: globalThis.PointerEvent) => {
      if (dragRef.current?.pointerId !== endEvent.pointerId) return;
      if (mascot.hasPointerCapture(endEvent.pointerId)) mascot.releasePointerCapture(endEvent.pointerId);
      dragRef.current = null;
      setDragging(false);
      cleanup();
    };
    dragCleanupRef.current = cleanup;
    window.addEventListener("pointermove", continueDrag);
    window.addEventListener("pointerup", finishDrag);
    window.addEventListener("pointercancel", finishDrag);
  }

  function moveWithKeyboard(event: KeyboardEvent<HTMLButtonElement>) {
    const direction = {
      ArrowLeft: [-16, 0],
      ArrowRight: [16, 0],
      ArrowUp: [0, -16],
      ArrowDown: [0, 16],
    }[event.key];
    if (!direction) return;
    event.preventDefault();
    const rect = guideRef.current?.getBoundingClientRect();
    if (rect) moveGuide({ x: rect.left + direction[0], y: rect.top + direction[1] });
  }

  return (
    <Fragment>
      {showingIntroduction
        ? <div className="saya-guide-scrim" aria-hidden="true" />
        : required
          ? <div className={spotlightStyle ? "saya-guide-spotlight" : "saya-guide-scrim"} style={spotlightStyle ?? undefined} aria-hidden="true" />
          : null}
      <aside
        ref={guideRef}
        className={`saya-guide placement-${placement} placement-${verticalPlacement}${showingIntroduction ? " is-introduction" : ""}${required ? " is-required" : ""}${persistent ? " is-space-companion" : ""}${bubbleOpen ? "" : " is-collapsed"}${manualPosition ? " manual-position" : ""}${dragging ? " is-dragging" : ""}`}
        style={manualPosition ? { left: manualPosition.x, top: manualPosition.y, right: "auto", bottom: "auto" } as CSSProperties : undefined}
        aria-live="polite"
        aria-label={showingIntroduction ? `${identity.chibiName}首次介绍：${identity.introductionTitle}` : persistent ? `${identity.chibiName}空间介绍：${title}` : `${identity.chibiName}操作引导：${title}`}
      >
        <div className="saya-guide-bubble" aria-hidden={!bubbleOpen}>
          {!showingIntroduction && !required ? <button className="saya-guide-dismiss" type="button" onClick={dismiss} aria-label="关闭本条引导"><X aria-hidden="true" /></button> : null}
          <small>{showingIntroduction || persistent ? `${identity.chibiName} · 随行向导` : `${identity.chibiName}的提示`}</small>
          <strong>{showingIntroduction ? identity.introductionTitle : activePage.title}</strong>
          <p>{showingIntroduction ? identity.introductionMessage : activePage.message}</p>
          {showingIntroduction
            ? <button className="saya-guide-introduction-action" type="button" onClick={completeIntroduction}>{identity.introductionAction}</button>
            : hasPagination
              ? <div className="saya-guide-pagination">
                  <button type="button" className="saya-guide-page-button" disabled={pageIndex === 0} onClick={() => setPageIndex((current) => Math.max(0, current - 1))} aria-label="上一页">‹ 上一页</button>
                  <span className="saya-guide-page-indicator">{safePageIndex + 1} / {pageCount}</span>
                  {safePageIndex < pageCount - 1
                    ? <button type="button" className="saya-guide-page-button" onClick={() => setPageIndex((current) => Math.min(pageCount - 1, current + 1))} aria-label="下一页">下一页 ›</button>
                    : <button type="button" className="saya-guide-page-button saya-guide-page-finish" onClick={finishGuide}>知道了</button>}
                </div>
              : actionLabel
                ? <button type="button" className="saya-guide-action" onClick={finishGuide}>{actionLabel}</button>
                : <span>{persistent ? identity.idleHint : required ? identity.requiredHint : identity.actionHint}</span>}
        </div>
        <button
          type="button"
          className="saya-guide-mascot"
          aria-label={bubbleOpen ? `拖动${identity.chibiName}调整引导位置` : reopenable ? `点击${identity.chibiName}重新查看${title}` : `展开${identity.chibiName}提示`}
          title={bubbleOpen ? `按住拖动${identity.chibiName}` : `点击展开${identity.chibiName}提示`}
          onClick={bubbleOpen ? undefined : reopenGuide}
          onPointerDown={beginDrag}
          onKeyDown={moveWithKeyboard}
        >
          <img src={artwork.url} alt={identity.chibiName} draggable={false} />
        </button>
      </aside>
    </Fragment>
  );
}
