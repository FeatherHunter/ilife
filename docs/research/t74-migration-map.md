# #74 现状取证 · 技能侧迁移地图

> 只读取证产物。证据一律 `文件:行号`；源码引用不超过 5 行。取证时间基线：工作区当前 HEAD（未做任何写操作，除本文件）。
> 契约正本：`docs/base-paint-contract.md` §3.1（`:144-183`）；冻结面：`packages/base-render/src/spec/index.ts:46-60`（`ticket: '#74'` 共 15 条）。

## 0. 结论速览

- `skill-bill`：私有 `SHARED_CSS`/`SHARED_HELPERS` + `fillTemplate(template, contentHtml)`，**生产调用**（`src/cli/cmd_read.ts:450`），3 标记（含契约没有的 `<!--CONTENT-->`）。
- `skill-schedule`：同上结构，生产调用（`cmd_read.ts:286`），3 标记。
- `skill-home`：同上结构，生产调用（`cmd_read.ts:721`），3 标记。
- `skill-chef`：常量与 `fillTemplate` 齐备（`html.ts:68-85`），但**生产零调用**——CLI 只出 `renderEnvelopeHtml` 裸 `<section>`（`cmd_read.ts:372-376`）；8 个模板在生产链上未使用。
- `skill-memo-ilife`：`fillSharedMarkers(template, css, helpers)`（`html.ts:55-62`）**生产零调用**；6 个模板的 `<!--INJECT-DATA-->` 全仓无填充者。
- `skill-calorie`：`src/**` 对 `SHARED*` **零命中**，无填充函数，HTML 走 `pageShell` 直串拼接（`src/render/html.ts:37-44`）；6 个模板在 `src/**` 中零引用。
- **最大风险（3 条）**：① 契约 5 标记里**没有 `<!--CONTENT-->`**，而 53 个模板靠它装正文（bill16+chef8+home21+schedule8）；② 这 53 个模板**无 `<!--INJECT-DATA-->`/无自带容器**，按契约直接调 `fillTemplate` 必抛 `marker-missing`/`container-missing`；③ 契约要求的 **#96 per-skill HTML 快照回归门在仓库中不存在**（`docs/base-paint-contract.md:687` vs 全仓无快照文件），迁移后**无法逐字节证明「5 技能 HTML 未变」**。

## 1. 六技能填充实现对照表

