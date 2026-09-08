# #78 契约面预审（R1 · 只读 · 非正式验收）

- 对象：`packages/base-render/src/charts.ts`（1715 行，mtime 2026-09-09 04:30）＋ `packages/base-render/src/help.ts`（669 行，mtime 04:27）＋ 同批 `test/charts.test.mjs`（1165 行）／`test/help.test.mjs`。
- 判据：`.scratch/t78/contract-scope.md`（R1 取证）＋ `docs/base-paint-contract.md` §3.5／§6.5／§7 ＋ `.scratch/t78/ARCHITECT-RULINGS.md`（R1–R31）。
- 仓库状态：HEAD `aed1b7c`＋未提交施工改动（`docs/base-paint-contract.md`／`src/spec/{charts,controls,help,index}.ts`／`src/index.ts`／`test-d/contract-signatures.ts` 已改；`src/charts.ts`／`src/help.ts`／两份测试／`.changeset/base-paint-charts-help.md` 新增）。`dist/*.js` 构建于 04:32:16（晚于源码 mtime）→ 本文的运行时实证均基于该 `dist`（**只读加载，未写任何文件**）。
- 唯一写操作 = 本文件；未改源码／测试，未执行 git 写命令，未运行构建（`dist` 由编排者构建，我只读）。

---

## 0. 结论前置

- **签名面：5/5 逐字一致（0 不一致）** —— `charts`／`renderHelpShell`／`buildChartsHelpersJs` 的运行时签名与 `RenderHelpShell`／`BuildChartsHelpersJs` 的类型签名全部与冻结面逐字相符（参数名 `input`／可选性／返回类型／只读修饰）。
- **红线面：0 违规** —— 代码级 `document.`／`window.`／`globalThis.` = **0**（两个文件都是 0）；产出无 `<canvas>`／无内联 `<script>`／无 `onclick=`；`node:` 仅出现在注释；无第二份常量表、无第二份 scene-data schema。
- **三处同步：已由编排者落地且实测一致** —— 清单 5 条、文档 §3.5 表格 5 行、`test-d` 3 条 `Absent<>`→`Present<>` ＋ 3 条出口类型锁 ＋ 3 条「不导出」锁；`src/index.ts` 恰好追加 3 个运行时出口。全清单 pending 仅剩 2 条（#75）。
- **FX-6／R11：合规** —— 两个候选 `.json` 均不存在（不发布）；`SCENE_DATA_SCHEMA` 已带 `minItems: 1`，空 `scenes[]` 实测抛 `HelpSchemaError/schema-invalid`。
- **不一致 9 条**：**5 条需修**（A1–A5）＋ **4 条记账／nit**（B1–B4）。
- **最严重的 3 条**：
  1. **A1 同输入不同输出**：`gradientSeq` 是模块级计数器，实测两次相同调用得到 `grad-1`／`grad-2`，违反「给定输入即可产出确定字符串」的边界判定法（`docs/base-paint-contract.md:862`），并威胁 #96 快照门。
  2. **A2 结构校验漏口**：bar 的 stacked／grouped 模式缺 `value` 时**静默置 0 不抛错**（实测不抛），与 `docs/base-paint-contract.md:799`「`value` 非法 → 抛 `structure-invalid`」的字面口径冲突。
  3. **A3 类名命名空间与 R3 不符**：实现发 `ilife-chart*`，R3 预留的是 `ilife-charts*`（同票 `help.ts` 却按区名 kebab 得 `ilife-help-shell`），#75 按区名生成 CSS 会落空。

---

## 1. 5 条冻结签名逐条比对（0 不一致）

| 冻结面（`spec/index.ts`） | 冻结签名（逐字） | 实现落点 | 判定 |
|---|---|---|---|
| `charts`（runtime，`:173`） | `ChartsApi` | `src/charts.ts:1615` `export const charts: ChartsApi = new Proxy(CHART_DISPATCH, {…}) as ChartsApi;` | **一致** |
| `RenderHelpShell`（type，`:177`） | `(input: HelpShellInput) => FillTemplateOutput` | 类型别名 `spec/help.ts:260`（本票未改）；`test-d/contract-signatures.ts:348` `_H12 = Equal<RenderHelpShell, (input: HelpShellInput) => FillTemplateOutput>` | **一致** |
| `renderHelpShell`（runtime，`:178`） | `(input: HelpShellInput): FillTemplateOutput` | `src/help.ts:657` `export function renderHelpShell(input: HelpShellInput): FillTemplateOutput {…}` | **一致** |
| `BuildChartsHelpersJs`（type，`:180`） | `(input?: ChartsHelpersInput) => string` | 类型别名 `spec/charts.ts:272`（本票未改）；`test-d:358` `_H19` 锁形 | **一致** |
| `buildChartsHelpersJs`（runtime，`:181`） | `(input?: ChartsHelpersInput): string` | `src/charts.ts:1687` `export const buildChartsHelpersJs: BuildChartsHelpersJs = (input) => {…}`（`input` 由别名定为可选，返回 `string`） | **一致** |

