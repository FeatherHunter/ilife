# #78 施工 A2 · HELP 壳证据（`base-paint/src/help.ts`）

- 票：GitHub `#78`《base- 图表层与 HELP 壳（含 scene-data 契约）》，map `#63`；施工单 `.scratch/t78/WORKORDER.md` §2；裁定 `.scratch/t78/ARCHITECT-RULINGS.md`（R4／R5／R6／R7／R8／R9／R11／R13／R17／R23／R26／**R27–R32**）；契约面预审 R1（A4／B2）；独立验收 V2b（4 处存活变异）。
- 基线：`HEAD aed1b7c`（未做任何 git 写操作）。
- 返修台账：**FX-78-A2-1（R31）** 完整 HTML 文档｜**FX-78-A2-2（R32）** CLI 文本 = `Scene.id` 原文｜**FX-78-A2-3（R1-A4）** 区名恒取 `CONTROL_STYLE_SECTIONS`｜**FX-78-A2-4（R1-B2）** 徽章文本恒读 `SCENE_STATUS[1]`｜**FX-78-V2b-1／2／3** 多字段 `params` LF ＋ 源码字面量负控｜**FX-78-V2b-4** chip 恒取 `wake_word`。
- 可复跑证据脚本：`.scratch/t78/a2-evidence.mjs`（`node .scratch/t78/a2-evidence.mjs`，两次运行逐字节相同）。

## 1. 交付物（精确路径 ＋ 行数）

| 文件 | 行数 | 说明 |
|---|---|---|
| `packages/base-render/src/help.ts` | 687 | `renderHelpShell` ＋ scene-data 校验器 ＋ `HelpSchemaError` ＋ **非导出**内置壳模板（R13／R31／R32／FX-A2-3／FX-A2-4） |
| `packages/base-render/test/help.test.mjs` | 877 | node:test 行为测试，**47 用例**（6 个 describe） |
| `.scratch/t78/a2-evidence.mjs` | 306 | 可复跑证据脚本（输出快照见 §6） |
| `.scratch/t78/a2-evidence.md` | 本文件 | 证据快照 ＋ 自检表 ＋ 变异清单 |

编码核验（`node -e` 逐文件）：`help.ts` 687 行（LF／CRLF=0／loneCR=0／BOM=false／字面 `\n`=0）；`help.test.mjs` 877 行（BOM=false／字面 `\n`=0）；`a2-evidence.mjs` 306 行（BOM=false／字面 `\n`=0）。

**写入面核验**（`git status --porcelain`，只读）：本票新增文件恰为 `?? packages/base-render/src/help.ts`、`?? packages/base-render/test/help.test.mjs`、`?? .scratch/`（含本证据）；`M docs/base-paint-contract.md`／`M src/index.ts`／`M src/spec/{charts,controls,help,index}.ts`／`M test-d/contract-signatures.ts`／`?? src/charts.ts`／`?? test/charts.test.mjs`／`?? .changeset/*`／`?? docs/research/t78-*` 属编排者与并行施工者 A1。**未碰 git 写操作**，未碰 `src/charts.ts`／`src/spec/*`／`src/index.ts`／`test-d/*`／`docs/*`。

## 2. 契约锚点自检表（逐条落点行号）

