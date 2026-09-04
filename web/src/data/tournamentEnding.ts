import type { TournamentFixture } from "./tournamentJourney";
import type { TournamentSummaryEntry } from "./tournamentSummary";
import { tournamentCaptainRoutes, type TournamentCaptainId } from "./tournamentCaptain";

export type TournamentEndingId = "END-01" | "END-02" | "END-03" | "END-04" | "END-05";

export type TournamentEndingFrame =
  | "end01-01-departure"
  | "end01-02-rewatch"
  | "end01-03-support"
  | "end01-04-academy"
  | "end02-01-northern-port-club"
  | "end02-02-three-seasons"
  | "end02-03-training-injury"
  | "end02-04-hospital-offer"
  | "end02-05-saya-coach"
  | "end03-01-first-crown"
  | "end03-02-dynasty-road"
  | "end03-03-five-title-celebration"
  | "end03-04-bob-seaside"
  | "end03-05-bob-tv-cheer"
  | "end01-naya-01-departure" | "end01-naya-02-rewatch" | "end01-naya-03-support" | "end01-naya-04-academy"
  | "end01-irena-01-departure" | "end01-irena-02-rewatch" | "end01-irena-03-support" | "end01-irena-04-academy"
  | "end02-naya-01-club" | "end02-naya-02-seasons" | "end02-naya-03-injury" | "end02-naya-04-offer" | "end02-naya-05-coach"
  | "end02-irena-01-club" | "end02-irena-02-seasons" | "end02-irena-03-injury" | "end02-irena-04-offer" | "end02-irena-05-coach"
  | "end04-01-twin-stars" | "end04-02-hometown" | "end04-03-tax" | "end04-04-mini-cooper" | "end04-05-years-later"
  | "end05-01-red-miracle" | "end05-02-only-crown" | "end05-03-departure" | "end05-04-legend" | "end05-05-documentary";

export type EndingBeat = {
  assetId?: string;
  frame: TournamentEndingFrame | "desktop";
  text: string;
};

export const TOURNAMENT_ENDING_ASSET_ID = "scene.tournament-ending.v1";
export const TOURNAMENT_ENDING_V2_ASSET_ID = "scene.tournament-ending.v2";

export const tournamentEndingMeta: Record<TournamentEndingId, { title: string; status: "ready" | "pending" }> = {
  "END-01": { title: "平凡之路", status: "ready" },
  "END-02": { title: "衣钵传承", status: "ready" },
  "END-03": { title: "大庆典", status: "ready" },
  "END-04": { title: "双星长明", status: "ready" },
  "END-05": { title: "传奇诞生", status: "ready" },
};

export const end01Beats: EndingBeat[] = [
  { frame: "end01-01-departure", text: "果然，失败是人生的常态……" },
  { frame: "end01-01-departure", text: "在那次不尽如人意的杯赛之后，我离开了心爱的一线队和队员们。" },
  { frame: "end01-02-rewatch", text: "那段时间，社媒上球迷的负面言论铺天盖地向我涌来。" },
  { frame: "end01-02-rewatch", text: "大家纷纷质疑我的引援策略和赛训准备工作。" },
  { frame: "end01-02-rewatch", text: "整个休赛期，我关在家里，反复观看每一场比赛的录像，希望能找到破解的方法。" },
  { frame: "end01-03-support", text: "还好，是老教练鲍勃和队长纱夜的支持让我重新鼓起勇气走出家门。" },
  { frame: "end01-03-support", text: "但是迫于舆论压力，休赛期后我没有回到一线队，而是来到俱乐部的青训梯队报到。" },
  { frame: "end01-04-academy", text: "年复一年，时间慢慢过去，我最终成为一个平凡的基层青训教练。在远离舆论场的安静角落里，继续做我心爱的足球工作。" },
  { frame: "end01-04-academy", text: "看着场上奔跑的孩子们，我的嘴角再次露出久违的微笑。" },
  { frame: "end01-04-academy", text: "我仿佛又一次回到那个晴朗的下午，足球在空中划出了一道美丽的弧线" },
  { frame: "end01-04-academy", text: "The End." },
];