| 技能 | 私有常量（文件:行号 / 内容） | 填充函数（签名 + 实现 + 错误码） | 调用点 | 标记使用 | 迁移难度 |
|---|---|---|---|---|---|
| skill-bill | `src/render/html.ts:53-55` `SHARED_CSS_MARKER`/`SHARED_HELPERS_MARKER`/`CONTENT_MARKER`；`:57` `SHARED_CSS`（单行，440 字符，首 2 行即 1 行）；`:58` `SHARED_HELPERS`（145 字符，`<script>function copyItem(id){...}`） | `fillTemplate(template: string, contentHtml: string): string`（`:60-70`）；`split(m).length-1 !== 1` 校验 3 标记 → `throw BillRenderError('BILL_MARKER_INVALID')`；替换用 `split().join()`，CSS **包 `<style>`**、HELPERS 原样（`:67-68`） | **生产**：`src/cli/cmd_read.ts:450`；测试：`test/render.test.mjs:37-38` | 3 标记；`<!--CONTENT-->` 有；`INJECT-DATA`/`NO-SHARED`/`CHARTS-HELPERS` 0 | 中—高（CONTENT 无契约槽位） |
| skill-schedule | `html.ts:62-64` 3 个 MARKER；`:66` `SHARED_CSS`（419 字符，比 bill/chef 少 `.amt{font-weight:700}`）；`:67` `SHARED_HELPERS`（145 字符） | `fillTemplate(template, contentHtml): string`（`:69-79`）；同型 split/join；`ScheduleRenderError('SCHEDULE_MARKER_INVALID')`；CSS 包 `<style>`（`:76`） | **生产**：`cmd_read.ts:286`；测试：`test/render.test.mjs:79,84` | 3 标记；`CONTENT` 有 | 中—高 |
| skill-home | `html.ts:59-61` 3 个 MARKER；`:63` `SHARED_CSS`（419 字符）；`:64` `SHARED_HELPERS`（145 字符） | `fillTemplate(template, contentHtml): string`（`:66-76`）；同型；`HomeRenderError('HOME_MARKER_INVALID')`；CSS 包 `<style>`（`:73`） | **生产**：`cmd_read.ts:721`；测试：`test/render.test.mjs:80,85` | 3 标记；`CONTENT` 有 | 中—高 |
| skill-chef | `html.ts:68-70` 3 个 MARKER；`:72` `SHARED_CSS`（440 字符）；`:73` `SHARED_HELPERS`（145 字符） | `fillTemplate(template, contentHtml): string`（`:75-85`）；同型；`ChefRenderError('CHEF_MARKER_INVALID')`；CSS 包 `<style>`（`:82`） | **零生产调用**（`src/**` 无命中）；仅 `test/render.test.mjs:53,55`。生产 CLI 走 `renderEnvelopeHtml`（`cmd_read.ts:373`） | 3 标记（8 模板全含）；生产链不使用模板 | 高（模板是死资产，改造无回归基线） |
| skill-memo-ilife | `html.ts:52-53` 只有 2 个 MARKER；**无默认 CSS/HELPERS 常量**（内容由调用方给） | `fillSharedMarkers(template: string, css: string, helpers: string): string`（`:55-62`）；2 标记校验 → `MemoRenderError('MEMO_MARKER_INVALID')`；`split().join()` **原样注入、不包 `<style>`/`<script>`**（`:61`） | **零生产调用**；仅 `test/render.test.mjs:49,52`。生产 CLI 走 `renderEnvelopeHtml`（`cmd_read.ts:133`） | 6 模板各 `INJECT-DATA`×1 + `SHARED-CSS`×1 + `SHARED-HELPERS`×1；`CONTENT` 0 | 高（`INJECT-DATA` 无填充者） |
| skill-calorie | **无**：`src/**` 对 `SHARED_CSS|SHARED_HELPERS|SHARED_*` 零命中 | **无填充函数**；HTML 由 `pageShell(skill, slot, title, body)`（`src/render/html.ts:37-44`）字符串直拼，`import { cx, escapeHtml, token } from 'base-paint'`（`:14`） | 生产：`src/cli/cmd_read.ts:216,231,254,264,277` 产 `html`，`:672` `writeFileSync(o.html, out.html)` | 6 模板各 `SHARED-CSS`×1@7 + `SHARED-HELPERS`×1@37；无 `INJECT-DATA`/`CONTENT`；模板在 `src/**` 零引用 | 高（模板死资产；见 §6-8） |

补充事实（跨技能）：
- `<!--NO-SHARED-->` 与 `<!--CHARTS-HELPERS-->` 在 `packages/**`（源码 + 模板）**0 命中**（与 `docs/base-paint-contract.md:86` 的「实测 0 命中」一致）。
- 5 份私有错误码并存：`BILL_MARKER_INVALID`/`SCHEDULE_MARKER_INVALID`/`HOME_MARKER_INVALID`/`CHEF_MARKER_INVALID`/`MEMO_MARKER_INVALID`（各 html.ts 内），契约侧只有 `TEMPLATE_ERROR_CODES` 7 个（`spec/template.ts:74-82`）。
- 各技能 `escapeHtml` 转义 **5 字符**（`& < > " '`：`skill-bill/src/render/html.ts:8`、`skill-chef:8`、`skill-home:9`、`skill-schedule:8`、`skill-memo-ilife:9`）；base-paint 的 `escapeHtml` 只转 **4 字符**（`packages/base-render/src/contract.ts:31-32`）。契约把「4→5 字符归一」的执行权给 #74（`docs/base-paint-contract.md:725`）。

## 2. 模板资产清单

共 **65** 个 `packages/skill-*/templates/*.html`。行数/标记为逐文件实测。

