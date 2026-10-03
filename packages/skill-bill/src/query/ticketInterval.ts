/** 查询域·查区间票据纸（w08 专属，`bill.record.range` 的 `start`＋`end` 分支）。
 *
 * 原型（唯一判地）：`.scratch/1019-p-query/w08-查区间-v2.1.html`（v2.1 取版本号最高者）。
 * 纸头 `饼干记账·查区间` ＋ H2 `区间共 N 笔，支出 X 元`（缩短不换行）＋ 副题 `start ~ end`
 * （日期只印一处，副题留窗口）＋ 主数字（支出唯一）＋ 结论标准句
 * `主要花在「借贷/借出」，500.00 元，占本页支出 41%。`（w08 manifest seq7）＋
 * 落点 LEDGER（收入／净额／落点账本／币种，多值按记录先后 ` · ` 并列，w08 同例）＋
 * 分类占比 SCALE（6 条 41/24/19/7/5/4，条宽整数和 100，最大余数法）＋
 * 明细 DETAIL（备注／分类·账户·时刻·#编号／金额）＋
 * 对账 CHECK（编号序列 ／ 共 N 笔 ／ 异常：无，全角斜线冒号）＋
 * 复制区（复制数据▾三格式＋复制日志，1039 块居中文本居中左缘对齐）＋
 * 裁切线 `✂ 裁切线` ＋ 页脚 `饼干记账·查区间`（口径段 1045 全删，无口径段）。
 *
 * 谁在用（一个调用点，指名）：`./read.js` 的 `viewRecordRange` 的 `start`＋`end`
 * 分支（即唤醒词「查区间」）。查周／查月／查分类／查账户／查账本仍走 `./list.js`
 * 的老列表路，本件不碰它们。
 *
 * 载荷一字不动：`data` 键＝`items／total／start／end／kpi`（与搬迁前同形，经 `./list.js`
 * 的 `listEnvelope` 出）。KPI 与分类聚合与 `./list.js` 的 `listOut` 同源（`calcKpi` 算一次，
 * `calcCategories` 经分析域门取，占比＝分类支出÷本页支出）。
 * 呈现映射沿 `./detail.js`（#993 小票化）与 `./list-tag.js`（w13 落点／占比／明细／对账同形）：
 * 店头／主数字／段落／复制区走共用位与公共层组件，明细与对账是本页自有标记
 * （类名 `ilife-interval-*`，作用域限 `.ilife-ticket-detail`，详情页零命中）；
 * 颜色与圆角一律读皮肤 token，不抄字面色。
 */
import { escapeHtml } from 'base-paint';
import { renderCaliberLine, renderDistributionRows, renderLedgerRows, renderSheetFrame, renderSummaryHead } from 'base-paint/blocks';
import { calcCategories } from '../analysis/index.js';
import type { BillRow } from '../fetch/index.js';
import { DB_FILENAME } from '../fetch/index.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { actionStamp, copyArea, copyLog } from '../shared/copyArea.js';
import { calcKpi } from '../shared/kpi.js';
import { DOC_TITLE, DOC_VERSION } from '../shared/pageIdentity.js';
import { estimateBytes } from '../render/html.js';
import { toBillItem } from './items.js';
import { listEnvelope, queryListDoc } from './list.js';
import type { QueryCategoryRow, QueryListData } from './list.js';
import { queryStyleTag } from './pageParts.js';
import { assembleSheetPage, sheetHead, ticketActions, ticketRule, ticketSection, ticketSummary } from '../shared/docPage.js';
import { commandLine, writeSection } from '../shared/writeParts.js';

/** 本次数据来源（复制日志第 3 段，与 `./read.js` 的查询来源同字）。 */
const SOURCE_QUERY = DB_FILENAME + '（查询结果：只读，不改库）';

/** 来源脚注的人话来源（回落老列表路时用，与 `./read.js` 同字）。 */
const SOURCE_TEXT_QUERY = '记账库（只读）';

/** 一整页的体积预算（字节，与 `./list.js` 的 `PAGE_BYTE_BUDGET` 同值：超了回落老列表路，不静默丢页）。 */
const PAGE_BYTE_BUDGET = 240_000;

/** 分类聚合卡的类数上限（与 `./list.js` 的 `CATEGORY_LIMIT` 同数，老页 `slice(0,8)` 同）。 */
const CATEGORY_LIMIT = 8;

