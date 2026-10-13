/** 查询域·查账本四段时间窗口（1275 专属，`bill.record.range` 的 `ledger` 分支用）。
 *
 * 四段＝周／月／年／区间（用户 12 原话「周 月 年 以及提供区间的选择器」）：
 * 区间段占两格（开始＋结束），开始＝结束即查某天。空＝全部时间（与改前同）。
 * 四选一：给零段即全部时间，给两段及以上即阻断（exit 2），不静默取第一段。
 *
 * 相对词只认「本周／上周／本月／上月／今年」＋ 显式日期（周认单日代表、月认 YYYY-MM、年认 YYYY）；
 * 未来截到今天（与查周／查月「未来不计」同口径）。旧单字段 `period`（改前自由文本）
 * 若仍传来且新四段全空，一律按全部时间计（向后兼容，不解析）。
 *
 * 谁在用（一个调用点，指名）：`./read.js` 的 `viewRecordRange` 的 `ledger` 单条件分支。
 */
import { BillPolicyError } from '../fetch/errors.js';
import { monthRange, normalizeDate, normalizeMonth } from '../shared/dateRange.js';

/** 查账本时间窗口的解出值（含展示用注解）。 */
export interface LedgerWindow {
  readonly start: string;
  readonly end: string;
  /** 展示注解：本周／上周／本月／上月／今年／空（区间与显式年月不加注）。 */
  readonly tag: string;
}

/** 入参（`viewRecordRange` 的原样透传；新四段＋旧 `period` 兼容位＋通用时间位）。
 *
 * 通用时间位（`start`／`end`／`range=week|month`）＝**新 HELP 提示词实际会传**的那一组：
 * 时间槽位（`kind:'period'`）给 AI 的是人话值（如「2026 年 5 月（2026-05-01 至 2026-05-31）」），
 * AI 落到命令上就是 `start`／`end`（区间）或 `range`（周／月）。不认这一组的话，
 * `ledger`＋`start/end` 会被 `viewRecordRange` 的区间分支先接走、渲染成「查区间」票据纸
 * （2026-10-13 实测：账本＝旅行＋5 月 → `饼干记账_查区间_*.html`，应为 `饼干记账_查账本_*.html`）。 */
export interface LedgerWindowParams {
  readonly period_week?: unknown;
  readonly period_month?: unknown;
  readonly period_year?: unknown;
  readonly period_start?: unknown;
  readonly period_end?: unknown;
  readonly period?: unknown;
  readonly start?: unknown;
  readonly end?: unknown;
  readonly range?: unknown;
}

