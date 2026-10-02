/** 查询域页内共件：**本域眉标** ＋ **两张页型共用的页框**。
 *
 * 谁在用（两张页型，指名）：`./list.ts` 的列表页（`queryListDoc`）与 `./detail.ts` 的详情页
 *  （`queryDetailDoc`）——两页同一套页框（裁定 7「一个形状只许一处定义」）。
 *
 * 页内共件的另外两件（**区块锚点包装**与**页内导航**）已搬到共用位 `../shared/pageSections.js`：
 *  写入域五张模板的回执页也要用同一套（第二个用法 ⇒ 提共用位），本件不再持它们。
 *
 * 查询域各页的眉标：**只在本域写一次**（共用位 `shared/pageShell.ts` 不持「域名→取值」表，照守卫③b）。
 */
import { pageShell } from '../shared/pageShell.js';
import type { PageShellInput } from '../shared/pageShell.js';

/** 查询域各页的眉标。 */
export const QUERY_EYEBROW = '记账｜查询域';

/** 1056 查询 v2.1 复制区新口径（块居中＋左缘对齐＋▾补位，查询域自家样式，不进共用位）。
 *
 *  基座标签写死故字面 ▾ 走 CSS `::after`（数据可见、日志隐藏补位）；三禁：零 `flex-start`、日志补位、
 *  禁 border 三角且 open 不旋转、copied 藏 ▾。作用域限 `.ilife-list` 与 `.ilife-ticket-detail`，
 *  写入域零命中（写入页指纹只随菜单文案变，CSS 文本不进写入产物）。
 *  详情 scale-note 同值收在此（原型 `.scale-note`）。 */
export const QUERY_COPY_CSS = [
  '.ilife-list .ilife-block-copy-block, .ilife-bill-sheet-page.ilife-ticket-detail .ilife-block-copy-block { max-width: 340px; margin-inline: auto; text-align: center; }',
  '.ilife-list .ilife-action-row-ghost, .ilife-bill-sheet-page.ilife-ticket-detail .ilife-action-row-ghost { display: flex; flex-direction: column; align-items: center; gap: 8px; }',
  '.ilife-list .ilife-copy-menu-wrap, .ilife-bill-sheet-page.ilife-ticket-detail .ilife-copy-menu-wrap { width: 100%; max-width: 340px; margin-inline: auto; justify-content: center; }',
  '.ilife-list .ilife-copy-btn, .ilife-bill-sheet-page.ilife-ticket-detail .ilife-copy-btn { width: 100%; max-width: 340px; justify-content: center; text-align: center; }',
  '.ilife-list .ilife-copy-menu-wrap > .ilife-copy-btn::after, .ilife-bill-sheet-page.ilife-ticket-detail .ilife-copy-menu-wrap > .ilife-copy-btn::after { content: " ▾"; border: none !important; width: auto; height: auto; margin-left: 6px; transform: none !important; }',
  '.ilife-list .copy-menu-open.ilife-copy-menu-wrap > .ilife-copy-btn::after, .ilife-bill-sheet-page.ilife-ticket-detail .copy-menu-open.ilife-copy-menu-wrap > .ilife-copy-btn::after { transform: none !important; }',
  '.ilife-list [data-action-id="ilife-copy-log"]::after, .ilife-bill-sheet-page.ilife-ticket-detail [data-action-id="ilife-copy-log"]::after { content: " ▾"; visibility: hidden; margin-left: 6px; }',
  '.ilife-list .ilife-copy-btn.copied::after, .ilife-bill-sheet-page.ilife-ticket-detail .ilife-copy-btn.copied::after { content: none !important; }',
  '.ilife-ticket-scale-note { margin: 8px 0 0; font-size: 12.5px; color: var(--ilife-ink-2); line-height: 1.6; }',
].join('\n');

/** 查询页内嵌样式：把本域 CSS 以 `<style>` 随正文走（不进共用 `extraCss`，写入产物逐字节不动）。 */
export function queryStyleTag(): string {
  return '<style>' + QUERY_COPY_CSS + '</style>';
}

/** 本域两张页型统一走它：补上眉标再转共用位的 `pageShell`；调用点写法 `pageShell({…})` 不变。 */
export function queryPageShell(input: Omit<PageShellInput, 'eyebrow'>): string {
  return pageShell({ ...input, eyebrow: QUERY_EYEBROW });
}
