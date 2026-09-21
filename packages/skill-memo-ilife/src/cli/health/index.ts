/** 配置体检 · **聚合位**（票 #855：`cli/health` 只留聚合与页外先拦）。
 *
 * 分工：
 *   - `configRead.ts` 只读配置解析（文件不在时不落默认件）；
 *   - `probe.ts` 机器面探针（目录在不在／能不能写、模板件数、库表数、飞书 CLI 三档）；
 *   - `items.ts` 九条体检项与报告组装；
 *   - `../health.ts`（`src/cli/health.ts`）＝**页外先拦**：`memo.config.check` 这个只读命令在库目录
 *     预检之前拦下（它要报的正是「库在哪、通不通」，不能先要求库已配）。
 *
 * 对外只转出报告构造与报告类型；跨包消费者按 `dist/health.js` 取报告的那条老路，由 `src/health.ts`
 * 转发保持（包门只许收窄，老路不许悄悄断）。
 */
export { buildMemoHealthReport } from './items.js';
export type { HealthItem, HealthStatus, MemoHealthReport } from './items.js';
export { DB_TABLE_THRESHOLD } from './probe.js';
export { readMemoConfigReadOnly } from './configRead.js';
export type { ConfigRead } from './configRead.js';
