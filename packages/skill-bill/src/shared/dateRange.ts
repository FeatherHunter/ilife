/** 共用位·日期与时间窗口口径（#689 结构搬迁第三批）：从 `src/policy/category.ts` 的日期函数
 *  ＋ `src/policy/record.ts` 的日期与时间窗口两半合并而来——**一件一处**：日期串的归一、月份串的归一、
 *  时刻的补齐，以及「某天／某周／某月／某区间」这些窗口算式都只在这里写一遍。
 *
 *  谁在用（指名，路径随 #689 搬迁改成新家）：
 *    · `src/write/`——`record.ts`（`validateUpdateInput` 的 `validateTime`）·
 *      `prefillNote.ts`／`summaryRow.ts`（`DEFAULT_TIME_SUFFIX`／`defaultTimeOn`）；
 *    · `src/query/read.ts`——查今天／查昨天（`resolveQueryDate`／`yesterdayStr`）、查区间（`resolveRange`）、
 *      锚点归一（`normalizeDate`）；
 *    · `src/analysis/`——`needMonth`／`needRange` 的 `normalizeMonth`／`normalizeDate`；
 *    · `src/goal/`——预算月份与目标截止日（`normalizeMonth`／`normalizeDate`）；
 *    · `src/cli/cmd_read.ts`——未迁移的 analysis／goal 两族分支的 `monthRange`／`resolveRange`（外壳）；
 *    · `src/shared/category.ts`——`validateRecord` 补时刻（`defaultTimeOn`／`validateTime`）。
 *  两域以上在用它 ⇒ 住共用位（归属律 2）。日期函数**不是**按「单消费者」判的：它们是同一条口径的整族
 *  （`validateTime` 补出 `DEFAULT_TIME_SUFFIX`，页面侧预填标注引同一份），拆开就会各写一份时刻字面量。 */
import { BillPolicyError } from '../fetch/errors.js';

/** 只给日期不给时分秒时的缺省时刻（**唯一定义地**）：`validateTime` 补出整串，页面侧的预填标注引这一份。
 *  改这一条就是改全仓的缺省时刻，别处不得再写第二份 `12:00:00` 字面量。 */
export const DEFAULT_TIME_SUFFIX = '12:00:00';

/** 缺省时刻的整串形态：`YYYY-MM-DD` ＋ 上面那份（页面文案与库内取值同一句）。 */
export function defaultTimeOn(date: string): string {
  return date + ' ' + DEFAULT_TIME_SUFFIX;
}

export const DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}):(\d{2}))?$/;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function realDate(y: number, m: number, d: number): boolean {
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

// 时间：YYYY-MM-DD HH:mm:ss 或 YYYY-MM-DD（补 12:00:00）；非法阻断。
export function validateTime(raw: unknown): string {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw new BillPolicyError('POLICY_BAD_TIME', 'time 不能为空');
  }
  const s = raw.trim().replace(/\//g, '-');
  const m = DATETIME_RE.exec(s);
  if (!m) throw new BillPolicyError('POLICY_BAD_TIME', 'time 格式非法');
  const y = Number(m[1]); const mo = Number(m[2]); const d = Number(m[3]);
  if (!realDate(y, mo, d)) throw new BillPolicyError('POLICY_BAD_TIME', 'time 非真实日期');
  if (m[4] === undefined) return defaultTimeOn(s);
  const hh = Number(m[4]); const mm = Number(m[5]); const ss = Number(m[6]);
  if (hh > 23 || mm > 59 || ss > 59) throw new BillPolicyError('POLICY_BAD_TIME', 'time 时分秒非法');
  return s;
}

export function normalizeDate(d: unknown, field = 'date'): string {
  if (typeof d !== 'string' || d.trim().length === 0) {
    throw new BillPolicyError('POLICY_BAD_TIME', field + ' 须为日期字符串');
  }
  let s = d.trim().replace(/\//g, '-').replace(/\./g, '-');
  if (/^\d{8}$/.test(s)) s = s.slice(0, 4) + '-' + s.slice(4, 6) + '-' + s.slice(6);
  if (!DATE_RE.test(s)) throw new BillPolicyError('POLICY_BAD_TIME', field + ' 格式非法');
  const parts2 = s.split('-').map(Number);
  if (!realDate(parts2[0], parts2[1], parts2[2])) throw new BillPolicyError('POLICY_BAD_TIME', field + ' 非真实日期');
  return s;
}

export function normalizeMonth(m: unknown, field = 'month'): string {
  if (typeof m !== 'string' || !MONTH_RE.test(m.trim())) {
    throw new BillPolicyError('POLICY_BAD_TIME', field + ' 格式非法');
  }
  return (m as string).trim();
}

/** 查询某天的入参：不给／给空＝今天（UTC 日）；给了就归一（`YYYY-MM-DD` 三种写法都认）。 */
export function resolveQueryDate(params: Record<string, unknown>): string {
  if (params.date === undefined || params.date === null || params.date === '') {
    return new Date().toISOString().slice(0, 10);
  }
  if (typeof params.date !== 'string') throw new BillPolicyError('POLICY_BAD_TIME', 'date 须为字符串');
  return normalizeDate(params.date);
}

/** 区间的入参：`start`／`end` 同给；缺一即缺槽位阻断，起点晚于终点阻断。 */
export function resolveRange(params: Record<string, unknown>): { start: string; end: string } {
  if (params.start === undefined || params.end === undefined) {
    throw new BillPolicyError('POLICY_MISSING_SLOT', '缺槽位 start/end（期望 YYYY-MM-DD）');
  }
  const start = normalizeDate(params.start, 'start');
  const end = normalizeDate(params.end, 'end');
  if (start > end) throw new BillPolicyError('POLICY_BAD_INPUT', 'start 不得晚于 end：' + start + '~' + end);
  return { start, end };
}

/* ── 时间窗口口径（**唯一定义地**，查询域与三个分析命令共用）─────────────────────
 * 这三件原来住在 `src/cli/cmd_read.ts` 的文件级函数里：查询域搬迁（#411）时被两个去处同时需要——
 * 查询的「查周／查月／查昨天」与分析的「看月度／看年度／看对比」——故按口径层的位置摆正；
 * #689 第三批随 `policy/` 拆散落到本件（原来的出口 `src/policy/index.ts` 已删）。 */

/** 某个月的起止日（`YYYY-MM` → 该月 1 号到月末）。 */
export function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  const dd = String(last).padStart(2, '0');
  return { start: month + '-01', end: month + '-' + dd };
}

/** 昨天（本地日期串 `YYYY-MM-DD`）。 */
export function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** 本周（周一为第一天）的起止日。 */
export function weekRange(): { start: string; end: string } {
  const now = new Date();
  const day = (now.getDay() + 6) % 7;
  const mon = new Date(now); mon.setDate(now.getDate() - day);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return { start: mon.toISOString().slice(0, 10), end: sun.toISOString().slice(0, 10) };
}