**逐项核对结论**：参数名均为 `input`（与冻结面同名）；`charts` 为运行时值、`renderHelpShell`／`buildChartsHelpersJs` 为函数（前者 `input` 必填、后两者中 `buildChartsHelpersJs` 的 `input` 可选）；返回类型分别为 `ChartsApi`／`FillTemplateOutput`／`string`；`ChartsApi` 8 方法在冻结面本身无 `readonly` 修饰，实现亦无。

**运行时实证**（读 `dist`，只读）：
- `Object.keys(charts)` → `["bar","line","donut","progress","combo","sparkline","gauge","scatter"]`（恰 8 个，与 `ChartsApi` 一致）。
- `charts["pie"]({})` → `ChartError/kind-unknown`（R15 的可达路径成立）。
- `renderHelpShell({sceneData, assets})` → 正常返回，`docStart = "<!DOCTYPE html>"`、`<script` 计数 = 2、`id="payload"` 计数 = 1、残留 `<!--` 计数 = 0（R7／R31 锚点成立）。

**一处实现层面的类型松点（B3，非签名不一致）**：`charts` 用 `as ChartsApi` 断言、派发表类型是 `Readonly<Record<ChartKind, (input: unknown) => ChartOutput>>`（`charts.ts:1597-1623`），故**编译期不校验 8 个方法各自的入参类型**（运行时靠 `structure-invalid` 兜底）。类型层断言 `_H13b = Equal<Mod['charts'], ChartsApi>` 只锁导出类型。

---

## 2. 契约红线扫描（机读可复跑）

### 2.1 方法与实测输出

**① 代码级 DOM／全局（剥注释＋剥字符串字面量后）**

```powershell
$c = Get-Content -Raw packages\base-render\src\charts.ts; $h = Get-Content -Raw packages\base-render\src\help.ts
$q=[char]39
$c=[regex]::Replace($c,'(?s)/\*.*?\*/',' '); $c=[regex]::Replace($c,'(?m)//.*$',' '); $c=[regex]::Replace($c,'"(\\.|[^"\\])*"','S'); $c=[regex]::Replace($c,$q+'(\\.|[^'+$q+'\\])*'+$q,'S')
$h=[regex]::Replace($h,'(?s)/\*.*?\*/',' '); $h=[regex]::Replace($h,'(?m)//.*$',' '); $h=[regex]::Replace($h,'"(\\.|[^"\\])*"','S'); $h=[regex]::Replace($h,$q+'(\\.|[^'+$q+'\\])*'+$q,'S')
$p='document\.|window\.|globalThis\.|navigator\.'
"charts.ts code hits: " + ([regex]::Matches($c,$p)).Count
"help.ts   code hits: " + ([regex]::Matches($h,$p)).Count
"charts.ts canvas/script/onclick: " + ([regex]::Matches($c,'<canvas|<script|onclick=')).Count
"help.ts   canvas/script/onclick: " + ([regex]::Matches($h,'<canvas|<script|onclick=')).Count
```

实测输出：

```
charts.ts code hits: 0
help.ts   code hits: 0
charts.ts canvas/script/onclick: 0
help.ts   canvas/script/onclick: 0
```

**② 原始全文（含注释与字符串）命中位置**（`Select-String -Path charts.ts,help.ts`）：

