# #74 自查新洞（施工者自己扫出并处置／登记，不留待复验）

口径：每条给**洞**、**依据**、**处置**（自查处置 = 本票已处理；登记 = 归属票 ＋ 写明「契约未规定」）。
凡契约未规定处，#74 一律**取一个值并记账**，不静默略过。

| # | 洞 | 依据（契约原文／位置） | 处置 |
|---|---|---|---|
| N-1 | **`String.prototype.replace` 的替换模式**：替换文本里的 `$&`／`` $` ``／`$'`／`$n` 会被当替换模式改写 | 契约未规定实现方式；资产文本与 JSON 载荷都可能含这些字符 | **自查处置**：`src/template.ts` 的 `replaceFirst()` 用 `indexOf` + 切片拼接，不用 `String.replace`；D3 用例「替换不受 `$&`／`` $` `` 等替换模式影响」钉死 |
| N-2 | **容器属性解析会误命中 `data-id`**：`tooling/classify-templates.mjs:125` 的正则 `id\s*=\s*"([^"]*)"` 对 `<script data-id="x" id="payload">` 会先取到 `x` | §3.1 第 2 条只规定「id／type 必须逐字等于」，未规定属性解析口径 | **自查处置**：`fillTemplate` 用 `(?:^|\s)` 前缀收严（65 个真实模板结果不变）；**登记**给 #79／#92：分类脚本口径偏松，建议同步收严（两处解析应同口径） |
| N-3 | **容器闭标签未被校验**：定位口径只取「标记左侧最近的未闭合开标签」＋ id／type 逐字，未要求标记右侧存在 `</script>` | §3.1 第 2 条（FX-118-11 F-2 的定位口径） | **登记**：`<script id="payload" type="application/json"><!--INJECT-DATA-->`（无闭标签）当前**通过**；是否要拦由 #79／#92 定（改动会新增一种 `container-missing` 因） |
| N-4 | **`<!--NO-SHARED-->` 是否从输出移除未规定** | §3.1 标记表「无填充物（豁免声明本身）」＋「`NO-SHARED` 不是注入步，只改数量校验」 | **自查处置**：原样保留（不替换、不删除），`report.markers.noShared.filled === false`；D3 用例断言该口径。**登记**给 #79：若要求「零残留含 NO-SHARED」，须改契约条文 |
| N-5 | **非字符串 `template`／缺失 `assets` 的码归属未规定** | §3.1 只定义模板文本层面的 8 个码 | **自查处置**：`template` 非字符串按空模板处理 → 走 `marker-missing`（不抛 `TypeError`）；`assets` 缺失 → 被消费的资产报 `asset-missing`。**登记**：契约可显式写明 |
| N-6 | **默认档放行 `data: null`／非对象** | §3.1 第 4 条：默认档只要求「可 JSON 序列化」；`null` 可序列化 | **自查处置**：默认档放行、`strict: true` 才拦（D3 用例：`data: { anything: true }` 默认档通过）；**登记**：若默认档也要拦非对象，须改契约 |
| N-7 | **空白串资产（`'   '`）不算空串** | §3.1 第 5 条写「被消费的资产为空串」 | **自查处置**：只判字面 `''`（未提供／空串）→ `asset-missing`；纯空白不判（避免超出条文）；**登记**给 #79 决定是否收严 |
| N-8 | **`report.markers` 数组序未规定** | §3.1「注入结果」只规定字段与覆盖范围 | **自查处置**：取 `TEMPLATE_MARKERS` 的键序（六个标记的规范序）；D3 用例逐值断言 |
| N-9 | **`bytes` 的字节口径未写明编码** | §3.1「`bytes` = 输出 HTML 字节数（对齐旧 CLI 结果 JSON 口径）」 | **自查处置**：UTF-8 字节数，用 `TextEncoder`（**不用** `Buffer`——base-paint 是浏览器侧共享层）；D3 用例与 `Buffer.byteLength(html, 'utf8')` 逐值相等 |
| N-10 | **资产文本含契约标记字面量时的替换行为** | §3.1.2①：「资产文本若含契约标记字面量，属产出者缺陷，不靠替换顺序兜底」 | **登记**：本票按 `INJECTION_ORDER` 顺序替换，若资产文本自带标记字面量仍可能被后续步替换（产出者缺陷面）；不新增校验（避免自造码） |
| N-11 | **`escapeHtml` 的实现来源**：本票让 `src/contract.ts` 从 `src/spec/controls.ts` 取 `ESCAPE_HTML_CHARS`／`ESCAPE_HTML_ENTITIES` | §0.2「两物…不得互相 import 实现」（**纯数据常量**不属「实现」）；§3.3 AC-14「转义集固定 `ESCAPE_HTML_CHARS`」 | **自查处置**：取常量使「改契约即改行为」，漂移无处藏；方向单向（`contract.ts → spec/`，`spec/` 仍只 `import type`、零副作用）；D3／签名测试双向钉死五字符逐值。**登记**：若 #79 认为「既有运行时不得依赖 spec/」，可退回字面 5 字符链（行为不变） |
| N-12 | **A8 的「零残留」口径**：`skill-memo-ilife/templates/sync_report.html` 含 5 处**模板自带** HTML 注释（非契约标记） | §3.1.2④①／A8 指的是**契约标记**零残留 | **自查处置**：D3 断言「六个标记字面量零残留」，不断言「一切 `<!--` 零残留」（后者会误伤模板自带注释）；登记为口径说明 |

## 复跑

- `node --test packages/base-render/test/template.test.mjs`（36 用例：A1–A9 ＋ report／bytes／替换细节）
- `node --test packages/base-render/test/contract-signatures.test.mjs`（46 用例）
- `node docs/research/t74-escape-html-calorie-diff.mjs`（D5 证据）
- `node tooling/classify-templates.mjs --inventory`（65 模板 = 6／53／6，与清单逐条一致）
