import { ArrowRight, Check, RotateCcw, Shield, Swords } from "lucide-react";
import { createRoot } from "react-dom/client";
import { useEffect, useMemo, useState } from "react";
import { SceneStage } from "./components/SceneStage";
import { tournamentManagerOfficeScenes } from "./scenes/sceneDefinitions";
import "./styles.css";
import "./sunny-club.css";
import "./narrative-preview.css";

type ChoiceId = "press" | "control";
type SpeakerId = "narrator" | "manager" | "rain" | "giulia" | "elena";

type StoryLine = {
  id: string;
  speaker: SpeakerId;
  name: string;
  role: string;
  tone: string;
  text: string;
  anchorId: string | null;
};

const openingLines: StoryLine[] = [
  {
    id: "r16-leg2-001",
    speaker: "narrator",
    name: "旁白",
    role: "总比分 1 : 1",
    tone: "战术会议室只剩最后一盏灯",
    text: "首回合，我们用一次边路反击带回了平局。明晚没有客场进球替我们兜底——再平一次，也必须继续踢下去。",
    anchorId: null,
  },
  {
    id: "r16-leg2-002",
    speaker: "rain",
    name: "雷恩",
    role: "中锋 · 六星",
    tone: "身体前倾，指尖压住对手后场热区",
    text: "他们的中卫每次回传都会先看门将。给我十五分钟高压，我能让那一下犹豫变成射门。",
    anchorId: "six_star_fog_harriet_wren",
  },
  {
    id: "r16-leg2-003",
    speaker: "giulia",
    name: "朱莉娅",
    role: "门将 · 六星",
    tone: "抱臂看向战术板背后的空当",
    text: "前锋冲上去很容易。难的是第一道压迫被越过以后，谁来守住我们身后的四十米。",
    anchorId: "six_star_azure_giulia_bellini",
  },
  {
    id: "r16-leg2-004",
    speaker: "elena",
    name: "伊蕾娜",
    role: "后腰 · 赛事基石",
    tone: "把两枚磁扣推到中圈两侧",
    text: "她们说的是同一个问题：我们准备在哪里承担风险。经理，决定开场的节拍吧。",
    anchorId: "founder_center",
  },
];

const branchLines: Record<ChoiceId, StoryLine[]> = {
  press: [
    {
      id: "r16-leg2-press-001",
      speaker: "manager",
      name: "Manager",
      role: "赛前指令",
      tone: "选择：前十五分钟主动高压",
      text: "不等他们站稳。前十五分钟把比赛推到对方禁区前，但第一线被越过时立即收回中路。",
      anchorId: null,
    },
    {
      id: "r16-leg2-press-002",
      speaker: "rain",
      name: "雷恩",
      role: "中锋 · 六星",
      tone: "扬起嘴角，拿走代表第一压迫点的磁扣",
      text: "十五分钟足够了。她们第一次回头找门将时，我会让全场听见她们的犹豫。",
      anchorId: "six_star_fog_harriet_wren",
    },
    {
      id: "r16-leg2-press-003",
      speaker: "elena",
      name: "伊蕾娜",
      role: "后腰 · 赛事基石",
      tone: "在中圈后方划下一道停止线",
      text: "我负责判断什么时候收。不是一直向前冲——是逼出一次错误，然后让球队重新连起来。",
      anchorId: "founder_center",
    },
  ],
  control: [
    {
      id: "r16-leg2-control-001",
      speaker: "manager",
      name: "Manager",
      role: "赛前指令",
      tone: "选择：先稳住中路节拍",
      text: "开场先守住中路连接，不追着对手的回传跑。等她们把阵型压出来，再攻击边后卫身后。",
      anchorId: null,
    },
    {
      id: "r16-leg2-control-002",
      speaker: "giulia",
      name: "朱莉娅",
      role: "门将 · 六星",
      tone: "松开抱着的手臂，指向右侧出球线路",
      text: "那就让她们先着急。我拿到球时不会急着开大脚，第一脚交给能看见下一条线的人。",
      anchorId: "six_star_azure_giulia_bellini",
    },
    {
      id: "r16-leg2-control-003",
      speaker: "elena",
      name: "伊蕾娜",
      role: "后腰 · 赛事基石",
      tone: "把代表两条阵线的磁扣重新连在一起",
      text: "我会把她们引到一侧。等弱侧空出来，下一脚不是为了控球率——是为了真正向前。",
      anchorId: "founder_center",
    },
  ],
};