### skill-bill（16 个，全部 16 行；`SHARED-CSS`@6、`CONTENT`@12、`SHARED-HELPERS`@14）
`packages/skill-bill/templates/account_query.html` 16 行 | `account_write.html` 16 | `analysis_compare.html` 16 | `analysis_overview.html` 16 | `analysis_trend.html` 16 | `goal_query.html` 16 | `goal_write.html` 16 | `help.html` 16 | `link_submit.html` 16 | `record_add.html` 16 | `record_detail.html` 16 | `record_range.html` 16 | `record_search.html` 16 | `record_today.html` 16 | `record_update.html` 16 | `setup_run.html` 16

结构样例（`record_today.html:6,12,14`）：`<!--SHARED-CSS-->` 独占一行在 `<head>` 内；`<!--CONTENT-->` 在 `.page` 内；`<!--SHARED-HELPERS-->` 在 `</body>` 前。

### skill-chef（8 个，全部 16 行；`SHARED-CSS`@6、`CONTENT`@12、`SHARED-HELPERS`@14）
`cooking_run.html` 16 | `help.html` 16 | `history_query.html` 16 | `history_record.html` 16 | `recipe_search.html` 16 | `recipe_view.html` 16 | `recipe_write.html` 16 | `shopping_query.html` 16

### skill-home（21 个，全部 16 行；`SHARED-CSS`@6、`CONTENT`@12、`SHARED-HELPERS`@14）
`care_query.html` 16 | `care_receipt.html` 16 | `help.html` 16 | `inventory_records.html` 16 | `inventory_round.html` 16 | `item_detail.html` 16 | `item_receipt.html` 16 | `item_search.html` 16 | `item_update_receipt.html` 16 | `location_query.html` 16 | `location_receipt.html` 16 | `outfit_pick.html` 16 | `shopping_query.html` 16 | `shopping_receipt.html` 16 | `stats_alert.html` 16 | `stats_overview.html` 16 | `tag_query.html` 16 | `tag_receipt.html` 16 | `ticket_query.html` 16 | `ticket_receipt.html` 16 | `trip_receipt.html` 16

### skill-schedule（8 个，全部 16 行；`SHARED-CSS`@6、`CONTENT`@12、`SHARED-HELPERS`@14）
`help.html` 16 | `plan_day.html` 16 | `plan_receipt.html` 16 | `record_compare.html` 16 | `record_day.html` 16 | `record_detail.html` 16 | `record_range.html` 16 | `record_receipt.html` 16

### skill-calorie（6 个，全部 40 行；`SHARED-CSS`@7、`SHARED-HELPERS`@37；**无 `INJECT-DATA`、无 `CONTENT`、无自带 payload 容器**）
`diet.html` 40 | `exercise.html` 40 | `goal.html` 40 | `help.html` 40 | `home.html` 40 | `photo-gallery.html` 40

- `home.html:7` `<style><!--SHARED-CSS--></style>`（**模板自带 `<style>` 包裹**）；`:37` `<!--SHARED-HELPERS-->` 裸标记，紧接 `:38` 自写 `<script>function copyData(){...}`。
- `src/**` 对这 6 个文件名零引用（`templates/` 在 calorie `src` 仅出现在 `src/triggers/scene-*.ts` 的 JSON 数据里，且引用的 49 个模板名**不含这 6 个**，如 `templates/home_dashboard.html`×9、`templates/crud_receipt.html`×49）→ 6 模板是死资产（与 `docs/base-paint-contract.md:723` 登记一致）。

### skill-memo-ilife（6 个；每个含 `INJECT-DATA`×1 + `SHARED-CSS`×1 + `SHARED-HELPERS`×1）
| 模板 | 行数 | INJECT-DATA | SHARED-CSS | SHARED-HELPERS |
|---|---|---|---|---|
| `memo_query.html` | 104 | @64 | @7 | @65 |
| `sync_report.html` | 512 | @324 | @8 | @325 |
| `wish_plan.html` | 272 | @95 | @7 | @96 |
| `wish_complete.html` | 239 | @92 | @7 | @93 |
| `change_category.html` | 257 | @110 | @7 | @111 |
| `init_report.html` | 225 | @107 | @8 | @108 |

