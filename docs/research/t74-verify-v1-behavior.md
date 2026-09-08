# V1 行为与契约验证（#74 `fillTemplate`）

验证者：V1 独立对抗式验收（施工者不得自证）。工作目录 `D:\ilife`，**只读被验文件**，未执行任何 `git add`／`commit`，未修改任何被验文件。
契约正本：`docs/base-paint-contract.md` §3.1（`:124-183`）＋ §3.1.2（`:193-251`）；冻结面 `packages/base-render/src/spec/template.ts`。
被验对象：`packages/base-render/src/template.ts`（运行时，427 行）、`packages/base-render/test/template.test.mjs`（570 行 / 36 用例）。
作者自述（`docs/research/t74-acceptance.md`、`docs/research/t74-self-audit.md`）仅作对照，**每条均自行复核**。

## 实测方式（复跑命令原文）

- `node --test packages/base-render/test/template.test.mjs` → `tests 36 / suites 10 / pass 36 / fail 0 / cancelled 0 / skipped 0 / todo 0`。
- `node --test packages/base-render/test/contract-signatures.test.mjs` → `tests 46 / suites 6 / pass 46 / fail 0`。
- 自造对抗探针（不写仓库，落 `%TEMP%\v1-t74-probe{,2,3,4}.mjs`，直接 `import` `packages/base-render/dist/index.js` 与 `dist/spec/template.js`）：
  - probe1：**114 项断言，2 项「FAIL」经查为探针自身预期写错**（见 A3／A7 条目，已重跑更正）。
  - probe2／3／4：16 ＋ 6 ＋ 7 项边界与观察型取证，全 PASS。
- `Select-String` 扫描 `src`／`dist` 的 `parseEnvelope`／`base-link-core`／`node:`／`<!--`／`<style>`／`<script>`／`payload`／`application/json`／错误码字面量。
- `dist/template.js`（mtime `2026/9/9 0:26:11`）晚于 `src/template.ts`（`0:25:47`）；`dist` 与 `src` 结构逐段一致（下方「实现审计」给证据）。

## A1–A9 逐条

### A1 六标记数量规则（含 NO-SHARED 豁免与互斥）——符合

- 计数恒读 `TEMPLATE_MARKERS` 键序：`src/template.ts:84`（`MARKER_KEYS = Object.keys(TEMPLATE_MARKERS)`）、`:124-128`（`countMarkers`）。
- 重复（>1）→ `marker-duplicate`：`src/template.ts:247-255`（`MARKER_KEYS.find(counts>1)`，`rule` 取自 `MARKER_RULES`）。
- 必需缺席且未豁免 → `marker-missing`：`:266-272`（`rule.required && counts===0 && !(rule.exemptable && exempt)`）——**豁免资格读冻结的 `exemptable`**（`:228`），不自立名单。
- `exempt = counts.noShared === 1`：`:222`；NO-SHARED 与 SHARED 并存 → `marker-conflict`：`:283-293`（`sharedKeys` 取 `MARKER_RULES[key].exemptable`）。
- 冻结常量：`spec/template.ts:22-29`（六字面量）、`:52-59`（`MARKER_RULES`）。
- 作者测试：`test/template.test.mjs:112-197`（6 用例）。
- 我的实测（探针 a1-* 共 22 项全 PASS）：六标记各自 ×2 → `marker-duplicate`＋正确 `marker`；`sharedCss`／`sharedHelpers` 缺席（未豁免）→ `marker-missing`；`noShared` 豁免合法且 `report.exempt===true`、两 SHARED `count=0/filled=false`、`noShared.filled=false` 且字面量原样留在输出；`noShared`＋`sharedCss`（或 `sharedHelpers`）→ `marker-conflict`；`noShared`＋`chartsHelpers`＋charts 资产 → **合法填充**（charts 非 `exemptable`，不属互斥面）；`noShared`＋`sharedCss×2` → `marker-duplicate`（次序 1 早于 3）；`noShared`＋charts 标记但无 charts 资产 → `asset-missing`。

