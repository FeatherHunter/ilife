/** 查询域四条命令的处理体（**从 `src/cli/cmd_read.ts` 归位到这里**）：
 *  `bill.record.today`（查今天／查昨天／查某天／查最近／查账单）／
 *  `bill.record.range`（查周／查月／查区间／查分类／查账户／查账本）／
 *  `bill.record.search`（搜备注／查标签／查欠款／查待报销／查分期）／
 *  `bill.record.detail`（查某编号的账）。一条命令一处，出口 `src/cli/cmd_read.ts` 只查注册表再调本域的门。
 * **红线（本域既有语义，本次搬迁一字不改，逐条有测试钉着）**：
 *   - 空查询不返全量：`search` 既没 `q` 也没 `kind` → exit 2；`range` 既没 start/end 也没条件 → exit 2；
 *   - 坏输入阻断不冒充正常：区间查不到记录 → exit 4（不出一张空表冒充「查过了」）；`detail` 查无此号 → exit 4；
 *   - `#tag` 精确匹配走取数层的 `listByTag`（本件不重写比对）；时间缺时分由 `../shared/dateRange.js` 补，本件不自己算日期。
 * 分工：取数走 `../fetch`；口径走 `../shared/`（分类／日期窗口／`id` 槽位／KPI）；分类聚合走 `../analysis/index.js` 门
 * （域→域只经对方的门）；行投影住 `./items.js`、整页装配走 `./list.js`——本件只做**编排与页面入参装配**。
 * 查询没有「阻断改出过程型页」那一支：缺参即错误回执，页面只在真取到数（哪怕是零行）时出。
 * （#689 结构搬迁第三批：`../policy/index.js` 与 `../render/views.js` 已拆散删除，上面这些名字各回新家。）
 */
import {
  DB_FILENAME, BillFetchError, fetchAll, listByTag, listToday, searchKeyword, tagMatch,
} from '../fetch/index.js';
import type { BillDb, BillRow } from '../fetch/index.js';
import { BillPolicyError } from '../fetch/errors.js';
import { validateCategory } from '../shared/category.js';
import { monthRange, normalizeDate, normalizeMonth, resolveQueryDate, resolveRange, yesterdayStr } from '../shared/dateRange.js';
import { needId } from '../shared/params.js';
import { projectWakeWord } from '../triggers/wakeTable.js';
import { calcKpi } from '../shared/kpi.js';
import { calcCategories } from '../analysis/index.js';
import { toBillItem } from './items.js';
import { filterInstallments } from './installmentFilter.js';
import { resolveLedgerWindow } from './ledgerWindow.js';
import { somedayTicketOut } from './ticket-day.js';
import { emptyTicketOut } from './ticket-empty.js';
import { accountTicketOut } from './ticketAccount.js';
import { categoryTicketOut } from './ticketCategory.js';
import { ledgerTicketOut } from './ticketLedger.js';
import { debtTicketOut } from './ticketDebt.js';
import { installmentTicketOut } from './ticketInstallment.js';
import { reimburseTicketOut } from './ticketReimburse.js';
import { intervalTicketOut } from './ticketInterval.js';
import { monthTicketOut } from './ticketMonth.js';
import { multiTicketOut } from './ticket-multi.js';
import { recentTicketOut } from './ticketRecent.js';
import { todayTicketOut } from './ticketToday.js';
import { weekTicketOut } from './ticketWeek.js';
import { yesterdayTicketOut } from './ticketYesterday.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { actionStamp } from '../shared/copyArea.js';
import { detailEnvelope, listEnvelope, queryListDoc } from './list.js';
import { queryDetailDoc } from './detail.js';
import { MULTI_COND } from './declaration.js';
import type { QueryCategoryRow, QueryDetailData, QueryListData, QueryTableRow } from './list.js';

/** 本次数据来源（复制日志第 3 段）：库文件名逐字取本包常量，共用件不取本包文件名。 */
const SOURCE_QUERY = DB_FILENAME + '（查询结果：只读，不改库）';

/** 来源脚注上屏的那句人话来源（与 `SOURCE_QUERY` 分住两个常量）：复制日志给机器看、可带库文件名；
 *  上屏的不许带库文件名与脚本路径（`688-融合基准.md` §四 裁定 1；老页脚恒印 `scripts/record_bill.py` 是反面）。 */
const SOURCE_TEXT_QUERY = '记账库（只读）';

/** 没有时间窗的查法（条件查、查最近）在来源脚注起止位写的那两个字——留空会读成缺值。 */
const NO_WINDOW = '不限';

/** 查分类的占比芯片（老页 `query_view.html:287` 的 `category_pct`）：该分类支出 ÷ 全库支出合计
 *  （查分类没有时间窗，「同期」＝全部时间）。**本域唯一一处页面侧第二次取数**，故单独成函数记账。 */
function shareChip(db: BillDb, records: readonly BillRow[]): string {
  const mine = calcKpi([...records]).expense;
  const all = calcKpi(fetchAll(db)).expense;
  const pct = all === 0 ? 0 : Math.round((mine / all) * 100);
  return '占全部支出的 ' + String(pct) + '%';
}