/** w08 自有标记的样式（作用域限 `.ilife-ticket-detail` 内本页类名，详情页零命中）。 */
const INTERVAL_TICKET_CSS = [
  '.ilife-ticket-detail .ilife-interval-shop-sub { margin: 8px 0 0; font-size: 12.5px; line-height: 1.6; color: var(--ilife-ink-2); text-align: center; overflow-wrap: anywhere; }',
  '.ilife-ticket-detail .ilife-interval-sub { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 12px; font-weight: 400; color: var(--ilife-ink-2); margin-top: 2px; }',
  '.ilife-ticket-detail .ilife-interval-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; }',
  '.ilife-ticket-detail .ilife-interval-amt { flex: none; font-weight: 800; white-space: nowrap; font-variant-numeric: tabular-nums; }',
  '.ilife-ticket-detail .ilife-interval-check { display: flex; align-items: flex-start; gap: 8px; background: var(--ilife-ok-soft); border-radius: var(--ilife-radius-sm); padding: 10px 12px; font-size: 13px; line-height: 1.6; overflow-wrap: anywhere; }',
  '.ilife-ticket-detail .ilife-interval-check-dot { flex: none; width: 8px; height: 8px; border-radius: 999px; background: var(--ilife-ok); margin-top: 6px; }',
  '.ilife-interval-foot { text-align: center; color: var(--ilife-ink-3); font-size: 11.5px; padding: 10px 0 2px; letter-spacing: .4px; line-height: 1.7; }',
].join('\n');

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

/** 去重（保首次出现序）：落点账本／币种多值并列用（w08 原型 `日常 · 旅行` 即此）。 */
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

/** 占比整数（和 100 的最大余数法；w08 manifest 的 41/24/19/7/5/4 即此算出）。 */
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

/** 载荷行自带的币种（`./items.js` 的 `toBillItem` 形状；读不到即空，由调用方兜 `CNY`）。 */
function currenciesOf(items: readonly unknown[]): string[] {
  const out: string[] = [];
  for (const it of items) {
    if (typeof it !== 'object' || it === null) continue;
    const c = (it as Record<string, unknown>).currency;
    if (typeof c === 'string' && c.trim() !== '') out.push(c.trim());
  }
  return distinct(out);
}

/** 本窗模型（与 `./list.js` 的 `listOut` 同源：KPI 算一次，分类经分析域门取）。 */
function modelOf(records: readonly BillRow[], start: string, end: string): {
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
  const items = rows.map(toBillItem);
  return { kpi, categories, data: { items, total: rows.length, start, end, kpi } };
}

/** 结论标准句（与 `./list.js` 的 `conclusionOf` 同字：w08 首类借贷／500.00／41%）。 */
function conclusionOf(categories: readonly QueryCategoryRow[]): string {
  const top = categories[0];
  if (top === undefined) return '本页只有收入，没有支出。';
  return '主要花在「' + top.label + '」，' + sumText(top.amount) + ' 元，占本页支出 '
    + String(Math.round(top.pct)) + '%。';
}