### A2 载荷槽规则（恰有其一）——符合

- 两者皆无 → `PAYLOAD_SLOT_RULE.missingCode`：`src/template.ts:258-265`；两者皆有 → `.conflictCode`：`:275-282`；两者皆读 `PAYLOAD_SLOT_RULE.members`（冻结 `spec/template.ts:76-81`），不写第二份成员表。
- 作者测试：`test/template.test.mjs:200-233`。
- 我的实测（a2-* 6 项全 PASS）：两槽皆有→`marker-conflict`；两槽皆无→`marker-missing`；恰有其一两侧均 OK；**`injectData×1`＋`content×2` → `marker-duplicate/content`**（次序 1 早于 3，与 §3.1.2⑤ 表一致）；无载荷槽＋`sharedCss×2` → `marker-duplicate/sharedCss`。
- 补充观察（契约未规定、探针 P1–P3）：无载荷槽且 SHARED 同时缺席时，抛的是**载荷槽分支**（`marker=undefined`、message `载荷槽缺失…`），而非「必需标记缺失」分支——同码不同因，契约 §3.1.2⑤ 阶段 ② 未细分，不构成违约。

### A3 容器校验作用域——符合（含 1 项契约留白）

- 作用域门恒读 `CONTAINER_CHECK_RULE.appliesWhenMarker`：`src/template.ts:306`（`counts[appliesWhenMarker]===0 → return`）；定位＝最近未闭合开标签：`:176-189`（`lastIndexOf('<' + tagName)`，且 `lastIndexOf(closeTag) > openIndex → null`）；id／type 逐字比较：`:318`（`expectedDataScriptId = source.dataScriptId ?? CONTAINER_CHECK_RULE.id`，`:226`）。
- 冻结常量：`spec/template.ts:223-230`（`appliesWhenMarker: 'injectData'`、openTag／closeTag 复用 `ASSET_WRAPPERS`、id／type 复用 `DEFAULT_DATA_SCRIPT_ID`／`DATA_SCRIPT_TYPE`）。
- 作者测试：`test/template.test.mjs:235-271`。
- 我的实测（a3-* 12 项 ＋ a3b 3 项全 PASS）：
  - 内容页无容器 → OK，且输出**不含** `id="payload"`（填充器不生成容器，契约 §3.1:171）。
  - 内容页含**未闭合** payload 容器（置于 helpers 之后）→ OK，**不抛 `container-missing`**（作用域门有效）。
  - 数据页缺容器／id 不符／type 不符 → `container-missing`＋`marker=injectData`。
  - 已闭合容器＋后置裸 `<script>`（无 id）→ `container-missing`（不把业务脚本当容器）。
  - 标记在容器之前 → `container-missing`。
  - **属性序颠倒 `type` 先 `id` 后 → OK**；`data-id="x" id="payload"` → OK（`:185` 的 `(?:^|\s)` 收严，避免误命中 `data-id`）；未加引号 `id=payload` → `container-missing`（双引号口径）。
  - `dataScriptId:'scene'` 匹配 → OK；不匹配 → `container-missing`。
  - 探针自身 2 项「FAIL」更正：① 初版把未闭合容器放在 `sharedHelpers` 之前，触发不变量②（正确行为），重排后 OK；② `strict+data:undefined` 的期望 `marker` 写错，实测 `data-missing/injectData`（冻结 `marker?` 未规定该字段，不构成违约）。
- 观察型（契约未规定，记录行为，非违约）：属性值内含 `>` → `container-missing`（`:182` `indexOf('>')` 截断标签）；大写 `<SCRIPT …>` → `container-missing`（标签名逐字小写口径）；容器**无闭标签**（N-3）→ **通过**，见「未覆盖的边界」第 3 条。

