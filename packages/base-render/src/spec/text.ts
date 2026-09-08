/** base-paint/spec/text：复制文本序列化契约（#77 冻结面）。
 *
 * B2／AC-5：snapshot 结构化接口不移植，输入对齐 envelope `shape`；
 * `buildDataText`／`buildLogText` 保留（复制文本来源），并补全旧侧未定义的
 * `format` 语义（text／json／csv 的转义与空值口径，见文档 §3.4）。
 *
 * 依赖红线：只许 `import type`（AC-13）。
 */

import type { Envelope } from 'base-link-core';

export const COPY_FORMATS = ['text', 'json', 'csv'] as const;

export type CopyFormat = (typeof COPY_FORMATS)[number];

/** 可序列化形状：envelope 六形状去掉 `fallback`（降级载荷不进复制文本）。
 *  成员**顺序无语义**（不决定 CSV 行序／遍历序），只有成员集有效。 */
export const SERIALIZABLE_SHAPES = ['stat', 'list', 'detail', 'analysis', 'receipt'] as const;

export type SerializableShape = (typeof SERIALIZABLE_SHAPES)[number];

export type SerializableEnvelope = Envelope<SerializableShape>;

/** 6 段日志段序（逐字对齐旧 §6.1：①场景标识②AI思考链③数据结构④调用链⑤时间戳版本⑥异常）。 */
export const LOG_SECTIONS = ['scene', 'thinking', 'dataStructure', 'callChain', 'timestampVersion', 'exception'] as const;

export type LogSection = (typeof LOG_SECTIONS)[number];

export const LOG_SECTION_TITLES = Object.freeze({
  scene: '场景标识',
  thinking: 'AI 思考链',
  dataStructure: '数据结构',
  callChain: '调用链',
  timestampVersion: '时间戳版本',
  exception: '异常',
} as const satisfies Record<LogSection, string>);

/** 旧 `data.copy_log` 的五字段（新架构 camelCase，由技能包显式传入）。 */
export interface CopyLogFields {
  readonly thinking?: string;
  readonly dataStructure?: string;
  readonly callChain?: string;
  readonly timestamp?: string;
  readonly exception?: string;
}

/** 6 段日志 → 数据源（FX-1③）：`scene` 由 **envelope 派生**（`skill`／`key`／`shape`），
 *  其余 5 段取 `CopyLogFields`；`timestampVersion` ← `copyLog.timestamp`（不是 `timestampVersion` 字段）。 */
export const LOG_SECTION_SOURCES = Object.freeze({
  scene: 'envelope',
  thinking: 'copyLog.thinking',
  dataStructure: 'copyLog.dataStructure',
  callChain: 'copyLog.callChain',
  timestampVersion: 'copyLog.timestamp',
  exception: 'copyLog.exception',
} as const satisfies Record<LogSection, string>);

export interface DataTextInput {
  readonly envelope: SerializableEnvelope;
  /** 缺省 `text`。 */
  readonly format?: CopyFormat;
  /** 覆盖输出头；缺省 `TEXT_HEADER_TEMPLATE`（`'【{skill} · {key}】'`）。 */
  readonly title?: string;
  /** 时间行；缺省不输出该行。 */
  readonly occurredAt?: string;
}

export interface LogTextInput {
  readonly envelope: SerializableEnvelope;
  /** 缺省 `text`。 */
  readonly format?: CopyFormat;
  readonly copyLog?: CopyLogFields;
}

/** 日志缺省占位（FX-1④）：**只作用于 `text` 口径**；`json` 写 `null`，`csv` 写空串。 */
export const LOG_UNKNOWN_PLACEHOLDER = '(未知)';
/** `text` 口径的数据空值占位：**只作用于 `text` 口径**；`json` 保留 `null`，`csv` 写空串。 */
export const TEXT_EMPTY_PLACEHOLDER = '未填写';
export const TEXT_SENSITIVE_MASK = '****';
/** text 口径输出头（`{skill}`／`{key}` 为替换位，非 HTML 占位符）。 */
export const TEXT_HEADER_TEMPLATE = '【{skill} · {key}】';

