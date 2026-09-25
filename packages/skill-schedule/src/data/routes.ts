/** #961 · 数据族的路由声明（**权威源**，空数组占位）。
 *
 * 程序面命令不要路由（`surface: 'program'`，生成器 `wakeWordGate` 豁免＋`checkRouteSelf` 守卫）；
 * 本文件是生成器要求的占位（每个能力恰导一个路由数组，`src/data/index.ts` 再导出）。
 */
import type { RouteEntry } from '../shared/commandSpec.js';

export const DATA_ROUTES: readonly RouteEntry[] = [];
