/** 落地训练（HELP 场景 05「健身计划」下一级「落地训练」）：`calorie.workout.land` 写。
 *
 * 链（老 `sync_plan.py:329-332` 四步，新仓四步同序同天数）：
 * ① 读本仓计划（workout 自有 `planStore`，只读，与 `xunjiPush.ts` 同一对引用，不新增直引种类）；
 * ② 逐天写进日历（作息合成写 `schedule.plan.write op=ensure dates[]`，经 `./landRunner.js` 子进程）；
 * ③ 记心愿（备忘合成写 `memo.create category=心愿 due`，逐段，经同跑道）；
 * ④ 推训记（`xunji push-plan`，经同跑道复用 `xunjiRunner`，单日）→ ⑤ 拉实绩回写
 * （`xunji backfill --days 1`，天数与落地天数同源，修掉老 `--days` 与 `--backfill-days` 两张皮）。
 *
 * 两态（同一命令，`dryRun` 分流）：
 * - `dryRun: true` → 过程页（可复制 prompt 先出，远端未调用，不进任何子进程；
 *   页上带训记 KEY 有无与空天原因，不拿预演页当成功用）；
 * - 缺省 → 结果页（四步逐段结局 ＋ 本地远端分清，任一步失败即非 0 点名哪一步＋下一步）。
 *
 * 三旧坑落点：① 任一步失败即非 0（用法 2／本地缺 KEY 3／其余 4，失败不落成功页）；
 *
 * 无段即缺失阻断（#943）：这一天一段可落的训练段都没有时，两态都不进——`fail(4, …)` 点名
 * 「为什么 ＋ 下一步」，不落页、不进任何子进程（判据 `landNoSegmentWhy`，批量宿主引同一份）。
 * 旧口径把「0 段」当正常读数回成功回执页，用户现场就是「无计划可落地却拿到一张预演回执」。
 * ② 外部调用无保护 → 跑道预检＋限时＋失败进码；③ 回执渲染器不调外部 → 调用与回执收进同一命令。
 * 审计（动作名校验）不在本链：推送前不校验、原样上报（沿 `#607 §八·7`，审计由薄命令层做）。
 *
 * R3 真实现（#613 收口：作息桥与备忘桥缺省走真合成写，可注入 `RunSyncDeps.plan`／`wish`
 * 同形函数；本宿主第二／三步走同跑道同口径，定义共用 `landPages.ts` 三函数与 `landRunner.ts`）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { todayISO } from '../analysis/utils.js';
import { resolveDbDir, resolveDbFileName } from '../paths.js';
import { openDbReadOnly } from '../db/readonly.js';
import { weekOfDate } from '../render/planPlate.js';
import { dayField, fail } from '../shared/params.js';
import { R, provided } from '../shared/writeParts.js';
import type { WriteOut } from '../shared/commandSpec.js';
import { getPlan } from './planStore.js';
import type { PlanConfigRow, PlanSessionRow } from './planStore.js';
import { invokeLandBackfill, invokeLandPush, invokeMemo, invokeSchedule } from './landRunner.js';
import { buildLandProcessPage, buildLandResultPage, landNotesOf, landSpanOf, landTitleOf } from './landPages.js';
import type { LandStepRead } from './landPages.js';
import { xunjiKeyNext } from './xunjiKey.js';

export const LAND_KEY = 'calorie.workout.land';
const LAND_WAKE = '落地训练';

/** R3 桥结局（与 `xunji/run-sync.ts#RunSyncStepResult` 同形，不直引 `xunji` 件，运行时零耦合）。 */
export interface LandBridgeResult {
  readonly ok: boolean;
  readonly skipped?: boolean;
  readonly code?: 1 | 2 | 3;
  readonly error?: string;
  readonly note?: string;
}

/** R3 双桥的注入缝（与 `xunji/run-sync.ts#RunSyncDeps.plan`／`wish` 同形：天数组进、结局出；
 * 调用方可注入同形函数；`dbFile` 只给测试换库文件，生产走库目录（配置项 `db.dir`），不许打生产库）。 */