export function end02Beats(clubName: string): EndingBeat[] {
  return [
    { frame: "end02-01-northern-port-club", text: `就这样，我在${clubName}的首次冠军联赛之旅结束了。` },
    { frame: "end02-01-northern-port-club", text: "我和队员们一起，用成绩回馈了俱乐部管理层和球迷们的期待。" },
    { frame: "end02-01-northern-port-club", text: "作为一支地处偏远北方港口的小球队，我们没有大球队的豪横，没有辉煌的历史，也没有超级球星。" },
    { frame: "end02-01-northern-port-club", text: "但我们有不服输的精神、拼搏的勇气和严谨的赛训纪律。" },
    { frame: "end02-02-three-seasons", text: "往后的三个赛季，我们都能稳定从本地联赛中出线，晋级冠军联赛的淘汰赛。没有豪门敢小觑我们的实力。" },
    { frame: "end02-03-training-injury", text: "就在我们准备好更进一步时，意外发生了。" },
    { frame: "end02-03-training-injury", text: "队长纱夜在一次训练赛中突然倒下。我站在场边，熟悉的恐惧涌上心头——该死！是膝伤！" },
    { frame: "end02-03-training-injury", text: "队友们第一时间围了上去，队医紧急进场，我双手抱头，眼泪夺眶而出。" },
    { frame: "end02-04-hospital-offer", text: "所幸手术很成功，但老队长纱夜已不再适合继续征战高强度的联赛。" },
    { frame: "end02-04-hospital-offer", text: "她苦笑着对我说：“教练，我完了。”" },
    { frame: "end02-04-hospital-offer", text: "我终于下定决心，问出那个问题：“我们球队需要一位技术分析员，你能胜任吗？”" },
    { frame: "end02-05-saya-coach", text: "就这样，纱夜穿上西装，进入了教练组。" },
    { frame: "end02-05-saya-coach", text: "很快我发现，她对于战术的敏锐度，对新技术在足球上的结合运用能力远在我之上。" },
    { frame: "end02-05-saya-coach", text: "看着她自信的更衣室演讲，我感觉队长的精神又一次在她身上复苏。" },
    { frame: "end02-05-saya-coach", text: "我不禁露出微笑，因为我看到一颗新的世界名帅之星正冉冉升起——" },
    { frame: "end02-05-saya-coach", text: "天啊，神奇的足球！" },
    { frame: "end02-05-saya-coach", text: "The End." },
  ];
}

export function end03Beats(managerNickname: string, clubName: string): EndingBeat[] {
  const beat = (frame: TournamentEndingFrame, text: string): EndingBeat => ({ frame, text });
  return [
    beat("end03-01-first-crown", "夺冠的感觉会让人上瘾。"),
    beat("end03-01-first-crown", "何塞穆里尼奥曾说：“第二个冠军比第一个难，第三个比第二个难。”"),
    beat("end03-01-first-crown", "“要赢得冠军，必须是一个团队。”"),
    beat("end03-01-first-crown", `当队长纱夜第一次带领我们捧起冠军联赛奖杯时，没有人会想到${clubName}能连续五年夺冠。包括我们自己。`),
    beat("end03-02-dynasty-road", "但年复一年，我们的目标没有改变，我们是一个整体。"),
    beat("end03-02-dynasty-road", "没人放弃，没人懈怠，只有一个信念——"),
    beat("end03-02-dynasty-road", "Win it all"),
    beat("end03-02-dynasty-road", "这是只有童话世界里才能看到的美丽故事。"),
    beat("end03-02-dynasty-road", "从那天起，冠军联赛成为了我们俱乐部的历史。"),
    beat("end03-02-dynasty-road", "我们也成为了它的历史。"),
    beat("end03-03-five-title-celebration", `“五年后，当${managerNickname}和纱夜坐在座无虚席的${clubName}主场正中央”`),
    beat("end03-03-five-title-celebration", "“捧着五座奖杯跟大家一起欢度庆典时”"),
    beat("end03-04-bob-seaside", "“谁能想到这一切都归功于一个在遥远海边小城度假的光头老人——鲍勃教练”"),
    beat("end03-04-bob-seaside", `“如果不是他当时力排众议，坚决把${managerNickname}带到${clubName}”`),
    beat("end03-04-bob-seaside", `“也就没有现在这恐怖的${clubName}王朝了！”`),
    beat("end03-05-bob-tv-cheer", "“老头累了，放下拐杖，倚坐在一块老瓦石上。”"),
    beat("end03-05-bob-tv-cheer", "“街上人烟稀少，耳边却突然传来了欢呼”"),
    beat("end03-05-bob-tv-cheer", "“原来是居民家电视里纱夜拿着金球奖杯指着经理的最佳教练奖杯打趣道……”"),
    beat("end03-05-bob-tv-cheer", "“你比我还少一个哟！”"),
    beat("end03-05-bob-tv-cheer", "The End."),
  ];
}

