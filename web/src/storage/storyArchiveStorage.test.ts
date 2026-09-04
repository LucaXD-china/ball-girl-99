import { describe, expect, it } from "vitest";
import { loadStoryArchive, normalizeStoryArchive, unlockStories } from "./storyArchiveStorage";
import type { StorageAdapter } from "./localAccountStore";

function memoryStorage(): StorageAdapter {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
  };
}

describe("story archive storage", () => {
  it("loads an empty archive for a fresh account", async () => {
    const storage = memoryStorage();
    expect(await loadStoryArchive("user-1", storage)).toEqual(normalizeStoryArchive({}));
  });

  it("unlocks stories and persists them per uid", async () => {
    const storage = memoryStorage();
    const archive = await unlockStories("user-1", ["PROLOGUE-01", "DAY1-01"], undefined, storage);
    expect(archive.unlockedAt["PROLOGUE-01"]).toBeTruthy();
    expect(archive.unlockedAt["DAY1-01"]).toBeTruthy();
    expect(await loadStoryArchive("user-1", storage)).toEqual(archive);
    expect((await loadStoryArchive("user-2", storage)).unlockedAt).toEqual({});
  });

  it("records failure-ending replay variants keyed by captain", async () => {
    const storage = memoryStorage();
    const archive = await unlockStories("user-1", ["END-01"], "naya", storage);
    expect(archive.endingVariants["END-01"]).toEqual(["naya"]);
  });

  it("gates champion endings to their captain route", async () => {
    const storage = memoryStorage();
    await expect(unlockStories("user-1", ["END-03"], "naya", storage)).rejects.toThrow("END-03 只能由对应队长路线解锁");

    const sayaEnd = await unlockStories("user-1", ["END-03"], "saya", storage);
    expect(sayaEnd.unlockedAt["END-03"]).toBeTruthy();

    await expect(unlockStories("user-1", ["END-04"], "saya", storage)).rejects.toThrow("END-04 只能由对应队长路线解锁");
    const nayaEnd = await unlockStories("user-1", ["END-04"], "naya", storage);
    expect(nayaEnd.unlockedAt["END-04"]).toBeTruthy();

    const irenaEnd = await unlockStories("user-1", ["END-05"], "irena", storage);
    expect(irenaEnd.unlockedAt["END-05"]).toBeTruthy();
  });

  it("requires earlier champion endings to be unlocked first", async () => {
    const storage = memoryStorage();
    await expect(unlockStories("user-1", ["END-04"], "naya", storage)).rejects.toThrow("尚未解锁 END-03");
    await expect(unlockStories("user-1", ["END-05"], "irena", storage)).rejects.toThrow("尚未解锁 END-04");
  });
});
