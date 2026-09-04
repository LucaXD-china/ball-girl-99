# 玩家公开数据与资源契约

本目录保存《冠军联赛99日》运行时所需的公开数据与资源契约。玩家侧数据只包含虚构角色
身份、阵营、星级、位置、能力和技能，不含任何真实球员身份、国籍、俱乐部、来源 URL 或
上游快照追溯字段。

## 目录职责

| 路径 | 职责 |
|---|---|
| `characters/` | 角色数据：3 名虚构创始球员与公开运行角色说明 |
| `generated/*.public.json` | 已物化的玩家公开角色数据（构建 `prepare:data` 的直接输入） |
| `cards/` | 卡面组合契约与卡面生成提示（虚构角色） |
| `assets/` | 统一资源 Manifest 契约（`asset-manifest-v1.json`、`manual-assets-v1.json`） |
| `contracts/` | 文字比赛 Seed 契约 |
| `recruitment/` | 杯赛招募契约 |

## 构建输入

Web 的 `prepare:data` 只读取以下公开文件，不依赖任何内部原型数据：

- `data/generated/expanded-roster-v1.public.json`
- `data/generated/opponent-roster-v1.public.json`
- `data/assets/asset-manifest-v1.json`
- `data/contracts/text-match-seed-contract-v1.json`
- `data/recruitment/tournament-recruitment-v1.json`
- `data/characters/founder-trio-v1.json`
- `web/runtime-assets/`（版本化运行资源真源）

角色公开数据见 [`characters/README.md`](characters/README.md)；64 张首发卡、24 张三星扩充卡
及其资产边界见 [`cards/README.md`](cards/README.md)；客户端统一资源入口为
[`assets/asset-manifest-v1.json`](assets/asset-manifest-v1.json)，手工登记的未来音频与
非卡面资源进入 [`assets/manual-assets-v1.json`](assets/manual-assets-v1.json)。

## 授权与合规

公开数据仅包含虚构球员、俱乐部与赛事标识，不使用真实俱乐部徽章、UEFA 标志或其他受
保护资产；「冠军联赛」是架空赛事类型。若项目进入商业发行，仍需单独完成授权与合规评估。
