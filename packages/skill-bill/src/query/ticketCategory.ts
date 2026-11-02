/** 查询域·查分类票据纸（w09 专属，`bill.record.range` 的 `category` 单条件分支）。
 *
 * 原型（唯一判地）：`docs/skills/skill-bill/proto/w09/w09-查分类-v2.2.html`
 * （16369 字节，sha256 `3605dbcefd89d3290dc11780847db4968b3906ea2ef8133955de41c2e9548788`；
 * 1021 代 v2.1 加「双钮补位左缘对齐」即此版，两版只差复制区那枚隐藏三角）。
 * 八部位（逐像素对照）：
 * 纸头 `饼干记账 · 查分类` ＋ H2 `查分类共记 4 笔`（＝唤醒词＋`共记 N 笔`）＋
 * 副题 `分类＝餐饮（全部时间）` ＋
 * 主数字（`分类支出 · 餐饮`＋支出唯一＋小字 `四笔分类均餐饮开头`）＋
 * 落点 LEDGER 六行（收入／净额／落点账本／币种／花得最多／占比）＋
 * 占比 SHARE（entry-card 内逐类一行：`类 · 金额 元 · N 笔 · 均 X`＋该类占本页支出的条）＋
 * 备注 NOTES（entry-card 内逐笔一行：`备注 · 备注 分类 · 账户 · 时刻`，**无金额**；
 * 编号接占比行续排，故第二张卡的计数器起值＝占比行数）＋
 * 对账 CHECK（两列三行：编号、笔数、异常）＋
 * 复制区（复制数据▾三格式＋复制日志，原样走 `copyArea`；▾ 的补位口径住 `./pageParts.js` 的
 * `QUERY_COPY_CSS`——v2.2 相对 v2.1 的全部差别即那一处，本件零命中）＋
 * 裁切线 `✂ 裁切线` ＋ 页脚 `饼干记账 · 查分类`。口径段无（1045 全删，与 v2.1 同）。
 *
 * 谁在用（一个调用点，指名）：`./read.js` 的 `viewRecordRange` 的条件分支里
 * `category` 单给那一支（`account`／`ledger`／`start`／`end`／`range` 都没给；
 * 有数时走本件，无数抛 `BILL_EMPTY_RANGE`，不进本件）。`account` 单分支走
 * `./ticketAccount.js`，其余混合条件仍走老 `listOut` 路，本件不碰它们。
 *
 * 载荷键一字不动：`data` 键＝`items／total／start('')／end('')／kpi`（与条件分支搬迁前同形，
 * 经 `./list.js` 的 `listEnvelope` 出）。KPI 与分类聚合与 `./list.js` 的 `listOut` 同源
 * （`calcKpi` 算一次，`calcCategories` 经分析域门取）。占比条宽用**原值**（不取整：原型 v2.2 的
 * `width:82.58258258258259%` 就是 `275÷333` 的浮点原样）；LEDGER 的「占比」行与「花得最多」行
 * 同取分类首名，取整只在**那一行的文本**里做（`占本页支出 83%`）。
 * 占比注记的 `sharePct`（占全部支出比）已不在这张纸上（v2.2 删了那句），保留入参只为超体积
 * 回落老列表路时那枚胶囊（`占全部支出的 X%`）仍读得到，`read.js` 那一处第二次取数因此不动。
 * 呈现映射沿 `./ticketAccount.js`（w10）与 `./ticketMonth.js`（w07）：店头／主数字／段落／
 * 复制区走共用位与公共层组件，占比条与对账是本页自有标记（类名 `ilife-category-*`，作用域限
 * `.ilife-ticket-detail`，他页零命中）；颜色与圆角一律读皮肤 token，不抄字面色。
 *
 * 笔数口径（#1110 落地 #1084 裁定 C）：窗口无转账时本页字面与批准原型逐字节相同；有转账时 H2 的笔数
 * 加「（不含转账）」、对账 CHECK 的笔数加「（含转账 K）」——两处片段都由 `./countLabel.js` 出，本件不另写一份口径。
 */