export interface LandBridgeDeps {
  readonly plan?: (dates: readonly string[]) => Promise<LandBridgeResult>;
  readonly wish?: (dates: readonly string[]) => Promise<LandBridgeResult>;
  readonly dbFile?: string;
}

/** 只读打开计划库（与 `xunji/planSource.ts` 同法；打不开即回原因，不抛）。 */
function openPlanDb(dbFile: string | undefined): { db: DatabaseSync | null; reason: string | null } {
  let file: string;
  try {
    file = dbFile ?? join(resolveDbDir(), resolveDbFileName());
  } catch (e) {
    return { db: null, reason: e instanceof Error ? e.message : String(e) };
  }
  if (!existsSync(file)) {
    return { db: null, reason: '卡路里库文件不在（' + file + '）：先确认配置项 db.dir 指对（空＝数据目录），再看库在不在' };
  }
  try {
    return { db: openDbReadOnly(file) as unknown as DatabaseSync, reason: null };
  } catch (e) {
    return { db: null, reason: '读训练计划失败：' + (e instanceof Error ? e.message : String(e)) };
  }
}

function closeQuietly(db: { close: () => void } | null): void {
  if (db === null) return;
  try {
    db.close();
  } catch {
    /* 关库失败不掩盖桥结论 */
  }
}

/** R3 作息桥真实现（缺省：读计划 → 按天拼合成写条目 → 作息批量；返回结局，不 `fail`，调用方按码点名）。 */
async function defaultLandPlan(dates: readonly string[], dbFile?: string): Promise<LandBridgeResult> {
  if (dates.length === 0) return { ok: true, note: '无日期' };
  const opened = openPlanDb(dbFile);
  if (opened.db === null) return { ok: false, code: 1, error: opened.reason ?? '打不开库' };
  const db = opened.db;
  try {
    const plan = getPlan(db);
    if (!plan.config && plan.sessions.length === 0) {
      return { ok: false, code: 1, error: '无训练计划（先定训练计划）' };
    }
    const start = plan.config?.start_date ?? null;
    if (!start) return { ok: false, code: 1, error: '计划缺开始日期，无法定位周次' };
    const items: { date: string; time_start: string; time_end: string; title: string; notes: string }[] = [];
    for (const date of dates) {
      const { week, dow } = weekOfDate(start, date);
      plan.sessions
        .filter((s) => s.week_number === week && s.day_of_week === dow)
        .forEach((s, i) => {
          const { ts, te } = landSpanOf(s, i);
          items.push({ date, time_start: ts, time_end: te, title: landTitleOf(s, i), notes: landNotesOf(s) });
        });
    }
    if (items.length === 0) return { ok: true, note: '空天无段可写（' + dates.length + ' 天）' };
    const call = invokeSchedule(items, '补计划');
    if (call.code !== 0) {
      const d = call.data as { errors?: unknown } | null;
      const errs = typeof d === 'object' && d !== null && Array.isArray(d.errors)
        ? (d.errors as string[]).join('、') : '';
      return { ok: false, code: call.code === 2 ? 1 : 3, error: '补计划：' + (errs !== '' ? errs : '作息合成写没达成') };
    }
    return { ok: true, note: '已写 ' + items.length + ' 段（' + dates.length + ' 天）' + (call.stubbed ? '（挡板）' : '') };
  } finally {
    closeQuietly(db);
  }
}

