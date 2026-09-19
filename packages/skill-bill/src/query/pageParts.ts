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

/** 本域两张页型统一走它：补上眉标再转共用位的 `pageShell`；调用点写法 `pageShell({…})` 不变。 */
export function queryPageShell(input: Omit<PageShellInput, 'eyebrow'>): string {
  return pageShell({ ...input, eyebrow: QUERY_EYEBROW });
}