| 模式 | 命中数 | 位置 | 判定 |
|---|---|---|---|
| `<canvas` | 1 | `charts.ts:8` | 注释（红线声明） |
| `<script` | 4 | `charts.ts:8`；`help.ts:8,11,20` | 全为注释；代码里的 `<script` 一律由 `ASSET_WRAPPERS` 派生（`help.ts:589-591`），无字面量 |
| `onclick=` | 1 | `charts.ts:8` | 注释 |
| `node:` | 3 | `charts.ts:9,1682`；`help.ts:9` | 全为注释 |
| `globalThis` | 3 | `charts.ts:10,1682`；`help.ts:9` | 全为注释 |
| `scene-data.schema.json` | 0 | — | 无第二份 schema／无发布文件名 |
| `ilife-charts` | 0 | — | 未硬编码 `CHARTS_STYLE_ID`（用常量） |
| `data-action-id` | 0 | — | 未硬编码 `ACTION_ID_ATTR` |
| `【待开发】` | 0 | — | 未硬编码 `SCENE_STATUS` 值（`help.ts:450` 用 `SCENE_STATUS[1]` 比较） |
| `复制指令` | 1 | `help.ts:398` | hero 引导语「点场景卡看指令全文,一键复制指令」，非按钮文案（按钮文案取 `HELP_COPY_ACTIONS`，`help.ts:364-370`） |

**③ 常量单一真相**：`charts.ts:34-61`／`help.ts:42-73` 的 import 全为相对路径（**零第三方**）；冻结常量用法逐条落实——

- `ACTION_ID_ATTR`（`charts.ts:37,268,274`；`help.ts:45,368`）
- `DEFAULT_DATA_ATTR`（`help.ts:45,369`）
- `CHART_BREAKPOINTS`（`charts.ts:37,1048,1631-1633`）
- `CHART_PALETTE`（`charts.ts:37,131,133,796,863,1027,1035,1225,1258,1297`）
- `CHARTS_STYLE_ID`（`charts.ts:37,1675`）
- `STATUS_DEFAULT_TEXT.empty`（`charts.ts:37,295`）
- `STYLE_PREFIX`（`charts.ts:36,260`；`help.ts:44,83`）
- `TEMPLATE_MARKERS`／`ASSET_WRAPPERS`／`CONTAINER_CHECK_RULE`（`help.ts:55,589-591,622,641-642`）
- `SCENE_DATA_SCHEMA`／`SCENE_STATUS`／`SCENE_TYPE_FIELD`（`help.ts:46-53,293,308-316,345,450`）
- `HELP_COPY_ACTIONS`／`HELP_COPY_TARGETS`／`HELP_SHELL_ID`（`help.ts:47-49,365,625`）

**④ 第二份规则表／schema**：`help.ts:173-244` 的 draft-07 子集校验器**数据驱动**读 `SCENE_DATA_SCHEMA`（支持 `type`／`enum`／`minLength`／`minItems`／`items`／`required`／`additionalProperties`／`properties`／`oneOf`），未内置第二份规则表；`help.ts:345` 是唯一调用点。**合规**。

**⑤ 产出纯度**：`charts.test.mjs:1037-1058` 对 12 份产出断言 `<canvas`／`<script`／`onclick=`／`onload=`／`node:`／`http://`／`https://` 计数为 0，且 `<style` 计数为 0（CSS 只由 `buildChartsHelpersJs` 注入）——与 `docs/base-paint-contract.md:803` 一致。

**⑥ 门禁红线的兼容性核对**（`test/contract-signatures.test.mjs`）：
- `:911-921` `purityViolations()` 只剥注释、只禁 `node:` 与 `window.<id> =`／`globalThis.<id> =`——`charts.ts` 产出文本里只有 `document.*` 与 `getElementById`，**不会误红**。
- `:956-971` 「DOM 只允许出现在产出文本里」会遍历 `dist/**/*.js`，先 `stripJsLiterals()` 剥字符串再判——`dist/charts.js` 的 `document.` 全在字符串数组里（`charts.ts:1698-1708`），**不会误红**。

---

## 3. 三处同步就绪度（当前状态：已落地，实测一致）

### 3.1 已完成的精确改动（`git diff` ＋ 读取实测）

