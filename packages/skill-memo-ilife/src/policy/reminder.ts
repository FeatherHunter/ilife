// 口径层·提醒路由与校验（#665）：设置/查/废弃/完成四向；废弃留笔记、删除去笔记（须 confirm）。
// 时间与重复口径照老 `memo_cli.py:1049-1110`（`_validate_remind_at`／`_validate_repeat_rule`）：
// `--at` 须 `YYYY-MM-DD HH:MM`；重复四种（每天／每周／每月／每年）各有 rule 形状，一次性不用 rule
// 但必须有 `--at`。新仓参数名沿既有 camelCase（remindAt／repeatType／repeatRule）。
import { MemoPolicyError } from '../fetch/errors.js';

export const REMIND_AT_RE = /^(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{2})$/;

export const REMIND_REPEAT_TYPES = ['一次性', '每天', '每周', '每月', '每年'] as const;
export type RemindRepeatType = (typeof REMIND_REPEAT_TYPES)[number];

/** 提醒时间须 `YYYY-MM-DD HH:MM` 且为真日期时间（老 `_validate_remind_at`）。 */
export function normalizeRemindAt(v: unknown): string {
  if (typeof v !== 'string') throw new MemoPolicyError('POLICY_BAD_REMINDER', '提醒时间须为 YYYY-MM-DD HH:MM');
  const m = REMIND_AT_RE.exec(v.trim());
  if (!m) throw new MemoPolicyError('POLICY_BAD_REMINDER', '提醒时间须为 YYYY-MM-DD HH:MM，当前：' + String(v));
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
  if (d.getFullYear() !== Number(m[1]) || d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[3])) {
    throw new MemoPolicyError('POLICY_BAD_REMINDER', '提醒时间不是真日期：' + String(v));
  }
  return v.trim();
}

export function normalizeRepeatType(v: unknown): RemindRepeatType {
  if (v === undefined || v === null || v === '') return '一次性';
  if (typeof v !== 'string' || !REMIND_REPEAT_TYPES.includes(v as RemindRepeatType)) {
    throw new MemoPolicyError('POLICY_BAD_REMINDER', '重复类型须为 一次性/每天/每周/每月/每年，当前：' + String(v));
  }
  return v as RemindRepeatType;
}

/** 重复规则形状（老 `_validate_repeat_rule`）：每天 `HH:MM`／每周 `W HH:MM`／每月 `D HH:MM`／
 *  每年 `MM-DD HH:MM`；一次性不用 rule 但必须有提醒时间。 */
export function normalizeRepeatRule(type: RemindRepeatType, rule: unknown, at: string | null): string | null {
  if (type === '一次性') {
    if (!at) throw new MemoPolicyError('POLICY_BAD_REMINDER', '一次性提醒必须给提醒时间');
    return null;
  }
  if (typeof rule !== 'string' || rule.trim().length === 0) {
    throw new MemoPolicyError('POLICY_BAD_REMINDER', '重复类型 ' + type + ' 必须给重复规则');
  }
  const parts = rule.trim().split(' ');
  const hm = (s: string): void => {
    const p = s.split(':');
    if (p.length !== 2) throw new MemoPolicyError('POLICY_BAD_REMINDER', '时间须为 HH:MM，当前：' + s);
    const h = Number(p[0]);
    const mi = Number(p[1]);
    if (!Number.isInteger(h) || !Number.isInteger(mi) || h < 0 || h > 23 || mi < 0 || mi > 59) {
      throw new MemoPolicyError('POLICY_BAD_REMINDER', '时间超出范围：' + s);
    }
  };
  if (type === '每天') {
    if (parts.length !== 1) throw new MemoPolicyError('POLICY_BAD_REMINDER', '每天规则须为 HH:MM，当前：' + rule);
    hm(parts[0]);
  } else if (type === '每周') {
    if (parts.length !== 2) throw new MemoPolicyError('POLICY_BAD_REMINDER', '每周规则须为 W HH:MM，当前：' + rule);
    const w = Number(parts[0]);
    if (!Number.isInteger(w) || w < 0 || w > 6) throw new MemoPolicyError('POLICY_BAD_REMINDER', '星期超出范围 0-6：' + parts[0]);
    hm(parts[1]);
  } else if (type === '每月') {
    if (parts.length !== 2) throw new MemoPolicyError('POLICY_BAD_REMINDER', '每月规则须为 D HH:MM，当前：' + rule);
    const d = Number(parts[0]);
    if (!Number.isInteger(d) || d < 1 || d > 31) throw new MemoPolicyError('POLICY_BAD_REMINDER', '日期超出范围 1-31：' + parts[0]);
    hm(parts[1]);
  } else {
    if (parts.length !== 2) throw new MemoPolicyError('POLICY_BAD_REMINDER', '每年规则须为 MM-DD HH:MM，当前：' + rule);
    const md = parts[0].split('-');
    if (md.length !== 2) throw new MemoPolicyError('POLICY_BAD_REMINDER', '年月日须为 MM-DD，当前：' + parts[0]);
    const mo = Number(md[0]);
    const da = Number(md[1]);
    if (!Number.isInteger(mo) || mo < 1 || mo > 12) throw new MemoPolicyError('POLICY_BAD_REMINDER', '月份超出范围 1-12：' + parts[0]);
    if (!Number.isInteger(da) || da < 1 || da > 31) throw new MemoPolicyError('POLICY_BAD_REMINDER', '日期超出范围 1-31：' + parts[0]);
    hm(parts[1]);
  }
  return rule.trim();
}

export type RemindOp = 'set' | 'query' | 'abandon' | 'complete' | 'listDone';
export interface RemindRoute { key: string; mode?: 'abandon' | 'delete'; done?: boolean; }

export function routeRemind(op: RemindOp): RemindRoute {
  switch (op) {
    case 'set': return { key: 'memo.create' };
    case 'query': return { key: 'memo.remind' };
    case 'abandon': return { key: 'memo.remove', mode: 'abandon' };
    case 'complete': return { key: 'memo.update', done: true };
    case 'listDone': return { key: 'memo.remind', done: true };
    default: throw new MemoPolicyError('POLICY_BAD_REMINDER', '未知提醒操作：' + String(op));
  }
}
