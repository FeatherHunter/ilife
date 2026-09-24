/** 组件层共用：五字符转义（唯一口径 = 冻结的 `ESCAPE_HTML_CHARS`／`ESCAPE_HTML_ENTITIES`，
 *  与 `controls.ts`／`blocks.ts` 同源——第三处不新造表，只读同一份冻结常量）。
 *
 *  为什么单独一件：每个组件都要转义自己的文本字段，把这张表抄进各组件 = 五处走散的风险；
 *  本件是组件层的**唯一转义入口**（`shared/` 只放这类跨组件小件，不放组件）。 */
import { ESCAPE_HTML_CHARS, ESCAPE_HTML_ENTITIES } from '../../spec/controls.js';
import type { EscapeHtmlChar } from '../../spec/controls.js';

const ESCAPE_RE = new RegExp('[' + ESCAPE_HTML_CHARS.join('') + ']', 'g');

/** 五字符转义（`& < > " '`）；表外的字符原样。 */
export function esc(value: string): string {
  return value.replace(ESCAPE_RE, (ch) => ESCAPE_HTML_ENTITIES[ch as EscapeHtmlChar] ?? ch);
}
