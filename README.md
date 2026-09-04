# 激射！绿茵少女！（Ball Girl）

《激射！绿茵少女！》是一款以女子足球、球员收集、阵容构筑和足球经理体验为核心的 Web
游戏。本仓库发布的是赛事特别篇《冠军联赛99日》（英文名 `Ball Girl: 99 Days to Glory`）。

线上试玩：https://LucaXD-china.github.io/ball-girl-99/
（GitHub Pages 静态托管，全程在浏览器本地运行，无后端服务器）

## 当前可玩内容

- 序幕、Day 1 剧情、队长路线选择、补强抽卡、18 人注册、训练/球探、四阶段七场淘汰赛、
  赛后报告、剧情档案和五种结局已形成完整闭环。
- 纱夜、娜雅、伊蕾娜三条队长路线按结局逐步解锁，分别对应普通、困难和极难；路线拥有不同
  抽数、星级上限、初始阵容、对手强度与冠军结局。
- 玩家池包含八阵营 88 名球员，另有 3 名创始球员和 30 名对手专属核心；对手专属核心不进入
  玩家招募池。
- 比赛使用可复现 Seed、双轴阵型克制、位置适配、训练成长、两回合、加时和点球结算；固有
  天赋与固定技能当前只做展示，不影响赛果。
- 账号（游客/注册/登录/绑定/昵称）与剧情档案全部保存在浏览器 `localStorage`，按本机账号
  隔离；不联网、不跨设备同步。
- Web 运行资源由统一 Manifest 管理，页面通过逻辑 `asset_id` 解析资源。

当前规则入口见 [杯赛版本文档索引](docs/README.md)；剧情原文、数值与资源规则发生冲突时，
以该索引列出的现行文档和代码真源为准。

## 本地运行

要求 Node.js 22 与 npm。Web 的 `dev`、`test`、`typecheck`、`build` 与杯赛模拟命令都会
先执行 `prepare:data`；这些命令共享生成目录，应串行运行。

```bash
cd web
npm install
npm run dev
```

常用验证：

```bash
# 仓库文档链接、Manifest 和运行资源边界
node scripts/audit_repository_content.mjs

# Web：按顺序执行，避免 prepare:data 并发覆盖共享产物
cd web
npm test
npm run typecheck
npm run build

# 杯赛批量模拟与对手阵容审计
npm run simulate:cup -- --runs 100 --details 3
npm run audit:opponents -- --runs 1000
```

## 部署

本仓库通过 GitHub Actions 构建并发布到 GitHub Pages（见
`.github/workflows/deploy-pages.yml`）。构建时设置 `VITE_BASE_PATH=/ball-girl-99/`，使所有
静态资源指向 `/ball-girl-99/` 子路径。首次启用需在仓库 `Settings → Pages` 中将
`Source` 选为 `GitHub Actions`。

## 仓库结构

| 路径 | 当前职责 |
|---|---|
| `web/src/` | React / TypeScript 杯赛运行时 |
| `web/runtime-assets/` | 干净 checkout 构建所需、已版本化的运行资源真源 |
| `web/public/assets/` | `prepare:data` 生成的开发/构建发布物，不直接维护 |
| `data/` | 角色、招募、对手与统一资源 Manifest 契约 |
| `docs/` | 现行杯赛规则入口与历史设计 |
| `scripts/` | 资源校验、模拟与内容审计工具 |

## 文档与资源维护原则

- 当前杯赛规则只从 [docs/README.md](docs/README.md) 的“当前杯赛规则入口”进入；历史文档
  不得覆盖现行代码、数值或存档协议。
- `data/assets/manual-assets-v1.json` 是非卡面资源登记真源，
  `data/assets/asset-manifest-v1.json` 是物化后的统一 Manifest。
- `web/runtime-assets/` 不是临时缓存；只有在 Manifest、发布脚本、源码和测试均不再引用且已有
  正式替代物时才能删除。`web/public/assets/` 始终由脚本重建。
- 已冻结的序幕、Day 1 和结局剧本文字不得因文档整理而改写；展示分页、动画与资源映射单独维护。

## 产品边界

当前只面向 Web 浏览器。移动端安装包、APK、桌面封装、常规 `GameSave`、实时训练槽、每日
经济和长期 Manager 主线均不属于当前交付范围。账号与存档只保存在浏览器本地，不提供
跨设备同步、找回密码或联网对战。