/** 一条库行 → 表格行（值一律文本化；金额照库里的符号写两位小数：支出负数、收入正数）。 */
function tableRow(r: BillRow): QueryTableRow {
  return {
    id: String(r.id),
    time: r.time,
    category: r.category,
    amount: r.amount.toFixed(2),
    account: r.account,
    ledger: r.ledger,
    note: r.note,
  };
}

/** 四条命令共用的收口：把「查到什么」装配成出口载荷（envelope `data`）＋ 一整页列表。
 *  **载荷与页面同源但不同形**：载荷那一份照搬迁前的字段与类型（`items` 走 `toBillItem`，`id`／`amount`
 *  是数，下游按 id 再查详情走的就是它）；页面那一份是文本化的表格行（`tableRow`）。两者同源同序。
 *  KPI 只算一次（`calcKpi`）；分类聚合走 `calcCategories`（同一份口径，本件不自己归堆），
 *  占比＝该分类支出 ÷ 本页支出合计。**页面侧多出的两件事实只在页面用、不进载荷**：
 *  `extraChips`（结果胶囊里除条数之外的读数，如查分类的占比芯片）与 `windowStart`／`windowEnd`
 *  （来源脚注的窗口起止）——载荷形状是既有契约，本票加法式不扩。 */
function listOut(input: {
  readonly key: string;
  readonly params: Record<string, unknown>;
  readonly wakeWord: string;
  readonly window: string;
  readonly records: readonly BillRow[];
  readonly extra: Omit<QueryListData, 'items' | 'total' | 'kpi'>;
  readonly emptyText: string;
  readonly emptyHint: string;
  /** 结果胶囊里除「共 N 笔」之外的读数（如查分类的占比芯片，老页 `category_pct`）。 */
  readonly extraChips?: readonly string[];
  /** 来源脚注的窗口起止（没有时间窗的查法给 `NO_WINDOW`）。 */
  readonly windowStart: string;
  readonly windowEnd: string;
}): ViewOut {
  const records = [...input.records];
  const rows = records.map(tableRow);
  const kpi = calcKpi(records);
  const categories: readonly QueryCategoryRow[] = kpi.expense === 0 ? [] : calcCategories(records).map((c) => ({
    label: c.category,
    amount: c.total,
    count: c.count,
    pct: (c.total / kpi.expense) * 100,
  }));
  const data: QueryListData = { items: records.map(toBillItem), total: records.length, ...input.extra, kpi };
  return {
    data,
    page: { wakeWord: input.wakeWord, kind: 'single' },
    html: queryListDoc({
      key: input.key,
      params: input.params,
      shape: 'list',
      wakeWord: input.wakeWord,
      window: input.window,
      chips: ['共 ' + records.length + ' 笔', ...(input.extraChips ?? [])],
      rows,
      kpi,
      categories,
      emptyText: input.emptyText,
      emptyHint: input.emptyHint,
      envelope: listEnvelope(input.key, data),
      source: SOURCE_QUERY,
      sourceText: SOURCE_TEXT_QUERY,
      windowStart: input.windowStart,
      windowEnd: input.windowEnd,
      actionAt: actionStamp(),
    }),
  };
}

/** today 分支的标题：这一页是哪条词由**域声明**算（#721 判据：一条唤醒词的字面量只准住它所属那份
 *  域声明）。recent 不进本支（上游已分流）。 */
function todayWakeWord(params: Record<string, unknown>): string {
  return projectWakeWord({ key: 'bill.record.today', preset: params });
}

/** 三个单日支的词（**本件不写字面量**：按域声明投影算回，判据见 `test/t721-判据与摘要锁.test.mjs`）。
 *  探针就是各支「靠什么认出来」：空参＝通用词那一支、`date:'yesterday'`＝昨天那一支；
 *  某天那一支的探针是**本次已解出的具体日期**（声明里那一支靠 `needs:['date']` 认），在 `viewRecordToday` 里按当次 `date` 算。 */
const DAY_WAKE_TODAY = projectWakeWord({ key: 'bill.record.today' });
const DAY_WAKE_YESTERDAY = projectWakeWord({ key: 'bill.record.today', preset: { date: 'yesterday' } });

/** today 分支的空态四句（**唯一判地**）+ 查某天自指已摘（说「换个日子再查一次」而不是「查某天」）。
 *  w02 查昨天 v2.1（`w02-查昨天-v2.1.html`：窗口 `date + ' 这一天'`／结论标准句／单类 100%，载荷键不动）。 */
function todayEmpty(params: Record<string, unknown>): { readonly emptyText: string; readonly emptyHint: string } {
  if (params.date === 'yesterday') return { emptyText: '昨天还没有记录', emptyHint: '要补昨天那笔就说「记支出」。' };
  if (params.date !== undefined && params.date !== null && params.date !== '') return { emptyText: '这一天没有记录', emptyHint: '要记一笔就说「记支出」。换个日子再查一次。' };
  return { emptyText: '今天还没有记录', emptyHint: '要记一笔就说「记支出」。' };
}

