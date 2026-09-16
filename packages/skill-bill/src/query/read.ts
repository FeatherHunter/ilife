/** 查询域四条命令的处理体（**从 `src/cli/cmd_read.ts` 归位到这里**）：
 *  `bill.record.today`（查今天／查昨天／查某天／查最近／查账单）／
 *  `bill.record.range`（查周／查月／查区间／查分类／查账户／查账本）／
 *  `bill.record.search`（搜备注／查标签／查欠款／查待报销／查分期）／
 *  `bill.record.detail`（查账单详情）。一条命令一处，出口 `src/cli/cmd_read.ts` 只查注册表再调本域的门。
 *
 * **红线（本域既有语义，本次搬迁一字不改，逐条有测试钉着）**：
 *   - 空查询不返全量：`search` 既没 `q` 也没 `kind` → exit 2；`range` 既没 start/end 也没条件 → exit 2；
 *   - 坏输入阻断不冒充正常：区间查不到记录 → exit 4（不出一张空表冒充「查过了」）；`detail` 查无此号 → exit 4；
 *   - `#tag` 精确匹配走取数层的 `listByTag`（本件不重写比对）；
 *   - 时间缺时分由 `../policy` 的 `resolveQueryDate`／`resolveRange` 补，本件不自己算日期。
 *
 * 分工：取数走 `../fetch`、口径走 `../policy`、整页装配走 `./list.js`；本件只做**编排与页面入参装配**。
 * KPI 的四项口径（`calcKpi`）与行投影（`toBillItem`）引 `../render/views.js` 的同名件——
 * 分析域三条命令与写域回执也在用同一份，本票不搬它（那是「读命令搬迁」整条线的账，记在这里作**搬迁债务**）。
 * 与写命令的处理体（`../record/write.ts`）不同的一点：查询没有「阻断改出过程型页」那一支——
 * 查询缺参就是缺参，阻断即错误回执，页面只在真取到数（哪怕是零行）时出。
 */
import {
  DB_FILENAME, BillFetchError, fetchAll, getById, listByTag, listToday, searchKeyword,
} from '../fetch/index.js';
import type { BillDb, BillRow } from '../fetch/index.js';
import { BillPolicyError } from '../fetch/errors.js';
import { monthRange, needId, resolveQueryDate, resolveRange, weekRange, yesterdayStr } from '../policy/index.js';
import { calcKpi, toBillItem } from '../render/views.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { actionStamp } from '../shared/copyArea.js';
import { detailEnvelope, listEnvelope, queryListDoc } from './list.js';
import type { QueryDetailData, QueryListData, QueryTableRow } from './list.js';

/** 本次数据来源（复制日志第 3 段）：库文件名逐字取本包常量，共用件不取本包文件名。 */
const SOURCE_QUERY = DB_FILENAME + '（查询结果：只读，不改库）';

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
 *  **载荷与页面同源但不同形**：载荷那一份照搬迁前的字段与类型（`items` 走 `toBillItem`，`id`／`amount` 是数，
 *  下游按 id 再查详情走的就是它）；页面那一份是文本化的表格行（`tableRow`）。两者都由同一个 `records` 派生。
 *  KPI 只算一次（`calcKpi`），既进载荷也进页面的 KPI 行。 */
function listOut(input: {
  readonly key: string;
  readonly params: Record<string, unknown>;
  readonly wakeWord: string;
  readonly window: string;
  readonly records: readonly BillRow[];
  readonly extra: Omit<QueryListData, 'items' | 'total' | 'kpi'>;
  readonly emptyText: string;
  readonly emptyHint: string;
}): ViewOut {
  const records = [...input.records];
  const rows = records.map(tableRow);
  const kpi = calcKpi(records);
  const data: QueryListData = { items: records.map(toBillItem), total: records.length, ...input.extra, kpi };
  return {
    data,
    html: queryListDoc({
      key: input.key,
      params: input.params,
      shape: 'list',
      wakeWord: input.wakeWord,
      window: input.window + ' · 共 ' + records.length + ' 笔',
      rows,
      kpi,
      emptyText: input.emptyText,
      emptyHint: input.emptyHint,
      envelope: listEnvelope(input.key, data),
      source: SOURCE_QUERY,
      actionAt: actionStamp(),
    }),
  };
}