/** R3 备忘桥真实现（缺省：读计划 → 逐段记心愿；第几天第几段点名，返回结局，不 `fail`）。 */
async function defaultLandWish(dates: readonly string[], dbFile?: string): Promise<LandBridgeResult> {
  if (dates.length === 0) return { ok: true, note: '无日期' };
  const opened = openPlanDb(dbFile);
  if (opened.db === null) return { ok: false, code: 1, error: opened.reason ?? '打不开库' };
  const db = opened.db;
  try {
    const plan = getPlan(db);
    if (!plan.config && plan.sessions.length === 0) {
      return { ok: false, code: 1, error: '无训练计划（先定训练计划）' };
    }
    const start = plan.config?.start_date ?? null;
    if (!start) return { ok: false, code: 1, error: '计划缺开始日期，无法定位周次' };
    let wrote = 0;
    let stubbed = false;
    for (const date of dates) {
      const { week, dow } = weekOfDate(start, date);
      const sessions = plan.sessions.filter((s) => s.week_number === week && s.day_of_week === dow);
      for (let i = 0; i < sessions.length; i++) {
        const s = sessions[i] as PlanSessionRow;
        const content = landTitleOf(s, i);
        const call = invokeMemo({ title: content, body: content, category: '心愿', due: date }, '记心愿');
        if (call.code !== 0) {
          const d = call.data as { message?: unknown } | null;
          const why = typeof d === 'object' && d !== null && typeof d.message === 'string'
            ? d.message : '备忘合成写没达成';
          return { ok: false, code: call.code === 2 ? 1 : 3, error: '记心愿第 ' + (wrote + 1) + ' 段 ' + why };
        }
        wrote += 1;
        stubbed = stubbed || call.stubbed;
      }
    }
    if (wrote === 0) return { ok: true, note: '空天无段可记（' + dates.length + ' 天）' };
    return { ok: true, note: '已记 ' + wrote + ' 条（' + dates.length + ' 天）' + (stubbed ? '（挡板）' : '') };
  } finally {
    closeQuietly(db);
  }
}

/** R3 作息桥（真实现；可注入 `RunSyncDeps.plan` 同形函数；本宿主第二步走同跑道同口径）。 */
export async function landPlanStep(dates: readonly string[], deps: LandBridgeDeps = {}): Promise<LandBridgeResult> {
  if (deps.plan !== undefined) return deps.plan(dates);
  return defaultLandPlan(dates, deps.dbFile);
}

/** R3 备忘桥（真实现；可注入 `RunSyncDeps.wish` 同形函数；本宿主第三步走同跑道同口径）。 */
export async function landWishStep(dates: readonly string[], deps: LandBridgeDeps = {}): Promise<LandBridgeResult> {
  if (deps.wish !== undefined) return deps.wish(dates);
  return defaultLandWish(dates, deps.dbFile);
}

/** `dryRun` 参数：缺省 false；非布尔即用法错（exit 2，不调外部）。 */
function readDryRun(params: Record<string, unknown>): boolean {
  const v = params['dryRun'];
  if (v === undefined || v === null) return false;
  if (typeof v !== 'boolean') fail(2, '参数 dryRun 须为布尔值');
  return v as boolean;
}

/** 计划形状（本件与批量宿主共用的那两份取数形状，不另起别名表）。 */
export interface LandPlan {
  readonly config: PlanConfigRow | null;
  readonly sessions: readonly PlanSessionRow[];
}

/** 这一天的训练段（只读；与计划库同口径）。**单日链与批量宿主共用这一份取数**，别处不许再算一遍。 */
export function landSessionsOf(plan: LandPlan, date: string): PlanSessionRow[] {
  const start = plan.config?.start_date;
  if (!start) return []; // 空串与 NULL 同档：都定不了周次（沿旧口径的 falsy 判）
  const { week, dow } = weekOfDate(start, date);
  return plan.sessions.filter((s) => s.week_number === week && s.day_of_week === dow);
}

/** 这一天**没得落地**的原因（有段回 `null`）。五种各给一句「为什么 ＋ 下一步」：
 *  无训练计划／计划缺开始日期／计划里一段都没排／这天在计划之外／这天是休息日。
 *
 *  单日链与批量宿主共用这一份判据：**没有可落地的训练段＝缺失阻断**（`fail(4, …)`），
 *  四步一步都不跑，也不许回成功回执页（沿 `cli/cmd_read.ts` 件头「空库／空窗／无目标一律抛，
 *  不返空数组冒充正常」）。旧口径把空天当正常读数回成功页，正是「无计划可落地却拿到预演回执」那条缺陷。 */
