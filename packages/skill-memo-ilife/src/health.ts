/** 备忘录配置体检 · **报告构造的兼容口**（票 #855 从这里分件出去）。
 *
 * 为什么这层还能留下：跨包消费者按 **`packages/skill-memo-ilife/dist/health.js`** 的
 * `buildMemoHealthReport` 取报告（面板侧 `dsh-life-pack` 的 health 面就是这条老路）。包门只许收窄，
 * 老路不许悄悄断——故本件只做转发，判据与实现全搬进 `src/cli/health/`：
 *
 *   - `cli/health/configRead.ts` 只读配置解析（文件不在时不落默认件）；
 *   - `cli/health/probe.ts`     机器面探针（目录在否／能写否、模板件数、库表数、飞书 CLI 三档）；
 *   - `cli/health/items.ts`     九条体检项与报告组装（按域归位的下一步见该件件头）；
 *   - `cli/health.ts`           **页外先拦**：`memo.config.check` 这条只读命令在库目录预检之前拦下。
 *
 * 本件不出任何新名字：转出的就是原来那几个（报告构造、报告类型、表数门槛、只读解析）。
 */
export { buildMemoHealthReport } from './cli/health/items.js';
export type { HealthItem, HealthStatus, MemoHealthReport } from './cli/health/items.js';
export { DB_TABLE_THRESHOLD, readMemoConfigReadOnly } from './cli/health/index.js';
export type { ConfigRead } from './cli/health/index.js';
