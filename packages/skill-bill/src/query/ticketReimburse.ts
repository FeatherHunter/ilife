/** 查询域·查待报销票据纸（w15 专属，`bill.record.search` 的 `reimburse` 分支）。
 *
 * 原型（唯一判地）：`.scratch/1019-p-query/w15-查待报销-v2.1.html`（`*-v2*.html` 取版本号最高者）。
 * 纸头 `饼干记账 · 查待报销` ＋ H2 `等报销 N 笔，X 元` ＋ 副题 `等着报销的那些账` ＋
 * 主数字（待报销 · N 笔／支出唯一）＋ 结论标准句 ＋ 落点 LEDGER（收入／净额／落点账本／币种）＋
 * 分类占比 SCALE ＋ 明细 DETAIL（序号／备注／分类·账户·时刻·#编号／金额）＋
 * 对账 CHECK（两列三行：编号、笔数、异常）＋ 复制区（复制数据▾三格式＋复制日志）＋
 * 裁切线 `✂ 裁切线` ＋ 页脚 `饼干记账 · 查待报销`。本页无 scale-note（原型就没有）。
 *
 * 谁在用（一个调用点，指名）：`./read.js` 的 `viewRecordSearch` 的 `reimburse` 分支（有数时）。
 * 空结果（零行）走老 `listOut` 路——空态句与引导一字不动，本件不碰空态。
 *
 * 载荷一字不动：`data` 键＝`items／total／kind('reimburse')／kpi`（与搬迁前同形，经 `./list.js`
 * 的 `listEnvelope` 出）；页面明细那份文本化只进明细行。KPI 与分类聚合与 `./list.js`
 * 的 `listOut` 同源（同一份 `calcKpi`／`calcCategories`，占比＝分类支出÷本页支出）。
 * 呈现映射沿 `./detail.js`（#993 小票化）与 `./ticketDebt.js`（w14 票据纸先例）：
 * 店头／主数字／段落／复制区走共用位与公共层组件，明细卡与对账行是本页自有标记
 * （类名 `ilife-reimburse-*`，作用域限 `.ilife-ticket-detail`，他页零命中）；
 * 颜色与圆角一律读皮肤 token，不抄字面色。
 */
import { escapeHtml } from 'base-paint';
import { renderCaliberLine, renderDistributionRows, renderLedgerRows, renderSheetFrame, renderSummaryHead } from 'base-paint/blocks';
import type { BillRow } from '../fetch/index.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { actionStamp, copyArea, copyLog } from '../shared/copyArea.js';
import { ticketCopyOf } from './list-copy.js';
import { DOC_TITLE, DOC_VERSION } from '../shared/pageIdentity.js';
import { DB_FILENAME } from '../fetch/index.js';
import { calcKpi } from '../shared/kpi.js';
import { calcCategories } from '../analysis/index.js';
import { toBillItem } from './items.js';
import { listEnvelope } from './list.js';
import type { QueryCategoryRow, QueryKpi, QueryListData } from './list.js';
import { fitTicketPage } from './pageFit.js';
import { queryStyleTag } from './pageParts.js';
import { assembleSheetPage, sheetHead, ticketActions, ticketRule, ticketSection, ticketSummary } from '../shared/docPage.js';
import { commandLine, writeSection } from '../shared/writeParts.js';
import { checkListHtml, checkRowsOf } from '../shared/checkLine.js';
import { m } from '../entries/index.js';