import { escapeHtml } from 'base-paint';
import { renderCaliberLine, renderLedgerRows, renderSheetFrame, renderSummaryHead } from 'base-paint/blocks';
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
import type { QueryCategoryRow, QueryListData } from './list.js';
import { fitTicketPage } from './pageFit.js';
import { queryStyleTag } from './pageParts.js';
import { assembleSheetPage, sheetHead, ticketActions, ticketRule, ticketSection, ticketSummary } from '../shared/docPage.js';
import { commandLine, writeSection } from '../shared/writeParts.js';
import { checkListHtml, checkRowsOf } from '../shared/checkLine.js';
import { m } from '../entries/index.js';

/** 本次数据来源（复制日志第 3 段，与 `./read.js` 的查询来源同字）。 */
function sourceQuery(): string {
  return DB_FILENAME + m('skill-bill.query-ticketCategory.c024');
}

/** 占比段的类数上限（与 `./list.js` 的 `CATEGORY_LIMIT` 同数，老页 `slice(0,8)` 同）。 */
const CATEGORY_LIMIT = 8;

/** 空值占位（落点行永不缺席，无值即此符）。 */
const EMPTY_CELL = '—';

/** 主数字小字的计数词（原型逐字 `四笔分类均餐饮开头` 的 `四`）：1–10 取本语言数字词，更大的数照数写。 */
const COUNT_WORD_KEYS = [
  'skill-bill.query-ticketCategory.c025',
  'skill-bill.query-ticketCategory.c026',
  'skill-bill.query-ticketCategory.c027',
  'skill-bill.query-ticketCategory.c028',
  'skill-bill.query-ticketCategory.c029',
  'skill-bill.query-ticketCategory.c030',
  'skill-bill.query-ticketCategory.c031',
  'skill-bill.query-ticketCategory.c032',
  'skill-bill.query-ticketCategory.c033',
  'skill-bill.query-ticketCategory.c034',
] as const;



/** 合计金额的文本（两位小数，与 `./list.js` 的 `sumText` 同口径：合计为 0 是真实读数）。 */
function sumText(n: number): string {
  return (Number.isFinite(n) ? n : 0).toFixed(2);
}

/** 文本或占位（空串／全空格即占位）。 */
function textOrDash(v: string): string {
  return v.trim() === '' ? EMPTY_CELL : v;
}

/** 去重（保首次出现序）：落点账本／币种多值并列用。 */
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

/** 计数词（原型 `四笔分类均餐饮开头`）：1–10 取中文数字，更大的数照数写。 */
function countWord(n: number): string {
  return n >= 1 && n <= COUNT_WORD_KEYS.length ? m(COUNT_WORD_KEYS[n - 1]) : String(n);
}

/** 载荷行自带的币种（`./items.ts` 的 `toBillItem` 形状；读不到即空，由落点兜 `CNY`）。 */
function currenciesOf(records: readonly BillRow[]): string[] {
  return distinct(records.map((r) => r.currency));
}

/** 本窗模型（与 `./list.js` 的 `listOut` 同源：KPI 算一次，分类经分析域门取）。 */
function modelOf(records: readonly BillRow[]): {
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
  return { kpi, categories, data: { items: rows.map(toBillItem), total: rows.length, start: '', end: '', kpi } };
}

/** 主数字下面那句小字（原型逐字：`四笔分类均餐饮开头`——本窗的行都是这个分类开头，这是取数条件的必然）。 */
function noteOf(count: number, category: string): string {
  if (count === 0) return m('skill-bill.query-ticketCategory.c001');
  return m('skill-bill.query-ticketCategory.c002', { p0: String(countWord(count)), p1: String(category) });
}

/** 落点 LEDGER 六行（原型逐字：收入／净额／落点账本／币种／花得最多／占比；金额裸数不带单位）。 */
function ledgerHtml(
  kpi: { readonly income: number; readonly net: number },
  records: readonly BillRow[],
  top: QueryCategoryRow | undefined,
): string {
  const ledgers = distinct(records.map((r) => r.ledger));
  const currencies = currenciesOf(records);
  return '<div class="ilife-block-ledger-rows is-ticket">' + renderLedgerRows({
    rows: [
      { label: m('skill-bill.query-ticketCategory.c003'), value: sumText(kpi.income) },
      { label: m('skill-bill.query-ticketCategory.c004'), value: sumText(kpi.net) },
      { label: m('skill-bill.query-ticketCategory.c005'), value: ledgers.length === 0 ? EMPTY_CELL : ledgers.join(' · ') },
      { label: m('skill-bill.query-ticketCategory.c006'), value: currencies.length === 0 ? 'CNY' : currencies.join(' · ') },
      { label: m('skill-bill.query-ticketCategory.c007'), value: top === undefined ? EMPTY_CELL : m('skill-bill.query-ticketCategory.c008', { p0: String(top.label), p1: String(sumText(top.amount)) }) },
      { label: m('skill-bill.query-ticketCategory.c009'), value: top === undefined ? EMPTY_CELL : m('skill-bill.query-ticketCategory.c010', { p0: String(String(Math.round(top.pct))) }) },
    ],
    layout: 'ticket',
  }) + '</div>';
}