| 处 | 行号 | 旧值 → 新值 | 状态 |
|---|---|---|---|
| ① 清单 `packages/base-render/src/spec/index.ts` | `:173` `charts` | `status: 'pending'` → `'implemented'` | ✅ 已改 |
| | `:177` `RenderHelpShell` | 同上 | ✅ 已改 |
| | `:178` `renderHelpShell` | 同上 | ✅ 已改 |
| | `:180` `BuildChartsHelpersJs` | 同上 | ✅ 已改 |
| | `:181` `buildChartsHelpersJs` | 同上 | ✅ 已改 |
| ② 文档 `docs/base-paint-contract.md` §3.5 标记区 | `:770`／`:774`／`:775`／`:777`／`:778` | 状态列 `pending` → `implemented`（该行其余列逐字不变） | ✅ 已改（读取 `:770-778` 实测 27 行全 implemented） |
| ③ 类型断言 `packages/base-render/test-d/contract-signatures.ts` | `:349` `_H13` | `Absent<'charts'>` → `Present<'charts'>`（＋ `:350` `_H13b = Equal<Mod['charts'], ChartsApi>`） | ✅ 已改 |
| | `:350`→现 `:353` `_H14` | `Absent<'renderHelpShell'>` → `Present<>`（＋ `_H14b = Equal<Mod['renderHelpShell'], RenderHelpShell>`） | ✅ 已改 |
| | 原 `:359` `_H20` | `Absent<'buildChartsHelpersJs'>` → `Present<>`（＋ `_H20b`） | ✅ 已改 |
| | 新增 `_H21`／`_H22`／`_H23` | `Absent<'ChartError'>`／`Absent<'HelpSchemaError'>`／`Absent<'buildShellTemplate'>` 均为 `true` | ✅ 已加 |
| ④ 出口 `packages/base-render/src/index.ts` | `:37` | `export { buildChartsHelpersJs, charts } from './charts.js';` | ✅ 已加 |
| | `:40` | `export { renderHelpShell } from './help.js';` | ✅ 已加 |

（行号以当前工作区为准：`test-d` 因新增注释与断言整体下移，`_H13`／`_H14`／`_H20` 现位于 `:349`／`:353`／`:364` 附近。）

### 3.2 出口面硬闸核对（`test/contract-signatures.test.mjs:268-272`）

- **必须追加的 3 个名字**（且只有这 3 个）：`charts`、`buildChartsHelpersJs`、`renderHelpShell` —— 与清单里 5 条中 **3 条 runtime** 一一对应；`src/index.ts:37,40` 实测恰好这 3 个。
- **不得多出的名字**（导出即红）：
  - `ChartError`（`charts.ts:68` `export class`，**仅模块内导出**，`src/index.ts` 未再导出）
  - `HelpSchemaError`（`help.ts:109` `export class`，同上）
  - `buildShellTemplate`（`help.ts:607` **非 export**，模块内部函数）
  - `chartsCss`／`helpersPrefix`／`helpersStyleId`／`CHART_DISPATCH`（`charts.ts:1629,1668,1673,1599` 均非 export）
- **type-only 不得有运行时值**（`:280-284`）：`RenderHelpShell`／`BuildChartsHelpersJs` 仍是类型，实测 `dist/index.js` 无同名值。
- **测试侧无需手改名单**：`:268-272` 的期望集由清单派生，翻转后自动一致。
- 测试导入惯例核对：`ChartError` 从 `../dist/charts.js` 导入（`charts.test.mjs:29`）、`HelpSchemaError` 从 `../dist/help.js` 导入（`help.test.mjs:18`），并断言二者不在 `dist/index.js`（`help.test.mjs:627-629`；`charts.test.mjs` 同类）——与 #74／#77 先例一致。

---

## 4. FX-6 与 R11 复核

### 4.1 FX-6／R5／R14：不发布 `scene-data.schema.json` —— **合规**

- 实测：`packages/base-render/dist/scene-data.schema.json` 与 `packages/base-render/scene-data.schema.json` **均不存在**（`Get-ChildItem … -ErrorAction SilentlyContinue` 无输出；`Test-Path` 两处皆 `False`）。
- 测试口径：`test/contract-signatures.test.mjs:525-532`「存在才比对，不存在即跳过」——当前为**跳过态**（合规）。
- 前提仍成立：`package.json:11-13` `files: ["dist"]`＋`build: tsc -b`（`:21`）不会复制 `.json`，若将来发布必须由 `SCENE_DATA_SCHEMA` 序列化生成（`docs/base-paint-contract.md:817`）。

### 4.2 R11：`SCENE_DATA_SCHEMA` 的 `scenes` 已带 `minItems: 1` —— **合规**