- 容器形态逐字：`memo_query.html:64` `<script id="payload" type="application/json"><!--INJECT-DATA--></script>`（与契约 `docs/base-paint-contract.md:158` 引用一致）。
- `SHARED-CSS` 已被模板自带 `<style>` 包裹（`memo_query.html:7`），`SHARED-HELPERS` 已被自带 `<script>` 包裹（`:65`）→ 与 §1 中 5 技能「填充器负责包标签」的约定**相反**。
- 数据消费方存在：`memo_query.html:69` `var raw=document.getElementById("payload");`。

## 3. 渲染链路

- **skill-bill**：CLI 解析 `--html`（`src/cli/cmd_read.ts:418`）→ `renderEnvelopeHtml(env)`（`:449`）→ `fillTemplate(loadTemplate(templateFor(o.key)), section)`（`:450`）→ `assertHtmlSize`（`:451`）→ `writeFileSync`（`:452`）。模板装载：`src/render/templates.ts:50-57`（`templatesDir = <pkg>/templates`，`readFileSync`，未知/缺失抛 `BILL_TEMPLATE_MISSING`）；key→模板映射 `:28-48`（16 键 1:1）。
- **skill-schedule**：`--html`（`cmd_read.ts:255`）→ `fillTemplate(loadTemplate(templateFor(key)), renderEnvelopeHtml(env))`（`:286`）→ `assertHtmlSize`（`:287`）→ `writeFileSync`（`:288`）。装载 `src/render/templates.ts:36`（同型）。
- **skill-home**：`--html`（`cmd_read.ts:690`）→ `fillTemplate(loadTemplate(templateFor(key)), renderEnvelopeHtml(env))`（`:721`）→ `:722-723`。装载 `src/render/templates.ts:62`（同型）。
- **skill-chef**：`--html` → `renderEnvelopeHtml(env)`（`cmd_read.ts:373`）→ `assertHtmlSize`（`:374`）→ `writeFileSync`（`:375`）。**不经过模板、不经过 `fillTemplate`**；产物是裸 `<section>` 片段（测试只断言 `/<section/`，`test/cli.test.mjs:110`），无 `<!DOCTYPE`。
- **skill-memo-ilife**：`--html` → `renderEnvelopeHtml(env)`（`cmd_read.ts:133`）→ `assertHtmlSize`（`:134`）→ `writeFileSync`（`:135`）。`loadTemplate` 虽由 `src/render/index.ts:4` 导出，但 `src/**` 零调用；`fillSharedMarkers` 亦零调用。
- **skill-calorie**：`cmd_read.ts:216/231/254/264/277` 各分支 `return { data, html: renderXHtml(...) }` → `:672` `writeFileSync(o.html as string, out.html, 'utf8')`。HTML 全部由 `src/render/html.ts` 的 `pageShell`（`:37-44`）直串拼接，不经模板、无标记、无 `loadTemplate`/`templateFor`（calorie 无 `templates.ts`）。
- **不经模板的直串拼接清单**：calorie `pageShell`（`html.ts:37`，被 20+ 个 `render*Html` 调用，如 `:85,103,118,133,172,183,193,199,209,217,226,243,261,271,286,299,314,325,342,356,367,381`）+ chef/memo 的 `renderEnvelopeHtml` 直出片段。

## 4. 回归可比对现状

**现有快照机制（两套，均与 HTML 无关）**

1. `tooling/write-snapshot.mjs`（31 行）：写 `packages/ilife-skills/skill.snapshot.json`，内容 `{ resolvedVersion, sha, writtenBy }`（`:19`）；`sha = sha256(pkg.version + combos.yaml + present.ts).slice(0,16)`（`:18`）。`--check` 重算比对，不等即 fail（`:21-27`）。脚本入口 `package.json:15-16`（`snapshot` / `snapshot:check`）；CI 在 `ci.yml:34`（`pnpm snapshot:check`）与 `ci.yml:42-53`（snapshot-guard 检查该文件是否被改动）执行。**覆盖物 = 分发版本 + combos/present 内容锚**，与任何技能 HTML 无关。
2. `test/calorie-sot.snapshot.json`（32,564 字节）：键 `sot`（=`scripts/_triggers.py`）、`total`（436）、`scene_counts`、`entry_sha`、`wake_multiset`、`summary`；被 `test/calorie-triggers.test.mjs:26` 读取，`:39` 断言 `wake_word` 多重集、`:45` 逐条比对 `entry_sha`。**覆盖物 = calorie 唤醒词/触发条目清单**，与 HTML 无关。

