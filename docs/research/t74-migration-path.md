# #74 · D4 迁移路径（5 技能：**只写路径，不执行**）

- **口径（施工单 v2 §0／§4.3 红线）**：本票只动 `packages/base-render`。本文件是**路径**，
  不含任何技能包改动（模板／`package.json`／`src/render/*` 一律未动）；执行归各技能自己的地图。
- **契约依据**：§3.1.2④ 包裹约定（资产裸文本 ＋ 填充器包裹）、§6.1「迁移方向」与
  「数据页 6 的迁移面边界」（FX-118-4）、§4.4 #107、§3.3 AC-14（`escapeHtml` 归一）。
- **复跑自证**：`node tooling/classify-templates.mjs --inventory`（65 模板 = 数据页 6／内容页 53／遗留 6）
  ＋ 本票 D3 用例 `packages/base-render/test/template.test.mjs` 的 A8／A9（真实 53 内容页 ＋ 6 数据页 ＋ 6 遗留模板）。
- **范围说明**：「其余 5 技能」= `skill-bill`／`skill-chef`／`skill-home`／`skill-schedule`／`skill-memo-ilife`
  （各有执行路径）；第 6 个技能 `skill-calorie` 的 6 个模板是**契约外遗留资产**，按 §6.1③ **不动**、归 **#107**
  （本文件 §3.2 只登记现状，不写动作）。

## 1. 目标形态（一句话）

技能包不再持有任何**私有填充器／私有标记常量／私有转义实现**；页面 HTML 一律
`fillTemplate({ template, assets, content } | { template, assets, data, strict? })`，
`assets` 由 #75（`sharedCssText`）／#76（`sharedHelpersJs`）／#78（`chartsHelpersJs`）的产出者提供（当前 **pending**）。

### 1.1 资产替换面（FX-74-7 必修：**不是**字节中性）

> §2.1 动作 3 的「字节不变」**只**指**包裹动作**（裸资产文本 → 填充器补 `<style>`／`<script>`）
> 与 `escapeHtml` 归一（技能侧本地副本同为五字符）。**资产内容替换是另一回事**：一旦 #75／#76
> 提供统一资产，技能输出**必然变化**——文档旧版只声明「包裹字节中性」，低估了影响面。

- **现状：私有 CSS 有 2 个变体**（本票独立复算：逐文件从 `src/render/html.ts` 取字符串字面量、比长度与 SHA）：

| 变体 | 技能（落点） | 字符数 | 特征 |
|---|---|---|---|
| A | `skill-bill`（`src/render/html.ts:57`）／`skill-chef`（`:72`） | **440** | 含 `.amt{font-weight:700}` |
| B | `skill-home`（`:63`）／`skill-schedule`（`:66`） | **419** | 无该规则；与 A 的**首个差异位 = 260** |

- **私有 HELPERS 只有 1 个变体**（bill／chef／home／schedule 四家同值，**145** 字符）——族间无差异，
  但 #76 的 `buildSharedHelpersJs()` 是**新实现**，其输出是否逐字等于该 145 字符串**未证明**（产出者仍 `pending`）
  → 同样按「可能变字节」对待。
- **CSS 侧必然变字节**：`buildStyleSheet().css`（#75）是**单一正本**，不可能同时等于 A 与 B →
  **至少一族技能的 CSS 输出字节改变**（A 族 440 → 新值，或 B 族 419 → 新值；视觉可能随之变化，
  典型是 `.amt` 的字重规则有无）。受影响技能 = **bill／chef／home／schedule 全部 4 家**（memo 无私有 CSS 常量）。
- **谁批准**：资产正本归 **#75**（产出者 owner）；「技能输出字节改变」由 **#96 per-skill HTML 快照门**守门
  （该门在仓内**尚未实现**，见 §6 D4-5）＋ **各技能自己的迁移地图 owner** 在迁移批次内记录并批准差异。
  本票（#74）**只声明影响面，不做替换、不批准任何差异**。
- **下游防呆**：迁移后「输出零变化」**只对包裹与转义成立**，**不对资产内容成立**；
  任何「迁移后 HTML 逐字节不变」的断言在 CSS 侧**必假**。

