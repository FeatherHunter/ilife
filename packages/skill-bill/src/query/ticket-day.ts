/** 查询域·查某天票据纸（w03 专属，`bill.record.today` 的 date 分支中唤醒词为查某天且有数时）。
 *
 * 原型（唯一判地）：`.scratch/1019-p-query/w03-查某天-v2.1.html`（v2*.html 取版本号最高者）。
 * 八部位（逐像素对照）：
 * 纸头 `饼干记账 · 查某天` ＋ H2 `共 N 笔，支出 X 元`（日期只印副题一处）＋ 副题 `{date} 这一天` ＋
 * 主数字（`本页支出 · 共 N 笔`＋支出唯一＋结论句进小字）＋ 落点 LEDGER（收入／净额／落点账本／
 * 币种）＋ 分类占比 SCALE（条宽整数和 100，下见 `intPcts`）＋ 明细 DETAIL（时间升序：`备注 · `／
 * 分类·账户·时刻·#编号／金额）＋ 对账 CHECK（编号序列 ／ 共 N 笔 ／ 异常：无，全角斜线）＋
 * 复制区（复制数据▾三格式＋复制日志，原样走 `copyArea`）＋ 裁切线 `✂ 裁切线` ＋
 * 页脚 `饼干记账 · 查某天`。口径段无（1045 全删，与 v2.1 同）。
 *
 * 谁在用（一个调用点，指名）：`./read.js` 的 `viewRecordToday` 的 date 分支（唤醒词是查某天且
 * 有数时；查今天／查昨天／零行仍走老路，各归各席，空态四句一字不动）。
 *
 * 载荷键一字不动：`data` 键＝`items／total／date／kpi`（与搬迁前同形，经 `./list.js`
 * 的 `listEnvelope` 出）。KPI 与分类聚合与 `./list.js` 的 `listOut` 同源（`calcKpi` 算一次，
 * `calcCategories` 经分析域门取，占比＝分类支出÷本页支出）；条宽整数化只动呈现（`intPcts`
 * 最大余数法），口径不动。复制 envelope 与出口 envelope 同一数据集，`items` 按展示序
 * （时间升序）重排以贴原型载荷序，`total` 与键不变；stdout 那份保持取数序，本件不动它。
 * 呈现映射沿 w01 `ticketToday.ts`：店头／主数字／段落／复制区走共用位与公共层组件，
 * 明细与对账是本页自有标记（类名 `ilife-someday-*`，作用域限 `.ilife-ticket-detail`，
 * 详情页与其他票据页零命中）；颜色与圆角一律读皮肤 token，不抄字面色。
 * 两处与 w01 不同的原型字面（各照各的原型，不统一）：① 明细首行 `备注 · ` 中点空格
 * （w01 全角冒号）；② 对账分隔全角 ` ／ `（w01 半角）；③ 明细展示序时间升序（w01 入参序）。
 *
 * 笔数口径（#1110 落地 #1084 裁定 C）：窗口无转账时本页字面与批准原型逐字节相同；有转账时 H2 的笔数
 * 加「（不含转账）」、对账 CHECK 的笔数加「（含转账 K）」——两处片段都由 `./countLabel.js` 出，本件不另写一份口径。
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
import { checkListHtml, checkRowsOf } from '../shared/checkLine.js';
import { countNotes } from './countLabel.js';
import { toBillItem } from './items.js';
import { listEnvelope } from './list.js';
import { fitTicketPage } from './pageFit.js';
import type { QueryCategoryRow, QueryListData } from './list.js';
import { queryStyleTag } from './pageParts.js';
import { assembleSheetPage, sheetHead, ticketActions, ticketRule, ticketSection, ticketSummary } from '../shared/docPage.js';
import { commandLine, writeSection } from '../shared/writeParts.js';
import { m } from '../entries/index.js';

/** 本次数据来源（复制日志第 3 段，与 `./read.js` 的查询来源同字）。 */
function sourceQuery(): string {
  return DB_FILENAME + m('skill-bill.query-ticket-day.c022');
}

/** 分类聚合卡的类数上限（与 `./list.js` 的 `CATEGORY_LIMIT` 同数，老页 `slice(0,8)` 同）。 */
const CATEGORY_LIMIT = 8;



/** 合计金额的文本（两位小数，与 `./list.js` 的 `sumText` 同口径：合计为 0 是真实读数）。 */
function sumText(n: number): string {
  return (Number.isFinite(n) ? n : 0).toFixed(2);
}

/** 空值占位（落点账本／币种／备注无值即此符，不缺席）。 */
const EMPTY_CELL = '—';

/** 文本或占位（空串／全空格即占位，前后空格不进页）。 */
function textOrDash(v: string): string {
  return v.trim() === '' ? EMPTY_CELL : v;
}

