// 提醒域·到期判定与已完成视图（#665）：老 `list_due_reminders`／`completed_reminders`
// （`memo_cli.py:1148-1510`）的 TS 换皮，判定口径逐行照搬，定时壳不搬。
//
// 三条常量照老原文：提前预通知 10 分钟、延后窗口＝cron 间隔×2（`memo_cli.py:23-27`）。
// `now` 可注入（默认当下）：判定是时间的纯函数，测试给定钟面即得确定读数。
import {
  getReminderRow,
  listReminderRows,
  setReminderRow,
  type MemoDb,
  type MemoReminder,
} from './db.js';
import { MemoFetchError } from '../shared/errors.js';

export const REMIND_ADVANCE_MINUTES = 10;
export const REMIND_CRON_INTERVAL_MINUTES = 5;
export const REMIND_GRACE_MINUTES = REMIND_CRON_INTERVAL_MINUTES * 2;

export interface DueReminder {
  readonly id: number;
  readonly repeat_type: string;
  readonly note_id: number | null;
  readonly time: string;
  readonly content: string;
  readonly trigger_reason: 'advance' | 'exact';
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function stampOf(d: Date): string {
  return (
    d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds())
  );
}

function parseHm(text: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h < 0 || h > 23 || mi < 0 || mi > 59) return null;
  return h * 60 + mi;
}

/** 到期判定（老 `list_due_reminders`）：扫全部 active 提醒，按重复口径算触发；命中即写回
 *  `notified_at`（一次性准点再加标 dismissed），最后统一提交。畸形 `remind_at` 跳过。 */
export function checkDueReminders(db: MemoDb, now = new Date()): DueReminder[] {
  const today = now.getFullYear() + '-' + pad2(now.getMonth() + 1) + '-' + pad2(now.getDate());
  const nowMinute = now.getHours() * 60 + now.getMinutes();
  const nowStr = stampOf(now);
  // JS 周几转老口径 0=周日（老 `convert_weekday` 的逆向：Python Monday=0 → 用户 Sunday=0）。
  const userWeekday = (now.getDay() + 7) % 7;
  const out: DueReminder[] = [];
  for (const row of listReminderRows(db, 'active')) {
    const hit = judgeOne(row, { today, nowMinute, nowStr, userWeekday, day: now.getDate(), month: now.getMonth() + 1, year: now.getFullYear() });
    if (!hit) continue;
    out.push({ id: row.id, repeat_type: row.repeat_type, note_id: row.note_id, time: hit.time, content: hit.content, trigger_reason: hit.reason });
    if (hit.reason === 'advance') {
      setReminderRow(db, row.id, { notified_at: nowStr });
    } else if (row.repeat_type === '一次性') {
      setReminderRow(db, row.id, { notified_at: nowStr, status: 'dismissed' });
    } else {
      setReminderRow(db, row.id, { notified_at: nowStr });
    }
  }
  return out;
}

interface JudgeCtx {
  readonly today: string;
  readonly nowMinute: number;
  readonly nowStr: string;
  readonly userWeekday: number;
  readonly day: number;
  readonly month: number;
  readonly year: number;
}