- 落点：`packages/base-render/src/spec/help.ts:148-149`（注释标明「#78 施工期取证 R1 缺陷 1，AC-4 下即缺陷态 → 补齐 `minItems: 1`」＋ `minItems: 1,`）。
- 机读断言：`test/help.test.mjs:568-571` 断言 `SCENE_DATA_SCHEMA.properties.groups.items.properties.subgroups.items.properties.scenes.minItems === 1`，并有用例「空 `scenes[]` → `schema-invalid`」。
- 运行时实证：空 `scenes[]` → `HelpSchemaError｜code=schema-invalid｜path=/groups/0/subgroups/0/scenes`（R30 一致）。
- 附带核对：该校验器读的是同一份 schema（`help.ts:345`），未自立第二份规则 → R30「同源」成立。

---

## 5. 不一致清单（9 条：5 需修 ＋ 4 记账／nit）

### A 组：需修（3 条高／中 + 2 条中低）

**A1（最严重）同一输入产出不同 HTML —— 模块级可变计数器**

- 证据：`charts.ts:146` `let gradientSeq = 0;`；`charts.ts:1293-1299` `gradientSeq += 1; const id = STYLE_PREFIX + 'chart-grad-' + gradientSeq;`。
- 运行时实证（读 `dist`，同一输入连续两次）：

  ```
  {"sameInputSameHtml":false,"id1":"grad-1","id2":"grad-2", ...}
  ```

- 契约冲突：`docs/base-paint-contract.md:862`「边界判定法：一个能力若「给定输入即可产出确定字符串，且不需要在页面上存活」，归 base-paint」——`charts.progress({pct,options:{gradient:true}})` 目前**不是**确定字符串；且 #96 per-skill HTML 快照门／`FX-10` 的「可执行示例」都会因多次渲染而漂移。
- 测试缺口：`charts.test.mjs:754-761` 只调用一次，未断言「两次相同调用逐字节相同」。
- 建议修法（二选一，签名零改动）：① 序号改为**每次调用内的局部计数器**（`const seq = { n: 0 }` 或函数内变量）；② 由输入内容派生稳定 id（如 `pct`＋颜色摘要）。

**A2（严重）bar 的 stacked／grouped 模式缺 `value` 静默置 0**

- 证据：`charts.ts:169-175`（`mode === 'values'` 时只校验 `values`）＋ `charts.ts:188-190` `value: mode === 'values' ? (isNum(value) ? value : 0) : …`；代码注释 `charts.ts:155-157` 自述以旧 `_barMulti` 行为为据。
- 运行时实证：`charts.bar({items:[{label:'A',values:[1,2]}],options:{stacked:true}})` → **不抛错**，正常产出（`barStackedNoValue:true`）。
- 契约冲突：`docs/base-paint-contract.md:799`「`items` 非数组／缺 `label`／`value` 非法（非数且非 null）→ 抛 `ChartError` code `structure-invalid`」；`ChartItem.value` 在冻结类型里是**必填**（`spec/charts.ts:15`）。
- 建议修法：multi 模式仍要求 `value` 为 `number | null`（缺失／非法即 `structure-invalid`）；若坚持旧语义，必须在票面与 §3.5.1 登记「multi 模式以 `values` 为唯一真相源，`value` 不参与校验」，否则验收者按 doc:799 判红。

**A3（中）类名命名空间 `ilife-chart*` 与 R3 预留的 `ilife-charts*` 不符**

- 证据：`charts.ts:260` `STYLE_PREFIX + 'chart'`、`:285` `'chart-svg'`、`:297` `'chart-' + kind`、`chartsCss`（`:1635-1662`）全部用 `.ilife-chart*`。
- 运行时实证：`chartClass = { singular: true, plural: false }`（`ilife-chart-bar` 命中，`ilife-charts` 未命中）。
- 裁定冲突：`.scratch/t78/ARCHITECT-RULINGS.md:32`「`CONTROL_STYLE_SECTIONS` 的 `'charts'` 项（#75 冻结面）是**类名命名空间预留**（`ilife-charts*`）」；同票 A2 的 `help.ts:83` 恰恰按「`STYLE_PREFIX` ＋ 区名 kebab」得 `ilife-help-shell`（运行时实证 `shellClass: true`）——**同一票内两种口径**。
- 影响面：`chartsCss` 与 charts HTML 前缀一致，故**图表自身功能不受影响**；风险在 #75 若按 `CONTROL_STYLE_SECTIONS` 区名生成 `.ilife-charts*` 样式区（R12 要求「复用同一份文本」可规避，但 R3 的措辞会误导）。
- 建议修法：① 把类根改为 `ilife-charts`（改动面小、与 R3 及 help.ts 口径统一）；或 ② 更正 R3 措辞为「命名空间＝`ilife-chart*` 前缀族」并在 #75 交接里写明。