| 锚点 | 落点（`src/help.ts`） | 证据 |
|---|---|---|
| `HelpShellInput.sceneData` | `:677` 读取 → `:678` `validateSceneData(sceneData)`（**校验先于填充**） | `test:687`「校验先于填充」；`test:560/567/579/597` 四码 |
| `HelpShellInput.assets` | `:683` `assets: source.assets`（**不得自填**） | `test:701`（空资产 → `fillTemplate` 抛 `asset-missing`，非壳自造） |
| `HelpShellInput.strict` | `:685` `strict: source.strict === true`（透传） | `test:715`（`strict:true` → `strict-invalid`） |
| `HelpShellInput.template` | `:680` `typeof source.template === 'string' ? … : buildShellTemplate(sceneData)` | `test:729`（覆盖生效，不再产内置壳） |
| 返回值 `FillTemplateOutput` | `:675` 签名 ＋ `:681-686` `fillTemplate(...)` 直接返回 | `test:245/226` 读 `report.markers`；`test:291` 读 `html` |
| `HELP_SHELL_ID` | `:643` `attr('id', HELP_SHELL_ID)`（壳根 `<section>`） | `test:291`（根元素 ＋ 恰 1 次 ＋ id 唯一） |
| `HELP_COPY_TARGETS` | `:46` 导入；`:378` `HELP_COPY_ACTIONS[target]`（target ∈ 三值） | `test:458`（`deepEqual([...HELP_COPY_TARGETS], ['prompt','wakeWord','params'])`） |
| `HELP_COPY_ACTIONS.actionId` | `:378` 取表 → `:381` `attr(ACTION_ID_ATTR, action.actionId)` | `test:458`（逐 target 断言 `data-action-id="…"` 逐字出现）；`test:857`（源码负控：无 `'data-action-id'` 字面量） |
| `HELP_COPY_ACTIONS.label` | `:378-383`（`label` 缺省取表；仅 `init_banner.button_text` 覆盖文案） | `test:458`（按钮文本 = 冻结文案）；`test:335`（button_text 覆盖） |
| `ACTION_ID_ATTR` | `:43` 导入 → `:381` 写入 | `test:458/506`（每个 `<button>` 都带该属性）＋ `test:857` 正控 `attr(ACTION_ID_ATTR` |
| `DEFAULT_DATA_ATTR` | `:43` 导入 → `:382` `attr(DEFAULT_DATA_ATTR, payload)` | `test:479/488/499`（`data-t` 逐字等于 prompt／wake_word／params 文本）＋ `test:857` 正控 |
| **样式区名（FX-A2-3）** | `:81` `sectionSlug` → `:87` `HELP_SECTION = CONTROL_STYLE_SECTIONS.find(kebab 后 === HELP_SHELL_ID)` → `:90` 闭集漂移 fail-fast → `:96` `HELP_CLASS_ROOT = STYLE_PREFIX + sectionSlug(HELP_SECTION)` | `test:291`（`CONTROL_STYLE_SECTIONS.includes(HELP_SECTION)` ＋ `CLS === HELP_SHELL_ID` ＋ 179 个类名 ∈ 命名空间）；`test:828`（依赖面含 `./spec/style.js`）；`test:857`（源码负控：无 `'ilife-help-shell'` 字面量） |
| **逐场景 CLI 文本（R32）** | `:391-392` `cliText(scene) { return scene.id; }` → 调用点 `:495` `const cli = cliText(scene)` | `test:358`（逐字 === `Scene.id` ＋ 反向断言无拼接串 ＋ `<code>` 恰 5 个） |
| **chip 恒取 `wake_word`（FX-V2b-4）** | `:463` `renderBadges` → `:465` `text(scene.wake_word)`（chip 内容） | `test:378`（`home_month` 的 `wake_word='看本月饮食' ≠ title='看本月'`：chip 逐字 === `wake_word`、≠ `title`、chip 集合 === 各场景 `wake_word` 逐值） |
| **待开发徽章文本（FX-A2-4）** | `:463` `renderBadges` → `:467` `if (scene.status === SCENE_STATUS[1])` → `:469` `text(SCENE_STATUS[1])`（**无字面量**） | `test:400`（徽章文本逐字 === `SCENE_STATUS[1]`；裸「待开发」不得出现） |
| **多字段 `params`（FX-V2b-1）** | `:396-401` `paramsText` → `:400` `lines.join(LF)` | `test:488`（两个非空字段：`data-t` 逐字 === `'A: 1' + LF + 'B: 2'`；逗号／空格／首字段形**均不得出现**） |
| `SCENE_STATUS` / `SCENE_TYPE_FIELD` | `:306`（status 白名单判定）／`:322`（`types` 复数，无单数别名） | `test:567/400/393`（白名单两值均通过、非法值抛错、无 `type=`） |
| `SCENE_DATA_SCHEMA`（唯一机读权威） | `:186` 通用 walker 读它 → `:358` `firstViolation(SCENE_DATA_SCHEMA, data, '')` | `test:622`（断言 `minItems === 1` ＋ 空 `scenes[]` → `schema-invalid`） |
| `TEMPLATE_MARKERS` | `:640` `sharedCss`（`<head>` 内）／`:659` `injectData`（容器内）／`:660` `sharedHelpers`（`<body>` 内）——**均裸标记，不预包裹** | `test:842`（源码零标记字面量）＋ `test:226/239` |
| `ASSET_WRAPPERS` | `:607/609` payload 容器开／闭标签（`id`／`type` 取 `CONTAINER_CHECK_RULE`） | `test:245`（容器恰 1 个 ＋ id／type 与冻结常量同值） |
| `HelpSchemaError` 不导出 | `:122` `export class HelpSchemaError`（仅 `src/help.ts` 出口） | `test:681`（`'HelpSchemaError' in indexExports === false`）；`src/index.ts` 出口追加归编排者 |
| 内置壳模板不导出（R13） | `:625` `function buildShellTemplate`（模块内部，无 `export`） | `test:873`（`dist/help.js` 导出面 `deepEqual(['HelpSchemaError','renderHelpShell'])`） |
| **R31 完整文档** | `:634` DOCTYPE／`:635` `<html lang="zh-CN">`／`:637` charset／`:638` viewport／`:639` `<title>`（`documentTitle` `:613`）／`:640` SHARED-CSS／`:641` `</head>`／`:643` 壳根／`:659` 容器／`:660` SHARED-HELPERS／`:661` `</body>`／`:662` `</html>` | `test:269`（DOCTYPE／lang／charset／viewport／title／闭合／槽位）；`test:283`（title 注入不逃逸） |