function judgeOne(
  row: MemoReminder,
  ctx: JudgeCtx,
): { time: string; content: string; reason: 'advance' | 'exact' } | null {
  // 老原文：`remind_at` 畸形即跳过（stderr 警告，TS 侧静默跳过，行数可查）。
  let remindDt: { date: string; minute: number } | null = null;
  if (row.remind_at) {
    const m = /^(\d{4}-\d{2}-\d{2}) (\d{1,2}):(\d{2})$/.exec(row.remind_at.trim());
    if (!m) return null;
    const hh = Number(m[2]);
    const mm = Number(m[3]);
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
    remindDt = { date: m[1], minute: hh * 60 + mm };
  }
  const rule = row.repeat_rule;
  let triggerMinute: number | null = null;
  let inCycle = false;
  if (rule === null) {
    // 无 rule → 退回一次性逻辑（老原文）。
    if (row.repeat_type === '一次性' && remindDt) {
      inCycle = ctx.today === remindDt.date;
      triggerMinute = remindDt.minute;
    } else {
      return null;
    }
  } else {
    const parts = rule.trim().split(' ');
    if (row.repeat_type === '每天') {
      if (parts.length !== 1) return null;
      const t = parseHm(parts[0]);
      if (t === null) return null;
      triggerMinute = t;
      inCycle = true;
    } else if (row.repeat_type === '每周') {
      if (parts.length !== 2) return null;
      const w = Number(parts[0]);
      const t = parseHm(parts[1]);
      if (!Number.isInteger(w) || w < 0 || w > 6 || t === null) return null;
      triggerMinute = t;
      inCycle = ctx.userWeekday === w;
    } else if (row.repeat_type === '每月') {
      if (parts.length !== 2) return null;
      const d = Number(parts[0]);
      const t = parseHm(parts[1]);
      if (!Number.isInteger(d) || d < 1 || d > 31 || t === null) return null;
      triggerMinute = t;
      inCycle = ctx.day === d;
    } else if (row.repeat_type === '每年') {
      if (parts.length !== 2) return null;
      const md = parts[0].split('-');
      if (md.length !== 2) return null;
      const mo = Number(md[0]);
      const da = Number(md[1]);
      const t = parseHm(parts[1]);
      if (!Number.isInteger(mo) || mo < 1 || mo > 12 || !Number.isInteger(da) || da < 1 || da > 31 || t === null) return null;
      triggerMinute = t;
      inCycle = ctx.month === mo && ctx.day === da;
    } else if (row.repeat_type === '一次性') {
      // 一次性带 rule：rule 是时间则取其分钟，否则默认 9:00；日期仍看 remind_at（老原文）。
      if (parts.length === 1 && parts[0].includes(':')) {
        const t = parseHm(parts[0]);
        triggerMinute = t === null ? 9 * 60 : t;
      } else {
        triggerMinute = 9 * 60;
      }
      if (remindDt) {
        inCycle = ctx.today === remindDt.date;
        triggerMinute = remindDt.minute;
      } else {
        inCycle = false;
      }
    } else {
      return null;
    }
  }
  if (!inCycle || triggerMinute === null) return null;
  // 新周期重置 notified_at（老原文：循环提醒跨周期清零，使提前／准点能再次工作）。
  let notified = row.notified_at;
  if (row.repeat_type !== '一次性' && notified !== null) {
    const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(notified);
    if (m) {
      const ly = Number(m[1]);
      const lm = Number(m[2]);
      const ld = Number(m[3]);
      const reset =
        row.repeat_type === '每天'
          ? ld !== ctx.day || lm !== ctx.month || ly !== ctx.year
          : row.repeat_type === '每月'
            ? ly < ctx.year || (ly === ctx.year && lm < ctx.month)
            : row.repeat_type === '每年'
              ? ly < ctx.year
              : isoWeek(ly, lm, ld) !== isoWeek(ctx.year, ctx.month, ctx.day);
      if (reset) notified = null;
    }
  }
  if (notified !== null) return null;
  // 触发判断：提前窗口 [T-10, T)／准点容错 [T, T+窗口]（老原文两条件）。
  const advance = triggerMinute - REMIND_ADVANCE_MINUTES < 0 ? 0 : triggerMinute - REMIND_ADVANCE_MINUTES;
  let reason: 'advance' | 'exact' | null = null;
  if (advance <= ctx.nowMinute && ctx.nowMinute < triggerMinute) reason = 'advance';
  else if (triggerMinute <= ctx.nowMinute && ctx.nowMinute <= triggerMinute + REMIND_GRACE_MINUTES) reason = 'exact';
  if (!reason) return null;
  const time =
    row.repeat_type === '一次性'
      ? (row.remind_at ?? ctx.today + ' 09:00')
      : ctx.today + ' ' + pad2(Math.floor(triggerMinute / 60)) + ':' + pad2(triggerMinute % 60);
  return { time, content: row.content ?? '', reason };
}

function isoWeek(y: number, m: number, d: number): string {
  const dt = new Date(y, m - 1, d);
  const day = (dt.getDay() + 6) % 7;
  const thursday = new Date(dt);
  thursday.setDate(dt.getDate() - day + 3);
  const first = new Date(thursday.getFullYear(), 0, 4);
  const fday = (first.getDay() + 6) % 7;
  const firstThursday = new Date(first);
  firstThursday.setDate(first.getDate() - fday + 3);
  const week = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 86400000));
  return thursday.getFullYear() + '-W' + week;
}

