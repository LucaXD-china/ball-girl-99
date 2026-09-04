import type { AppSectionId } from "../navigation";
import { SayaGuide, type SayaGuideVariant } from "./SayaGuide";
import { useTournamentCaptain } from "./TournamentCaptainContext";
import { captainSpaceMessage } from "../data/captainGuideCopy";

type CompanionSection = Exclude<AppSectionId, "office">;

type CompanionIntroduction = { title: string; message: string; variant: SayaGuideVariant };

export const sayaSpaceIntroductions: Record<CompanionSection, CompanionIntroduction> = {
  locker: {
    title: "这里是球员更衣室",
    message: "大家都在这里。点开卡片看看她们，搜索和筛选也能更快找到人。",
    variant: "welcome",
  },
  training: {
    title: "这里是训练中心",
    message: "三个方向：进攻、组织、防守。选方向挑 3 人练 5 天，每人最多练 6 次。",
    variant: "guide",
  },
  schedule: {
    title: "这里是赛程晋级图",
    message: "每轮都会更新晋级队伍，提前看看下一轮可能的对手。",
    variant: "think",
  },
  match: {
    title: "这里是比赛入口",
    message: "可以先观察对手，也可以盲打。定好攻防阵型和十一人首发就上场。",
    variant: "guide",
  },
  packs: {
    title: "这里是球星卡商店",
    message: "先选喜欢的阵营，再开抽吧！重复卡会自动帮球员升星，不用额外操作。",
    variant: "welcome",
  },
  stories: {
    title: "这里是剧情回顾",
    message: "走过的故事都收在这里。想回看哪一段，点开就好。",
    variant: "welcome",
  },
  registration: {
    title: "这里是赛事注册处",
    message: "从现有球员中选满十八人。锁定后不能更换，最后再确认一次吧。",
    variant: "remind",
  },
};

export const sayaScheduleJourneyEndedIntroduction: CompanionIntroduction = {
  title: "这是属于我们的结局",
  message: "经理，谢谢你陪大家走到这里。一起去看看结局吧。",
  variant: "celebrate",
};

export function sayaCompanionIntroduction(section: CompanionSection, scheduleJourneyEnded = false, captainId: "saya" | "naya" | "irena" = "saya") {
  const base = section === "schedule" && scheduleJourneyEnded ? sayaScheduleJourneyEndedIntroduction : sayaSpaceIntroductions[section];
  if (captainId === "saya") return base;
  if (scheduleJourneyEnded) return { ...base, message: captainId === "naya" ? "这就是我们的结局。经理，谢谢你一路冲到这里，一起去看看吧！" : captainId === "irena" ? "本届征程已经结束。经理，谢谢你陪我们走到这里；现在进入结局。" : base.message };
  return { ...base, message: captainSpaceMessage(captainId, section, base.message) };
}

export function SayaCompanion({ section, scope, scheduleJourneyEnded = false }: { section: CompanionSection; scope: string; scheduleJourneyEnded?: boolean }) {
  const { captainId } = useTournamentCaptain();
  const introduction = sayaCompanionIntroduction(section, scheduleJourneyEnded, captainId);
  return <SayaGuide
    scope={scope}
    guideId={`space-${section}`}
    title={introduction.title}
    message={introduction.message}
    target=""
    variant={introduction.variant}
    persistent
  />;
}