## 3. 占位符与载荷槽证据（`renderHelpShell` 产物，`report.markers` 逐标记）

| key | 字面量 | 规则 | count | filled | 断言 |
|---|---|---|---|---|---|
| `injectData` | `<!--INJECT-DATA-->` | `zero-or-one` | **1** | true | `test:226` |
| `sharedHelpers` | `<!--SHARED-HELPERS-->` | `exactly-one` | **1** | true | `test:226` |
| `sharedCss` | `<!--SHARED-CSS-->` | `exactly-one` | **1** | true | `test:226` |
| `chartsHelpers` | `<!--CHARTS-HELPERS-->` | `zero-or-one` | **0** | false | `test:226`（R7／R26-3：壳不用图表） |
| `content` | `<!--CONTENT-->` | `zero-or-one` | **0** | false | `test:226`（数据页，载荷槽恰有其一） |
| `noShared` | `<!--NO-SHARED-->` | `zero-or-one-exempt` | **0** | false | `test:226` |

- **载荷槽分型 = `data-page`**：`injectData`=1 且 `content`=0；容器 `<script id="payload" type="application/json">` **恰 1 个**（`test:245`），容器内文本 `JSON.parse` 后与 `sceneData` **逐值 deepEqual**，且载荷内**无裸 `<`**（填充器 `\u003c` 口径）。
- **占位符 0 残留**：逐标记断言 `TEMPLATE_MARKERS` 六个字面量均不在产物中（`test:239`）。
- **唯一可执行脚本**：`<script` 恰 2 次 = payload 容器 ＋ 填充器包裹的 `sharedHelpersJs`（`test:257`）；`<canvas>`=0、内联事件处理器=0、`javascript:`=0、`复制 prompt`=0。
- **完整文档锚点**（R31，`test:269`）：以 `<!DOCTYPE html>` 开头、含 `<html lang="zh-CN">`／`<meta charset="utf-8">`／viewport、`<title>` = `title · skill_name`（转义）、以 `</html>` 结尾；`<!--SHARED-CSS-->` 的 `<style>` 落在 `</head>` 之前，payload 容器落在 `</head>` 之后；**`<head>` 内无 `<script`**。`test:283` 把 `<script>alert(1)</script>` 注入 `title` → `<title>` 文本逐字等于 `escapeHtml(...)`，且 `<script` 总数仍为 2。
- **CLI 文本锚点**（R32，`test:358`）：逐场景断言 `<code class="…-cli">` 内文本 **逐字 === `escapeHtml(Scene.id)`**（`home_today_overview`／`home_today_trend`／`home_week`／`home_month`／`diet_add`）；**反向断言** `skill_name + '.' + group.id + '.' + scene.id`（如 `卡路里.home.home_week`）在产物中**不出现**；`<code class="…-cli">` 恰 5 个。
- **chip 锚点**（FX-V2b-4，`test:378`）：夹具场景 `home_month` 的 `wake_word='看本月饮食'` 与 `title='看本月'` **逐字不同**；断言该卡 chip 文本 **逐字 === `wake_word`**、**≠ `title`**、chip 内不得出现 `title`；并把**全页 chip 文本数组**与 `FIXTURE_SCENES` 的 `wake_word` 列 **逐值 deepEqual**——**鉴别力**：chip 改成 `text(scene.title)` 立即红（变异 M14 自证）。
- **待开发徽章锚点**（FX-A2-4，`test:400`）：徽章整串 `<span class="…-badge …-badge-dev">【待开发】</span>` 逐字等于 `SCENE_STATUS[1]` 拼装值；`status: ''` 的场景无 `…-badge-dev`；裸「待开发」（去【】）**不得**作为徽章文本出现——**鉴别力**：写死 `'待开发'` 字面量即红（变异 M9 自证）。
- **多字段 `params` 锚点**（FX-V2b-1，`test:488`）：`home_month` 两个非空字段（`A: 1`／`B: 2`）→ `data-t` **逐字 === `'A: 1' + LF + 'B: 2'`**；反向断言 `'A: 1,B: 2'`／`'A: 1 B: 2'`／`'A: 1'` **均不出现**——**鉴别力**：`join(LF)` → `join(',')` 立即红（变异 M11 自证）。
- **CSS-only 交互结构**（R4）：`type="radio"` 恰 3 个（2 分组 ＋ 关于），共用同一 `name`，`<label for>` 集合与 radio id 集合**逐值相等**，`checked` 恰 1 处；`<details>`／`<summary>` 各 8 处（3 二级折叠 ＋ 5 场景卡 Sheet）（`test:308`）。

