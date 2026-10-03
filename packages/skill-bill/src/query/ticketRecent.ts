/** 查询域·查最近票据纸（w04 专属，`bill.record.today` 的 `recent` 分支）。
 *
 * 原型（唯一判地）：`.scratch/1019-p-query/w04-查最近-v2.1.html`（v2.1 取版本号最高者）。
 * 纸头 `饼干记账·查最近` ＋ H2 `最近 N 笔，支出 X 元` ＋ 副题 `最近 N 笔（按时间倒序）` ＋
 * 主数字（支出唯一）＋ 结论标准句 ＋ 落点 LEDGER（收入／净额／落点账本／币种）＋
 * 分类占比 SCALE ＋ 明细 DETAIL（备注／分类·账户·时刻·#编号／金额）＋
 * 对账 CHECK（编号序列 / 共 N 笔 / 异常：无；分隔半角斜线，与 w01 同；w07／w08 全角：各照各的原型，不统一）＋ 复制区（复制数据▾三格式＋复制日志）＋
 * 裁切线 `✂ 裁切线` ＋ 页脚 `饼干记账·查最近`。
 *
 * 谁在用（一个调用点，指名）：`./read.js` 的 `viewRecordToday` 的 `recent` 分支（有数时）。
 * 空库（零行）走老 `listOut` 路——空态四句与 t412 空态锁一字不动，本件不碰空态。
 *
 * 载荷一字不动：`data` 键＝`items／total／date('recent')／kpi`（与搬迁前同形，经 `./list.js`
 * 的 `listEnvelope` 出）。KPI 与分类聚合与 `./list.js` 的 `listOut` 同源（`calcKpi` 算一次，
 * `calcCategories` 经分析域门取，占比＝分类支出÷本页支出）。
 * 呈现映射沿 `./detail.js`（#993 小票化）：店头／主数字／段落／复制区走共用位与公共层组件，
 * 明细与对账是本页自有标记（类名 `ilife-recent-*`，作用域限 `.ilife-ticket-detail`，详情页零命中）；
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

/** 出现次数最多的那个值（并列取展示序里第一个；原型三笔同账本／同币种时即该值）。 */
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
  return { kpi, categories, data: { items: rows.map(toBillItem), total: rows.length, date: 'recent', kpi } };
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
  return '<div class="ilife-block-ledger-rows is-ticket">' + renderLedgerRows({
    rows: [
      { label: '收入', value: sumText(kpi.income) },
      { label: '净额', value: sumText(kpi.net) },
      { label: '落点账本', value: dominantOf(records.map((r) => r.ledger)) },
      { label: '币种', value: dominantOf(records.map((r) => r.currency)) },
    ],
    layout: 'ticket',
  }) + '</div>';
}

/** 分类占比 SCALE（与列表页同一组件；超 8 类截断明示，不静默截）。 */
function scaleHtml(categories: readonly QueryCategoryRow[]): string {
  const shown = categories.slice(0, CATEGORY_LIMIT);
  const hidden = categories.length - shown.length;
  const rows = renderDistributionRows({
    rows: shown.map((c) => ({ label: c.label, value: sumText(c.amount) + ' 元', pct: c.pct })),
  });
  return rows + (hidden > 0
    ? renderCaliberLine('这一页只列支出最多的前 ' + String(CATEGORY_LIMIT) + ' 类，还有 ' + String(hidden) + ' 类没列')
    : '');
}

/** 明细 DETAIL（展示序即入参序：卡片编号由公共层计数器出，行内只摆备注／次行／金额）。 */
function entriesHtml(records: readonly BillRow[]): string {
  const items = records.map((r) => {
    const sub = textOrDash(r.category) + ' · ' + textOrDash(r.account) + ' · '
      + '<span class="ilife-recent-mono">' + escapeHtml(r.time) + '</span> · #' + String(r.id);
    return '<li><span class="ilife-ticket-entry-text">备注 · ' + escapeHtml(textOrDash(r.note))
      + '<span class="ilife-recent-sub">' + sub + '</span></span>'
      + '<span class="ilife-recent-amt">' + escapeHtml(r.amount.toFixed(2)) + '</span></li>';
  }).join('');
  return '<div class="ilife-ticket-card"><ol class="ilife-ticket-entries">' + items + '</ol></div>';
}

/** 对账 CHECK（w04 原型字面：编号序列 / 共 N 笔 / 异常：无；分隔是半角斜线，见件头）。 */
function checkHtml(records: readonly BillRow[]): string {
  const ids = records.map((r) => String(r.id)).join('、');
  return '<div class="ilife-recent-check"><span class="ilife-recent-check-dot" aria-hidden="true"></span>'
    + '<span>编号 ' + escapeHtml(ids) + ' / 共 ' + String(records.length) + ' 笔 / 异常：无</span></div>';
}

/** 查最近票据纸的入参（调用方 `./read.js` 的 recent 分支已按时间倒序取好窗）。 */
export interface RecentTicketInput {
  readonly key: string;
  readonly params: Record<string, unknown>;
  readonly wakeWord: string;
  readonly window: string;
  readonly records: readonly BillRow[];
  readonly limit: number;
}

/** 查最近票据纸：一整页（载荷与 `./list.js` 同形，呈现照 w04 v2.1 原型）。 */
export function queryRecentTicketDoc(input: RecentTicketInput): string {
  const { kpi, categories, data } = modelOf(input.records);
  const conclusion = conclusionOf(categories);
  const envelope = listEnvelope(input.key, data);
  const paper = queryStyleTag()
    + sheetHead(DOC_TITLE + ' · ' + input.wakeWord, escapeHtml('最近 ' + String(input.limit) + ' 笔，支出 ' + sumText(kpi.expense) + ' 元'))
    + '<p class="ilife-recent-shop-sub">' + escapeHtml(input.window) + '</p>'
    + ticketRule()
    + ticketSummary(renderSummaryHead({
      eyebrow: '本页支出 · 最近 ' + String(input.limit) + ' 笔',
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
      + '<div class="ilife-recent-foot">' + escapeHtml(DOC_TITLE + ' · ' + input.wakeWord) + '</div>',
  });
  return assembleSheetPage({ docTitle: DOC_TITLE + '·查询', bodyHtml: content, paper: 'detail' });
}

/** recent 分支的出口：载荷与 `./list.js` 同形，页走本件票据纸；超体积回落老列表路（不静默丢页）。 */
export function recentTicketOut(input: RecentTicketInput): ViewOut {
  const html = queryRecentTicketDoc(input);
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
      emptyText: '库里还没有记录',
      emptyHint: '要记一笔就说「记支出」。',
      envelope: listEnvelope(input.key, data),
      source: SOURCE_QUERY,
      sourceText: SOURCE_TEXT_QUERY,
      windowStart: '不限',
      windowEnd: '不限',
      actionAt: actionStamp(),
    }),
  };
}