/** 查最近的排序档（与 `./declaration.js` 里 `sort` 的候选逐字同表）；空＝时间从近到远。
 *  金额档按**绝对值**排：支出在库里记负数，用户说的「金额大」是面额大，不该把大额支出排到大额收入后面。 */
const RECENT_SORTS = ['时间从近到远', '时间从远到近', '金额从大到小', '金额从小到大'] as const;
type RecentSort = (typeof RECENT_SORTS)[number];

function recentSortOf(raw: unknown): RecentSort {
  if (raw === undefined || raw === null || raw === '') return RECENT_SORTS[0];
  const v = typeof raw === 'string' ? raw.trim() : '';
  if (!(RECENT_SORTS as readonly string[]).includes(v)) {
    throw new BillPolicyError('POLICY_BAD_INPUT', '排序只认：' + RECENT_SORTS.join('、') + '；收到 ' + String(raw));
  }
  return v as RecentSort;
}

function orderRecent(rows: readonly BillRow[], sort: RecentSort): BillRow[] {
  const timeDesc = (a: BillRow, b: BillRow): number => b.time.localeCompare(a.time) || b.id - a.id;
  const out = rows.slice();
  if (sort === '时间从近到远') return out.sort(timeDesc);
  if (sort === '时间从远到近') return out.sort((a, b) => a.time.localeCompare(b.time) || a.id - b.id);
  if (sort === '金额从大到小') return out.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount) || timeDesc(a, b));
  return out.sort((a, b) => Math.abs(a.amount) - Math.abs(b.amount) || timeDesc(a, b));
}

/** 锚点往前数 `days` 天（含锚点当天：近 7 天＝锚点－6 .. 锚点，与页面那句「最近 7 天（A ~ B）」同式）。 */
function daysBefore(anchor: string, days: number): string {
  const t = Date.parse(anchor + 'T12:00:00Z');
  return new Date(t - (days - 1) * 86400000).toISOString().slice(0, 10);
}

/** 查周的槽位值 → 时间窗（`./declaration.js` 的 `week` 槽，HELP 侧是 ISO 周选择器）：
 *  空／「本周」＝周一..锚点（未来不计，与改前同）；「上周」「上上周」＝整周往前退；
 *  `YYYY-Www`（ISO 周，周选择器写的就是这个形状）＝那一周的周一..周日。 */
function weekWindowOf(raw: unknown, anchor: string): { readonly start: string; readonly end: string; readonly label: string } {
  const v = typeof raw === 'string' ? raw.trim() : '';
  if (v === '' || v === '本周') return { ...weekWindowFrom(anchor), label: '本周' };
  if (v === '上周') return { ...shiftWeek(anchor, -1), label: '上周' };
  if (v === '上上周') return { ...shiftWeek(anchor, -2), label: '上上周' };
  const m = /^(\d{4})-W(\d{2})$/.exec(v);
  if (!m) throw new BillPolicyError('POLICY_BAD_TIME', '周只认 ISO 周（如 2026-W42）或 本周／上周／上上周：' + v);
  const year = Number(m[1]);
  const week = Number(m[2]);
  if (week < 1 || week > 53) throw new BillPolicyError('POLICY_BAD_TIME', 'ISO 周号须在 1~53：' + v);
  /* ISO 周 1 是含 1 月 4 日的那一周（周一为第一天）；不自己发明数法。 */
  const jan4 = Date.UTC(year, 0, 4);
  const back = (new Date(jan4).getUTCDay() + 6) % 7;
  const mon = jan4 - back * 86400000 + (week - 1) * 7 * 86400000;
  const start = new Date(mon).toISOString().slice(0, 10);
  const end = new Date(mon + 6 * 86400000).toISOString().slice(0, 10);
  const cur = weekWindowFrom(anchor);
  /* 选到本周那一周：与「本周」同口径（周一..锚点，未来不计），免得窗口写到一个还没到的周日。 */
  if (start === cur.start) return { ...cur, label: '本周' };
  return { start, end, label: '这一周' };
}

/** 锚点所在周的周一往前退 `n` 周的整周（上周／上上周）。 */
function shiftWeek(anchor: string, n: number): { readonly start: string; readonly end: string } {
  const { start } = weekWindowFrom(anchor);
  const t = Date.parse(start + 'T12:00:00Z') + n * 7 * 86400000;
  return { start: new Date(t).toISOString().slice(0, 10), end: new Date(t + 6 * 86400000).toISOString().slice(0, 10) };
}

/** 查月的槽位值 → 时间窗（`./declaration.js` 的 `month` 槽，HELP 侧是月度选择器）：
 *  空／「本月」＝月初..锚点（未来不计，与改前同）；「上月」＝上个整月；`YYYY-MM`＝那个整月。 */
