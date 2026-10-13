/** 查询域·多条件票据纸（`bill.record.range` 的多条件分支：两个及以上条件同给，或用户点的是
 *  「查多条件」这条词——判据在 `./read.js` 的 `viewRecordRange`，本件只排版）。
 *
 * 八部位（与 w03「查某天」票据纸同套家具与同序，差别只在副题与载荷）：
 * 店头 `饼干记账 · {唤醒词}` ＋ H2 `共 N 笔，支出 X 元` ＋ 副题（**本页的条件行**：`分类＝餐饮 · 账户＝招行（全部时间）`，
 * 时间也在这行里说清）＋ 主数字（`本页支出 · 共 N 笔`）＋ 落点 LEDGER（收入／净额／落点账本／币种）＋
 * 分类占比 SCALE（条宽整数和 100）＋ 明细 DETAIL ＋ 对账 CHECK ＋ 复制区（原样走 `copyArea`）＋
 * 裁切线 ＋ 页脚。
 *
 * 副题为什么必须把条件写全：单条件那几张票据纸的副题就是「条件＋时间」（`./read.js` 里
 * `by + '＝' + value + '（全部时间）'`），多条件如果把条件吞掉，页面就说不清自己查的是什么；
 * 所以本页的条件行由调用方按同一口径拼好传进来（`window`），本件不另拼一份。
 *
 * 家具类名 `ilife-someday-*` 是票据纸族**详情页那一套**的共用钩子（`packages/base-render/src/components/style/ticket-family.ts`，
 * 作用域 `.ilife-ticket-detail`）——名字从「查某天」那页来，本页是第二个用法：先照用不回抄样式，
 * 中性改名留给票据纸族自己那一票（本票不动 base 侧的字节锁）。
 *
 * 谁在用（一个调用点，指名）：`./read.js` 的 `viewRecordRange` 多条件分支。载荷键与单条件那几支同形
 * （`items`／`total`／`kpi`，带时间窗时补 `start`／`end`），经 `./list.js` 的 `listEnvelope` 出。
 * 条数到上限只**少画几条＋页内明写**（`./pageFit.js`），不换页型（票 #1279）。
 */
import { escapeHtml } from 'base-paint';
import { renderCaliberLine, renderDistributionRows, renderLedgerRows, renderSheetFrame, renderSummaryHead } from 'base-paint/blocks';
import { calcCategories } from '../analysis/index.js';
import type { BillRow } from '../fetch/index.js';
import { DB_FILENAME } from '../fetch/index.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { actionStamp, copyArea, copyLog } from '../shared/copyArea.js';
import { ticketCopyOf } from './list-copy.js';
import { calcKpi } from '../shared/kpi.js';
import { DOC_TITLE, DOC_VERSION } from '../shared/pageIdentity.js';
import { countNotes } from './countLabel.js';
import { toBillItem } from './items.js';
import { listEnvelope } from './list.js';
import { fitTicketPage } from './pageFit.js';
import type { QueryCategoryRow, QueryListData } from './list.js';
import { queryStyleTag } from './pageParts.js';
import { assembleSheetPage, sheetHead, ticketActions, ticketRule, ticketSection, ticketSummary } from '../shared/docPage.js';
import { commandLine, writeSection } from '../shared/writeParts.js';

/** 本次数据来源（复制日志第 3 段，与 `./read.js` 的查询来源同字）。 */
const SOURCE_QUERY = DB_FILENAME + '（查询结果：只读，不改库）';

/** 分类聚合卡的类数上限（与 `./list.js` 的 `CATEGORY_LIMIT` 同数）。 */
const CATEGORY_LIMIT = 8;

/** 空值占位（落点账本／币种／备注无值即此符，不缺席）。 */
const EMPTY_CELL = '—';

/** 合计金额的文本（两位小数，与 `./list.js` 的 `sumText` 同口径）。 */
function sumText(n: number): string {
  return (Number.isFinite(n) ? n : 0).toFixed(2);
}

/** 文本或占位（空串／全空格即占位，前后空格不进页）。 */
function textOrDash(v: string): string {
  return v.trim() === '' ? EMPTY_CELL : v;
}

