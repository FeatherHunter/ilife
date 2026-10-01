/** 收支方向的两个词（**唯一定义地**）：支出／收入。
 *
 *  为什么住共用位：这两个词跨域用——写入域拿它做回执主数字的眉标（`src/write/summaryRow.ts`
 *  的 `DIRECTION` 表读这一份，回执模板件再经 `directionWord` 取裸字），查询域拿它做详情页眉标
 *  （`src/query/detail.ts`）。第二个域长出来之前它住在 `src/write/summaryRow.ts` 里，
 *  查询域要引就得跨域 import（本包两域之间至今零跨域引用，见 `src/query/list.ts` 那句
 *  「**不是** `src/write/summaryRow.ts` 的 `money2`」）⇒ 提到共用位，两域各引同一份。
 *
 *  口径：**金额符号即方向**——支出负数、收入正数（与 `src/shared/category.ts` 的列口径同一条）。
 *  零与「还没给」照实说「未判」，不拿 0 顶（裁定第 3 条：本仓不记零）。
 *
 *  谁在用（两处，指名）：`src/write/summaryRow.ts`（`DIRECTION` 表的 `word` 位）与
 *  `src/query/detail.ts`（详情页那颗药丸眉标）。 */
export const DIRECTION_WORDS = Object.freeze({ expense: '支出', income: '收入' } as const);

/** 金额 → 方向词（裸字，不带括号说明；「未判」那两档见上）。 */
export function directionWord(amount: number | null): string {
  if (amount === null || !Number.isFinite(amount) || amount === 0) return '未判';
  return amount < 0 ? DIRECTION_WORDS.expense : DIRECTION_WORDS.income;
}
