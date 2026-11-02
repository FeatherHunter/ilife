/** `push-plan --date` 的取数口：日期 → 当天的 sessions（读卡路里库，只读）。
 *
 * 口径：
 * - 只读打开（`db/readonly.ts` 的 `openDbReadOnly`：不建表、不迁移；与 `cli/cmd_read.ts:97` 同法）；
 * - 库路径＝配置里 `db.dir`（空＝数据目录）下的 `db.name`（`paths.ts` 的
 *   `resolveDbDir`＋`resolveDbFileName`；不用 `resolveDbPath`——它会 `mkdir`，只读口不许有落盘副作用）；
 * - 日期 →（周，日）走渲染门的 `weekOfDate`（新仓口径；老 `calc_plan_week` 的
 *   “超总周数循环”不照抄——新仓 `buildPlanView` 同样不过滤循环周，
 *   对不上就当这天没排练）；
 * - 会读 `workout_plans` 全表再按（周，日）过滤（`workout` 门的 `getPlan` 只读口；
 *   R1 收口 #613：跨能力引用一律走能力门 `workout/index.js#getPlan` 与
 *   `render/index.js#weekOfDate`，不深引对方内部件）；
 * - 存在性预检：库目录取不到／库文件不在／打开失败一律回 `found: false` 带人话原因，
 *   不抛错（调用方按退出码 1 报；“失败不许静默吞”）；
 * - “无任何计划”（无配置且无会话）与“计划缺开始日期”同样回 `found: false`；
 *   “这天没排练”（休息日／计划未开始／超周）回 `found: true, sessions: []`——调用方按老
 *   `push.py:135-143` 回 `session_count: 0` ＋ note，退出 0。
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { resolveDbDir, resolveDbFileName } from '../paths.js';
import { openDbReadOnly } from '../db/readonly.js';
import { getPlan } from '../workout/index.js';
import { weekOfDate } from '../render/index.js';
import type { PushSession } from './push.js';
import { m } from '../entries/index.js';

/** 取数结局：`found: true` 即有明确答案（含“这天没排练”的空表）；否则看 `reason` 报 1。 */
export type DayPlan =
  | { readonly found: true; readonly sessions: readonly PushSession[]; readonly planWeek: number; readonly dayOfWeek: number }
  | { readonly found: false; readonly reason: string };

/** 日期入参的取值面（测试从这里换库文件；不许打生产库）。 */
export interface ResolveDayPlanOpts {
  readonly dbFile?: string;
}

/** 日期形状检查：`YYYY-MM-DD` 且为真实日历日；null＝通过，否则为人话原因。 */
export function dateProblem(v: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return m('skill-calorie.xunji-planSource.c001', { p0: String(v) });
  const [y, mo, d] = v.split('-').map(Number);
  const dt = new Date(Date.UTC(y as number, (mo as number) - 1, d as number));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== (mo as number) - 1 || dt.getUTCDate() !== d) {
    return m('skill-calorie.xunji-planSource.c002', { p0: String(v) });
  }
  return null;
}

/** 取某天的 sessions（只读；任何读不出都回 `found: false`，不抛）。 */
export function resolveDayPlan(dateStr: string, opts: ResolveDayPlanOpts = {}): DayPlan {
  let dbFile = opts.dbFile;
  if (dbFile === undefined) {
    try {
      dbFile = join(resolveDbDir(), resolveDbFileName());
    } catch (e) {
      return { found: false, reason: e instanceof Error ? e.message : String(e) };
    }
  }
  if (!existsSync(dbFile)) {
    return { found: false, reason: m('skill-calorie.xunji-planSource.c003', { p0: String(dbFile) }) };
  }
  let db: { close: () => void } | null = null;
  try {
    const opened = openDbReadOnly(dbFile);
    db = opened;
    const plan = getPlan(opened);
    if (!plan.config && plan.sessions.length === 0) {
      return { found: false, reason: m('skill-calorie.xunji-planSource.c004') };
    }
    const start = plan.config?.start_date ?? null;
    if (!start) {
      return { found: false, reason: m('skill-calorie.xunji-planSource.c005') };
    }
    const { week, dow } = weekOfDate(start, dateStr);
    const sessions = plan.sessions.filter((s) => s.week_number === week && s.day_of_week === dow);
    return { found: true, sessions, planWeek: week, dayOfWeek: dow };
  } catch (e) {
    return { found: false, reason: m('skill-calorie.xunji-planSource.c006', { p0: String(e instanceof Error ? e.message : String(e)) }) };
  } finally {
    try {
      db?.close();
    } catch {
      /* 关库失败不掩盖取数结论 */
    }
  }
}

/** 取数口的函数形状（`run.ts` 的注入缝与测试挡板共用这一个类型）。 */
export type DayPlanSource = (dateStr: string) => DayPlan;
