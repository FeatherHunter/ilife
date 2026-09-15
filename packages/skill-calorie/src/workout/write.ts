/** 训练计划写命令（HELP 场景 05「健身计划」下一级「定训练计划／改训练计划」）：创建类 5 个＋变更类 5 个写处理函数。
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
  deleteDay,
  deletePlan,
  deleteSession,
  getPlan,
  updateConfig,
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
    if (!plan.sessions.some((s) => s.week_number === from)) fail(4, '第' + from + '周没有训练场次可复制');
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
    if (hit.length === 0) fail(4, dayPhrase(week, dow) + '没有时段「' + label + '」');
    const s = hit[0] as (typeof daySessions)[number];
    updateSession(db, week, dow, s.session_index, { movements: [...(s.movements ?? []), movement] });
    const summary = '已在' + dayPhrase(week, dow) + '「' + label + '」加动作「' + String(movement.name) + '」';
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
    fail(2, dayPhrase(week, dow) + '有 ' + daySessions.length + ' 个时段，给 sessionLabel 指定加到哪段');
  }
  const summary = '已在' + dayPhrase(week, dow) + '加动作「' + String(movement.name) + '」';
  return out(R('加训练动作', daySessions.length === 0 ? 'create' : 'update', summary, '加训练动作', 'workout_plans（加动作）', {
    recordId: null, ids: [], idSource: 'condition', writtenFields: provided(params, ['week', 'dayOfWeek', 'movement']),
    items: [{ status: '成功', reason: '', detail: summary }],
  }));
}

/** 过程页预览（读，不写库）：与上面写实现**同一套定位规则**（同文件，防两处推演走散）。
 * 返回 { op, title, before, after, note }，由 `plan.ts` 的 `viewPlanWritePreview` 经
 * `render/html.ts` 的 `renderPlanWritePreviewHtml` 出页。定位歧义时与写实现报同样的错。 */
/** 「第 1 周 周三」的写法：T351-v12 起住共用件 `./dayPhrase.ts`（校验器也要用同一句），
 *  本件按原样转出，既有调用方与判据不受影响。 */
export { dayPhrase } from './dayPhrase.js';
import { dayPhrase } from './dayPhrase.js';

/** 写前预览里的**一行**：字段就是表里的列，不再把四件事挤成一个字符串。
 *  原来那一行是 `第1周周1·上肢（2动作）`／`第1周周2·休息日（0动作·休）`——拿 `·` 与括号顶替表格设计
 *  （负责人 2026-09-15 第 5 条），页上读起来是一串密码。现在拆成 周次｜星期｜训练｜动作数 四列。
 *  `week`／`dow` 为 `null` ＝ 这一行不是「哪一场」，而是一句概述或提示（`label` 就是那句话）。 */
export interface PreviewLine {
  readonly week: number | null;
  readonly dow: number | null;
  readonly label: string;
  readonly moves: number | null;
  readonly rest: boolean;
  /** 改后栏的「这一行怎么变」（空串＝没变）。原来是把变更句拼在场次行尾巴上。 */
  readonly change: string;
}

export interface WritePreview {
  op: string;
  title: string;
  before: PreviewLine[];
  after: PreviewLine[];
  note: string;
}

/** 场次行（改前／改后两栏共用）。 */
function sessLine(wn: number, dow: number, label: string, moveCount: number | null, rest: boolean): PreviewLine {
  return { week: wn, dow, label: label === '' ? (rest ? '休息日' : '训练') : label, moves: moveCount, rest, change: '' };
}

/** 概述行／提示行：没有周次与星期，整句写进 `label`（其余列在页上印「—」）。 */
function noteLine(text: string): PreviewLine {
  return { week: null, dow: null, label: text, moves: null, rest: false, change: '' };
}

/** 场次行 ＋ 一句变更说明（改后栏用）。 */
function withChange(line: PreviewLine, change: string): PreviewLine {
  return { ...line, change };
}

/** 改某一场时各字段的界面写法。原来是把参数名与 JSON 直接印在页上（`rest → true`／`newLabel → "上肢"`），
 *  那既是英文裸词也是一串机器话。 */
const CHANGE_LABEL: Record<string, string> = {
  newLabel: '时段名', timeStart: '开始时间', timeEnd: '结束时间', rest: '作息', movements: '动作清单',
};

