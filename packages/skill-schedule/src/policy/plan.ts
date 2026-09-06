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

export type PlanWriteOp = 'preview' | 'upsert' | 'ensure' | 'update' | 'deactivate' | 'review' | 'sync';

export function parsePlanOp(params: Record<string, unknown>): PlanWriteOp {
  const op = params.op === undefined ? 'preview' : params.op;
  const ops: PlanWriteOp[] = ['preview', 'upsert', 'ensure', 'update', 'deactivate', 'review', 'sync'];
  if (typeof op !== 'string' || !ops.includes(op as PlanWriteOp)) {
    throw new SchedulePolicyError('POLICY_BAD_INPUT', 'op 非法（期望 ' + ops.join('/') + '）：' + JSON.stringify(op));
  }
  return op as PlanWriteOp;
}

export type RecordWriteOp = 'add' | 'amend' | 'summary';

export function parseRecordOp(params: Record<string, unknown>): RecordWriteOp {
  const op = params.op === undefined ? 'add' : params.op;
  if (op !== 'add' && op !== 'amend' && op !== 'summary') {
    throw new SchedulePolicyError('POLICY_BAD_INPUT', 'op 非法（期望 add/amend/summary）：' + JSON.stringify(op));
  }
  return op;
}
