import type { TournamentStage } from "./tournamentJourney";

export const STORY_OPPONENT_IDS = ["lumiere_crown", "ivory_capital", "indigo_serpents", "azure_gulf"] as const;
export type StoryOpponentId = typeof STORY_OPPONENT_IDS[number];
export type OpponentStoryId = `OPPONENT-${StoryOpponentId}`;

export type OpponentStory = {
  id: OpponentStoryId;
  opponentId: StoryOpponentId;
  title: string;
  summary: string;
  thumbnailFrame: string;
  beats: Array<{ frame: string; text: string }>;
};

export const OPPONENT_STORY_ASSET_ID = "scene.opponent-stories.v1";

export const opponentStories: Record<StoryOpponentId, OpponentStory> = {
  lumiere_crown: {
    id: "OPPONENT-lumiere_crown", opponentId: "lumiere_crown", title: "流光竞技", summary: "资本与巨星——用钱能买来巨星，但买不来“为什么一起踢球”。", thumbnailFrame: "lumiere-crown",
    beats: [
      { frame: "lumiere-crown", text: "如果把世界 top1、2、3 的前锋放进一个队会怎么样？" },
      { frame: "lumiere-crown", text: "流光竞技曾经做过这个实验。" },
      { frame: "lumiere-crown", text: "二十年前，它还只是一个无人问津的俱乐部。但是，为了提升本地联赛和国家形象，多方一起牵头推动。就在那时，一笔同样亟需通过足球扩大自身影响力的石油资本入股了这支球队。从此以后，它成为世界上最有钱的俱乐部之一。" },
      { frame: "lumiere-crown", text: "从那天起，买下最好的，就是这支球队的目标。" },
      { frame: "lumiere-system-break", text: "现在我们可以回答这个问题：会失败，因为没有防守。" },
      { frame: "lumiere-system-break", text: "这不只是一个简单的球员意愿问题，而是一个系统性问题。当一支球队同时拥有最好的前锋时，考虑到球队的支出，不可能不把他们同时放在场上。" },
      { frame: "lumiere-system-break", text: "但站在球员的角度上，要让三叉戟发挥全部实力：进攻时，就需要中场有人能向前送球；而在防守落位时，又需要向前站位，以保证反击时能够第一时间向前场冲刺。" },
      { frame: "lumiere-system-break", text: "这就导致球队前场阵型被固定成三人，加上送球的进攻型中场。真正参与防守的球员人数过少，无法覆盖球场全部区域……" },
      { frame: "lumiere-rebuild", text: "在这次足以载入足球历史的实验之后，流光竞技彻底放弃了对明星球员的执念。" },
      { frame: "lumiere-rebuild", text: "他们回到了足球最传统的一面，卖掉了三名顶级前锋，又在每个位置上囤积至少两位同样高水平球员。" },
      { frame: "lumiere-rebuild", text: "无论是谁，想上场就凭表现争取。" },
      { frame: "lumiere-rebuild", text: "就这样，褪去了巨星光环的流光竞技终于找到了属于自己的足球。在所有人的质疑中，两夺冠军联赛。" },
      { frame: "lumiere-rebuild", text: "新的豪门终于崛起，但是，没有人能脱离足球逻辑成功。" },
    ],
  },
  ivory_capital: {
    id: "OPPONENT-ivory_capital", opponentId: "ivory_capital", title: "白曜城", summary: "王者基因——他们赢过太多次，所以落后时也相信自己能赢。", thumbnailFrame: "ivory-capital",
    beats: [
      { frame: "ivory-capital", text: "拥有一群世界上最大牌的球星，却连续六个赛季止步冠军联赛十六强是什么感受？" },
      { frame: "ivory-capital", text: "这个问题我无法回答，但白曜城的球迷可以。" },
      { frame: "ivory-capital", text: "对这支球队来说，进攻从来不是问题。更大的问题有两个：一个是联赛中近乎无敌的死敌——即使取得单赛季 96 分的历史最佳战绩，却仍然拿不到该死的联赛冠军；另一个是冠军联赛里那个似乎永远无法翻身的魔咒。" },
      { frame: "ivory-capital", text: "直到他们迎来了那个人——“最特殊的一个”。" },
      { frame: "ivory-capital", text: "他在球队最绝望的时候走进更衣室，告诉大家：“我知道你们很痛苦。”" },
      { frame: "ivory-capital", text: "“也许对你们大多数人来说，这是你们整个职业生涯中最惨痛的失利。”" },
      { frame: "ivory-capital", text: "“他们现在很高兴，看起来好像已经赢得了冠军，但实际上只赢得了一场比赛。”" },
      { frame: "ivory-capital", text: "“这仅仅是个开始，距离最终夺冠还有很长的路要走。”" },
      { frame: "ivory-city-courage", text: "“明天，我给你们放一天的假。但不是要你们呆在家里。”" },
      { frame: "ivory-city-courage", text: "“我要你们和家人朋友一起去城里走走，让人们看到你们能够克服困难。”" },
      { frame: "ivory-city-courage", text: "“或许人们会谈论这场失利，但不要躲在失利背后。”" },
      { frame: "ivory-city-courage", text: "“你们必须拿出勇气，这场失利之后，我们必须为冠军而战。”" },
      { frame: "ivory-capital", text: "“一切的成功都有迹可循。”" },
      { frame: "ivory-army", text: "就这样，他把他们打造成一支真正的军队。" },
      { frame: "ivory-army", text: "100 分的联赛赛季，121 个联赛进球。他们最终跨过了对手，跨过了自己的过去。" },
      { frame: "ivory-army", text: "今天来到了我们面前，xx（玩家名），准备好带领你的球队挑战它了吗？" },
    ],
  },
  indigo_serpents: {
    id: "OPPONENT-indigo_serpents", opponentId: "indigo_serpents", title: "靛蓝竞技", summary: "铁血防守——防守也是艺术，用最少的失球换胜利。", thumbnailFrame: "indigo-serpents",
    beats: [
      { frame: "indigo-veterans", text: "一群还活在旧时代的老人，他们从顶级联赛退出，重新聚集在这里。" },
      { frame: "indigo-veterans", text: "他们坚守纪律，相信团队。" },
      { frame: "indigo-veterans", text: "虽然不再拥有曾经的速度，不再能打出华丽的进攻，但他们决心用最稳固的防守捍卫属于自己的荣誉。" },
      { frame: "indigo-serpents", text: "你或许可以从他们身上跨过去，但绝不能掉以轻心，被极致压缩的防线蒙蔽。" },
      { frame: "indigo-serpents", text: "因为一旦露出破绽，狡猾的老家伙们会用最快的速度把球推出去。" },
      { frame: "indigo-serpents", text: "如果你在比赛中某一刻误以为他们已经倒下，那么你的球队也距离出局不远了。" },
      { frame: "indigo-monologue", text: "足球，是一项复杂的运动。" },
      { frame: "indigo-monologue", text: "它掺杂了太多商业噱头，俱乐部的人情世故，资本市场的利益冲突。" },
      { frame: "indigo-monologue", text: "每一天都有新的交易，每一天都有人离开。" },
      { frame: "indigo-monologue", text: "身处其中，我们必须学会接受它，坦然面对。" },
      { frame: "indigo-monologue", text: "作为成功的经理，你必须学会利用它，深入研究每一次交易，学会把握人性。" },
      { frame: "indigo-monologue", text: "学会和俱乐部高层打交道，学会和媒体打交道，学会和球员打交道。" },
      { frame: "indigo-monologue", text: "然后你成功了，收获金钱和荣誉，你是最好的经理。" },
      { frame: "indigo-monologue", text: "但是——" },
      { frame: "indigo-monologue", text: "如果你真的相信我说的，哈哈，那你就是最大的笨蛋！" },
      { frame: "indigo-monologue", text: "足球是纯粹的运动，是一场无情的战争。" },
      { frame: "indigo-monologue", text: "归根到底，它只由你和你的队员构成。比赛的结果就躺在你们的每一次行动中，没有秘密。" },
      { frame: "indigo-monologue", text: "所以，尽管去追求你们在乎的那些吧——金钱、名誉、无聊的记者、感性的球迷。" },
      { frame: "indigo-monologue", text: "那些追求对我们来说都太老、太遥远，我们只带走胜利。" },
    ],
  },
  azure_gulf: {
    id: "OPPONENT-azure_gulf", opponentId: "azure_gulf", title: "蔚蓝竞技", summary: "城市与足球——一座城市如何与足球融为一体。", thumbnailFrame: "azure-gulf",
    beats: [
      { frame: "azure-equality", text: "如果你觉得足球只是一场比赛，只是 11vs11，最多加上教练组之间的较量，那你就错了。" },
      { frame: "azure-equality", text: "足球意味着很多，因为它是联系人情感的纽带。" },
      { frame: "azure-equality", text: "这是一个很俗套的说法，但同时它也是事实。" },
      { frame: "azure-equality", text: "无论你是否承认，在这个世界上有人高贵，有人低贱。是足球让他们能够平等对话。在足球的场地上，人人平等。" },
      { frame: "azure-equality", text: "我爱足球，因为它从不拒绝任何人，无论高矮胖瘦、无论出身。" },
      { frame: "azure-arrival", text: "当我第一次来到这座天蓝色的南方城市，这里的人用他们的热情迎接我。" },
      { frame: "azure-arrival", text: "我知道他们渴望什么，他们渴望冠军，他们渴望平等。" },
      { frame: "azure-arrival", text: "他们渴望在这个世界上有一片场地，能让他们光明正大地击败那些高高在上的人，以此来证明自己的存在和价值。" },
      { frame: "azure-gulf", text: "当那一天真的到来时，人们会走上街头，一起庆祝属于这座城市的胜利。" },
      { frame: "azure-gulf", text: "他们会为我欢呼，拥抱我，然后把我高高举起，抛向天空。" },
      { frame: "azure-gulf", text: "他们会为我立起雕像，传诵我的故事，将我的画像带回家，挂在墙上，摆在床头。" },
      { frame: "azure-gulf", text: "在那一天来临之前，我们会一起努力，一起祈祷：" },
      { frame: "azure-gulf", text: "上帝，如果你已经把所有给了他们，请至少把足球留给我们。" },
    ],
  },
};

export function opponentStoryText(text: string, nickname: string) {
  return text.replace("xx（玩家名）", nickname);
}

export function opponentStoryFor(opponentId: string) {
  return opponentId in opponentStories ? opponentStories[opponentId as StoryOpponentId] : undefined;
}

export function isStoryStage(stage: TournamentStage) {
  return stage === "semi_final" || stage === "final";
}
