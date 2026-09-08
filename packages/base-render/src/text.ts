/** base-paint/text：复制文本序列化（#77 运行时）。
 *
 * 契约正本：`docs/base-paint-contract.md` §3.4（含「行为补遗」）／§6.4；冻结面：
 * `packages/base-render/src/spec/text.ts`（本文件**只消费**，不改任何冻结签名）。
 *
 * 单一真相（禁止第二份表）：
 *  - 逐 shape 投影恒读 `DATA_TEXT_PROJECTIONS`（`body`／`tail`／`csvSections`），
 *    本文件**不写任何 shape→字段的映射表**；
 *  - 6 段数据源恒读 `LOG_SECTION_SOURCES`（`copyLog.<字段>` 的字段名从该常量派生，
 *    故 `timestampVersion` ← `copyLog.timestamp` 不需要第二份对应表）；
 *  - 敏感行判定与掩码恒读 `SENSITIVE_ROW_RULE`（字面 `true`，非真值判定）；
 *  - 空值口径恒读 `TEXT_EMPTY_PLACEHOLDER`（数据）／`LOG_UNKNOWN_PLACEHOLDER`（日志）；
 *  - `csv` 分隔／引号／行尾恒读 `CSV_DIALECT`；`json` 缩进／`<` 规则恒读
 *    `TEXT_JSON_INDENT`／`TEXT_JSON_LT_RULE`；输出头恒读 `TEXT_HEADER_TEMPLATE`。
 *
 * 依赖红线（AC-13）：零运行时依赖，只 `import type` 消费 `base-link-core`。
 *
 * 契约未规定处的取值（全部记账在契约 §3.4「行为补遗」，不留暗猜）：
 *  - **`json` 口径 `undefined` → `null` 归一（FX-77-1）**：JSON 无 `undefined` 值，`JSON.stringify`
 *    默认**丢键**，与 `contract:609`「空值保留 `null`、键不省略」冲突；归一后同一输入的三种 format
 *    键集／行数一一对应（`text` 占位符／`csv` 空串／`json` `null` 语义等价）。
 *  - **产出恒非空（FX-77-6）**：输出头行恒存在（`title` 空串视同缺省，退回 `TEXT_HEADER_TEMPLATE`
 *    展开），故 `title: ''` ＋ 空投影体不再产出空串（`copyText` 空串短路不会被误触）。
 *  - **输出头模板单趟展开（FX-77-8）**：替换位从 `TEXT_HEADER_TEMPLATE` 直接派生、只替换一次，
 *    `skill: '{key}'` 不会被二次展开。
 *  - 行文本格式（§3.4 `contract:616` 登记为「不冻结也不排除」，owner #77）：
 *    映射体（`metrics`／`item`）逐键 `键: 值`；数组体（`items`）逐项一行、**无前缀**；
 *    标量与收尾行（`ok`／`summary`／`total`／`message`）`字段名: 值`；
 *    **敏感行整行恒为 `mask`**（不带键名，对齐「掩码行 `****`」的验收措辞）。
 *  - 值文本化：`null`／`undefined`／空串 → `未填写`；字符串原样；number／boolean／bigint →
 *    `String()`；对象／数组 → `JSON.stringify`（不可序列化（循环引用／`BigInt` 等）→
 *    `structure-invalid`，`message` 按因区分）。
 *  - 错误码次序：`format-unknown` → `shape-unsupported` → `structure-invalid`（由外到内）。
 *  - `text` 口径行内 CR／LF 替换为空格；`csv` 口径保留原样、由 RFC4180 引号包裹；
 *    `json` 口径按 JSON 转义。时间行文案 `时间: {occurredAt}`（沿用旧基线措辞）。
 *  - 日志段 = 标题行（`LOG_SECTION_TITLES` 逐字、**无** `①`–`⑥` 圈号）＋ 内容行，段间无空行。
 *  - envelope 五字段（`version`／`skill`／`key`）**存在性不校验**（归 #74 `STRICT_ENVELOPE_FIELDS`）；
 *    非字符串的 `skill`／`key` 在 `text` 头与 `scene` 段按空串渲染、在 `json` 里原样透传
 *    （**`undefined`／缺失**归一为 `null` 以保键，FX-77-1）。
 */
