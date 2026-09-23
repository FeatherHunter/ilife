/** text · input
 *
 *  自 `src/text.ts` 原样切出。
 *
 *  **住址**：目录化批次⑥把 `src/text.ts` 按段切成「族内一件一文件」，正文原样搬来；
 *  搬迁判据＝产物逐字节相同（见 `docs/base/base-render/组件目录架构.md` 本批读数）。
 */

import { fail } from './shared.js';
import { COPY_FORMATS, CopyFormat, SERIALIZABLE_SHAPES, SerializableShape } from '../../spec/text.js';

/* ── 输入形态与校验 ─────────────────────────────────────────── */

/** 纯对象收窄（数组与 `null` 不算对象）。 */
export function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** 错误文案里的值描述（一码多义由 `message` 辨因，§3.1.2⑤ 同口径）。 */
export function describeValue(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return '数组';
  if (typeof value === 'object') return '对象';
  return typeof value + ' ' + String(value);
}

/** `format` 闭集判定（缺省 `text`）；不在 `COPY_FORMATS` 内 → `format-unknown`。 */
export function resolveFormat(value: unknown): CopyFormat {
  if (value === undefined) return 'text';
  if (typeof value === 'string' && (COPY_FORMATS as readonly string[]).indexOf(value) >= 0) {
    return value as CopyFormat;
  }
  fail('format-unknown', 'format 不在 COPY_FORMATS 内：' + describeValue(value)
    + '（允许：' + COPY_FORMATS.join('、') + '）');
}

/** `shape` 闭集判定：不在 `SERIALIZABLE_SHAPES`（含 `fallback`）→ `shape-unsupported`。 */
export function resolveShape(value: unknown): SerializableShape {
  if (typeof value === 'string' && (SERIALIZABLE_SHAPES as readonly string[]).indexOf(value) >= 0) {
    return value as SerializableShape;
  }
  fail('shape-unsupported', 'shape 不进复制文本：' + describeValue(value)
    + '（可序列化：' + SERIALIZABLE_SHAPES.join('、') + '）');
}

/** `title`／`occurredAt` 类型校验（非字符串 → `structure-invalid`；缺省放行）。 */
export function optionalString(value: unknown, field: string): string | undefined {
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
export function requireShapeData(shape: SerializableShape, value: unknown): Record<string, unknown> {
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
export function resolveCopyLog(value: unknown): Record<string, unknown> | null {
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

