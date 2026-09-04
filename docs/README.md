# 杯赛版本文档索引

当前仓库只交付《冠军联赛99日》杯赛。常规主线、实时训练、每日经济、常规卡包货币、
社区季前赛和旧 `GameSave` 都不是当前产品能力，也没有可运行入口或兼容存档。

## 当前杯赛规则入口

| 领域 | 唯一入口 |
|---|---|
| 杯赛流程、赛历与验收 | [杯赛数值子系统 V1](20-tournament-numerical-system.md) |
| 训练方向与练度（三方向 + 0/6） | [杯赛数值子系统 V1](20-tournament-numerical-system.md) §训练方向与练度 |
| 球员公开数据、隐私与本地模拟边界 | [数据与模拟边界](07-data-and-simulation.md) |
| 一键补完、比赛推进、评分与淘汰赛结算 | [文字比赛与技能系统](04-match-and-skills.md) |
| 抽卡、成长、比赛概率、对手强度与结局分布 | [杯赛数值子系统 V1](20-tournament-numerical-system.md) |
| 15队阵型强点与对手专属高星扩充 | [对手阵型与专属核心球员扩充方案 V1](21-opponent-formation-and-core-roster-v1.md) |
| 三条队长路线、难度、抽数、阵容和结局映射 | [`tournamentCaptain.ts`](../web/src/data/tournamentCaptain.ts) |
| 资源发布规则 | [资源 Manifest 与本地资产管理](10-asset-management.md) |
| 当前场景框架 | [Web 场景加载框架](11-web-scene-framework.md) |
| 账号、序幕和剧情档案 | [Web 本地账号与剧情档案](12-local-account-and-save-v1.md) |
| 当前 UI 视觉框架 | [晴空俱乐部 UI 框架](18-sunny-club-ui-framework.md) |

规则冲突时，以杯赛数值子系统 V1 的现行规则为准。杯赛源码只复用球员公开数据、
固有天赋、阵型、纯比赛模拟器、Seed、资产解析和通用卡面组件。

## 归档

- 杯赛训练系统 V3（代码调整前）已归档至 [archive/19-current-training-system-logic.md](archive/19-current-training-system-logic.md)，现行训练真源见 `20-tournament-numerical-system.md` §训练方向与练度。

## 维护检查

```bash
node scripts/audit_repository_content.mjs
```

第一条命令检查仓库内 Markdown 本地链接、Manifest 文件存在性，以及未登记且不属于构建批量
输入的 `web/runtime-assets/` 文件。历史文档允许保留旧规则文字，但链接必须可解析，且不得在
索引中伪装成现行入口。

## 历史文档

`00`–`03`、`05`–`06`、`08`–`09`、`13`–`17` 中未被上表列为当前入口的内容，只用于查看
早期正式产品和常规 Web 原型设想。它们不对应可运行代码，不得作为杯赛需求、数值或存档协议。

归档边界见 [常规 Web 原型文档归档](archive/standard-web-prototype-v1.md)。
