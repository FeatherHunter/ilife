/** 账户域·查询载荷装配件（#689 结构搬迁第三批：从 `src/render/views.ts` 的 `buildAccountQuery` 来）。
 *  一件事实：`bill.account.query` 的 list 载荷 `{ items, total }`——余额实算与最近三笔由调用方装配，
 *  本件只管载荷形状与条数。
 *
 *  谁在用（指名）：`src/cli/cmd_read.ts` 的 account.query 分支（未迁移命令的分派，经 `./index.js` 门取）——
 *    命令搬进本域后由本域处理体消费。 */
export function buildAccountQuery(items: Record<string, unknown>[]): { items: Record<string, unknown>[]; total: number } {
  return { items, total: items.length };
}