/** 本次数据来源（复制日志第 3 段，与 `./read.js` 的查询来源同字）。 */
function sourceQuery(): string {
  return DB_FILENAME + m('skill-bill.query-ticketReimburse.c022');
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

/** 出现次数最多的那个值（并列取展示序里第一个；单账本／单币种时即该值）。 */
function dominantOf(values: readonly string[]): string {
  const count = new Map<string, number>();
  for (const v of values) count.set(v, (count.get(v) ?? 0) + 1);
  let best = values[0] ?? '';
  let bestN = -1;
  for (const v of values) {
    const n = count.get(v) ?? 0;
    if (n > bestN) { bestN = n; best = v; }
  }
  return textOrDash(best);
}

/** 结论标准句（与 `./list.js` 的 `conclusionOf` 同字：有支出取首类，无支出说清只有收入）。 */
function conclusionOf(categories: readonly QueryCategoryRow[]): string {
  const top = categories[0];
  if (top === undefined) return m('skill-bill.query-ticketReimburse.c001');
  return m('skill-bill.query-ticketReimburse.c002', {
    p0: String(top.label),
    p1: String(sumText(top.amount)),
    p2: String(String(Math.round(top.pct))),
  });
}

/** 落点 LEDGER 四行（原型逐字：收入／净额／落点账本／币种；金额裸数不带单位）。 */
function ledgerHtml(kpi: QueryKpi, records: readonly BillRow[]): string {
  return '<div class="ilife-block-ledger-rows is-ticket">' + renderLedgerRows({
    rows: [
      { label: m('skill-bill.query-ticketReimburse.c003'), value: sumText(kpi.income) },
      { label: m('skill-bill.query-ticketReimburse.c004'), value: sumText(kpi.net) },
      { label: m('skill-bill.query-ticketReimburse.c005'), value: dominantOf(records.map((r) => r.ledger)) },
      { label: m('skill-bill.query-ticketReimburse.c006'), value: dominantOf(records.map((r) => r.currency)) },
    ],
    layout: 'ticket',
  }) + '</div>';
}

/** 分类占比 SCALE（与列表页同一组件；超 8 类截断明示，不静默截）。 */
function scaleHtml(categories: readonly QueryCategoryRow[]): string {
  const shown = categories.slice(0, CATEGORY_LIMIT);
  const hidden = categories.length - shown.length;
  const rows = renderDistributionRows({
    rows: shown.map((c) => ({ label: c.label, value: m('skill-bill.query-ticketReimburse.c007', { p0: String(sumText(c.amount)) }), pct: c.pct })),
  });
  return rows + (hidden > 0
    ? renderCaliberLine(m('skill-bill.query-ticketReimburse.c008', {
      p0: String(String(CATEGORY_LIMIT)),
      p1: String(String(hidden)),
    }))
    : '');
}

/** 明细 DETAIL（展示序即入参序：序号由卡片计数器出，备注首行，次行分类·账户·时刻·#编号，金额右对齐）。 */
function entriesHtml(records: readonly BillRow[]): string {
  return '<div class="ilife-ticket-card"><ol class="ilife-ticket-entries">' + records.map((r) => {
    const note = textOrDash(r.note);
    const sub = escapeHtml(textOrDash(r.category)) + ' · ' + escapeHtml(textOrDash(r.account)) + ' · '
      + '<span class="ilife-reimburse-mono">' + escapeHtml(r.time) + '</span> · #' + String(r.id);
    return '<li><span class="ilife-ticket-entry-text">' + escapeHtml(m('skill-bill.query-ticketReimburse.c023', { p0: note }))
      + '<span class="ilife-reimburse-sub">' + sub + '</span></span>'
      + '<span class="ilife-reimburse-amt">' + escapeHtml(r.amount.toFixed(2)) + '</span></li>';
  }).join('') + '</ol></div>';
}

/** 对账 CHECK（两列三行：编号、笔数、异常；卡壳与状态点照本页原型）。 */
function checkHtml(records: readonly BillRow[]): string {
  return '<div class="ilife-reimburse-check"><span class="ilife-reimburse-check-dot" aria-hidden="true"></span>'
    + checkListHtml(checkRowsOf({ ids: records.map((r) => r.id), countText: m('skill-bill.query-ticketReimburse.c009', { p0: String(String(records.length)) }) })) + '</div>';
}

/** 查待报销票据纸的入参（调用方 `./read.js` 的 reimburse 分支已按待报销口径取好窗）。 */
export interface ReimburseTicketInput {
  readonly key: string;
  readonly params: Record<string, unknown>;
  readonly wakeWord: string;
  readonly window: string;
  readonly records: readonly BillRow[];
  /** 明细与复制区画前几条（`fitTicketPage` 给；缺席＝全画）。结论／占比／落点／对账照**全量**算。 */
  readonly shown?: number;
}

/** 查待报销票据纸：一整页（载荷与 `./list.js` 同形，呈现照 w15 v2.1 原型）。 */
export function queryReimburseTicketDoc(input: ReimburseTicketInput): string {
  const records = [...input.records];
  // 明细与复制区只带前 `shown` 条（`fitTicketPage` 给；缺席＝全画）；结论／占比／落点／对账照全量算。
  const shownRows = input.shown === undefined ? records : records.slice(0, input.shown);
  const hidden = records.length - shownRows.length;
  const kpi: QueryKpi = calcKpi(records);
  const categories: readonly QueryCategoryRow[] = kpi.expense === 0 ? [] : calcCategories(records).map((c) => ({
    label: c.category,
    amount: c.total,
    count: c.count,
    pct: (c.total / kpi.expense) * 100,
  }));
  const data: QueryListData = {
    items: records.map(toBillItem),
    total: records.length,
    kind: 'reimburse',
    kpi,
  };
  const envelope = listEnvelope(input.key, data);
  const listCopy = ticketCopyOf(input.wakeWord, input.window, shownRows);
  const paper = queryStyleTag()
    + sheetHead(DOC_TITLE + ' · ' + input.wakeWord, escapeHtml(m('skill-bill.query-ticketReimburse.c010', {
      p0: String(String(records.length)),
      p1: String(sumText(kpi.expense)),
    })))
    + '<p class="ilife-reimburse-shop-sub">' + escapeHtml(input.window) + '</p>'
    + ticketRule()
    + ticketSummary(renderSummaryHead({
      eyebrow: m('skill-bill.query-ticketReimburse.c011', { p0: String(String(records.length)) }),
      value: sumText(kpi.expense),
      unit: m('skill-bill.query-ticketReimburse.c012'),
      layout: 'ticket',
    }), '<p class="ilife-ticket-summary-note">' + escapeHtml(conclusionOf(categories)) + '</p>')
    + ticketRule()
    + ticketSection({ title: m('skill-bill.query-ticketReimburse.c013'), tag: 'LEDGER', content: ledgerHtml(kpi, records) })
    + ticketRule()
    + ticketSection({ title: m('skill-bill.query-ticketReimburse.c014'), tag: 'SCALE', content: scaleHtml(categories) })
    + ticketRule()
    + ticketSection({ title: m('skill-bill.query-ticketReimburse.c015'), tag: 'DETAIL', content: entriesHtml(shownRows) })
    + (hidden > 0
      ? ticketRule() + ticketSection({
        title: m('skill-bill.query-ticketReimburse.c016', {
          p0: String(String(hidden)),
          p1: String(String(shownRows.length)),
        }),
        tag: 'MORE',
        content: renderCaliberLine(m('skill-bill.query-ticketReimburse.c017', {
          p0: String(String(records.length)),
          p1: String(String(shownRows.length)),
        })),
      })
      : '')
    + ticketRule()
    + ticketSection({ title: m('skill-bill.query-ticketReimburse.c018'), tag: 'CHECK', content: checkHtml(records) })
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
          detail: m('skill-bill.query-ticketReimburse.c019', { p0: String(String(records.length)) }),
          actionAt: actionStamp(),
          version: DOC_VERSION,
        }),
      },
    }));
  const content = writeSection({
    slot: 'list', page: 'list', shape: 'list', key: input.key,
    content: renderSheetFrame({ variant: 'ticket', cutLine: true, cutLineText: m('skill-bill.query-ticketReimburse.c020'), content: paper })
      + '<div class="ilife-reimburse-foot">' + escapeHtml(DOC_TITLE + ' · ' + input.wakeWord) + '</div>',
  });
  return assembleSheetPage({
    docTitle: m('skill-bill.query-ticketReimburse.c021', { p0: String(DOC_TITLE) }),
    bodyHtml: content,
    paper: 'detail',
  });
}

/** reimburse 分支的出口：载荷与 `./list.js` 同形，页走本件票据纸。
 *  条数到上限只**少画几条＋页内明写**，不再换页型（票 #1279）；零行由调用方先收口到空态票据纸，不进本件。 */
export function reimburseTicketOut(input: ReimburseTicketInput): ViewOut {
  const records = [...input.records];
  const kpi: QueryKpi = calcKpi(records);
  const data: QueryListData = {
    items: records.map(toBillItem),
    total: records.length,
    kind: 'reimburse',
    kpi,
  };
  const page = fitTicketPage(input.records.length, (shown) => queryReimburseTicketDoc({ ...input, shown }));
  return { data, page: { wakeWord: input.wakeWord, kind: 'single' }, html: page.html };
}
