# 数据与模拟边界

## 数据来源

**玩家侧全部使用虚构数据。**

《冠军联赛99日》运行只读取已物化的公开角色数据与统一资源 Manifest，不依赖任何真实球员
数据库、内部原型 CSV 或上游快照。玩家公开数据只包含虚构角色身份、阵营、星级、位置、
能力和技能，不含 `display_name`、`prototype_player_name`、`source_player_id`、原始国籍、
原始俱乐部或来源 URL。

3 名创始球员（纱夜、娜雅、伊蕾娜）是剧情限定的完全虚构角色，使用独立的
`narrative_template`，不占用 88 人运行池名额。

## 玩家公开数据

玩家接口必须移除：

- `display_name`
- `prototype_player_name`
- `source_player_id`
- 原始国籍
- 原始俱乐部
- 仅用于内部追溯的来源 URL

公开数据只包含虚构角色身份、阵营、星级、位置、能力和技能。`name` 是所有非详情
场景及详情页主标题的中文短名；`profile.full_name` 只允许在打开详细档案后作为
次级信息展示。Box、阵容、抽卡结果与比赛播报不得直接显示中文全名。

公开角色数据位于：

- `data/generated/launch-roster-v1.public.json`：首期卡面基线。
- `data/generated/expanded-roster-v1.public.json`：88 人比赛运行池。
- `data/generated/opponent-roster-v1.public.json`：30 名对手专属核心。
- `data/characters/founder-trio-v1.json`：3 名虚构创始球员（`prepare:data` 生成公开版）。

## 比赛模拟

当前《冠军联赛99日》杯赛由浏览器本地的 TypeScript `simulateMatch()` 执行；点击开赛时
一次性生成完整结果并写入本机杯赛存档，随后页面只负责播放已经生成的事件。随机过程使用
赛事 `fixtureSeed`，同一输入和 Seed 必须得到相同结果。

服务端或可信模拟环境、由前端只提交阵容和战术请求，是未来异步天梯或联网模式的架构目标，
不是当前杯赛运行边界。当前版本不提供联网对战，全部比赛与存档都在浏览器本地完成。

当前 Web 的固有天赋、固定特殊技能、杯赛单层阵营羁绊、xG 和文字事件属于同一次模拟过程；
配置技能和阵营风格克制不进入当前杯赛 `simulateMatch()`。完整的一键补完、羁绊参数、13 次
射门、事件播放、评分和加时／点球边界见[文字比赛与技能系统](04-match-and-skills.md)；当前杯赛
实际数值链条、对手强度和批量校准见[杯赛数值子系统 V1](20-tournament-numerical-system.md)。

## 数据与角色授权边界

如果项目进入公开或商业发行，需要单独审查球员姓名、肖像、俱乐部与能力数据的使用范围。
当前设计通过玩家侧虚构身份降低直接暴露，但不能替代正式的授权和合规评估。