## 4. 校验器：4 个错误码逐条可达 ＋ 判定次序

| 用例（快照 `codeTable`） | code | path |
|---|---|---|
| 跨分组重复 `scenes[].id` | `duplicate-id` | `/groups/1/subgroups/0/scenes/0/id` |
| `status='开发中'` | `status-invalid` | `/groups/0/subgroups/0/scenes/0/status` |
| `types=['结果', 42]` | `types-invalid` | `/groups/0/subgroups/0/scenes/0/types/1` |
| 缺 `skill_name` | `schema-invalid` | `/skill_name` |
| `skill_name=''`（minLength） | `schema-invalid` | `/skill_name` |
| 顶层多余字段 | `schema-invalid` | `/extra` |
| **空 `scenes[]`（R11）** | `schema-invalid` | `/groups/0/subgroups/0/scenes` |
| `types=[{text,foo}]`（oneOf） | `schema-invalid` | `/groups/0/subgroups/0/scenes/0/types/0` |
| `sceneData=null` | `schema-invalid` | `/` |

- **判定次序（首个命中即抛）**：同一输入叠加「重复 id ＋ 非法 status ＋ 非法 types ＋ 缺 `skill_name`」→ 只抛 `duplicate-id`（快照 `orderCase`）；逐级去掉最外层违规后依次得到 `status-invalid` → `types-invalid` → `schema-invalid`（`test:658`）。
- **覆盖闭环**：`test:677` 断言本 describe 实际命中的 code 集合 `deepEqual` 于 `HELP_SCHEMA_ERROR_CODES`（4 个），防止「写了分支但不可达」。
- **零依赖**：校验器为手写 draft-07 子集（`type`／`enum`／`minLength`／`minItems`／`items`／`required`／`additionalProperties:false`／`properties`／`oneOf`，唯一实现 `:186` `firstViolation`），**无 ajv／无第三方**；`HelpSchemaError` 形如 `{name,code,path,message}`（`:122-133`），**不从 `src/index.ts` 导出**。

## 5. 转义逐字段证据（`RAW = '<script>"\'&'` → `ESCAPED = '&lt;script&gt;&quot;&#39;&amp;'`）

`test:787` 对 **34 个字段**逐一断言「该字段渲染且经 `escapeHtml`」（`shellPart` 内出现 ESCAPED、不出现 RAW）；快照 `escapeTable` 为同一 22 条抽样，全部 `ok:true`：