**per-skill HTML 快照：不存在。** 全仓非 `templates/` 的 `*.html`/`*.expected`/`*.golden`/`*.snapshot.json` 只有 `.scratch/map2/*.html`、`.scratch/wf62/architecture-answer.html`、`docs/calorie-architecture.html`、`packages/ilife-skills/skill.snapshot.json`、`test/calorie-sot.snapshot.json`。现有 HTML 断言全是正则子串，例如：

- `packages/skill-bill/test/cli.test.mjs:115-118`：`--html` 落盘后 `assert.match(html, /<section/)`、`/<!DOCTYPE html/`、`/bill-cmd-read bill\.record\.today/`。
- `packages/skill-chef/test/cli.test.mjs:110`：`assert.match(readFileSync(p,'utf8'), /<section/)`。
- `packages/skill-home|schedule/test/render.test.mjs:80,79`：只断言 `fillTemplate(t, renderEnvelopeHtml(env))` 含内容，不比对全文。
- calorie：`test/cli-smoke-t41.test.mjs:121` 断言含 `ilife-page`；`test/cmd-read-t11.test.mjs:113-114` 断言 `今日总览 2026-09-07` + `ilife-page`。

**结论（能否证明「5 技能 HTML 未变」）**：**当前不能**。契约把「per-skill HTML 快照回归门」登记为 **#96**（`docs/base-paint-contract.md:687`；另见 `:227`、`:229`、`:641`、`:680`），但仓库内**没有该门的任何实现或快照数据**。因此 #74 迁移后可用的回归证据只有：① 上述正则级断言（不覆盖标记位置、CSS 包裹、空白/换行、属性顺序）；② `pnpm test` 全绿；③ `pnpm boundaries`（`tooling/check-boundaries.mjs:13-16` 断言 render 零运行时依赖、`:23` link-core 不引 workspace 包）。**逐字节「HTML 未变」无法证明**，须先建 #96 快照门或在 #74 内自建一次性 diff 脚本（本报告不判断应怎么做，只报事实）。

## 5. 契约接口逐字

来源：`packages/base-render/src/spec/template.ts`（142 行）。行号后为逐字签名行。

- `:16` `export const TEMPLATE_MARKERS = Object.freeze({`
- `:17` `  injectData: '<!--INJECT-DATA-->',`
- `:18` `  sharedHelpers: '<!--SHARED-HELPERS-->',`
- `:19` `  sharedCss: '<!--SHARED-CSS-->',`
- `:20` `  chartsHelpers: '<!--CHARTS-HELPERS-->',`
- `:21` `  noShared: '<!--NO-SHARED-->',`
- `:22` `} as const);`（配套 `:24` `export type TemplateMarkerKey = keyof typeof TEMPLATE_MARKERS;`、`:25` `TemplateMarkerLiteral`）
- `:28` `export type MarkerRule = 'exactly-one' | 'zero-or-one' | 'zero-or-one-exempt';`
- `:30-37` `export interface MarkerRuleSpec { readonly literal: string; readonly rule: MarkerRule; readonly required: boolean; readonly exemptable: boolean; }`
- `:40` `export const MARKER_RULES = Object.freeze({`
  - `:41` `  injectData: { literal: TEMPLATE_MARKERS.injectData, rule: 'exactly-one', required: true, exemptable: false },`
  - `:42` `  sharedHelpers: { literal: TEMPLATE_MARKERS.sharedHelpers, rule: 'exactly-one', required: true, exemptable: true },`
  - `:43` `  sharedCss: { literal: TEMPLATE_MARKERS.sharedCss, rule: 'exactly-one', required: true, exemptable: true },`
  - `:44` `  chartsHelpers: { literal: TEMPLATE_MARKERS.chartsHelpers, rule: 'zero-or-one', required: false, exemptable: false },`
  - `:45` `  noShared: { literal: TEMPLATE_MARKERS.noShared, rule: 'zero-or-one-exempt', required: false, exemptable: false },`
  - `:46` `} as const satisfies Record<TemplateMarkerKey, MarkerRuleSpec>);`
