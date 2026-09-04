import { describe, expect, it } from "vitest";
import {
  CLUB_NAME_PROMPT_BEAT,
  NICKNAME_PROMPT_BEAT,
  NICKNAME_PROMPT_FRAME,
  prologueBeats,
} from "./openingScript";

describe("formal opening script", () => {
  it("keeps the confirmed nickname and club-name insertion points", () => {
    const beats = prologueBeats("小鹿", "晴空竞技");
    expect(beats[NICKNAME_PROMPT_BEAT].text).toBe("我回忆起当我还是个孩子，和小伙伴们在社区公园的草坪上踢球。我的朋友萨卡一边冲刺，一边向我喊道——");
    expect(beats[NICKNAME_PROMPT_BEAT + 1].text).toBe("“小鹿，传球！”我大脚把球开过去，足球在空中划出一道美丽的弧线。他漂亮地卸下球，起脚打门——");
    expect(beats[CLUB_NAME_PROMPT_BEAT].text).toBe("谢谢你，——");
    expect(beats[CLUB_NAME_PROMPT_BEAT + 1].text).toBe("谢谢你，晴空竞技。");
  });

  it("keeps the frozen formal script verbatim", () => {
    expect(prologueBeats("小鹿", "晴空竞技").map((beat) => beat.text)).toEqual([
      "“为什么喜欢足球？”",
      "在我即将结束足球经理生涯时，无数往事涌上心头。",
      "我回忆起当我还是个孩子，和小伙伴们在社区公园的草坪上踢球。我的朋友萨卡一边冲刺，一边向我喊道——",
      "“小鹿，传球！”我大脚把球开过去，足球在空中划出一道美丽的弧线。他漂亮地卸下球，起脚打门——",
      "球进了！“我们赢啦！”孩子们都欢呼起来，跑向萨卡，我是第一个。",
      "以后很多日子，当我回想起那个下午都忍不住微笑。那时天空很晴朗，仿佛所有的烦恼都烟消云散。",
      "关于我的球员生涯......其实并不顺利。",
      "我从第五级别联赛开始踢球，司职后腰，就是，在球场中部靠后区域活动的人。",
      "因为我一直明白，我的天赋有限。我不能像前锋那样，冲击对手的防线，让人畏惧退缩，不能进很多球，成为球场焦点。",
      "也没有能力在后卫线两侧，作为边后卫，去跟上对方箭头球员脚下的速度。",
      "我更没有能力挡在球门前，做最后一道屏障，无论是门将还是中后卫，因为那里是属于“长人”的禁区。",
      "我只能玩命地奔跑，尽可能活跃在球场的每个区域，去每个需要我的地方。作为一个防守型中场（俗称6号位球员），球员时期我听到最多的一句话就是教练的督促——",
      "“跑起来！”",
      "但是，一切戛然而止。我的球员生涯从一次膝伤结束。",
      "我静静地躺在那里，看着天空。",
      "雨水、汗水、泪水混杂在一起——",
      "我不需要再跑了。",
      "但是，命运总在不经意间眷顾，上帝不会放弃任何一个人，只要自己不放弃。",
      "当我还在医院病床上时，老教练鲍勃给我打来了电话——",
      "“我们需要一位技术分析员，你有兴趣吗？”",
      "就这样，我来到了这支球队，进入教练团队开始新的生涯。",
      "我很感激这段经历，因为我知道他们的选择有很多，不一定必须是我。我很珍惜这一切。",
      "我不想辜负这位善良的光头，所以，我必须全力以赴。",
      "在接下来的十年里，我们一起在录像室度过了无数小时，一起观察、讨论每一支球队和每一个球员。",
      "终于，在光头鲍勃退休的那天，我接过了球队主教练兼球队经理的职位。",
      "谢谢你，鲍勃。感谢你为我做的一切。",
      "谢谢你，——",
      "谢谢你，晴空竞技。",
    ]);
  });

  it("maps every approved scene frame into the formal flow", () => {
    const beats = prologueBeats("小鹿", "晴空竞技");
    expect(new Set([...beats.map((beat) => beat.frame), NICKNAME_PROMPT_FRAME]).size).toBe(25);
    expect(beats[NICKNAME_PROMPT_BEAT].frame).toBe("p1-02-community-park");
    expect(NICKNAME_PROMPT_FRAME).toBe("p1-03-child-saka-calls");
    expect(beats.at(-1)?.frame).toBe("p3-09-main-office-transition");
  });
});