### A4 包裹约定（两条不变量 ＋ 数据页不误判）——符合

- 填充器包裹：`src/template.ts:393-404`，包裹标签恒读 `ASSET_WRAPPERS`（`:401`；标签集 `:87-88` 由 `ASSET_WRAPPERS` 派生，`:90` 派生标签名形式）——本文件**无** `<style>`／`<script>` 字面量（`dist/template.js` 扫描仅注释命中）。
- 不变量① `assetsBare`：`:341-351`，判定＝`trim()` 后 `startsWith(任一 openTag)`／`endsWith(任一 closeTag)`（**不用 `includes`**），仅在被消费标记存在时校验（`:330`）；码读 `ASSET_WRAP_RULE.assetWrappedCode`（`:336`）。
- 不变量② `forbidPreWrappedMarker`：`:149-164`（作用域读 `WRAP_PREDICATES.forbidPreWrappedMarker.scope`，`excludes` 显式跳过 `injectData`，扫描整个左侧前缀、不限同行）＋抛错 `:294-302`（码读 `WRAP_PREDICATES.forbidPreWrappedMarker.code`）。
- 冻结常量：`spec/template.ts:137-148`、`:156-160`、`:167-171`、`:190-202`。
- 作者测试：`test/template.test.mjs:273-321`。
- 我的实测（a4-* 19 项全 PASS）：三资产逐字包裹且各出现恰 1 次（不双包）；起／止自带包裹标签 → `asset-missing`（含**跨资产**：helpers 以 `</style>` 止、css 以 `<script>` 起均被判违反，与「任一 openTag／closeTag」逐字一致）；中段含 `<script>…</script>` 字面量 → 合法；**未消费的 charts 资产即使自带包裹标签也不校验** → OK；`sharedCss` 同行预包裹／`sharedHelpers` 跨行预包裹 → `marker-conflict`；**`chartsHelpers` 预包裹 → `marker-conflict/chartsHelpers`**（作者测试只断言作用域常量，未造此样本）；`injectData` 落容器内 → OK（`excludes` 生效，S-2）；`content` 落 `<script>` 与 `<style>` 内均 OK、`noShared` 落 `<style>` 内 OK（不在作用域）；`<style></style>` 已闭合后出现标记 → OK。
- 观察型：`WRAP_PREDICATES` 的判定方式本身是**字面量前缀扫描**，故 `<script></script>var s="<script";` 这类「闭合标签之后的字符串里出现 `<script`」会误报 `marker-conflict/sharedCss`——实测命中；这是**冻结谓词定义的行为**（`spec/template.ts:182-186` 明写 `lastIndexOf` 比较），实现与谓词逐字一致，不是实现缺陷。

### A5 判定次序（首个命中即抛、不聚合）——符合

- 次序恒读 `TEMPLATE_CHECK_ORDER`：`src/template.ts:245`（八阶段表，键＝`TEMPLATE_ERROR_CODES` 全量，TS 收窄）＋ `:383`（`for (const code of TEMPLATE_CHECK_ORDER) stages[code]()`）；每阶段 `fail()` 即抛（`:79-81`），**无聚合路径**。
- 冻结常量：`spec/template.ts:283-292`；作者测试：`test/template.test.mjs:323-364`（7 组）。
- 我的实测（**10 组多条件样本**，全 PASS，逐组只抛一个码）：① 重复＋缺槽＋预包裹＋空资产→`marker-duplicate/sharedHelpers`；② legacy＋预包裹＋空资产→`marker-missing`；③ 两槽皆有＋缺容器→`marker-conflict`；④ 缺容器＋空资产→`container-missing`；⑤ **容器合规＋空资产＋data 缺失→`asset-missing/sharedCss`（5 早于 6）**；⑥ 内容页空资产＋content 缺失→`asset-missing/sharedHelpers`（5 早于 7）；⑦ 数据页合规＋data 缺失＋strict→`data-missing/injectData`；⑧ 内容页 content 缺失→`content-missing/content`；⑨ 数据页合规＋非法信封＋strict→`strict-invalid`；⑩ 两槽皆有＋content×2→`marker-duplicate/content`。

