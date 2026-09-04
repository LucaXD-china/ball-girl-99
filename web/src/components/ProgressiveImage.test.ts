import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProgressiveImage } from "./ProgressiveImage";

describe("ProgressiveImage", () => {
  it("keeps a visible placeholder and prioritizes eager images", () => {
    const markup = renderToStaticMarkup(createElement(ProgressiveImage, {
      src: "/card.webp",
      alt: "测试球星卡",
      placeholder: "测",
      eager: true,
    }));
    expect(markup).toContain("progressive-image-placeholder");
    expect(markup).toContain("loading=\"eager\"");
    expect(markup).toContain("fetchPriority=\"high\"");
    expect(markup).toContain("decoding=\"async\"");
  });

  it("lazy-loads non-critical images", () => {
    const markup = renderToStaticMarkup(createElement(ProgressiveImage, {
      src: "/card.webp",
      alt: "测试球星卡",
      placeholder: "测",
    }));
    expect(markup).toContain("loading=\"lazy\"");
  });

  it("keeps the image node available for cached-image completion checks", () => {
    const markup = renderToStaticMarkup(createElement(ProgressiveImage, {
      src: "/card.webp",
      alt: "测试球星卡",
      placeholder: "测",
    }));
    expect(markup).toContain('<img class="progressive-image" src="/card.webp"');
  });
});
