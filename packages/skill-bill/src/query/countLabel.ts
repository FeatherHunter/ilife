/** 查询域·笔数口径注记（#1110 落地 #1084 裁定 C 的共用实现）。
 *
 * 裁定原文：`docs/skills/skill-bill/1084-笔数口径裁定.md`——页头（店头副题 H2）走**收支口径**
 * （转账不计），对账 CHECK 行走**全行集口径**（转账计入），两处各自点名；注记**只在窗口含转账时出现**，
 * 含转账数为 0 的窗口三处笔数逐字保持现状（批准原型即此情形，不得出现任何注记）。
 *
 * 规则只写在这一处（#1084 §三）。K ＝ 窗口内转账行数，判地唯一＝`../shared/kpi.js` 的 `isTransfer`
 * ——本件与八个页面件都不许另写一份「算不算转账」；N ＝ 收支笔数（`kpi.count`）、M ＝ 窗口行数：
 *   · K ＝ 0：H2 片段即 `N`、对账片段即 `M`（字面与原型逐字节相同）；
 *   · K > 0：H2 片段＝`N（不含转账）`、对账片段＝`M（含转账 K）`。
 * 不变量：**M − N ＝ K**，且 K ＝ 0 的窗口字面不含「不含转账」「含转账」——由
 * `test/t1110-count-caliber.test.mjs` 逐页断言（含转账／无转账两种固定样例）。
 *
 * 谁在用（八个调用点，指名）：`./ticketToday.js`（查今天）、`./ticketYesterday.js`（查昨天）、
 * `./ticket-day.js`（查某天）、`./ticketWeek.js`（查周）、`./ticketMonth.js`（查月）、
 * `./ticketCategory.js`（查分类）、`./ticketAccount.js`（查账户）、`./ticketLedger.js`（查账本）。
 * 各页只把这两个片段接进自己原有的字面（分隔符照各页原样：查今天半角 ` / `，其余全角 ` ／ `）。
 * 只有查询域在用 ⇒ 住本域目录 `src/query/`（归属律 2：写不出「哪两个能力在用」的不进共用位）。 */
import type { BillRow } from '../fetch/index.js';
import { isTransfer } from '../shared/kpi.js';

/** 两处笔数片段与转账数 K（#1084 §三；K ＝ 0 时两个片段即裸笔数，字面与批准原型逐字节相同）。 */
export interface CountNotes {
  /** 窗口内转账行数 K（判地：`../shared/kpi.js` 的 `isTransfer`）。 */
  readonly transfer: number;
  /** 店头副题（H2）的笔数片段（含量词「笔」）：K ＝ 0 即 `N 笔`，K > 0 即 `N 笔（不含转账）`。 */
  readonly head: string;
  /** 对账 CHECK 行的笔数片段（含量词「笔」）：K ＝ 0 即 `M 笔`，K > 0 即 `M 笔（含转账 K）`。 */
  readonly check: string;
}

/** 输入窗口行集与收支笔数 N（＝调用方的 `kpi.count`），输出两处笔数片段＋转账数 K。
 *
 * N 由调用方传入而不在本件重算：收支口径的判地是 `../shared/kpi.js` 的 `calcKpi`，本件不另算一份。 */
export function countNotes(records: readonly BillRow[], kpiCount: number): CountNotes {
  const transfer = records.filter((r) => isTransfer(r)).length;
  return {
    transfer,
    head: String(kpiCount) + ' 笔' + (transfer > 0 ? '（不含转账）' : ''),
    check: String(records.length) + ' 笔' + (transfer > 0 ? '（含转账 ' + String(transfer) + '）' : ''),
  };
}
