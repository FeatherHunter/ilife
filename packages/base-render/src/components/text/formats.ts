/** text · formats
 *
 *  自 `src/text.ts` 原样切出。
 *
 *  **住址**：目录化批次⑥把 `src/text.ts` 按段切成「族内一件一文件」，正文原样搬来；
 *  搬迁判据＝产物逐字节相同（见 `docs/base/base-render/组件目录架构.md` 本批读数）。
 */

import { asRecord } from './input.js';
import { isSensitive } from './rows.js';
import { CR, DataRows, LF, TextError, fail } from './shared.js';
import { CSV_DIALECT, DataProjectionSpec, SENSITIVE_ROW_RULE, TEXT_JSON_INDENT, TEXT_JSON_LT_RULE } from '../../spec/text.js';

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
export function stringifyJson(value: unknown, prefix: string, indent?: number): string | undefined {
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
export function jsonText(value: unknown): string {
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
export function maskData(projection: DataProjectionSpec, data: Record<string, unknown>): Record<string, unknown> {
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
export function csvText(rows: readonly (readonly [string, string])[]): string {
  const lines = [CSV_DIALECT.header.map(csvField).join(CSV_DIALECT.delimiter)];
  for (const [section, row] of rows) {
    lines.push([section, row].map(csvField).join(CSV_DIALECT.delimiter));
  }
  return lines.join(csvLineEnding());
}

/** `csv` 行序 = 主体行 → 收尾行；`section` 列逐行取投影表 `csvSections`（`contract:619`）。 */
export function dataCsvRows(projection: DataProjectionSpec, rows: DataRows): [string, string][] {
  const out: [string, string][] = [];
  const bodySection = projection.csvSections[0];
  for (const row of rows.body) out.push([bodySection, row.text]);
  if (rows.tail !== null) out.push([projection.csvSections[1], rows.tail.text]);
  return out;
}