const v2Beat = (frame: TournamentEndingFrame, text: string): EndingBeat => ({ assetId: TOURNAMENT_ENDING_V2_ASSET_ID, frame, text });

export function end01BeatsFor(captainId: TournamentCaptainId): EndingBeat[] {
  if (captainId === "saya") return end01Beats;
  const prefix = captainId === "naya" ? "end01-naya" : "end01-irena";
  const captainName = tournamentCaptainRoutes[captainId].name;
  const support = captainId === "naya"
    ? "娜雅把我拉到训练场边，对我说：“一次没赢而已。你要是真的不敢回去，我就每天来这里把你喊出来。”"
    : "伊蕾娜陪我看完最后一场录像，然后平静地说：“失败不是结论，只是已经发生的一组数据。你还可以决定下一步。”";
  return [
    v2Beat(`${prefix}-01-departure` as TournamentEndingFrame, "果然，失败是人生的常态……"),
    v2Beat(`${prefix}-01-departure` as TournamentEndingFrame, "在那次不尽如人意的杯赛之后，我离开了心爱的一线队和队员们。"),
    v2Beat(`${prefix}-02-rewatch` as TournamentEndingFrame, "那段时间，社媒上球迷的负面言论铺天盖地向我涌来。"),
    v2Beat(`${prefix}-02-rewatch` as TournamentEndingFrame, "大家纷纷质疑我的引援策略和赛训准备工作。"),
    v2Beat(`${prefix}-02-rewatch` as TournamentEndingFrame, "整个休赛期，我关在家里，反复观看每一场比赛的录像，希望能找到破解的方法。"),
    v2Beat(`${prefix}-03-support` as TournamentEndingFrame, `还好，是老教练鲍勃和队长${captainName}的支持让我重新鼓起勇气走出家门。`),
    v2Beat(`${prefix}-03-support` as TournamentEndingFrame, support),
    v2Beat(`${prefix}-03-support` as TournamentEndingFrame, "但是迫于舆论压力，休赛期后我没有回到一线队，而是来到俱乐部的青训梯队报到。"),
    v2Beat(`${prefix}-04-academy` as TournamentEndingFrame, "年复一年，时间慢慢过去，我最终成为一个平凡的基层青训教练。在远离舆论场的安静角落里，继续做我心爱的足球工作。"),
    v2Beat(`${prefix}-04-academy` as TournamentEndingFrame, "看着场上奔跑的孩子们，我的嘴角再次露出久违的微笑。"),
    v2Beat(`${prefix}-04-academy` as TournamentEndingFrame, "我仿佛又一次回到那个晴朗的下午，足球在空中划出了一道美丽的弧线"),
    v2Beat(`${prefix}-04-academy` as TournamentEndingFrame, "The End."),
  ];
}