/** 去重（保首次出现序）：落点账本多值并列用（w01 同例）。 */
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

/** 占比整数（和 100 的最大余数法；与 w01 `intPcts` 同算法；w03 得 60／40）。 */
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

/** 明细展示序（w03 原型真值序）：时间升序，同秒按编号升序。载荷序（取数降序）不动，只排展示。 */
function displayOrder(records: readonly BillRow[]): BillRow[] {
  return [...records].sort((a, b) => a.time.localeCompare(b.time) || a.id - b.id);
}

/** 本窗模型（与 `./list.js` 的 `listOut` 同源：KPI 算一次，分类经分析域门取）。 */
function modelOf(records: readonly BillRow[], date: string): {
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
  return { kpi, categories, data: { items: rows.map(toBillItem), total: rows.length, date, kpi } };
}

/** 结论标准句（与 `./list.js` 的 `conclusionOf` 同字：有支出取首类，无支出说清只有收入）。 */
function conclusionOf(categories: readonly QueryCategoryRow[]): string {
  const top = categories[0];
  if (top === undefined) return m('skill-bill.query-ticket-day.c001');
  return m('skill-bill.query-ticket-day.c002', {
    p0: String(top.label),
    p1: String(sumText(top.amount)),
    p2: String(String(Math.round(top.pct))),
  });
}

/** 落点 LEDGER 四行（原型逐字：收入／净额／落点账本／币种；金额裸数不带单位；币种缺省兜 CNY）。 */
function ledgerHtml(
  kpi: { readonly income: number; readonly net: number },
  records: readonly BillRow[],
): string {
  const ledgers = distinct(records.map((r) => r.ledger));
  const currencies = distinct(records.map((r) => r.currency));
  return '<div class="ilife-block-ledger-rows is-ticket">' + renderLedgerRows({
    rows: [
      { label: m('skill-bill.query-ticket-day.c003'), value: sumText(kpi.income) },
      { label: m('skill-bill.query-ticket-day.c004'), value: sumText(kpi.net) },
      { label: m('skill-bill.query-ticket-day.c005'), value: ledgers.length === 0 ? EMPTY_CELL : ledgers.join(' · ') },
      { label: m('skill-bill.query-ticket-day.c006'), value: currencies.length === 0 ? 'CNY' : currencies.join(' · ') },
    ],
    layout: 'ticket',
  }) + '</div>';
}

/** 分类占比 SCALE（与列表页同一组件；条宽整数和 100；超 8 类截断明示，不静默截）。 */
function scaleHtml(categories: readonly QueryCategoryRow[]): string {
  if (categories.length === 0) return '<p class="ilife-ticket-scale-note">' + m('skill-bill.query-ticket-day.c023') + '</p>';
  const shown = categories.slice(0, CATEGORY_LIMIT);
  const hidden = categories.length - shown.length;
  const pcts = intPcts(shown.map((c) => c.pct));
  const rows = renderDistributionRows({
    rows: shown.map((c, i) => ({ label: c.label, value: m('skill-bill.query-ticket-day.c007', { p0: String(sumText(c.amount)) }), pct: pcts[i] })),
  });
  return rows + (hidden > 0
    ? renderCaliberLine(m('skill-bill.query-ticket-day.c008', { p0: String(String(CATEGORY_LIMIT)), p1: String(String(hidden)) }))
    : '');
}

/** 明细 DETAIL（w03 原型字面：首行 `备注 · ` 中点空格，次行分类·账户·时刻·#编号，金额右对齐裸数带符号）。 */
function entriesHtml(records: readonly BillRow[]): string {
  const items = records.map((r) => {
    const sub = escapeHtml(textOrDash(r.category)) + ' · ' + escapeHtml(textOrDash(r.account)) + ' · '
      + '<span class="ilife-someday-mono">' + escapeHtml(r.time) + '</span> · #' + String(r.id);
    return '<li><span class="ilife-ticket-entry-text">' + escapeHtml(m('skill-bill.query-ticket-day.c024', { p0: textOrDash(r.note) }))
      + '<span class="ilife-someday-sub">' + sub + '</span></span>'
      + '<span class="ilife-someday-amt">' + escapeHtml(r.amount.toFixed(2)) + '</span></li>';
  }).join('');
  return '<div class="ilife-ticket-card"><ol class="ilife-ticket-entries">' + items + '</ol></div>';
}

/** 对账 CHECK（两列三行：编号／笔数／异常；卡壳、状态点与页脚照本页原型）。 */
function checkHtml(records: readonly BillRow[], countText: string): string {
  return '<div class="ilife-someday-check"><span class="ilife-someday-check-dot" aria-hidden="true"></span>'
    + checkListHtml(checkRowsOf({ ids: records.map((r) => r.id), countText })) + '</div>';
}

