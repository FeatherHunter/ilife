# 规格：卡路里·双用制"双过"验收标准

- 票：[卡路里·双用制双过判定口径落成规格（验收标准冻结）](https://github.com/FeatherHunter/ilife/issues/117)，属地图 [卡路里·打通图（2/3）装上即用·双路实证](https://github.com/FeatherHunter/ilife/issues/64)。
- 拍定：2026-09-08 与維護者 grill（本轮结论见 #117 的 resolution comment）。
- 上游依据：纲领 [每个技能一对包 × 双用制 × 每技能三图](https://github.com/FeatherHunter/ilife/issues/62)、架构规格 `docs/calorie-architecture.md`、双路证据 `docs/research/t69-dual-path-evidence.md`。
- 适用：卡路里样板；#57–#61 复制线可直接照抄（见 §8）。

## 0 这份文档解决什么

"装上即用"是一句口号。口号不可判定，就会出现"链路全绿而用户装上不能用"——历史上确实出现过（安装包里没有说明书、面板只有空库同文的"有字"）。

本文把口号落成**可判定的判据 + 取证形态 + 判定三分**，供取证票（#115 / #116）与复制线引用。本文只冻结"怎么算过"，不重复架构细节（那是 `docs/calorie-architecture.md` 的事）。

## 1 术语

| 术语 | 含义 |
| --- | --- |
| 双用制 | 一个技能同时以"纯技能"与"DSH 插件"两种形态可用（纲领 #62）。 |
| 双过 | 两条腿**都**取得达标证据才算成；任一缺失按**阻断**记。 |
| 点亮 | 面板界面上出现内容。**"有字但字是报错"不算点亮**（§2.3）。 |
| 严口径真调用 | 第三方平台会话里，**AI 自己**读 SKILL.md、自己执行 CLI 并交付产物；"人手动跑命令"只作旁证。 |
| 空库同文 | 两路都报同一个错误、文本一致——只能证明"错误同文"，**不能**当数值一致的证据。 |
| HITL-0 | 用维护者当天**真实记录**的数据取证（不造假、不改系统时钟、不用副本顶替）。 |

## 2 腿 1 · DSH 路

### 2.1 单命令装双包

- **判据**：装 `dsh-calorie` 一条命令，`skill-calorie` 随之落盘（`dependencies` 依赖链，非 peer）。
- **取证**：安装日志 + 落盘版本号（`node -e "require('dsh-calorie/package.json').version"` 之类）。
- **现状**：已成立（#46）。

### 2.2 技能目录可查

- **判据**：DSH 任一 agent 会话的技能目录里出现 `skill-calorie`（名 + 介绍），可按需读全文并调用 CLI。
- **取证**：真机 agent 会话的一句话确认（HITL）+ 回路测试 `packages/plugin-calorie/test/skills-provider.test.mjs`。
- **现状**：代码已提交（`d5d3864`），**待发版**（`skill-calorie 0.1.2` + `dsh-calorie 0.1.7`）与真机确认（票 #56）。

### 2.3 面板数 = 直读（**点亮与"数一致"合并为一条腿**）

- **为什么合并**：错误路径同样会产出"有字"，所以"有字"作为独立判据几乎没有信息量。点亮必须由"显示的数正确"来承载。
- **前置（真机环境，2026-09-09 补）**：`dsh-life-pack`（提供"爱生活"卡与页签条）与 **better-sidebar**（提供边栏槽）已安装——技能设置页挂在爱生活卡下、技能功能页挂在边栏槽里，**缺一则对应截图根本无从取得**。装插件命令为 `dsh-calorie` + `dsh-life-pack`（`skill-calorie` 由依赖链带出）。
- **判据（四同）**：
  - 同键 `calorie.view.home`（`packages/plugin-calorie/src/contract.ts` 的 `DEFAULT_READ_KEY`）；
  - 同参 `{"date":"<今天>"}`（面板写死 `todayString()`，所以**取证日 = 被比较日 = 当天**）；
  - 同 DB（面板进程与直读进程的 `SKILLS_DB_PATH` 指向同一目录）；
  - 同刻（同一分钟内取两侧读数）。
- **比什么**：判等对象 = `panel.data` vs `direct.data`——先比顶层键集合，再比 `metrics` 内**每个字段**；另核 `key=calorie.view.home`、`shape=stat`、`skill=calorie`（防"读错键但数碰巧相同"）。
- **过**：逐字段全等，且 `entryCount > 0`（或至少 `loggedDays > 0`），且直读 `exit=0`。
- **取证**：面板两处截图（设置 → 爱生活 → 卡路里页签；边栏 → 卡路里页签），截图须含日期与版本行 `dsh-calorie <ver> · skill-calorie <ver>`；直读 envelope 原文；逐字段判定表。
- **禁止**：用"面板 `total` 与直读 `metrics` 看起来差不多"充当通过（一个是 JSON 文本，一个是对象）。

## 3 腿 2 · 纯技能路

### 3.1 隔离安装

- **判据**：第三方平台（opencode）隔离安装，落点目录含带 frontmatter 的 `SKILL.md`。
- **取证**：`npx skills@latest add FeatherHunter/ilife -s skill-calorie -a opencode --copy -y` 的输出、`list --json` 原文、落点目录树（含 SKILL.md 头 4 行）。
- **现状**：已成立（#47 / #49）。

### 3.2 真调用（**严口径**）

- **判据**：会话里 **AI 自己**读 SKILL.md、**自己决定**执行 `calorie-cmd-read`，拿到 envelope 并产出 HTML 文件。
- **不算**：人手动在落点目录里敲命令（那只证明"文件装对了、命令能跑"，与 #47 同档）。
- **取证形态（两者都做）**：
  1. **可复现门禁（AFK）**：`opencode run "卡路里 help"` 自动发起会话 → `opencode export <sessionID>` 导出会话 JSON 归档进仓 → 断言脚本核对"会话里确实出现了 AI 发起的 `calorie-cmd-read` 调用与 envelope"。
  2. **真实性旁证（HITL）**：维护者亲自开一次 opencode 会话跑同一句话，留记录/截图。
- **环境事实**（2026-09-08 实测）：本机 opencode `1.18.13`，有 `run` / `export` 子命令；`opencode auth list` 为 0 凭据，可用免费模型（如 `opencode/mimo-v2.5-free`）→ 自动跑可能受免费模型波动影响，失败时退回手跑并**按缺证据记**。

### 3.3 版本钉死登记

- **判据**：证据记录里登记 `skills` 版本、`skill-calorie@x.y.z`、opencode 版本、`git rev-parse --short HEAD`。
- **口径**：运行时包版本钉到**精确版本**（`npx -p skill-calorie@0.1.2 calorie-cmd-read …`，不用 `^`）；安装器同样钉精确版本，不用 `@latest`。npm 生态没有"@SHA 引用"的概念，**精确版本 + 登记 commit SHA** 即最强钉法（取代地图雾里的"未 @SHA 钉死"）。

## 4 数据口径

- **必须非空真实数据**：走 **HITL-0**——维护者当天用卡路里技能真实记一餐。
- **不允许**：改系统时钟（会波及全机，不可逆）；用副本+哨兵**顶替**真机证据。
- **允许**：副本+哨兵用于**脚本复现**（`demo-panel-vs-direct.mjs` 需要能反复跑），但必须在证据里标注"合成/副本"，且不得替代真机那一份。
- **理由**：真库最新数据 2026-08-19，而面板只读今天 → 不造今日数据，两路只能同报 `ERR4`（空库同文）。

## 5 判定三分

| 情形 | 定性 | 处置 |
| --- | --- | --- |
| 两侧逐字段全等 + `entryCount > 0` + 直读 `exit=0` | **过** | 记入证据表 |
| 两路都成功但字段有差异 | **挂（缺陷）** | 开修复票；不得用"差不多"顶替 |
| 任一路 `exit≠0` / 缺参数 / 缺 env / 缺 DB | **阻断（缺证据）** | 本次**没有**取得证据；不得用"空库同文"顶替 |

## 6 范围与边界

- **本图只负责"技能能被正确找到并调用"**（发现性与链路），不承担本体图的功能完备性。
- 与 MAP1 的关系：**不建原生阻塞边**。#81（唤醒词可达性）、#82（SKILL.md 门面）、#95（打包与模板装载）只作"完成后回归一次"的项——本图在乎的是"能否在 opencode 与 DSH 中正确找到技能"，不是 MAP1 的功能是否正常。
- **面板按日参数化、面板增删改** → 全面面板图 #65，本图不改面板代码。
- **模板资产边界（2026-09-08 实测；2026-09-09 由 #95 返修就地更正——原陈述已成假，勿再引用）**：#95 之后 `packages/skill-calorie/src/render/templates.ts` 是**运行时读盘 loader**（`readFileSync` ＋ `fileURLToPath`），6 个 `packages/skill-calorie/templates/*.html` **随包发布**（`package.json` 的 `files` 含 `templates/*.html`），并由 publish 门在安装态逐件断言可读（`node tooling/check-publish.mjs --fresh-tmp --only skill-calorie`）。仍未变的只有一点：`src/render/html.ts` 的 `pageShell` **尚未**消费该 loader（HTML 仍以代码生成）。模板接线的落点：6 模板补 `<!--INJECT-DATA-->`／自带容器 ＋ 并入 HELP 重建 = **#107**（`docs/base-paint-contract.md` §4.4／§6.1；本票不接线、不发布 base-paint）。
- **已知残余（不在本图修）**：线上 URL 安装不含 `dist`（gitignored），运行时走 npm 包；本地路径安装会拷走 `dist/node_modules`（#47 遗留）。本图验收只要求"官方推荐的安装路径能用"，残余记在此处备查。

## 7 证据归档清单

| 项 | 内容 | 落点 |
| --- | --- | --- |
| 对数记录 | 直读 envelope 原文 + 面板截图 + 逐字段判定表 | `.scratch/research/t69-evidence/evidence-<YYYYMMDD>-<版本>.md` |
| 复现日志 | `demo-panel-vs-direct.mjs` 的 `demo-log.txt` | 同上（已归档 3 份） |
| 会话 JSON | `opencode export` 导出的第三方会话 | 归档进仓（#116 决定具体位置） |
| 零触碰自检 | 真库 SHA256 前后一致 + `SKILLS_DB_PATH` 复原值 | 同上 |
| 版本钉死 | `skills` / `skill-calorie@x` / opencode / commit SHA | 同上 |

## 8 给 #57–#61 复制线的复用说明

- 本文可**直接当模板**：把"技能名 / 键名 / 包名 / CLI 名"替换即可，判据结构与判定三分不变。
- 复制线**各自成图**（维护者裁定），不挂本图子票；但复制线的验收记录须引用本文，避免每个技能重新发明判定口径。
- 复制线仍需各自处理：frontmatter 是否随包（现 1/6）、双路 HELP 证据（现 0/5）、脏 manifest 重发窗口（#53）。

## 9 证据质量清单（判"过"的前提）

维护者要求（2026-09-09）：**全部子票关闭 ≠ 目的地达成**；必须高质量完成目标。因此下面每一条都是"判某行过"的前置，任缺一条该行不成立。

1. **可复现**：每条证据附命令原文 + `exit code` + 版本元组（`skill-calorie@x` / `dsh-calorie@y` / `skills@w` / `opencode@z` / `git rev-parse --short HEAD`）+ **取证日期**。
2. **可打开**：截图须能看清「日期 + 版本行」；HTML 产物须给出路径且文件存在、非空、含页面标记（如 `ilife-page`）。
3. **机器可判**：关键断言必须脚本化（断言脚本随证据入仓或入工作副本），人工目视只作旁证。
4. **数据标注**：真机真实数据 / 真库副本+哨兵 / 隔离仿真库，逐条标注、不得混用；**空库"同文一致"不得充当数值一致**。
5. **版本一致**：全部证据的版本元组必须一致；不一致必须逐条说明原因（例如发版前后各取一次）。
6. **零触碰**：涉及真库的证据必须附 SHA256 前后值。
7. **无替代品**：任一路 `exit≠0` 记**缺证据**；两路成功但字段有差异记**缺陷**（开修复票）；不得用"看起来差不多"通过。

> 本清单由地图 #64 的收口闸门票逐行核对；与 §5 的判定三分配合使用：§5 定"什么算过"，本节定"证据本身够不够格"。