import {
  COPY_FORMATS,
  CSV_DIALECT,
  DATA_TEXT_PROJECTIONS,
  LOG_SECTIONS,
  LOG_SECTION_SOURCES,
  LOG_SECTION_TITLES,
  LOG_UNKNOWN_PLACEHOLDER,
  SENSITIVE_ROW_RULE,
  SERIALIZABLE_SHAPES,
  TEXT_EMPTY_PLACEHOLDER,
  TEXT_HEADER_TEMPLATE,
  TEXT_JSON_INDENT,
  TEXT_JSON_LT_RULE,
} from './spec/text.js';
import type {
  CopyFormat,
  DataProjectionSpec,
  DataTextInput,
  LogSection,
  LogTextInput,
  SerializableShape,
  TextErrorCode,
} from './spec/text.js';

/** 复制序列化失败（形态逐字对齐冻结的 `TextErrorShape`：`{ name, code, message }`）。
 *
 * **不从 `src/index.ts` 导出**：`SPEC_FROZEN_SURFACE` 无该运行时条目，导出会打破
 * 「新增运行时出口恰好等于清单 implemented 的运行时项」出口面锁。与 `TemplateError`
 * ／`ControlsError` 同口径，调用方按 `name`／`code` 判定。
 */
export class TextError extends Error {
  /** 逐字对齐 `TextErrorShape.name`。 */
  readonly name = 'TextError';
  readonly code: TextErrorCode;

  constructor(code: TextErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

/** 抛错并收窄控制流（`never` 返回，便于 TS 在断言后收窄）。 */
function fail(code: TextErrorCode, message: string): never {
  throw new TextError(code, message);
}

const LF = String.fromCharCode(10);
const CR = String.fromCharCode(13);
/** 时间行前缀（契约未规定文案；沿用旧基线 `base.js:254` 的 `'时间: '`，见 §3.4 行为补遗）。 */
const TIME_LABEL = '时间: ';
/** `csv` 口径的空值（`contract:610`：机器可读，写空字符串、不写占位符）。 */
const CSV_EMPTY = '';
/** 「由 envelope 派生」的段源哨兵：恒读冻结常量 `LOG_SECTION_SOURCES.scene`，不写第二份字面量。 */
const ENVELOPE_SOURCE: string = LOG_SECTION_SOURCES.scene;

/** 一行文本 ＋ 是否敏感行（敏感行的 `text` 恒为 `SENSITIVE_ROW_RULE.mask`）。 */
interface TextRow {
  readonly text: string;
  readonly sensitive: boolean;
}

/** 投影行分组：主体行（投影表 `body`）＋ 至多一条收尾行（投影表 `tail`）。 */
interface DataRows {
  readonly body: readonly TextRow[];
  readonly tail: TextRow | null;
}

/* ── 输入形态与校验 ─────────────────────────────────────────── */

/** 纯对象收窄（数组与 `null` 不算对象）。 */
function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** 错误文案里的值描述（一码多义由 `message` 辨因，§3.1.2⑤ 同口径）。 */
function describeValue(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return '数组';
  if (typeof value === 'object') return '对象';
  return typeof value + ' ' + String(value);
}

/** `format` 闭集判定（缺省 `text`）；不在 `COPY_FORMATS` 内 → `format-unknown`。 */
function resolveFormat(value: unknown): CopyFormat {
  if (value === undefined) return 'text';
  if (typeof value === 'string' && (COPY_FORMATS as readonly string[]).indexOf(value) >= 0) {
    return value as CopyFormat;
  }
  fail('format-unknown', 'format 不在 COPY_FORMATS 内：' + describeValue(value)
    + '（允许：' + COPY_FORMATS.join('、') + '）');
}

/** `shape` 闭集判定：不在 `SERIALIZABLE_SHAPES`（含 `fallback`）→ `shape-unsupported`。 */
function resolveShape(value: unknown): SerializableShape {
  if (typeof value === 'string' && (SERIALIZABLE_SHAPES as readonly string[]).indexOf(value) >= 0) {
    return value as SerializableShape;
  }
  fail('shape-unsupported', 'shape 不进复制文本：' + describeValue(value)
    + '（可序列化：' + SERIALIZABLE_SHAPES.join('、') + '）');
}

/** `title`／`occurredAt` 类型校验（非字符串 → `structure-invalid`；缺省放行）。 */
function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    fail('structure-invalid', field + ' 必须是字符串，实为 ' + describeValue(value));
  }
  return value;
}

