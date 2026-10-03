/** 查询域·查账本票据纸（w11 专属，`bill.record.range` 的 `ledger` 单条件分支）。
 *
 * 原型（唯一判地）：`.scratch/1019-p-query/w11-查账本-v2.1.html`（`*-v2*.html` 取版本号最高者）。
 * 八部位（逐像素对照）：
 * 纸头 `饼干记账 · 查账本` ＋ H2 `旅行账本 1 笔，支出 88.00 元` ＋ 副题 `账本＝旅行（全部时间）` ＋
 * 主数字（`账本支出 · 旅行`＋支出唯一＋结论句进小字）＋ 落点 LEDGER（收入／净额／落点账本／币种）＋
 * 分类占比 SCALE（单条 100%，条宽整数和 100，下见 `intPcts`）＋ 明细 DETAIL（备注／分类·账户·时刻·#编号／金额）＋
 * 对账 CHECK（编号序列 ／ 共 N 笔 ／ 异常：无）＋ 复制区（复制数据▾三格式＋复制日志，原样走 `copyArea`）＋
 * 裁切线 `✂ 裁切线` ＋ 页脚 `饼干记账 · 查账本`。口径段无（1045 全删，与 v2.1 同）。
 *
 * 谁在用（一个调用点，指名）：`./read.js` 的 `viewRecordRange` 的条件分支里
 * `ledger` 单给那一支（`category`／`account`／`start`／`end`／`range` 都没给；
 * 有数时走本件，无数抛 `BILL_EMPTY_RANGE`，不进本件）。`category`／`account` 分支
 * 仍走各自老路，本件不碰它们。
 *
 * 载荷键一字不动：`data` 键＝`items／total／start('')／end('')／kpi`（与条件分支搬迁前同形，
 * 经 `./list.js` 的 `listEnvelope` 出）。KPI 与分类聚合与 `./list.js` 的 `listOut` 同源
 * （`calcKpi` 算一次，`calcCategories` 经分析域门取，占比＝分类支出÷本页支出）；条宽整数化
 * 只动呈现（`intPcts` 最大余数法，manifest 单条 100% 即此算出），口径不动。
 * 呈现映射沿 `./detail.js`（#993 小票化）与 `w10 ticketAccount.ts`：店头／主数字／段落／复制区走
 * 共用位与公共层组件，明细与对账是本页自有标记（类名 `ilife-ledger-*`，作用域限
 * `.ilife-ticket-detail`，他页零命中）；颜色与圆角一律读皮肤 token，不抄字面色。
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
import { calcKpi } from '../shared/kpi.js';
import { DOC_TITLE, DOC_VERSION } from '../shared/pageIdentity.js';
import { estimateBytes } from '../render/html.js';
import { countNotes } from './countLabel.js';
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

/** 空值占位（落点行永不缺席，无值即此符）。 */
const EMPTY_CELL = '—';

/** w11 自有标记的样式（作用域限 `.ilife-ticket-detail` 内本页类名，他页零命中）。 */
const LEDGER_TICKET_CSS = [
  '.ilife-ticket-detail .ilife-ledger-shop-sub { margin: 8px 0 0; font-size: 12.5px; line-height: 1.6; color: var(--ilife-ink-2); text-align: center; overflow-wrap: anywhere; }',
  '.ilife-ticket-detail .ilife-ledger-sub { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 12.5px; font-weight: 400; color: var(--ilife-ink-2); margin-top: 2px; }',
  '.ilife-ticket-detail .ilife-ledger-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; }',
  '.ilife-ticket-detail .ilife-ledger-amt { flex: 0 0 auto; font-variant-numeric: tabular-nums; font-weight: 800; white-space: nowrap; }',
  '.ilife-ticket-detail .ilife-ledger-check { display: flex; align-items: center; gap: 8px; background: var(--ilife-ok-soft); border-radius: var(--ilife-radius-sm); padding: 10px 12px; font-size: 13px; line-height: 1.6; overflow-wrap: anywhere; }',
  '.ilife-ticket-detail .ilife-ledger-check-dot { flex: 0 0 auto; width: 8px; height: 8px; border-radius: 999px; background: var(--ilife-ok); }',
  '.ilife-ledger-foot { text-align: center; color: var(--ilife-ink-3); font-size: 11.5px; padding: 10px 0 2px; letter-spacing: .4px; line-height: 1.7; }',
].join('\n');

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

/** 占比整数（和 100 的最大余数法；原型 manifest 的单条 100% 即此算出）。 */
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

