import type { TournamentCaptainId } from "./tournamentCaptain";

export type GuideVariant = "welcome" | "guide" | "think" | "remind" | "celebrate";

export const captainGuideIdentity = {
  saya: { name: "纱夜", chibiName: "小纱夜", assetId: "character.guide.saya_chibi", introductionTitle: "以后也请多关照", introductionMessage: "我是小纱夜！离开办公室后，我会陪着你。点亮光处继续；挡住时，拖动我就好。", introductionAction: "认识你很高兴", idleHint: "有需要就再叫我吧 · 按住可以拖动", actionHint: "点击闪光位置继续 · 拖动小纱夜可移开", requiredHint: "完成闪光位置的操作后即可自由探索 · 拖动小纱夜可移开" },
  naya: { name: "娜雅", chibiName: "小娜雅", assetId: "character.guide.naya_chibi", introductionTitle: "一起把这里踢热闹吧", introductionMessage: "我是小娜雅！离开办公室后，我也会陪着你。点亮光处，我们马上出发；挡住时，拖动我就好！", introductionAction: "走吧！", idleHint: "有需要就喊我！按住可以拖动", actionHint: "点亮光处，我们马上出发！挡住时可以拖动小娜雅", requiredHint: "点亮光处，我们马上出发！挡住时可以拖动小娜雅" },
  irena: { name: "伊蕾娜", chibiName: "小伊蕾娜", assetId: "character.guide.irena_chibi", introductionTitle: "最终的挑战", introductionMessage: "我是小伊蕾娜。离开办公室后，我会继续提供提示。完成高亮位置的操作即可继续；遮挡内容时，可以拖动我。", introductionAction: "明白了", idleHint: "需要时再叫我。按住可以拖动", actionHint: "完成高亮位置的操作即可继续。可拖动小伊蕾娜调整位置", requiredHint: "完成高亮位置的操作即可继续。可拖动小伊蕾娜调整位置" },
} as const;

export const captainOfficeIntroductions: Record<TournamentCaptainId, readonly string[]> = {
  saya: [
    "初次见面，经理。我是月城纱夜，是球队的中后卫，也是大家推选的队长。接下来的旅程，我会陪你一起度过。帮助你尽快熟悉球队的运营和操作。",
    "这是一段为期99天的冠军征程。我们要依次完成16强、八强、半决赛和决赛，共7场比赛。其中，前三轮比赛为主客场双赛。决赛则是单场决胜。",
    "为了备战本届杯赛，管理层为我们提供了新的补强资金。一起去球星卡商店看看吧~",
  ],
  naya: [
    "本轮难度：困难。娜雅线最高只能招募5星球员，抽卡和名单搭配都要更谨慎。",
    "这是一段为期99天的冠军征程。16强、八强和半决赛都是主客场两回合，决赛一场定胜负——一共7场，场场都要冲到底！",
    "管理层已经准备好了补强资金。先去球星卡商店看看吧，我等不及认识新队友了！",
  ],
  irena: [
    "本轮难度：极难。伊蕾娜线最高只能招募4星球员，需要更精确地规划每次补强。",
    "征程一共99天。16强、八强和半决赛采用主客场两回合，决赛单场决胜，总计7场比赛。",
    "管理层已经提供补强资金。先检查球星卡商店，再根据阵容缺口作出选择。",
  ],
};

const nayaSpace = {
  locker: "大家都在这里！点开卡片认识她们，搜索和筛选也能帮你马上找到人。",
  training: "进攻、组织、防守，选一个方向带3个人练5天。想清楚要加强哪里，我们就开练！",
  schedule: "路线都画在这里了！先看看下一轮可能遇到谁，我们一场一场赢过去。",
  match: "先看对手也行，直接打也行！定好攻防阵型和十一人首发，我们就上场！",
  packs: "先挑喜欢的阵营，再开抽吧！重复卡会自动帮球员升星，不用额外操作！",
  stories: "我们走过的故事都在这里！想看哪一段，点开就能重新出发。",
  registration: "从现有球员里选满十八人。锁定就不能换了，最后一起再确认一次！",
};
const irenaSpace = {
  locker: "这里可以检查全部球员。打开卡片查看资料，也可以用搜索和筛选缩小范围。",
  training: "训练分为进攻、组织、防守。每次选择3人并消耗5天，每人最多训练6次。",
  schedule: "签表会随赛果更新。提前确认潜在对手，可以减少后续判断的不确定性。",
  match: "可以先观察对手，再确定攻防阵型和十一人首发。完成检查后即可开赛。",
  packs: "先选择阵营，再开始招募。重复卡会自动升星，不需要额外操作。",
  stories: "已解锁剧情都保存在这里。选择任意条目即可回看。",
  registration: "从现有球员中选择十八人。锁定后无法更换，请在提交前复核。",
};