- `:49` `export const INJECTION_ORDER = ['sharedHelpers', 'sharedCss', 'chartsHelpers', 'injectData'] as const;`（`:51` `export type InjectionStep = (typeof INJECTION_ORDER)[number];`）
- `:61` `export const DEFAULT_DATA_SCRIPT_ID = 'payload';`
- `:62` `export const DATA_SCRIPT_TYPE = 'application/json';`
- `:65` `export const STRICT_ENVELOPE_FIELDS = ['version', 'skill', 'shape', 'key', 'data'] as const;`
- `:67` `export const STRICT_ENVELOPE_SHAPES = ['list', 'detail', 'stat', 'receipt', 'analysis', 'fallback'] as const;`
- `:74` `export const TEMPLATE_ERROR_CODES = [`
  - `:75` `  'marker-missing',` `:76` `  'marker-duplicate',` `:77` `  'marker-conflict',` `:78` `  'data-missing',` `:79` `  'container-missing',` `:80` `  'asset-missing',` `:81` `  'strict-invalid',`
  - `:82` `] as const;`（`:84` `export type TemplateErrorCode = (typeof TEMPLATE_ERROR_CODES)[number];`）
- `:86-91` `export interface TemplateErrorShape { readonly name: 'TemplateError'; readonly code: TemplateErrorCode; readonly marker?: TemplateMarkerKey; readonly message: string; }`
- `:102-106` `export interface TemplateAssets { readonly sharedHelpersJs: string; readonly sharedCssText: string; readonly chartsHelpersJs?: string; }`
- `:108-117` `export interface FillTemplateInput { readonly template: string; readonly assets: TemplateAssets; readonly data: unknown; readonly strict?: boolean; readonly dataScriptId?: string; }`
- `:119-125` `export interface MarkerReport { readonly key: TemplateMarkerKey; readonly literal: string; readonly rule: MarkerRule; readonly count: number; readonly filled: boolean; }`
- `:128-134` `export interface FillTemplateReport { readonly markers: readonly MarkerReport[]; readonly strict: boolean; readonly exempt: boolean; readonly bytes: number; }`
- `:136-139` `export interface FillTemplateOutput { readonly html: string; readonly report: FillTemplateReport; }`
- `:141` `/** 冻结签名：fillTemplate(input: FillTemplateInput): FillTemplateOutput。 */`
- `:142` `export type FillTemplate = (input: FillTemplateInput) => FillTemplateOutput;`

导出可达性：`packages/base-render/src/index.ts:11` `export * from './spec/index.js';`；`spec/index.ts:18` `export * from './template.js';`。包名与出口：`packages/base-render/package.json:2` `"name": "base-paint"`、`:8-10` `"exports": { ".": "./dist/index.js" }`（**只此一个出口**）。冻结面登记 `packages/base-render/src/spec/index.ts:58-59` 两条 `status: 'pending'`（`FillTemplate`、`fillTemplate`）；其余 13 条 `implemented`（`:46-57,60`）。

## 6. 迁移风险与未知