/** 查某天票据纸的入参（调用方 `./read.js` 的 date 分支已按当天取好窗；零行不进本件）。 */
export interface SomedayTicketInput {
  readonly key: string;
  readonly params: Record<string, unknown>;
  readonly wakeWord: string;
  readonly window: string;
  readonly date: string;
  readonly records: readonly BillRow[];
  /** 明细与复制区画前几条（`fitTicketPage` 给；缺席＝全画）。结论／占比／落点／对账照**全量**算。 */
  readonly shown?: number;
  readonly emptyText: string;
  readonly emptyHint: string;
}

/** 查某天票据纸：一整页（载荷与 `./list.js` 同形，呈现照 w03 v2.1 原型）。 */
export function querySomedayTicketDoc(input: SomedayTicketInput): string {
  const ordered = displayOrder(input.records);
  // 明细与复制区只带前 `shown` 条（`fitTicketPage` 给；缺席＝全画）；结论／占比／落点／对账照全量算。
  const shownRows = input.shown === undefined ? ordered : ordered.slice(0, input.shown);
  const hidden = ordered.length - shownRows.length;
  const { kpi, categories, data } = modelOf(input.records, input.date);
  const notes = countNotes(input.records, kpi.count);
  const conclusion = input.records.length === 0
    ? m('skill-bill.query-ticket-day.c009')
    : conclusionOf(categories);
  const envelope = listEnvelope(input.key, { ...data, items: ordered.map(toBillItem) });
  const listCopy = ticketCopyOf(input.wakeWord, input.window, shownRows);
  const paper = queryStyleTag()
    + sheetHead(DOC_TITLE + ' · ' + input.wakeWord, escapeHtml(m('skill-bill.query-ticket-day.c010', { p0: String(notes.head), p1: String(sumText(kpi.expense)) })))
    + '<p class="ilife-someday-shop-sub">' + escapeHtml(input.window) + '</p>'
    + ticketRule()
    + ticketSummary(renderSummaryHead({
      eyebrow: m('skill-bill.query-ticket-day.c011', { p0: String(String(kpi.count)) }),
      value: sumText(kpi.expense),
      unit: m('skill-bill.query-ticket-day.c012'),
      layout: 'ticket',
    }), '<p class="ilife-ticket-summary-note">' + escapeHtml(conclusion) + '</p>')
    + ticketRule()
    + ticketSection({ title: m('skill-bill.query-ticket-day.c013'), tag: 'LEDGER', content: ledgerHtml(kpi, ordered) })
    + ticketRule()
    + ticketSection({ title: m('skill-bill.query-ticket-day.c014'), tag: 'SCALE', content: scaleHtml(categories) })
    + ticketRule()
    + ticketSection({ title: m('skill-bill.query-ticket-day.c015'), tag: 'DETAIL', content: entriesHtml(shownRows) })
    + (hidden > 0
      ? ticketRule() + ticketSection({
        title: m('skill-bill.query-ticket-day.c016', {
          p0: String(String(hidden)),
          p1: String(String(shownRows.length)),
        }),
        tag: 'MORE',
        content: renderCaliberLine(m('skill-bill.query-ticket-day.c017', {
          p0: String(String(ordered.length)),
          p1: String(String(shownRows.length)),
        })),
      })
      : '')
    + ticketRule()
    + ticketSection({ title: m('skill-bill.query-ticket-day.c018'), tag: 'CHECK', content: checkHtml(ordered, notes.check) })
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
          source: sourceQuery(),
          detail: m('skill-bill.query-ticket-day.c019', { p0: String(String(input.records.length)) }),
          actionAt: actionStamp(),
          version: DOC_VERSION,
        }),
      },
    }));
  const content = writeSection({
    slot: 'list', page: 'list', shape: 'list', key: input.key,
    content: renderSheetFrame({ variant: 'ticket', cutLine: true, cutLineText: m('skill-bill.query-ticket-day.c020'), content: paper })
      + '<div class="ilife-someday-foot">' + escapeHtml(DOC_TITLE + ' · ' + input.wakeWord) + '</div>',
  });
  return assembleSheetPage({ docTitle: m('skill-bill.query-ticket-day.c021', { p0: String(DOC_TITLE) }), bodyHtml: content, paper: 'detail' });
}

/** date 分支中查某天的出口：载荷与 `./list.js` 同形，页走本件票据纸。
 *  零行回 null（调用方走空态票据纸）；条数到上限只**少画几条＋页内明写**，不再换页型（票 #1279）。 */
export function somedayTicketOut(input: SomedayTicketInput): ViewOut | null {
  if (input.records.length === 0) return null;
  const { data } = modelOf(input.records, input.date);
  const page = fitTicketPage(input.records.length, (shown) => querySomedayTicketDoc({ ...input, shown }));
  return { data, page: { wakeWord: input.wakeWord, kind: 'single' }, html: page.html };
}