function monthWindowOf(raw: unknown, anchor: string): { readonly start: string; readonly end: string; readonly label: string } {
  const v = typeof raw === 'string' ? raw.trim() : '';
  if (v === '' || v === '本月') return { ...monthWindowFrom(anchor), label: '本月' };
  if (v === '上月' || v === '上个月') {
    const y = Number(anchor.slice(0, 4));
    const m = Number(anchor.slice(5, 7));
    const pm = m === 1 ? 12 : m - 1;
    const py = m === 1 ? y - 1 : y;
    const { start, end } = monthRange(String(py) + '-' + String(pm).padStart(2, '0'));
    return { start, end, label: '上月' };
  }
  const key = normalizeMonth(v, 'month');
  /* 选到本月：与「本月」同口径（月初..锚点，未来不计）。 */
  if (key === anchor.slice(0, 7)) return { ...monthWindowFrom(anchor), label: '本月' };
  const { start, end } = monthRange(key);
  return { start, end, label: '这个月' };
}

/** `bill.record.today`：查今天／查昨天／查某天／查最近（`recent` ＋ `limit` 1~200）／查账单；当日无记录不是故障，照实出零行的页。 */
export function viewRecordToday(params: Record<string, unknown>, db: BillDb): ViewOut {
  const key = 'bill.record.today';
  if (params.recent === true) {
    const sort = recentSortOf(params.sort);
    const daysRaw = params.recent_days;
    if (daysRaw !== undefined && params.limit !== undefined) {
      throw new BillPolicyError('POLICY_BAD_INPUT', '条数与近几天二选一，不能同时给（HELP 里这两格同组互斥）');
    }
    const all = fetchAll(db);
    let records: BillRow[];
    let head: string;
    let window: string;
    if (daysRaw !== undefined) {
      const days = typeof daysRaw === 'number' ? daysRaw : Number(daysRaw);
      if (!Number.isInteger(days) || days < 1 || days > 365) {
        throw new BillPolicyError('POLICY_BAD_INPUT', 'recent_days 须为 1~365 的整数：' + String(daysRaw));
      }
      const anchor = new Date().toISOString().slice(0, 10);
      const from = daysBefore(anchor, days);
      records = orderRecent(all.filter((r) => r.time.slice(0, 10) >= from && r.time.slice(0, 10) <= anchor), sort);
      head = String(days) + ' 天';
      window = '最近 ' + head + '（' + from + ' ~ ' + anchor + (sort === '时间从近到远' ? '' : '；' + sort) + '）';
    } else {
      const limit = params.limit === undefined ? 10 : params.limit;
      if (!Number.isInteger(limit) || (limit as number) < 1 || (limit as number) > 200) {
        throw new BillPolicyError('POLICY_BAD_INPUT', 'recent limit 须为 1~200 的整数：' + String(limit));
      }
      /* 先取「最近 N 笔」（按时间倒序切窗），再按用户选的档排展示序：排序说的是这一页怎么摆，不是改取哪几笔。 */
      const newest = all.slice().sort((a, b) => b.time.localeCompare(a.time) || b.id - a.id).slice(0, limit as number);
      records = orderRecent(newest, sort);
      head = String(limit) + ' 笔';
      window = '最近 ' + head + '（' + (sort === '时间从近到远' ? '按时间倒序' : sort) + '）';
    }
    if (records.length > 0) {
      return recentTicketOut({
        key, params, wakeWord: todayWakeWord(params), window, records, head,
      });
    }
    // 零行不再回落老列表路：走票据纸空态（形状照 w00 判地，空态句一字不动）。
    return emptyTicketOut({
      key, params, wakeWord: todayWakeWord(params), window,
      date: 'recent',
      emptyText: '库里还没有记录',
      emptyHint: '要记一笔就说「记支出」。',
    });
  }
  const date = params.date === 'yesterday' ? yesterdayStr() : resolveQueryDate(params);
  const records = listToday(db, date);
  const wakeWord = todayWakeWord(params);
  const somedayWord = projectWakeWord({ key: 'bill.record.today', preset: { date } });
  // 零行：五个场景（查今天／查昨天／查某天／查最近／查账单）同收口到**票据纸空态**（形状照 w00 判地
  // `proto/query/w00-空态-查某天无记录-v2.1.html`；空态四句一字不动，走 `./ticket-empty.js`）。
  if (records.length === 0) {
    const empty = todayEmpty(params);
    return emptyTicketOut({
      key, params, wakeWord, window: date + ' 这一天', date,
      emptyText: empty.emptyText, emptyHint: empty.emptyHint,
    });
  }
  // w01 查今天 v2.1 票据纸（`w01-查今天-v2.1.html`）：唤醒词是查今天（有数）走本页票据。
  if (wakeWord === DAY_WAKE_TODAY) {
    const ticket = todayTicketOut({
      key, params, wakeWord, window: date + ' 这一天', date, records,
      emptyText: '今天还没有记录', emptyHint: '要记一笔就说「记支出」。',
    });
    if (ticket !== null) return ticket;
  }
  const empty = todayEmpty(params);
  // w02 查昨天 v2.1 票据纸（`w02-查昨天-v2.1.html`）：唤醒词是查昨天（有数）走本页票据。
  if (wakeWord === DAY_WAKE_YESTERDAY) {
    const ticket = yesterdayTicketOut({
      key, params, wakeWord, window: date + ' 这一天', date, records,
      emptyText: empty.emptyText, emptyHint: empty.emptyHint,
    });
    if (ticket !== null) return ticket;
  }
  // w03 查某天 v2.1 票据纸（`w03-查某天-v2.1.html`）：唤醒词是查某天（有数）走本页票据。
  if (wakeWord === somedayWord) {
    const ticket = somedayTicketOut({
      key, params, wakeWord, window: date + ' 这一天', date, records,
      emptyText: empty.emptyText, emptyHint: empty.emptyHint,
    });
    if (ticket !== null) return ticket;
  }
  /* 三条票据出口各按体积裁行（`./pageFit.js`），零行已在上面收口，回到这里没有任何可达输入：
     唤醒词只可能是查今天／查昨天／查某天三条之一。留一条大声失败兜住将来新增单日词时忘配页面的改动，
     不回落到中性列表页（票 #1269，用户 2026-10-13 定）。 */
  throw new BillPolicyError('POLICY_BAD_INPUT', '单日支的唤醒词没有对应的票据页：' + wakeWord);
}

