/** 训练计划写命令（HELP 场景 05「健身计划」下一级「定训练计划」）：5 个创建类写处理函数。
 *
 * 照 `body/log.ts` 的形状：参数先验后写（用法错 exit 2、目标缺失 exit 4），回执经共用
 * `shared/writeParts.ts` 的 `R`／`out`（`ok`／`message`／`receipt` 三件），库函数复用
 * `planStore.ts`（本目录存储唯一定义地），日期→（周,日）口径复用 `render/planPlate.ts`
 * 的 `weekOfDate`（概念唯一，不在第二处重算）。
 *
 * M6 分流：这 5 个写键一律要求先走过程页（`view.plan-wizard`／`view.plan-write-preview`），
 * 直接调写键只认“用户已在过程页确认过”的调用；本文件不做确认态跟踪（确认发生在页与人的那一步）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { weekOfDate } from '../render/planPlate.js';
import type { WriteOut } from '../shared/commandSpec.js';
import { assertISO, dayField, fail, optInt, optStr } from '../shared/params.js';
import { R, out, provided } from '../shared/writeParts.js';
import {
  addSession,
  clearWeek,
  copyPlan,
  copyWeek,
  getPlan,
  updateSession,
  writePlan,
} from './planStore.js';
import type { PlanInput, PlanMovement } from './planStore.js';

function needWeek(v: number | undefined, field: string): number {
  if (v === undefined || !Number.isInteger(v) || (v as number) < 1) fail(2, '缺参数 ' + field + '（正整数周次）');
  return v as number;
}

function needDow(v: number | undefined, field: string): number {
  if (v === undefined || !Number.isInteger(v) || (v as number) < 1 || (v as number) > 7) {
    fail(2, '缺参数 ' + field + '（1＝周一..7＝周日）');
  }
  return v as number;
}

function asMovement(m: unknown): PlanMovement {
  if (typeof m !== 'object' || m === null || Array.isArray(m)) fail(2, '动作须为对象（含 name）');
  const o = m as Record<string, unknown>;
  if (typeof o.name !== 'string' || o.name === '') fail(2, '动作缺 name');
  const out: PlanMovement = { name: o.name };
  if (typeof o.part === 'string') out.part = o.part;
  if (typeof o.type === 'string') out.type = o.type;
  if (Array.isArray(o.sets)) out.sets = o.sets;
  return out;
}

/** `calorie.workout.plan-set` · 定训练计划（整份替换：先全量校验，有硬止即 exit 2 不写库）。 */
export function writePlanSet(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const plan = params['plan'];
  if (typeof plan !== 'object' || plan === null || Array.isArray(plan)) fail(2, '缺参数 plan（PlanInput 对象）');
  const r = writePlan(db, plan as PlanInput);
  if (r.status === 'failed' || r.errors.length > 0) fail(2, '计划校验未通过：' + r.errors.slice(0, 5).join('；'));
  const summary = '已定训练计划：' + String(r.totalWeeks ?? 0) + ' 周 ' + String(r.insertedCount) + ' 场';
  return out(R('定训练计划', 'create', summary, '定训练计划', 'workout_plan_config＋workout_plans（整份替换）', {
    recordId: null, ids: [], idSource: 'condition', writtenFields: ['plan'],
    items: [{ status: '成功', reason: '', detail: summary }],
  }));
}

/** `calorie.workout.plan-copy` · 复制训练计划（整份复制／单周复制二选一，不同时给）。 */
export function writePlanCopy(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const week = optInt(params, 'week');
  const toWeek = optInt(params, 'toWeek');
  const newTitle = optStr(params, 'newTitle');
  if (week !== undefined) {
    const from = needWeek(week, 'week');
    const plan = getPlan(db);
    const maxWn = plan.sessions.reduce((n, s) => Math.max(n, s.week_number), 0);
    if (maxWn === 0) fail(4, '无训练计划可复制（先定训练计划）');
    if (!plan.sessions.some((s) => s.week_number === from)) fail(4, '第' + from + '周没有会话可复制');
    const to = toWeek === undefined ? maxWn + 1 : needWeek(toWeek, 'toWeek');
    const r = copyWeek(db, from, to);
    const summary = '已复制第' + from + '周 → 第' + to + '周（' + r.copiedRows + ' 场）';
    return out(R('复制训练计划', 'create', summary, '复制训练计划', 'workout_plans（单周复制）', {
      recordId: null, ids: [], idSource: 'condition', writtenFields: provided(params, ['week', 'toWeek']),
      items: [{ status: '成功', reason: '', detail: summary }],
    }));
  }
  const r = copyPlan(db, newTitle ?? undefined);
  if (r.totalWeeks === 0) fail(4, '无训练计划可复制（先定训练计划）');
  const summary = '已复制整份计划为「' + String(r.newTitle) + '」（' + r.copiedRows + ' 场）';
  return out(R('复制训练计划', 'create', summary, '复制训练计划', 'workout_plan_config＋workout_plans（整份复制）', {
    recordId: null, ids: [], idSource: 'condition', writtenFields: provided(params, ['newTitle']),
    items: [{ status: '成功', reason: '', detail: summary }],
  }));
}