### A6 8 码逐条可达 ＋ 失败一律抛 `TemplateError`、不返空页——符合

- `TemplateError` 形态：`src/template.ts:64-76`（`name='TemplateError'`、`code`、可选 `marker`，继承 `Error`）；`fail()`：`:79-81`。
- 作者测试：`test/template.test.mjs:366-413`（`SAMPLES` 覆盖 `TEMPLATE_ERROR_CODES` 全量并逐码断言，另证「不返空」）。
- 我的实测（**自造 8 个与作者不同**的最小样本，逐码 PASS）：8 码各自 `code` 正确、`err instanceof TemplateError`、`name==='TemplateError'`、`message` 非空、**无任何输出返回**（`html===null` 观测）；`fillTemplate({})` 与 `fillTemplate(null)` 均 `marker-missing`（不抛 `TypeError`）；`TEMPLATE_CHECK_ORDER` 是 `TEMPLATE_ERROR_CODES` 的排列。

### A7 `strict` 两档 ＋ 禁调 `parseEnvelope`——符合

- 默认档硬拦截：数量（`:247-272`）／载荷槽（`:258-282`）／容器（`:305-326`）**与 `strict` 无关**（阶段 ④ 无 `strict` 门）；`data` 仅要求可序列化：`:355-363`（`:232-241` `serializeData` 惰性＋记忆化，异常→`null`）。
- `strict:true` 追加信封校验：`:372-380`（`strict!==true || !dataPage → return`），五字段＋六形状：`:193-201`（`hasOwnProperty` 五字段、`shape` ∈ `STRICT_ENVELOPE_SHAPES`），常量 `spec/template.ts:233-235`。
- **禁调 `parseEnvelope`**：`src/template.ts:28-53` 只 `import` `./spec/template.js`（值导入全部为纯数据常量）＋ `import type`；`Select-String` 扫 `src/*.ts`／`dist/*.js`：`parseEnvelope` 命中**仅出现在注释**（`src/template.ts:12,192` ／ `dist/template.js:12,154`），无 `base-link-core` 运行时 import、无 `node:`。作者测试 `test/template.test.mjs:452-459` 剥 `/* */` 后扫描 `dist/template.js` 复证。
- 我的实测（a7-* 17 项全 PASS）：默认档放行非信封对象（`report.strict===false`）；`strict:true` 下 `'text'`／`42`／`null`／`[]`／`true`／`shape:'LIST'`／逐个删除五字段 → `strict-invalid`；六形状逐一放行且 payload 为 JSON 文本；内容页忽略 `data`／`strict`（含 `data:10n` 与循环引用）；`strict+data:undefined` → `data-missing/injectData`（次序 6 早于 8）；`Object.create(ENV)`（字段继承）→ `strict-invalid`（`hasOwnProperty` 口径，契约未规定，记录为边界）。

### A9 calorie 6 模板 → `marker-missing`（正确行为）——符合

- 作者测试：`test/template.test.mjs:515-527`（断言 6 个文件、两载荷槽各 0 次、逐文件抛 `marker-missing`）。
- 我的实测：`D:/ilife/packages/skill-calorie/templates` 实读 6 文件 `diet.html,exercise.html,goal.html,help.html,home.html,photo-gallery.html`，逐个断言 `count(INJECT-DATA)===0 && count(CONTENT)===0` 且 `fillTemplate(...)` → `marker-missing`（6/6 PASS）。与 `spec/template.ts:96-99`（legacy 口径）／契约 §3.1.2③ 一致。

### 范围外（归 V2／V3，本次未判定）