/** #413 · 区间查的「今天」锚点（与卡路里 #250 同序，种子日期不写死）：显式 `today` 参数 ＞ 机器时钟（UTC 日）。
 *  #726：`BILL_TODAY` 那个环境 pin 随「环境变量全部删掉」（#675）一并退役——测试要钉钟就走测试基座的
 *  钉钟预载件（`test/helpers/config-base.mjs` 的 `freezeClock()`／`freeze-clock.cjs`），不进源码。
 *  下面两件是查询侧截到锚点的窗口（未来不计），与 `../shared/dateRange.js` 的 `weekRange／monthRange` 各管一摊。 */
function rangeAnchor(params: Record<string, unknown>): string {
  const t = params.today;
  if (t !== undefined && t !== null && t !== '') return normalizeDate(t, 'today');
  return new Date().toISOString().slice(0, 10);
}

/** #413 · 周一..锚点（UTC，周一为第一天；截到锚点，未来不计，与 #250「本周」同义）。 */
function weekWindowFrom(anchor: string): { start: string; end: string } {
  const t = Date.parse(anchor + 'T12:00:00Z');
  const back = (new Date(t).getUTCDay() + 6) % 7;
  const mon = new Date(t - back * 86400000).toISOString().slice(0, 10);
  return { start: mon, end: anchor };
}

/** #413 · 月初..锚点（月初到锚点，未来不计，与 #250「本月」同义）。 */
function monthWindowFrom(anchor: string): { start: string; end: string } {
  return { start: anchor.slice(0, 8) + '01', end: anchor };
}

/** #413 · 单条件取值：缺席→undefined；空串／全空格／非串→阻断 exit 2——空值不许悄悄退化成
 *  无条件全量（取数层 `fetchAll` 遇空串会忽略该条件，G2-2 穿透）。 */
function condValue(params: Record<string, unknown>, field: string): string | undefined {
  const v = params[field];
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'string' || !v.trim()) {
    throw new BillPolicyError('POLICY_BAD_INPUT', field + ' 不得为空（空查询不返全量）');
  }
  return v.trim();
}

/** 多条件分支的时间窗：周／月锚点、起止日，或「全部时间」（不带时间时 start／end 两支写空串，
 *  与区间那一族「单条件两支都写空串」同口径）。`timed`＝这一页是不是按时间窗取的数。 */
function multiWindowOf(params: Record<string, unknown>): { readonly start: string; readonly end: string; readonly text: string; readonly timed: boolean } {
  if (params.range === 'week' || params.range === 'month') {
    const anchor = rangeAnchor(params);
    const w = params.range === 'week' ? weekWindowFrom(anchor) : monthWindowFrom(anchor);
    return { ...w, text: w.start + ' ~ ' + w.end + (params.range === 'week' ? '（本周）' : '（本月）'), timed: true };
  }
  if (params.start !== undefined || params.end !== undefined) {
    const { start, end } = resolveRange(params);
    return { start, end, text: start + ' ~ ' + end, timed: true };
  }
  return { start: '', end: '', text: '全部时间', timed: false };
}

/** 多条件页副题里的条件串（与单条件那几支的 `by + '＝' + value` 同字：`分类＝餐饮 · 账户＝招行`）。 */
function conditionLineOf(input: { readonly category?: string; readonly account?: string; readonly ledger?: string }): string {
  const parts: string[] = [];
  if (input.category !== undefined) parts.push('分类＝' + input.category);
  if (input.account !== undefined) parts.push('账户＝' + input.account);
  if (input.ledger !== undefined) parts.push('账本＝' + input.ledger);
  return parts.join(' · ');
}