export function captainSpaceMessage(captainId: TournamentCaptainId, section: keyof typeof nayaSpace, fallback: string) {
  return captainId === "naya" ? nayaSpace[section] : captainId === "irena" ? irenaSpace[section] : fallback;
}

export const captainOfficeMessages: Record<Exclude<TournamentCaptainId, "saya">, Record<string, string>> = {
  naya: {
    briefing: "经理，别紧张！先把任务接下来，后面的路我们一起冲！",
    recruitment: "球星卡商店开门了！先看看不同阵营，挑一批能和我们并肩往前冲的伙伴吧！",
    registration: "冠军联赛只能带十八人。把最相信的伙伴选出来，锁定后我们一起出发！",
    draw: "名单准备好了！去看签表吧，不管第一位对手是谁，我们都从她们身上跨过去！",
    story: "新故事送到了！先读完这一章，再继续比赛。",
    finished: "辛苦啦，经理！不管结果是什么，这九十九天都值得我们好好再看一遍。",
    continue: "训练、观察、直接比赛都可以。决定好了就喊我，我们马上行动！",
    matchday: "比赛日到了！十一个人一起冲上去，把准备好的东西全踢出来！",
    scout: "想先看看她们怎么踢吗？花5天拿到阵型情报，再决定怎么出手！",
    firstTraining: "先练一次吧！选一个方向，带三位球员把状态提起来！",
    noTime: "这轮时间用完了。准备好，我们就直接去比赛日！",
  },
  irena: {
    briefing: "经理，先确认任务。完成接受后，我们再处理下一步。",
    recruitment: "补强窗口已经开放。先比较各阵营特点，再按阵容缺口招募。",
    registration: "参赛名单限十八人。请检查位置覆盖和练度，再锁定最终名单。",
    draw: "名单已经锁定。下一步查看签表，并确认首轮对手。",
    story: "新剧情已经开放。阅读完成后，赛事流程才会继续。",
    finished: "征程已经结束。先复盘完整过程，再查看最终结局。",
    continue: "当前可以训练、观察对手或直接开赛。请根据剩余天数选择。",
    matchday: "比赛日已到。进入比赛，确认阵型与首发。",
    scout: "观察对手消耗5天，可获得阵型情报。请根据剩余时间决定。",
    firstTraining: "建议先完成一次训练。选择方向与三名球员，将消耗5天。",
    noTime: "本轮已无可用行动时间。确认后直接进入比赛日。",
  },
};