A8（53＋6 真实模板零残留）／A10（`escapeHtml`）／A11（迁移文档）／A12（门禁、越界、changeset）／A13。签名测试已按 V1 要求独立复跑（46/46），未据此下结论。

## 断言质量审计（逐条）

1. **恒真断言（2 处，作者本票新写）**：
   - `test/template.test.mjs:409` `assert.ok(!('code' in new Error()), '不得把 TemplateError 包成 RenderError 之类既有形态')`——`new Error()` 恒无 `code`，该断言**与实现无关、永真**；其宣称的意图由紧邻的 `:410`（码集不重叠）承担。**空断言**。
   - `test/template.test.mjs:549` `assert.ok(out.report.bytes >= out.html.length, …)`——对任意字符串 UTF-8 字节数恒 ≥ UTF-16 码元数，**永真**；真正的断言是 `:547`（与 `Buffer.byteLength(html,'utf8')` 逐值相等）。
   - 另一处零信息断言：`:137` `assert.ok(!none.html.includes(M.chartsHelpers), '0 次合法：标记本就不在模板里')`——fixture 本就不含该标记，恒真；「0 次合法」的真实证据是 `:136` 的成功返回。
2. **用常量断言替代行为断言**：`:130-131`（`MARKER_RULES`）、`:207-208`（`PAYLOAD_SLOT_RULE`）、`:242`（`appliesWhenMarker`）、`:305-306`（`WRAP_PREDICATES` 作用域／排除项）、`:550`（`INJECTION_ORDER` 深比较）。这些是**契约钉死**、合法，但**不能计入行为覆盖**；其中 `:550` 尤其重要——`INJECTION_ORDER` 只被「深比较常量」，**没有任何断言把观测到的替换行为绑定到该数组**（契约 §3.1.2①／④ 明言先后不可断言，故这一条只能靠常量钉死，属可接受）。
3. **「一码多义由 message 辨因」只被部分覆盖**：`expectCode` 只要求 `message` 非空（`:104`），只有 `container-missing` 两因做了措辞断言（`:248`、`:406`）。`asset-missing`（空串 vs 自带包裹标签）与 `marker-conflict`（两槽皆有／NO-SHARED 与 SHARED 并存／标记预包裹）三因**没有任何逐因 message 断言**（契约 §3.1.2⑤ 末条／`spec/template.ts:244-247`）。
4. **错误类型被吞的用例**：`:389-398` 用 `catch { /* 期望 */ }` 吞掉异常，`TypeError` 也能通过；不过同批 `:379-387` 已用 `expectCode` 逐码断言 `instanceof TemplateError`，覆盖不丢。
5. **测试跑的是 `dist`**：`test/template.test.mjs:36-37` 从 `../dist/index.js`／`../dist/template.js` 取件，而 root `package.json` 的 `test` 脚本**不含 build**（`"test": "node --test …"`，`"build": "tsc -b"` 独立）→ 若 `dist` 陈旧，行为测试会「测旧产物」且无 src↔dist 新鲜度断言。本次实测 `dist/template.js` 晚于 `src/template.ts` 且结构逐段一致，故不影响本次结论（低）。
6. **`:410` 用硬编码 3 个 RenderError 码名**（`missing-data`／`bad-envelope`／`reco-only`）而非从实现读码集 → 漂移风险（低）。
7. **未发现被放宽的断言**：错误路径全部走 `expectCode`（`code`＋`marker`＋`message` 三重），成功路径均断言了输出内容／`report` 逐值（`:539-540` 甚至逐值钉死 `count`／`filled` 数组），`SAMPLES` 与 `TEMPLATE_ERROR_CODES` 做集合等价（`:380`、`:386`）。**无「只测 happy path」的整体倾向**；缺口集中在下方「未覆盖的边界」。

## 实现审计

