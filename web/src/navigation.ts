export type AppSectionId = "office" | "locker" | "training" | "match" | "schedule" | "packs" | "stories" | "registration";

export type AppSection = {
  id: AppSectionId;
  label: string;
};

export const appSections: AppSection[] = [
  { id: "office", label: "经理办公室" },
  { id: "locker", label: "球员更衣室" },
  { id: "training", label: "训练中心" },
  { id: "schedule", label: "赛程" },
  { id: "packs", label: "球星卡商店" },
  { id: "stories", label: "剧情回顾" },
];