/** `bill.record.range`：查周／查月（`range`＋锚点）／查区间（`start`＋`end` 同给，缺一即 exit 2）／
 *  查分类（三级，无 / 视为 L1）／查账户／查账本（只过滤：KPI 照窗内收支、转账除外，余额无关）。
 *  区间查不到记录 → 阻断（exit 4），不返一张空表冒充正常。 */
export function viewRecordRange(params: Record<string, unknown>, db: BillDb): ViewOut {
  const key = 'bill.record.range';
  const rawCategory = condValue(params, 'category');
  const category = rawCategory === undefined ? undefined : validateCategory(rawCategory);
  const account = condValue(params, 'account');
  const ledger = condValue(params, 'ledger');
  const cond = { category, account, ledger };
  /* 多条件页（票 #1269，用户 2026-10-13 裁定「新增一个支持多个条件查询的场景」）：
     ① 用户点的就是「查多条件」那条词——`params.cond` 是那条词条 `preset` 里的投影标记（`./declaration.js` 的
        `MULTI_COND`，值只在那里写一次）；② 或者一次给了两个及以上条件（分类／账户／账本任二）。
     单条件那几张票据纸的副题只说得清一个条件，两个条件同给时不落它们。一条条件都没有时不进这一支
     （落回下面各支：只给时间＝查区间那一族，什么都没有＝末尾那条阻断）。 */
  const condCount = [category, account, ledger].filter((v) => v !== undefined).length;
  if (condCount >= 1 && (params.cond === MULTI_COND || condCount >= 2)) {
    const time = multiWindowOf(params);
    const records = time.timed
      ? fetchAll(db, { ...cond, fromTime: time.start + ' 00:00:00', toTime: time.end + ' 23:59:59' })
      : fetchAll(db, cond);
    if (!records.length) throw new BillFetchError('BILL_EMPTY_RANGE', '条件无记录（缺失阻断，不返空统计）');
    return multiTicketOut({
      key, params, wakeWord: projectWakeWord({ key, preset: params }),
      window: conditionLineOf({ category, account, ledger }) + '（' + time.text + '）',
      records, start: time.start, end: time.end,
    });
  }
  if ((params.range === 'week' || params.range === 'month') && ledger === undefined) {
    const anchor = rangeAnchor(params);
    /* 槽位给了就用槽位（HELP 侧的周／月选择器写的 `2026-W42`／`2026-10`，或手打的「上周」「上月」），
       没给才按锚点算「本周」「本月」——#1269 条目 5：查某周／查某月要真的能选到哪一周／哪一月。 */
    const picked = params.range === 'week' ? weekWindowOf(params.week, anchor) : monthWindowOf(params.month, anchor);
    const { start, end, label } = picked;
    const records = fetchAll(db, { fromTime: start + ' 00:00:00', toTime: end + ' 23:59:59', ...cond });
    if (!records.length) throw new BillFetchError('BILL_EMPTY_RANGE', `区间无记录：${start}~${end}（缺失阻断，不返空统计）`);
    const wakeWord = projectWakeWord({ key, preset: params });
    const window = start + ' ~ ' + end + '（' + label + '）';
    if (params.range === 'month') {
      return monthTicketOut({ key, params, wakeWord, window, records, start, end, label }); // w07 查月 v2.1 票据纸（.scratch/1019-p-query/w07-查月-v2.1.html manifest seq6）：结论64%／占比64-36／载荷键不动
    }
    return weekTicketOut({ key, params, wakeWord, window, records, start, end, label }); // w06 查周 v2.1 票据纸（.scratch/1019-p-query/w06-查周-v2.1.html manifest seq5）：H2本周／主数字本周支出／结论64%／占比64-36／载荷键不动
  }
  /* 带 `ledger` 条件时不走上面两支：账本要出「查账本」票据纸（w11），时间窗交给下面 `ledger`
     分支的 `resolveLedgerWindow` 解（它认 `start`／`end`／`range` 这一组通用时间位）。
     否则「账本＝旅行 ＋ 5 月」会被区间分支先接走、渲染成「查区间」票据纸（2026-10-13 实测）。 */
  if ((params.start !== undefined || params.end !== undefined) && ledger === undefined) {
    const { start, end } = resolveRange(params);
    const records = fetchAll(db, { fromTime: start + ' 00:00:00', toTime: end + ' 23:59:59', ...cond });
    if (!records.length) throw new BillFetchError('BILL_EMPTY_RANGE', `区间无记录：${start}~${end}（缺失阻断，不返空统计）`);
    return intervalTicketOut({ // w08 查区间 v2.1 票据纸（.scratch/1019-p-query/w08-查区间-v2.1.html manifest seq7）：H2缩短／日期一处／结论41%／占比41-24-19-7-5-4／载荷键不动
      key, params, wakeWord: projectWakeWord({ key, preset: params }), window: start + ' ~ ' + end, records, start, end,
    });
  }
  if (category !== undefined || account !== undefined || ledger !== undefined) {
    const records = fetchAll(db, cond);
    if (!records.length) throw new BillFetchError('BILL_EMPTY_RANGE', '条件无记录（缺失阻断，不返空统计）');
    const by = category !== undefined ? '分类' : account !== undefined ? '账户' : '账本';
    const value = String(category ?? account ?? ledger);
    const wakeWord = projectWakeWord({ key, preset: params });
    const window = by + '＝' + value + '（全部时间）';
    if (account !== undefined && category === undefined && ledger === undefined) {
      return accountTicketOut({ key, params, wakeWord, window, records, account }); // w10 查账户 v2.1 票据纸（原型 w10-查账户-v2.1.html：结论80%／占比80/10/7/3／载荷键不动）
    }
    if (ledger !== undefined && category === undefined && account === undefined) {
      /* 走到这里必定是「账本」单条件查询：唤醒词按「只有账本这一条线索」投影——`projectWakeWord`
         若吃全量 `params`，`{ledger,start,end}` 里的 `start`/`end` 会让「查区间」抢先（词条顺序在前），
         交付文件名就会写成「饼干记账_查区间_*.html」而内容却是账本票据纸（2026-10-13 实测）。
         不写字面量：唤醒词只准由域声明派生（t721「整串字面量命中即红」）。 */
      const ledgerWord = projectWakeWord({ key, preset: { ledger } });
      const win = resolveLedgerWindow(params, typeof params.today === 'string' ? params.today : undefined);
      if (win === null) {
        return ledgerTicketOut({ key, params, wakeWord: ledgerWord, window, records, ledger }); // w11 查账本 v2.1 票据纸（原型 w11-查账本-v2.1.html：结论100%单条／载荷键不动）
      }
      const timed = fetchAll(db, { ...cond, fromTime: win.start + ' 00:00:00', toTime: win.end + ' 23:59:59' });
      if (!timed.length) throw new BillFetchError('BILL_EMPTY_RANGE', `区间无记录：${win.start}~${win.end}（缺失阻断，不返空统计）`);
      const timeLabel = win.start === win.end ? win.start + ' 这一天' : win.start + ' ~ ' + win.end + (win.tag !== '' ? '，' + win.tag : '');
      return ledgerTicketOut({ key, params, wakeWord: ledgerWord, window: '账本＝' + ledger + '（' + timeLabel + '）', records: timed, ledger }); // 1275 四段：周／月／年／区间（开始＝结束即某天）
    }
    if (category !== undefined && account === undefined && ledger === undefined) {
      const mine = calcKpi([...records]).expense;
      const all = calcKpi(fetchAll(db)).expense;
      const sharePct = all === 0 ? 0 : Math.round((mine / all) * 100);
      return categoryTicketOut({ key, params, wakeWord, window, records, category: value, sharePct }); // w09 查分类 v2.1 票据纸（原型 w09-查分类-v2.1.html manifest seq8：结论83%／占比83-17／占全部26%并入占比区／载荷键不动）
    }
    /* 走到这里没有任何可达输入：两个及以上条件在函数开头就进了多条件页（票 #1269，用户 2026-10-13 定的
       「不再有中性列表页」），单条件在上面三支里各自收口（账户／账本／分类）。留一条大声失败兜住将来
       新增条件时忘了配页面的改动，不回落到中性列表页。 */
    throw new BillPolicyError('POLICY_BAD_INPUT', '条件组合没有对应的票据页（分类／账户／账本任一单条件或任二及以上）');
  }
  throw new BillPolicyError('POLICY_BAD_INPUT', '缺槽位 start/end（或 range=week/month，或 category/account/ledger 条件）');
}

