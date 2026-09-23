/** text · log
 *
 *  自 `src/text.ts` 原样切出。
 *
 *  **住址**：目录化批次⑥把 `src/text.ts` 按段切成「族内一件一文件」，正文原样搬来；
 *  搬迁判据＝产物逐字节相同（见 `docs/base/base-render/组件目录架构.md` 本批读数）。
 */

import { sceneText } from './rows.js';
import { ENVELOPE_SOURCE } from './shared.js';
import { LOG_SECTIONS, LOG_SECTION_SOURCES, LogSection, SerializableShape } from '../../spec/text.js';

/* ── 6 段日志 ───────────────────────────────────────────────── */

/** 6 段文本：`scene` 由 envelope 派生，其余 5 段取 `CopyLogFields`（字段名从 `LOG_SECTION_SOURCES` 派生）。
 *  缺失（未给／非字符串／空串）→ `null`，由各 format 自行落空值口径。 */
export function logTexts(
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

