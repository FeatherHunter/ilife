# t420 · 页面收尾三件：页内导航、口径说明行、可打印版式（公共层增量）

本记录归公共层包 `base-render`（目录名逐字，见 `docs/agents/doc-homes.md`）。票面 #420（地图 #156
卡路里场景 04 运动 · 页面融合的公共层前置票），消费方是回执页族与各读页族。本票只动
`packages/base-render`：`packages/skill-calorie/` 一行未改，两张样张与 `docs/skills/skill-calorie/`
下既有证据件一字未改，`packages/base-render/src/style.ts` 未动（理由见 §1 第 3 条）。

## 1. 三件与落点

| 件 | 产物 | 入参 | 缺省／空态 |
| --- | --- | --- | --- |
| 页内导航 `renderTocBlock` | `ilife-block-toc`（`<nav aria-label="页内导航">` ＋ 逐项 `<a href="#id">`） | `{ items: [{ id, text }] }`，锚点 `id` 由调用方给、区块不猜 | `items: []` → 空串（不出这一块）；非数组／项缺 `id`／项缺 `text` → `bad-input` |
| 口径说明行 `renderCaliberLine` | `ilife-block-caliber` | 纯文本单参 | 空串／非串 → `bad-input` |
| 可打印版式 `renderPageShell({ printable })` | 版面根加 `ilife-page-printable` | 可选布尔 | 不给／给假 → 产物逐字同今天 |

三条口径都写进了测试（供审查席复核）：

1. **三件不进 `BLOCK_STYLE_SECTIONS`。** 该闭集被 `packages/base-render/test/blocks.test.mjs:71-77`
   逐字钉死 12 项，而该测试件不在本票路径所有权内，故样式随 `pageShell` 区落盘：不新增样式区、
   不改 11 个冻结 token、不产闭集外的 `ilife-` 类名（台账读数见 §5）。
2. **打印留白走具名页，不写裸 `@page`。** 票面要求「`@media print` 与 `@page` 规则进公共样式」，
   而裸 `@page` 是**全局规则**——CSS 没法把它绑到类上，任何页一打印都吃那 12mm，于是票面另一条
   「不给 `printable` 的调用点渲染结果不变」在打印语义上会变假。落法是具名页：
   `.ilife-page-printable { page: printable }` 对上 `@page printable { margin: 12mm }`，印刷留白只作用在
   带该类的那一页上，同时保住票面要求的 `@page`。`page` 属性是 MDN 记的 Baseline「Widely available」
   （2023-02 起跨浏览器可用，见 [MDN `page` 属性](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/page)）。
   测试为这两点各加一条断言：打印页名必须由 `.ilife-page-printable` 绑定；`blocksCss()` 里不得有裸 `@page`。
3. **打印段只落 `blocksCss()`，不落 `src/style.ts`。** `test/style.test.mjs:704-711`（T22）明写
   `buildStyleSheet()` 不得产 `body`／`html` 规则、不得含 `.ilife-page` 类名；打印段落那儿会当场变红。
   故 `src/style.ts` 本票零改动。
4. 打印段内容：根清除屏幕留白（`max-width: none`／`padding: 0`，改由页边距承担）、
   `display: none` 隐藏页内导航与复制区（`.ilife-block-toc`／`.ilife-block-copy-block`）。

## 2. 判据读数（先红 → 后绿）

**先红**（`node tooling/run-locked.mjs --ticket 420 -- node --test packages/base-render/test/page-finish-420.test.mjs`，
当刻三函数都不存在）：`GATE-RUN runId=6d509317-c916-404d-9403-fb8c05b790b1` exit=1

```
SyntaxError: The requested module '../dist/blocks.js' does not provide an export named 'renderCaliberLine'
✖ packages\base-render\test\page-finish-420.test.mjs (78.3136ms)
ℹ tests 1   ℹ pass 0   ℹ fail 1
```

**后绿**（`GATE-RUN runId=8518ee99-ebcb-412e-b1e3-bbfe3b31a431`／门禁位 `6ac04a70-c673-4bad-b388-18e2a3cd1999`）：
`ℹ tests 13   ℹ pass 13   ℹ fail 0`，exit=0。13 条＝导航 4 条（两锚点／空列表／转义／非法入参）＋
口径行 3 条＋可打印版式 2 条（逐字同今天／加类）＋打印段 4 条（隐藏两区与具名页／作用域纪律／
不得裸 `@page`／冻结 token）。