`skill_name`／`title`／`subtitle`／`init_banner.title|subtitle|button_text|prompt|steps[0]`／`contact.items[].label|value`／`contact.copy_all`／`version`／`recommendations[].name|reason|wake_word`／`groups[].id|icon|label`／`subgroups[].id|label`／`scenes[].id|title|wake_word|prompt_template`／`types[]`（字符串形态）／`types[].text|bg|fg`／`editable_fields[].name|label|value|hint`／`meta_blocks[].id|title`。

- **`<title>` 逐字证据**（R31）：快照 `documentTitleProbe` = `{ titleText: '&lt;script&gt;&quot;&#39;&amp; · 卡路里', escaped: true, noScriptInHead: true, scriptCount: 2 }`。
- **CLI 文本的 `Scene.id` 逐字证据**（R32）：`scenes[0].id` 用例（`test:787` 表内）注入 RAW 后，`shellPart` 内出现 ESCAPED（`<code>` 与 `data-scene-id` 两处），不出现 RAW。
- **唯一豁免**：`meta_blocks[].html` 原样透传（`test:797`，快照 `raw:true/escaped:false`）；`test:445` 额外证明连 `<script>` 也原样落地（技能方自理，`doc:821`）——此时 `<script` 计数 = 3（容器 ＋ helpers ＋ 透传脚本）。
- **载荷保真**：同一 RAW 写入 `scenes[0].title` 后，JSON 载荷内无裸 `<` 且 `JSON.parse` 回读逐值等于 RAW（`test:804`）。

## 6. 快照（`node .scratch/t78/a2-evidence.mjs`，节选）

```
contract.helpShellId           = "ilife-help-shell"
contract.copyTargets           = ["prompt","wakeWord","params"]
contract.copyActions.prompt    = { actionId: "ilife-help-copy-prompt", label: "复制指令" }
contract.copyActions.wakeWord  = { actionId: "ilife-help-copy-wakeWord", label: "复制唤醒词" }
contract.copyActions.params    = { actionId: "ilife-help-copy-params", label: "复制参数" }
contract.schemaErrorCodes      = ["schema-invalid","duplicate-id","status-invalid","types-invalid"]
contract.styleSection          = true（CONTROL_STYLE_SECTIONS 含 helpShell）

markers  = injectData 1/true, content 0/false, sharedHelpers 1/true, sharedCss 1/true,
           chartsHelpers 0/false, noShared 0/false
payload  = { openTag: '<script id="payload" type="application/json">', containerCount: 1,
             parses: true, roundTripEqual: true, bareLtInJson: false, chars: 1223 }
structure= { rootId: 'ilife-help-shell', rootClass: 'ilife-help-shell', rootElementPresent: true,
             document: { startsWithDoctype: true, htmlLang: true, charset: true, viewport: true,
                         title: '能力速查台 · 卡路里', endsWithHtml: true, cssInHead: true,
                         payloadInBody: true, scriptInHead: false },
             idCount: 5, idUnique: true, classCount: 127, classNamespaceOk: true,
             radioCount: 3, checkedCount: 1, detailsCount: 5, summaryCount: 5, articleCount: 3,
             scriptCount: 2, canvasCount: 0, inlineHandlerCount: 0,
             metaHtmlRaw: true,
             cliTexts: ['home_today_overview','home_today_trend','diet_add'], cliCodeCount: 3,
             cliMalformed: [],        ← R32 反向断言：拼接串 0 次
             devBadgeCount: 1,        ← FX-A2-4：徽章文本取 SCENE_STATUS[1]（'【待开发】'）
             oldWording: false }
buttons  = prompt 4 个（labels: 开始初始化 / 复制指令；promptDataT=true）
           wakeWord 3 个（labels: 复制唤醒词）
           params 3 个（labels: 复制参数；paramsDataT=true）
codeTable= 9 条（见 §4），全部 isHelpSchemaError: true
orderCase= { code: 'duplicate-id', path: '/groups/1/subgroups/0/scenes/0/id' }
escapeTable = 22 条，全部 ok: true
documentTitleProbe = { titleText: '&lt;script&gt;&quot;&#39;&amp; · 卡路里', escaped: true,
                       noScriptInHead: true, scriptCount: 2 }
paramsMultiField = { expected: 'A: 1\nB: 2', lfJoinedPresent: true, commaFormPresent: false,
                     spaceFormPresent: false, firstFieldOnlyPresent: false }   ← FX-V2b-1
chipProbe = { chipText: 'WAKE-ONLY', equalsWakeWord: true, equalsTitle: false } ← FX-V2b-4
purity   = { distForbidden: [], distSpecifiers: ['./contract.js','./spec/controls.js','./spec/help.js',
             './spec/style.js','./spec/template.js','./style.js','./template.js'],
             srcMarkerLiterals: [], srcWrapperLiterals: [],
             srcAttributeLiterals: [],   ← FX-V2b-2 负控（'data-action-id'／'data-t' 0 次）
             srcClassRootLiterals: [] }  ← FX-V2b-3 负控（'ilife-help-shell' 0 次）
output   = { bytes: 10241, sha256: '3836C7C955C6659F4209C8A1CD0FA2999D12F59244207F0734FCA0D34C8E3768' }
```

