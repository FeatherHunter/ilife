/** text · shared
 *
 *  自 `src/text.ts` 原样切出。
 *
 *  **住址**：目录化批次⑥把 `src/text.ts` 按段切成「族内一件一文件」，正文原样搬来；
 *  搬迁判据＝产物逐字节相同（见 `docs/base/base-render/组件目录架构.md` 本批读数）。
 */

import { LOG_SECTION_SOURCES, TextErrorCode } from '../../spec/text.js';

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
export function fail(code: TextErrorCode, message: string): never {
  throw new TextError(code, message);
}

export const LF = String.fromCharCode(10);
export const CR = String.fromCharCode(13);
/** 时间行前缀（契约未规定文案；沿用旧基线 `base.js:254` 的 `'时间: '`，见 §3.4 行为补遗）。 */
export const TIME_LABEL = '时间: ';
/** `csv` 口径的空值（`contract:610`：机器可读，写空字符串、不写占位符）。 */
export const CSV_EMPTY = '';
/** 「由 envelope 派生」的段源哨兵：恒读冻结常量 `LOG_SECTION_SOURCES.scene`，不写第二份字面量。 */
export const ENVELOPE_SOURCE: string = LOG_SECTION_SOURCES.scene;

/** 一行文本 ＋ 是否敏感行（敏感行的 `text` 恒为 `SENSITIVE_ROW_RULE.mask`）。 */
export interface TextRow {
  readonly text: string;
  readonly sensitive: boolean;
}

/** 投影行分组：主体行（投影表 `body`）＋ 至多一条收尾行（投影表 `tail`）。 */
export interface DataRows {
  readonly body: readonly TextRow[];
  readonly tail: TextRow | null;
}

