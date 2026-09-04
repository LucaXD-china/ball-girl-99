# Web 本地账号与剧情档案

## 决策状态

**账号、会话与剧情档案全部保存在浏览器 `localStorage`，无服务端。**

- 注册、登录、游客、绑定、昵称修改、退出登录均在本机完成；不联网、不跨设备同步。
- 首次访问可一键创建独立游客账号，游客之后可在经理资料页绑定为正式账号。
- 密码只在本机保存加盐的 PBKDF2-SHA256 摘要（浏览器 Web Crypto），不保存明文。
- 每个账号拥有稳定的本机 UUID。剧情档案、赛事存档、序幕进度与导游状态都按该 UUID 隔离。
- 清除浏览器站点数据会同时清除账号与全部本机进度；绑定账号只能在本机登录，不能跨设备恢复。

## 存储模型

| 键 | 内容 |
|---|---|
| `ball-girl:accounts-v1` | 本机账号库：`{ schemaVersion: 1, users: [...] }` |
| `ball-girl:active-account-v1` | 当前活动账号 `uid` |
| `ball-girl:story-archive-v2:<uid>` | 该账号的剧情档案 |
| `ball-girl:tournament-save-v7:<uid>` | 该账号的赛事存档 |
| `ball-girl:opening-journey-v1:<uid>` | 序幕 / Day 1 进度 |
| `ball-girl:tournament-guide-v1:<uid>:<scope>` | 导游/引导已读状态 |

### 用户

| 字段 | 用途 |
|---|---|
| `uid` | 本机生成的稳定 UUID |
| `kind` | `guest` 或 `registered` |
| `account` | 正式账号的账号名或邮箱；游客为空 |
| `normalizedAccount` | 小写标准化值，用于本机唯一性检查 |
| `nickname` | 在序章中确认的玩家称呼，可在经理办公室修改 |
| `passwordSalt` | 每个账号独立的随机盐 |
| `passwordHash` | 本机 PBKDF2-SHA256 派生结果 |
| `createdAt` / `updatedAt` | 创建与资料更新时间 |

### 剧情档案

```json
{
  "schemaVersion": 2,
  "unlockedAt": {
    "PROLOGUE-01": "2026-08-15T00:00:00.000Z"
  },
  "endingVariants": {},
  "updatedAt": "2026-08-15T00:00:00.000Z"
}
```

- 每个 UUID 拥有独立档案；解锁只追加，不提供客户端删除或覆盖接口。
- 结局门禁沿用原服务端规则：`END-03/04/05` 分别只能由纱夜/娜雅/伊蕾娜路线解锁，
  `END-04` 需先解锁 `END-03`，`END-05` 需先解锁 `END-04`。

## 本地接口

账号与剧情档案逻辑分别位于：

- `web/src/storage/localAccountStore.ts`：注册 / 登录 / 游客 / 绑定 / 昵称 / 退出。
- `web/src/storage/storyArchiveStorage.ts`：剧情档案读取与解锁。

## 边界

- 浏览器 `localStorage` 是本机明文可读存储；密码虽不存明文，但摘要仅用于避免明文落盘，
  不能视为抗离线破解的强认证。面向单设备单浏览器使用。
- `crypto.subtle`（Web Crypto）需要安全上下文（HTTPS 或 `localhost`）；GitHub Pages 恒为
  HTTPS，满足要求。普通 HTTP 非本机环境下会退化为「无法创建密码账号」并提示。
- 存储不可用（隐私模式/配额满）时降级为「内存态游客」，不崩溃。
- 若未来需要多副本、找回密码、封禁、邮箱验证或跨设备同步，再迁移到正式身份服务；当前版本
  不伪造这些能力。
