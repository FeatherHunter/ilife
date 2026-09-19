/** 目标域·命令参数与槽位表（**唯一定义地**）：写命令的两支操作（设定预算／设定目标）、
 *  读命令的两支操作（看预算／看目标）、每支要哪些槽位、缺项与「值不对」怎么报。
 *
 * 谁在用（四个调用点，指名）：
 *   ① `src/goal/write.ts`——写命令处理体：拿 `goalBlocked` 当闸门（非空即出采集页、不写库），
 *      闸门放行之后才调 `validateSetBudget`／`validateSetSaving` 做真值校验；
 *   ② `src/goal/read.ts`——读命令处理体：`parseGoalReadOp` 认哪一支（预算执行／目标进度）；
 *   ③ `src/goal/scene-set-{budget,saving}.ts`——写命令两件场景件按 `GOAL_WRITE_SLOTS[op]` 出字段卡、
 *      按 `goalBlocked` 出缺项标签；
 *   ④ `src/goal/template-form.ts`——采集页的缺项标签与口令原文读同一份阻断表。
 *
 * 老侧对应件：`scripts/goal/cli.py`（四支的真值校验）与 `scripts/goal/render.py`（四张页的字段与文案）。
 *  口径按本文重摆，三处与老侧不同（逐条进 `docs/skills/skill-bill/t730-差异表.md`）：
 *   - **缺失与「值不对」分开**：老侧两种情况都是 `raise ValueError` 一句话（`cli.py:133-137`／`:226-236`），
 *     页上看不出缺哪一格；新侧按 #688 裁定 9 出**缺项阻断条**，逐项点名（`why` 说清为什么进不去）。
 *   - **同月同类预算撞车**：老侧 `cli.py:143-147` 在 CLI 里回一句「确认覆盖请加 --force」；
 *     新侧提进阻断表（`force` 那一格），采集页当场把「已存在哪一条」摊开——老侧表单页
 *     `budget_form.html:129-134` 本来就画这条冲突提示，新侧只是把它接到同一条阻断路径上（裁定 9）。
 *   - **月份与截止日的归一**：取 `../shared/dateRange.js` 的 `normalizeMonth`／`normalizeDate`（真源一处）；
 *     老侧那两条正则（`cli.py:46-47`）在归一这一层与之一致（月份 `YYYY-MM`、日期 `YYYY-MM-DD` 且真实日期）。
 *
 * 「今天／本月」按**本地时钟**取（老侧 `date.today()` 同口径）：本件给 `localDay`／`localMonth` 两件，
 *  域内别处不许再各写一份本地日期算式（`new Date().toISOString()` 是 UTC 日，跨零点会差一天）。
 */
import { BillPolicyError } from '../fetch/errors.js';
import { MONTH_RE, normalizeDate, normalizeMonth } from '../shared/dateRange.js';

/** 写命令的两支操作（老侧 `goal/cli.py` 的 set-budget／set-saving 两个子命令）。 */
export type GoalWriteOp = 'set-budget' | 'set-saving';

/** 读命令的两支操作（老侧 `goal/cli.py` 的 budget／saving 两个子命令）。 */
export type GoalReadOp = 'budget' | 'saving';

/** 目标域四支操作的合集（域声明 `preset.op` 的取值面）。 */
export type GoalOp = GoalWriteOp | GoalReadOp;

/** 两位小数（金额的每一格都过它：老侧每处 `round(x, 2)` 同一口径）。 */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** 本地日期串 `YYYY-MM-DD`（**全仓仅此一处**：目标域的「今天」照老侧 `date.today()` 取本地时区）。 */
export function localDay(now: Date = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return String(now.getFullYear()) + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
}

/** 本地月份串 `YYYY-MM`（同上，用于「不填月份＝本月」）。 */
export function localMonth(now: Date = new Date()): string {
  return localDay(now).slice(0, 7);
}

/** 写命令的 op 归一：只认两支；缺省／非法一律抛——op 是这一条命令自己的判别式，**不猜**
 *  （老侧靠子命令名认，两处同口径；与账户域 `parseAccountOp` 同一套判法）。 */
export function parseGoalWriteOp(params: Record<string, unknown>): GoalWriteOp {
  const op = params['op'];
  if (op === 'set-budget' || op === 'set-saving') return op;
  throw new BillPolicyError('POLICY_BAD_INPUT', 'op 非法（只认 set-budget／set-saving）：' + JSON.stringify(op));
}

/** 读命令的 op 归一：**缺省＝budget**（照老侧「看预算」是这一域最常读的一支、也是搬迁前
 *  `cmd_read.ts` 那条 `op === 'budget' || params.op === undefined` 的缺省口径）；两支之外抛。 */
export function parseGoalReadOp(params: Record<string, unknown>): GoalReadOp {
  const op = params['op'];
  if (op === undefined || op === null || op === '') return 'budget';
  if (op === 'budget' || op === 'saving') return op;
  throw new BillPolicyError('POLICY_BAD_INPUT', 'op 非法（只认 budget／saving）：' + JSON.stringify(op));
}

/** 一个槽位：参数名／中文名／怎么给／是否必需。 */
export interface GoalSlot {
  readonly name: string;
  readonly label: string;
  readonly hint: string;
  readonly required: boolean;
}

/** 一处阻断：哪一格／中文名／为什么进不去（`没给` 与值不对共用一张表）。 */
export interface GoalBlocked {
  readonly name: string;
  readonly label: string;
  readonly why: string;
}

function slot(name: string, label: string, hint: string, required: boolean): GoalSlot {
  return { name, label, hint, required };
}