- **依赖面变化（FX-A2-3 的连带证据）**：修前 `dist/help.js` 的 import 表**不含** `./spec/style.js`（`CONTROL_STYLE_SECTIONS` 未被使用 → TS 省略该 import）；修后恒读它，依赖面变为 7 条（`test:828` 逐值 deepEqual 断言，零第三方）。
- **复制按钮计数口径**（R27 保留）：每场景 3 个（`prompt`／`wakeWord`／`params`，`actionId`／文案逐字取 `HELP_COPY_ACTIONS`）＋ `init_banner` 的 1 个指令按钮（文案取 `button_text`）；`test:471` 逐 actionId 断言计数，`test:506` 断言每个按钮**只带** `actionId` ＋ `data-t`、零内联处理器。
- **`params` 文本**：`editable_fields` 的 `label: value` 行（**LF 连接**、空 value 省略、**不 trim 不改写**）；无字段时回落该场景 **`Scene.id`**（R32，`test:499`）；多字段逐字连接见 `test:488`。
- 注：§6 快照由 `a2-evidence.mjs` **自带夹具**（3 场景／2 分组）产出，故 `classCount: 127`／`detailsCount: 5`／`cliCodeCount: 3` 与 `test/help.test.mjs` 的夹具（**5 场景／3 二级折叠／2 分组，179 个类名，8 个 `<details>`**）**数值不同、口径一致**。

## 7. 变异测试自证（14 处：改错 → 红 → 还原 → 绿）

| # | 变异点（`src/help.ts`） | 结果 | 红的用例 |
|---|---|---|---|
| M1 | `:296` `if (seen.has(id))` → `if (false)`（破坏 `duplicate-id` 判定） | **红** `pass 39 / fail 3` | `duplicate-id…`／`判定次序…`／`四个错误码逐条可达` |
| M2 | `:310` `if (!allowed.includes(status))` → `if (false)`（破坏 `status` 白名单） | **红** `pass 39 / fail 3` | `status-invalid…`／`判定次序…`／`四个错误码逐条可达` |
| M3 | `:453` 徽章取元素改为 `{ text: String(badge) }`（破坏 `types` 徽章分支／配色） | **红** `pass 40 / fail 2` | `types 徽章…`／`每个 sceneData 文本字段都渲染且经 escapeHtml` |
| M4 | `:381` `attr(ACTION_ID_ATTR, action.actionId)` → 硬编码 `'ilife-help-copy-prompt'` | **红** `pass 40 / fail 2` | `三个目标的 actionId／文案逐字取 HELP_COPY_ACTIONS…`／`每场景三目标各 1 个按钮…` |
| M5 | `:659` 去掉自带容器（只留裸 `<!--INJECT-DATA-->`） | **红** `pass 13 / fail 6`（`container-missing`） | 数据页分型／壳结构／复制按钮／逐字段转义／meta 透传／载荷保真 等 6 个套件 |
| M6 | `:512` `text(scene.title)` → `scene.title`（破坏转义） | **红** `pass 41 / fail 1` | `每个 sceneData 文本字段都渲染且经 escapeHtml（逐字段）` |
| M7 | `:637` 删掉 `<meta charset="utf-8">`（R31） | **红** `pass 43 / fail 1` | `产物是完整 HTML 文档…（R31）` |
| M8 | `:392` `return scene.id;` → `return '卡路里.home.' + scene.id;`（R32 改回拼接） | **红** `pass 42 / fail 2` | `场景卡：逐场景 CLI 形态文本 = Scene.id 原文…`／`无 editable_fields 的场景：params…Scene.id（R32）` |
| M9 | `:469` `text(SCENE_STATUS[1])` → `text('待开发')`（FX-A2-4 写死字面量） | **红** `pass 43 / fail 1` | `status：徽章文本逐字 === SCENE_STATUS[1]…` |
| M10 | `:88` find 谓词 → `=== STYLE_PREFIX + 'charts'`（FX-A2-3 区名漂移） | **红** `pass 31 / fail 13` | 根元素／标题区／Tab／CLI／types／status／Sheet／关于／复制文本 等 13 条 |
| M11 | `:400` `lines.join(LF)` → `lines.join(',')`（FX-V2b-1） | **红** `pass 45 / fail 1` | `多字段 params：逐字以 LF 连接（FX-78-V2b-1）` |
| M12 | `:381/382` 换字面量 `'data-action-id'`／`'data-t'`（FX-V2b-2） | **红** `pass 44 / fail 2` | `src/help.ts…不写字面量属性名／命名空间…` ＋ `dist/help.js…零第三方 import`（依赖面随动） |
| M13 | `:96` 类名根改字面量 `'ilife-help-shell'`（FX-V2b-3） | **红** `pass 45 / fail 1` | `src/help.ts…不写字面量属性名／命名空间…` |
| **M14** | **`:465` `text(scene.wake_word)` → `text(scene.title)`（FX-V2b-4 存活变异）** | **红** `pass 46 / fail 1` | `chip 文本恒取 wake_word（wake_word ≠ title 的场景；FX-78-V2b-4）` |

