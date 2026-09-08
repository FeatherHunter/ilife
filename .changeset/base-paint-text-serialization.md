---
'base-paint': minor
---

#77（map #63）base-paint 复制文本序列化落地：`buildDataText`／`buildLogText`（契约 §3.4／§6.4）。

**新增运行时**（2 条）：`buildDataText(input: DataTextInput): string` 与 `buildLogText(input: LogTextInput): string`。
输入对齐 envelope（B2：snapshot 结构接口**不移植**），逐 shape 投影恒读 `DATA_TEXT_PROJECTIONS`，
6 段日志数据源恒读 `LOG_SECTION_SOURCES`（`scene` 由 envelope 派生 `{skill}.{key}（{shape}）`），
敏感行判定与掩码恒读 `SENSITIVE_ROW_RULE`（**只认字面 `true`**，非旧侧真值判定）。

**`format` 语义补全（旧侧未定义，本票定死）**：`text`（缺省）输出头 `TEXT_HEADER_TEMPLATE` ＋ 时间行 ＋
投影主体行 ＋ 收尾行、行内 CR／LF 替换为空格、空值写 `TEXT_EMPTY_PLACEHOLDER`／日志缺段写
`LOG_UNKNOWN_PLACEHOLDER`；`json` 键名 = envelope 五字段原样、缩进 `TEXT_JSON_INDENT`、`<` 一律写成
反斜杠 + `TEXT_JSON_LT_RULE`、空值保留 `null`；`csv` 表头 `CSV_DIALECT.header`（`section,row`）＋ RFC4180
引号规则（含 `,`／`"`／换行即包裹、内部 `"` 双写）＋ LF 行尾、空值写空串。三个错误码
`shape-unsupported`／`structure-invalid`／`format-unknown` 逐码可达，失败**一律抛错、不返空、不降级**
（`TextError` 按 `name`／`code` 判定，**不新增运行时出口**）。

**与旧基线的偏离（R-1，逐条记账于契约 §3.4「行为补遗」）**：旧 `csv` 是行拼接（无表头、无 `section` 列、
无引号转义）；旧 `buildLogText` 完全忽略 `format`（无 json／csv 行为）；旧各段缺省文案四种
（`(本地渲染 · 无 AI 链)`／`(只读查询)`／`(未知)`／`无`）统一为 `LOG_UNKNOWN_PLACEHOLDER`；
旧敏感行把掩码与提示合成一行、且做真值判定 → 新契约拆成「掩码行 ＋ 提示行」且只认字面 `true`；
旧 snapshot 结构校验（`title`／`summary[]`／`sections[{heading,rows}]`）全部废除，判据改
`EnvelopeDataByShape[shape]`。**一律以新契约为准**，不移植旧实现。

**签名面零改动**：`SPEC_FROZEN_SURFACE` 仅把 `BuildDataText`／`buildDataText`／`BuildLogText`／
`buildLogText` 四条 `status` 由 `pending` 翻成 `implemented`（130 条不变：implemented 119 → 123、
pending 11 → 7，余下 7 条 = #75 2／#78 5），三处同步（清单 ↔ 契约 §3.4 标记区表格 ↔
`test-d/contract-signatures.ts` 的 `Absent<>` → `Present<>`）。出口面锁**由清单派生**（`contract-signatures.test.mjs`
的「新增运行时出口恰好等于清单 implemented 的运行时项」），故 `test.mjs` 本票**零改动**仍能锁住出口面
（原「断言翻转」措辞不准确，已改准）。
本票**未实现** `buildStyleSheet`（#75）／`charts`／`renderHelpShell`（#78）的任何行为。
本 changeset 只声明 `base-paint`；base-* 三包统一版本由 #79 的 changesets `fixed` 组落地。

**测试与证据**：`packages/base-render/test/text.test.mjs` **83 用例**（5 shape × 3 format 投影／6 段日志逐段
数据源／空值分层／敏感行逐 format／三错误码逐码可达与判定次序／旧层 7 条序列化用例行为面／与 #76
`copyText` 空串短路与 `ErrorReceiptInput.dataText|logText` 接线／`undefined` 归一与空产出恒非空／
未覆盖边界补测）；可复跑证据
`docs/research/t77-serialization-evidence.mjs` ＋ 快照 `docs/research/t77-serialization-evidence.md`
（**215 条断言全绿**，输出确定性：重跑逐字节相同，SHA256 `BAF27B44…BF5D27`）。门禁：`pnpm build`／
`pnpm boundaries`／`pnpm test:types` 三条 exit 0；`pnpm test` **新增失败 = 0**（判据 = `docs/research/t92-baseline-failures.md`
失败用例名多重集）。

**复验收严（V1／V2／V3 三份独立验收后 · FX-77-1…8）**：① `json` 下 `undefined` 属性**归一为 `null`（保留键）**
——同一输入的三 format 键集／行数一一对应（此前 `JSON.stringify` 静默丢键，违反「键不省略」），
**含嵌套对象值**（`text`／`csv` 的对象值经同一 `JSON.stringify` 包装，同口径不丢键）；
② **产出真正恒非空**：输出头行恒存在、空串 `title` 视同缺省（此前 `title: ''` ＋ 空投影体产出 `''`，
经 `copyText` 空串短路**静默不复制**）；③ 输出头模板**单趟**展开（`skill: '{key}'` 不再二次展开）、
`CSV_DIALECT.lineEnding` **被消费**、`switch` 补 `never` 穷尽兜底、`BigInt` 报错文案按因区分；
④ 证据脚本缩进断言由 `startsWith('  ')` 改为**逐行**比对（3 空格缩进即红），并补 `undefined`／空产出
两节实证；⑤ 未定口径（CRLF 双空格、`NaN`／`BigInt`／`Date` 三口径、`U+2028`、容器级敏感包装、
日志敏感行条款不可达）逐条登记为「不冻结也不排除，owner #77」，见契约 §3.4.7。