1. **`<!--CONTENT-->` 不在契约标记集内**：`TEMPLATE_MARKERS` 只有 5 个键（`spec/template.ts:16-22`），而 bill/chef/home/schedule 共 **53** 个模板依赖 `<!--CONTENT-->`（各 `@12`），`FillTemplateInput`（`:108-117`）无 content 槽位。事实层面：契约 `fillTemplate` 无法承载正文。
2. **53 个模板缺 `INJECT-DATA` 与自带容器**：这 53 个模板实测只有 `SHARED-CSS`/`CONTENT`/`SHARED-HELPERS`；按 `MARKER_RULES.injectData.rule='exactly-one'`+`exemptable:false`（`:41`）与容器硬约束（`docs/base-paint-contract.md:160-161,166`），直接调用必抛 `marker-missing`/`container-missing`。
3. **CSS/HELPERS 的包裹约定相反**：5 技能填充器把 CSS 包成 `<style>…</style>`（`skill-bill/src/render/html.ts:67` 等），memo 则原样注入而由模板自带 `<style>`（`skill-memo-ilife/src/render/html.ts:61` + `memo_query.html:7`）。契约只定死了 `INJECT-DATA` 的替换语义（`docs/base-paint-contract.md:156-168`），**未写明** `sharedCssText`/`sharedHelpersJs` 是否包裹 → 未知项，直接影响产出字节。
4. **三个资产产出者全 pending**：`sharedCssText ← buildStyleSheet`（#75）、`sharedHelpersJs ← buildSharedHelpersJs`（#76）、`chartsHelpersJs ← buildChartsHelpersJs`（#78）（`docs/base-paint-contract.md:724`；`spec/template.ts:95-98`）。技能侧现有私有 CSS（419/440 字符）与 HELPERS（145 字符）不得自产（B3，`docs/base-paint-contract.md:182,721`）。
5. **5 个技能不依赖 base-paint**：`skill-{bill,chef,home,memo-ilife,schedule}/package.json` 的 `dependencies` 只有 `base-link-core`；只有 `skill-calorie` 依赖 `base-paint`（`src/render/html.ts:14`）。且 `base-paint` 出口只有 `"."`（`packages/base-render/package.json:8-10`）→ 迁移需新增依赖声明与出口可达性确认。
6. **chef / memo-ilife 生产链不经过填充器**：chef `cmd_read.ts:372-376` 与 memo `cmd_read.ts:132-136` 只写 `renderEnvelopeHtml` 的裸 `<section>`。故「迁移后 HTML 未变」对这两个技能的生产产物是**空断言**（现在就没有模板参与），只有测试用例覆盖 `fillTemplate`/`fillSharedMarkers`。
7. **`escapeHtml` 字符集差异**：技能侧 5 字符 vs base-paint 4 字符（§1 补充；`packages/base-render/src/contract.ts:31-32`）。契约把归一执行权交 #74（`docs/base-paint-contract.md:725`）→ 任何切换都会在含 `'` 的数据上改变 HTML 字节。
8. **calorie 6 模板是死资产**：`src/**` 零引用、无 `INJECT-DATA`/容器；契约已登记其改造归 #107（`docs/base-paint-contract.md:695,723`）。calorie 的 6 个 `templates/*.html` 与 `src/triggers` 里引用的 49 个模板名**无交集**。
9. **`NO-SHARED` / `CHARTS-HELPERS` 零使用**：`packages/**` 0 命中（与 `docs/base-paint-contract.md:86` 一致）→ 迁移期无法用真实模板验证豁免通道与可选图表槽位，只能靠自造模板/测试。
10. **错误码口径切换**：5 套 `*_MARKER_INVALID` → 契约 7 个 kebab-case code（`spec/template.ts:74-82`）；技能侧测试用 `assert.throws(..., /标记/)` 或 `.code === 'MEMO_MARKER_INVALID'`（`test/render.test.mjs:38,52` 等），迁移会同时改动测试断言面。
11. **快照门缺失（未知项）**：#96 门在仓库中无实现（§4），迁移验收标准当前无机器可读基线；`test/*` 里也没有任何 per-skill HTML 全文比对。
12. **memo 模板的 payload 消费方未知**：`memo_query.html:69` 起的内联脚本按 `document.getElementById("payload")` 取数，其期望 shape 在 `packages/skill-memo-ilife/src` 中无生产者（`src/**` 对 `payload`/`INJECT` 零命中）→ 填充后是否可用无法从仓库判定。
13. **memo 模板规模**：6 模板共 1,609 行（104+512+272+239+257+225），是唯一「满足占位符契约」的模板族（契约 `docs/base-paint-contract.md:158,723` 点名），但生产链未接线（§6-6）。
