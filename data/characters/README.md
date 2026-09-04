# 角色数据

本目录保存《冠军联赛99日》运行所需的公开角色数据。所有角色均为虚构身份，不使用真实
球员原型；公开数据不含 `source_player_id`、`source_database_version`、`prototype_player_name`
或来源 URL 等内部追溯字段。

## 当前文件

- `founder-trio-v1.json`：3 名剧情限定的虚构创始球员（纱夜、娜雅、伊蕾娜），使用
  `narrative_template`，不占用 88 人运行池名额。`prepare:data` 直接读取该文件并生成
  `founder-roster-v1.public.json`。
- `generated/`（上级目录）：已物化的玩家公开角色数据
  - `launch-roster-v1.public.json`：首期卡面基线
  - `expanded-roster-v1.public.json`：88 人比赛运行池（64 + 24 三星扩充）
  - `opponent-roster-v1.public.json`：30 名对手专属核心

## 玩家姓名契约

- `name`：唯一的 2–4 字中文短名，是球员档案、Box、阵容、比赛播报和玩家交流的默认主名称。
- `profile.full_name`：中文全名，只在详细档案中作为次级信息显示；详情标题仍使用 `name`。

公开数据只包含虚构角色身份、阵营、星级、位置、能力和技能，Box、阵容、抽卡结果与比赛播报
不得直接显示中文全名。