export function end02BeatsFor(captainId: TournamentCaptainId, clubName: string): EndingBeat[] {
  if (captainId === "saya") return end02Beats(clubName);
  const prefix = captainId === "naya" ? "end02-naya" : "end02-irena";
  const captainName = tournamentCaptainRoutes[captainId].name;
  const common = [
    v2Beat(`${prefix}-01-club` as TournamentEndingFrame, `就这样，我在${clubName}的首次冠军联赛之旅结束了。`),
    v2Beat(`${prefix}-01-club` as TournamentEndingFrame, "我和队员们一起，用成绩回馈了俱乐部管理层和球迷们的期待。"),
    v2Beat(`${prefix}-01-club` as TournamentEndingFrame, "作为一支地处偏远北方港口的小球队，我们没有大球队的豪横，没有辉煌的历史，也没有超级球星。"),
    v2Beat(`${prefix}-01-club` as TournamentEndingFrame, "但我们有不服输的精神、拼搏的勇气和严谨的赛训纪律。"),
    v2Beat(`${prefix}-02-seasons` as TournamentEndingFrame, "往后的三个赛季，我们都能稳定从本地联赛中出线，晋级冠军联赛的淘汰赛。没有豪门敢小觑我们的实力。"),
    v2Beat(`${prefix}-03-injury` as TournamentEndingFrame, "就在我们准备好更进一步时，意外发生了。"),
    v2Beat(`${prefix}-03-injury` as TournamentEndingFrame, `队长${captainName}在一次训练赛中突然倒下。我站在场边，熟悉的恐惧涌上心头——该死！是膝伤！`),
    v2Beat(`${prefix}-03-injury` as TournamentEndingFrame, "队友们第一时间围了上去，队医紧急进场，我双手抱头，眼泪夺眶而出。"),
    v2Beat(`${prefix}-04-offer` as TournamentEndingFrame, `所幸手术很成功，但${captainName}已不再适合继续征战高强度的联赛。`),
  ];
  return captainId === "naya" ? [...common,
    v2Beat("end02-naya-04-offer", "她靠在病床上，盯着窗外沉默了很久：“教练，我以后再也跑不过她们了，对吧？”"),
    v2Beat("end02-naya-04-offer", "我终于下定决心，问出那个问题：“青训队需要一位进攻教练。你愿意把那些没人教过你的东西，教给孩子们吗？”"),
    v2Beat("end02-naya-05-coach", "就这样，娜雅穿上训练服，进入了教练组。"),
    v2Beat("end02-naya-05-coach", "她把街头足球带进训练场，教年轻球员抬头、突破、争取球权，也教她们在不公面前大声说话。"),
    v2Beat("end02-naya-05-coach", "很快，俱乐部最沉闷的训练课变成了孩子们最期待的一天。"),
    v2Beat("end02-naya-05-coach", "看着她站在场边挥着手臂大喊，我忽然明白，有些人不必站在球场上，也能让足球重新活起来。"),
    v2Beat("end02-naya-05-coach", "天啊，神奇的足球！"),
    v2Beat("end02-naya-05-coach", "The End."),
  ] : [...common,
    v2Beat("end02-irena-04-offer", "她把检查报告逐页看完，轻声对我说：“我知道这意味着什么。只是……我还没有准备好离开足球。”"),
    v2Beat("end02-irena-04-offer", "我终于下定决心，问出那个问题：“我们球队需要一位技术分析员，你能胜任吗？”"),
    v2Beat("end02-irena-05-coach", "就这样，伊蕾娜穿上西装，进入了教练组。"),
    v2Beat("end02-irena-05-coach", "她把每一次跑位、每一段节奏和每一处空间拆解成所有人都能理解的语言。"),
    v2Beat("end02-irena-05-coach", "很快我发现，她对于战术的敏锐度，对新技术在足球上的结合运用能力远在我之上。"),
    v2Beat("end02-irena-05-coach", "看着她平静地站在战术板前，我感觉一颗新的世界名帅之星正冉冉升起——"),
    v2Beat("end02-irena-05-coach", "天啊，神奇的足球！"),
    v2Beat("end02-irena-05-coach", "The End."),
  ];
}

export function end04Beats(clubName: string): EndingBeat[] {
  const rows: Array<[TournamentEndingFrame, string[]]> = [
    ["end04-01-twin-stars", ["夺冠没有让我们的故事变成童话。", "第二个赛季，我们止步八强。第三个赛季，我们甚至没能进入淘汰赛。", "但纱夜和娜雅都留了下来。", "一个守在球队最后，一个冲在球队最前。", `她们没有带来永远的胜利，却在往后的许多年里，一起撑起了${clubName}。`, `球迷们开始叫她们——${clubName}的双子星。`]],
    ["end04-02-hometown", ["娜雅后来拿到了队里最大的一份合同。", "她还是住在原来的公寓，去同一家小店吃饭，穿着训练基地发的运动服到处跑。", "她把大部分收入寄回家乡，修整那块坑坑洼洼的小球场，也为没有球鞋的孩子准备装备。", "一批孩子长大离开，又有一批孩子跑进球场。娜雅的资助从来没有停过。", "她只说：“我小时候没有人替我准备这些。现在她们可以有。”"]],
    ["end04-03-tax", ["有一次，财务顾问拿着厚厚一叠文件找到她，说可以通过海外公司少交一些税。", "娜雅听了半天，只问：“这是每个人都会用的办法吗？”", "对方解释了很久，最后承认，普通人不会有这样的选择。", "她把文件推了回去：“那就按大家一样的方式交吧。”", "第二天，她照常第一个到达训练场，好像只处理了一件再普通不过的小事。"]],
    ["end04-04-mini-cooper", ["签下大合同以后，娜雅依然开着那辆不起眼的 Mini Cooper。", "后来，她把陪伴自己多年的旧车寄回家乡，又买了一辆新的 Mini Cooper。", "队友第一次看到时愣了很久：“所以，你真的只是换了一辆新的？”", "娜雅理所当然地点了点头：“它很好开呀。”"]],
    ["end04-05-years-later", ["多年以后，纱夜和娜雅先后踢完了自己最后一场比赛。", "没有五座奖杯，也没有永不落幕的王朝。", "只有南看台亮起的两颗星，和看台上一遍又一遍响起的名字。", "她们把最好的年华留在这里，也让一支平凡的球队拥有了值得骄傲的时代。", "足球的历史不会记住每一个冠军之外的人。", `但${clubName}会永远记得它的双子星。`, "The End."]],
  ];
  return rows.flatMap(([frame, texts]) => texts.map((text) => v2Beat(frame, text)));
}