/** #414 · 查欠款行判（**唯一判地**）：借贷分类或带 `#未还` 精确，且未带 `#已还` 精确——收回／偿还后
 *  原记录分类仍是 `借贷/*`（换的只是 tag），不排除就把还清的也算成还欠着。 */
function isDebtRow(r: BillRow): boolean {
  return (r.category.startsWith('借贷/') || tagMatch(r.note, '未还')) && !tagMatch(r.note, '已还');
}

/** #414 · 查待报销行判（**唯一判地**）：带 `#待报销` 精确且未带 `#已报销` 精确（到账后消补）。 */
function isReimburseRow(r: BillRow): boolean {
  return tagMatch(r.note, '待报销') && !tagMatch(r.note, '已报销');
}

/** #414 · 查分期行判（**唯一判地**）：分期分类或带 `#分期`／`#分期中` 精确（写侧记分期不落 `#tag`，
 *  分类是主口径，两串并存）。 */
function isInstallmentRow(r: BillRow): boolean {
  return r.category.startsWith('分期/') || tagMatch(r.note, '分期') || tagMatch(r.note, '分期中');
}

/** `bill.record.search`：搜备注（`q` 必给）／查标签（`kind:"tag"` ＋ `tag` 必给，精确匹配）／
 *  查欠款／查待报销／查分期。空查询不返全量：既没 `q` 也没 `kind` → exit 2。 */
