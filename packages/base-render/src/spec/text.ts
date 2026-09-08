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

/** 可序列化形状：envelope 六形状去掉 `fallback`（降级载荷不进复制文本）。 */
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

export interface DataTextInput {
  readonly envelope: SerializableEnvelope;
  /** 缺省 `text`。 */
  readonly format?: CopyFormat;
  /** 覆盖输出头；缺省 `【skill · key】`。 */
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

export const LOG_UNKNOWN_PLACEHOLDER = '(未知)';
/** text 口径的空值占位（json／csv 口径见文档 §3.4：不写占位）。 */
export const TEXT_EMPTY_PLACEHOLDER = '未填写';
export const TEXT_SENSITIVE_MASK = '****';
/** text 口径输出头（`{skill}`／`{key}` 为替换位，非 HTML 占位符）。 */
export const TEXT_HEADER_TEMPLATE = '【{skill} · {key}】';
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
