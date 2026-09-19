/** 目标域·查询载荷装配件（#689 结构搬迁第三批：从 `src/render/views.ts` 的 `buildGoalQuery` 来）。
 *  一件事实：`bill.goal.query` 的 list 载荷 `{ items, total, op }`——预算执行与目标进度两行的
 *  `spent／remaining／rate／saved／pct` 由调用方实算装配，本件只管载荷形状与条数。
 *
 *  谁在用（指名）：`src/cli/cmd_read.ts` 的 goal.query 分支（未迁移命令的分派，经 `./index.js` 门取）——
 *    命令搬进本域后由本域处理体消费。 */
export function buildGoalQuery(op: string, items: Record<string, unknown>[]): { items: Record<string, unknown>[]; total: number; op: string } {
  return { items, total: items.length, op };
}