还原后逐次复跑：**M1–M6 `pass 42/fail 0`**（R31 前基线）、**M7–M10 `pass 44/fail 0`**、**M11–M13 `pass 46/fail 0`**、**M14 `pass 47/fail 0`**（终态基线 47 用例）。M11–M14 的还原自证：`src/help.ts` SHA256 复原为 `69FFCE4565DB0187200A11AF0E6C1094E34FE0CF82CABCF5761FADD4A83826E8`（与变异前逐字节相同），`git status` 无新增改动。

## 8. 自测输出摘要

| 命令 | 结果 |
|---|---|
| `pnpm exec tsc -b --force` | **exit 0** |
| `node --test packages/base-render/test/help.test.mjs` | **tests 47 / suites 6 / pass 47 / fail 0** |
| `node --test packages/base-render/test/contract-signatures.test.mjs packages/base-render/test/help.test.mjs` | **tests 94 / suites 12 / pass 94 / fail 0**（含 `dist/**/*.js` 纯度扫描、文档投影绑死、出口面锁） |
| `node .scratch/t78/a2-evidence.mjs` | 快照 §6，产物 10,241 字节，SHA256 `3836C7C955C6659F4209C8A1CD0FA2999D12F59244207F0734FCA0D34C8E3768`（两次运行逐字节相同） |
| `src/help.ts` SHA256 | `69FFCE4565DB0187200A11AF0E6C1094E34FE0CF82CABCF5761FADD4A83826E8`（**返修前后逐字节相同**：V2b 只补测试） |
| `test/help.test.mjs` SHA256 | `97A16752C6A1BC8E0A36ED9AB42E768744748121062F78B2F71725906B7B2124C` |

- 用例数演进：42（R31 前）→ 44（R31／R32）→ 46（FX-V2b-1／2／3）→ **47**（FX-V2b-4：`test:378` chip 恒取 `wake_word`）。
- 断言强化（对齐红线「禁恒真／只断言非空」）：类名总数断言为**精确值 179**（结构快照）、依赖面断言为**精确集合 deepEqual**（零第三方）、按钮数断言为**精确计数**（`5×3+1`）、`HelpSchemaError.message` 断言**逐 code 辨因片段**、`types-invalid` 逐形态断言 message **以形态描述结尾**、`status` 徽章断言**逐字 === `SCENE_STATUS[1]` 且裸字面量不得出现**、多字段 `params` 断言**逐字 LF 连接且三种错误连接形均不得出现**、chip 断言**逐字 === `wake_word`、≠ `title`、全页 chip 集合逐值 === wake_word 列**、源码扫描**三条负控**。全文件**无** `assert.ok(`／`startsWith(`／仅非空断言。
- 测试侧同样**不自写区名字面量**：`test:41-45` 由 `CONTROL_STYLE_SECTIONS.find(kebab === HELP_SHELL_ID) ?? ''` 派生 `HELP_SECTION`／`CLS`。