/** 「确认覆盖」那一格：老侧 `cli.py:143` 的 `--force`。它不是一个用户填的槽位，
 *  而是「同月同类预算已存在」这件事的出口，故单立一格（同账户域 `CHANGE_SLOT` 的处置）。 */
export const FORCE_SLOT: GoalSlot = slot('force', '确认覆盖', '已经有同月同类的预算时，要覆盖它就把这一格给上', true);

/** 写命令两支操作的槽位表（**唯一定义地**）：字段卡照它出，缺项探针照它算。
 *  中文名照老侧表单页的字段题头（`budget_form.html:58-68`／`saving_form.html:57-63`）。 */
export const GOAL_WRITE_SLOTS: Readonly<Record<GoalWriteOp, readonly GoalSlot[]>> = {
  'set-budget': [
    slot('amount', '金额', '每月的预算上限，写正数，如 3000', true),
    slot('month', '月份', '选填，如 2026-09；不填就是本月起', false),
    slot('category', '分类', '选填，如 餐饮；不填 = 全月总预算', false),
  ],
  'set-saving': [
    slot('name', '目标', '想存钱买什么，一句话说清，如 换手机', true),
    slot('amount', '金额', '目标总额，写正数，如 10000', true),
    slot('deadline', '截止日期', '选填，如 2026-12-31；不填 = 无截止日期', false),
  ],
};

/** 一个值算不算「给了」：`undefined`／`null`／`false`／空白串都不算。 */
export function isGiven(v: unknown): boolean {
  if (v === undefined || v === null || v === false) return false;
  return !(typeof v === 'string' && v.trim() === '');
}

/** 一个值写成文本（认字符串与有限数；其余形态一律当没给——不猜）。 */
export function textOf(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  return typeof v === 'number' && Number.isFinite(v) ? String(v) : '';
}

/** 数字解析：认数字与非空数字串；解析不了给 `null`（不在这里报错，报错归调用方）。 */
export function numberOf(v: unknown): number | null {
  if (v === undefined || v === null || typeof v === 'boolean') return null;
  const raw = typeof v === 'string' ? v.trim() : v;
  if (raw === '') return null;
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** 金额：正数（老侧 `cli.py:133`／`:227` 的「必须 > 0」）。给的是钱，负数与 0 都不成立。 */
export function validateAmount(raw: unknown): number {
  const n = numberOf(raw);
  if (n === null || n <= 0) {
    throw new BillPolicyError('POLICY_BAD_INPUT', '金额须为正数：' + JSON.stringify(raw));
  }
  return round2(n);
}

/** 本支写操作当下缺什么、哪一格的值进不去（**空数组＝可以往下走写库那一步**）。
 *  同月同类预算撞车那一处住 `./write.js` 的 `budgetBlockedOf`——本件只吃参数，不碰库与文件。 */
export function goalBlocked(op: GoalWriteOp, params: Record<string, unknown>): readonly GoalBlocked[] {
  const out: GoalBlocked[] = [];
  for (const s of GOAL_WRITE_SLOTS[op]) {
    if (s.required && !isGiven(params[s.name])) out.push({ name: s.name, label: s.label, why: '没给' });
  }
  if (isGiven(params['amount'])) {
    const n = numberOf(params['amount']);
    if (n === null || n <= 0) out.push({ name: 'amount', label: '金额', why: '要写正数（如 3000）' });
  }
  if (op === 'set-budget') {
    const month = textOf(params['month']);
    if (month !== '' && !MONTH_RE.test(month)) {
      out.push({ name: 'month', label: '月份', why: '要写成 2026-09 这样（年-月），不填就是本月' });
    }
    return out;
  }
  const deadline = textOf(params['deadline']);
  if (deadline !== '' && !isRealDate(deadline)) {
    out.push({ name: 'deadline', label: '截止日期', why: '要写成 2026-12-31 这样（年-月-日）' });
  }
  return out;
}

/** 一个日期串是不是真实日期（老侧 `cli.py:232-236` 的 `strptime` 同口径：2 月 30 这类要挡住）。 */
function isRealDate(s: string): boolean {
  try {
    normalizeDate(s, 'deadline');
    return true;
  } catch {
    return false;
  }
}

/** 设定预算的真值校验（阻断闸门放行之后才会走到这里）：金额为正数、月份归一（不给＝本月）、分类可空。
 *  `force` 不在这里判——它是不是必需，取决于库里有没有同月同类那一条（住 `./write.js`）。 */
export function validateSetBudget(params: Record<string, unknown>): { month: string; category: string; amount: number; force: boolean } {
  const amount = validateAmount(params['amount']);
  const month = params['month'] === undefined || params['month'] === null || params['month'] === ''
    ? localMonth() : normalizeMonth(params['month']);
  const category = typeof params['category'] === 'string' ? params['category'].trim() : '';
  return { month, category, amount, force: params['force'] === true };
}

/** 设定目标的真值校验：目标名必填、金额为正数、截止日可空（给了就须是真实日期）。 */
export function validateSetSaving(params: Record<string, unknown>): { name: string; amount: number; deadline: string | null } {
  const raw = params['name'];
  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new BillPolicyError('POLICY_MISSING_SLOT', '缺槽位 name（储蓄目标名）');
  }
  const amount = validateAmount(params['amount']);
  const deadline = params['deadline'] === undefined || params['deadline'] === null || params['deadline'] === ''
    ? null : normalizeDate(params['deadline'], 'deadline');
  return { name: raw.trim(), amount, deadline };
}
