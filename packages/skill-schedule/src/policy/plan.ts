// 口径层·日程计划 params 校验（老家 #12~#21 入参对应）。
// 事件必填三元组 time_start/time_end/title；24h 覆盖校验（老家 validate_24h_coverage）；
// completion 6 态（老家 CONTEXT.md：已完成/已完成(超时)/部分完成/未完成/未完成(不可抗力)/未复盘）。
import { SchedulePolicyError } from '../fetch/errors.js';
import { normalizeCategory } from './category.js';
import { normalizeDate, normalizeTime, toMinutes } from './record.js';

export const VALID_COMPLETIONS = [
  '已完成', '已完成(超时)', '部分完成', '未完成', '未完成(不可抗力)', '未复盘',
];

export interface PlanEventInput {
  time_start: string;
  time_end: string;
  title: string;
  notes?: string | null;
  category?: string | null;
}

export function validateEvent(e: unknown, idx: number): PlanEventInput {
  if (typeof e !== 'object' || e === null || Array.isArray(e)) {
    throw new SchedulePolicyError('POLICY_BAD_INPUT', 'events[' + idx + '] 须为对象');
  }
  const o = e as Record<string, unknown>;
  const timeStart = normalizeTime(o.time_start, 'events[' + idx + '].time_start');
  const timeEnd = normalizeTime(o.time_end, 'events[' + idx + '].time_end');
  if (toMinutes(timeEnd) <= toMinutes(timeStart)) {
    throw new SchedulePolicyError(
      'POLICY_BAD_TIME',
      'events[' + idx + '] time_end 必须晚于 time_start（' + timeStart + '~' + timeEnd + '）',
    );
  }
  if (typeof o.title !== 'string' || o.title.trim().length === 0) {
    throw new SchedulePolicyError('POLICY_BAD_INPUT', 'events[' + idx + '] title 为空');
  }
  if (o.notes !== undefined && o.notes !== null && typeof o.notes !== 'string') {
    throw new SchedulePolicyError('POLICY_BAD_INPUT', 'events[' + idx + '] notes 须为字符串或 null');
  }
  const out: PlanEventInput = { time_start: timeStart, time_end: timeEnd, title: o.title.trim() };
  if (typeof o.notes === 'string') out.notes = o.notes;
  if (o.category !== undefined && o.category !== null) out.category = normalizeCategory(o.category);
  return out;
}

// 24h 覆盖：首 00:00、尾 24:00（归一 23:59 视同）、逐条首尾相接；违者 throw。
export function assertCoverage24h(events: PlanEventInput[]): void {
  if (!events.length) throw new SchedulePolicyError('POLICY_BAD_COVERAGE', 'events 为空，至少需要 1 条');
  if (events[0].time_start !== '00:00') {
    throw new SchedulePolicyError('POLICY_BAD_COVERAGE', '首事件 time_start 必须为 00:00，当前 ' + events[0].time_start);
  }
  const last = events[events.length - 1];
  if (last.time_end !== '23:59' && last.time_end !== '24:00') {
    throw new SchedulePolicyError('POLICY_BAD_COVERAGE', '末事件 time_end 必须为 24:00，当前 ' + last.time_end);
  }
  let cursor = 0;
  events.forEach((e, i) => {
    const s = toMinutes(e.time_start);
    if (s !== cursor) {
      throw new SchedulePolicyError(
        'POLICY_BAD_COVERAGE',
        'events[' + i + '] time_start=' + e.time_start + ' 与上一条 time_end 不连续',
      );
    }
    cursor = toMinutes(e.time_end);
  });
}

// #17 商量计划落盘：events 数组逐条校验 + 24h 覆盖（preview 只校验不落盘由调用方分流）。
export function validateUpsertInput(params: Record<string, unknown>): { date: string; events: PlanEventInput[] } {
  const date = normalizeDate(params.date, 'date');
  if (!Array.isArray(params.events) || !params.events.length) {
    throw new SchedulePolicyError('POLICY_BAD_INPUT', 'upsert 须给非空 events 数组');
  }
  const events = (params.events as unknown[]).map((e, i) => validateEvent(e, i));
  assertCoverage24h(events);
  return { date, events };
}

// #13 补计划：三元组 + title。
export function validateEnsureInput(params: Record<string, unknown>): PlanEventInput & { date: string } {
  const date = normalizeDate(params.date, 'date');
  return { date, ...validateEvent(params, -1) };
}

// #599 补计划多天批量：`dates[]` 每条自带 date（三元组 + title），逐条走单天合成写。
// 形如票面推荐的 dates[] 一支（起止区间那一支不做）：单复数与只读侧同形（`date` 单天／`dates` 多天），
// 元素是对象（写侧每天要完整三元组），与只读 `dates:string[]` 按 key 分流，不共用校验。
export interface EnsureBatchItem extends PlanEventInput {
  date: string;
}

