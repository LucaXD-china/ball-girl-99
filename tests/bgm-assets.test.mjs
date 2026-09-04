import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const bgmFiles = [
  "web/runtime-assets/audio/login-theme-v1/theme.m4a",
  "web/runtime-assets/audio/hub-quest-v1/quest.m4a",
  "web/runtime-assets/audio/match-battle-v1/battle.m4a",
];

test("ships the three AAC BGM files within the six MiB budget", async () => {
  let totalBytes = 0;
  for (const relativePath of bgmFiles) {
    const path = new URL(`../${relativePath}`, import.meta.url);
    const header = (await readFile(path)).subarray(4, 12).toString("ascii");
    assert.equal(header, "ftypM4A ");
    totalBytes += (await stat(path)).size;
  }
  assert.ok(totalBytes <= 6 * 1024 * 1024, `BGM is ${totalBytes} bytes`);
});
