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
  startDateInvalid,
  updateConfig,
  updateSession,
  writePlan,
} from './planStore.js';
import type { PlanInput, PlanMovement } from './planStore.js';

function needWeek(v: number | undefined, field: string): number {
  if (v === undefined || !Number.isInteger(v) || (v as number) < 1) fail(2, m('skill-calorie.workout-write.c001', { p0: String(field) }));
  return v as number;
}

function needDow(v: number | undefined, field: string): number {
  if (v === undefined || !Number.isInteger(v) || (v as number) < 1 || (v as number) > 7) {
    fail(2, m('skill-calorie.workout-write.c002', { p0: String(field) }));
  }
  return v as number;
}

function asMovement(raw: unknown): PlanMovement {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) fail(2, m('skill-calorie.workout-write.c003'));
  const o = raw as Record<string, unknown>;
  if (typeof o.name !== 'string' || o.name === '') fail(2, m('skill-calorie.workout-write.c004'));
  const out: PlanMovement = { name: o.name };
  if (typeof o.part === 'string') out.part = o.part;
  if (typeof o.type === 'string') out.type = o.type;
  if (Array.isArray(o.sets)) out.sets = o.sets;
  return out;
}

/** `calorie.workout.plan-set` · 定训练计划（整份替换：先全量校验，有硬止即 exit 2 不写库）。 */
export function writePlanSet(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const plan = params['plan'];
  if (typeof plan !== 'object' || plan === null || Array.isArray(plan)) fail(2, m('skill-calorie.workout-write.c005'));
  const r = writePlan(db, plan as PlanInput);
  if (r.status === 'failed' || r.errors.length > 0) fail(2, m('skill-calorie.workout-write.c006', { p0: String(r.errors.slice(0, 5).join('；')) }));
  const summary = m('skill-calorie.workout-write.c007', {
    p0: String(String(r.totalWeeks ?? 0)),
    p1: String(String(r.insertedCount)),
  });
  return out(R(m('skill-calorie.workout-write.c008'), 'create', summary, m('skill-calorie.workout-write.c009'), m('skill-calorie.workout-write.c010'), {
    recordId: null, ids: [], idSource: 'condition', writtenFields: ['plan'],
    items: [{ status: m('skill-calorie.workout-write.c011'), reason: '', detail: summary }],
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
    if (maxWn === 0) fail(4, m('skill-calorie.workout-write.c012'));
    if (!plan.sessions.some((s) => s.week_number === from)) fail(4, m('skill-calorie.workout-write.c013', { p0: String(from) }));
    const to = toWeek === undefined ? maxWn + 1 : needWeek(toWeek, 'toWeek');
    const r = copyWeek(db, from, to);
    const summary = m('skill-calorie.workout-write.c014', { p0: String(from), p1: String(to), p2: String(r.copiedRows) });
    return out(R(m('skill-calorie.workout-write.c015'), 'create', summary, m('skill-calorie.workout-write.c016'), m('skill-calorie.workout-write.c017'), {
      recordId: null, ids: [], idSource: 'condition', writtenFields: provided(params, ['week', 'toWeek']),
      items: [{ status: m('skill-calorie.workout-write.c018'), reason: '', detail: summary }],
    }));
  }
  const r = copyPlan(db, newTitle ?? undefined);
  if (r.totalWeeks === 0) fail(4, m('skill-calorie.workout-write.c019'));
  const summary = m('skill-calorie.workout-write.c020', { p0: String(String(r.newTitle)), p1: String(r.copiedRows) });
  return out(R(m('skill-calorie.workout-write.c021'), 'create', summary, m('skill-calorie.workout-write.c022'), m('skill-calorie.workout-write.c023'), {
    recordId: null, ids: [], idSource: 'condition', writtenFields: provided(params, ['newTitle']),
    items: [{ status: m('skill-calorie.workout-write.c024'), reason: '', detail: summary }],
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
  if (!Array.isArray(daysRaw) || daysRaw.length === 0) fail(2, m('skill-calorie.workout-write.c025'));
  const days: SetWeekDay[] = (daysRaw as unknown[]).map((d) => {
    if (typeof d !== 'object' || d === null || Array.isArray(d)) fail(2, m('skill-calorie.workout-write.c026'));
    const o = d as Record<string, unknown>;
    const day: SetWeekDay = { dayOfWeek: needDow(o.dayOfWeek as number | undefined, 'days[].dayOfWeek') };
    if (typeof o.sessionLabel === 'string') day.sessionLabel = o.sessionLabel;
    if (typeof o.rest === 'boolean') day.rest = o.rest;
    if (o.movements !== undefined) {
      if (!Array.isArray(o.movements)) fail(2, m('skill-calorie.workout-write.c027'));
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
        weekNumber: week, dayOfWeek: d.dayOfWeek, sessionLabel: d.sessionLabel ?? (d.rest ? '休息' : m('skill-calorie.workout-write.c028')),
        isRestDay: d.rest ?? false, movements: d.movements ?? [],
      });
      n += 1;
    }
    db.exec('COMMIT');
    const summary = m('skill-calorie.workout-write.c029', { p0: String(week), p1: String(n) });
    return out(R(m('skill-calorie.workout-write.c030'), 'create', summary, m('skill-calorie.workout-write.c031'), m('skill-calorie.workout-write.c032'), {
      recordId: null, ids: [], idSource: 'condition', writtenFields: provided(params, ['week', 'days']),
      items: [{ status: m('skill-calorie.workout-write.c033'), reason: '', detail: summary }],
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
    if (hit.length === 0) fail(4, m('skill-calorie.workout-write.c034', { p0: String(dayPhrase(week, dow)), p1: String(label) }));
    const s = hit[0] as (typeof daySessions)[number];
    updateSession(db, week, dow, s.session_index, { movements: [...(s.movements ?? []), movement] });
    const summary = m('skill-calorie.workout-write.c035', {
      p0: String(dayPhrase(week, dow)),
      p1: String(label),
      p2: String(String(movement.name)),
    });
    return out(R(m('skill-calorie.workout-write.c036'), 'update', summary, m('skill-calorie.workout-write.c037'), m('skill-calorie.workout-write.c038'), {
      recordId: null, ids: [], idSource: 'condition', writtenFields: provided(params, ['week', 'dayOfWeek', 'sessionLabel', 'movement']),
      items: [{ status: m('skill-calorie.workout-write.c039'), reason: '', detail: summary }],
    }));
  }
  if (daySessions.length === 0) {
    addSession(db, { weekNumber: week, dayOfWeek: dow, sessionLabel: m('skill-calorie.workout-write.c040'), movements: [movement] });
  } else if (daySessions.length === 1) {
    const s = daySessions[0] as (typeof daySessions)[number];
    updateSession(db, week, dow, s.session_index, { movements: [...(s.movements ?? []), movement] });
  } else {
    fail(2, m('skill-calorie.workout-write.c041', {
      p0: String(dayPhrase(week, dow)),
      p1: String(daySessions.length),
    }));
  }
  const summary = m('skill-calorie.workout-write.c042', {
    p0: String(dayPhrase(week, dow)),
    p1: String(String(movement.name)),
  });
  return out(R(m('skill-calorie.workout-write.c043'), daySessions.length === 0 ? 'create' : 'update', summary, m('skill-calorie.workout-write.c044'), m('skill-calorie.workout-write.c045'), {
    recordId: null, ids: [], idSource: 'condition', writtenFields: provided(params, ['week', 'dayOfWeek', 'movement']),
    items: [{ status: m('skill-calorie.workout-write.c046'), reason: '', detail: summary }],
  }));
}

/** 过程页预览（读，不写库）：与上面写实现**同一套定位规则**（同文件，防两处推演走散）。
 * 返回 { op, title, before, after, note }，由 `plan.ts` 的 `viewPlanWritePreview` 经
 * `render/html.ts` 的 `renderPlanWritePreviewHtml` 出页。定位歧义时与写实现报同样的错。 */
/** 「第 1 周 周三」的写法：T351-v12 起住共用件 `./dayPhrase.ts`（校验器也要用同一句），
 *  本件按原样转出，既有调用方与判据不受影响。 */
export { dayPhrase } from './dayPhrase.js';
import { dayPhrase } from './dayPhrase.js';
import { m } from '../entries/index.js';

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
  return { week: wn, dow, label: label === '' ? (rest ? '休息日' : m('skill-calorie.workout-write.c047')) : label, moves: moveCount, rest, change: '' };
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
const CHANGE_LABEL = (): Record<string, string> => ({
  newLabel: m('skill-calorie.workout-write.c188'), timeStart: m('skill-calorie.workout-write.c189'), timeEnd: m('skill-calorie.workout-write.c190'), rest: m('skill-calorie.workout-write.c191'), movements: m('skill-calorie.workout-write.c192'),
});

function changeText(key: string, value: unknown): string {
  const name = CHANGE_LABEL()[key] ?? key;
  if (typeof value === 'boolean') return name + (value ? m('skill-calorie.workout-write.c048') : m('skill-calorie.workout-write.c049'));
  if (Array.isArray(value)) return m('skill-calorie.workout-write.c050', { p0: String(name), p1: String(value.length) });
  return m('skill-calorie.workout-write.c051', { p0: String(name), p1: String(String(value)) });
}

export function previewCopy(params: Record<string, unknown>, db: DatabaseSync): WritePreview {
  const week = optInt(params, 'week');
  const plan = getPlan(db);
  if (week !== undefined) {
    const from = needWeek(week, 'week');
    const src = plan.sessions.filter((s) => s.week_number === from);
    if (src.length === 0) fail(4, m('skill-calorie.workout-write.c052', { p0: String(from) }));
    const maxWn = plan.sessions.reduce((n, s) => Math.max(n, s.week_number), 0);
    const to = optInt(params, 'toWeek') === undefined ? maxWn + 1 : needWeek(optInt(params, 'toWeek'), 'toWeek');
    const before = src.map((s) => sessLine(s.week_number, s.day_of_week, s.session_label, (s.movements ?? []).length, s.is_rest_day === 1));
    return {
      op: 'copy', title: m('skill-calorie.workout-write.c053', { p0: String(from), p1: String(to) }), before,
      after: before.map((b) => ({ ...b, week: to, change: m('skill-calorie.workout-write.c054', { p0: String(to) }) })),
      note: m('skill-calorie.workout-write.c055', { p0: String(src.length) }),
    };
  }
  const baseTitle = plan.config?.title ?? m('skill-calorie.workout-write.c056');
  const title = optStr(params, 'newTitle') ?? m('skill-calorie.workout-write.c057', { p0: String(baseTitle) });
  const n = plan.sessions.length;
  const srcTitle = String(plan.config?.title ?? m('skill-calorie.workout-write.c058'));
  if (n === 0) fail(4, m('skill-calorie.workout-write.c059'));
  return {
    op: 'copy', title: m('skill-calorie.workout-write.c060', { p0: String(title) }),
    before: [noteLine(m('skill-calorie.workout-write.c061', { p0: String(srcTitle), p1: String(n) }))],
    after: [noteLine(m('skill-calorie.workout-write.c062', { p0: String(title), p1: String(n) }))],
    note: m('skill-calorie.workout-write.c063'),
  };
}

export function previewSetWeek(params: Record<string, unknown>, db: DatabaseSync): WritePreview {
  const week = needWeek(optInt(params, 'week'), 'week');
  const plan = getPlan(db);
  const cur = plan.sessions.filter((s) => s.week_number === week);
  const before = cur.length === 0 ? [noteLine(m('skill-calorie.workout-write.c064', { p0: String(week) }))] :
    cur.map((s) => sessLine(s.week_number, s.day_of_week, s.session_label, (s.movements ?? []).length, s.is_rest_day === 1));
  const daysRaw = params['days'];
  const after = Array.isArray(daysRaw) ? (daysRaw as unknown[]).map((d) => {
    const o = (typeof d === 'object' && d !== null && !Array.isArray(d) ? d : {}) as Record<string, unknown>;
    const dn = typeof o.dayOfWeek === 'number' ? o.dayOfWeek : null;
    const rest = o.rest === true;
    return sessLine(week, dn ?? 0, String(o.sessionLabel ?? (rest ? '休息' : m('skill-calorie.workout-write.c065'))), null, rest);
  }) : [noteLine(m('skill-calorie.workout-write.c066'))];
  return { op: 'set-week', title: m('skill-calorie.workout-write.c067', { p0: String(week) }), before, after, note: m('skill-calorie.workout-write.c068') };
}

export function previewAddMovement(params: Record<string, unknown>, db: DatabaseSync): WritePreview {
  const week = needWeek(optInt(params, 'week'), 'week');
  const dow = needDow(optInt(params, 'dayOfWeek'), 'dayOfWeek');
  const movement = asMovement(params['movement']);
  const label = optStr(params, 'sessionLabel');
  const plan = getPlan(db);
  const daySessions = plan.sessions.filter((s) => s.week_number === week && s.day_of_week === dow);
  const before = daySessions.length === 0 ? [noteLine(m('skill-calorie.workout-write.c069', { p0: String(dayPhrase(week, dow)) }))] :
    daySessions.map((s) => sessLine(s.week_number, s.day_of_week, s.session_label, (s.movements ?? []).length, s.is_rest_day === 1));
  if (label !== undefined && !daySessions.some((s) => s.session_label === label)) {
    fail(4, m('skill-calorie.workout-write.c070', { p0: String(dayPhrase(week, dow)), p1: String(label) }));
  }
  if (label === undefined && daySessions.length > 1) {
    fail(2, m('skill-calorie.workout-write.c071', {
      p0: String(dayPhrase(week, dow)),
      p1: String(daySessions.length),
    }));
  }
  const target = label !== undefined ? '「' + label + '」' : (daySessions.length === 0 ? m('skill-calorie.workout-write.c072') : m('skill-calorie.workout-write.c073'));
  return {
    op: 'add-movement', title: m('skill-calorie.workout-write.c074', {
      p0: String(dayPhrase(week, dow) + target),
      p1: String(String(movement.name)),
    }),
    before, after: [...before, sessLine(week, dow, String(movement.name), 1, false)],
    note: m('skill-calorie.workout-write.c075'),
  };
}

export function previewSetRest(params: Record<string, unknown>, db: DatabaseSync): WritePreview {
  const rest = typeof params['rest'] === 'boolean' ? (params['rest'] as boolean) : true;
  let week = optInt(params, 'week');
  let dow = optInt(params, 'dayOfWeek');
  if (optStr(params, 'date') !== undefined) {
    const date = dayField(params, 'date');
    if (!date) fail(2, m('skill-calorie.workout-write.c076'));
    const plan0 = getPlan(db);
    const start = plan0.config?.start_date ?? null;
    if (!start) fail(2, m('skill-calorie.workout-write.c077'));
    assertISO(date as string, 'date');
    const w = weekOfDate(start, date as string);
    week = w.week;
    dow = w.dow;
  }
  const wn = needWeek(week, m('skill-calorie.workout-write.c078'));
  const dn = needDow(dow, m('skill-calorie.workout-write.c079'));
  const plan = getPlan(db);
  const daySessions = plan.sessions.filter((s) => s.week_number === wn && s.day_of_week === dn);
  const before = daySessions.length === 0 ? [noteLine(m('skill-calorie.workout-write.c080', { p0: String(dayPhrase(wn, dn)) }))] :
    daySessions.map((s) => sessLine(s.week_number, s.day_of_week, s.session_label, (s.movements ?? []).length, s.is_rest_day === 1));
  const restWord = rest ? m('skill-calorie.workout-write.c081') : m('skill-calorie.workout-write.c082');
  const after = daySessions.length === 0 ? [noteLine(m('skill-calorie.workout-write.c083', { p0: String(restWord) }))] :
    daySessions.map((s) => withChange(sessLine(s.week_number, s.day_of_week, s.session_label, (s.movements ?? []).length, rest), rest ? m('skill-calorie.workout-write.c084') : m('skill-calorie.workout-write.c085')));
  const restVerb = rest ? m('skill-calorie.workout-write.c086') : m('skill-calorie.workout-write.c087');
  return {
    op: 'set-rest', title: m('skill-calorie.workout-write.c088', { p0: String(restVerb + dayPhrase(wn, dn)) }),
    before, after, note: m('skill-calorie.workout-write.c089'),
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
  if (!fn) fail(2, m('skill-calorie.workout-write.c090'));
  return (fn as (params: Record<string, unknown>, db: DatabaseSync) => WritePreview)(params, db);
}

export function previewUpdate(params: Record<string, unknown>, db: DatabaseSync): WritePreview {
  const plan = getPlan(db);
  if (!plan.config) fail(4, m('skill-calorie.workout-write.c091'));
  const keys = Object.keys(CONFIG_LABEL()).filter((k) => optStr(params, k) !== undefined);
  if (keys.length === 0) fail(2, m('skill-calorie.workout-write.c092'));
  const cur: Record<string, unknown> = {
    title: plan.config.title, version: plan.config.version,
    description: plan.config.description, start_date: plan.config.start_date,
  };
  const before = keys.map((k) => noteLine(String(CONFIG_LABEL()[k]) + '：' + String(cur[k] ?? m('skill-calorie.workout-write.c093'))));
  const after = keys.map((k) => noteLine(String(CONFIG_LABEL()[k]) + '：' + String(optStr(params, k))));
  // 「影响」按**本次真改的字段**派生（`keys` 与上面改前／改后两栏同源、同顺序）：多字段同改就一条一句并排，
  // 没改 `start_date` 时不出现周次计算那一句。页面装配件只管把这句话印出来，一个字都不用改。
  const impact = keys.map((k) => CONFIG_IMPACT()[k] ?? '').filter((s) => s !== '').join('；');
  return { op: 'update', title: m('skill-calorie.workout-write.c094'), before, after, note: impact };
}

export function previewUpdateDay(params: Record<string, unknown>, db: DatabaseSync): WritePreview {
  const { wn, dn } = resolveDayTarget(params, db);
  const plan = getPlan(db);
  const daySessions = plan.sessions.filter((s) => s.week_number === wn && s.day_of_week === dn);
  if (daySessions.length === 0) fail(4, m('skill-calorie.workout-write.c095', { p0: String(dayPhrase(wn, dn)) }));
  const before = daySessions.map((s) => sessLine(s.week_number, s.day_of_week, s.session_label, (s.movements ?? []).length, s.is_rest_day === 1));
  const changes: string[] = [];
  for (const k of ['newLabel', 'timeStart', 'timeEnd', 'rest', 'movements']) {
    if (params[k] !== undefined) changes.push(changeText(k, params[k]));
  }
  const after = changes.length === 0
    ? [noteLine(m('skill-calorie.workout-write.c096'))]
    : before.map((b) => withChange(b, changes.join('；')));
  return { op: 'update-day', title: m('skill-calorie.workout-write.c097', { p0: String(dayPhrase(wn, dn)) }), before, after, note: m('skill-calorie.workout-write.c098') };
}

export function previewDeleteDay(params: Record<string, unknown>, db: DatabaseSync): WritePreview {
  const { wn, dn } = resolveDayTarget(params, db);
  const si = optInt(params, 'sessionIndex');
  const plan = getPlan(db);
  const daySessions = plan.sessions.filter((s) => s.week_number === wn && s.day_of_week === dn);
  if (daySessions.length === 0) fail(4, m('skill-calorie.workout-write.c099', { p0: String(dayPhrase(wn, dn)) }));
  const before = daySessions.map((s) => sessLine(s.week_number, s.day_of_week, s.session_label, (s.movements ?? []).length, s.is_rest_day === 1));
  const after = si === undefined ? [noteLine(m('skill-calorie.workout-write.c100', { p0: String(dayPhrase(wn, dn)) }))] :
    [noteLine(m('skill-calorie.workout-write.c101', { p0: String(dayPhrase(wn, dn)), p1: String(si) }))];
  return { op: 'delete-day', title: m('skill-calorie.workout-write.c102', { p0: String(dayPhrase(wn, dn)) }), before, after, note: m('skill-calorie.workout-write.c103') };
}

export function previewUpdateMovement(params: Record<string, unknown>, db: DatabaseSync): WritePreview {
  const oldName = optStr(params, 'oldMovement');
  if (!oldName) fail(2, m('skill-calorie.workout-write.c104'));
  const newName = typeof params['newMovement'] === 'object' && params['newMovement'] !== null
    ? String(((params['newMovement'] as Record<string, unknown>)['name'] ?? '')) : '';
  // T351-v12：原来名字缺了就换个「（新动作未具名）」的占位符照常出预览——**预览能出、写下去就是一条
  // 没有名字的动作**（真按下去等于把计划里的动作改成无名）。缺参数一律 exit 2 挡在写前，
  // 与上一行「缺参数 oldMovement」同口径。
  if (newName === '') fail(2, m('skill-calorie.workout-write.c105'));
  const week = optInt(params, 'week');
  const plan = getPlan(db);
  const hits = plan.sessions.filter((s) => (week === undefined || s.week_number === week) &&
    (s.movements ?? []).some((m) => m.name === oldName));
  if (hits.length === 0) fail(4, m('skill-calorie.workout-write.c106', { p0: String(String(oldName)) }));
  const before = hits.map((s) => sessLine(s.week_number, s.day_of_week, s.session_label, (s.movements ?? []).length, s.is_rest_day === 1));
  return {
    op: 'update-movement', title: m('skill-calorie.workout-write.c107', {
      p0: String(String(oldName)),
      p1: String(newName),
      p2: String(hits.length),
    }),
    before, after: before.map((b) => withChange(b, m('skill-calorie.workout-write.c108', { p0: String(newName) }))), note: m('skill-calorie.workout-write.c109'),
  };
}

export function previewDelete(params: Record<string, unknown>, db: DatabaseSync): WritePreview {
  void params;
  const plan = getPlan(db);
  if (!plan.config && plan.sessions.length === 0) fail(4, m('skill-calorie.workout-write.c110'));
  const planTitle = String(plan.config?.title ?? m('skill-calorie.workout-write.c111'));
  return {
    op: 'delete', title: m('skill-calorie.workout-write.c112'),
    before: [noteLine(m('skill-calorie.workout-write.c113', { p0: String(planTitle), p1: String(plan.sessions.length) }))],
    after: [noteLine(m('skill-calorie.workout-write.c114'))],
    note: m('skill-calorie.workout-write.c115'),
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
    if (!date) fail(2, m('skill-calorie.workout-write.c116'));
    const plan = getPlan(db);
    const start = plan.config?.start_date ?? null;
    if (!start) fail(2, m('skill-calorie.workout-write.c117'));
    assertISO(date as string, 'date');
    const w = weekOfDate(start, date as string);
    week = w.week;
    dow = w.dow;
  }
  const wn = needWeek(week, m('skill-calorie.workout-write.c118'));
  const dn = needDow(dow, m('skill-calorie.workout-write.c119'));
  const plan = getPlan(db);
  const daySessions = plan.sessions.filter((s) => s.week_number === wn && s.day_of_week === dn);
  if (daySessions.length === 0) {
    addSession(db, { weekNumber: wn, dayOfWeek: dn, sessionLabel: '休息', isRestDay: rest, movements: [] });
  } else {
    for (const s of daySessions) updateSession(db, wn, dn, s.session_index, { isRestDay: rest });
  }
  const summary = rest
    ? m('skill-calorie.workout-write.c120', { p0: String(dayPhrase(wn, dn)), p1: String(daySessions.length) })
    : m('skill-calorie.workout-write.c121', { p0: String(dayPhrase(wn, dn)), p1: String(daySessions.length) });
  return out(R(m('skill-calorie.workout-write.c122'), daySessions.length === 0 ? 'create' : 'update', summary, m('skill-calorie.workout-write.c123'), m('skill-calorie.workout-write.c124'), {
    recordId: null, ids: [], idSource: 'condition', writtenFields: provided(params, ['date', 'week', 'dayOfWeek', 'rest']),
    items: [{ status: m('skill-calorie.workout-write.c125'), reason: '', detail: summary }],
  }));
}

/* ------------------------------------------------ 变更类（#349） */

const CONFIG_LABEL = (): Record<string, string> => ({ title: m('skill-calorie.workout-write.c193'), version: m('skill-calorie.workout-write.c194'), description: m('skill-calorie.workout-write.c195'), start_date: m('skill-calorie.workout-write.c196') });

/** `start_date` 的日期体检（写路径这一侧，与同件三处日期位 `date` 同源）：
 *  ① **形状**走共用位 `shared/params.ts` 的 `assertISO`（唯一定义地，报 `start_date 非法（须 YYYY-MM-DD）`）；
 *  ② **这个串是不是一个日期**走 `planStore.ts` 的 `startDateInvalid`（本仓唯一一处，形状＋真日历）——
 *  形状那一半放行 `2026-13-45` 这种串，而它正是坏锚点本身；`2026-02-30` 同样非法（`#944` 边角一次收口，
 *  `Date.parse` 会进位，改用月天表＋闰年判）。
 *  两条都不过就 exit 2；既有那条「不得为空」在上面、一个字没动（本票只加严）。 */
function assertStartDate(v: string): void {
  assertISO(v, 'start_date');
  if (startDateInvalid(v)) fail(2, m('skill-calorie.workout-write.c126', { p0: String(v) }));
}

/** 四个配置字段各自**改下去的影响**（写前预览页「确认说明」块里「影响」那一格的正文）。
 *  与 `CONFIG_LABEL` 同一处定义、同一套字段名：改哪个字段就说哪个字段的影响，别处不再写第二份。
 *  话术取自报障单 #944（故障 7）里报障人的话——改计划配置向来只印一句与字段无关的
 *  「确认后写入计划库」，而「改训练计划」这条唤醒词要的正是「改完并提示影响（如改开始日期
 *  会影响周次计算）」（`src/triggers/scene-05-workout.ts` 的 `prompt_template` 原文）。 */
const CONFIG_IMPACT = (): Record<string, string> => ({
  title: m('skill-calorie.workout-write.c197'),
  version: m('skill-calorie.workout-write.c198'),
  description: m('skill-calorie.workout-write.c199'),
  start_date: m('skill-calorie.workout-write.c200'),
});

/** `calorie.workout.plan-update` · 改训练计划（配置字段；总周数由行数决定，不直接改）。 */
export function writePlanUpdate(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  if (params['totalWeeks'] !== undefined || params['total_weeks'] !== undefined) {
    fail(2, m('skill-calorie.workout-write.c127'));
  }
  const fields: Partial<Record<'title' | 'version' | 'description' | 'start_date', string>> = {};
  for (const k of Object.keys(CONFIG_LABEL())) {
    const v = optStr(params, k);
    if (v !== undefined) {
      if (v === '') fail(2, m('skill-calorie.workout-write.c128', { p0: String(k) }));
      // 四个字段里只有 `start_date` 是个日期位：它原来只挡空串，任何字符串都进 `updateConfig` 落库。
      // 坏锚点会让 `weekOfDate` 算出 NaN ⇒ 按日期过滤恒空 ⇒ 页上落成「这一周没有训练安排」那句空态——
      // 一个静默的坏锚点会伪装成「计划没有内容」。体检口径见 `assertStartDate`（同件三处日期位同源）。
      if (k === 'start_date') assertStartDate(v);
      (fields as Record<string, string>)[k] = v;
    }
  }
  if (Object.keys(fields).length === 0) fail(2, m('skill-calorie.workout-write.c129'));
  const plan = getPlan(db);
  if (!plan.config) fail(4, m('skill-calorie.workout-write.c130'));
  const before = (Object.keys(fields) as Array<keyof typeof fields>)
    .map((k) => String(CONFIG_LABEL()[k]) + '：' + String(plan.config?.[k] ?? m('skill-calorie.workout-write.c131'))).join('、');
  const ok = updateConfig(db, fields);
  if (!ok) fail(4, m('skill-calorie.workout-write.c132'));
  const after = (Object.keys(fields) as Array<keyof typeof fields>)
    .map((k) => String(CONFIG_LABEL()[k]) + '：' + String(fields[k])).join('、');
  const summary = m('skill-calorie.workout-write.c133', { p0: String(after) });
  // `#944` 边角一次收口：回执带上与预检页同源的影响话术（`CONFIG_IMPACT`，同一处定义），免得对账回头翻预检页。
  const impact = (Object.keys(fields) as Array<keyof ReturnType<typeof CONFIG_IMPACT>>)
    .map((k) => CONFIG_IMPACT()[k] ?? '').filter((s) => s !== '').join('；');
  return out(R(m('skill-calorie.workout-write.c134'), 'update', summary, m('skill-calorie.workout-write.c135'), m('skill-calorie.workout-write.c136'), {
    recordId: null, ids: [], idSource: 'condition', writtenFields: provided(params, ['title', 'version', 'description', 'start_date']),
    items: [{ status: m('skill-calorie.workout-write.c137'), reason: impact, detail: m('skill-calorie.workout-write.c138', { p0: String(before), p1: String(after) }) }],
  }));
}

function resolveDayTarget(params: Record<string, unknown>, db: DatabaseSync): { wn: number; dn: number } {
  let week = optInt(params, 'week');
  let dow = optInt(params, 'dayOfWeek');
  if (optStr(params, 'date') !== undefined) {
    const date = dayField(params, 'date');
    if (!date) fail(2, m('skill-calorie.workout-write.c139'));
    const plan = getPlan(db);
    const start = plan.config?.start_date ?? null;
    if (!start) fail(2, m('skill-calorie.workout-write.c140'));
    assertISO(date as string, 'date');
    const w = weekOfDate(start, date as string);
    week = w.week;
    dow = w.dow;
  }
  return { wn: needWeek(week, m('skill-calorie.workout-write.c141')), dn: needDow(dow, m('skill-calorie.workout-write.c142')) };
}

/** `calorie.workout.plan-update-day` · 改某天训练（时段定位：sessionIndex／单段直改／多段必须点名）。 */
export function writePlanUpdateDay(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const { wn, dn } = resolveDayTarget(params, db);
  const plan = getPlan(db);
  const daySessions = plan.sessions.filter((s) => s.week_number === wn && s.day_of_week === dn);
  if (daySessions.length === 0) fail(4, m('skill-calorie.workout-write.c143', { p0: String(dayPhrase(wn, dn)) }));
  const si = optInt(params, 'sessionIndex');
  let target = daySessions;
  if (si !== undefined) {
    target = daySessions.filter((s) => s.session_index === si);
    if (target.length === 0) fail(4, m('skill-calorie.workout-write.c144', { p0: String(dayPhrase(wn, dn)), p1: String(si) }));
  } else if (daySessions.length > 1 && optStr(params, 'sessionLabel') === undefined) {
    fail(2, m('skill-calorie.workout-write.c145', { p0: String(dayPhrase(wn, dn)), p1: String(daySessions.length) }));
  } else if (optStr(params, 'sessionLabel') !== undefined) {
    target = daySessions.filter((s) => s.session_label === optStr(params, 'sessionLabel'));
    if (target.length === 0) fail(4, m('skill-calorie.workout-write.c146', {
      p0: String(dayPhrase(wn, dn)),
      p1: String(String(optStr(params, 'sessionLabel'))),
    }));
  }
  const patch: { sessionLabel?: string; timeStart?: string | null; timeEnd?: string | null; isRestDay?: boolean; movements?: PlanMovement[] } = {};
  const label = optStr(params, 'sessionLabel');
  // sessionLabel 既做定位又做改名：定位命中后若同时给 newLabel 则改名，否则只定位
  const newLabel = optStr(params, 'newLabel');
  if (newLabel !== undefined) {
    if (newLabel === '') fail(2, m('skill-calorie.workout-write.c147'));
    patch.sessionLabel = newLabel;
  } else if (label !== undefined && si === undefined && daySessions.length === 1) {
    patch.sessionLabel = label;
  }
  if (optStr(params, 'timeStart') !== undefined) patch.timeStart = optStr(params, 'timeStart') ?? null;
  if (optStr(params, 'timeEnd') !== undefined) patch.timeEnd = optStr(params, 'timeEnd') ?? null;
  if (typeof params['rest'] === 'boolean') patch.isRestDay = params['rest'] as boolean;
  if (params['movements'] !== undefined) {
    if (!Array.isArray(params['movements'])) fail(2, m('skill-calorie.workout-write.c148'));
    patch.movements = (params['movements'] as unknown[]).map(asMovement);
  }
  if (Object.keys(patch).length === 0) fail(2, m('skill-calorie.workout-write.c149'));
  let n = 0;
  for (const s of target) {
    if (updateSession(db, wn, dn, s.session_index, patch)) n += 1;
  }
  if (n === 0) fail(4, m('skill-calorie.workout-write.c150'));
  const summary = m('skill-calorie.workout-write.c151', { p0: String(dayPhrase(wn, dn)), p1: String(n) });
  return out(R(m('skill-calorie.workout-write.c152'), 'update', summary, m('skill-calorie.workout-write.c153'), m('skill-calorie.workout-write.c154'), {
    recordId: null, ids: [], idSource: 'condition', writtenFields: provided(params, ['date', 'week', 'dayOfWeek', 'sessionIndex', 'sessionLabel', 'newLabel', 'timeStart', 'timeEnd', 'rest', 'movements']),
    items: [{ status: m('skill-calorie.workout-write.c155'), reason: '', detail: summary }],
  }));
}

/** `calorie.workout.plan-delete-day` · 删某天训练（硬删除，不可恢复；过程页先给快照）。 */
export function writePlanDeleteDay(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const { wn, dn } = resolveDayTarget(params, db);
  const si = optInt(params, 'sessionIndex');
  const plan = getPlan(db);
  const daySessions = plan.sessions.filter((s) => s.week_number === wn && s.day_of_week === dn);
  if (daySessions.length === 0) fail(4, m('skill-calorie.workout-write.c156', { p0: String(dayPhrase(wn, dn)) }));
  const snapshot = daySessions.map((s) => s.session_label || m('skill-calorie.workout-write.c157')).join('、');
  if (si !== undefined) {
    const hit = daySessions.filter((s) => s.session_index === si);
    if (hit.length === 0) fail(4, m('skill-calorie.workout-write.c158', { p0: String(dayPhrase(wn, dn)), p1: String(si) }));
    deleteSession(db, wn, dn, si);
    const summary = m('skill-calorie.workout-write.c159', { p0: String(dayPhrase(wn, dn)), p1: String(si) });
    return out(R(m('skill-calorie.workout-write.c160'), 'delete', summary, m('skill-calorie.workout-write.c161'), m('skill-calorie.workout-write.c162'), {
      recordId: null, ids: [], idSource: 'condition', writtenFields: provided(params, ['date', 'week', 'dayOfWeek', 'sessionIndex']),
      items: [{ status: m('skill-calorie.workout-write.c163'), reason: '', detail: m('skill-calorie.workout-write.c164', { p0: String(snapshot), p1: String(summary) }) }],
    }));
  }
  const r = deleteDay(db, wn, dn);
  const summary = m('skill-calorie.workout-write.c165', { p0: String(dayPhrase(wn, dn)), p1: String(r.deletedSessions) });
  return out(R(m('skill-calorie.workout-write.c166'), 'delete', summary, m('skill-calorie.workout-write.c167'), m('skill-calorie.workout-write.c168'), {
    recordId: null, ids: [], idSource: 'condition', writtenFields: provided(params, ['date', 'week', 'dayOfWeek']),
    items: [{ status: m('skill-calorie.workout-write.c169'), reason: '', detail: m('skill-calorie.workout-write.c170', { p0: String(snapshot), p1: String(summary) }) }],
  }));
}

/** `calorie.workout.plan-update-movement` · 改动作（按名替换；week 缺省＝所有周）。 */
export function writePlanUpdateMovement(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const oldName = optStr(params, 'oldMovement');
  if (!oldName) fail(2, m('skill-calorie.workout-write.c171'));
  const newMove = asMovement(params['newMovement']);
  // 同上：没名字的替换一律挡在写前（写下去就是一条无名动作）。
  if (typeof newMove.name !== 'string' || newMove.name === '') fail(2, m('skill-calorie.workout-write.c172'));
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
  const weekPhrase = week === undefined ? '' : m('skill-calorie.workout-write.c173', { p0: String(week) });
  if (n === 0) fail(4, m('skill-calorie.workout-write.c174', { p0: String(String(oldName)), p1: String(weekPhrase) }));
  const summary = m('skill-calorie.workout-write.c175', {
    p0: String(String(oldName)),
    p1: String(String(newMove.name)),
    p2: String(n),
    p3: String(where.slice(0, 4).join('、')),
    p4: String(where.length > 4 ? '…' : ''),
  });
  return out(R(m('skill-calorie.workout-write.c176'), 'update', summary, m('skill-calorie.workout-write.c177'), m('skill-calorie.workout-write.c178'), {
    recordId: null, ids: [], idSource: 'condition', writtenFields: provided(params, ['week', 'oldMovement', 'newMovement']),
    items: [{ status: m('skill-calorie.workout-write.c179'), reason: '', detail: summary }],
  }));
}

/** `calorie.workout.plan-delete` · 撤销训练计划（整份硬删除，不可恢复；须带 confirm:true，
 * 该确认只能来自写前预览页——裸调一律 exit 2，防一次误调清空整份计划）。 */
export function writePlanDelete(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  if (params['confirm'] !== true) fail(2, m('skill-calorie.workout-write.c180'));
  const plan = getPlan(db);
  if (!plan.config && plan.sessions.length === 0) fail(4, m('skill-calorie.workout-write.c181'));
  const r = deletePlan(db);
  const deletedTitle = String(r.planSummary.title ?? m('skill-calorie.workout-write.c182'));
  const summary = m('skill-calorie.workout-write.c183', { p0: String(deletedTitle), p1: String(r.deletedRows) });
  return out(R(m('skill-calorie.workout-write.c184'), 'delete', summary, m('skill-calorie.workout-write.c185'), m('skill-calorie.workout-write.c186'), {
    recordId: null, ids: [], idSource: 'condition', writtenFields: ['confirm'],
    items: [{ status: m('skill-calorie.workout-write.c187'), reason: '', detail: summary }],
  }));
}
