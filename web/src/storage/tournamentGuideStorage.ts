const GUIDE_STORAGE_PREFIX = "ball-girl:tournament-guide:v1:";

export const OFFICE_SAYA_INTRODUCTION_GUIDE_ID = "office-saya-introduction-v1";
export const CHIBI_SAYA_INTRODUCTION_GUIDE_ID = "chibi-saya-introduction-v1";

type GuideStorage = Pick<Storage, "getItem" | "setItem">;

function storageKey(scope: string) {
  return `${GUIDE_STORAGE_PREFIX}${scope}`;
}

export function seenTournamentGuideIds(storage: GuideStorage, scope: string): string[] {
  try {
    const value = JSON.parse(storage.getItem(storageKey(scope)) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function hasSeenTournamentGuide(storage: GuideStorage, scope: string, guideId: string) {
  return seenTournamentGuideIds(storage, scope).includes(guideId);
}

export function rememberTournamentGuide(storage: GuideStorage, scope: string, guideId: string) {
  const seen = seenTournamentGuideIds(storage, scope);
  if (seen.includes(guideId)) return;
  storage.setItem(storageKey(scope), JSON.stringify([...seen, guideId]));
}