/** 逐 shape 结构校验（判据逐条对齐 `contract:624`，恒以 `EnvelopeDataByShape[shape]` 为准）。
 *
 * **不校验** `stat.metrics` 的逐值类型：敏感行包装 `{ text, sensitive: true }` 必须放行
 * （`contract:612`／`:615`，FX-23），故只判容器形态。
 */
function requireShapeData(shape: SerializableShape, value: unknown): Record<string, unknown> {
  const data = asRecord(value);
  if (data === null) {
    fail('structure-invalid', shape + ' 形 data 必须是对象，实为 ' + describeValue(value));
  }
  switch (shape) {
    case 'stat':
      if (asRecord(data.metrics) === null) {
        fail('structure-invalid', 'stat 形缺 metrics 对象（EnvelopeDataByShape.stat）');
      }
      break;
    case 'list':
      if (!Array.isArray(data.items)) {
        fail('structure-invalid', 'list 形 items 必须是数组（EnvelopeDataByShape.list）');
      }
      break;
    case 'detail':
      if (asRecord(data.item) === null) {
        fail('structure-invalid', 'detail 形缺 item 对象（EnvelopeDataByShape.detail）');
      }
      break;
    case 'receipt':
      if (typeof data.ok !== 'boolean' || typeof data.message !== 'string') {
        fail('structure-invalid', 'receipt 形缺 ok（boolean）／message（string）（EnvelopeDataByShape.receipt）');
      }
      break;
    case 'analysis':
      if (typeof data.summary !== 'string' || data.summary.length === 0) {
        fail('structure-invalid', 'analysis 形缺非空 summary（EnvelopeDataByShape.analysis）');
      }
      break;
    default: {
      // 穷尽性兜底（FX-77-7）：冻结面日后新增可序列化 shape 时**不得静默跳过**校验。
      const unreached: never = shape;
      fail('structure-invalid', '未覆盖的可序列化 shape：' + String(unreached));
    }
  }
  return data;
}

/** `copyLog` 形态校验：整体非对象／字段非字符串 → `structure-invalid`（`null`／`undefined` 视同缺失）。 */
function resolveCopyLog(value: unknown): Record<string, unknown> | null {
  if (value === undefined || value === null) return null;
  const record = asRecord(value);
  if (record === null) {
    fail('structure-invalid', 'copyLog 必须是对象，实为 ' + describeValue(value));
  }
  for (const [field, fieldValue] of Object.entries(record)) {
    if (fieldValue === undefined || fieldValue === null) continue;
    if (typeof fieldValue !== 'string') {
      fail('structure-invalid', 'copyLog.' + field + ' 必须是字符串，实为 ' + describeValue(fieldValue));
    }
  }
  return record;
}

/* ── 行文本渲染（一行 = 一个投影值） ─────────────────────────── */

/** 敏感行判定：只看 `SENSITIVE_ROW_RULE.flagField` 是否为**字面** `flagValue`（非真值判定）。 */
function isSensitive(value: unknown): boolean {
  const record = asRecord(value);
  return record !== null && record[SENSITIVE_ROW_RULE.flagField] === SENSITIVE_ROW_RULE.flagValue;
}

/** 单值 → 文本（三 format 共用的「值文本化」口径；空值文本由调用方按 format 传入）。 */
function valueText(value: unknown, empty: string): string {
  if (value === null || value === undefined) return empty;
  if (typeof value === 'string') return value === '' ? empty : value;
  if (typeof value === 'object') {
    const text = stringifyJson(value, '投影值');
    return text === undefined ? empty : text;
  }
  return String(value);
}

/** 投影值 → 一行（敏感行整行恒为 `mask`，不带键名）。 */
function rowOf(value: unknown, label: string | null, empty: string): TextRow {
  if (isSensitive(value)) return { text: SENSITIVE_ROW_RULE.mask, sensitive: true };
  const text = valueText(value, empty);
  return { text: label === null ? text : label + ': ' + text, sensitive: false };
}