**A4（中低）`help.ts` 的 `CONTROL_STYLE_SECTIONS` 是未使用 import，且注释与实现不符**

- 证据：`help.ts:54` `import { CONTROL_STYLE_SECTIONS } from './spec/style.js';`——全文再无值级使用（仅 `:16`／`:22` 注释提及）；实际类根由 `help.ts:79` 的**字面量** `const HELP_SECTION: ControlStyleSection = 'helpShell';` ＋ `:83` 派生。注释 `:15-16` 称「类名命名空间**恒读** `CONTROL_STYLE_SECTIONS` 的 `helpShell` 项」，与实现不符（只是靠 `ControlStyleSection` 类型锁形）。
- 为何不红：`tsconfig.base.json:3-14` 未开 `noUnusedLocals`。
- 建议修法：改成 `CONTROL_STYLE_SECTIONS.includes(HELP_SECTION)`（真·恒读）或删除该 import 并把注释改为「区名由 `ControlStyleSection` 类型锁形」。

**A5（中低）`chartsCss(prefix)` 把调用方 `prefix` 原样插入 CSS**

- 证据：`charts.ts:1629-1663` `const p = prefix;` 后直接拼进 `.` + p + `chart{…}`；无字符集校验、无转义。入参来自公开面 `ChartsHelpersInput.prefix`（`spec/charts.ts:263`）。
- 对照先例：#76 的同类入参经 `jsStr()`（`JSON.stringify`）进 JS 字符串（`controls.ts:494-498`），不会破坏语法；charts 这条是 CSS 上下文，`prefix` 含 `}`／`;`／`<` 即可破坏 `<style>` 内容。
- 建议修法：加白名单校验（如 `/^[a-z][a-z0-9-]*-$/`），非法即回退 `STYLE_PREFIX` 或抛 `structure-invalid`（需在票面登记口径）。

### B 组：记账／nit（4 条，非缺陷但应收口）

**B1 `empty === true` 不保证 `emptyState` 产物**：`charts.ts:996` `empty: points === 0`；全 null 的 line 实测 `{"empty":true,"points":0,"hasEmptyState":false}`——`docs/base-paint-contract.md:795` 的「空数组 → `renderEmptyState` 联动」与「`points === 0` 时 `empty === true`」两分句在此点留歧义（测试 `charts.test.mjs:573` 与 `:962-964` 分别钉住两半，互不冲突）。建议票面记账：「`empty` 仅表示 `points === 0`，不承诺 emptyState HTML」。

**B2 `help.ts:451` 渲染字面量 `'待开发'`**（冻结值为 `'【待开发】'`；比较已用 `SCENE_STATUS[1]`，`:450`）。徽章文案非冻结面，记账即可。

**B3 `charts` 的类型是断言而非结构校验**：`charts.ts:1615-1623` `as ChartsApi` ＋ 派发表 `(input: unknown) => ChartOutput`（`:1597`）→ 8 方法的具体入参类型编译期不校验。R15 要求 Proxy 语义，**接受**，但建议在证据里写明「签名一致靠导出类型断言 ＋ 运行时 `structure-invalid`」。

**B4 格式 nit**：`charts.ts:1088` `} else if (grouped) {    const values: number[] = [];` 单行合并（缺换行）。

---

## 6. 复跑命令（只读）

**红线扫描**：见 §2.1 的 PowerShell 片段（三段，可整段粘贴；输出应为 `0／0／0／0`）。

**运行时实证**（在 `pnpm build` 之后，只读加载 `dist`；本预审实际运行的两个脚本）：