- **恒读冻结常量（逐条给行号）**：`TEMPLATE_CHECK_ORDER` → `src/template.ts:383`（次序唯一来源，阶段表不带次序）；`INJECTION_ORDER` → `:329`（资产校验）与 `:393`（注入）；`WRAP_PREDICATES` → `:150`（scope／excludes）、`:297`（code）、`:347`（method）；`CONTAINER_CHECK_RULE` → `:177`／`:181`／`:226`／`:306`／`:307`／`:311-315`／`:318`／`:320-323`；`TEMPLATE_MARKERS` → `:84`／`:126`／`:154`／`:252`／`:262`／`:272`／`:279`／`:288`／`:299`／`:307`／`:312`／`:337`／`:347`／`:358`／`:368`／`:402`／`:408`／`:414`。另：`MARKER_RULES` `:228/:253/:267/:415`、`PAYLOAD_SLOT_RULE` `:259/:261/:276/:279`、`TEMPLATE_KIND_RULE` `:137/:386`、`TEMPLATE_KINDS` `:136`、`ASSET_WRAPPERS` `:87-88/:401`、`ASSET_MARKER_KEYS` `:94-96`、`ASSET_WRAP_RULE` `:287/:336/:346`、`STRICT_ENVELOPE_*` `:196/:200/:377-378`。
- **第二份字面量**：`src/template.ts` **无** `<!--…-->`／`<style>`／`<script>`／`payload`／`application/json` 字面量（`dist/template.js` 全文扫描，命中项全为注释）。唯一实质重复项：`:399` 的 `'\\u003c'` 与冻结常量 `TEXT_JSON_LT_RULE = 'u003c'`（`src/spec/text.ts:129`，契约 §3.1:172 **点名**该常量「同口径」）——**未引常量、写死字面量**，漂移不可发现（低/nit）。其余字面量仅为阶段键与码字符串（`:245-380` 的表键、`:358/:361/:368/:376` 的 `fail()` 实参），均由 `TemplateErrorCode` 收窄，拼错即编译红。
- **不变量①的作用域来源**：判定集合来自 `ASSET_WRAPPERS`（`:87-88`）＋遍历集合来自 `INJECTION_ORDER`（`:329`），**未直读** `WRAP_PREDICATES.assetsBare.scope`（`:341-343`）。与冻结 scope 当前等价（两者同为三资产键集），属等价推导而非第二真相（低/nit）。
- **容器属性解析**：`:185` 正则 `(?:^|\s)name\s*=\s*"([^"]*)"`，比 `tooling/classify-templates.mjs` 收严（避免 `data-id` 误命中，N-2）；`:182` 用 `indexOf('>')` 截断标签，属性值内含 `>` 会误判（见边界第 2 条）。
- **失败路径**：全部经 `fail()` 抛 `TemplateError`，无 `return { html: '' }` 分支（`:79-81`、`:386`）。

## $ 安全

- 实现方式：`replaceFirst()` 用 `indexOf` ＋ 切片拼接，**不用** `String.prototype.replace`（`src/template.ts:112-121`，注释明写 `$&`／`$'`／`` $` `` 风险）。
- 我的自造样本（探针 d-* 全 PASS）：资产文本、正文、模板本体、**以及 JSON 载荷**分别注入 `$&|$`|$'|$1|$$|$<x>` 串：
  - 载荷：输出 `<script …>` 内文本 `JSON.parse` 后**逐值等于输入**（`{"version":"0.1.0",…,"data":{"s":"$&|$`|$'|$1|$$|$\u003cx>"}}`），且 `<!--INJECT-DATA-->` 零残留；
  - 资产／正文／模板本体：串**逐字出现恰 1 次**，无 `$&` 触发的「匹配文本回填」痕迹。
- 作者测试覆盖：`test/template.test.mjs:564-568`（资产＋正文含 `$&`）；**JSON 载荷含 `$` 模式未被作者覆盖**，由我的探针补齐（PASS）。

## 未覆盖的边界