export function end05Beats(clubName: string): EndingBeat[] {
  const rows: Array<[TournamentEndingFrame, string[]]> = [
    ["end05-01-red-miracle", ["足球的历史从不缺少奇迹，谁说蚂蚁不能掀翻大象？", "那个夜晚，我们穿着红色球衣走进决赛球场。", "对面有更昂贵的球员、更辉煌的历史，也有全世界都熟悉的名字。", "而我们只有彼此，和伊蕾娜在战术板上画下的最后一条路线。", "终场哨声响起时，比分没有再改变。", `${clubName}第一次成为冠军联赛冠军。`]],
    ["end05-02-only-crown", ["后来的很多年里，我们再也没有回到那场决赛。", `那座奖杯成为${clubName}队史唯一一次冠军联赛冠军。`, "人们一次次重放决赛录像，试图解释那支球队为什么能够赢到最后。", "有人说是运气，有人说是对手轻敌，也有人说，那是再也无法复制的完美九十九天。", "但我们知道，奇迹不是突然发生的。", "它来自每一次训练、每一次选择，以及十一名球员在同一秒钟作出的同一个决定。"]],
    ["end05-03-departure", ["夺冠后的第二年，伊蕾娜离开了球队。", "我们留不住她，也没有人责怪她。", "她应该去更大的球场，和最好的球员比赛，让更多人看见她所理解的足球。", "告别那天，她把队长袖标整齐地放在更衣室的座位上。", "她抱住我，小声说：“谢谢你把比赛交给我。”", "我回答她：“是你让我们看见了它真正的样子。”"]],
    ["end05-04-legend", ["后来，伊蕾娜赢得了更多冠军，也成为世界足坛最受尊敬的中场之一。", "教练们研究她如何控制空间，年轻球员模仿她接球前观察四周的动作。", "她的名字逐渐和一个时代连在一起。", "每当有人讲起她传奇般的职业生涯，总会从那个穿着红色球衣的夜晚开始。"]],
    ["end05-05-documentary", ["很多年以后，我已经退休了。", `为了录制一部关于伊蕾娜传奇诞生的纪录片，我、娜雅和纱夜再次回到${clubName}。`, "伊蕾娜最后一个走进摄影棚，手里还拿着写满批注的采访提纲。", "娜雅大笑着问她：“只是聊天而已，你为什么还要做准备？”", "伊蕾娜认真地回答：“因为你一定会跑题。”", "纱夜低下头忍着笑，我也终于笑出了声。", "我们四个人谈起那九十九天，谈起训练、争吵、伤病和那场不可能赢下的决赛。", "大家谈笑甚欢，好像又回到了那段一起为冠军联赛努力的日子。", "摄像机的红灯亮起，导演示意我们安静。", "伊蕾娜看向我们，露出了和当年捧起奖杯时一样的笑容。", "传奇，就是这样诞生的。", "The End."]],
  ];
  return rows.flatMap(([frame, texts]) => texts.map((text) => v2Beat(frame, text)));
}

export function tournamentEndingFor(
  outcome: "champion" | "eliminated",
  results: TournamentSummaryEntry[],
  fixtures: TournamentFixture[],
  captainId: TournamentCaptainId = "saya",
): TournamentEndingId {
  if (outcome === "champion") return tournamentCaptainRoutes[captainId].championEndingId;
  const finalResult = results.at(-1);
  const finishStage = fixtures.find(({ id }) => id === finalResult?.fixtureId)?.stage;
  return finishStage === "semi_final" || finishStage === "final" ? "END-02" : "END-01";
}
