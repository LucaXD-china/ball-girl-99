export const mascotOptions = [
  {
    anchorId: "founder_left",
    characterId: "founder_sakura_link_4",
    name: "纱夜",
    position: "CB",
    greeting: "经理，放心向前吧。你身后的空间由我守住。",
    assetId: "character.founder.sakura_link_4",
    assetVariant: "standee",
    desktop: { xPercent: 68, bottomPercent: 10, heightPercent: 72 },
  },
  {
    anchorId: "founder_center",
    characterId: "founder_scarlet_toros_6",
    name: "伊蕾娜",
    position: "CDM",
    greeting: "先别急着开赛，经理。把下一步想清楚，我们就能掌握节拍。",
    assetId: "character.founder.scarlet_toros_6",
    assetVariant: "standee",
    desktop: { xPercent: 68, bottomPercent: 10, heightPercent: 66 },
  },
  {
    anchorId: "founder_right",
    characterId: "founder_samba_union_7",
    name: "娜雅",
    position: "RW",
    greeting: "经理，看好了——今天的第一道防线，由我来撕开。",
    assetId: "character.founder.samba_union_7",
    assetVariant: "standee",
    desktop: { xPercent: 68, bottomPercent: 10, heightPercent: 70 },
  },
  {
    anchorId: "six_star_fog_harriet_wren",
    characterId: "fog_harriet_wren",
    name: "雷恩",
    position: "ST",
    greeting: "把球交给我。最难撕开的防线，才值得成为今天的目标。",
    assetId: "character.six-star.fog_harriet_wren",
    assetVariant: "standee",
    desktop: { xPercent: 68, bottomPercent: 9, heightPercent: 72 },
  },
  {
    anchorId: "six_star_rose_elodie_beaumont",
    characterId: "rose_elodie_beaumont",
    name: "埃洛迪",
    position: "LW",
    greeting: "耐心一点，经理。真正的空当，总会在最后一刻出现。",
    assetId: "character.six-star.rose_elodie_beaumont",
    assetVariant: "standee",
    desktop: { xPercent: 68, bottomPercent: 9, heightPercent: 72 },
  },
  {
    anchorId: "six_star_rhein_klara_neumann",
    characterId: "rhein_klara_neumann",
    name: "克拉拉",
    position: "CDM",
    greeting: "阵型已经记下了。接下来，让对手跟着我们的节奏行动。",
    assetId: "character.six-star.rhein_klara_neumann",
    assetVariant: "standee",
    desktop: { xPercent: 68, bottomPercent: 9, heightPercent: 72 },
  },
  {
    anchorId: "six_star_sol_lucia_montoro",
    characterId: "sol_lucia_montoro",
    name: "露西亚",
    position: "CM",
    greeting: "今天也要踢得漂亮，经理。胜利和掌声，我都想要。",
    assetId: "character.six-star.sol_lucia_montoro",
    assetVariant: "standee",
    desktop: { xPercent: 68, bottomPercent: 9, heightPercent: 72 },
  },
  {
    anchorId: "six_star_gold_vitoria_luz",
    characterId: "gold_vitoria_luz",
    name: "卢兹",
    position: "RW",
    greeting: "听见节拍了吗，经理？下一次突破就从边线开始。",
    assetId: "character.six-star.gold_vitoria_luz",
    assetVariant: "standee",
    desktop: { xPercent: 68, bottomPercent: 9, heightPercent: 72 },
  },
  {
    anchorId: "six_star_silver_sofia_acosta",
    characterId: "silver_sofia_acosta",
    name: "阿科斯塔",
    position: "CAM",
    greeting: "我已经看见传球路线了。经理，只等你给出开始的信号。",
    assetId: "character.six-star.silver_sofia_acosta",
    assetVariant: "standee",
    desktop: { xPercent: 68, bottomPercent: 9, heightPercent: 72 },
  },
  {
    anchorId: "six_star_sakura_akari_fujimoto",
    characterId: "sakura_akari_fujimoto",
    name: "明里",
    position: "CM",
    greeting: "大家的跑位已经连起来了。经理，我们一起把球送到最前面吧。",
    assetId: "character.six-star.sakura_akari_fujimoto",
    assetVariant: "standee",
    desktop: { xPercent: 68, bottomPercent: 9, heightPercent: 72 },
  },
  {
    anchorId: "six_star_azure_giulia_bellini",
    characterId: "azure_giulia_bellini",
    name: "朱莉娅",
    position: "GK",
    greeting: "球门交给我。你只需要考虑，下一次进攻从哪里发起。",
    assetId: "character.six-star.azure_giulia_bellini",
    assetVariant: "standee",
    desktop: { xPercent: 68, bottomPercent: 9, heightPercent: 72 },
  },
] as const;

export const sayaMascot = mascotOptions[0];

export type MascotId = (typeof mascotOptions)[number]["anchorId"];

export type OfficeJourneyStage = "round_of_16" | "quarter_final" | "semi_final" | "final";

export function availableMascotOptions(collection: Record<string, number>) {
  return mascotOptions.filter((mascot) => (
    !mascot.anchorId.startsWith("six_star_") || (collection[mascot.characterId] ?? 0) > 0
  ));
}

export function mascotGreetingForManager(greeting: string, nickname: string) {
  const managerName = nickname.endsWith("经理") ? nickname : `${nickname}经理`;
  return greeting.includes("经理") ? greeting.replace("经理", managerName) : `${managerName}，${greeting}`;
}

export function isMascotId(value: unknown): value is MascotId {
  return mascotOptions.some((mascot) => mascot.anchorId === value);
}
