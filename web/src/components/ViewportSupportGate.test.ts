import { describe, expect, it } from "vitest";
import { isSupportedViewport } from "./ViewportSupportGate";

describe("desktop viewport support", () => {
  it("accepts the minimum desktop canvas and larger viewports", () => {
    expect(isSupportedViewport(1280, 720)).toBe(true);
    expect(isSupportedViewport(3840, 2160)).toBe(true);
  });

  it("rejects either undersized dimension, including phone landscape", () => {
    expect(isSupportedViewport(1279, 720)).toBe(false);
    expect(isSupportedViewport(1280, 719)).toBe(false);
    expect(isSupportedViewport(844, 390)).toBe(false);
  });
});
