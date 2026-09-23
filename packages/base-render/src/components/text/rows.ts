/** text · rows
 *
 *  自 `src/text.ts` 原样切出。
 *
 *  **住址**：目录化批次⑥把 `src/text.ts` 按段切成「族内一件一文件」，正文原样搬来；
 *  搬迁判据＝产物逐字节相同（见 `docs/base/base-render/组件目录架构.md` 本批读数）。
 */

import { stringifyJson } from './formats.js';
import { asRecord } from './input.js';
import { CR, DataRows, LF, TextRow } from './shared.js';
import { DataProjectionSpec, SENSITIVE_ROW_RULE, SerializableShape, TEXT_HEADER_TEMPLATE } from '../../spec/text.js';

/* ── 行文本渲染（一行 = 一个投影值） ─────────────────────────── */

/** 敏感行判定：只看 `SENSITIVE_ROW_RULE.flagField` 是否为**字面** `flagValue`（非真值判定）。 */
export function isSensitive(value: unknown): boolean {
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

export function dataRows(projection: DataProjectionSpec, data: Record<string, unknown>, empty: string): DataRows {
  return { body: bodyRows(projection, data, empty), tail: tailRow(projection, data, empty) };
}

/** `text` 口径：行内换行（CR／LF）替换为空格（`contract:608`）。 */
export function sanitizeLine(text: string): string {
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
export function headerLine(envelope: Record<string, unknown>, title: string | undefined): string {
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

/** `scene` 段：恒由 envelope 派生（`contract:595`）。
 * 甲幂等（#555）：`key` 已以 `skill + '.'` 开头不再重复补技能名；
 * 不带前缀仍补足，两种给法输出同一形状。 */
export function sceneText(envelope: Record<string, unknown>, shape: SerializableShape): string {
  const skill = fieldText(envelope.skill);
  const key = fieldText(envelope.key);
  const head = skill !== '' && key.indexOf(skill + '.') === 0 ? key : skill + '.' + key;
  return head + '（' + shape + '）';
}