export function landNoSegmentWhy(plan: LandPlan, date: string): string | null {
  if (landSessionsOf(plan, date).length > 0) return null;
  if (!plan.config && plan.sessions.length === 0) return '无训练计划（先定训练计划）';
  const start = plan.config?.start_date;
  if (!start) return '计划缺开始日期，无法定位周次';
  if (plan.sessions.length === 0) return '这份计划里一段训练都没排（先定训练计划，或先给它加训练动作）';
  const { week } = weekOfDate(start, date);
  const total = plan.config?.total_weeks ?? null;
  if (week < 1) return '这天在计划开始日（' + start + '）之前（先换日期，或改计划开始日）';
  if (total !== null && week > total) {
    return '这天在计划之外：本计划 ' + start + ' 起共 ' + total + ' 周（先换日期，或先把计划加长）';
  }
  return '这天是休息日：计划里这一周这一天没有训练段（换一个有安排的日子，或先给它加训练动作）';
}

/** 推训记无 KEY 的数据分流（与 `xunjiPush.ts#localNoKey` 同判据：码 3 但逐段没调网即本地档）。 */
function pushLocalNoKey(data: unknown): boolean {
  const o = data as { fail_count?: unknown; results?: unknown } | null;
  if (typeof o !== 'object' || o === null || typeof o.fail_count !== 'number' || o.fail_count <= 0) return false;
  if (!Array.isArray(o.results) || o.results.length === 0) return false;
  return (o.results as unknown[]).every((r) => {
    const rr = r as { ok?: unknown; resp?: unknown } | null;
    if (typeof rr !== 'object' || rr === null || rr.ok !== false) return false;
    const resp = rr.resp as { err?: unknown; error_type?: unknown; code?: unknown; attempts?: unknown } | null;
    return typeof resp === 'object' && resp !== null && resp.err === true
      && resp.error_type === 'auth' && (resp.code === null || resp.code === undefined) && resp.attempts === 0;
  });
}

function failStep(step: string, code: number, why: string, tail: string): never {
  fail(code, '落地训练失败在' + step + '：' + why + (tail === '' ? '' : '（' + tail + '）'));
}