## 3. 变异自证两行

一次持锁内跑完两组（`node tooling/run-locked.mjs --ticket 420 -- node .scratch/t420/mutate.mjs`，
`GATE-RUN runId=2f069c90-b321-4095-aea0-a26dc0bf590e`；②另有一次换鉴别力探针的单跑
`GATE-RUN runId=5b5bf7fd-8960-4f88-977a-93e787c65a44`）。每组都是「改源 → 编译 → 跑测试 → 记读数 →
还原源 → 编译 → 跑测试 → 记读数」，日志在 `.scratch/t420/mutate-one.log`／`mutate-two.log`（草稿目录，不入仓）。

| 变异 | 红读数 | 复原后读数 |
| --- | --- | --- |
| ① 删掉 `renderTocBlock` 的空列表判据（`if (block.items.length === 0) return '';`） | exit=1，`tests 13 pass 12 fail 1`，首红 `✖ 空列表＝不出这一块（返回空串）`；dist 里该判据出现次数 **0** | exit=0，`pass 13 fail 0`；dist 里该判据出现次数 **1** |
| ② 删掉打印段的作用域前缀（两条选择器变裸 `.ilife-block-toc`／`.ilife-block-copy-block`） | exit=1，`tests 13 pass 11 fail 2`，首红 `✖ 含 @media print 与具名 @page，且隐藏页内导航与复制区`；dist 里作用域拼接片段 **0** 处 | exit=0，`pass 13 fail 0`；dist 里作用域拼接片段 **2** 处 |

两组的「源码已还原（sha256 与原文件同值=true）」都在日志里，还原后编译与测试各绿一次。

## 4. 门禁读数（三条 ＋ 两条旁证）

| 命令 | runId | exit | 摘要 |
| --- | --- | --- | --- |
| `pnpm build`（本票改动落盘前） | `22245b4b-b6a8-4d1d-9d6d-9526e963a970` | 0 | 全绿 |
| `pnpm build`（收尾第 1 次） | `4670982b-b052-4f5a-9efa-e41560c52d39` | 2 | 错行全在 `packages/skill-calorie/`（见下表） |
| `pnpm build`（收尾第 2 次） | `378ee1b9-41e6-444a-915e-279cd8e9a371` | 2 | 错集与第 1 次**不同**，也在 `packages/skill-calorie/` |
| `pnpm -C packages/base-render exec tsc -b`（本票范围） | `3a0aa233-9e87-495f-a342-e51f09c6f3be` | 0 | 本票改动编译绿 |
| `node --test packages/base-render/test/page-finish-420.test.mjs` | `6ac04a70-c673-4bad-b388-18e2a3cd1999` | 0 | `tests 13 pass 13 fail 0` |
| `node --test packages/base-render/test/blocks.test.mjs` | `2530462f-1b6e-4695-b55a-7db8cb715eba` | 0 | `tests 46 pass 46 fail 0` |
| `node --test packages/base-render/test/style.test.mjs` | `34ad2b75-9bda-4815-85ff-4f402e168001` | 0 | `tests 29 pass 29 fail 0` |

**`pnpm build` 红在他席在途件，归因读数**（本席一行不碰 `packages/skill-calorie/`）：

| 轮次 | 逐条错行 |
| --- | --- |
| 第 1 次 | `packages/skill-calorie/src/analysis/multiTrendPage.ts(217,37)`／`(217,71)`／`(352,37)`／`(352,71)` TS2322（`number \| null` 不能赋给 `number`）；`packages/skill-calorie/src/weight/log.ts(60,3)` TS2741（`WeightDashboard` 缺 `curve`，该字段由他席改的 `weight/plate.ts:46` 新增） |
| 第 2 次 | `packages/skill-calorie/src/weight/receipt.ts(328,7)` TS2322（`ChangeRow[]` 不能赋给 `readonly Readonly<Record<string, unknown>>[]`）；`packages/skill-calorie/src/workout/precheckPrompt.ts(31,46)` TS2339（`Trigger` 上无 `prompt_template`） |

