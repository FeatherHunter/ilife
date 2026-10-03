/** 查询域·查分期票据纸（w16 专属，`bill.record.search` 的 `installment` 分支）。
 *
 * 原型（唯一判地）：`.scratch/1019-p-query/w16-查分期-v2.1.html`（`*-v2*.html` 取版本号最高者）。
 * 纸头 `饼干记账 · 查分期` ＋ H2 `分期中 N 笔，X 元` ＋ 副题 `分期还款的那些账` ＋
 * 主数字（分期还款 · N 笔／支出唯一）＋ 结论标准句 ＋ 落点 LEDGER（收入／净额／落点账本／币种）＋
 * 分类占比 SCALE ＋ 明细 DETAIL（序号／备注／分类·账户·时刻·#编号／金额）＋
 * 对账 CHECK（编号序列 ／ 共 N 笔 ／ 异常：无）＋ 复制区（复制数据▾三格式＋复制日志）＋
 * 裁切线 `✂ 裁切线` ＋ 页脚 `饼干记账 · 查分期`。本页无 scale-note（原型就没有）。
 *
 * 谁在用（一个调用点，指名）：`./read.js` 的 `viewRecordSearch` 的 `installment` 分支（有数时）。
 * 空结果（零行）走老 `listOut` 路——空态句与引导一字不动，本件不碰空态。
 *
 * 载荷一字不动：`data` 键＝`items／total／kind('installment')／kpi`（与搬迁前同形，经 `./list.js`
 * 的 `listEnvelope` 出）；页面明细那份文本化只进明细行。KPI 与分类聚合与 `./list.js`
 * 的 `listOut` 同源（同一份 `calcKpi`／`calcCategories`，占比＝分类支出÷本页支出）。
 * 呈现映射沿 `./detail.js`（#993 小票化）与 `./ticketDebt.js`（w14 票据纸先例）：
 * 店头／主数字／段落／复制区走共用位与公共层组件，明细卡与对账行是本页自有标记
 * （类名 `ilife-installment-*`，作用域限 `.ilife-ticket-detail`，他页零命中）；
 * 颜色与圆角一律读皮肤 token，不抄字面色。
 */
import { escapeHtml } from 'base-paint';
import { renderCaliberLine, renderDistributionRows, renderLedgerRows, renderSheetFrame, renderSummaryHead } from 'base-paint/blocks';
import type { BillRow } from '../fetch/index.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { actionStamp, copyArea, copyLog } from '../shared/copyArea.js';
import { DOC_TITLE, DOC_VERSION } from '../shared/pageIdentity.js';
import { DB_FILENAME } from '../fetch/index.js';
import { calcKpi } from '../shared/kpi.js';
import { calcCategories } from '../analysis/index.js';
import { estimateBytes } from '../render/html.js';
import { toBillItem } from './items.js';
import { listEnvelope, queryListDoc } from './list.js';
import type { QueryCategoryRow, QueryKpi, QueryListData, QueryTableRow } from './list.js';
import { queryStyleTag } from './pageParts.js';
import { assembleSheetPage, sheetHead, ticketActions, ticketRule, ticketSection, ticketSummary } from '../shared/docPage.js';
import { commandLine, writeSection } from '../shared/writeParts.js';

/** 本次数据来源（复制日志第 3 段，与 `./read.js` 的查询来源同字）。 */
const SOURCE_QUERY = DB_FILENAME + '（查询结果：只读，不改库）';

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
  if (top === undefined) return '本页只有收入，没有支出。';
  return '主要花在「' + top.label + '」，' + sumText(top.amount) + ' 元，占本页支出 '
    + String(Math.round(top.pct)) + '%。';
}