function changeText(key: string, value: unknown): string {
  const name = CHANGE_LABEL[key] ?? key;
  if (typeof value === 'boolean') return name + (value ? '设为休息' : '取消休息');
  if (Array.isArray(value)) return name + '整段替换（' + value.length + ' 条）';
  return name + '改成「' + String(value) + '」';
}

export function previewCopy(params: Record<string, unknown>, db: DatabaseSync): WritePreview {
  const week = optInt(params, 'week');
  const plan = getPlan(db);
  if (week !== undefined) {
    const from = needWeek(week, 'week');
    const src = plan.sessions.filter((s) => s.week_number === from);
    if (src.length === 0) fail(4, '第' + from + '周没有训练场次可复制');
    const maxWn = plan.sessions.reduce((n, s) => Math.max(n, s.week_number), 0);
    const to = optInt(params, 'toWeek') === undefined ? maxWn + 1 : needWeek(optInt(params, 'toWeek'), 'toWeek');
    const before = src.map((s) => sessLine(s.week_number, s.day_of_week, s.session_label, (s.movements ?? []).length, s.is_rest_day === 1));
    return {
      op: 'copy', title: '复制第' + from + '周 → 第' + to + '周', before,
      after: before.map((b) => ({ ...b, week: to, change: '第 ' + to + ' 周' })),
      note: '确认后复制 ' + src.length + ' 场；目标周已有内容将被覆盖',
    };
  }
  const title = optStr(params, 'newTitle') ?? ((plan.config?.title ?? '健身计划') + ' 副本');
  const n = plan.sessions.length;
  if (n === 0) fail(4, '无训练计划可复制（先定训练计划）');
  return {
    op: 'copy', title: '复制整份计划为「' + title + '」',
    before: [noteLine('「' + String(plan.config?.title ?? '未命名') + '」共 ' + n + ' 场')],
    after: [noteLine('「' + title + '」共 ' + n + ' 场（整份替换当前计划）')],
    note: '确认后整份替换，旧计划不再保留',
  };
}

export function previewSetWeek(params: Record<string, unknown>, db: DatabaseSync): WritePreview {
  const week = needWeek(optInt(params, 'week'), 'week');
  const plan = getPlan(db);
  const cur = plan.sessions.filter((s) => s.week_number === week);
  const before = cur.length === 0 ? [noteLine('第 ' + week + ' 周目前是空的')] :
    cur.map((s) => sessLine(s.week_number, s.day_of_week, s.session_label, (s.movements ?? []).length, s.is_rest_day === 1));
  const daysRaw = params['days'];
  const after = Array.isArray(daysRaw) ? (daysRaw as unknown[]).map((d) => {
    const o = (typeof d === 'object' && d !== null && !Array.isArray(d) ? d : {}) as Record<string, unknown>;
    const dn = typeof o.dayOfWeek === 'number' ? o.dayOfWeek : null;
    const rest = o.rest === true;
    return sessLine(week, dn ?? 0, String(o.sessionLabel ?? (rest ? '休息' : '训练')), null, rest);
  }) : [noteLine('这一页还没填要定哪几天，补上后再确认')];
  return { op: 'set-week', title: '定第 ' + week + ' 周的计划', before, after, note: '确认后该周先清后写' };
}