const choiceMeta = {
  press: {
    icon: Swords,
    label: "前十五分钟主动高压",
    detail: "争取先手 · 承担压迫被越过的风险",
    promise: "逼出后场失误，形成开场射门",
    watch: ["前15分钟高位夺回", "压迫后射门", "中场身后被利用次数"],
  },
  control: {
    icon: Shield,
    label: "先稳住中路节拍",
    detail: "保持连接 · 等待弱侧空间出现",
    promise: "用耐心调动换来一次真正的向前传递",
    watch: ["中路连接成功率", "弱侧推进", "无效控球与有效推进差异"],
  },
} as const;

function NarrativePreview() {
  const [choice, setChoice] = useState<ChoiceId | null>(null);
  const [lineIndex, setLineIndex] = useState(0);
  const lines = useMemo(() => choice ? [...openingLines, ...branchLines[choice]] : openingLines, [choice]);
  const current = lines[lineIndex];
  const choosing = !choice && lineIndex === openingLines.length - 1;
  const finished = Boolean(choice) && lineIndex === lines.length - 1;
  const selectedMeta = choice ? choiceMeta[choice] : null;

  function advance() {
    if (choosing || finished) return;
    setLineIndex((value) => Math.min(value + 1, lines.length - 1));
  }

  function choose(nextChoice: ChoiceId) {
    setChoice(nextChoice);
    setLineIndex(openingLines.length);
  }

  function skipStory() {
    setLineIndex(choice ? lines.length - 1 : openingLines.length - 1);
  }

  function restart() {
    setChoice(null);
    setLineIndex(0);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.key === "Enter" || event.key === " ") && !choosing && !finished) advance();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <main className={`narrative-preview speaker-${current.speaker}`} data-line-id={current.id}>
      <SceneStage scene={tournamentManagerOfficeScenes.round_of_16} activeCharacterAnchorId={current.anchorId}>
        {!choosing && !finished ? <button className="story-skip" type="button" onClick={skipStory}>跳过剧情</button> : null}

        {choosing ? (
          <section className="manager-choice" aria-labelledby="manager-choice-title">
            <small>MANAGER DECISION</small>
            <h1 id="manager-choice-title">我们准备在哪里承担风险？</h1>
            <div>
              {(Object.keys(choiceMeta) as ChoiceId[]).map((choiceId) => {
                const meta = choiceMeta[choiceId];
                const Icon = meta.icon;
                return <button key={choiceId} type="button" onClick={() => choose(choiceId)}><Icon aria-hidden="true" /><span><strong>{meta.label}</strong><small>{meta.detail}</small></span><ArrowRight aria-hidden="true" /></button>;
              })}
            </div>
          </section>
        ) : null}

        {finished && selectedMeta ? (
          <section className="match-promise" aria-labelledby="match-promise-title">
            <small>NEXT MATCH PROMISE</small>
            <h1 id="match-promise-title">下一场要验证什么？</h1>
            <p>{selectedMeta.promise}</p>
            <ul>{selectedMeta.watch.map((item) => <li key={item}><Check aria-hidden="true" />{item}</li>)}</ul>
            <div><button type="button" onClick={restart}><RotateCcw aria-hidden="true" />换一种决定再看</button><span>正式版将在比赛播报与赛后报告中回收这三个观察点。</span></div>
          </section>
        ) : null}

        {!choosing && !finished ? (
          <div className="story-dialogue-stack">
            <span className="story-speaker">{current.name}</span>
            <button className="story-dialogue" type="button" onClick={advance} aria-label={`继续剧情：${current.name}`}>
              <p>{current.text}</p>
            </button>
          </div>
        ) : null}
      </SceneStage>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<NarrativePreview />);
