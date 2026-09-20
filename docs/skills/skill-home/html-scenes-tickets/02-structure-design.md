## Question

`packages/skill-home/src` 第一层全是工种名（`cli`／`fetch`／`policy`／`render`／`help`），21 条命令键挤在 `src/cli/cmd_read.ts` 一个 switch 里（实测 884 行，包告警线 350）。70 条场景的页面要落地，先得把形状定死：9 个域的能力目录怎么切、每个能力有哪些标准件、命令登记与派生共用位怎么走、页族归属表长什么样、超线件怎么处置。

## 目标

按 `docs/agents/structure.md` 必报五步的**第一、二步**产出形状定稿，**先报用户点头再动**：
① 9 个域的能力目录名（取自 HELP 一级分组）与每个能力的标准件清单（照卡路里：`index.ts` 能力门／`commands.ts` 命令声明／`routes.ts` 路由／子功能件／装配件）
② 70 条场景 → 页族的归属表（哪些场景共用一页）；输入是票 1 册子（`pages-ledger.md`：老 yaml 引用的 **49 个模板即 49 个页族**，实建 8 个域，`link` 域 3 族不做）与老模板映射；产物命名规则**引票 21 的裁决，本票不自行决定**
③ 共用件边界与落点（哪些升共用位，且写得出哪两个能力在用）
④ 命令登记与派生链（`src/<能力>/commands.ts` 为事实源；`pnpm gen` 派生、`pnpm gen:check` 守）
⑤ 超线件处置（`cmd_read.ts` 884 行、`fetch/db.ts` 434 行）
⑥ HELP 内容资产 `html.template` 是否改指新页面（改则含重跑 `pnpm gen:help-assets` 与摘要锁的动作）
`link` 域只留登记位、不建目录（#183 票 13 用户裁决）。

## 验收命令

`(Select-String -Path docs\skills\skill-home\scene-pages-structure.md -Pattern '^## ').Count` —— 读数 **≥6**，且本票评论里**有用户点头的原话**（HITL 票，无点头不算过）。

## 不许动的东西

本票只出决定与形状，不搬代码：不改任何 `src/`；不动 `scenarios.yaml`；不动页面模板。

## 交付物路径

`docs/skills/skill-home/scene-pages-structure.md`（形状定稿，含页族归属表 ＋ 给下游票的硬约束）。

## 遗留出口

定稿里给票 3／4／5／6／7 与 11 张域票的硬约束逐条链接；裁出「本图不做」的写进地图 Out of scope；裁完发现要补票的当场补。