## 2. 逐技能路径

### 2.1 skill-bill（内容页 16；**生产调用**）

现状证据：私有标记常量 `src/render/html.ts:53-55`；私有 `SHARED_CSS`（:57，裸 CSS）、
`SHARED_HELPERS`（:58，**自带 `<script>` 包裹**）；私有 `fillTemplate`（:60-70，CSS 用 `<style>` 包、
HELPERS **裸注入**）；私有 `escapeHtml`（:7）；私有错误码 `BILL_MARKER_INVALID`（:63）；
生产调用 `src/cli/cmd_read.ts:450`；模板 16 个（`SHARED-CSS`@6／`CONTENT`@12／`SHARED-HELPERS`@14，**全裸标记**）。

动作（**模板零改动**）：

1. 删 `SHARED_CSS_MARKER`／`SHARED_HELPERS_MARKER`／`CONTENT_MARKER`／`SHARED_CSS`／`SHARED_HELPERS`／
   `fillTemplate`／`escapeHtml` 与 `BILL_MARKER_INVALID`；同步删 `src/render/index.ts:3` 的再导出。
2. `cmd_read.ts:450` 改 `fillTemplate({ template: loadTemplate(templateFor(o.key)), assets, content: section })`。
3. **HELPERS 去包裹**：私有常量若保留过渡，必须**去掉自带 `<script>`**（裸 JS），由填充器按
   `ASSET_WRAPPERS.sharedHelpersJs` 包裹——否则触发不变量① `asset-missing`（D3 已断言该谓词）。
   CSS 侧无需动作：私有 CSS 本为裸文本，填充器 `<style>` 包裹后**字节不变**（此句**只**指包裹动作；
   **资产内容替换的字节影响见 §1.1**，不可读作「迁移后输出零变化」）。
4. `package.json` 的 `dependencies` 增 `"base-paint": "^0.1.0"`（现只有 `base-link-core`；
   `createEnvelope`／`parseEnvelope` 仍走 base-link-core，故它继续留在 `dependencies`）。
5. 测试 `test/render.test.mjs:37-38` 改断言契约错误码（`TemplateError.code`），不再断言 `BILL_MARKER_INVALID`；
   **同步改导入面**：`test/render.test.mjs:3` 从 `../dist/index.js` 导入的 `fillTemplate`（及两标记常量）
   将随删除而消失，须一并改为导入 `base-paint` 的 `fillTemplate`／`TemplateError`（FX-74-9②）。

### 2.2 skill-schedule（内容页 8；**生产调用**）

现状：`src/render/html.ts:62-64` 三标记常量；`:66` 私有 `SHARED_CSS`（裸）；`:67` 私有 `SHARED_HELPERS`
（自带 `<script>`）；`:69-79` 私有 `fillTemplate`（CSS 包 `<style>`）；`:7` 私有 `escapeHtml`；
错误码 `SCHEDULE_MARKER_INVALID`（:72）；生产调用 `cmd_read.ts:286`；模板 8 个（同 6/12/14 位置、裸标记）。

动作：同 §2.1（1–5），行号对应为 `:62-64`／`:66`／`:67`／`:69-79`／`:72`、`cmd_read.ts:286`、
测试 `test/render.test.mjs:79,84`。

### 2.3 skill-home（内容页 21；**生产调用**）

现状：`src/render/html.ts:59-61` 三标记常量；`:63` 私有 `SHARED_CSS`（裸）；`:64` 私有 `SHARED_HELPERS`
（自带 `<script>`）；`:66-76` 私有 `fillTemplate`；`:8` 私有 `escapeHtml`；错误码 `HOME_MARKER_INVALID`（:69）；
生产调用 `cmd_read.ts:721`；模板 21 个（同位置、裸标记）。

动作：同 §2.1（1–5），行号对应为 `:59-61`／`:63`／`:64`／`:66-76`／`:69`、`cmd_read.ts:721`、
测试 `test/render.test.mjs:80,85`。

### 2.4 skill-chef（内容页 8；**生产零调用**）

