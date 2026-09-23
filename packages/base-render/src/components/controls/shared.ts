/** controls · shared
 *
 *  自 `src/controls.ts` 原样切出。
 *
 *  **住址**：目录化批次⑤把 `src/controls.ts` 按段切成「族内一件一文件」，正文原样搬来；
 *  搬迁判据＝产物逐字节相同（五个渲染器 ＋ 共享 helpers JS ＋ 出口名单），
 *  见 `docs/base/base-render/组件目录架构.md`。
 */

import { ControlsErrorCode, ESCAPE_HTML_CHARS, ESCAPE_HTML_ENTITIES, EscapeHtmlChar, STATUS_KINDS, StatusKind } from '../../spec/index.js';

/* ── 错误形态（§3.3：与既有 RenderError 并列、互不继承、一律抛出、不返空） ── */

/** 控件层错误。**不**从 `src/index.ts` 导出：`SPEC_FROZEN_SURFACE` 44 条内无该运行时条目，
 *  调用方按 `name === 'ControlsError'` ＋ `code` 判定（与 `fillTemplate` 的 `TemplateError` 同口径）。 */
export class ControlsError extends Error {
  readonly code: ControlsErrorCode;

  constructor(code: ControlsErrorCode, message: string) {
    super(message);
    this.name = 'ControlsError';
    this.code = code;
  }
}

export function badInput(message: string): never {
  throw new ControlsError('bad-input', message);
}

/* ── 转义（AC-14：唯一口径 = 冻结的 `ESCAPE_HTML_CHARS`／`ESCAPE_HTML_ENTITIES`） ── */

const ESCAPE_RE = new RegExp('[' + ESCAPE_HTML_CHARS.join('') + ']', 'g');

export function esc(value: string): string {
  return value.replace(ESCAPE_RE, (ch) => ESCAPE_HTML_ENTITIES[ch as EscapeHtmlChar] ?? ch);
}

/* ── 入参校验小件（失败行为恒为 `ControlsError` code `bad-input`） ── */

export function assertPlainObject(value: unknown, field: string): void {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) badInput(field + ' 必须是对象');
}

export function assertActionId(value: unknown, field: string): string {
  if (typeof value !== 'string' || value === '') badInput(field + ' 必须是非空字符串');
  return value;
}

/** 零注入面：含内联事件处理器字段（`onclick`／`onClick`／任何 `on*`）的入参一律拒。 */
export function assertNoInlineHandler(value: object, field: string): void {
  for (const key of Object.keys(value)) {
    if (/^on/i.test(key)) badInput(field + ' 不得含内联事件处理器字段：' + key);
  }
}

export function isStatusKind(value: unknown): value is StatusKind {
  return (STATUS_KINDS as readonly string[]).includes(value as string);
}