/** 落点 LEDGER 四行（原型逐字：收入／净额／落点账本／币种；金额裸数不带单位）。 */
function ledgerHtml(
  kpi: { readonly income: number; readonly net: number },
  records: readonly BillRow[],
  items: readonly unknown[],
): string {
  const ledgers = distinct(records.map((r) => r.ledger));
  const currencies = currenciesOf(items);
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

/** 分类占比 SCALE（整数条宽和 100；w08 无附加注记；超 8 类截断明示，不静默截）。 */
function scaleHtml(categories: readonly QueryCategoryRow[]): string {
  if (categories.length === 0) return '<p class="ilife-ticket-scale-note">本窗无支出，无占比。</p>';
  const shown = categories.slice(0, CATEGORY_LIMIT);
  const pcts = intPcts(shown.map((c) => c.pct));
  const rows = renderDistributionRows({
    rows: shown.map((c, i) => ({ label: c.label, value: sumText(c.amount) + ' 元', pct: pcts[i] })),
  });
  const hidden = categories.length - shown.length;
  return rows + (hidden > 0
    ? renderCaliberLine('这一页只列支出最多的前 ' + String(CATEGORY_LIMIT) + ' 类，还有 ' + String(hidden) + ' 类没列')
    : '');
}

/** 明细 DETAIL（展示序即入参序：卡片编号由公共层计数器出，行内只摆备注／次行／金额）。 */
function entriesHtml(records: readonly BillRow[]): string {
  const items = records.map((r) => {
    const sub = textOrDash(r.category) + ' · ' + textOrDash(r.account) + ' · '
      + '<span class="ilife-interval-mono">' + escapeHtml(r.time) + '</span> · #' + String(r.id);
    return '<li><span class="ilife-ticket-entry-text">备注 · ' + escapeHtml(textOrDash(r.note))
      + '<span class="ilife-interval-sub">' + sub + '</span></span>'
      + '<span class="ilife-interval-amt">' + escapeHtml(r.amount.toFixed(2)) + '</span></li>';
  }).join('');
  return '<div class="ilife-ticket-card"><ol class="ilife-ticket-entries">' + items + '</ol></div>';
}

/** 对账 CHECK（原型逐字：编号序列 ／ 共 N 笔 ／ 异常：无；全角斜线与冒号）。 */
function checkHtml(records: readonly BillRow[]): string {
  const ids = records.map((r) => String(r.id)).join('、');
  return '<div class="ilife-interval-check"><span class="ilife-interval-check-dot" aria-hidden="true"></span>'
    + '<span>编号 ' + escapeHtml(ids) + ' ／ 共 ' + String(records.length) + ' 笔 ／ 异常：无</span></div>';
}

/** 查区间票据纸的入参（调用方 `./read.js` 的 `start`＋`end` 分支已取好窗，空窗已阻断）。 */
export interface IntervalTicketInput {
  readonly key: string;
  readonly params: Record<string, unknown>;
  readonly wakeWord: string;
  readonly window: string;
  readonly records: readonly BillRow[];
  readonly start: string;
  readonly end: string;
}

/** 查区间票据纸：一整页（载荷与 `./list.js` 同形，呈现照 w08 v2.1 原型）。 */
export function queryIntervalTicketDoc(input: IntervalTicketInput): string {
  const { kpi, categories, data } = modelOf(input.records, input.start, input.end);
  const conclusion = conclusionOf(categories);
  const envelope = listEnvelope(input.key, data);
  const paper = queryStyleTag() + '<style>' + INTERVAL_TICKET_CSS + '</style>'
    + sheetHead(DOC_TITLE + ' · ' + input.wakeWord, escapeHtml('区间共 ' + String(input.records.length) + ' 笔，支出 ' + sumText(kpi.expense) + ' 元'))
    + '<p class="ilife-interval-shop-sub">' + escapeHtml(input.window) + '</p>'
    + ticketRule()
    + ticketSummary(renderSummaryHead({
      eyebrow: '区间支出 · 共 ' + String(input.records.length) + ' 笔',
      value: sumText(kpi.expense),
      unit: '元',
      layout: 'ticket',
    }), '<p class="ilife-ticket-summary-note">' + escapeHtml(conclusion) + '</p>')
    + ticketRule()
    + ticketSection({ title: '落点', tag: 'LEDGER', content: ledgerHtml(kpi, input.records, data.items) })
    + ticketRule()
    + ticketSection({ title: '分类占比', tag: 'SCALE', content: scaleHtml(categories) })
    + ticketRule()
    + ticketSection({ title: '明细', tag: 'DETAIL', content: entriesHtml(input.records) })
    + ticketRule()
    + ticketSection({ title: '对账', tag: 'CHECK', content: checkHtml(input.records) })
    + ticketRule()
    + ticketActions(copyArea({
      data: { envelope, title: input.wakeWord },
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
      + '<div class="ilife-interval-foot">' + escapeHtml(DOC_TITLE + ' · ' + input.wakeWord) + '</div>',
  });
  return assembleSheetPage({ docTitle: DOC_TITLE + '·查询', bodyHtml: content, paper: 'detail' });
}

/** `start`＋`end` 分支的出口：载荷与 `./list.js` 同形，页走本件票据纸；超体积回落老列表路（不静默丢页）。 */
export function intervalTicketOut(input: IntervalTicketInput): ViewOut {
  const html = queryIntervalTicketDoc(input);
  const { data } = modelOf(input.records, input.start, input.end);
  if (estimateBytes(html) <= PAGE_BYTE_BUDGET) {
    return { data, page: { wakeWord: input.wakeWord, kind: 'single' }, html };
  }
  const rows = [...input.records].map((r) => ({
    id: String(r.id),
    time: r.time,
    category: r.category,
    amount: r.amount.toFixed(2),
    account: r.account,
    ledger: r.ledger,
    note: r.note,
  }));
  const { kpi, categories } = modelOf(input.records, input.start, input.end);
  return {
    data,
    page: { wakeWord: input.wakeWord, kind: 'single' },
    html: queryListDoc({
      key: input.key,
      params: input.params,
      shape: 'list',
      wakeWord: input.wakeWord,
      window: input.window,
      chips: ['共 ' + String(input.records.length) + ' 笔'],
      rows,
      kpi,
      categories,
      emptyText: '这一段没有记录',
      emptyHint: '换个起止日期再查一次。',
      envelope: listEnvelope(input.key, data),
      source: SOURCE_QUERY,
      sourceText: SOURCE_TEXT_QUERY,
      windowStart: input.start,
      windowEnd: input.end,
      actionAt: actionStamp(),
    }),
  };
}
