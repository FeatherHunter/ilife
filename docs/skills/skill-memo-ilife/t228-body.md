## Question

把「5 项 ＋ 三块可选内容」喂给通用 help 模板，让备忘录能零 IO 出整页 HTML（照 `#145`／`#189`）。

- **走 A 路**：`import { renderHelpShellHtml } from 'base-paint/help-shell'`。**不碰** `packages/base-render/src/helpShell.ts` 这个生成物（要改渲染规则得改源 `assets/help-template.html` 再跑 `pnpm --filter base-paint gen:help-shell`）。
- **取值**照票 3 的备忘录取值表；**资产**来自票 7 的 typed const。
- **两个小口径要定死**（照记账先例）：`version` 用技能数据世代（不是 npm 包版本）；初始化状态与只读页不建库；读失败照显；显隐只走模板给的 `hidden`。
- **边界名单**：一 import `base-paint`，`pnpm boundaries` 就会红——`tooling/check-boundaries.mjs:37` 的 `SKILLS_BASE_FROZEN` 要移出 `'skill-memo-ilife'`。**本票只改这一项，`'skill-home'` 归 `#183`**（那张图同时在跑，同一行）；并顺带在 `:34-36` 的先例注释里补一句备忘录。
- **必报五步**：第一、二步先报用户点头（票 5 已做）；交付时报第五步对账。

**并入票 3（`#223`）的实测**（逐字出处见 `t223-template-contract.md`）：

- `packages/skill-memo-ilife/package.json` 现在**只有** `base-link-core`，**没有** `base-paint`——本票要新增依赖。
- 取值已定：`skill_name='备忘录'`／`title='使用手册'`（不含技能名 ⇒ 新文档标题＝`备忘录 · 使用手册`）／`subtitle='8 个分类 · 30 个场景 · 30 可用 · 版本 1.3.0'`／`version='1.3.0'`／`contact` 两项（GitHub `https://github.com/FeatherHunter/SKILLS` ＋ Issues，**无 `url`、无 `copy_all`**）／`recommendations` **不传**。
- ⚠️ **初始化口径要重定义**：老家「DB 文件存在＝已初始化」在本机实测**判错**——`D:\.db\memo.db` 是 0 字节空壳、真库目录 `D:\.db\memo` 不存在 ⇒ 老判法答「已初始化」而库是空的。新库是**目录**不是 `memo.db`。建议口径＝「memo 库目录存在」，归票 6 裁。`openMemoDb` 实测**不建库**（`src/fetch/db.ts:21-29` 只有 stat／access，无 mkdir、无 DDL）。
- ⚠️ `meta_blocks[1]`（HELP 唤醒词块）**无源可派生**（见票 6）。
- ⚠️ A 路模板里 `subtitle` 与 `meta_blocks` **没有渲染落点**（读完即弃，只进 `help-data`）；判某键在不在**只能看 `help-data`**——老产物剥离脚本后静态正文为空。
- 老 `title` 曾是原型水印 `HELP 原型 · V4 三级目录版`；新线 `composeDocTitle` 修掉它，**不是回归**。

完成判据：仓库里能拿到内容与老骨架一致、由通用模板渲染的整页 HTML；`pnpm boundaries` 与 `gen:help-shell:check` 均绿。

**并入票 1（`#221`）的实测**：

- **照抄三块的行号**：`packages/skill-bill/src/output.ts:27-39`／`:42-58`／`:72-86`（`wx` 独占 ＋ `EEXIST` 递补 ＋ `resolve` 绝对路径）；命名常量照 `src/render/helpPaths.ts:22` 换成 `memo_html`。
- ⚠️ **别误伤快照**：`tooling/skill-html-snapshot.mjs:48` 的**备忘录条目填充器是 `fillSharedMarkers`**（其余四件是 `fillTemplate`）。
- 共享模板**认 `editable_fields`**（`help-template.html:1669`）与**横幅步骤卡**（`:1776` 读 `INIT_BANNER.steps`）——老备忘录两样都有。

- ⚠️ **页面上不许出现命令硬编码**（用户 U6 备注立规，2026-09-12）：渲染出的 HELP 里**只出现唤醒词**，`memo.*` 命令名不进页面——命令只住在 `SKILL.md` 的内部流程里。
- ⚠️ **不标缺失**（用户 U1／U2／U3 备注立规）：**不要**渲染「当前无唤醒词可路由」之类的状态标记——HELP 是最终完整体。
- **`contact` 按用户 V6=B（非推荐项）**：照老两项，但**补 `url` 字段使其可点**（模板 `<code>:1804</code>` 有该判）。

- ⚠️ **HELP 自身的唤醒词不上页面**（用户 V1 定案）：「HELP HTML 中不包括 HELP 的唤醒词场景。用户说 备忘录HELP 就能拿到」⇒ **不传** `meta_blocks[1]`（「怎么喊我」那块），也不把 HELP 自己的唤醒词渲染成场景卡。
- **`editable_fields` 要渲染**（用户 V7 定案）：模板第 `:1669` 行认这一栏，照资产里的清洗后 76 条渲染。

## 进度：0%

下一步：等票 5（结构设计）关票；票 1／票 3 已关。