/** 主体行：字段值按 `EnvelopeDataByShape` 的形态推导展开策略，字段名恒取投影表。 */
function bodyRows(projection: DataProjectionSpec, data: Record<string, unknown>, empty: string): TextRow[] {
  const value = data[projection.body];
  if (Array.isArray(value)) return value.map((item) => rowOf(item, null, empty));
  const map = asRecord(value);
  if (map !== null) return Object.entries(map).map(([key, item]) => rowOf(item, key, empty));
  return [rowOf(value, projection.body, empty)];
}

/** 收尾行：`tail` 为 `null` 或该字段**缺省**（`undefined`）→ 省略，不报错（U1 定案）；
 *  显式 `null` 是「空值」而非「缺省」，按各 format 的空值口径渲染（text 占位符／json `null`／csv 空串）。 */
function tailRow(projection: DataProjectionSpec, data: Record<string, unknown>, empty: string): TextRow | null {
  if (projection.tail === null) return null;
  const value = data[projection.tail];
  if (value === undefined) return null;
  return rowOf(value, projection.tail, empty);
}

function dataRows(projection: DataProjectionSpec, data: Record<string, unknown>, empty: string): DataRows {
  return { body: bodyRows(projection, data, empty), tail: tailRow(projection, data, empty) };
}

/** `text` 口径：行内换行（CR／LF）替换为空格（`contract:608`）。 */
function sanitizeLine(text: string): string {
  return text.split(CR).join(' ').split(LF).join(' ');
}

/* ── 输出头与 scene 段 ─────────────────────────────────────── */

/** 非字符串字段按空串渲染（`text` 口径的人类可读面，避免出现 `undefined`）。 */
function fieldText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** 输出头：`DataTextInput.title` 非空时覆盖，否则 `TEXT_HEADER_TEMPLATE` **单趟**展开。
 *
 *  - 替换位从模板本身派生（`{字段}` → `envelope[字段]`），**无第二份字段清单**（FX-77-8）。
 *  - **单趟**：插入的值不再被扫描（`skill: '{key}'` → `【{key} · KK】`，不二次展开，FX-77-8）。
 *  - 空串 `title` 视同缺省（FX-77-6）：输出头行恒存在、恒非空（模板含 `【】` 与 ` · `，
 *    `skill`／`key` 为空／非字符串时按空串替换，得 `【 · 】`）。
 */
function headerLine(envelope: Record<string, unknown>, title: string | undefined): string {
  if (title !== undefined && title !== '') return title;
  let out = '';
  let rest = TEXT_HEADER_TEMPLATE;
  for (;;) {
    const open = rest.indexOf('{');
    if (open < 0) return out + rest;
    const close = rest.indexOf('}', open + 1);
    if (close < 0) return out + rest;
    out += rest.slice(0, open) + fieldText(envelope[rest.slice(open + 1, close)]);
    rest = rest.slice(close + 1);
  }
}

/** `scene` 段：恒由 envelope 派生，形如 `{skill}.{key}（{shape}）`（`contract:595`）。 */
function sceneText(envelope: Record<string, unknown>, shape: SerializableShape): string {
  return fieldText(envelope.skill) + '.' + fieldText(envelope.key) + '（' + shape + '）';
}

/* ── 三种 format 的编码器 ───────────────────────────────────── */

/** 不可 JSON 序列化的**原因文案**（一码多义由 `message` 辨因，§3.1.2⑤ 同口径）：
 *  `BigInt` 与循环引用**不同因不同文**（FX-77-8：不得把 `BigInt` 误写成「循环引用」）。 */
function jsonFailReason(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  if (text.indexOf('circular') >= 0) return '循环引用';
  if (text.indexOf('BigInt') >= 0) return 'BigInt 等非 JSON 值';
  return '含非 JSON 值';
}

/** `JSON.stringify` 的统一包装（**三 format 共用**；`prefix` 只用于辨因文案）：
 *
 *  - **`undefined` → `null`（保留键）**：JSON 无 `undefined` 值，`JSON.stringify` 默认**丢键**，
 *    与 `contract:609`「空值保留 `null`、键不省略」冲突（FX-77-1）。`json` 口径的整串与
 *    `text`／`csv` 口径的对象值（§3.4.1「对象／数组 → `JSON.stringify`」）同口径归一，
 *    故**同一输入的三 format 键集一一对应**（含嵌套对象）。
 *  - **`BigInt` 显式判因**：不依赖运行时文案（`typeof item === 'bigint'` 直接判），仍抛
 *    `structure-invalid`（不静默写 `null`）。
 *  - 其余不可序列化（循环引用等）→ `structure-invalid`，`message` 按因区分。
 */
