export type PrologueTone = "memory" | "rain" | "hospital" | "analysis";

export type PrologueFrame =
  | "p1-01-twilight-manager-office"
  | "p1-02-community-park"
  | "p1-03-child-saka-calls"
  | "p1-04-ball-arc"
  | "p1-05-goal-celebration"
  | "p1-06-empty-park-afterglow"
  | "p2-01-fifth-division-ground"
  | "p2-02-defensive-midfield"
  | "p2-03-forward-attack"
  | "p2-04-fullback-chase"
  | "p2-05-goalmouth-aerial"
  | "p2-06-running-everywhere"
  | "p2-07-coach-run-command"
  | "p2-08-knee-injury"
  | "p2-09-rain-injury-pov"
  | "p3-01-hospital-after-rain"
  | "p3-02-bedside-phone"
  | "p3-03-bob-phone-call"
  | "p3-04-analysis-room-bob"
  | "p3-05a-analysis-room-midyears"
  | "p3-05b-analysis-room-ten-years"
  | "p3-06-bob-handover"
  | "p3-07-empty-office-after-bob"
  | "p3-08-club-name-office"
  | "p3-09-main-office-transition";

export type PrologueBeat = {
  chapter: 1 | 2 | 3;
  tone: PrologueTone;
  frame: PrologueFrame;
  text: string;
};

export const PROLOGUE_ASSET_ID = "scene.prologue.v1";
export const NICKNAME_PROMPT_BEAT = 2;
export const NICKNAME_PROMPT_FRAME: PrologueFrame = "p1-03-child-saka-calls";
export const CLUB_NAME_PROMPT_BEAT = 26;

export function prologueBeats(nickname: string, clubName: string): PrologueBeat[] {
  return [
    { chapter: 1, tone: "memory", frame: "p1-01-twilight-manager-office", text: "“为什么喜欢足球？”" },
    { chapter: 1, tone: "memory", frame: "p1-01-twilight-manager-office", text: "在我即将结束足球经理生涯时，无数往事涌上心头。" },
    { chapter: 1, tone: "memory", frame: "p1-02-community-park", text: "我回忆起当我还是个孩子，和小伙伴们在社区公园的草坪上踢球。我的朋友萨卡一边冲刺，一边向我喊道——" },
    { chapter: 1, tone: "memory", frame: "p1-04-ball-arc", text: `“${nickname}，传球！”我大脚把球开过去，足球在空中划出一道美丽的弧线。他漂亮地卸下球，起脚打门——` },
    { chapter: 1, tone: "memory", frame: "p1-05-goal-celebration", text: "球进了！“我们赢啦！”孩子们都欢呼起来，跑向萨卡，我是第一个。" },
    { chapter: 1, tone: "memory", frame: "p1-06-empty-park-afterglow", text: "以后很多日子，当我回想起那个下午都忍不住微笑。那时天空很晴朗，仿佛所有的烦恼都烟消云散。" },
    { chapter: 2, tone: "rain", frame: "p2-01-fifth-division-ground", text: "关于我的球员生涯......其实并不顺利。" },
    { chapter: 2, tone: "rain", frame: "p2-02-defensive-midfield", text: "我从第五级别联赛开始踢球，司职后腰，就是，在球场中部靠后区域活动的人。" },
    { chapter: 2, tone: "rain", frame: "p2-03-forward-attack", text: "因为我一直明白，我的天赋有限。我不能像前锋那样，冲击对手的防线，让人畏惧退缩，不能进很多球，成为球场焦点。" },
    { chapter: 2, tone: "rain", frame: "p2-04-fullback-chase", text: "也没有能力在后卫线两侧，作为边后卫，去跟上对方箭头球员脚下的速度。" },
    { chapter: 2, tone: "rain", frame: "p2-05-goalmouth-aerial", text: "我更没有能力挡在球门前，做最后一道屏障，无论是门将还是中后卫，因为那里是属于“长人”的禁区。" },
    { chapter: 2, tone: "rain", frame: "p2-06-running-everywhere", text: "我只能玩命地奔跑，尽可能活跃在球场的每个区域，去每个需要我的地方。作为一个防守型中场（俗称6号位球员），球员时期我听到最多的一句话就是教练的督促——" },
    { chapter: 2, tone: "rain", frame: "p2-07-coach-run-command", text: "“跑起来！”" },
    { chapter: 2, tone: "rain", frame: "p2-08-knee-injury", text: "但是，一切戛然而止。我的球员生涯从一次膝伤结束。" },
    { chapter: 2, tone: "rain", frame: "p2-09-rain-injury-pov", text: "我静静地躺在那里，看着天空。" },
    { chapter: 2, tone: "rain", frame: "p2-09-rain-injury-pov", text: "雨水、汗水、泪水混杂在一起——" },
    { chapter: 2, tone: "rain", frame: "p2-09-rain-injury-pov", text: "我不需要再跑了。" },
    { chapter: 3, tone: "hospital", frame: "p3-01-hospital-after-rain", text: "但是，命运总在不经意间眷顾，上帝不会放弃任何一个人，只要自己不放弃。" },
    { chapter: 3, tone: "hospital", frame: "p3-02-bedside-phone", text: "当我还在医院病床上时，老教练鲍勃给我打来了电话——" },
    { chapter: 3, tone: "hospital", frame: "p3-03-bob-phone-call", text: "“我们需要一位技术分析员，你有兴趣吗？”" },
    { chapter: 3, tone: "analysis", frame: "p3-04-analysis-room-bob", text: "就这样，我来到了这支球队，进入教练团队开始新的生涯。" },
    { chapter: 3, tone: "analysis", frame: "p3-04-analysis-room-bob", text: "我很感激这段经历，因为我知道他们的选择有很多，不一定必须是我。我很珍惜这一切。" },
    { chapter: 3, tone: "analysis", frame: "p3-05a-analysis-room-midyears", text: "我不想辜负这位善良的光头，所以，我必须全力以赴。" },
    { chapter: 3, tone: "analysis", frame: "p3-05b-analysis-room-ten-years", text: "在接下来的十年里，我们一起在录像室度过了无数小时，一起观察、讨论每一支球队和每一个球员。" },
    { chapter: 3, tone: "analysis", frame: "p3-06-bob-handover", text: "终于，在光头鲍勃退休的那天，我接过了球队主教练兼球队经理的职位。" },
    { chapter: 3, tone: "analysis", frame: "p3-07-empty-office-after-bob", text: "谢谢你，鲍勃。感谢你为我做的一切。" },
    { chapter: 3, tone: "analysis", frame: "p3-08-club-name-office", text: "谢谢你，——" },
    { chapter: 3, tone: "analysis", frame: "p3-09-main-office-transition", text: `谢谢你，${clubName}。` },
  ];
}