/** 落点 LEDGER 四行（原型逐字：收入／净额／落点账本／币种；金额裸数不带单位）。 */
function ledgerHtml(kpi: QueryKpi, records: readonly BillRow[]): string {
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

/** 明细 DETAIL（展示序即入参序：序号由卡片计数器出，备注首行，次行分类·账户·时刻·#编号，金额右对齐）。 */
function entriesHtml(records: readonly BillRow[]): string {
  return '<div class="ilife-ticket-card"><ol class="ilife-ticket-entries">' + records.map((r) => {
    const note = escapeHtml(textOrDash(r.note));
    const sub = escapeHtml(textOrDash(r.category)) + ' · ' + escapeHtml(textOrDash(r.account)) + ' · '
      + '<span class="ilife-installment-mono">' + escapeHtml(r.time) + '</span> · #' + String(r.id);
    return '<li><span class="ilife-ticket-entry-text">备注 · ' + note
      + '<span class="ilife-installment-sub">' + sub + '</span></span>'
      + '<span class="ilife-installment-amt">' + escapeHtml(r.amount.toFixed(2)) + '</span></li>';
  }).join('') + '</ol></div>';
}

/** 对账 CHECK（原型逐字：编号序列 ／ 共 N 笔 ／ 异常：无；全角斜线与冒号）。 */
function checkHtml(records: readonly BillRow[]): string {
  const ids = records.map((r) => String(r.id)).join('、');
  return '<div class="ilife-installment-check"><span class="ilife-installment-check-dot" aria-hidden="true"></span>'
    + '<span>编号 ' + escapeHtml(ids) + ' ／ 共 ' + String(records.length) + ' 笔 ／ 异常：无</span></div>';
}

/** 查分期票据纸的入参（调用方 `./read.js` 的 installment 分支已按分期口径取好窗）。 */
export interface InstallmentTicketInput {
  readonly key: string;
  readonly params: Record<string, unknown>;
  readonly wakeWord: string;
  readonly window: string;
  readonly records: readonly BillRow[];
}

/** 查分期票据纸：一整页（载荷与 `./list.js` 同形，呈现照 w16 v2.1 原型）。 */
export function queryInstallmentTicketDoc(input: InstallmentTicketInput): string {
  const records = [...input.records];
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
    kind: 'installment',
    kpi,
  };
  const envelope = listEnvelope(input.key, data);
  const paper = queryStyleTag()
    + sheetHead(DOC_TITLE + ' · ' + input.wakeWord, escapeHtml('分期中 ' + String(records.length) + ' 笔，' + sumText(kpi.expense) + ' 元'))
    + '<p class="ilife-installment-shop-sub">' + escapeHtml(input.window) + '</p>'
    + ticketRule()
    + ticketSummary(renderSummaryHead({
      eyebrow: '分期还款 · ' + String(records.length) + ' 笔',
      value: sumText(kpi.expense),
      unit: '元',
      layout: 'ticket',
    }), '<p class="ilife-ticket-summary-note">' + escapeHtml(conclusionOf(categories)) + '</p>')
    + ticketRule()
    + ticketSection({ title: '落点', tag: 'LEDGER', content: ledgerHtml(kpi, records) })
    + ticketRule()
    + ticketSection({ title: '分类占比', tag: 'SCALE', content: scaleHtml(categories) })
    + ticketRule()
    + ticketSection({ title: '明细', tag: 'DETAIL', content: entriesHtml(records) })
    + ticketRule()
    + ticketSection({ title: '对账', tag: 'CHECK', content: checkHtml(records) })
    + ticketRule()
    + ticketActions(copyArea({
      data: { envelope, title: input.wakeWord },
      log: {
        envelope,
        copyLog: copyLog({
          command: commandLine(input.key, input.params),
          source: SOURCE_QUERY,
          detail: '查到 ' + String(records.length) + ' 笔',
          actionAt: actionStamp(),
          version: DOC_VERSION,
        }),
      },
    }));
  const content = writeSection({
    slot: 'list', page: 'list', shape: 'list', key: input.key,
    content: renderSheetFrame({ variant: 'ticket', cutLine: true, cutLineText: '✂ 裁切线', content: paper })
      + '<div class="ilife-installment-foot">' + escapeHtml(DOC_TITLE + ' · ' + input.wakeWord) + '</div>',
  });
  return assembleSheetPage({
    docTitle: DOC_TITLE + '·查询',
    bodyHtml: content,
    paper: 'detail',
  });
}

/** installment 分支的出口：载荷与 `./list.js` 同形，页走本件票据纸；超体积回落老列表路（不静默丢页）。 */
export function installmentTicketOut(input: InstallmentTicketInput): ViewOut {
  const html = queryInstallmentTicketDoc(input);
  if (estimateBytes(html) <= PAGE_BYTE_BUDGET) {
    const records = [...input.records];
    const kpi: QueryKpi = calcKpi(records);
    const data: QueryListData = {
      items: records.map(toBillItem),
      total: records.length,
      kind: 'installment',
      kpi,
    };
    return { data, page: { wakeWord: input.wakeWord, kind: 'single' }, html };
  }
  const rows: readonly QueryTableRow[] = [...input.records].map((r) => ({
    id: String(r.id),
    time: r.time,
    category: r.category,
    amount: r.amount.toFixed(2),
    account: r.account,
    ledger: r.ledger,
    note: r.note,
  }));
  const kpi: QueryKpi = calcKpi([...input.records]);
  const cats: readonly QueryCategoryRow[] = kpi.expense === 0 ? [] : calcCategories([...input.records]).map((c) => ({
    label: c.category,
    amount: c.total,
    count: c.count,
    pct: (c.total / kpi.expense) * 100,
  }));
  const data: QueryListData = {
    items: [...input.records].map(toBillItem),
    total: input.records.length,
    kind: 'installment',
    kpi,
  };
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
      categories: cats,
      emptyText: '没有找到符合条件的记录',
      emptyHint: '换个关键词试试，也可以看看「查最近」。',
      envelope: listEnvelope(input.key, data),
      source: SOURCE_QUERY,
      sourceText: '记账库（只读）',
      windowStart: '不限',
      windowEnd: '不限',
      actionAt: actionStamp(),
    }),
  };
}
