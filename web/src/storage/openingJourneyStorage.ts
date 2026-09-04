import type { StorageAdapter } from "./localAccountStore";

export const OPENING_JOURNEY_KEY_PREFIX = "ball-girl:opening-journey-v1:";
export const OPENING_JOURNEY_SCHEMA_VERSION = 1;

export type OpeningJourneyState = {
  schemaVersion: typeof OPENING_JOURNEY_SCHEMA_VERSION;
  prologueBeat: number;
  nicknameConfirmed: boolean;
  clubName: string;
  prologueCompleted: boolean;
  day1StoryBeat: number;
  day1StoryCompleted: boolean;
  updatedAt: string;
};

function browserStorage(): StorageAdapter | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function emptyOpeningJourney(): OpeningJourneyState {
  return {
    schemaVersion: OPENING_JOURNEY_SCHEMA_VERSION,
    prologueBeat: 0,
    nicknameConfirmed: false,
    clubName: "",
    prologueCompleted: false,
    day1StoryBeat: 0,
    day1StoryCompleted: false,
    updatedAt: new Date(0).toISOString(),
  };
}

function parseOpeningJourney(raw: string): OpeningJourneyState | null {
  try {
    const value = JSON.parse(raw) as Partial<OpeningJourneyState>;
    if (
      value.schemaVersion !== OPENING_JOURNEY_SCHEMA_VERSION ||
      !Number.isInteger(value.prologueBeat) || Number(value.prologueBeat) < 0 ||
      typeof value.nicknameConfirmed !== "boolean" ||
      typeof value.clubName !== "string" ||
      typeof value.prologueCompleted !== "boolean" ||
      typeof value.updatedAt !== "string"
    ) return null;
    return {
      ...(value as OpeningJourneyState),
      day1StoryBeat: Number.isInteger(value.day1StoryBeat) && Number(value.day1StoryBeat) >= 0 ? Number(value.day1StoryBeat) : 0,
      day1StoryCompleted: typeof value.day1StoryCompleted === "boolean" ? value.day1StoryCompleted : false,
    };
  } catch {
    return null;
  }
}

export function openingJourneyKey(uid: string) {
  return `${OPENING_JOURNEY_KEY_PREFIX}${uid}`;
}

export function loadOpeningJourney(
  uid: string,
  storage: StorageAdapter | null = browserStorage(),
): OpeningJourneyState {
  if (!storage) return emptyOpeningJourney();
  try {
    const raw = storage.getItem(openingJourneyKey(uid));
    return raw ? parseOpeningJourney(raw) ?? emptyOpeningJourney() : emptyOpeningJourney();
  } catch {
    return emptyOpeningJourney();
  }
}

export function updateOpeningJourney(
  uid: string,
  patch: Partial<Omit<OpeningJourneyState, "schemaVersion" | "updatedAt">>,
  storage: StorageAdapter | null = browserStorage(),
) {
  const next: OpeningJourneyState = {
    ...loadOpeningJourney(uid, storage),
    ...patch,
    schemaVersion: OPENING_JOURNEY_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
  };
  try {
    storage?.setItem(openingJourneyKey(uid), JSON.stringify(next));
  } catch {
    // The first-play flow remains usable even when browser storage is unavailable.
  }
  return next;
}

export function validateClubName(input: string) {
  const name = input.trim();
  const length = Array.from(name).length;
  if (length < 2 || length > 20) throw new Error("球队名需为 2–20 个字符");
  return name;
}