现状：`src/render/html.ts:68-70` 三标记常量；`:72` 私有 `SHARED_CSS`（裸）；`:73` 私有 `SHARED_HELPERS`
（自带 `<script>`）；`:75-85` 私有 `fillTemplate`；`:7` 私有 `escapeHtml`；错误码 `CHEF_MARKER_INVALID`（:78）；
**生产链不经模板**（`cmd_read.ts:373` 直出 `renderEnvelopeHtml` 裸 `<section>`，:374-375 落盘）；
8 个模板在生产链上未使用（仅 `test/render.test.mjs:53,55` 覆盖）。

动作：同 §2.1（1–5），**外加**一条**登记项**：chef 的 8 个模板是「有模板、无生产接线」的资产，
迁移后仍无回归基线——须在接线或显式弃用时另开票（本票只登记，不判断去留）。
（导入面在 `test/render.test.mjs:6`——同 §2.1 动作 5 口径，须一并改；FX-74-9②。）

### 2.5 skill-memo-ilife（数据页 6；**生产零调用**）

现状：`src/render/html.ts:52-53` 两标记常量；`:55-62` 私有 `fillSharedMarkers(template, css, helpers)`
（**原样注入、不包标签**，:61）；无私有 CSS／HELPERS 常量（内容由调用方给）；`:8` 私有 `escapeHtml`；
错误码 `MEMO_MARKER_INVALID`（:58）；生产链不经模板（`cmd_read.ts:133` 直出裸 `<section>`）；
6 个模板**模板自带包裹**（见 §3.1）。

动作（**模板动作 ＋ 代码动作**）：

1. 模板去包裹（§3.1 的 12 处 `before → after`）——这是本技能唯一模板改动，**本票只写不执行**。
2. 删 `fillSharedMarkers`／两标记常量／私有 `escapeHtml`／`MEMO_MARKER_INVALID`；**同步删再导出**
   `src/render/index.ts:3`——它再导出 `escapeHtml`／`SHARED_CSS_MARKER`／`SHARED_HELPERS_MARKER`／
   `fillSharedMarkers`（与 §2.1 动作 1 同口径；**漏删则 `tsc` 必红**，FX-74-6 必修）。
   调用点改 `fillTemplate({ template, assets, data })`（数据页：`data` 必填、`content` 忽略）——
   注意 memo **生产链零调用**，此处实指**测试调用**（`cmd_read.ts:133` 直出裸 `<section>`）；
   另注 `src/render/index.ts:4` 只导出 `MEMO_TEMPLATES, loadTemplate`（**无 `templateFor`**），
   勿照抄内容页的 `templateFor` 写法（FX-74-9⑦）。
3. `assets` 由 **#75／#76** 产出者提供（memo 无私有资产常量，`src/render/html.ts:52-61` 只收调用方参数）；
   产出者落地前无法端到端接线（FX-118-4）。
4. **生产接线不属 #74**（FX-118-4 裁定）：`cmd_read.ts:133` 直出裸 `<section>` 的形态归 memo 自己的地图。
5. 测试 `test/render.test.mjs:49,52` 改契约错误码；**同步改导入面** `test/render.test.mjs:3`
   （从 `../dist/index.js` 导入 `escapeHtml`／`fillSharedMarkers`／两标记常量——被删项必须一并去掉）；
   **并删 `test/render.test.mjs:37-39`**（本地 `escapeHtml` 的 5 字符单测：`:37` 逐值断言、`:39` 代理对原样；
   随私有副本删除而失效，转由 base-paint 侧签名测试覆盖，AC-14）。
   模板级自证可用本票 D3 的 A8 用例
   （它已对 memo 6 模板**在内存里**执行去包裹并断言「迁移前必抛 `marker-conflict`、迁移后零残留」）。

## 3. 12 处预包裹（6 模板 × 2 标记）的去包裹动作（逐条）

> **计数口径（FX-74-9⑥）**：本节标题旧版写「12 个预包裹模板」，实为 **12 处**（memo 6 个模板 × 每模板 2 个标记）。
> calorie 另有 **6 处**（6 模板 × 1 处 `SHARED-CSS`，见 §3.2，按 #107 不动）→ 全仓预包裹合计 **18 处**。

