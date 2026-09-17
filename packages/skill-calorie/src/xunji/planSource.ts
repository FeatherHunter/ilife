/** `push-plan --date` 的取数口：日期 → 当天的 sessions（读卡路里库，只读）。
 *
 * 口径：
 * - 只读打开（`db/readonly.ts` 的 `openDbReadOnly`：不建表、不迁移；与 `cli/cmd_read.ts:97` 同法）；
 * - 库路径＝`SKILLS_DB_PATH` 下的 `calorie_data.db`（`paths.ts` 的 `resolveDbDir`＋`DB_FILENAME`；
 *   不用 `resolveDbPath`——它会 `mkdir`，只读口不许有落盘副作用）；
 * - 日期 →（周，日）走 `render/planPlate.ts` 的 `weekOfDate`（新仓口径；老 `calc_plan_week` 的
 *   “超总周数循环”不照抄——新仓 `buildPlanView`（`planPlate.ts:61-76`）同样不过滤循环周，
 *   对不上就当这天没排练）；
 * - 会读 `workout_plans` 全表再按（周，日）过滤（`planStore.getPlan`；跨能力引用走仓内先例：
 *   `render/planPlate.ts:10` 与 `render/exercisePort.ts:12` 同样直引它，`workout/write.ts:12`
 *   同样直引 `planPlate.weekOfDate`——计划读写面在新仓本就互引，本件沿既有先例，不另起共用位）；
 * - 存在性预检：`SKILLS_DB_PATH` 未设／库文件不在／打开失败一律回 `found: false` 带人话原因，
 *   不抛错（调用方按退出码 1 报；“失败不许静默吞”）；
 * - “无任何计划”（无配置且无会话）与“计划缺开始日期”同样回 `found: false`；
 *   “这天没排练”（休息日／计划未开始／超周）回 `found: true, sessions: []`——调用方按老
 *   `push.py:135-143` 回 `session_count: 0` ＋ note，退出 0。
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { DB_FILENAME, resolveDbDir } from '../paths.js';
import { openDbReadOnly } from '../db/readonly.js';
import { getPlan } from '../workout/planStore.js';
import { weekOfDate } from '../render/planPlate.js';
import type { PushSession } from './push.js';

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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return '日期须为 YYYY-MM-DD（实际：' + v + '）';
  const [y, m, d] = v.split('-').map(Number);
  const dt = new Date(Date.UTC(y as number, (m as number) - 1, d as number));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== (m as number) - 1 || dt.getUTCDate() !== d) {
    return '日期不是真实日历日（实际：' + v + '）';
  }
  return null;
}

/** 取某天的 sessions（只读；任何读不出都回 `found: false`，不抛）。 */
export function resolveDayPlan(dateStr: string, opts: ResolveDayPlanOpts = {}): DayPlan {
  let dbFile = opts.dbFile;
  if (dbFile === undefined) {
    try {
      dbFile = join(resolveDbDir(), DB_FILENAME);
    } catch (e) {
      return { found: false, reason: e instanceof Error ? e.message : String(e) };
    }
  }
  if (!existsSync(dbFile)) {
    return { found: false, reason: '卡路里库文件不在（' + dbFile + '）：先确认 SKILLS_DB_PATH 指对，再看库在不在' };
  }
  let db: { close: () => void } | null = null;
  try {
    const opened = openDbReadOnly(dbFile);
    db = opened;
    const plan = getPlan(opened);
    if (!plan.config && plan.sessions.length === 0) {
      return { found: false, reason: '无训练计划（先定训练计划）' };
    }
    const start = plan.config?.start_date ?? null;
    if (!start) {
      return { found: false, reason: '计划缺开始日期，无法定位周次' };
    }
    const { week, dow } = weekOfDate(start, dateStr);
    const sessions = plan.sessions.filter((s) => s.week_number === week && s.day_of_week === dow);
    return { found: true, sessions, planWeek: week, dayOfWeek: dow };
  } catch (e) {
    return { found: false, reason: '读训练计划失败：' + (e instanceof Error ? e.message : String(e)) };
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
