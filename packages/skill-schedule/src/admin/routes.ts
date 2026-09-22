/** 辅助与管理的路由声明（**权威源**，`schedule.help.lookup` 的 6 条）。
 *
 * `order`＝今日 `WAKE_TABLE` 下标：归并保序，HELP 速查与 SKILL.md 逐字节不动。
 * 条目逐字照搬 `src/policy/wakewords.ts`（Layer2 退役它之前，两处由对账测试钉死相等）。
 *
 * #790 · 「初始化数据库」与「首次使用」两条：清单里它们是 admin 域的行，
 * 此前「初始化数据库」落在 `schedule.record.today` 上（`src/query/routes.ts` 的 order 10，
 * 本票把它搬过来：那边只删一行，order 原槽位由这里原样接过去，其余行一个不动，
 * 页组件一行不动）。
 * **键不新造**——两条都进自家的 `schedule.help.lookup`，用 preset 分档
 * （照「周视图」落 `schedule.record.range` ＋ preset 的先例，#785）：
 * `view=init` 出初始化回执那张页，`view=firstUse` 出首次使用向导那张页，
 * 缺省档仍是 HELP 文件（`lookupHelp` 按 `view` 分流）。
 */
import type { RouteEntry } from '../shared/commandSpec.js';

export const ADMIN_ROUTES: readonly RouteEntry[] = [
  { phrase: '作息管家 HELP', key: 'schedule.help.lookup', order: 0 },
  { phrase: '作息管家帮助', key: 'schedule.help.lookup', order: 1 },
  { phrase: '作息管家能做什么', key: 'schedule.help.lookup', order: 2 },
  { phrase: '作息管家使用说明', key: 'schedule.help.lookup', order: 3 },
  { phrase: '初始化数据库', key: 'schedule.help.lookup', preset: { view: 'init' }, order: 10 },
  { phrase: '首次使用', key: 'schedule.help.lookup', preset: { view: 'firstUse' }, order: 50 },
];