export interface CompletedReminder {
  readonly reminder_id: number;
  readonly reminder_content: string;
  readonly checkin_note_id: number | null;
  readonly checkin_content: string | null;
  readonly checkin_at: string | null;
  readonly period: string;
  readonly repeat_type: string;
}

/** 已完成视图（老 `completed_reminders`）：打卡笔记经 `notes.reminder_id` 反查提醒行，active 才算；
 *  一次性以 notified 为准，循环按周期窗口对上打卡日期。 */
export function listCompletedReminders(db: MemoDb, now = new Date()): CompletedReminder[] {
  const rows = db.conn
    .prepare(
      'SELECT n.id AS checkin_note_id, n.content AS checkin_content, n.created_at AS checkin_at, ' +
        'r.id AS reminder_id, r.repeat_type AS repeat_type, r.repeat_rule AS repeat_rule, ' +
        'r.notified_at AS notified_at, r.content AS reminder_content, r.note_id AS orig_note_id ' +
        "FROM notes n JOIN reminders r ON n.reminder_id = r.id WHERE n.category = '打卡' AND r.status = 'active' " +
        'ORDER BY n.created_at DESC',
    )
    .all() as Record<string, unknown>[];
  const out: CompletedReminder[] = [];
  for (const d of rows) {
    const repeat = String(d.repeat_type ?? '');
    const rule = (d.repeat_rule as string | null) ?? '';
    const at = String(d.checkin_at ?? '');
    const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(at);
    if (!m) continue;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const da = Number(m[3]);
    const hh = Number(m[4]);
    const mi = Number(m[5]);
    if (repeat === '一次性') {
      if (!d.notified_at) continue;
      out.push({
        reminder_id: d.reminder_id as number,
        reminder_content: (d.reminder_content as string | null) ?? '',
        checkin_note_id: d.checkin_note_id as number,
        checkin_content: (d.checkin_content as string | null) ?? '',
        checkin_at: at.slice(0, 16),
        period: '一次性 · ' + String(d.notified_at).slice(0, 16),
        repeat_type: repeat,
      });
      continue;
    }
    // 循环：打卡日期须落在规则周期内（老原文四分支）。
    const hit =
      repeat === '每天'
        ? hh * 60 + mi >= (parseHm(rule) ?? 0)
        : repeat === '每周'
          ? ruleWeek(rule) === (new Date(y, mo - 1, da).getDay() + 7) % 7
          : repeat === '每月'
            ? ruleDay(rule) === da
            : repeat === '每年'
              ? ruleMonthDay(rule) === pad2(mo) + '-' + pad2(da)
              : false;
    if (!hit) continue;
    out.push({
      reminder_id: d.reminder_id as number,
      reminder_content: (d.reminder_content as string | null) ?? '',
      checkin_note_id: d.checkin_note_id as number,
      checkin_content: (d.checkin_content as string | null) ?? '',
      checkin_at: at.slice(0, 16),
      period: repeat + ' · ' + rule,
      repeat_type: repeat,
    });
  }
  void now;
  return out;
}

function ruleWeek(rule: string): number | null {
  const p = rule.trim().split(' ');
  if (p.length !== 2) return null;
  const w = Number(p[0]);
  return Number.isInteger(w) && w >= 0 && w <= 6 ? w : null;
}

function ruleDay(rule: string): number | null {
  const p = rule.trim().split(' ');
  if (p.length !== 2) return null;
  const d = Number(p[0]);
  return Number.isInteger(d) && d >= 1 && d <= 31 ? d : null;
}

function ruleMonthDay(rule: string): string | null {
  const p = rule.trim().split(' ');
  if (p.length !== 2) return null;
  return /^\d{2}-\d{2}$/.test(p[0]) ? p[0] : null;
}

/** 废弃（老 `dismiss_reminder`）：已是 dismissed 即大声失败，不静默。 */
export function abandonReminder(db: MemoDb, id: number): number {
  const row = getReminderRow(db, id);
  if (row.status === 'dismissed') throw new MemoFetchError('MEMO_BAD_QUERY', '提醒已经是废弃状态：' + id);
  setReminderRow(db, id, { status: 'dismissed' });
  return id;
}