**动作定义（机械、逐字）**：把模板里的 `ASSET_WRAPPERS[*].openTag + 标记 + closeTag` 换成**裸标记**：

| 资产 | before（模板自带包裹） | after（裸标记） |
|---|---|---|
| `sharedCssText` | `<style><!--SHARED-CSS--></style>` | `<!--SHARED-CSS-->` |
| `sharedHelpersJs` | `<script><!--SHARED-HELPERS--></script>` | `<!--SHARED-HELPERS-->` |

（`after` 逐字 = `TEMPLATE_MARKERS.sharedCss`／`.sharedHelpers`；包裹由填充器按 `ASSET_WRAPPERS` 补。）

### 3.1 memo-ilife 6 个数据页（**执行路径**，本票只写）

| 模板 | `SHARED-CSS` 行 | `SHARED-HELPERS` 行 |
|---|---|---|
| `change_category.html` | 7 | 111 |
| `init_report.html` | 8 | 108 |
| `memo_query.html` | 7 | 65 |
| `sync_report.html` | 8 | 325 |
| `wish_complete.html` | 7 | 93 |
| `wish_plan.html` | 7 | 96 |

- 行号为 LF 口径（`tooling/classify-templates.mjs` 同口径；与 `docs/research/t118-template-classification.md` 逐条一致）。
- 去包裹后 `<!--INJECT-DATA-->` 仍在其自带容器 `<script id="payload" type="application/json">` 内
  （`memo_query.html:64`／`sync_report.html:324` 等）→ **容器不属不变量②作用域**（FX-118-3 裁定 1），无需改动。
- **迁移前**直接调 `fillTemplate` 必抛 `marker-conflict`（不变量②）；D3 用例已逐文件断言该行为，
  并断言去包裹后 6 个模板填充成功且**零标记残留**。

### 3.2 calorie 6 个模板（**不动**，归 #107）

`diet.html`／`exercise.html`／`goal.html`／`help.html`／`home.html`／`photo-gallery.html` 各 1 处
`<style><!--SHARED-CSS--></style>`（均在 `:7`），无 `INJECT-DATA`／无 `CONTENT`／无容器。
两载荷槽皆无 → `legacy`；直接调 `fillTemplate` **必抛 `marker-missing`**（次序 2 早于其预包裹触发的次序 3），
这是**正确行为**（不该能填）。改造面（补载荷槽 ＋ 自带容器）与并入 HELP 重建归 **#107**。

## 4. `escapeHtml` 归一（AC-14）影响面

- **base-paint 侧已执行**（本票 D5）：`packages/base-render/src/contract.ts` 的 `escapeHtml` 恒读冻结常量
  `ESCAPE_HTML_CHARS`／`ESCAPE_HTML_ENTITIES`（5 字符，`'` → `&#39;`）；签名测试哨兵已翻转。
- **技能侧本地副本（5 份，均为 5 字符，不在本票改动面）**——迁移动作 = 删除并改
  `import { escapeHtml } from 'base-paint'`：

| 技能 | 本地副本落点 | 迁移后 |
|---|---|---|
| `skill-bill` | `src/render/html.ts:7` | 删；改 import base-paint |
| `skill-chef` | `src/render/html.ts:7` | 同上 |
| `skill-home` | `src/render/html.ts:8` | 同上 |
| `skill-schedule` | `src/render/html.ts:7` | 同上 |
| `skill-memo-ilife` | `src/render/html.ts:8` | 同上 |
| `skill-calorie` | **无副本**（`src/render/html.ts:14` 已 `import { cx, escapeHtml, token } from 'base-paint'`） | 无需动作 |

- **calorie 侧字节差异证据**（数据含 `'` 时）：`docs/research/t74-escape-html-calorie-diff.md`
  ＋ 可复跑脚本 `docs/research/t74-escape-html-calorie-diff.mjs`（41 处 `escapeHtml` 调用点；5／5 样本输出字节改变，
  每个 `'` +4 字节；现有资产 0 命中 → 快照零变化）。