export function viewRecordSearch(params: Record<string, unknown>, db: BillDb): ViewOut {
  const key = 'bill.record.search';
  const kind = params.kind === undefined ? '' : String(params.kind);
  let records: BillRow[];
  let window: string;
  let label: string;
  if (kind === 'tag') {
    const rawTag = params.tag;
    if (typeof rawTag !== 'string' || !rawTag.trim()) {
      throw new BillPolicyError('POLICY_BAD_INPUT', '查标签须给 tag');
    }
    const tag = rawTag.trim();
    records = listByTag(db, tag);
    label = 'tag:' + tag;
    window = '标签 ' + tag + '（精确匹配）';
  } else if (kind === 'debt') {
    records = fetchAll(db).filter(isDebtRow);
    label = 'debt';
    window = '还欠着的那些账';
  } else if (kind === 'reimburse') {
    records = fetchAll(db).filter(isReimburseRow);
    label = 'reimburse';
    window = '等着报销的那些账';
  } else if (kind === 'installment') {
    const base = fetchAll(db).filter(isInstallmentRow);
    // 1276 条目 14：三个可选维度（名目／账户／状态）。全缺席＝原样返回（存量行为不动）；
    // 非法 status 即 exit 2（坏输入阻断，不冒充正常）。HELP 表单名 `item_name` 直传，另认 `item` 别名。
    const rawItem = params.item_name ?? params.item;
    let filtered: BillRow[];
    try {
      filtered = filterInstallments(base, { itemName: rawItem, account: params.account, status: params.status });
    } catch (e) {
      throw new BillPolicyError('POLICY_BAD_INPUT', e instanceof Error ? e.message : String(e));
    }
    records = filtered;
    label = 'installment';
    const bits: string[] = [];
    if (typeof rawItem === 'string' && rawItem.trim() !== '') bits.push('名目含「' + rawItem.trim() + '」');
    if (typeof params.account === 'string' && (params.account as string).trim() !== '') bits.push('账户＝' + (params.account as string).trim());
    if (typeof params.status === 'string' && (params.status as string).trim() !== '' && (params.status as string).trim() !== '全部') bits.push((params.status as string).trim());
    window = bits.length === 0 ? '分期还款的那些账' : '分期还款的那些账（' + bits.join('、') + '）';
  } else {
    const rawQ = params.q;
    if (typeof rawQ !== 'string' || !rawQ.trim()) {
      throw new BillPolicyError('POLICY_BAD_INPUT', '搜备注须给 q');
    }
    const q = rawQ.trim();
    records = searchKeyword(db, q);
    label = 'search:' + q;
    window = '备注里有「' + q + '」的记录';
  }
  // 这一页是哪条词（查标签／查欠款／查待报销／查分期／搜备注）由**域声明**按同一份入参算，本件不写第二处。
  const wakeWord = projectWakeWord({ key, preset: params });
  if (kind === 'debt' && records.length > 0) {
    return debtTicketOut({ key, params, wakeWord, window, records });
  }
  if (kind === 'installment' && records.length > 0) {
    return installmentTicketOut({ key, params, wakeWord, window, records });
  }
  if (kind === 'reimburse' && records.length > 0) {
    return reimburseTicketOut({ key, params, wakeWord, window, records });
  }
  return listOut({
    key, params, wakeWord, window, records, extra: { kind: label },
    emptyText: '没有找到符合条件的记录',
    emptyHint: '换个关键词试试，也可以看看「查最近」。',
    windowStart: NO_WINDOW,
    windowEnd: NO_WINDOW,
  });
}

/** `bill.record.detail`：查某编号的账（`id` 必给，#415 专属版式）。取数含软删行（`includeDeleted` 经取数
 *  公开接口）：真无此号才抛 `BILL_RECORD_NOT_FOUND`（exit 4），已撤销走整页＋已撤销徽，不冒充正常。
 *  载荷 `item` 照搬迁前形状（`toBillItem` 8 字段）原样保留，另加 `created_at／deleted_at` 两列
 *  （加法式，旧 8 字段一字不动）；页面字段表 10 列全交代，见 `./detail.js`。 */
export function viewRecordDetail(params: Record<string, unknown>, db: BillDb): ViewOut {
  const key = 'bill.record.detail';
  const id = needId(params);
  const row = fetchAll(db, { includeDeleted: true }).find((r) => r.id === id);
  if (!row) throw new BillFetchError('BILL_RECORD_NOT_FOUND', '无此账单：' + id);
  const data: QueryDetailData = { item: { ...toBillItem(row), created_at: row.created_at, deleted_at: row.deleted_at } };
  const wakeWord = projectWakeWord({ key, preset: params });
  return {
    data,
    page: { wakeWord, kind: 'single' },
    html: queryDetailDoc({
      key,
      params,
      wakeWord,
      row,
      envelope: detailEnvelope(key, data),
      source: SOURCE_QUERY,
      actionAt: actionStamp(),
    }),
  };
}
