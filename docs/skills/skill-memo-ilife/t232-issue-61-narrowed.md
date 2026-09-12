Part of #1

Supersedes #50（按技能拆分之一；#50 关闭后以本票为准）

**收窄说明（2026-09-12，#232 实测后）**：本票原正文里的「双路 HELP 证据」与「SKILL.md frontmatter／提供方」两个话题，前者已整条线归 `#220` 那张图（备忘录 HELP 交付：#227 内容资产 → #228 渲染接线 → #229 出口与命名落盘 → #230 CLI 级锁 → #233 真机端到端＋肉眼终审）。本票收窄为**除 HELP 交付以外**的样板残差，**不含 HELP 文件交付**，也不作为 `#233` 的前置。

## Question

备忘录（skill-memo-ilife＋dsh-memo-ilife）按卡路里样板（#48@6b0c1e7 ＋ #49 ＋ #56 提供方）补齐最后差距：外圈兜底 ＋ 版本行 ＋ frontmatter ＋ 提供方 ＋ **速查**证据，一票内完成该单技能。

## 进度：10%

下一步：对照 calorie client 补外圈 try/catch 兜底与样式版本行差异；补 SKILL.md frontmatter 与包清单条目；新增打包技能提供方（插件侧 skill-provider.ts，rank 600，cookbook §12），跑门禁后贴**速查**双路证据 ＋ agent 会话确认关票。

## Destination

dsh-memo-ilife 与卡路里全 parity：contract/dsh-ctx/工厂 client 已齐，只收敛残差（fetchRead 外同步抛错兜底、面板样式与版本行、DEFAULT_READ_KEY 空参语义）；桥确认 resolveNodeBin＋20s 超时已在；版本行与双 package.json 一致；SKILL.md frontmatter 齐（skills-cli 可认出 skill-memo-ilife；**实测已由 #232 补上**：首行 `---` ＋ `name` ＋ `description`，`package.json` 的 `files` 亦已带 `SKILL.md`）；提供方达到卡路里 parity（cookbook §12，badge 同形）：inject 加 skills，单份 SKILL.md 按包名解析服务，rank 内联 600，list/get 全通，DSH agent 技能目录可见 skill-memo-ilife（名＋介绍，可按需读全文调 CLI）——**实测已由 #232 落地**（`packages/plugin-memo-ilife/src/skill-provider.ts` ＋ `test/skills-provider.test.mjs` 8 条全绿）。本票只需**复核并留证**，不重做。

## 范围（照抄样板，不重新设计）

- 契约键：memo.search（无参直读，空库安全）；槽位 ilife:memo order 70 标题备忘录；包名 dsh-memo-ilife／skill-memo-ilife。
- 外圈兜底：面板取数失败不静默、样式版本行与双 package.json 一致。
- 提供方：#232 已交付；本票只复核「真机重启后在 agent 技能表里查得到 skill-memo-ilife」。
- **不在本票**：HELP 文件的渲染、命名、落盘、命令（`memo.help.lookup`）与真机端到端 —— 全部归 #220 那张图。
- 分界：skill-memo-ilife 侧保持纯粹普通 skill（零 DSH 代码、零 DSH 依赖）。

## 门

build 0、双方 typecheck 0、loader 回路、smoke（含 Electron 超时语义＋版本行断言）、skills-provider 回路、P10 18/18、boundaries PASS。

## 证据

- OC 隔离装＋真调用；
- DSH 面板落字＋直读同键对数（direct total == 面板 total）；
- **速查证据**：`memo.search`（或同类查询命令）在面板路与 CLI 路上同键同数；
- agent 会话查到 skill-memo-ilife（HITL 一句话）。

## 关票条件

上述实现合入 master ＋ 证据回贴 ＋ agent 会话确认；不合入不关票。
HELP 文件交付**不作为**本票关票条件（已归 #220／#233）。