- **行号口径（FX-74-9④）**：本表用**声明行**（bill `:7`／chef `:7`／home `:8`／schedule `:7`／memo `:8`）；
  `docs/research/t74-migration-map.md:30` 用**实现体行**（8／8／9／8／9）。两者**各自正确**（声明行 vs 函数体行），
  交叉阅读时勿当作矛盾——取件一律以本表声明行为准。
- **5 技能迁移后 `escapeHtml` 输出零变化（FX-74-9⑧）**：5 份本地副本**同为五字符**（`& < > " '`，
  `'` → `&#39;`），与 base-paint 归一后逐值一致 → 仅换实现，**输出字节不变**（数据含 `'` 时两侧都写 `&#39;`）。
- **base-paint 侧另一处同实现消费面（FX-74-9⑧）**：`packages/base-render/src/contract.ts:47`（`renderPage`）／
  `:57`（`renderReco`）也走同一 `escapeHtml`——仓内**0 消费方**（无调用方），故归一对其影响为空；
  此处登记，避免日后误判为「未覆盖路径」。
- **删除顺序（FX-74-9⑤）**：本地副本删除必须与 base-paint 归一在**同一迁移批次**（各技能地图执行时）完成，
  否则同名两实现并存会再漂移（AC-14 owner 单一化）。**本票红线只动 `packages/base-render`**，
  故「同批」在当前票内**不可满足**——必然存在两实现**并存窗口**（行为等价、无功能漂移，仅未来漂移风险），
  该窗口由 §6 D4-2／D4-7 承接。

## 5. 执行前置与验收

- **前置（跨票）**：三个资产产出者 `buildStyleSheet`（#75）／`buildSharedHelpersJs`（#76）／
  `buildChartsHelpersJs`（#78）当前 **pending**；#74 已用**自造合法 fixture 资产**完成实现与自证
  （契约 §6.1「跨票产出者依赖」），但**技能侧端到端接线须待产出者落地**。
- **验收（每个技能）**：① 模板零改动（memo 除外，仅去包裹）＋ ② 产出 HTML 零契约标记残留
  ＋ ③ `escapeHtml` 无本地副本 ＋ ④ #96 per-skill HTML 快照门通过（**该门在仓内尚未实现**，见
  `docs/research/t74-migration-map.md` §4：现只有正则级断言；逐字节「HTML 未变」当前无法证明）。
- **④ 的口径修订（FX-74-7）**：④ 的「HTML 未变」**只对包裹与转义成立**——**资产内容替换（§1.1）必然改字节**，
  故须读作「**除 CSS 资产内容外**逐字节未变」；CSS 侧差异由 #96 快照门守门 ＋ 各技能地图 owner 显式批准，
  **不得**当作回归失败，也**不得**当作「零差异」而省略批准。
- **自证命令**：`node tooling/classify-templates.mjs --inventory`；`node --test packages/base-render/test/template.test.mjs`。

## 6. 登记项（本票不处置，不默默略过）

| # | 登记项 | 归属 |
|---|---|---|
| D4-1 | 5 技能 `package.json` 增 `base-paint` 依赖 ＋ 发布链可达性（`exports` 只有 `"."`） | 各技能地图／#95 |
| D4-2 | 5 份技能侧 `escapeHtml` 副本删除 ＋ 技能测试断言面切换（`*_MARKER_INVALID` → `TemplateError.code`） | 各技能地图／#96 |
| D4-3 | chef 8 模板「有模板、无生产接线」的回归基线 | chef 地图（本票只登记） |
| D4-4 | memo 生产接线（`cmd_read.ts:133` 直出裸 `<section>`） | memo 地图（FX-118-4：**不属 #74**） |
| D4-5 | #96 per-skill HTML 快照门缺失 → 迁移无逐字节基线 | #96 |
| D4-6 | calorie 6 遗留模板的载荷槽改造与并入 HELP 重建 | #107 |
| D4-7 | 两实现并存窗口（本地副本删除与 base-paint 归一不同批；本票红线内不可满足，见 §4） | 各技能地图（行为等价，仅漂移风险） |
| D4-8 | 资产替换的字节／视觉影响（CSS 两个变体，见 §1.1）的差异批准与快照更新 | #75（资产正本）／#96（快照门）／各技能地图 |