1. **`chartsHelpers` 预包裹 → `marker-conflict`**：作者测试只用 `assert.deepEqual` 钉死作用域常量（`test:305-306`），**没有真实抛错样本**；我实测命中（`marker-conflict/chartsHelpers`），实现正确、测试有洞。
2. **容器属性形态**：作者只覆盖单引号口径（`test:268-269`）。未覆盖：属性序颠倒（实测 OK）、`data-id` 诱饵（实测 OK）、未加引号（实测 `container-missing`）、**属性值含 `>`**（实测 `container-missing`——`:182` 的 `indexOf('>')` 截断，属误拒的边界）、大写 `<SCRIPT>`（实测 `container-missing`）。
3. **容器无闭标签（N-3，`self-audit.md:10` 已登记）**：`<script id="payload" type="application/json"><!--INJECT-DATA-->`（无 `</script>`）实测**通过**（填充成功）。契约 §3.1:173 的定位口径只规定「左侧最近未闭合开标签」＋id／type 逐字，实现**符合口径**；条文本身未要求右侧存在闭标签 → 契约留白，非实现违约。
4. **纯空白资产 `'   '`（N-7，`self-audit.md:14`）**：实测 OK 且注入 `<style>   </style>`（只判字面 `''`）；无测试、契约只写「空串」。
5. **`NO-SHARED`＋`SHARED-CSS×2` 的次序组合**：无测试；实测 `marker-duplicate`（次序 1 早于 3）。
6. **JSON 载荷含 `$&`／`` $` ``／`$'`**：无测试（见「$ 安全」）。
7. **资产文本自带契约标记字面量（N-10，`self-audit.md:17`）**：实测 `sharedHelpersJs` 含 `<!--SHARED-CSS-->` 时，`sharedCss` 步把**资产内的**字面量当首个命中替换，模板自身的 `<!--SHARED-CSS-->` **残留在输出**，而 `report.markers.sharedCss.filled === true`（与输出不一致）。契约 §3.1.2① 明确判为产出者缺陷、不要求兜底 → 非违约，但该可观察面**无任何测试**。
8. **同一调用多标记重复时的 `marker` 归因**：契约未规定；实测取 `TEMPLATE_MARKERS` 键序首个（`sharedCss×2`＋`content×2` → `marker-duplicate/content`）。无测试。
9. **输入形态边界（N-5，`self-audit.md:12`）**：`template` 非字符串／`input` 为 `null`／`assets` 整体缺失／`content` 非字符串均无测试；实测分别 `marker-missing`／`marker-missing`／`asset-missing/sharedHelpers`／强制 `String()`。
10. **`strict` 信封字段「继承」口径**：`Object.create(ENV)` 实测 `strict-invalid`（`hasOwnProperty`，`:197`）；契约只写「含五字段」，未规定自有／继承 → 无测试、条文留白。
11. **`data` 可序列化但非 JSON 保真**：`data: NaN` → 注入 `null`、`data: {a: undefined}` → `{}`，契约只要求「可 JSON 序列化」→ 无测试（低）。
12. **`INJECTION_ORDER` 的行为断言缺失**：顺序在契约上不可观察（§3.1.2①／④），唯一可观察场景恰是第 7 条的产出者缺陷面；测试只钉常量。

## 结论

- A1、A2、A4、A5、A6、A7、A9：**逐条符合冻结契约**，证据行号与自造样本见上；A3 **符合**（含 1 项契约留白 N-3，实现按冻结口径行事）。
- 测试整体**真断言**（错误路径三重断言、`report` 逐值、错误码集合等价），未发现被放宽或「只测 happy path」的倾向；存在 **3 处恒真／零信息断言**（`test:409`、`:549`、`:137`）与若干「常量断言代替行为断言」，均为低/nit，不影响任何 A 判据的成立。
- 阻塞级洞（高／中）：**0**。

V1 结论：通过
阻塞级洞（高/中）数量：0