/** today 分支的标题判（**唯一判地**）：recent 不进本支（上游已分流）；
 *  yesterday→查昨天／显式 date→查某天／无参→查今天（查账单别名同页，无入口标记）。 */
function todayWakeWord(params: Record<string, unknown>): string {
  if (params.date === 'yesterday') return '查昨天';
  if (params.date !== undefined && params.date !== null && params.date !== '') return '查某天';
  return '查今天';
}

/** today 分支的空态四句（**唯一判地**）：今天／昨天／某天／最近各一句；
 *  查某天自指已摘（不说「查某天」，说换个日子再查一次）。 */
function todayEmpty(params: Record<string, unknown>): { readonly emptyText: string; readonly emptyHint: string } {
  if (params.date === 'yesterday') return { emptyText: '昨天还没有记录', emptyHint: '要补昨天那笔就说「记支出」。' };
  if (params.date !== undefined && params.date !== null && params.date !== '') return { emptyText: '这一天没有记录', emptyHint: '要记一笔就说「记支出」；换个日子再查一次。' };
  return { emptyText: '今天还没有记录', emptyHint: '要记一笔就说「记支出」。' };
}

/** `bill.record.today`：查今天／查昨天／查某天（带 `date`）／查最近（`recent:true` ＋ `limit` 1~200）／查账单。
 *  当日无记录不是故障：照实出一张零行的页（老侧在 stderr 上留的那句 NOTE，本票改由页面上的空态承担）。 */
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
      key, params, wakeWord: '查最近', window: '最近 ' + String(limit) + ' 笔（按时间倒序）', records,
      extra: { date: 'recent' },
      emptyText: '库里还没有记录',
      emptyHint: '要记一笔就说「记支出」。',
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
  });
}

/** `bill.record.range`：查周／查月（`range`）／查区间（`start`＋`end` 同给）／查分类／查账户／查账本（单条件）。
 *  区间查不到记录 → 阻断（exit 4），不返一张空表冒充正常。 */
export function viewRecordRange(params: Record<string, unknown>, db: BillDb): ViewOut {
  const key = 'bill.record.range';
  const cond = {
    category: params.category as string | undefined,
    account: params.account as string | undefined,
    ledger: params.ledger as string | undefined,
  };
  if (params.range === 'week' || params.range === 'month') {
    const { start, end } = params.range === 'week'
      ? weekRange()
      : monthRange(new Date().toISOString().slice(0, 7));
    const records = fetchAll(db, { fromTime: start + ' 00:00:00', toTime: end + ' 23:59:59', ...cond });
    if (!records.length) throw new BillFetchError('BILL_EMPTY_RANGE', `区间无记录：${start}~${end}（缺失阻断，不返空统计）`);
    return listOut({
      key, params, wakeWord: params.range === 'week' ? '查周' : '查月',
      window: start + ' ~ ' + end + (params.range === 'week' ? '（本周）' : '（本月）'),
      records, extra: { start, end },
      emptyText: '这一段没有记录',
      emptyHint: '换个起止日期再查一次。',
    });
  }
  if (params.start !== undefined || params.end !== undefined) {
    const { start, end } = resolveRange(params);
    const records = fetchAll(db, { fromTime: start + ' 00:00:00', toTime: end + ' 23:59:59', ...cond });
    if (!records.length) throw new BillFetchError('BILL_EMPTY_RANGE', `区间无记录：${start}~${end}（缺失阻断，不返空统计）`);
    return listOut({
      key, params, wakeWord: '查区间', window: start + ' ~ ' + end, records, extra: { start, end },
      emptyText: '这一段没有记录',
      emptyHint: '换个起止日期再查一次。',
    });
  }
  if (params.category !== undefined || params.account !== undefined || params.ledger !== undefined) {
    const records = fetchAll(db, cond);
    if (!records.length) throw new BillFetchError('BILL_EMPTY_RANGE', '条件无记录（缺失阻断，不返空统计）');
    const by = params.category !== undefined ? '分类' : params.account !== undefined ? '账户' : '账本';
    const value = String(params.category ?? params.account ?? params.ledger);
    return listOut({
      key, params, wakeWord: '查' + by, window: by + '＝' + value + '（全部时间）', records,
      extra: { start: '', end: '' },
      emptyText: '这个条件没有记录',
      emptyHint: '换个条件，或说「查区间」并给出起止日期。',
    });
  }
  throw new BillPolicyError('POLICY_BAD_INPUT', '缺槽位 start/end（或 range=week/month，或 category/account/ledger 条件）');
}