export function previewAddMovement(params: Record<string, unknown>, db: DatabaseSync): WritePreview {
  const week = needWeek(optInt(params, 'week'), 'week');
  const dow = needDow(optInt(params, 'dayOfWeek'), 'dayOfWeek');
  const movement = asMovement(params['movement']);
  const label = optStr(params, 'sessionLabel');
  const plan = getPlan(db);
  const daySessions = plan.sessions.filter((s) => s.week_number === week && s.day_of_week === dow);
  const before = daySessions.length === 0 ? [noteLine(dayPhrase(week, dow) + ' 目前是空的')] :
    daySessions.map((s) => sessLine(s.week_number, s.day_of_week, s.session_label, (s.movements ?? []).length, s.is_rest_day === 1));
  if (label !== undefined && !daySessions.some((s) => s.session_label === label)) {
    fail(4, dayPhrase(week, dow) + '没有时段「' + label + '」');
  }
  if (label === undefined && daySessions.length > 1) {
    fail(2, dayPhrase(week, dow) + '有 ' + daySessions.length + ' 个时段，给 sessionLabel 指定加到哪段');
  }
  const target = label !== undefined ? '「' + label + '」' : (daySessions.length === 0 ? '新时段' : '该时段');
  return {
    op: 'add-movement', title: dayPhrase(week, dow) + target + '加动作「' + String(movement.name) + '」',
    before, after: [...before, sessLine(week, dow, String(movement.name), 1, false)],
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
  const before = daySessions.length === 0 ? [noteLine(dayPhrase(wn, dn) + ' 目前是空的')] :
    daySessions.map((s) => sessLine(s.week_number, s.day_of_week, s.session_label, (s.movements ?? []).length, s.is_rest_day === 1));
  const after = daySessions.length === 0 ? [noteLine('新增休息标记（' + (rest ? '休' : '训') + '）')] :
    daySessions.map((s) => withChange(sessLine(s.week_number, s.day_of_week, s.session_label, (s.movements ?? []).length, rest), rest ? '设为休息日' : '取消休息日'));
  return {
    op: 'set-rest', title: (rest ? '定' : '取消') + dayPhrase(wn, dn) + '休息标记',
    before, after, note: '确认后写入计划库',
  };
}

const PREVIEW_BY_OP: Record<string, (params: Record<string, unknown>, db: DatabaseSync) => WritePreview> = {
  copy: previewCopy,
  'set-week': previewSetWeek,
  'add-movement': previewAddMovement,
  'set-rest': previewSetRest,
  update: previewUpdate,
  'update-day': previewUpdateDay,
  'delete-day': previewDeleteDay,
  'update-movement': previewUpdateMovement,
  delete: previewDelete,
};

/** 预览分发（`view.plan-write-preview` 经它走；未知 op 即 exit 2）。 */
export function previewWrite(params: Record<string, unknown>, db: DatabaseSync): WritePreview {
  const op = optStr(params, 'op');
  const fn = (op !== undefined ? PREVIEW_BY_OP[op] : undefined);
  if (!fn) fail(2, '缺参数 op（copy／set-week／add-movement／set-rest／update／update-day／delete-day／update-movement／delete 九选一）');
  return (fn as (params: Record<string, unknown>, db: DatabaseSync) => WritePreview)(params, db);
}

export function previewUpdate(params: Record<string, unknown>, db: DatabaseSync): WritePreview {
  const plan = getPlan(db);
  if (!plan.config) fail(4, '无训练计划可改（先定训练计划）');
  const keys = Object.keys(CONFIG_LABEL).filter((k) => optStr(params, k) !== undefined);
  if (keys.length === 0) fail(2, '缺参数（title／version／description／start_date 至少给一个）');
  const cur: Record<string, unknown> = {
    title: plan.config.title, version: plan.config.version,
    description: plan.config.description, start_date: plan.config.start_date,
  };
  const before = keys.map((k) => noteLine(String(CONFIG_LABEL[k]) + '：' + String(cur[k] ?? '（空）')));
  const after = keys.map((k) => noteLine(String(CONFIG_LABEL[k]) + '：' + String(optStr(params, k))));
  return { op: 'update', title: '改训练计划配置', before, after, note: '确认后写入计划库' };
}

export function previewUpdateDay(params: Record<string, unknown>, db: DatabaseSync): WritePreview {
  const { wn, dn } = resolveDayTarget(params, db);
  const plan = getPlan(db);
  const daySessions = plan.sessions.filter((s) => s.week_number === wn && s.day_of_week === dn);
  if (daySessions.length === 0) fail(4, dayPhrase(wn, dn) + '没有训练可改');
  const before = daySessions.map((s) => sessLine(s.week_number, s.day_of_week, s.session_label, (s.movements ?? []).length, s.is_rest_day === 1));
  const changes: string[] = [];
  for (const k of ['newLabel', 'timeStart', 'timeEnd', 'rest', 'movements']) {
    if (params[k] !== undefined) changes.push(changeText(k, params[k]));
  }
  const after = changes.length === 0
    ? [noteLine('这一页还没填要改什么，补上后再确认')]
    : before.map((b) => withChange(b, changes.join('；')));
  return { op: 'update-day', title: '改' + dayPhrase(wn, dn) + '训练', before, after, note: '确认后写入计划库' };
}

export function previewDeleteDay(params: Record<string, unknown>, db: DatabaseSync): WritePreview {
  const { wn, dn } = resolveDayTarget(params, db);
  const si = optInt(params, 'sessionIndex');
  const plan = getPlan(db);
  const daySessions = plan.sessions.filter((s) => s.week_number === wn && s.day_of_week === dn);
  if (daySessions.length === 0) fail(4, dayPhrase(wn, dn) + '没有训练可删');
  const before = daySessions.map((s) => sessLine(s.week_number, s.day_of_week, s.session_label, (s.movements ?? []).length, s.is_rest_day === 1));
  const after = si === undefined ? [noteLine(dayPhrase(wn, dn) + ' 整天删除（硬删除，不可恢复）')] :
    [noteLine(dayPhrase(wn, dn) + ' 第' + si + ' 段删除（硬删除，不可恢复），其余保留')];
  return { op: 'delete-day', title: '删' + dayPhrase(wn, dn) + '训练', before, after, note: '确认后删除，不可恢复' };
}

export function previewUpdateMovement(params: Record<string, unknown>, db: DatabaseSync): WritePreview {
  const oldName = optStr(params, 'oldMovement');
  if (!oldName) fail(2, '缺参数 oldMovement（原动作名）');
  const week = optInt(params, 'week');
  const plan = getPlan(db);
  const hits = plan.sessions.filter((s) => (week === undefined || s.week_number === week) &&
    (s.movements ?? []).some((m) => m.name === oldName));
  if (hits.length === 0) fail(4, '没有找到动作「' + String(oldName) + '」');
  const before = hits.map((s) => sessLine(s.week_number, s.day_of_week, s.session_label, (s.movements ?? []).length, s.is_rest_day === 1));
  const newName = typeof params['newMovement'] === 'object' && params['newMovement'] !== null
    ? String(((params['newMovement'] as Record<string, unknown>)['name'] ?? '（新动作未具名）')) : '（还没给新动作的名字）';
  return {
    op: 'update-movement', title: '把「' + String(oldName) + '」换成「' + newName + '」（' + hits.length + ' 段）',
    before, after: before.map((b) => withChange(b, '换成「' + newName + '」')), note: '确认后写入计划库',
  };
}

export function previewDelete(params: Record<string, unknown>, db: DatabaseSync): WritePreview {
  void params;
  const plan = getPlan(db);
  if (!plan.config && plan.sessions.length === 0) fail(4, '无训练计划可撤销');
  return {
    op: 'delete', title: '撤销整份训练计划',
    before: [noteLine('「' + String(plan.config?.title ?? '未命名') + '」共 ' + plan.sessions.length + ' 场')],
    after: [noteLine('配置与全部训练场次删除（硬删除，不可恢复）')],
    note: '确认后删除，删完需要重定计划',
  };
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
    ? '已定' + dayPhrase(wn, dn) + '为休息日（' + daySessions.length + ' 段）'
    : '已取消' + dayPhrase(wn, dn) + '的休息标记（' + daySessions.length + ' 段）';
  return out(R('定休息日', daySessions.length === 0 ? 'create' : 'update', summary, '定休息日', 'workout_plans（休息标记）', {
    recordId: null, ids: [], idSource: 'condition', writtenFields: provided(params, ['date', 'week', 'dayOfWeek', 'rest']),
    items: [{ status: '成功', reason: '', detail: summary }],
  }));
}

/* ------------------------------------------------ 变更类（#349） */

const CONFIG_LABEL: Record<string, string> = { title: '标题', version: '版本', description: '描述', start_date: '开始日期' };

/** `calorie.workout.plan-update` · 改训练计划（配置字段；总周数由行数决定，不直接改）。 */
export function writePlanUpdate(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  if (params['totalWeeks'] !== undefined || params['total_weeks'] !== undefined) {
    fail(2, '总周数由训练场次决定，不直接改（增删周用定一周计划／删某天训练）');
  }
  const fields: Partial<Record<'title' | 'version' | 'description' | 'start_date', string>> = {};
  for (const k of Object.keys(CONFIG_LABEL)) {
    const v = optStr(params, k);
    if (v !== undefined) {
      if (v === '') fail(2, k + ' 不得为空');
      (fields as Record<string, string>)[k] = v;
    }
  }
  if (Object.keys(fields).length === 0) fail(2, '缺参数（title／version／description／start_date 至少给一个）');
  const plan = getPlan(db);
  if (!plan.config) fail(4, '无训练计划可改（先定训练计划）');
  const before = (Object.keys(fields) as Array<keyof typeof fields>)
    .map((k) => String(CONFIG_LABEL[k]) + '：' + String(plan.config?.[k] ?? '（空）')).join('、');
  const ok = updateConfig(db, fields);
  if (!ok) fail(4, '改训练计划未命中行');
  const after = (Object.keys(fields) as Array<keyof typeof fields>)
    .map((k) => String(CONFIG_LABEL[k]) + '：' + String(fields[k])).join('、');
  const summary = '已改训练计划（' + after + '）';
  return out(R('改训练计划', 'update', summary, '改训练计划', 'workout_plan_config（配置字段）', {
    recordId: null, ids: [], idSource: 'condition', writtenFields: provided(params, ['title', 'version', 'description', 'start_date']),
    items: [{ status: '成功', reason: '', detail: '改前 ' + before + ' → 改后 ' + after }],
  }));
}

function resolveDayTarget(params: Record<string, unknown>, db: DatabaseSync): { wn: number; dn: number } {
  let week = optInt(params, 'week');
  let dow = optInt(params, 'dayOfWeek');
  if (optStr(params, 'date') !== undefined) {
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
  return { wn: needWeek(week, 'week（或 date）'), dn: needDow(dow, 'dayOfWeek（或 date）') };
}

/** `calorie.workout.plan-update-day` · 改某天训练（时段定位：sessionIndex／单段直改／多段必须点名）。 */
export function writePlanUpdateDay(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const { wn, dn } = resolveDayTarget(params, db);
  const plan = getPlan(db);
  const daySessions = plan.sessions.filter((s) => s.week_number === wn && s.day_of_week === dn);
  if (daySessions.length === 0) fail(4, dayPhrase(wn, dn) + '没有训练可改');
  const si = optInt(params, 'sessionIndex');
  let target = daySessions;
  if (si !== undefined) {
    target = daySessions.filter((s) => s.session_index === si);
    if (target.length === 0) fail(4, dayPhrase(wn, dn) + '没有第' + si + '段');
  } else if (daySessions.length > 1 && optStr(params, 'sessionLabel') === undefined) {
    fail(2, dayPhrase(wn, dn) + '有 ' + daySessions.length + ' 段，给 sessionIndex 或 sessionLabel 指定改哪段');
  } else if (optStr(params, 'sessionLabel') !== undefined) {
    target = daySessions.filter((s) => s.session_label === optStr(params, 'sessionLabel'));
    if (target.length === 0) fail(4, dayPhrase(wn, dn) + '没有时段「' + String(optStr(params, 'sessionLabel')) + '」');
  }
  const patch: { sessionLabel?: string; timeStart?: string | null; timeEnd?: string | null; isRestDay?: boolean; movements?: PlanMovement[] } = {};
  const label = optStr(params, 'sessionLabel');
  // sessionLabel 既做定位又做改名：定位命中后若同时给 newLabel 则改名，否则只定位
  const newLabel = optStr(params, 'newLabel');
  if (newLabel !== undefined) {
    if (newLabel === '') fail(2, 'newLabel 不得为空');
    patch.sessionLabel = newLabel;
  } else if (label !== undefined && si === undefined && daySessions.length === 1) {
    patch.sessionLabel = label;
  }
  if (optStr(params, 'timeStart') !== undefined) patch.timeStart = optStr(params, 'timeStart') ?? null;
  if (optStr(params, 'timeEnd') !== undefined) patch.timeEnd = optStr(params, 'timeEnd') ?? null;
  if (typeof params['rest'] === 'boolean') patch.isRestDay = params['rest'] as boolean;
  if (params['movements'] !== undefined) {
    if (!Array.isArray(params['movements'])) fail(2, 'movements 须为数组（整段替换）');
    patch.movements = (params['movements'] as unknown[]).map(asMovement);
  }
  if (Object.keys(patch).length === 0) fail(2, '缺参数（newLabel／timeStart／timeEnd／rest／movements 至少给一个）');
  let n = 0;
  for (const s of target) {
    if (updateSession(db, wn, dn, s.session_index, patch)) n += 1;
  }
  if (n === 0) fail(4, '改某天训练未命中行');
  const summary = '已改' + dayPhrase(wn, dn) + '训练（' + n + ' 段）';
  return out(R('改某天训练', 'update', summary, '改某天训练', 'workout_plans（某天时段）', {
    recordId: null, ids: [], idSource: 'condition', writtenFields: provided(params, ['date', 'week', 'dayOfWeek', 'sessionIndex', 'sessionLabel', 'newLabel', 'timeStart', 'timeEnd', 'rest', 'movements']),
    items: [{ status: '成功', reason: '', detail: summary }],
  }));
}

/** `calorie.workout.plan-delete-day` · 删某天训练（硬删除，不可恢复；过程页先给快照）。 */
export function writePlanDeleteDay(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const { wn, dn } = resolveDayTarget(params, db);
  const si = optInt(params, 'sessionIndex');
  const plan = getPlan(db);
  const daySessions = plan.sessions.filter((s) => s.week_number === wn && s.day_of_week === dn);
  if (daySessions.length === 0) fail(4, dayPhrase(wn, dn) + '没有训练可删');
  const snapshot = daySessions.map((s) => s.session_label || '训练').join('、');
  if (si !== undefined) {
    const hit = daySessions.filter((s) => s.session_index === si);
    if (hit.length === 0) fail(4, dayPhrase(wn, dn) + '没有第' + si + '段');
    deleteSession(db, wn, dn, si);
    const summary = '已删' + dayPhrase(wn, dn) + '第' + si + '段（硬删除，不可恢复）';
    return out(R('删某天训练', 'delete', summary, '删某天训练', 'workout_plans（删时段）', {
      recordId: null, ids: [], idSource: 'condition', writtenFields: provided(params, ['date', 'week', 'dayOfWeek', 'sessionIndex']),
      items: [{ status: '已删除（硬，不可恢复）', reason: '', detail: '快照：' + snapshot + ' → ' + summary }],
    }));
  }
  const r = deleteDay(db, wn, dn);
  const summary = '已删' + dayPhrase(wn, dn) + '训练（' + r.deletedSessions + ' 段，硬删除，不可恢复）';
  return out(R('删某天训练', 'delete', summary, '删某天训练', 'workout_plans（删整天）', {
    recordId: null, ids: [], idSource: 'condition', writtenFields: provided(params, ['date', 'week', 'dayOfWeek']),
    items: [{ status: '已删除（硬，不可恢复）', reason: '', detail: '快照：' + snapshot + ' → ' + summary }],
  }));
}

/** `calorie.workout.plan-update-movement` · 改动作（按名替换；week 缺省＝所有周）。 */
export function writePlanUpdateMovement(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const oldName = optStr(params, 'oldMovement');
  if (!oldName) fail(2, '缺参数 oldMovement（原动作名）');
  const newMove = asMovement(params['newMovement']);
  const week = optInt(params, 'week');
  if (week !== undefined) needWeek(week, 'week');
  const plan = getPlan(db);
  const cands = plan.sessions.filter((s) => week === undefined || s.week_number === week);
  let n = 0;
  const where: string[] = [];
  for (const s of cands) {
    const moves = s.movements ?? [];
    if (!moves.some((m) => m.name === oldName)) continue;
    const next = moves.map((m) => (m.name === oldName ? { ...m, ...newMove } : m));
    if (updateSession(db, s.week_number, s.day_of_week, s.session_index, { movements: next })) {
      n += 1;
      where.push(dayPhrase(s.week_number, s.day_of_week));
    }
  }
  if (n === 0) fail(4, '没有找到动作「' + String(oldName) + '」' + (week === undefined ? '' : '（第' + week + '周）'));
  const summary = '已把「' + String(oldName) + '」换成「' + String(newMove.name) + '」（' + n + ' 段：' + where.slice(0, 4).join('、') + (where.length > 4 ? '…' : '') + '）';
  return out(R('改动作', 'update', summary, '改动作', 'workout_plans（动作替换）', {
    recordId: null, ids: [], idSource: 'condition', writtenFields: provided(params, ['week', 'oldMovement', 'newMovement']),
    items: [{ status: '成功', reason: '', detail: summary }],
  }));
}

/** `calorie.workout.plan-delete` · 撤销训练计划（整份硬删除，不可恢复；须带 confirm:true，
 * 该确认只能来自写前预览页——裸调一律 exit 2，防一次误调清空整份计划）。 */
export function writePlanDelete(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  if (params['confirm'] !== true) fail(2, '撤销整份计划须确认：先走写前预览（op=delete），确认后带 confirm:true 再调');
  const plan = getPlan(db);
  if (!plan.config && plan.sessions.length === 0) fail(4, '无训练计划可撤销');
  const r = deletePlan(db);
  const summary = '已撤销训练计划「' + String(r.planSummary.title ?? '未命名') + '」（配置＋' + r.deletedRows + ' 场，硬删除，不可恢复）';
  return out(R('撤销训练计划', 'delete', summary, '撤销训练计划', 'workout_plan_config＋workout_plans（整份删除）', {
    recordId: null, ids: [], idSource: 'condition', writtenFields: ['confirm'],
    items: [{ status: '已删除（硬，不可恢复）', reason: '', detail: summary }],
  }));
}
