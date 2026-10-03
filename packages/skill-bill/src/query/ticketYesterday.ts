/** 查询域·查昨天票据纸（w02 专属，`bill.record.today` 的 date 分支中唤醒词为查昨天且有数时）。
 *
 * 原型（唯一判地）：`.scratch/1019-p-query/w02-查昨天-v2.1.html`（v2*.html 取版本号最高者）。
 * 八部位（逐像素对照，分隔符逐字节核实）：
 * 纸头 `饼干记账 · 查昨天` ＋ H2 `昨天 N 笔，支出 X 元`（无 `共`，半角空格＋全角逗号，
 * 见原型 `<h2>` 字节 `26152,22825,32,…,65292`）＋ 副题 `{date} 这一天`（无别名句，w01 专属）＋
 * 主数字（`本页支出 · 共 N 笔`＋支出唯一＋结论句进小字）＋ 落点 LEDGER（收入／净额／落点账本／
 * 币种）＋ 分类占比 SCALE（条宽整数和 100，下见 `intPcts`）＋ 明细 DETAIL（首行 `备注 · ` 中点
 * 两侧各一枚半角空格，与 w03 同字——原型字节 `32,183,32`，目测紧凑纯属字形误判）／
 * 分类·账户·时刻·#编号／金额）＋ 对账 CHECK（`编号 {ids} ／ 共 N 笔 ／ 异常：无`，分隔全角斜线
 * `65295` 两侧空格、`异常：` 全角冒号 `65306`，与 w03 同）＋ 复制区（复制数据▾三格式＋复制日志，
 * 原样走 `copyArea`）＋ 裁切线 `✂ 裁切线` ＋ 页脚 `饼干记账 · 查昨天`。口径段无（1045 全删，与 v2.1 同）。
 *
 * 谁在用（一个调用点，指名）：`./read.js` 的 `viewRecordToday` 的 date 分支（唤醒词是查昨天且
 * 有数时；查今天／查某天／零行仍走老 `listOut` 路，各归各席，空态四句一字不动）。
 *
 * 载荷键一字不动：`data` 键＝`items／total／date／kpi`（与搬迁前同形，经 `./list.js`
 * 的 `listEnvelope` 出）。KPI 与分类聚合与 `./list.js` 的 `listOut` 同源（`calcKpi` 算一次，
 * `calcCategories` 经分析域门取，占比＝分类支出÷本页支出）；条宽整数化只动呈现（`intPcts`
 * 最大余数法），口径不动。
 * 呈现映射沿 w01 `ticketToday.ts`：店头／主数字／段落／复制区走共用位与公共层组件，
 * 明细与对账是本页自有标记（类名 `ilife-yesterday-*`，作用域限 `.ilife-ticket-detail`，
 * 详情页与其他票据页零命中）；颜色与圆角一律读皮肤 token，不抄字面色。
 * 展示序沿 w01 入参序（单记录原型无法区分排序，w03 时间升序是它自己的原型字面；
 * 本页与 w01 同属 `listToday` 取数序，不另排）。
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

/** 占比整数（和 100 的最大余数法；与 w01 `intPcts` 同算法，单类时即 100）。 */
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

/** 分类占比 SCALE（与列表页同一组件；条宽整数和 100；超 8 类截断明示，不静默截）。 */
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

/** 明细 DETAIL（展示序即入参序：卡片编号由公共层计数器出；首行 `备注 · ` 中点两侧空格是 w02
 *  原型字面，次行分类·账户·时刻·#编号，金额右对齐裸数带符号）。 */
function entriesHtml(records: readonly BillRow[]): string {
  const items = records.map((r) => {
    const sub = textOrDash(r.category) + ' · ' + textOrDash(r.account) + ' · '
      + '<span class="ilife-yesterday-mono">' + escapeHtml(r.time) + '</span> · #' + String(r.id);
    return '<li><span class="ilife-ticket-entry-text">备注 · ' + escapeHtml(textOrDash(r.note))
      + '<span class="ilife-yesterday-sub">' + sub + '</span></span>'
      + '<span class="ilife-yesterday-amt">' + escapeHtml(r.amount.toFixed(2)) + '</span></li>';
  }).join('');
  return '<div class="ilife-ticket-card"><ol class="ilife-ticket-entries">' + items + '</ol></div>';
}

/** 对账 CHECK（w02 原型字面：编号序列 ／ 共 N 笔 ／ 异常：无；分隔是全角斜线，见件头）。 */
function checkHtml(records: readonly BillRow[], countText: string): string {
  const ids = records.map((r) => String(r.id)).join('、');
  return '<div class="ilife-yesterday-check"><span class="ilife-yesterday-check-dot" aria-hidden="true"></span>'
    + '<span>编号 ' + escapeHtml(ids) + ' ／ 共 ' + countText + ' ／ 异常：无</span></div>';
}

/** 查昨天票据纸的入参（调用方 `./read.js` 的 date 分支已按昨天取好窗；零行不进本件）。 */
export interface YesterdayTicketInput {
  readonly key: string;
  readonly params: Record<string, unknown>;
  readonly wakeWord: string;
  readonly window: string;
  readonly date: string;
  readonly records: readonly BillRow[];
  readonly emptyText: string;
  readonly emptyHint: string;
}

/** 查昨天票据纸：一整页（载荷与 `./list.js` 同形，呈现照 w02 v2.1 原型）。 */
export function queryYesterdayTicketDoc(input: YesterdayTicketInput): string {
  const { kpi, categories, data } = modelOf(input.records, input.date);
  const notes = countNotes(input.records, kpi.count);
  const conclusion = input.records.length === 0
    ? '本窗没有记录。下一步说「记一笔 午饭 35」即可记上。'
    : conclusionOf(categories);
  const envelope = listEnvelope(input.key, data);
  const paper = queryStyleTag()
    + sheetHead(DOC_TITLE + ' · ' + input.wakeWord, escapeHtml('昨天 ' + notes.head + '，支出 ' + sumText(kpi.expense) + ' 元'))
    + '<p class="ilife-yesterday-shop-sub">' + escapeHtml(input.window) + '</p>'
    + ticketRule()
    + ticketSummary(renderSummaryHead({
      eyebrow: '本页支出 · 共 ' + String(kpi.count) + ' 笔',
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
      + '<div class="ilife-yesterday-foot">' + escapeHtml(DOC_TITLE + ' · ' + input.wakeWord) + '</div>',
  });
  return assembleSheetPage({ docTitle: DOC_TITLE + '·查询', bodyHtml: content, paper: 'detail' });
}

/** date 分支中查昨天的出口：载荷与 `./list.js` 同形，页走本件票据纸；
 *  零行或超体积回 null（调用方回落老列表路，不静默丢页，空态四句不动）。 */
export function yesterdayTicketOut(input: YesterdayTicketInput): ViewOut | null {
  if (input.records.length === 0) return null;
  const html = queryYesterdayTicketDoc(input);
  const { data } = modelOf(input.records, input.date);
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
  const { kpi, categories } = modelOf(input.records, input.date);
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
      emptyText: input.emptyText,
      emptyHint: input.emptyHint,
      envelope: listEnvelope(input.key, data),
      source: SOURCE_QUERY,
      sourceText: SOURCE_TEXT_QUERY,
      windowStart: input.date,
      windowEnd: input.date,
      actionAt: actionStamp(),
    }),
  };
}