export const captainGuideMessages: Record<Exclude<TournamentCaptainId, "saya">, Record<string, string>> = {
  naya: {
    "recruitment-faction": "先看看桑巴联盟！这里的人都知道怎么用一次突破让比赛热起来。",
    "recruitment-first-ten": "桑巴联盟擅长即兴突破和边路进攻。先开一次十连；重复卡会自动帮你升星，不用额外操作！",
    "recruitment-finish": "招募完成！接下来选出十八人名单，我们准备出征！",
    "registration-select": "先选满十八位伙伴！点击卡片加入或移出，四条线都要有人能顶上。",
    "registration-lock": "名单齐了！最后再看一遍，锁定后我们就不能换人了。",
    "draw-confirm": "这就是我们的晋级路线！记住第一位对手，剩下的人我们一场场去赢。",
    "journey-ending": "这就是我们的结局。经理，谢谢你一路冲到这里，一起去看看吧！",
    "match-attack": "先决定怎么进攻！多切几个阵型看看，挑一个最能压住对面的！",
    "match-defense": "进攻定了，再把身后守好。选一个能让大家放心往前冲的结构！",
    "match-lineup": "把十一位球员放上场！逐个选也行，一键补完再调整也行。",
    "match-start": "首发齐了！再看一遍攻防和羁绊，满意我们就上场！",
    "match-result": "再看看控球、射门和评分。看完这一场，我们马上准备下一场！",
    "decision-rules": "90分钟打平就再踢30分钟，上下半场各15分钟。还分不出胜负，就点球见！",
  },
  irena: {
    "recruitment-faction": "先检查赤红斗牛。这个阵营擅长控球、传递和掌握比赛节奏。",
    "recruitment-first-ten": "先在赤红斗牛完成一次十连；重复卡会自动帮你升星，不需要额外操作。",
    "recruitment-finish": "补强预算已经用完。下一步从现有球员中锁定十八人名单。",
    "registration-select": "请选择十八名球员。点击卡片加入或移出，并检查各位置是否都有覆盖。",
    "registration-lock": "名单人数正确。请完成最后复核；锁定后无法更换。",
    "draw-confirm": "晋级路线已经生成。先确认首轮对手，再接受抽签结果。",
    "journey-ending": "全部赛果已经锁定。经理，谢谢你陪我们走到这里；现在进入结局。",
    "match-attack": "先确定有球结构。比较阵型特点和加成，选择最适合现有球员的一种。",
    "match-defense": "再确定无球结构。候选项都能由当前进攻阵型自然切换。",
    "match-lineup": "首发需要十一人。可以逐个选择，也可以先自动补全再调整。",
    "match-start": "十一人已就位。请复核攻防阵型、位置适配和羁绊，然后开赛。",
    "match-result": "赛果已经锁定。检查控球、射门和评分后，继续下一阶段。",
    "decision-rules": "常规时间打平后加赛30分钟，上下半场各15分钟；仍打平则进入点球大战。",
  },
};

export function captainGuideMessage(captainId: TournamentCaptainId, guideId: string, fallback: string) {
  if (captainId === "saya") return fallback;
  return captainGuideMessages[captainId][guideId] ?? fallback;
}

const formationCounterCycle = "4-3-3 克 3-5-2，3-5-2 克 4-4-2，4-4-2 克 4-2-3-1，4-2-3-1 克 4-3-3";

export const captainFormationGuidePages: Record<TournamentCaptainId, readonly { title: string; message: string }[]> = {
  saya: [
    { title: "先看有球时怎么站", message: "进攻阵型是我们控球时的站位起点，会影响推进路线和球员职责。切换左侧选项，看看每种阵型的特点，再选最适合大家的一种。" },
    { title: "再看无球时怎么守", message: "防守阵型是丢球后的保护结构。下一步只会显示能由当前进攻阵型自然切换的选项，所以进攻与防守要连在一起考虑。" },
    { title: "最后记住两条对位", message: `克制分两条：我方进攻对对手防守，我方防守对对手进攻。${formationCounterCycle}。克制只是小幅优势，并不代表一定获胜。` },
  ],
  naya: [
    { title: "先决定我们怎么冲", message: "进攻阵型就是我们拿球时怎么站、从哪里往前冲！多切几个左侧选项看看，挑一个最能发挥大家特点的。" },
    { title: "冲上去也要守得住", message: "防守阵型管的是丢球后怎么保护身后。下一步只会出现能从当前进攻阵型自然切换的结构，攻和守要一起想！" },
    { title: "看懂两条克制线", message: `我方进攻要对上对手防守，我方防守要对上对手进攻。${formationCounterCycle}。拿到克制只是多一点优势，不代表必胜，真正的胜负还得靠全队踢出来！` },
  ],
  irena: [
    { title: "先确定有球结构", message: "进攻阵型定义控球阶段的基础站位、推进路线与职责分配。比较左侧选项及其特点，再选择与现有球员最匹配的结构。" },
    { title: "再确定无球结构", message: "防守阵型定义失去球权后的保护方式。候选项已按当前进攻阵型的自然切换关系过滤，需要将两个阶段共同评估。" },
    { title: "确认双轴克制关系", message: `分别判断我方进攻对对手防守、我方防守对对手进攻。${formationCounterCycle}。该关系只提供小幅优势，不构成必胜条件。` },
  ],
};