/** **敏感行判定口径（FX-23，机读）**：投影行（`metrics`／`item` 的值、`items` 的元素）取值为
 *  `{ text: string, sensitive: true }` 形态时判为**敏感行**——该形态的**字段名**与旧侧 `_rowText` 一致
 *  （`base.js:218-221`：`:219` 函数、`:221` 合并掩码行），但**判定语义不同**（FX-30）：
 *  旧侧是真值判定（`if (r.sensitive)`），本契约只认**字面 `true`**（`flagValue`）。
 *
 *  - 判定只看源值的 `flagField` 是否为字面 `flagValue`（`true`），**不看文本内容**；`text` 字段是原文。
 *  - `EnvelopeDataByShape` 不含该形态 → 它是 **text 层的行值包装**（`data.metrics`／`data.item` 的值、
 *    `data.items` 的元素），**不改变** envelope 契约，也不进 json 键名（json 口径该键值写 `mask`）。
 *  - 三种 format 一律输出 `mask`（= `TEXT_SENSITIVE_MASK`）；`text` 口径在该行之后**紧跟一行**
 *    `textNotice`。
 *  - **与旧侧的偏离（显式声明）**：旧侧把掩码与提示合成一行 `'****（敏感字段已脱敏）'`（`base.js:221`）；
 *    新契约拆成「掩码行 ＋ 提示行」，理由是掩码值须能被 `TEXT_SENSITIVE_MASK` 逐值断言、
 *    且 `json`／`csv` 口径下不得夹中文提示（json 值必须是纯掩码字符串、csv 单元格同）。语义等价：原文一律不出现。
 */
export const SENSITIVE_ROW_RULE = Object.freeze({
  textField: 'text',
  flagField: 'sensitive',
  flagValue: true,
  mask: TEXT_SENSITIVE_MASK,
  textNotice: '（敏感字段已脱敏）',
} as const);

/** 逐 shape 投影规格（FX-1①）：envelope `data` → 复制文本结构。 */
export interface DataProjectionSpec {
  /** 标题行（`text` 口径输出头；`json`／`csv` 无输出头）。 */
  readonly header: string;
  /** 主体行来源：`data` 上的字段名（`stat` 的 metrics 逐键展开、`list` 的 items 逐项展开）。 */
  readonly body: string;
  /** 收尾行来源：`data` 上的字段名；无收尾行为 null。 */
  readonly tail: string | null;
  /** `csv` 口径下这些行写入 `section` 列的分组名（行序 = body 行 → tail 行）。 */
  readonly csvSections: readonly string[];
}

/** 逐 shape 投影表（FX-1①；数据形态对齐 `EnvelopeDataByShape`）：
 *  `stat`→metrics 键值行；`list`→逐项行 + `total` 收尾；`detail`→item 字段行；
 *  `receipt`→状态行 + `message` 行；`analysis`→`summary` 文本行。 */
export const DATA_TEXT_PROJECTIONS = Object.freeze({
  stat: { header: TEXT_HEADER_TEMPLATE, body: 'metrics', tail: null, csvSections: ['metrics'] },
  list: { header: TEXT_HEADER_TEMPLATE, body: 'items', tail: 'total', csvSections: ['items', 'total'] },
  detail: { header: TEXT_HEADER_TEMPLATE, body: 'item', tail: null, csvSections: ['item'] },
  receipt: { header: TEXT_HEADER_TEMPLATE, body: 'ok', tail: 'message', csvSections: ['status', 'message'] },
  analysis: { header: TEXT_HEADER_TEMPLATE, body: 'summary', tail: null, csvSections: ['summary'] },
} as const satisfies Record<SerializableShape, DataProjectionSpec>);
export const TEXT_JSON_INDENT = 2;
/** json 口径：文本中 `<` 一律写成反斜杠 + u003c，防 `</script>` 断标签。 */
export const TEXT_JSON_LT_RULE = 'u003c' as const;
/** csv 口径：RFC4180 引号规则 + LF 行尾。 */
export const CSV_DIALECT = Object.freeze({
  delimiter: ',',
  quote: '"',
  quoteEscape: '""',
  lineEnding: 'LF',
  header: ['section', 'row'],
} as const);

export const TEXT_ERROR_CODES = ['shape-unsupported', 'structure-invalid', 'format-unknown'] as const;

export type TextErrorCode = (typeof TEXT_ERROR_CODES)[number];

export interface TextErrorShape {
  readonly name: 'TextError';
  readonly code: TextErrorCode;
  readonly message: string;
}

/** 冻结签名：`buildDataText(input: DataTextInput): string`。 */
export type BuildDataText = (input: DataTextInput) => string;

/** 冻结签名：`buildLogText(input: LogTextInput): string`。 */
export type BuildLogText = (input: LogTextInput) => string;