function trimStr(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** UTC 日串加减天（只做窗口推算，不做展示）。 */
function addDays(date: string, delta: number): string {
  const t = Date.parse(date + 'T12:00:00Z');
  return new Date(t + delta * 86400000).toISOString().slice(0, 10);
}

/** 单日代表所在周一..周日（周一为第一天，与查周同）。 */
function weekOfDay(day: string): { start: string; end: string } {
  const t = Date.parse(day + 'T12:00:00Z');
  const back = (new Date(t).getUTCDay() + 6) % 7;
  const mon = new Date(t - back * 86400000).toISOString().slice(0, 10);
  const sun = new Date(t + (6 - back) * 86400000).toISOString().slice(0, 10);
  return { start: mon, end: sun };
}

/** 周一..锚点（本周，未来不计，与 `read.js` 的 `weekWindowFrom` 同式）。 */
function weekToAnchor(anchor: string): { start: string; end: string } {
  const t = Date.parse(anchor + 'T12:00:00Z');
  const back = (new Date(t).getUTCDay() + 6) % 7;
  const mon = new Date(t - back * 86400000).toISOString().slice(0, 10);
  return { start: mon, end: anchor };
}

/** 月初..锚点（本月，未来不计，与 `read.js` 的 `monthWindowFrom` 同式）。 */
function monthToAnchor(anchor: string): { start: string; end: string } {
  return { start: anchor.slice(0, 8) + '01', end: anchor };
}

/** 上月整月（已过去，不截）。 */
function prevMonthRange(anchor: string): { start: string; end: string } {
  const y = Number(anchor.slice(0, 4));
  const m = Number(anchor.slice(5, 7));
  const pm = m === 1 ? 12 : m - 1;
  const py = m === 1 ? y - 1 : y;
  const key = String(py) + '-' + String(pm).padStart(2, '0');
  return monthRange(key);
}

/** 年初..锚点（今年，未来不计）或整年（往年）。 */
function yearWindow(year: string, anchor: string): { start: string; end: string } {
  const start = year + '-01-01';
  if (year === anchor.slice(0, 4)) return { start, end: anchor };
  return { start, end: year + '-12-31' };
}

/** 周段解析（本周／上周／YYYY-MM-DD 代表）。 */
function parseWeek(raw: string, anchor: string): { start: string; end: string; tag: string } {
  if (raw === '本周') {
    const w = weekToAnchor(anchor);
    return { ...w, tag: '本周' };
  }
  if (raw === '上周') {
    const w = weekToAnchor(addDays(anchor, -7));
    return { ...w, tag: '上周' };
  }
  const day = normalizeDate(raw, 'period_week');
  const w = weekOfDay(day);
  return { ...w, tag: '' };
}

/** 月段解析（本月／上月／YYYY-MM）。 */
function parseMonth(raw: string, anchor: string): { start: string; end: string; tag: string } {
  if (raw === '本月') {
    const w = monthToAnchor(anchor);
    return { ...w, tag: '本月' };
  }
  if (raw === '上月') {
    const w = prevMonthRange(anchor);
    return { ...w, tag: '上月' };
  }
  const key = normalizeMonth(raw, 'period_month');
  const w = monthRange(key);
  return { ...w, tag: '' };
}

/** 年段解析（今年／YYYY）。 */
function parseYear(raw: string, anchor: string): { start: string; end: string; tag: string } {
  if (raw === '今年') {
    const y = anchor.slice(0, 4);
    const w = yearWindow(y, anchor);
    return { ...w, tag: '今年' };
  }
  const s = raw.trim();
  if (!/^\d{4}$/.test(s)) throw new BillPolicyError('POLICY_BAD_TIME', 'period_year 格式非法（期望 YYYY 或 今年）');
  const w = yearWindow(s, anchor);
  return { ...w, tag: '' };
}

/** 区间段解析（开始＋结束同给；开始＝结束即某天）。 */
function parseInterval(startRaw: string, endRaw: string): { start: string; end: string; tag: string } {
  const start = normalizeDate(startRaw, 'period_start');
  const end = normalizeDate(endRaw, 'period_end');
  if (start > end) throw new BillPolicyError('POLICY_BAD_INPUT', 'period_start 不得晚于 period_end：' + start + '~' + end);
  return { start, end, tag: '' };
}

/** 查账本四段时间窗口：空即全部时间（回 null），给一段即起止日，多段即阻断。
 *
 * `today` 显式传入以便测试固定当前日期；缺省为机器时钟（UTC 日）。
 */
export function resolveLedgerWindow(
  params: Record<string, unknown>,
  today?: string,
): LedgerWindow | null {
  const anchor = today !== undefined && today !== null && today !== '' ? normalizeDate(today, 'today') : new Date().toISOString().slice(0, 10);
  const p = params as LedgerWindowParams;
  const week = trimStr(p.period_week);
  const month = trimStr(p.period_month);
  const year = trimStr(p.period_year);
  const range = trimStr(p.range);
  const rangeKind = range === 'week' || range === 'month' ? range : '';
  const startRaw = trimStr(p.period_start) || trimStr(p.start);
  const endRaw = trimStr(p.period_end) || trimStr(p.end);
  const hasInterval = startRaw !== '' || endRaw !== '';
  const count = (week !== '' ? 1 : 0) + (month !== '' ? 1 : 0) + (year !== '' ? 1 : 0) + (hasInterval ? 1 : 0) + (rangeKind !== '' ? 1 : 0);
  if (count === 0) return null;
  if (count > 1) throw new BillPolicyError('POLICY_BAD_INPUT', '时间四选一：周／月／年／区间只给一段');
  if (week !== '') return parseWeek(week, anchor);
  if (month !== '') return parseMonth(month, anchor);
  if (year !== '') return parseYear(year, anchor);
  if (rangeKind === 'week') return parseWeek('本周', anchor);
  if (rangeKind === 'month') return parseMonth('本月', anchor);
  if (startRaw === '' || endRaw === '') throw new BillPolicyError('POLICY_MISSING_SLOT', '缺槽位 period_start/period_end（区间须同时给开始与结束）');
  return parseInterval(startRaw, endRaw);
}