```powershell
$js = @'
import('./packages/base-render/dist/index.js').then((M) => {
  const C = M.charts;
  const a = C.progress({ pct: 40, options: { gradient: true } }).html;
  const b = C.progress({ pct: 40, options: { gradient: true } }).html;
  const id1 = (a.match(/grad-\d+/) || [])[0];
  const id2 = (b.match(/grad-\d+/) || [])[0];
  let barMulti;
  try { barMulti = C.bar({ items: [{ label: 'A', values: [1, 2] }], options: { stacked: true } }).html.includes('chart-seg'); } catch (e) { barMulti = 'THREW ' + e.code; }
  let allNull;
  try { const o = C.line({ items: [{ label: 'A', value: null }] }); allNull = { empty: o.empty, points: o.points, hasEmptyState: o.html.includes('empty-text') }; } catch (e) { allNull = 'THREW ' + e.code; }
  let unknownKind;
  try { C['pie']({}); unknownKind = 'NO THROW'; } catch (e) { unknownKind = e.name + '/' + e.code; }
  console.log(JSON.stringify({ sameInputSameHtml: a === b, id1, id2, keys: Object.keys(C), barStackedNoValue: barMulti, lineAllNull: allNull, unknownKind }));
});
'@
node -e $js
```

实测输出（2026-09-09，`dist` 04:32:16 构建）：

```
{"sameInputSameHtml":false,"id1":"grad-1","id2":"grad-2","keys":["bar","line","donut","progress","combo","sparkline","gauge","scatter"],"barStackedNoValue":true,"lineAllNull":{"empty":true,"points":0,"hasEmptyState":false},"unknownKind":"ChartError/kind-unknown"}
```

```powershell
$js = @'
import('./packages/base-render/dist/index.js').then((M) => {
  const data = { skill_name: 'k', title: 'T', groups: [{ id: 'g1', label: 'G', subgroups: [{ id: 's1', label: 'S', scenes: [{ id: 'sc1', title: 'T', wake_word: 'W', status: '', prompt_template: 'P' }] }] }] };
  const assets = { sharedCssText: 'CSS', sharedHelpersJs: 'JS' };
  const html = M.renderHelpShell({ sceneData: data, assets }).html;
  const cnt = (s, re) => (s.match(re) || []).length;
  const res = { docStart: html.slice(0, 15), scriptCount: cnt(html, /<script/g), payload: cnt(html, /id=.payload./g), shellClass: html.includes('ilife-help-shell'), markersLeft: cnt(html, /<!--/g) };
  let emptyScenes;
  try { const d2 = JSON.parse(JSON.stringify(data)); d2.groups[0].subgroups[0].scenes = []; M.renderHelpShell({ sceneData: d2, assets }); emptyScenes = 'NO THROW'; } catch (e) { emptyScenes = e.name + '|' + e.code + '|' + e.path; }
  res.emptyScenes = emptyScenes;
  const bar = M.charts.bar({ items: [{ label: 'A', value: 1 }] }).html;
  res.chartClass = { singular: bar.includes('ilife-chart-bar'), plural: bar.includes('ilife-charts') };
  console.log(JSON.stringify(res, null, 1));
});
'@
node -e $js
```

实测输出：

```
{
 "docStart": "<!DOCTYPE html>",
 "scriptCount": 2,
 "payload": 1,
 "shellClass": true,
 "markersLeft": 0,
 "emptyScenes": "HelpSchemaError|schema-invalid|/groups/0/subgroups/0/scenes",
 "chartClass": { "singular": true, "plural": false }
}
```

**FX-6 复核**：

```powershell
Get-ChildItem packages\base-render\dist\scene-data.schema.json, packages\base-render\scene-data.schema.json -ErrorAction SilentlyContinue
Test-Path packages\base-render\dist\scene-data.schema.json   # → False
Test-Path packages\base-render\scene-data.schema.json        # → False
```

---

## 7. 预审结论（供施工者收尾）

- **可以放行的部分**：5 条冻结签名逐字一致；红线扫描 0 违规；三处同步（清单／文档／`test-d`）已逐字一致；出口面恰好 3 个；FX-6／R11／R13／R15／R31 均已满足并有运行时实证。
- **收尾前必须处理的 3 条**：A1（确定性）、A2（multi 模式结构校验）、A3（类名命名空间与 R3 措辞）。
- **建议一并处理**：A4（未使用 import ＋ 注释不符）、A5（`prefix` 校验）。
- **记账即可**：B1–B4。
- 本预审**未**评判选项级语义 parity（R9 的 V2 职责）、未评判变异测试鉴别力（V3 职责）、未跑门禁（`pnpm build`／`boundaries`／`test:types`／`test` 由编排者执行）。
