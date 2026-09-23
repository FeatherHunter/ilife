/** template · shared
 *
 *  自 `src/template.ts` 原样切出。
 *
 *  **住址**：目录化批次⑥把 `src/template.ts` 按段切成「族内一件一文件」，正文原样搬来；
 *  搬迁判据＝产物逐字节相同（见 `docs/base/base-render/组件目录架构.md` 本批读数）。
 */

import { TemplateErrorCode, TemplateMarkerKey } from '../../spec/template.js';

export class TemplateError extends Error {
  /** 逐字对齐 `TemplateErrorShape.name`。 */
  readonly name = 'TemplateError';
  readonly code: TemplateErrorCode;
  /** 归因标记（能唯一定位时给出；载荷槽／信封级失败不给）。 */
  readonly marker?: TemplateMarkerKey;

  constructor(code: TemplateErrorCode, message: string, marker?: TemplateMarkerKey) {
    super(message);
    this.code = code;
    if (marker !== undefined) this.marker = marker;
  }
}

/** 抛错并收窄控制流（`never` 返回，便于 TS 在断言后收窄）。 */
export function fail(code: TemplateErrorCode, message: string, marker?: TemplateMarkerKey): never {
  throw new TemplateError(code, message, marker);
}

/** 六个标记的规范序（恒取 `TEMPLATE_MARKERS` 键序，不自立第二份顺序）。 */
