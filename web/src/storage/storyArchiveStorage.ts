import { isTournamentCaptainId, type TournamentCaptainId } from "../data/tournamentCaptain";
import type { StorageAdapter } from "./localAccountStore";

export const STORY_ARCHIVE_SCHEMA_VERSION = 2;
export const STORY_ARCHIVE_KEY_PREFIX = "ball-girl:story-archive-v2:";

export type StoryArchiveId =
  | "PROLOGUE-01"
  | "PROLOGUE-02"
  | "PROLOGUE-03"
  | "DAY1-01"
  | "SAYA"
  | "NAYA"
  | "IRENA"
  | "OPPONENT-lumiere_crown"
  | "OPPONENT-ivory_capital"
  | "OPPONENT-indigo_serpents"
  | "OPPONENT-azure_gulf"
  | "END-01"
  | "END-02"
  | "END-03"
  | "END-04"
  | "END-05";

export type StoryArchiveState = {
  schemaVersion: typeof STORY_ARCHIVE_SCHEMA_VERSION;
  unlockedAt: Partial<Record<StoryArchiveId, string>>;
  endingVariants: Partial<Record<"END-01" | "END-02", TournamentCaptainId[]>>;
  updatedAt: string;
};

const CHAMPION_ENDING_CAPTAIN: Partial<Record<StoryArchiveId, TournamentCaptainId>> = {
  "END-03": "saya",
  "END-04": "naya",
  "END-05": "irena",
};

function browserStorage(): StorageAdapter | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage; } catch { return null; }
}

export function storyArchiveKey(uid: string) {
  return `${STORY_ARCHIVE_KEY_PREFIX}${uid}`;
}

export function normalizeStoryArchive(value: Partial<StoryArchiveState> & { unlockedAt?: Partial<Record<StoryArchiveId, string>> }): StoryArchiveState {
  const endingVariants = Object.fromEntries(Object.entries(value.endingVariants ?? {}).map(([endingId, captainIds]) => [
    endingId,
    Array.isArray(captainIds) ? captainIds.filter(isTournamentCaptainId) : [],
  ])) as StoryArchiveState["endingVariants"];
  return {
    schemaVersion: STORY_ARCHIVE_SCHEMA_VERSION,
    unlockedAt: value.unlockedAt ?? {},
    endingVariants,
    updatedAt: value.updatedAt ?? new Date(0).toISOString(),
  };
}

function writeStoryArchive(uid: string, archive: StoryArchiveState, storage: StorageAdapter | null) {
  try { storage?.setItem(storyArchiveKey(uid), JSON.stringify(archive)); } catch { /* keep the game usable when storage is unavailable */ }
  return archive;
}

export async function loadStoryArchive(uid: string, storage: StorageAdapter | null = browserStorage()): Promise<StoryArchiveState> {
  const raw = storage?.getItem(storyArchiveKey(uid));
  if (!raw) return normalizeStoryArchive({});
  try {
    return normalizeStoryArchive(JSON.parse(raw) as Partial<StoryArchiveState>);
  } catch {
    return normalizeStoryArchive({});
  }
}

export async function unlockStories(
  uid: string,
  storyIds: StoryArchiveId[],
  captainId?: TournamentCaptainId,
  storage: StorageAdapter | null = browserStorage(),
): Promise<StoryArchiveState> {
  const current = await loadStoryArchive(uid, storage);
  const endingVariants = captainId
    ? Object.fromEntries(storyIds.filter((storyId): storyId is "END-01" | "END-02" => storyId === "END-01" || storyId === "END-02").map((storyId) => [storyId, [captainId]]))
    : undefined;

  for (const [endingId, requiredCaptainId] of Object.entries(CHAMPION_ENDING_CAPTAIN)) {
    if (storyIds.includes(endingId as StoryArchiveId) && captainId !== requiredCaptainId) {
      throw new Error(`${endingId} 只能由对应队长路线解锁`);
    }
  }

  const now = new Date().toISOString();
  const archive = normalizeStoryArchive({ ...current, updatedAt: now });
  if (storyIds.includes("END-04") && !archive.unlockedAt["END-03"]) throw new Error("尚未解锁 END-03");
  if (storyIds.includes("END-05") && !archive.unlockedAt["END-04"]) throw new Error("尚未解锁 END-04");

  for (const storyId of storyIds) {
    if (!archive.unlockedAt[storyId]) archive.unlockedAt[storyId] = now;
  }
  for (const [endingId, captainIds] of Object.entries(endingVariants ?? {})) {
    const key = endingId as "END-01" | "END-02";
    archive.endingVariants[key] = [...new Set([...(archive.endingVariants[key] ?? []), ...captainIds])];
  }

  return writeStoryArchive(uid, archive, storage);
}
