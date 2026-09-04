export type GuidePosition = { x: number; y: number };

export function clampGuidePosition(position: GuidePosition, size: { width: number; height: number }, viewport: { width: number; height: number }, padding = 8): GuidePosition {
  const maxX = Math.max(padding, viewport.width - size.width - padding);
  const maxY = Math.max(padding, viewport.height - size.height - padding);
  return {
    x: Math.min(maxX, Math.max(padding, position.x)),
    y: Math.min(maxY, Math.max(padding, position.y)),
  };
}
