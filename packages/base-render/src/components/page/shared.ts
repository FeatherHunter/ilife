/** 页面级形状族的**共用小件**（三个产出器共用；本件不是组件）。
 *
 *  **住址**：目录化批次②从 `src/pageShapes.ts` 的件头小件原样搬来。
 *  待办：组件层共用件（`src/components/shared/`）落地并提交后，本件应并进那一处，
 *  不在两处各留一份转义表（铁律二）。此刻**不并**：那一处还没进版本库，引用未跟踪文件
 *  会让本提交单独检出时编译不过。
 */

/** 五字符转义表（与 `blocks.ts` 的 `esc` 逐字同口径，本件不引区块层内部件）。 */
export function esc(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => {
    if (ch === '&') return '&amp;';
    if (ch === '<') return '&lt;';
    if (ch === '>') return '&gt;';
    if (ch === '"') return '&quot;';
    return '&#39;';
  });
}

export function reqText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('pageShapes: ' + field + ' 必须是非空字符串');
  }
  return value;
}

export function optText(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new Error('pageShapes: ' + field + ' 必须是字符串');
  return value === '' ? undefined : value;
}
