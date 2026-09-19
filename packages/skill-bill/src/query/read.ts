/** 查询域四条命令的处理体（**从 `src/cli/cmd_read.ts` 归位到这里**）：
 *  `bill.record.today`（查今天／查昨天／查某天／查最近／查账单）／
 *  `bill.record.range`（查周／查月／查区间／查分类／查账户／查账本）／
 *  `bill.record.search`（搜备注／查标签／查欠款／查待报销／查分期）／
 *  `bill.record.detail`（查账单详情）。一条命令一处，出口 `src/cli/cmd_read.ts` 只查注册表再调本域的门。
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
import { normalizeDate, resolveQueryDate, resolveRange, yesterdayStr } from '../shared/dateRange.js';
import { needId } from '../shared/params.js';
import { projectWakeWord } from '../triggers/wakeTable.js';
import { calcKpi } from '../shared/kpi.js';
import { calcCategories } from '../analysis/index.js';
import { toBillItem } from './items.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { actionStamp } from '../shared/copyArea.js';
import { detailEnvelope, listEnvelope, queryListDoc } from './list.js';
import { queryDetailDoc } from './detail.js';
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

/** today 分支的空态四句（**唯一判地**）+ 查某天自指已摘（说「换个日子再查一次」而不是「查某天」）。 */
function todayEmpty(params: Record<string, unknown>): { readonly emptyText: string; readonly emptyHint: string } {
  if (params.date === 'yesterday') return { emptyText: '昨天还没有记录', emptyHint: '要补昨天那笔就说「记支出」。' };
  if (params.date !== undefined && params.date !== null && params.date !== '') return { emptyText: '这一天没有记录', emptyHint: '要记一笔就说「记支出」。换个日子再查一次。' };
  return { emptyText: '今天还没有记录', emptyHint: '要记一笔就说「记支出」。' };
}

/** `bill.record.today`：查今天／查昨天／查某天／查最近（`recent` ＋ `limit` 1~200）／查账单；当日无记录不是故障，照实出零行的页。 */
export function viewRecordToday(params: Record<string, unknown>, db: BillDb): ViewOut {
  const key = 'bill.record.today';
  if (params.recent === true) {
    const limit = params.limit === undefined ? 10 : params.limit;
    if (!Number.isInteger(limit) || (limit as number) < 1 || (limit as number) > 200) {
      throw new BillPolicyError('POLICY_BAD_INPUT', 'recent limit 须为 1~200 的整数：' + String(limit));
    }
    const records = fetchAll(db)
      .sort((a, b) => b.time.localeCompare(a.time) || b.id - a.id)
      .slice(0, limit as number);
    return listOut({
      key, params, wakeWord: todayWakeWord(params), window: '最近 ' + String(limit) + ' 笔（按时间倒序）', records,
      extra: { date: 'recent' },
      emptyText: '库里还没有记录',
      emptyHint: '要记一笔就说「记支出」。',
      windowStart: NO_WINDOW,
      windowEnd: NO_WINDOW,
    });
  }
  const date = params.date === 'yesterday' ? yesterdayStr() : resolveQueryDate(params);
  const records = listToday(db, date);
  const empty = todayEmpty(params);
  return listOut({
    key, params, wakeWord: todayWakeWord(params), window: date + ' 这一天', records,
    extra: { date },
    emptyText: empty.emptyText,
    emptyHint: empty.emptyHint,
    windowStart: date,
    windowEnd: date,
  });
}

/** #413 · 区间查的「今天」锚点（与卡路里 #250 同序，种子日期不写死）：显式 `today` 参数 ＞ 环境
 *  `BILL_TODAY` ＞ 机器时钟（UTC 日）。种子日期只活在参数／环境里，不进源码；测试一律传相对日期。
 *  下面两件是查询侧截到锚点的窗口（未来不计），与 `../shared/dateRange.js` 的 `weekRange／monthRange` 各管一摊。 */