/** 占比条（原型 `.entry-text .bar`）：轨＋按原值撑宽的填充；条宽不取整（原型即 `275÷333` 的浮点原样）。 */
function barHtml(pct: number): string {
  const width = Number.isFinite(pct) ? Math.min(100, Math.max(0, pct)) : 0;
  return '<span class="ilife-category-bar" role="img" aria-label="' + m('skill-bill.query-ticketCategory.c010', { p0: String(Math.round(width)) }) + '">'
    + '<i style="width:' + String(width) + '%"></i></span>';
}

/** 占比 SHARE（原型：entry-card 内逐类一行 `类 · 金额 元 · N 笔 · 均 X`＋条；类超 8 时跟一行口径）。 */
function shareHtml(categories: readonly QueryCategoryRow[]): string {
  const shown = categories.slice(0, CATEGORY_LIMIT);
  const hidden = categories.length - shown.length;
  const items = shown.map((c) => '<li><span class="ilife-ticket-entry-text">' + m('skill-bill.query-ticketCategory.c035', {
    p0: escapeHtml(c.label),
    p1: sumText(c.amount),
    p2: String(c.count),
    p3: sumText(c.count === 0 ? 0 : c.amount / c.count),
  }) + barHtml(c.pct) + '</span></li>').join('');
  const card = '<div class="ilife-ticket-card"><ol class="ilife-ticket-entries">'
    + (items === '' ? '<li><span class="ilife-ticket-entry-text">' + m('skill-bill.query-ticketCategory.c036') + '</span></li>' : items)
    + '</ol></div>';
  return card + (hidden > 0
    ? renderCaliberLine(m('skill-bill.query-ticketCategory.c011', {
      p0: String(String(CATEGORY_LIMIT)),
      p1: String(String(hidden)),
    }))
    : '');
}

/** 备注 NOTES（原型：逐笔一行、**无金额**；编号接占比行续排，故第二张卡的计数器起值＝占比行数）。 */
function notesHtml(records: readonly BillRow[], start: number): string {
  const items = records.map((r) => '<li><span class="ilife-ticket-entry-text">' + escapeHtml(m('skill-bill.query-ticketCategory.c037', { p0: textOrDash(r.note) }))
    + ' ' + escapeHtml(textOrDash(r.category)) + ' · ' + escapeHtml(textOrDash(r.account))
    + ' · ' + escapeHtml(r.time) + '</span></li>').join('');
  return '<div class="ilife-ticket-card"><ol class="ilife-ticket-entries"'
    + (start > 0 ? ' style="counter-reset: ilife-ticket-row ' + String(start) + '"' : '')
    + '>' + items + '</ol></div>';
}

/** 对账 CHECK（两列三行：编号、笔数、异常；卡壳与状态点照本页原型）。 */
function checkHtml(records: readonly BillRow[], countText: string): string {
  return '<div class="ilife-category-check"><span class="ilife-category-check-dot" aria-hidden="true"></span>'
    + checkListHtml(checkRowsOf({ ids: records.map((r) => r.id), countText })) + '</div>';
}

/** 查分类票据纸的入参（调用方 `./read.js` 的条件分支已按分类取好窗；`sharePct` 与 `shareChip` 同口径）。 */
export interface CategoryTicketInput {
  readonly key: string;
  readonly params: Record<string, unknown>;
  readonly wakeWord: string;
  readonly window: string;
  readonly records: readonly BillRow[];
  readonly category: string;
  readonly sharePct: number;
  /** 明细与复制区画前几条（`fitTicketPage` 给；缺席＝全画）。结论／占比／落点／对账照**全量**算。 */
  readonly shown?: number;
}

