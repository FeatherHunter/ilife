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
 * 对账 CHECK（编号序列 ／ 共 N 笔 ／ 异常：无，全角斜线 ／、顿号）＋
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

/** 占比段的类数上限（与 `./list.js` 的 `CATEGORY_LIMIT` 同数，老页 `slice(0,8)` 同）。 */
const CATEGORY_LIMIT = 8;

/** 空值占位（落点行永不缺席，无值即此符）。 */
const EMPTY_CELL = '—';

/** 主数字小字的计数词（原型逐字 `四笔分类均餐饮开头` 的 `四`）：1–10 取中文数字，更大的数照数写。 */
const COUNT_WORDS: readonly string[] = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];



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
  return n >= 1 && n <= COUNT_WORDS.length ? COUNT_WORDS[n - 1] : String(n);
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
  if (count === 0) return '这一窗没有记录。';
  return countWord(count) + '笔分类均' + category + '开头';
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
      { label: '收入', value: sumText(kpi.income) },
      { label: '净额', value: sumText(kpi.net) },
      { label: '落点账本', value: ledgers.length === 0 ? EMPTY_CELL : ledgers.join(' · ') },
      { label: '币种', value: currencies.length === 0 ? 'CNY' : currencies.join(' · ') },
      { label: '花得最多', value: top === undefined ? EMPTY_CELL : top.label + ' ' + sumText(top.amount) + ' 元' },
      { label: '占比', value: top === undefined ? EMPTY_CELL : '占本页支出 ' + String(Math.round(top.pct)) + '%' },
    ],
    layout: 'ticket',
  }) + '</div>';
}

/** 占比条（原型 `.entry-text .bar`）：轨＋按原值撑宽的填充；条宽不取整（原型即 `275÷333` 的浮点原样）。 */
function barHtml(pct: number): string {
  const width = Number.isFinite(pct) ? Math.min(100, Math.max(0, pct)) : 0;
  return '<span class="ilife-category-bar" role="img" aria-label="占本页支出 ' + String(Math.round(width)) + '%">'
    + '<i style="width:' + String(width) + '%"></i></span>';
}

/** 占比 SHARE（原型：entry-card 内逐类一行 `类 · 金额 元 · N 笔 · 均 X`＋条；类超 8 时跟一行口径）。 */
function shareHtml(categories: readonly QueryCategoryRow[]): string {
  const shown = categories.slice(0, CATEGORY_LIMIT);
  const hidden = categories.length - shown.length;
  const items = shown.map((c) => '<li><span class="ilife-ticket-entry-text">' + escapeHtml(c.label)
    + ' · ' + sumText(c.amount) + ' 元 · ' + String(c.count) + ' 笔 · 均 '
    + sumText(c.count === 0 ? 0 : c.amount / c.count) + barHtml(c.pct) + '</span></li>').join('');
  const card = '<div class="ilife-ticket-card"><ol class="ilife-ticket-entries">'
    + (items === '' ? '<li><span class="ilife-ticket-entry-text">本窗无支出，无占比。</span></li>' : items)
    + '</ol></div>';
  return card + (hidden > 0
    ? renderCaliberLine('这一页只列支出最多的前 ' + String(CATEGORY_LIMIT) + ' 类，还有 ' + String(hidden) + ' 类没列')
    : '');
}

/** 备注 NOTES（原型：逐笔一行、**无金额**；编号接占比行续排，故第二张卡的计数器起值＝占比行数）。 */
function notesHtml(records: readonly BillRow[], start: number): string {
  const items = records.map((r) => '<li><span class="ilife-ticket-entry-text">备注 · ' + escapeHtml(textOrDash(r.note))
    + ' ' + escapeHtml(textOrDash(r.category)) + ' · ' + escapeHtml(textOrDash(r.account))
    + ' · ' + escapeHtml(r.time) + '</span></li>').join('');
  return '<div class="ilife-ticket-card"><ol class="ilife-ticket-entries"'
    + (start > 0 ? ' style="counter-reset: ilife-ticket-row ' + String(start) + '"' : '')
    + '>' + items + '</ol></div>';
}

/** 对账 CHECK（原型 `checkHTML` 同式：编号序列 ／ 共 N 笔 ／ 异常：无；全角斜线）。 */
function checkHtml(records: readonly BillRow[], countText: string): string {
  const ids = records.map((r) => String(r.id)).join('、');
  return '<div class="ilife-category-check"><span class="ilife-category-check-dot" aria-hidden="true"></span>'
    + '<span>编号 ' + escapeHtml(ids) + ' ／ 共 ' + countText + ' ／ 异常：无</span></div>';
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
}

/** 查分类票据纸：一整页（载荷与 `./list.js` 条件分支同形，呈现照 w09 v2.2 原型）。 */
export function queryCategoryTicketDoc(input: CategoryTicketInput): string {
  const { kpi, categories, data } = modelOf(input.records);
  const notes = countNotes(input.records, kpi.count);
  const shown = categories.slice(0, CATEGORY_LIMIT);
  const envelope = listEnvelope(input.key, data);
  const paper = queryStyleTag()
    + sheetHead(
      DOC_TITLE + ' · ' + input.wakeWord,
      escapeHtml(input.wakeWord + '共记 ' + notes.head),
      input.window,
    )
    + ticketRule()
    + ticketSummary(renderSummaryHead({
      eyebrow: '分类支出 · ' + input.category,
      value: sumText(kpi.expense),
      unit: '元',
      layout: 'ticket',
    }), '<p class="ilife-ticket-summary-note">' + escapeHtml(noteOf(kpi.count, input.category)) + '</p>')
    + ticketRule()
    + ticketSection({ title: '落点', tag: 'LEDGER', content: ledgerHtml(kpi, input.records, categories[0]) })
    + ticketRule()
    + ticketSection({ title: '占比', tag: 'SHARE', content: shareHtml(categories) })
    + ticketRule()
    + ticketSection({ title: '备注', tag: 'NOTES', content: notesHtml(input.records, shown.length) })
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
      + '<div class="ilife-category-foot">' + escapeHtml(DOC_TITLE + ' · ' + input.wakeWord) + '</div>',
  });
  return assembleSheetPage({ docTitle: DOC_TITLE + '·查询', bodyHtml: content, paper: 'detail' });
}

/** category 单条件分支的出口：载荷与 `./list.js` 条件分支同形，页走本件票据纸；超体积回落老列表路（不静默丢页）。 */
export function categoryTicketOut(input: CategoryTicketInput): ViewOut {
  const html = queryCategoryTicketDoc(input);
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
      chips: ['共 ' + String(input.records.length) + ' 笔', '占全部支出的 ' + String(input.sharePct) + '%'],
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