/** `calorie.workout.land` · 落地训练（读计划 → 补计划 → 记心愿 → 推送 → 回写，同一命令）。 */
export function writeLand(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const date = dayField(params, 'date') ?? todayISO();
  const dryRun = readDryRun(params);
  const plan = getPlan(db);
  // 缺失阻断不返空：这天没有一段可落的训练段（无计划／越窗／休息日）时，四步一步都不跑，
  // 也不许回成功回执页——「无计划可落地」是缺数据，不是一次成功的落地。判据住 `landNoSegmentWhy`。
  const why = landNoSegmentWhy(plan, date);
  if (why !== null) fail(4, '落地训练没有可落地的训练段：' + why);
  const sessions = landSessionsOf(plan, date);
  if (dryRun) {
    const message = '预演：' + date + ' ' + sessions.length + ' 段待落地（远端未调用）';
    const receipt = R('落地训练', 'create', message, LAND_WAKE, '训练计划（workout_plans）＋ 四步预演', {
      recordId: null, ids: [], idSource: 'condition', writtenFields: provided(params, ['date', 'dryRun']),
      items: [{ status: '成功', reason: '', detail: message }],
    });
    return {
      data: { ok: true, message, receipt },
      html: buildLandProcessPage({
        key: LAND_KEY, params, date, sessions, receipt,
        startDate: plan.config?.start_date ?? null,
      }),
    };
  }
  const steps: LandStepRead[] = [];
  const schedItems = sessions.map((s, i) => {
    const { ts, te } = landSpanOf(s, i);
    return {
      date, time_start: ts, time_end: te,
      title: landTitleOf(s, i),
      notes: landNotesOf(s),
    };
  });
  if (schedItems.length > 0) {
    const call = invokeSchedule(schedItems, '补计划');
    const d = call.data as { achieved?: unknown; errors?: unknown } | null;
    if (call.code !== 0) {
      const errs = typeof d === 'object' && d !== null && Array.isArray((d as { errors?: unknown }).errors)
        ? ((d as { errors: string[] }).errors.join('、')) : '';
      failStep('补计划', call.code === 2 ? 2 : 4, errs !== '' ? errs : '作息合成写没达成', call.stderr);
    }
    void d;
    steps.push({ step: '补计划', code: 0, local: '已写 ' + schedItems.length + ' 段', remote: call.stubbed ? '挡板未调远端' : '两侧已对齐', detail: '' });
  } else {
    steps.push({ step: '补计划', code: 0, local: '空天无段可写', remote: '未调用', detail: '' });
  }
  let wishOk = 0;
  let wishStubbed = false;
  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i] as PlanSessionRow;
    const content = landTitleOf(s, i);
    const call = invokeMemo({ title: content, body: content, category: '心愿', due: date }, '记心愿');
    if (call.code !== 0) {
      const d = call.data as { message?: unknown } | null;
      const why = typeof d === 'object' && d !== null && typeof d.message === 'string' ? d.message : '备忘合成写没达成';
      failStep('记心愿', call.code === 2 ? 2 : 4, '第 ' + (wishOk + 1) + ' 段 ' + why, call.stderr);
    }
    wishOk += 1;
    wishStubbed = wishStubbed || call.stubbed;
  }
  steps.push({
    step: '记心愿', code: 0,
    local: sessions.length === 0 ? '空天无段可记' : '已记 ' + wishOk + ' 条',
    remote: sessions.length === 0 ? '未调用' : (wishStubbed ? '挡板未调远端' : '两侧已对齐'), detail: '',
  });
  const push = invokeLandPush(date, '推送');
  if (push.code !== 0) {
    if (push.code === 2 || pushLocalNoKey(push.data)) {
      failStep('推送', 3, '本地缺 KEY（没调远端）：' + xunjiKeyNext(), push.stderr);
    }
    const o = push.data as { ok_count?: unknown; fail_count?: unknown; session_count?: unknown } | null;
    const counts = typeof o === 'object' && o !== null
      && typeof o.ok_count === 'number' && typeof o.fail_count === 'number' && typeof o.session_count === 'number'
      ? '成功 ' + o.ok_count + ' 段 失败 ' + o.fail_count + ' 段 共 ' + o.session_count + ' 段' : '远端推送失败';
    failStep('推送', 4, counts, push.stderr);
  }
  const ps = push.data as { ok_count?: unknown } | null;
  steps.push({
    step: '推送', code: 0,
    local: '计划 ' + sessions.length + ' 段全部参与推送',
    remote: '训记落笔 ' + (typeof ps === 'object' && ps !== null && typeof ps.ok_count === 'number' ? ps.ok_count : sessions.length) + ' 段',
    detail: '',
  });
  const back = invokeLandBackfill(date, '回写');
  if (back.code !== 0) {
    if (back.code === 2) failStep('回写', 3, '本地缺 KEY（没调远端）：' + xunjiKeyNext(), back.stderr);
    failStep('回写', 4, '训记回写失败：稍后重试', back.stderr);
  }
  const bs = back.data as { total_inserted?: unknown; total_updated?: unknown } | null;
  steps.push({
    step: '回写', code: 0,
    local: '运动记录新增 ' + (typeof bs === 'object' && bs !== null && typeof bs.total_inserted === 'number' ? bs.total_inserted : 0)
      + ' 行 更新 ' + (typeof bs === 'object' && bs !== null && typeof bs.total_updated === 'number' ? bs.total_updated : 0) + ' 行',
    remote: '训记 1 天全部拉到', detail: '',
  });
  const message = '已落地 ' + date + '：补计划 ' + schedItems.length + ' 段 记心愿 ' + wishOk + ' 条 推送回写各 1 天';
  const receipt = R('落地训练', 'create', message, LAND_WAKE, '训练计划（workout_plans）＋ 四步读数', {
    recordId: null, ids: [], idSource: 'condition', writtenFields: provided(params, ['date', 'dryRun']),
    items: [{ status: '成功', reason: '', detail: message }],
  });
  return {
    data: { ok: true, message, receipt },
    html: buildLandResultPage({
      key: LAND_KEY, params, date, sessions, steps, message, receipt,
      stubbed: steps.some((s) => s.remote.includes('挡板')),
    }),
  };
}