function rangeAnchor(params: Record<string, unknown>): string {
  const t = params.today;
  if (t !== undefined && t !== null && t !== '') return normalizeDate(t, 'today');
  const pin = process.env['BILL_TODAY'];
  if (pin !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(pin)) return normalizeDate(pin, 'BILL_TODAY');
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
  if (params.range === 'week' || params.range === 'month') {
    const anchor = rangeAnchor(params);
    const { start, end } = params.range === 'week' ? weekWindowFrom(anchor) : monthWindowFrom(anchor);
    const records = fetchAll(db, { fromTime: start + ' 00:00:00', toTime: end + ' 23:59:59', ...cond });
    if (!records.length) throw new BillFetchError('BILL_EMPTY_RANGE', `区间无记录：${start}~${end}（缺失阻断，不返空统计）`);
    return listOut({
      key, params, wakeWord: projectWakeWord({ key, preset: params }),
      window: start + ' ~ ' + end + (params.range === 'week' ? '（本周）' : '（本月）'),
      records, extra: { start, end },
      emptyText: '这一段没有记录',
      emptyHint: '换个起止日期再查一次。',
      windowStart: start,
      windowEnd: end,
    });
  }
  if (params.start !== undefined || params.end !== undefined) {
    const { start, end } = resolveRange(params);
    const records = fetchAll(db, { fromTime: start + ' 00:00:00', toTime: end + ' 23:59:59', ...cond });
    if (!records.length) throw new BillFetchError('BILL_EMPTY_RANGE', `区间无记录：${start}~${end}（缺失阻断，不返空统计）`);
    return listOut({
      key, params, wakeWord: projectWakeWord({ key, preset: params }), window: start + ' ~ ' + end, records, extra: { start, end },
      emptyText: '这一段没有记录',
      emptyHint: '换个起止日期再查一次。',
      windowStart: start,
      windowEnd: end,
    });
  }
  if (category !== undefined || account !== undefined || ledger !== undefined) {
    const records = fetchAll(db, cond);
    if (!records.length) throw new BillFetchError('BILL_EMPTY_RANGE', '条件无记录（缺失阻断，不返空统计）');
    const by = category !== undefined ? '分类' : account !== undefined ? '账户' : '账本';
    const value = String(category ?? account ?? ledger);
    return listOut({
      key, params, wakeWord: projectWakeWord({ key, preset: params }), window: by + '＝' + value + '（全部时间）', records,
      extra: { start: '', end: '' },
      extraChips: category === undefined ? [] : [shareChip(db, records)],
      emptyText: '这个条件没有记录',
      emptyHint: '换个条件，或说「查区间」并给出起止日期。',
      windowStart: NO_WINDOW,
      windowEnd: NO_WINDOW,
    });
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
    records = fetchAll(db).filter(isInstallmentRow);
    label = 'installment';
    window = '分期还款的那些账';
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
  return listOut({
    key, params, wakeWord, window, records, extra: { kind: label },
    emptyText: '没有找到符合条件的记录',
    emptyHint: '换个关键词试试，也可以看看「查最近」。',
    windowStart: NO_WINDOW,
    windowEnd: NO_WINDOW,
  });
}

/** `bill.record.detail`：查账单详情（`id` 必给，#415 专属版式）。取数含软删行（`includeDeleted` 经取数
 *  公开接口）：真无此号才抛 `BILL_RECORD_NOT_FOUND`（exit 4），已撤销走整页＋已撤销徽，不冒充正常。
 *  载荷 `item` 照搬迁前形状（`toBillItem` 8 字段）原样保留，另加 `created_at／deleted_at` 两列
 *  （加法式，旧 8 字段一字不动）；页面字段表 10 列全交代，见 `./detail.js`。 */
export function viewRecordDetail(params: Record<string, unknown>, db: BillDb): ViewOut {
  const key = 'bill.record.detail';
  const id = needId(params);
  const row = fetchAll(db, { includeDeleted: true }).find((r) => r.id === id);
  if (!row) throw new BillFetchError('BILL_RECORD_NOT_FOUND', '无此账单：' + id);
  const data: QueryDetailData = { item: { ...toBillItem(row), created_at: row.created_at, deleted_at: row.deleted_at } };
  const deleted = row.deleted_at !== null && row.deleted_at !== '';
  return {
    data,
    html: queryDetailDoc({
      key,
      params,
      wakeWord: projectWakeWord({ key, preset: params }),
      window: row.time,
      chips: deleted ? ['记录编号 ' + row.id, '已撤销'] : ['记录编号 ' + row.id],
      row,
      envelope: detailEnvelope(key, data),
      source: SOURCE_QUERY,
      sourceText: SOURCE_TEXT_QUERY,
      actionAt: actionStamp(),
    }),
  };
}
