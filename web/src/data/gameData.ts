import rosterJson from "../generated/expanded-roster-v1.public.json";
import founderRosterJson from "../generated/founder-roster-v1.public.json";
import matchContractJson from "../generated/text-match-seed-contract-v1.json";
import opponentRosterJson from "../generated/opponent-roster-v1.public.json";

export type Character = {
  character_id: string;
  name: string;
  profile: { full_name: string };
  faction_id: FactionId;
  position: string;
  stars: number;
  base_trait_id: string;
  signature_skill_id: string;
  attributes: {
    overall: number;
    pace: number;
    shooting: number;
    passing: number;
    dribbling: number;
    defending: number;
    physical: number;
    detailed: Record<string, number>;
    goalkeeping: Record<string, number | null>;
  };
  preferred_foot: string;
  alternative_positions: string[];
  opponentPromotion?: {
    baseStars: 3 | 4;
    targetStars: 5 | 6;
  };
  tournamentOpponentBondFactionId?: FactionId;
  opponent_club_id?: string;
};

export type FactionId = keyof typeof factionMeta;

export const factionMeta = {
  fog_court: { name: "雾都王庭", color: "#8f87ff" },
  gaul_iris: { name: "高卢鸢尾", color: "#67a8ff" },
  iron_engine: { name: "钢铁引擎", color: "#8ca1b9" },
  scarlet_toros: { name: "赤红斗牛", color: "#ff6a7d" },
  samba_union: { name: "桑巴联盟", color: "#f2c94c" },
  pampas_silver: { name: "潘帕斯银辉", color: "#8ce1ef" },
  sakura_link: { name: "樱华连结", color: "#ff8eb4" },
  azure_fortress: { name: "苍蓝堡垒", color: "#4d8dff" },
  cape_voyagers: { name: "大航海团", color: "#2f8f6b" },
} as const;

type RosterManifest = {
  schema_version: number;
  character_data_version: string;
  characters: Character[];
};

type FounderRosterManifest = RosterManifest;

export type MatchCase = {
  case_id: string;
  match_mode_id: string;
  seed: number;
  score: Record<string, number>;
  teams: Record<string, { starters: string[] }>;
  shots: Array<{ minute: number; outcome: string }>;
};

type MatchContract = {
  contract_version: string;
  match_mode_contract_version: string;
  match_rules_version: string;
  character_data_version: string;
  cases: MatchCase[];
};

export const roster = rosterJson as RosterManifest;
export const founderCharacters = (founderRosterJson as FounderRosterManifest).characters;
export const playableCharacters = [...roster.characters, ...founderCharacters];
export const opponentRoster = opponentRosterJson as RosterManifest;
export const matchContract = matchContractJson as MatchContract;

export const rosterStats = {
  characters: roster.characters.length,
  factions: new Set(roster.characters.map((character) => character.faction_id)).size,
  sixStars: roster.characters.filter((character) => character.stars === 6).length,
  goalkeepers: roster.characters.filter((character) => character.position === "GK").length,
};