/** 查分类票据纸：一整页（载荷与 `./list.js` 条件分支同形，呈现照 w09 v2.2 原型）。 */
export function queryCategoryTicketDoc(input: CategoryTicketInput): string {
  // 明细与复制区只带前 `shown` 条（`fitTicketPage` 给；缺席＝全画）；结论／占比／落点／对账照全量算。
  const shownRows = input.shown === undefined ? input.records : input.records.slice(0, input.shown);
  const hidden = input.records.length - shownRows.length;
  const { kpi, categories, data } = modelOf(input.records);
  const notes = countNotes(input.records, kpi.count);
  const shown = categories.slice(0, CATEGORY_LIMIT);
  const envelope = listEnvelope(input.key, data);
  const listCopy = ticketCopyOf(input.wakeWord, input.window, shownRows);
  const paper = queryStyleTag()
    + sheetHead(
      DOC_TITLE + ' · ' + input.wakeWord,
      escapeHtml(m('skill-bill.query-ticketCategory.c012', { p0: String(input.wakeWord), p1: String(notes.head) })),
      input.window,
    )
    + ticketRule()
    + ticketSummary(renderSummaryHead({
      eyebrow: m('skill-bill.query-ticketCategory.c013', { p0: String(input.category) }),
      value: sumText(kpi.expense),
      unit: m('skill-bill.query-ticketCategory.c014'),
      layout: 'ticket',
    }), '<p class="ilife-ticket-summary-note">' + escapeHtml(noteOf(kpi.count, input.category)) + '</p>')
    + ticketRule()
    + ticketSection({ title: m('skill-bill.query-ticketCategory.c015'), tag: 'LEDGER', content: ledgerHtml(kpi, input.records, categories[0]) })
    + ticketRule()
    + ticketSection({ title: m('skill-bill.query-ticketCategory.c016'), tag: 'SHARE', content: shareHtml(categories) })
    + ticketRule()
    + ticketSection({ title: m('skill-bill.query-ticketCategory.c017'), tag: 'NOTES', content: notesHtml(shownRows, shown.length) })
    + (hidden > 0
      ? ticketRule() + ticketSection({
        title: m('skill-bill.query-ticketCategory.c018', {
          p0: String(String(hidden)),
          p1: String(String(shownRows.length)),
        }),
        tag: 'MORE',
        content: renderCaliberLine(m('skill-bill.query-ticketCategory.c019', {
          p0: String(String(input.records.length)),
          p1: String(String(shownRows.length)),
        })),
      })
      : '')
    + ticketRule()
    + ticketSection({ title: m('skill-bill.query-ticketCategory.c020'), tag: 'CHECK', content: checkHtml(input.records, notes.check) })
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
          detail: m('skill-bill.query-ticketCategory.c021', { p0: String(String(input.records.length)) }),
          actionAt: actionStamp(),
          version: DOC_VERSION,
        }),
      },
    }));
  const content = writeSection({
    slot: 'list', page: 'list', shape: 'list', key: input.key,
    content: renderSheetFrame({ variant: 'ticket', cutLine: true, cutLineText: m('skill-bill.query-ticketCategory.c022'), content: paper })
      + '<div class="ilife-category-foot">' + escapeHtml(DOC_TITLE + ' · ' + input.wakeWord) + '</div>',
  });
  return assembleSheetPage({ docTitle: m('skill-bill.query-ticketCategory.c023', { p0: String(DOC_TITLE) }), bodyHtml: content, paper: 'detail' });
}

/** category 单条件分支的出口：载荷与 `./list.js` 条件分支同形，页走本件票据纸。
 *  条数到上限只**少画几条＋页内明写**，不再换页型（票 #1279）；零行已由调用方阻断，不进本件。 */
export function categoryTicketOut(input: CategoryTicketInput): ViewOut {
  const { data } = modelOf(input.records);
  const page = fitTicketPage(input.records.length, (shown) => queryCategoryTicketDoc({ ...input, shown }));
  return { data, page: { wakeWord: input.wakeWord, kind: 'single' }, html: page.html };
}