function stringifyJson(value: unknown, prefix: string, indent?: number): string | undefined {
  try {
    return JSON.stringify(value, (_key, item) => {
      if (typeof item === 'bigint') {
        fail('structure-invalid', prefix + '不可 JSON 序列化（BigInt 等非 JSON 值）');
      }
      return item === undefined ? null : item;
    }, indent);
  } catch (error) {
    if (error instanceof TextError) throw error;
    fail('structure-invalid', prefix + '不可 JSON 序列化（' + jsonFailReason(error) + '）');
  }
}

/** `json` 口径：缩进恒取 `TEXT_JSON_INDENT`，`<` 一律写成反斜杠 + `TEXT_JSON_LT_RULE`。 */
function jsonText(value: unknown): string {
  const text = stringifyJson(value, '载荷', TEXT_JSON_INDENT);
  if (text === undefined) fail('structure-invalid', '载荷不可 JSON 序列化');
  return text.split('<').join(String.fromCharCode(92) + TEXT_JSON_LT_RULE);
}

/** 敏感行在 `json` 口径写 `mask`（不写 `null`、不进第二套键名）。 */
function maskValue(value: unknown): unknown {
  return isSensitive(value) ? SENSITIVE_ROW_RULE.mask : value;
}

/** `json` 口径的 `data`：按投影值位置把敏感行换成 `mask`，其余原样透传（空值保留 `null`）。
 *  收尾字段**缺省**（`undefined`）时**删键**（U1：缺省 ≠ 空值；`json` 省略该键，与 `text`／`csv` 省略该行一致）。 */
function maskData(projection: DataProjectionSpec, data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...data };
  const body = data[projection.body];
  if (Array.isArray(body)) {
    out[projection.body] = body.map(maskValue);
  } else {
    const map = asRecord(body);
    out[projection.body] = map === null
      ? maskValue(body)
      : Object.fromEntries(Object.entries(map).map(([key, item]) => [key, maskValue(item)]));
  }
  if (projection.tail !== null) {
    if (data[projection.tail] === undefined) delete out[projection.tail];
    else out[projection.tail] = maskValue(data[projection.tail]);
  }
  return out;
}

/** `csv` 字段编码：RFC4180——含分隔符／引号／换行（CR 或 LF）时用引号包裹，内部引号写成双写。 */
function csvField(value: string): string {
  const needsQuote = value.includes(CSV_DIALECT.delimiter)
    || value.includes(CSV_DIALECT.quote)
    || value.includes(CR)
    || value.includes(LF);
  if (!needsQuote) return value;
  return CSV_DIALECT.quote
    + value.split(CSV_DIALECT.quote).join(CSV_DIALECT.quoteEscape)
    + CSV_DIALECT.quote;
}

/** `csv` 行尾：恒读冻结常量 `CSV_DIALECT.lineEnding`（机读名 → 实际字符，不留未消费常量）。
 *  未知取值 → `structure-invalid`（显式失败，不静默退回某个行尾）。 */
function csvLineEnding(): string {
  const name: string = CSV_DIALECT.lineEnding;
  if (name === 'LF') return LF;
  if (name === 'CRLF') return CR + LF;
  fail('structure-invalid', 'CSV_DIALECT.lineEnding 取值未定义：' + name);
}

/** `csv` 口径：表头恒为 `CSV_DIALECT.header`，行尾恒取 `CSV_DIALECT.lineEnding`。 */
function csvText(rows: readonly (readonly [string, string])[]): string {
  const lines = [CSV_DIALECT.header.map(csvField).join(CSV_DIALECT.delimiter)];
  for (const [section, row] of rows) {
    lines.push([section, row].map(csvField).join(CSV_DIALECT.delimiter));
  }
  return lines.join(csvLineEnding());
}

/** `csv` 行序 = 主体行 → 收尾行；`section` 列逐行取投影表 `csvSections`（`contract:619`）。 */
function dataCsvRows(projection: DataProjectionSpec, rows: DataRows): [string, string][] {
  const out: [string, string][] = [];
  const bodySection = projection.csvSections[0];
  for (const row of rows.body) out.push([bodySection, row.text]);
  if (rows.tail !== null) out.push([projection.csvSections[1], rows.tail.text]);
  return out;
}