两轮错集互不相同，说明他席此刻正在改这批件；其中 `analysis/multiTrendPage.ts` 是**未跟踪新件**
（`git status` 记 `?? `），`HEAD` 里没有。本票写面（`packages/base-render/`）零错行。
**下一手**：他席落盘后需重跑一次 `pnpm build`；本票范围的编译与三条用例已各自留痕。

## 5. 台账口径（新类该不该补登）

探针 `.scratch/t420/ledger-probe.mjs`（读 `dist`，不改工作区）实测：

```
ilife-block-toc：buildStyleSheet.css 出现=0，blocksCss 出现=4，落控件根名下=否（台账判定面外）
ilife-block-caliber：buildStyleSheet.css 出现=0，blocksCss 出现=1，落控件根名下=否（台账判定面外）
ilife-page-printable：buildStyleSheet.css 出现=0，blocksCss 出现=3，落控件根名下=否（台账判定面外）
控件根名 = ilife-toast,ilife-actionBar,ilife-copyButton,ilife-statusBadge,ilife-emptyState,ilife-errorReceipt,ilife-charts,ilife-helpShell
BLOCK_STYLE_SECTIONS 项数=12：pageShell,kpiCard,dataTable,chartBlock,listRows,preBlock,detailSection,disclosure,paramForm,emptyBlock,copyBlock,feedbackBlock
```

结论：`style.test.mjs` 的 T9（只扫 `buildStyleSheet().css`）与 T10（双向台账按控件区根名过滤）
判定面都不含这三个类，`blocks.test.mjs` 的 12 区闭集也仍是 12 项 ⇒ **无须补登，也没有放宽任何断言**。
佐证：两个既有测试件自 `230db27`（#247）后未被改动
（`git log -1 -- packages/base-render/test/blocks.test.mjs packages/base-render/test/style.test.mjs` = `230db27`），
本票两次提交只含自己声明的两条路径。

## 6. 同文件他席在途改动（#397）与我的 hunk 边界

`packages/base-render/src/blocks.ts` 在我提交 `dc16ba1` 之后又被 #397 席写入未提交的 B-09 参数表单改动
（`optNumeric`／`optOptions`／`ParamFieldInput` 的 `readonly`·`step`·`min`·`max`·`options`／`renderParamForm`，
`HEAD` 里没有这些）。处置（照 `docs/subagent-concurrency-protocol.md` §1／§3.2）：

1. **不整文件 `git add`**——那会把别席在途的活扫进本票提交；也不做任何还原。
2. 用 `.scratch/t420/filter-hunks.mjs` 把 `git diff HEAD` 拆成 hunk，只留下含本票新增常量
   `PRINTABLE_PAGE_NAME` 的 3 个 hunk（7 个 hunk 里另外 4 个是 #397 的），走
   `git apply --cached .scratch/t420/blocks-mine.patch`（`GATE-RUN runId=899dc78e-7b98-44ce-ab03-dc58aa33b85b`，
   exit=0），提交前用 `git diff --cached --name-only` 复核恰两件。
3. 提交后别席改动**原样留在工作区**。当刻读数（`git diff HEAD -- packages/base-render/src/blocks.ts`）：

```
packages/base-render/src/blocks.ts | 76 +++++++++++++++++++++++++++++++++++++-
1 file changed, 74 insertions(+), 2 deletions(-)
@@ -117,6 +117,28 @@   @@ -577,6 +599,17 @@   @@ -586,7 +619,11 @@   @@ -609,13 +646,48 @@
```

四个 hunk 头全落在 #397 的四处；本票两段（`PRINTABLE_PAGE_NAME`、打印段）已不在其中（已入 `9a56df3`）。

## 7. GATE-RUN 对账（逐字取自 `.scratch/locks/gate-runs.log`，共 20 条，一对一命中）

