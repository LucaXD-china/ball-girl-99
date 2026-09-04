import { describe, expect, it } from "vitest";
import { founderStories, founderStoryText } from "./founderStories";
import { resolveAsset } from "../services/assetResolver";

const approvedHash = {
  SAYA: "49b90a95af17439e48866b9b287140ad227f9bb47aa69a7b7181e5f964a74b07",
  NAYA: "f3339fff047e57b0b3e81bf36d9d9f8a579ead79b5369e29e0f54c2ccc593a17",
  IRENA: "caa2e04f3a41e1803facfe7959cd58a6968c61dc13f69a13ef4b0b59ed848680",
};

describe("approved founder stories", () => {
  it("keeps every approved sentence and its order byte-for-byte", async () => {
    for (const [id, story] of Object.entries(founderStories)) {
      const bytes = new TextEncoder().encode(story.beats.map(({ text }) => text).join("\n"));
      const digest = [...new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", bytes))].map((byte) => byte.toString(16).padStart(2, "0")).join("");
      expect(digest, id).toBe(approvedHash[id as keyof typeof approvedHash]);
    }
  });

  it("only substitutes the two approved club placeholders at display time", () => {
    const source = [...founderStories.SAYA.beats, ...founderStories.NAYA.beats, ...founderStories.IRENA.beats].map(({ text }) => text).join("\n");
    expect(source).toContain("xxx（球队名）");
    expect(source).toContain("xxx（俱乐部名）");
    expect(founderStoryText(source, "晴空竞技")).not.toContain("xxx（");
    expect(founderStoryText(source, "晴空竞技").match(/晴空竞技/g)).toHaveLength(3);
  });

  it("publishes all seventeen founder story frames through the asset manifest", () => {
    const frames = Object.values(founderStories).flatMap(({ beats }) => beats.map(({ frame }) => frame));
    expect(new Set(frames)).toHaveLength(17);
    expect(new Set(founderStories.IRENA.beats.map(({ frame }) => frame))).toHaveLength(6);
    for (const frame of new Set(frames)) expect(resolveAsset("scene.founder-stories.v1", frame).status, frame).toBe("ready");
  });
});