/* ── 6 段日志 ───────────────────────────────────────────────── */

/** 6 段文本：`scene` 由 envelope 派生，其余 5 段取 `CopyLogFields`（字段名从 `LOG_SECTION_SOURCES` 派生）。
 *  缺失（未给／非字符串／空串）→ `null`，由各 format 自行落空值口径。 */
function logTexts(
  envelope: Record<string, unknown>,
  shape: SerializableShape,
  copyLog: Record<string, unknown> | null,
): Record<LogSection, string | null> {
  const out = {} as Record<LogSection, string | null>;
  for (const section of LOG_SECTIONS) {
    const source = LOG_SECTION_SOURCES[section];
    if (source === ENVELOPE_SOURCE) {
      out[section] = sceneText(envelope, shape);
      continue;
    }
    const dot = source.indexOf('.');
    const field = dot >= 0 ? source.slice(dot + 1) : source;
    const value = copyLog === null ? undefined : copyLog[field];
    out[section] = typeof value === 'string' && value !== '' ? value : null;
  }
  return out;
}

/* ── 出口 ───────────────────────────────────────────────────── */

/** 数据文本：envelope 逐 shape 投影 → `text`／`json`／`csv`。失败抛 `TextError`（不返空、不降级）。 */
export function buildDataText(input: DataTextInput): string {
  const record = asRecord(input);
  if (record === null) fail('structure-invalid', '入参必须是对象（DataTextInput），实为 ' + describeValue(input));
  const format = resolveFormat(record.format);
  const envelope = asRecord(record.envelope);
  if (envelope === null) fail('structure-invalid', 'envelope 必须是对象，实为 ' + describeValue(record.envelope));
  const shape = resolveShape(envelope.shape);
  const title = optionalString(record.title, 'title');
  const occurredAt = optionalString(record.occurredAt, 'occurredAt');
  const data = requireShapeData(shape, envelope.data);
  const projection = DATA_TEXT_PROJECTIONS[shape];

  if (format === 'json') {
    return jsonText({
      version: envelope.version,
      skill: envelope.skill,
      shape,
      key: envelope.key,
      data: maskData(projection, data),
    });
  }

  const rows = dataRows(projection, data, format === 'csv' ? CSV_EMPTY : TEXT_EMPTY_PLACEHOLDER);
  if (format === 'csv') return csvText(dataCsvRows(projection, rows));

  const lines: string[] = [sanitizeLine(headerLine(envelope, title))];
  if (occurredAt !== undefined) lines.push(sanitizeLine(TIME_LABEL + occurredAt));
  for (const row of rows.tail === null ? rows.body : [...rows.body, rows.tail]) {
    lines.push(sanitizeLine(row.text));
    if (row.sensitive) lines.push(SENSITIVE_ROW_RULE.textNotice);
  }
  return lines.join(LF);
}

/** 日志文本：6 段（1 段 envelope 派生 ＋ 5 段 `CopyLogFields`）→ `text`／`json`／`csv`。
 *  结构校验与 `buildDataText` **同口径**（U14 定案：`data` 不符 shape 同样抛 `structure-invalid`）。 */
export function buildLogText(input: LogTextInput): string {
  const record = asRecord(input);
  if (record === null) fail('structure-invalid', '入参必须是对象（LogTextInput），实为 ' + describeValue(input));
  const format = resolveFormat(record.format);
  const envelope = asRecord(record.envelope);
  if (envelope === null) fail('structure-invalid', 'envelope 必须是对象，实为 ' + describeValue(record.envelope));
  const shape = resolveShape(envelope.shape);
  const copyLog = resolveCopyLog(record.copyLog);
  requireShapeData(shape, envelope.data);
  const texts = logTexts(envelope, shape, copyLog);

  if (format === 'json') return jsonText(texts);
  if (format === 'csv') {
    return csvText(LOG_SECTIONS.map((section) => [section, texts[section] ?? ''] as [string, string]));
  }

  const lines: string[] = [];
  for (const section of LOG_SECTIONS) {
    lines.push(sanitizeLine(LOG_SECTION_TITLES[section]));
    lines.push(sanitizeLine(texts[section] ?? LOG_UNKNOWN_PLACEHOLDER));
  }
  return lines.join(LF);
}