```
GATE-RUN runId=6d509317-c916-404d-9403-fb8c05b790b1 cmd="node --test packages/base-render/test/page-finish-420.test.mjs" exit=1（先红）
GATE-RUN runId=22245b4b-b6a8-4d1d-9d6d-9526e963a970 cmd="pnpm build" exit=0
GATE-RUN runId=5215a7a2-9981-4c0a-840d-42b83dbca94e cmd="node --test packages/base-render/test/page-finish-420.test.mjs" exit=0
GATE-RUN runId=aa9294a6-6248-4d42-85c4-25930c57d2e3 cmd="git add packages/base-render/src/blocks.ts packages/base-render/test/page-finish-420.test.mjs" exit=0
GATE-RUN runId=41c5df9a-e2c0-4551-afbb-547e4cff4309 cmd="git commit -F .scratch/t420/msg-1.txt" exit=0
GATE-RUN runId=9015110d-ff90-4126-9cf3-4b9205637763 cmd="git push origin master" exit=0
GATE-RUN runId=1383fdc0-5bfa-4f46-8f19-04044d0c29d2 cmd="pnpm exec tsc -b" exit=0
GATE-RUN runId=8518ee99-ebcb-412e-b1e3-bbfe3b31a431 cmd="node --test packages/base-render/test/page-finish-420.test.mjs" exit=0
GATE-RUN runId=2f069c90-b321-4095-aea0-a26dc0bf590e cmd="node .scratch/t420/mutate.mjs one two" exit=0
GATE-RUN runId=5b5bf7fd-8960-4f88-977a-93e787c65a44 cmd="node .scratch/t420/mutate.mjs two" exit=0
GATE-RUN runId=4670982b-b052-4f5a-9efa-e41560c52d39 cmd="pnpm build" exit=2（他席在途件）
GATE-RUN runId=6ac04a70-c673-4bad-b388-18e2a3cd1999 cmd="node --test packages/base-render/test/page-finish-420.test.mjs" exit=0
GATE-RUN runId=2530462f-1b6e-4695-b55a-7db8cb715eba cmd="node --test packages/base-render/test/blocks.test.mjs" exit=0
GATE-RUN runId=34ad2b75-9bda-4815-85ff-4f402e168001 cmd="node --test packages/base-render/test/style.test.mjs" exit=0
GATE-RUN runId=3a0aa233-9e87-495f-a342-e51f09c6f3be cmd="pnpm -C packages/base-render exec tsc -b" exit=0
GATE-RUN runId=899dc78e-7b98-44ce-ab03-dc58aa33b85b cmd="git apply --cached .scratch/t420/blocks-mine.patch" exit=0
GATE-RUN runId=7e007e8e-57b7-4068-a8de-9b37f8e19229 cmd="git add packages/base-render/test/page-finish-420.test.mjs" exit=0
GATE-RUN runId=871f87a8-17e7-4f97-816c-87fef4796c1e cmd="git commit -F .scratch/t420/msg-2.txt" exit=0
GATE-RUN runId=0937b2c8-798b-423c-a879-058c8ee9aca7 cmd="git push origin master" exit=0
GATE-RUN runId=378ee1b9-41e6-444a-915e-279cd8e9a371 cmd="pnpm build" exit=2（他席在途件，错集与上一轮不同）
```

提交：`dc16ba1`（三件实现＋测试，两件）与 `9a56df3`（打印留白改具名页＋两条断言，两件），均已推送
（`2ef942b..dc16ba1`、`0b0e372..9a56df3`）。

## 8. 未做项与已知副作用

- **`pnpm build` 未在本票收尾时转绿**：红在他席在途件（§4 两条错行表），本票范围编译已绿。
  他席落盘后请重跑一次。
- **具名页的退化面**：不支持 `page` 属性的浏览器上 `@page printable` 不生效 ⇒ 打印退化成浏览器
  默认页边距（不报错、不影响别页）。#420 没有浏览器打印取证面，本记录只有静态读数。
- **遗留出口（票面「密度细节」逐条核对结果）**：`tabular-nums` 公共层今天有
  （`blocks.ts` 的 `block-kpi-card-value`／`block-data-table-table` 等 4 处）；卡片圆角 14–20px 有
  （`RADIUS_MD=14`／`RADIUS_LG=20`，KPI 卡取 14）；**KPI 值口径差一档**——样张
  `docs/skills/skill-calorie/t156-样张-运动复盘.html:30` 是 `.kpi .value{font-size:24px}`，
  公共层 `block-kpi-card-value`（`blocks.ts` HEAD 第 894-898 行）是 `font-size: 28px`。
  是否开票由地图席定（开票属地图层动作），本票不偷塞。
- 两张样张、`docs/skills/skill-calorie/` 既有证据件、`packages/skill-calorie/` 全部零改动；
  `packages/base-render/src/style.ts` 零改动（§1 第 3 条）。
