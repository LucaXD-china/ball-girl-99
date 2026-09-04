# 资源 Manifest 与资产生命周期 V2

## 当前状态

当前 Web 资源分为四层，不能把“未被页面直接引用”简单等同于“可以删除”：

| 层级 | 路径 | 是否入 Git | 职责 |
|---|---|---:|---|
| 契约真源 | `data/assets/`、`data/cards/` | 是 | 逻辑 ID、variant、来源版本、Hash 与生成依赖 |
| 版本化运行真源 | `web/runtime-assets/` | 是 | 干净 checkout 执行 `prepare:data` 和生产构建所需的压缩资源 |
| 发布派生物 | `web/public/assets/`、`web/dist/assets/` | 否 | 由 `prepare:data` / `build` 重建，不手工维护 |
| 作者工作区 | `assets/` | 否 | 高分辨率母版、分层工程输入、生产中间稿和参考资料 |

截至当前 Manifest：

- `data/assets/manual-assets-v1.json` 登记 163 个非卡面资源；
- `data/assets/asset-manifest-v1.json` 物化 351 个逻辑资源；
- 逻辑资源分类为 124 张球员/对手卡、194 个角色立绘或动作资源、16 组场景、8 组招募动画、
  3 首 BGM 和 6 个音效；
- 玩家运行池 88 人，对手专属核心 30 人，创始球员 3 人。对手卡与创始卡在发布阶段转为
  512px WebP，页面仍通过稳定的 `card.<character_id>` 解析。

数字会随内容增长而变化；以审计命令和 Manifest 自身为准，不再把固定总数写进构建逻辑之外的
验收说明。

## 真源与生成链

```text
data/cards/*.json + data/assets/manual-assets-v1.json
                       │
                       ▼
（作者工作区物化，产物已提交）
                       │
                       ▼
data/assets/asset-manifest-v1.json
                       │
                       ▼
web/scripts/prepare-data.mjs
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
web/src/generated/       web/public/assets/
             │                   │
             └─────────┬─────────┘
                       ▼
                 Vite dev / build
```

`prepare:data` 还会批量处理几类不逐文件登记为 Manifest variant 的构建输入：运行卡 WebP、
`match-chibi-v2` PNG、比赛球场、阵营卡包拆分图、玩家/对手队徽。仓库内容审计为这些目录保留
显式白名单；其他未登记的 `web/runtime-assets/` 文件会失败，防止旧版本长期并存。

## 维护命令

```bash
# 文档链接、Manifest 本地文件和未登记运行资源
node scripts/audit_repository_content.mjs

# 生成 Web 数据与发布目录
cd web
npm run prepare:data

# 本地母版齐全时重建 88 张玩家运行卡
npm run prepare:cards
```

Web 的 `test`、`typecheck`、`build`、杯赛模拟和对手审计都会先运行 `prepare:data`，共享
`web/src/generated/` 与 `web/public/assets/`。这些命令必须串行执行。

## 新增或替换资源

1. 选择稳定逻辑 ID；替换画面时通常只升级 `source_version`，不改页面引用的 `asset_id`。
2. 将 Web 构建必须使用的压缩资源放入 `web/runtime-assets/<category>/<source_version>/`；高分辨率
   母版和分层输入放入被忽略的 `assets/`。
3. 在对应卡面清单或 `manual-assets-v1.json` 登记实际路径、MIME 与加载策略。
4. 运行 Manifest 物化，再执行仓库内容审计与 `npm run prepare:data`。
5. 检查生成 Manifest 中的 `public_path`、MIME、尺寸/时长、字节数和 SHA-256；页面不得直接拼接
   `runtime-assets` 文件名。
6. 资源退休时先确认 Manifest、批量发布脚本、源码、HTML preload、部署验收和测试均已切换，
   再删除旧 `web/runtime-assets` 版本。删除运行资源的发布不能使用只叠加文件的 `--delta`。

## 角色、卡面与场景边界

- `character.*` 是办公室、对话、训练、更衣室和比赛人物视觉的复用真源；不得从扁平卡面反向抠图。
- `card.*` 可由角色层、背景、阵营纹样、前后特效、画框和身份 UI 合成；`source` 是运行预览，
  不是新的角色母版。
- 3–4 星分层卡和 5–6 星迁移记录仍由卡面清单维护；`pending: true` 表示作者母版尚未完成，不能
  伪造尺寸、Hash 或 Alpha 结论。
- 场景使用稳定逻辑 ID 与语义 variant。剧情换图只改资源映射，不改已冻结剧本文字。
- `desktop` / `narrow` 是否存在由具体场景决定；客户端只能请求 Manifest 实际登记的 variant。

## 清理规则

`web/runtime-assets/` 可删除项必须同时满足：

1. 不在统一 Manifest 中；
2. 不属于 `prepare-data.mjs` 的批量输入；
3. 源码、HTML、脚本、测试和部署验收均无引用；
4. 已有正式替代物或确认不再提供该能力；
5. 删除后内容审计、Manifest 检查、测试和生产构建通过。

`assets/` 不适用上述自动删除规则。未引用文件可能是不可重建母版、生成提示的输出、对比稿或
外部来源参考。应先分类为“现行母版 / 可重建中间稿 / 历史候选 / 外部参考”，再由素材所有者决定
归档或删除；仓库整理不直接清空本地作者工作区。

## 发布边界

Google Drive 仅用于作者母版异步备份，不能作为浏览器运行地址。生产发布只包含 `web/dist`；
`web/runtime-assets` 与 `assets` 都不直接暴露。资源切换后，GitHub Pages 验收应检查首页、Manifest
解析后的实际 URL、状态码、MIME、内容 Hash 和真实浏览器首屏。