export interface SetWeekDay {
  dayOfWeek: number;
  sessionLabel?: string;
  rest?: boolean;
  movements?: PlanMovement[];
}

/** `calorie.workout.plan-set-week` · 定一周计划（该周先清后写；整包先验后写）。 */
export function writePlanSetWeek(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const week = needWeek(optInt(params, 'week'), 'week');
  const daysRaw = params['days'];
  if (!Array.isArray(daysRaw) || daysRaw.length === 0) fail(2, '缺参数 days（非空数组）');
  const days: SetWeekDay[] = (daysRaw as unknown[]).map((d) => {
    if (typeof d !== 'object' || d === null || Array.isArray(d)) fail(2, 'days 元素须为对象');
    const o = d as Record<string, unknown>;
    const day: SetWeekDay = { dayOfWeek: needDow(o.dayOfWeek as number | undefined, 'days[].dayOfWeek') };
    if (typeof o.sessionLabel === 'string') day.sessionLabel = o.sessionLabel;
    if (typeof o.rest === 'boolean') day.rest = o.rest;
    if (o.movements !== undefined) {
      if (!Array.isArray(o.movements)) fail(2, 'days[].movements 须为数组');
      day.movements = (o.movements as unknown[]).map(asMovement);
    }
    return day;
  });
  db.exec('BEGIN');
  try {
    clearWeek(db, week);
    let n = 0;
    for (const d of days) {
      addSession(db, {
        weekNumber: week, dayOfWeek: d.dayOfWeek, sessionLabel: d.sessionLabel ?? (d.rest ? '休息' : '训练'),
        isRestDay: d.rest ?? false, movements: d.movements ?? [],
      });
      n += 1;
    }
    db.exec('COMMIT');
    const summary = '已定第' + week + '周计划（' + n + ' 天）';
    return out(R('定一周计划', 'create', summary, '定一周计划', 'workout_plans（该周先清后写）', {
      recordId: null, ids: [], idSource: 'condition', writtenFields: provided(params, ['week', 'days']),
      items: [{ status: '成功', reason: '', detail: summary }],
    }));
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

/** `calorie.workout.plan-add-movement` · 加训练动作（有名额歧义即 exit 2，不猜）。 */
export function writePlanAddMovement(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const week = needWeek(optInt(params, 'week'), 'week');
  const dow = needDow(optInt(params, 'dayOfWeek'), 'dayOfWeek');
  const movement = asMovement(params['movement']);
  const label = optStr(params, 'sessionLabel');
  const plan = getPlan(db);
  const daySessions = plan.sessions.filter((s) => s.week_number === week && s.day_of_week === dow);
  if (label !== undefined) {
    const hit = daySessions.filter((s) => s.session_label === label);
    if (hit.length === 0) fail(4, '第' + week + '周周' + dow + '没有时段「' + label + '」');
    const s = hit[0] as (typeof daySessions)[number];
    updateSession(db, week, dow, s.session_index, { movements: [...(s.movements ?? []), movement] });
    const summary = '已在第' + week + '周周' + dow + '「' + label + '」加动作「' + String(movement.name) + '」';
    return out(R('加训练动作', 'update', summary, '加训练动作', 'workout_plans（时段追加动作）', {
      recordId: null, ids: [], idSource: 'condition', writtenFields: provided(params, ['week', 'dayOfWeek', 'sessionLabel', 'movement']),
      items: [{ status: '成功', reason: '', detail: summary }],
    }));
  }
  if (daySessions.length === 0) {
    addSession(db, { weekNumber: week, dayOfWeek: dow, sessionLabel: '训练', movements: [movement] });
  } else if (daySessions.length === 1) {
    const s = daySessions[0] as (typeof daySessions)[number];
    updateSession(db, week, dow, s.session_index, { movements: [...(s.movements ?? []), movement] });
  } else {
    fail(2, '第' + week + '周周' + dow + '有 ' + daySessions.length + ' 个时段，给 sessionLabel 指定加到哪段');
  }
  const summary = '已在第' + week + '周周' + dow + '加动作「' + String(movement.name) + '」';
  return out(R('加训练动作', daySessions.length === 0 ? 'create' : 'update', summary, '加训练动作', 'workout_plans（加动作）', {
    recordId: null, ids: [], idSource: 'condition', writtenFields: provided(params, ['week', 'dayOfWeek', 'movement']),
    items: [{ status: '成功', reason: '', detail: summary }],
  }));
}

/** 过程页预览（读，不写库）：与上面写实现**同一套定位规则**（同文件，防两处推演走散）。
 * 返回 { op, title, before, after, note }，由 `plan.ts` 的 `viewPlanWritePreview` 经
 * `render/html.ts` 的 `renderPlanWritePreviewHtml` 出页。定位歧义时与写实现报同样的错。 */
export interface WritePreview {
  op: string;
  title: string;
  before: string[];
  after: string[];
  note: string;
}

function sessText(wn: number, dow: number, label: string, moveCount: number, rest: boolean): string {
  return '第' + wn + '周周' + dow + '·' + (label || (rest ? '休息' : '训练')) + '（' + moveCount + '动作' + (rest ? '·休' : '') + '）';
}

export function previewCopy(params: Record<string, unknown>, db: DatabaseSync): WritePreview {
  const week = optInt(params, 'week');
  const plan = getPlan(db);
  if (week !== undefined) {
    const from = needWeek(week, 'week');
    const src = plan.sessions.filter((s) => s.week_number === from);
    if (src.length === 0) fail(4, '第' + from + '周没有会话可复制');
    const maxWn = plan.sessions.reduce((n, s) => Math.max(n, s.week_number), 0);
    const to = optInt(params, 'toWeek') === undefined ? maxWn + 1 : needWeek(optInt(params, 'toWeek'), 'toWeek');
    const before = src.map((s) => sessText(s.week_number, s.day_of_week, s.session_label, (s.movements ?? []).length, s.is_rest_day === 1));
    return {
      op: 'copy', title: '复制第' + from + '周 → 第' + to + '周', before,
      after: before.map((b) => b.replace('第' + from + '周', '第' + to + '周')),
      note: '确认后复制 ' + src.length + ' 场；目标周已有内容将被覆盖',
    };
  }
  const title = optStr(params, 'newTitle') ?? ((plan.config?.title ?? '健身计划') + ' 副本');
  const n = plan.sessions.length;
  if (n === 0) fail(4, '无训练计划可复制（先定训练计划）');
  return {
    op: 'copy', title: '复制整份计划为「' + title + '」',
    before: ['「' + String(plan.config?.title ?? '未命名') + '」共 ' + n + ' 场'],
    after: ['「' + title + '」共 ' + n + ' 场（整份替换当前计划）'],
    note: '确认后整份替换，旧计划不再保留',
  };
}

export function previewSetWeek(params: Record<string, unknown>, db: DatabaseSync): WritePreview {
  const week = needWeek(optInt(params, 'week'), 'week');
  const plan = getPlan(db);
  const cur = plan.sessions.filter((s) => s.week_number === week);
  const before = cur.length === 0 ? ['第' + week + '周目前是空的'] :
    cur.map((s) => sessText(s.week_number, s.day_of_week, s.session_label, (s.movements ?? []).length, s.is_rest_day === 1));
  const daysRaw = params['days'];
  const after = Array.isArray(daysRaw) ? (daysRaw as unknown[]).map((d) => {
    const o = (typeof d === 'object' && d !== null && !Array.isArray(d) ? d : {}) as Record<string, unknown>;
    return '第' + week + '周周' + String(o.dayOfWeek ?? '?') + '·' + String(o.sessionLabel ?? (o.rest ? '休息' : '训练'));
  }) : ['（days 未给出：页上补填后再确认）'];
  return { op: 'set-week', title: '定第' + week + '周计划', before, after, note: '确认后该周先清后写' };
}

export function previewAddMovement(params: Record<string, unknown>, db: DatabaseSync): WritePreview {
  const week = needWeek(optInt(params, 'week'), 'week');
  const dow = needDow(optInt(params, 'dayOfWeek'), 'dayOfWeek');
  const movement = asMovement(params['movement']);
  const label = optStr(params, 'sessionLabel');
  const plan = getPlan(db);
  const daySessions = plan.sessions.filter((s) => s.week_number === week && s.day_of_week === dow);
  const before = daySessions.length === 0 ? ['第' + week + '周周' + dow + '目前是空的'] :
    daySessions.map((s) => sessText(s.week_number, s.day_of_week, s.session_label, (s.movements ?? []).length, s.is_rest_day === 1));
  if (label !== undefined && !daySessions.some((s) => s.session_label === label)) {
    fail(4, '第' + week + '周周' + dow + '没有时段「' + label + '」');
  }
  if (label === undefined && daySessions.length > 1) {
    fail(2, '第' + week + '周周' + dow + '有 ' + daySessions.length + ' 个时段，给 sessionLabel 指定加到哪段');
  }
  const target = label !== undefined ? '「' + label + '」' : (daySessions.length === 0 ? '新时段' : '该时段');
  return {
    op: 'add-movement', title: '第' + week + '周周' + dow + target + '加动作「' + String(movement.name) + '」',
    before, after: [...before, '＋ ' + String(movement.name)],
    note: '确认后写入计划库',
  };
}

export function previewSetRest(params: Record<string, unknown>, db: DatabaseSync): WritePreview {
  const rest = typeof params['rest'] === 'boolean' ? (params['rest'] as boolean) : true;
  let week = optInt(params, 'week');
  let dow = optInt(params, 'dayOfWeek');
  if (optStr(params, 'date') !== undefined) {
    const date = dayField(params, 'date');
    if (!date) fail(2, 'date 非法');
    const plan0 = getPlan(db);
    const start = plan0.config?.start_date ?? null;
    if (!start) fail(2, '计划缺开始日期，无法定位周次');
    assertISO(date as string, 'date');
    const w = weekOfDate(start, date as string);
    week = w.week;
    dow = w.dow;
  }
  const wn = needWeek(week, 'week（或 date）');
  const dn = needDow(dow, 'dayOfWeek（或 date）');
  const plan = getPlan(db);
  const daySessions = plan.sessions.filter((s) => s.week_number === wn && s.day_of_week === dn);
  const before = daySessions.length === 0 ? ['第' + wn + '周周' + dn + '目前是空的'] :
    daySessions.map((s) => sessText(s.week_number, s.day_of_week, s.session_label, (s.movements ?? []).length, s.is_rest_day === 1));
  const after = daySessions.length === 0 ? ['新增休息标记（' + (rest ? '休' : '训') + '）'] :
    daySessions.map((s) => sessText(s.week_number, s.day_of_week, s.session_label, (s.movements ?? []).length, rest));
  return {
    op: 'set-rest', title: (rest ? '定' : '取消') + '第' + wn + '周周' + dn + '休息标记',
    before, after, note: '确认后写入计划库',
  };
}

const PREVIEW_BY_OP: Record<string, (params: Record<string, unknown>, db: DatabaseSync) => WritePreview> = {
  copy: previewCopy,
  'set-week': previewSetWeek,
  'add-movement': previewAddMovement,
  'set-rest': previewSetRest,
};

/** 预览分发（`view.plan-write-preview` 经它走；未知 op 即 exit 2）。 */
export function previewWrite(params: Record<string, unknown>, db: DatabaseSync): WritePreview {
  const op = optStr(params, 'op');
  const fn = (op !== undefined ? PREVIEW_BY_OP[op] : undefined);
  if (!fn) fail(2, '缺参数 op（copy／set-week／add-movement／set-rest 四选一）');
  return (fn as (params: Record<string, unknown>, db: DatabaseSync) => WritePreview)(params, db);
}
/** `calorie.workout.plan-set-rest` · 定休息日（date 与 week＋dayOfWeek 二选一；缺省标休息）。 */
export function writePlanSetRest(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const rest = typeof params['rest'] === 'boolean' ? (params['rest'] as boolean) : true;
  let week = optInt(params, 'week');
  let dow = optInt(params, 'dayOfWeek');
  const dateRaw = optStr(params, 'date');
  if (dateRaw !== undefined) {
    const date = dayField(params, 'date');
    if (!date) fail(2, 'date 非法');
    const plan = getPlan(db);
    const start = plan.config?.start_date ?? null;
    if (!start) fail(2, '计划缺开始日期，无法定位周次');
    assertISO(date as string, 'date');
    const w = weekOfDate(start, date as string);
    week = w.week;
    dow = w.dow;
  }
  const wn = needWeek(week, 'week（或 date）');
  const dn = needDow(dow, 'dayOfWeek（或 date）');
  const plan = getPlan(db);
  const daySessions = plan.sessions.filter((s) => s.week_number === wn && s.day_of_week === dn);
  if (daySessions.length === 0) {
    addSession(db, { weekNumber: wn, dayOfWeek: dn, sessionLabel: '休息', isRestDay: rest, movements: [] });
  } else {
    for (const s of daySessions) updateSession(db, wn, dn, s.session_index, { isRestDay: rest });
  }
  const summary = rest
    ? '已定第' + wn + '周周' + dn + '为休息日（' + daySessions.length + ' 段）'
    : '已取消第' + wn + '周周' + dn + '的休息标记（' + daySessions.length + ' 段）';
  return out(R('定休息日', daySessions.length === 0 ? 'create' : 'update', summary, '定休息日', 'workout_plans（休息标记）', {
    recordId: null, ids: [], idSource: 'condition', writtenFields: provided(params, ['date', 'week', 'dayOfWeek', 'rest']),
    items: [{ status: '成功', reason: '', detail: summary }],
  }));
}
