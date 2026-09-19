/** 查询域·载荷行投影（#689 结构搬迁第三批：从 `src/render/views.ts` 拆来，**暂住查询域**）。
 *  一件事实：库行（`BillRow`，10 列）→ 载荷行（`BillItem`，8 字段）——载荷形状是既有契约，字段与序一字不动。
 *
 *  出现点实测三个：`./read.ts` 两处（列表载荷 `items`、详情载荷 `item`）＋ `src/cli/cmd_read.ts` 的
 *  account.query 分支（账户最近三笔）。没有第二个**域**在用它 ⇒ 按归属律 1 暂住查询域
 *  （#683 §3.9 的处置）；分析域真要用明细行时按归属律 2 上浮共用位。
 *
 *  谁在用（指名）：`src/query/read.ts`（`toBillItem`／`BillItem` 类型）·
 *    `src/cli/cmd_read.ts`（外壳，经 `./index.js` 门取）。 */
import type { BillRow } from '../fetch/db.js';

export interface BillItem {
  id: number; category: string; time: string; amount: number;
  account: string; ledger: string; currency: string; note: string;
}

export function toBillItem(r: BillRow): BillItem {
  return {
    id: r.id, category: r.category, time: r.time, amount: r.amount,
    account: r.account, ledger: r.ledger, currency: r.currency, note: r.note,
  };
}
