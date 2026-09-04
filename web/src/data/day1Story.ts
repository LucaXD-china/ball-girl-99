import type { PrologueTone } from "./openingScript";

export type Day1StoryFrame =
  | "d1-01-champions-league-stakes"
  | "d1-02-disastrous-seasons"
  | "d1-03-conrad-conflict"
  | "d1-04-tactical-mismatch"
  | "d1-05-naya-irena-departure"
  | "d1-06-supporters-meeting"
  | "d1-07-members-assembly"
  | "d1-08-winter-reinforcements"
  | "d1-09-champions-league-return";

export type Day1StoryBeat = {
  tone: PrologueTone;
  frame: Day1StoryFrame;
  text: string;
};

export const DAY1_STORY_ASSET_ID = "scene.day1.story.v1";

export function day1StoryBeats(nickname: string, captainSelectionUnlocked = false): Day1StoryBeat[] {
  const rosterTransitionFrame: Day1StoryFrame = captainSelectionUnlocked
    ? "d1-02-disastrous-seasons"
    : "d1-05-naya-irena-departure";
  const beats: Day1StoryBeat[] = [
    { tone: "analysis", frame: "d1-01-champions-league-stakes", text: "冠军联赛重要吗？" },
    { tone: "analysis", frame: "d1-01-champions-league-stakes", text: "对我们这样的小俱乐部来说，参加冠军联赛几乎意味着一切。" },
    { tone: "analysis", frame: "d1-01-champions-league-stakes", text: "每年俱乐部收入的1/4来自冠军联赛的分成，走得越远，分成越多。" },
    { tone: "analysis", frame: "d1-01-champions-league-stakes", text: "但是支出是固定的，球员、教练、球队工作人员的工资就占一半以上。" },
    { tone: "analysis", frame: "d1-01-champions-league-stakes", text: "剩下的场馆折旧、比赛差旅、人员交易摊销，根本无法压缩。" },
    { tone: "analysis", frame: "d1-01-champions-league-stakes", text: "也就是说，一旦缺席冠军联赛，球队里就必须有人要离开，没有商量的余地。" },
    { tone: "rain", frame: "d1-02-disastrous-seasons", text: "我刚接手球队的前两个赛季是场灾难。" },
    { tone: "rain", frame: "d1-02-disastrous-seasons", text: "鲍勃的离开和连续的失利让球队上下士气低落，球员也在更新换代之中。" },
    { tone: "rain", frame: "d1-02-disastrous-seasons", text: "纱夜刚刚在后防线站稳脚跟，青训球员娜雅和伊蕾娜也刚升入一队，还需要适应成年赛场的环境。" },
    { tone: "analysis", frame: "d1-03-conrad-conflict", text: "更糟糕的是，死板的体育总监康拉德不相信我是能接下鲍勃摊子的人。" },
    { tone: "analysis", frame: "d1-03-conrad-conflict", text: "我们几乎在每件事情上都发生过争执，这让我们在夏天和冬天的引援上颗粒无收。" },
    { tone: "analysis", frame: "d1-03-conrad-conflict", text: "我虽然名义上是球队经理，但是没有他的点头，我根本没法按我的思路搭建球队，就是个普通的教练。" },
    { tone: "rain", frame: "d1-04-tactical-mismatch", text: "我理解，鲍勃的离开对所有人都有很大压力。但是足球不是一件想当然的事。" },
    { tone: "rain", frame: "d1-04-tactical-mismatch", text: "年轻球员的成长需要时间，你必须允许大家犯错。" },
    { tone: "rain", frame: "d1-04-tactical-mismatch", text: "球队的失误增加，并不意味着我们必须打防反。3-5-2阵型下，娜雅的防守缺陷被无限放大。" },
    { tone: "rain", frame: "d1-04-tactical-mismatch", text: "而伊蕾娜如果没有球权，在中场激烈的对抗里，这个可怜的孩子就像个灰头土脸的玩具……" },
    { tone: "rain", frame: "d1-05-naya-irena-departure", text: "终于，在那个失败的赛季结束后，我们失去了参加冠军联赛的资格。" },
    { tone: "rain", frame: rosterTransitionFrame, text: captainSelectionUnlocked ? "夏窗开启之后，在康拉德的操作下，球队又一次站在了人员变动的边缘。" : "夏窗开启之后，在康拉德的操作下，娜雅离开了球队。" },
    { tone: "rain", frame: rosterTransitionFrame, text: captainSelectionUnlocked ? "娜雅和伊蕾娜的未来，也因此暂时没有定论。" : "两周之后，伊蕾娜也离开了。" },
    { tone: "memory", frame: "d1-06-supporters-meeting", text: "我和纱夜下定决心用我们的方式捍卫球队。我们找到球迷协会的会长老炮，告诉他球队需要改变，我们需要他的支持。" },
    { tone: "memory", frame: "d1-06-supporters-meeting", text: "老炮激动地喊道：“我绝不容许康拉德把球队带向深渊！”" },
    { tone: "memory", frame: "d1-06-supporters-meeting", text: "“明天我就到会员大会上动议，放心吧！我爷爷在南看台买季票的时候，康拉德还在他妈妈的肚子里呢！”" },
    { tone: "memory", frame: "d1-07-members-assembly", text: "就这样，通过俱乐部会员大会的支持，我们重新拿回了球队的管理权。康拉德也同意退居幕后，球队也逐渐回归正轨。" },
    ...(!captainSelectionUnlocked ? [
      { tone: "analysis" as const, frame: "d1-08-winter-reinforcements" as const, text: "到了冬窗，我们买来了潘帕斯银灰的中锋露西亚娜。" },
      { tone: "analysis" as const, frame: "d1-08-winter-reinforcements" as const, text: "加上原本队伍里的卡米耶、斯特林、美绪，重新恢复了球队的竞争力。" },
    ] : []),
    { tone: "memory", frame: "d1-09-champions-league-return", text: "到了赛季结束的时候，我们又一次来到联赛积分榜前四。" },
    { tone: "memory", frame: "d1-09-champions-league-return", text: "冠军联赛，我们回来了。" },
    { tone: "analysis", frame: "d1-09-champions-league-return", text: "冠军联赛重要吗？" },
    { tone: "analysis", frame: "d1-09-champions-league-return", text: "很重要。这一次，尤其重要。新的团队需要靠它证明自己，年轻球员需要靠它恢复信心。" },
    { tone: "analysis", frame: "d1-09-champions-league-return", text: `而这一切的关键，在于你，${nickname}。` },
    { tone: "analysis", frame: "d1-09-champions-league-return", text: "球迷和俱乐部给了你无条件的信任，一个赛季的努力将球队带回了冠军联赛，收获了丰厚的赛事资金。" },
    { tone: "analysis", frame: "d1-09-champions-league-return", text: "那么，请把握好这一次宝贵的补强机会。" },
    { tone: "analysis", frame: "d1-09-champions-league-return", text: "然后，在接下来的99天里，证明自己。" },
  ];
  if (captainSelectionUnlocked) beats.push(
    { tone: "analysis", frame: "d1-09-champions-league-return", text: "不过，这一次，还有一件事需要由你决定。" },
    { tone: "analysis", frame: "d1-09-champions-league-return", text: "冠军联赛需要一位能让所有人相信的队长。" },
    { tone: "analysis", frame: "d1-09-champions-league-return", text: "不同的队长，会把这99天带向完全不同的未来。" },
    { tone: "analysis", frame: "d1-09-champions-league-return", text: "做出选择吧，经理。" },
  );
  return beats;
}