/** `bill.record.search`：搜备注（`q` 必给）／查标签（`kind:"tag"` ＋ `tag` 必给，精确匹配）／
 *  查欠款（`kind:"debt"`）／查待报销（`kind:"reimburse"`）／查分期（`kind:"installment"`）。
 *  空查询不返全量：既没 `q` 也没 `kind` → exit 2。 */
export function viewRecordSearch(params: Record<string, unknown>, db: BillDb): ViewOut {
  const key = 'bill.record.search';
  const kind = params.kind === undefined ? '' : String(params.kind);
  let records: BillRow[];
  let wakeWord: string;
  let window: string;
  let label: string;
  if (kind === 'tag') {
    const tag = params.tag;
    if (typeof tag !== 'string' || !tag.trim()) {
      throw new BillPolicyError('POLICY_BAD_INPUT', '查标签须给 tag');
    }
    records = listByTag(db, tag);
    label = 'tag:' + tag;
    wakeWord = '查标签';
    window = '标签 ' + tag + '（精确匹配）';
  } else if (kind === 'debt') {
    records = fetchAll(db).filter((r) => r.category.startsWith('借贷/') || r.note.includes('#未还'));
    label = 'debt';
    wakeWord = '查欠款';
    window = '还欠着的那些账';
  } else if (kind === 'reimburse') {
    records = fetchAll(db).filter((r) => r.note.includes('#待报销'));
    label = 'reimburse';
    wakeWord = '查待报销';
    window = '等着报销的那些账';
  } else if (kind === 'installment') {
    records = fetchAll(db).filter((r) => r.category.startsWith('分期/') || r.note.includes('#分期'));
    label = 'installment';
    wakeWord = '查分期';
    window = '分期还款的那些账';
  } else {
    const q = params.q;
    if (typeof q !== 'string' || !q.trim()) {
      throw new BillPolicyError('POLICY_BAD_INPUT', '搜备注须给 q');
    }
    records = searchKeyword(db, q);
    label = 'search:' + q;
    wakeWord = '搜备注';
    window = '备注里有「' + q + '」的记录';
  }
  return listOut({
    key, params, wakeWord, window, records, extra: { kind: label },
    emptyText: '没有找到符合条件的记录',
    emptyHint: '换个关键词；或说「查最近」看看最近的记录。',
  });
}

/** `bill.record.detail`：查账单详情（`id` 必给）。查无此号由取数层抛（exit 4）。
 *  本票先借用列表页那种版式（单条也出一行）；详情页的专属版式是 #415 那张票的事。
 *  载荷那一份照搬迁前的形状（`item` 走 `toBillItem`），页面那一份是文本化的表格行。 */
export function viewRecordDetail(params: Record<string, unknown>, db: BillDb): ViewOut {
  const key = 'bill.record.detail';
  const row = getById(db, needId(params));
  const data: QueryDetailData = { item: { ...toBillItem(row) } };
  return {
    data,
    html: queryListDoc({
      key,
      params,
      shape: 'detail',
      wakeWord: '查账单详情',
      window: '记录编号 ' + row.id + ' · ' + row.time,
      rows: [tableRow(row)],
      kpi: calcKpi([row]),
      emptyText: '这一条不在库里',
      emptyHint: '先「查最近」，从列表里挑一条再查详情。',
      envelope: detailEnvelope(key, data),
      source: SOURCE_QUERY,
      actionAt: actionStamp(),
    }),
  };
}