/** 去重（保首次出现序）：落点账本多值并列用。 */
function distinct(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const t = v.trim();
    if (t === '' || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

/** 占比整数（和 100 的最大余数法；与单条件那几张同算法）。 */
function intPcts(weights: readonly number[]): number[] {
  const floors = weights.map((w) => Math.max(0, Math.floor(w)));
  let rest = 100 - floors.reduce((a, b) => a + b, 0);
  const order = weights.map((_, i) => i).sort((a, b) => (weights[b] - floors[b]) - (weights[a] - floors[a]));
  const out = [...floors];
  for (const i of order) {
    if (rest <= 0) break;
    out[i] += 1;
    rest -= 1;
  }
  return out;
}

/** 明细展示序：时间升序，同秒按编号升序（载荷序不动，只排展示）。 */
function displayOrder(records: readonly BillRow[]): BillRow[] {
  return [...records].sort((a, b) => a.time.localeCompare(b.time) || a.id - b.id);
}

/** 本页模型（与 `./list.js` 的 `listOut` 同源：KPI 算一次，分类经分析域门取）。 */
function modelOf(records: readonly BillRow[], extra: Omit<QueryListData, 'items' | 'total' | 'kpi'>): {
  readonly kpi: { readonly count: number; readonly expense: number; readonly income: number; readonly net: number };
  readonly categories: readonly QueryCategoryRow[];
  readonly data: QueryListData;
} {
  const rows = [...records];
  const kpi = calcKpi(rows);
  const categories: readonly QueryCategoryRow[] = kpi.expense === 0 ? [] : calcCategories(rows).map((c) => ({
    label: c.category,
    amount: c.total,
    count: c.count,
    pct: (c.total / kpi.expense) * 100,
  }));
  return { kpi, categories, data: { items: rows.map(toBillItem), total: rows.length, ...extra, kpi } };
}

/** 结论标准句（与 `./list.js` 的 `conclusionOf` 同字：有支出取首类，无支出说清只有收入）。 */
function conclusionOf(categories: readonly QueryCategoryRow[]): string {
  const top = categories[0];
  if (top === undefined) return '本页只有收入，没有支出。';
  return '主要花在「' + top.label + '」，' + sumText(top.amount) + ' 元，占本页支出 '
    + String(Math.round(top.pct)) + '%。';
}

/** 落点 LEDGER 四行（与 w03 同序同字：收入／净额／落点账本／币种）。 */
function ledgerHtml(
  kpi: { readonly income: number; readonly net: number },
  records: readonly BillRow[],
): string {
  const ledgers = distinct(records.map((r) => r.ledger));
  const currencies = distinct(records.map((r) => r.currency));
  return '<div class="ilife-block-ledger-rows is-ticket">' + renderLedgerRows({
    rows: [
      { label: '收入', value: sumText(kpi.income) },
      { label: '净额', value: sumText(kpi.net) },
      { label: '落点账本', value: ledgers.length === 0 ? EMPTY_CELL : ledgers.join(' · ') },
      { label: '币种', value: currencies.length === 0 ? 'CNY' : currencies.join(' · ') },
    ],
    layout: 'ticket',
  }) + '</div>';
}

/** 分类占比 SCALE（超 8 类截断明示，不静默截）。 */
function scaleHtml(categories: readonly QueryCategoryRow[]): string {
  if (categories.length === 0) return '<p class="ilife-ticket-scale-note">本窗无支出，无占比。</p>';
  const shown = categories.slice(0, CATEGORY_LIMIT);
  const hidden = categories.length - shown.length;
  const pcts = intPcts(shown.map((c) => c.pct));
  const rows = renderDistributionRows({
    rows: shown.map((c, i) => ({ label: c.label, value: sumText(c.amount) + ' 元', pct: pcts[i] })),
  });
  return rows + (hidden > 0
    ? renderCaliberLine('这一页只列支出最多的前 ' + String(CATEGORY_LIMIT) + ' 类，还有 ' + String(hidden) + ' 类没列')
    : '');
}

/** 明细 DETAIL（首行 `备注 · `，次行分类·账户·时刻·#编号，金额右对齐裸数带符号）。 */
function entriesHtml(records: readonly BillRow[]): string {
  const items = records.map((r) => {
    const sub = escapeHtml(textOrDash(r.category)) + ' · ' + escapeHtml(textOrDash(r.account)) + ' · '
      + '<span class="ilife-someday-mono">' + escapeHtml(r.time) + '</span> · #' + String(r.id);
    return '<li><span class="ilife-ticket-entry-text">备注 · ' + escapeHtml(textOrDash(r.note))
      + '<span class="ilife-someday-sub">' + sub + '</span></span>'
      + '<span class="ilife-someday-amt">' + escapeHtml(r.amount.toFixed(2)) + '</span></li>';
  }).join('');
  return '<div class="ilife-ticket-card"><ol class="ilife-ticket-entries">' + items + '</ol></div>';
}

/** 对账 CHECK（编号序列 ／ 共 N 笔 ／ 异常：无；分隔是全角斜线）。 */
function checkHtml(records: readonly BillRow[], countText: string): string {
  const ids = records.map((r) => String(r.id)).join('、');
  return '<div class="ilife-someday-check"><span class="ilife-someday-check-dot" aria-hidden="true"></span>'
    + '<span>编号 ' + escapeHtml(ids) + ' ／ 共 ' + countText + ' ／ 异常：无</span></div>';
}

/** 多条件票据纸的入参（调用方 `./read.js` 已按条件取好数；零行不进本件）。 */
export interface MultiTicketInput {
  readonly key: string;
  readonly params: Record<string, unknown>;
  readonly wakeWord: string;
  /** 副标题＝本次的条件行（条件与时间都在这行里，`./read.js` 拼）。 */
  readonly window: string;
  readonly records: readonly BillRow[];
  /** 有时间窗时写进载荷（与区间那一族同值口径）；全部时间两支都写空串。 */
  readonly start?: string;
  readonly end?: string;
  /** 明细与复制区画前几条（`fitTicketPage` 给；缺席＝全画）。结论／占比／落点／对账照**全量**算。 */
  readonly shown?: number;
}

/** 多条件票据纸：一整页（载荷与单条件那几支同形，呈现沿用票据纸八部位）。 */
export function queryMultiTicketDoc(input: MultiTicketInput): string {
  const ordered = displayOrder(input.records);
  const shownRows = input.shown === undefined ? ordered : ordered.slice(0, input.shown);
  const hidden = ordered.length - shownRows.length;
  const { kpi, categories, data } = modelOf(input.records, {
    start: input.start ?? '',
    end: input.end ?? '',
  });
  const notes = countNotes(input.records, kpi.count);
  const conclusion = input.records.length === 0
    ? '本窗没有记录。下一步说「记一笔 午饭 35」即可记上。'
    : conclusionOf(categories);
  const envelope = listEnvelope(input.key, { ...data, items: ordered.map(toBillItem) });
  const listCopy = ticketCopyOf(input.wakeWord, input.window, shownRows);
  const paper = queryStyleTag()
    + sheetHead(DOC_TITLE + ' · ' + input.wakeWord, escapeHtml('共 ' + notes.head + '，支出 ' + sumText(kpi.expense) + ' 元'))
    + '<p class="ilife-someday-shop-sub">' + escapeHtml(input.window) + '</p>'
    + ticketRule()
    + ticketSummary(renderSummaryHead({
      eyebrow: '本页支出 · 共 ' + String(kpi.count) + ' 笔',
      value: sumText(kpi.expense),
      unit: '元',
      layout: 'ticket',
    }), '<p class="ilife-ticket-summary-note">' + escapeHtml(conclusion) + '</p>')
    + ticketRule()
    + ticketSection({ title: '落点', tag: 'LEDGER', content: ledgerHtml(kpi, ordered) })
    + ticketRule()
    + ticketSection({ title: '分类占比', tag: 'SCALE', content: scaleHtml(categories) })
    + ticketRule()
    + ticketSection({ title: '明细', tag: 'DETAIL', content: entriesHtml(shownRows) })
    + (hidden > 0
      ? ticketRule() + ticketSection({
        title: '还有 ' + String(hidden) + ' 条没显示（这一页画了前 ' + String(shownRows.length) + ' 条）',
        tag: 'MORE',
        content: renderCaliberLine('结论、分类占比与落点都按本窗全部 ' + String(ordered.length) + ' 条算；'
          + '本页的明细与复制区只带前面 ' + String(shownRows.length) + ' 条，要看其余的，把条件收窄一点再查一次'),
      })
      : '')
    + ticketRule()
    + ticketSection({ title: '对账', tag: 'CHECK', content: checkHtml(ordered, notes.check) })
    + ticketRule()
    + ticketActions(copyArea({
      data: { envelope, title: input.wakeWord },
      dataText: listCopy.text,
      dataJson: listCopy.json,
      dataCsv: listCopy.csv,
      log: {
        envelope,
        copyLog: copyLog({
          command: commandLine(input.key, input.params),
          source: SOURCE_QUERY,
          detail: '查到 ' + String(input.records.length) + ' 笔',
          actionAt: actionStamp(),
          version: DOC_VERSION,
        }),
      },
    }));
  const content = writeSection({
    slot: 'list', page: 'list', shape: 'list', key: input.key,
    content: renderSheetFrame({ variant: 'ticket', cutLine: true, cutLineText: '✂ 裁切线', content: paper })
      + '<div class="ilife-someday-foot">' + escapeHtml(DOC_TITLE + ' · ' + input.wakeWord) + '</div>',
  });
  return assembleSheetPage({ docTitle: DOC_TITLE + '·查询', bodyHtml: content, paper: 'detail' });
}

/** 多条件分支的出口：载荷与单条件那几支同形，页走本件票据纸。条数到上限只少画几条＋页内明写。 */
export function multiTicketOut(input: MultiTicketInput): ViewOut {
  const { data } = modelOf(input.records, { start: input.start ?? '', end: input.end ?? '' });
  const page = fitTicketPage(input.records.length, (shown) => queryMultiTicketDoc({ ...input, shown }));
  return { data, page: { wakeWord: input.wakeWord, kind: 'single' }, html: page.html };
}
