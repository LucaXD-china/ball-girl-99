import { founderStories, type FounderStoryId } from "./founderStories";
import { opponentStories, type OpponentStoryId } from "./opponentStories";

export type TournamentStoryId = FounderStoryId | OpponentStoryId;
export const tournamentStoryIds: TournamentStoryId[] = ["SAYA", "NAYA", "IRENA", ...Object.values(opponentStories).map(({ id }) => id)];

export function isTournamentStoryId(value: unknown): value is TournamentStoryId {
  return typeof value === "string" && tournamentStoryIds.includes(value as TournamentStoryId);
}

export function tournamentStoryForId(id: TournamentStoryId) {
  return founderStories[id as FounderStoryId] ?? Object.values(opponentStories).find((story) => story.id === id);
}
