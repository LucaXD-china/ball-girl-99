# 球员更衣室（当前杯赛实现）

## 当前状态

更衣室是《冠军联赛99日》的已实现入口，读取当前 schema v7 杯赛存档
（`ball-girl:tournament-save-v7:${uid}`）。TypeScript 中的历史类型名 `TournamentSaveV6` 尚未随
schema 改名，文档和存储判断均以 `TOURNAMENT_SAVE_SCHEMA_VERSION = 7` 为准。

- 补强阶段展示当前路线初始阵容与已抽到的球员；18 人名单锁定后只展示注册球员。
- 同一角色只有一个可上场实体；重复卡增加持有份数并自动转为 0–5 阶突破进度。
- 杯赛成长以进攻、组织、防守三方向练度为准，每人总计最多 6 次；当前运行时没有长期等级、
  经验条、实时训练槽或每日培养经济。
- 固有天赋和固定携带技能在详情中展示，但当前不进入比赛数值；旧技能配置字段只用于兼容/开发
  数据，不是杯赛玩家操作入口。
- 列表支持姓名、位置、阵营、星级筛选和排序；已分配到首发槽的球员会显示明确位置状态。
- 详情页使用当前角色视觉解析链：六星优先召唤静帧/立绘，其他球员使用卡面或更衣室立绘，
  资源缺失时保留显式文字回退。

## 数据真源

| 数据 | 真源 |
|---|---|
| 玩家池 88 人 | `data/generated/expanded-roster-v1.public.json` |
| 3 名创始球员 | `data/characters/founder-trio-v1.json` → `founder-roster-v1.public.json` |
| 当前收藏、突破、训练与注册名单 | `web/src/storage/tournamentSaveStorage.ts` |
| 杯赛成长计算 | `web/src/data/tournamentSquad.ts` |
| 页面筛选与详情 | `web/src/pages/LockerRoomPage.tsx` |
| 卡面/立绘解析 | `web/src/services/assetResolver.ts` |

浏览器公开数据不得包含内部原型姓名、现实球员/俱乐部、来源数据库、来源 URL 或固定身价研究
字段。`prepare:data` 和生产边界检查会拒绝这些标记进入 Web 产物。

## 当前交互边界

```text
球员更衣室
  ├── 搜索与筛选
  ├── 当前可用球员卡墙
  └── 球员详情
      ├── 卡面或角色视觉
      ├── 星级 / 突破 / 练度
      ├── 主副位置与六维
      └── 固有天赋 / 固定技能展示
```

注册名单只能在注册流程中锁定，不能从更衣室绕过赛事规则修改。首发阵容在赛前阵容页配置；
更衣室只展示已分配位置，不承担阵型编辑。

旧的常规培养、技能槽和长期主线设计统一归类为历史材料，边界见
[常规 Web 原型文档归档](archive/standard-web-prototype-v1.md)。当前训练数值见
[杯赛数值子系统 V2](20-tournament-numerical-system.md)，资源规则见
[资源 Manifest 与资产生命周期 V2](10-asset-management.md)。