## 9. 已知缺口／与契约的偏离（逐条记账 ＋ 裁定归档）

| # | 事项 | 裁定／处置 |
|---|---|---|
| 1 | `actionId` 页内重复 | **R27 保留**：契约 §3.5.3 字面优先（逐字取 `HELP_COPY_ACTIONS`），`listActionIds()` 明许重复（`spec/controls.ts:118`）；不做后缀约定、不改 `HELP_COPY_ACTIONS` |
| 2 | 壳不产 CSS（Tab／折叠／Sheet 规则 ＋ 500／820 断点归 #75 `sharedCssText`） | **R28 接受**：与 #76 toast 同性质，已记账；本票只产结构前提 |
| 3 | `contact.copy_all` 渲染为备注文本（旧布尔「一键复制」需第二套 actionId） | **R29 接受**；回补归 #88／#106 |
| 4 | `init_banner` 按钮文案取 `button_text`（缺省回落「复制指令」）；`closable`／`hidden` 不在冻结类型内不渲染 | **R29 接受** |
| 5 | `types` 徽章用内联 `style`（数据驱动 bg／fg） | **R30 接受**（属性值经 `escapeHtml`；不做 CSS 值语义校验） |
| 6 | 空 `scenes[]` → `schema-invalid` | **R11／R30 保留**（读 `SCENE_DATA_SCHEMA.minItems`，不自立第二份规则） |
| 7 | 产物形态 | **R31 已返修**：完整 HTML 文档（含 `<!DOCTYPE html>`／`<html lang="zh-CN">`／`<meta charset="utf-8">`／viewport／转义 `<title>`／闭合） |
| 8 | 逐场景 CLI 形态文本 | **R32 已返修**：恒等于 `Scene.id` 原文（逐字，经 `escapeHtml`）；不拼 `skill_name`／`group.id`，不臆造技能专属 CLI 前缀（更深回补归 #106） |
| 9 | 样式区名来源（未使用 import ＋ 注释与实现不符） | **FX-78-A2-3 已修（方案①）**：区名由 `CONTROL_STYLE_SECTIONS` 闭集 `find` 派生（`:87`），漂移 fail-fast（`:90`），类名根由区名派生（`:96`）；依赖面随动；源码负控见 `test:857` |
| 10 | 徽章文本写死 `'待开发'` | **FX-78-A2-4 已修**：`:469` 改读 `SCENE_STATUS[1]`，以「徽章整串 === 常量拼装值 ＋ 裸字面量不得出现」断言钉死（变异 M9） |
| 11 | 多字段 `params` 的 LF 连接不可观察（V2b-1 存活） | **FX-78-V2b-1 已补**：夹具新增两非空字段场景 `home_month`（`test:488`），逐字断言 LF 连接 ＋ 三种错误连接形反向断言（变异 M11） |
| 12 | 属性名／命名空间字面量未被负控锁住（V2b-2／3 存活） | **FX-78-V2b-2／3 已补**：`test:857` 源码扫描三条负控 ＋ 三条正控（变异 M12／M13） |
| 13 | `title` 与 `wake_word` 逐字相同 → chip 取哪个字段不可观测（V2b-4 存活） | **FX-78-V2b-4 已补**：`home_month` 的 `wake_word='看本月饮食' ≠ title='看本月'`；`test:378` 断言 chip 逐字 === `wake_word`、≠ `title`、全页 chip 集合逐值 === 各场景 `wake_word`（变异 M14） |
| 14 | 未发布 `scene-data.schema.json`（R5／R14）；未自造第二份 schema；`src/spec/*`／`src/index.ts`／`test-d/*`／`test/contract-signatures.test.mjs`／`package.json`／`pnpm-lock.yaml` 本票零改动 | 收口三处同步 ＋ `src/index.ts` 出口追加归编排者 |