export function validateEnsureBatchInput(params: Record<string, unknown>): { items: EnsureBatchItem[] } {
  const raw = params.dates;
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new SchedulePolicyError('POLICY_BAD_INPUT', 'ensure 批量须给非空 dates 数组（每条含 date/time_start/time_end/title）');
  }
  if (params.date !== undefined) {
    throw new SchedulePolicyError('POLICY_BAD_INPUT', 'date 与 dates 不可同给（单天走 date，多天走 dates[]）');
  }
  return {
    items: raw.map((e, i) => {
      try {
        if (typeof e !== 'object' || e === null || Array.isArray(e)) {
          throw new SchedulePolicyError('POLICY_BAD_INPUT', 'dates[' + i + '] 须为对象');
        }
        const o = e as Record<string, unknown>;
        const date = normalizeDate(o.date, 'dates[' + i + '].date');
        return { date, ...validateEvent(o, i) };
      } catch (err) {
        if (err instanceof SchedulePolicyError) {
          if (err.message.startsWith('dates[' + i + ']')) throw err;
          throw new SchedulePolicyError(err.code, 'dates[' + i + ']：' + err.message);
        }
        throw err;
      }
    }),
  };
}

// #18 改计划：id + 至少一字段；completion 须 6 态之一。
export function validateUpdateInput(params: Record<string, unknown>): { id: number; patch: Record<string, unknown> } {
  const id = params.id;
  if (!Number.isInteger(id) || (id as number) <= 0) {
    throw new SchedulePolicyError('POLICY_BAD_INPUT', 'update 须给正整数 id');
  }
  const patch: Record<string, unknown> = {};
  if (params.title !== undefined) {
    if (typeof params.title !== 'string' || !params.title.trim()) {
      throw new SchedulePolicyError('POLICY_BAD_INPUT', 'title 不能为空');
    }
    patch.title = params.title.trim();
  }
  if (params.time_start !== undefined) patch.time_start = normalizeTime(params.time_start, 'time_start');
  if (params.time_end !== undefined) patch.time_end = normalizeTime(params.time_end, 'time_end');
  if (params.notes !== undefined) {
    if (typeof params.notes !== 'string') throw new SchedulePolicyError('POLICY_BAD_INPUT', 'notes 须为字符串');
    patch.notes = params.notes;
  }
  if (params.category !== undefined) patch.category = normalizeCategory(params.category);
  if (params.completion !== undefined) {
    if (typeof params.completion !== 'string' || !VALID_COMPLETIONS.includes(params.completion)) {
      throw new SchedulePolicyError(
        'POLICY_BAD_INPUT',
        'completion 非法：' + JSON.stringify(params.completion) + '（期望 ' + VALID_COMPLETIONS.join('/') + '）',
      );
    }
    patch.completion = params.completion;
  }
  if (params.completion_note !== undefined) {
    if (typeof params.completion_note !== 'string') {
      throw new SchedulePolicyError('POLICY_BAD_INPUT', 'completion_note 须为字符串');
    }
    patch.completion_note = params.completion_note;
  }
  if (!Object.keys(patch).length) {
    throw new SchedulePolicyError('POLICY_BAD_INPUT', 'update 至少改一个字段');
  }
  return { id: id as number, patch };
}

export type PlanWriteOp = 'preview' | 'upsert' | 'ensure' | 'update' | 'deactivate' | 'review' | 'sync' | 'check';

export function parsePlanOp(params: Record<string, unknown>): PlanWriteOp {
  const op = params.op === undefined ? 'preview' : params.op;
  const ops: PlanWriteOp[] = ['preview', 'upsert', 'ensure', 'update', 'deactivate', 'review', 'sync', 'check'];
  if (typeof op !== 'string' || !ops.includes(op as PlanWriteOp)) {
    throw new SchedulePolicyError('POLICY_BAD_INPUT', 'op 非法（期望 ' + ops.join('/') + '）：' + JSON.stringify(op));
  }
  return op as PlanWriteOp;
}

/** 写命令的两档语义（S-13）：`upsert`＝整段覆盖，`ensure`＝缺则补。 */
export const PLAN_WRITE_OPS_OVERWRITE: PlanWriteOp[] = ['upsert'];
export const PLAN_WRITE_OPS_FILL: PlanWriteOp[] = ['ensure'];

/** 远端开关（合成写的参数面）：`ensure`（缺省）＝把这条事实对齐到两侧；`skip`＝这一趟只要本地。 */
export type PlanFeishuMode = 'ensure' | 'skip';

export function parseFeishuMode(params: Record<string, unknown>): PlanFeishuMode {
  const v = params.feishu;
  if (v === undefined || v === null) return 'ensure';
  if (v !== 'ensure' && v !== 'skip') {
    throw new SchedulePolicyError('POLICY_BAD_INPUT', 'feishu 非法（期望 ensure/skip）：' + JSON.stringify(v));
  }
  return v;
}

/** 日程查询的两种视图：`list`（缺省，全字段）与 `aggregate`（24h 聚合视图，丢 notes／同步态／ID）。 */
export type PlanView = 'list' | 'aggregate';

export function parsePlanView(params: Record<string, unknown>): PlanView {
  const v = params.view;
  if (v === undefined || v === null) return 'list';
  if (v !== 'list' && v !== 'aggregate') {
    throw new SchedulePolicyError('POLICY_BAD_INPUT', 'view 非法（期望 list/aggregate）：' + JSON.stringify(v));
  }
  return v;
}

export type RecordWriteOp = 'add' | 'amend' | 'summary';

export function parseRecordOp(params: Record<string, unknown>): RecordWriteOp {
  const op = params.op === undefined ? 'add' : params.op;
  if (op !== 'add' && op !== 'amend' && op !== 'summary') {
    throw new SchedulePolicyError('POLICY_BAD_INPUT', 'op 非法（期望 add/amend/summary）：' + JSON.stringify(op));
  }
  return op;
}
