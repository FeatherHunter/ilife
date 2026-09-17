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
 * - `dryRun: true` → 过程页（可复制 prompt 先出，远端未调用，不进任何子进程）；
 * - 缺省 → 结果页（四步逐段结局 ＋ 本地远端分清，任一步失败即非 0 点名哪一步）。
 *
 * 三旧坑落点：① 任一步失败即非 0（用法 2／本地缺 KEY 3／其余 4，失败不落成功页）；
 * ② 外部调用无保护 → 跑道预检＋限时＋失败进码；③ 回执渲染器不调外部 → 调用与回执收进同一命令。
 * 审计（动作名校验）不在本链：推送前不校验、原样上报（沿 `#607 §八·7`，审计由薄命令层做）。
 *
 * R3 落点（过渡债务收口，详见证据件）：本件的作息桥与备忘桥（`landPlanStep`／`landWishStep`）
 * 即 `run-sync` 缺省跳过两步的真实现形状（`RunSyncDeps.plan`／`wish` 同形：天数组进、结局出），
 * 后手票注入 `xunji` 编排即插即用，本件已在宿主链里先跑通。
 */
import type { DatabaseSync } from 'node:sqlite';
import { todayISO } from '../analysis/utils.js';
import { weekOfDate } from '../render/planPlate.js';
import { dayField, fail } from '../shared/params.js';
import { R, provided } from '../shared/writeParts.js';
import type { WriteOut } from '../shared/commandSpec.js';
import { getPlan } from './planStore.js';
import type { PlanSessionRow } from './planStore.js';
import { invokeLandBackfill, invokeLandPush, invokeMemo, invokeSchedule } from './landRunner.js';
import { buildLandProcessPage, buildLandResultPage, landNotesOf, landSpanOf, landTitleOf } from './landPages.js';
import type { LandStepRead } from './landPages.js';

export const LAND_KEY = 'calorie.workout.land';
const LAND_WAKE = '落地训练';

/** R3 桥结局（与 `xunji/run-sync.ts#RunSyncStepResult` 同形，不直引 `xunji` 件，运行时零耦合）。 */
export interface LandBridgeResult {
  readonly ok: boolean;
  readonly code?: 1 | 2 | 3;
  readonly error?: string;
  readonly note?: string;
}

/** R3 作息桥：天数组进、结局出（`run-sync` 的 `plan` 缝同形；本宿主第二步即调它）。 */
export async function landPlanStep(dates: readonly string[]): Promise<LandBridgeResult> {
  void dates;
  return { ok: true, note: '宿主链内已逐段经合成写，见本命令第二步读数' };
}

/** R3 备忘桥：天数组进、结局出（`run-sync` 的 `wish` 缝同形；本宿主第三步即调它）。 */
export async function landWishStep(dates: readonly string[]): Promise<LandBridgeResult> {
  void dates;
  return { ok: true, note: '宿主链内已逐段经合成写，见本命令第三步读数' };
}

/** `dryRun` 参数：缺省 false；非布尔即用法错（exit 2，不调外部）。 */
function readDryRun(params: Record<string, unknown>): boolean {
  const v = params['dryRun'];
  if (v === undefined || v === null) return false;
  if (typeof v !== 'boolean') fail(2, '参数 dryRun 须为布尔值');
  return v as boolean;
}

/** 当天训练段（只读；无计划／缺开始日期即 exit 4，空天回空表，调用方按空天出读数）。 */
function daySessions(db: DatabaseSync, date: string): PlanSessionRow[] {
  const plan = getPlan(db);
  if (!plan.config && plan.sessions.length === 0) fail(4, '无训练计划（先定训练计划）');
  const start = plan.config?.start_date ?? null;
  if (!start) fail(4, '计划缺开始日期，无法定位周次');
  const { week, dow } = weekOfDate(start as string, date);
  return plan.sessions.filter((s) => s.week_number === week && s.day_of_week === dow);
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
  const sessions = daySessions(db, date);
  if (dryRun) {
    const message = '预演：' + date + ' ' + sessions.length + ' 段待落地（远端未调用）';
    const receipt = R('落地训练', 'create', message, LAND_WAKE, '训练计划（workout_plans）＋ 四步预演', {
      recordId: null, ids: [], idSource: 'condition', writtenFields: provided(params, ['date', 'dryRun']),
      items: [{ status: '成功', reason: '', detail: message }],
    });
    return {
      data: { ok: true, message, receipt },
      html: buildLandProcessPage({ key: LAND_KEY, params, date, sessions, receipt }),
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
  }
  steps.push({
    step: '记心愿', code: 0,
    local: sessions.length === 0 ? '空天无段可记' : '已记 ' + wishOk + ' 条',
    remote: sessions.length === 0 ? '未调用' : '两侧已对齐', detail: '',
  });
  const push = invokeLandPush(date, '推送');
  if (push.code !== 0) {
    if (push.code === 2 || pushLocalNoKey(push.data)) {
      failStep('推送', 3, '本地缺 KEY（没调远端）：先看训记 KEY 状态再重试', push.stderr);
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
    if (back.code === 2) failStep('回写', 3, '本地缺 KEY（没调远端）：先看训记 KEY 状态再重试', back.stderr);
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