/** 结论标准句（与 `./list.js` 的 `conclusionOf` 同字：有支出取首类，无支出说清只有收入）。 */
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
): string {
  const ledgers = distinct(records.map((r) => r.ledger));
  const currencies = currenciesOf(records);
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

/** 分类占比 SCALE（w11 无附加注记；类超 8 时跟一行口径，与 `./list.js` 同句）。 */
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

/** 明细 DETAIL（展示序即入参序：卡片编号由公共层计数器出，行内只摆备注／次行／金额）。 */
function entriesHtml(records: readonly BillRow[]): string {
  const items = records.map((r) => {
    const sub = textOrDash(r.category) + ' · ' + textOrDash(r.account) + ' · '
      + '<span class="ilife-ledger-mono">' + escapeHtml(r.time) + '</span> · #' + String(r.id);
    return '<li><span class="ilife-ticket-entry-text">备注 · ' + escapeHtml(textOrDash(r.note))
      + '<span class="ilife-ledger-sub">' + sub + '</span></span>'
      + '<span class="ilife-ledger-amt">' + escapeHtml(r.amount.toFixed(2)) + '</span></li>';
  }).join('');
  return '<div class="ilife-ticket-card"><ol class="ilife-ticket-entries">' + items + '</ol></div>';
}

/** 对账 CHECK（原型逐字：编号序列 ／ 共 N 笔 ／ 异常：无；全角斜线）。 */
function checkHtml(records: readonly BillRow[], countText: string): string {
  const ids = records.map((r) => String(r.id)).join('、');
  return '<div class="ilife-ledger-check"><span class="ilife-ledger-check-dot" aria-hidden="true"></span>'
    + '<span>编号 ' + escapeHtml(ids) + ' ／ 共 ' + countText + ' ／ 异常：无</span></div>';
}

/** 查账本票据纸的入参（调用方 `./read.js` 的条件分支已按账本取好窗）。 */
export interface LedgerTicketInput {
  readonly key: string;
  readonly params: Record<string, unknown>;
  readonly wakeWord: string;
  readonly window: string;
  readonly records: readonly BillRow[];
  readonly ledger: string;
}

/** 查账本票据纸：一整页（载荷与 `./list.js` 条件分支同形，呈现照 w11 v2.1 原型）。 */
export function queryLedgerTicketDoc(input: LedgerTicketInput): string {
  const { kpi, categories, data } = modelOf(input.records);
  const notes = countNotes(input.records, kpi.count);
  const conclusion = conclusionOf(categories);
  const envelope = listEnvelope(input.key, data);
  const paper = queryStyleTag() + '<style>' + LEDGER_TICKET_CSS + '</style>'
    + sheetHead(DOC_TITLE + ' · ' + input.wakeWord, escapeHtml(input.ledger + '账本 ' + notes.head + '，支出 ' + sumText(kpi.expense) + ' 元'))
    + '<p class="ilife-ledger-shop-sub">' + escapeHtml(input.window) + '</p>'
    + ticketRule()
    + ticketSummary(renderSummaryHead({
      eyebrow: '账本支出 · ' + input.ledger,
      value: sumText(kpi.expense),
      unit: '元',
      layout: 'ticket',
    }), '<p class="ilife-ticket-summary-note">' + escapeHtml(conclusion) + '</p>')
    + ticketRule()
    + ticketSection({ title: '落点', tag: 'LEDGER', content: ledgerHtml(kpi, input.records) })
    + ticketRule()
    + ticketSection({ title: '分类占比', tag: 'SCALE', content: scaleHtml(categories) })
    + ticketRule()
    + ticketSection({ title: '明细', tag: 'DETAIL', content: entriesHtml(input.records) })
    + ticketRule()
    + ticketSection({ title: '对账', tag: 'CHECK', content: checkHtml(input.records, notes.check) })
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
      + '<div class="ilife-ledger-foot">' + escapeHtml(DOC_TITLE + ' · ' + input.wakeWord) + '</div>',
  });
  return assembleSheetPage({ docTitle: DOC_TITLE + '·查询', bodyHtml: content, paper: 'detail' });
}

/** ledger 单条件分支的出口：载荷与 `./list.js` 条件分支同形，页走本件票据纸；超体积回落老列表路（不静默丢页）。 */
export function ledgerTicketOut(input: LedgerTicketInput): ViewOut {
  const html = queryLedgerTicketDoc(input);
  const { data } = modelOf(input.records);
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
  const { kpi, categories } = modelOf(input.records);
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
      emptyText: '这个条件没有记录',
      emptyHint: '换个条件，或说「查区间」并给出起止日期。',
      envelope: listEnvelope(input.key, data),
      source: SOURCE_QUERY,
      sourceText: SOURCE_TEXT_QUERY,
      windowStart: '不限',
      windowEnd: '不限',
      actionAt: actionStamp(),
    }),
  };
}
