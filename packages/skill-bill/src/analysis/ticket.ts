/** 分析域·A 组票据纸呈现（1057 落地：总览／对比组 8 页切票据纸 v2）。
 *
 * 范围（票面 1057 名单，w09 留给 1056 查询域，本件不碰查询）：
 *   看月度／看年度／看总览／做统计（bars 族 4 页）＋ 看对比／看双区间／看同比／看分类对比（compare 族 4 页）。
 *   bars 族其余 9 页（看周报／看分类／看账户／看账本／看结构／看大额／看高频／看活跃／看退款）走老路，
 *   由模板件按场景 id 分支（其余页逐字节不动，沿 #993“29 页不动”）。
 *
 * 设计（沿 #993 小票化：重做呈现，不改口径）：
 *   载荷一字不动（stat／analysis 形状照旧）；复制区与来源脚注原样保留（t729 骨架判据要恰好一个导航＋
 *   一行来源脚注＋无内部标识）；页内导航保留。新增的只是票据纸三段（店头一句聚合＋主数字唯一＋
 *   落点账目＋明细条），数字全部取自本次取值结果（只搬家不重算，条宽与 F／L 逐字节对 v2 真值）。
 *
 * 口径来源（原型 v2.1）：
 *   H2 一句聚合（1031 总览类 3 页＋1021 PAGES 表 a09-a13）；主数字唯一（支出，a09 笔数，a13 见明细）；
 *   余数进落点（收入／净额／日均／两段支出／差最大，数字取自 kpi／sides／change）；明细 ol 文字与条宽
 *   取自既有 barGroups（pct 已按最大折算，与原型逐字节一致）；落点 S1／S3 保留（a01-a03 S1，a09-a13 S3）。
 *
 * 谁在用（两个调用点，指名）：`./template-bars.ts`（A 组 4 页分支）与 `./template-compare.ts`
 *   （本族 4 页全在 A 组，整族切）。本件不含块位序列（序列仍在各族模板件），只产票据纸段落。
 */
import { renderLedgerRows, renderSummaryHead } from 'base-paint/blocks';
import { escapeHtml } from 'base-paint';
import { assembleSheetPage, sheetHead, ticketRule, ticketSection, ticketSummary } from '../shared/docPage.js';
import { badgeOf, copyZoneOf, docTitleOf, money, NO_WINDOW, SOURCE_READ, SOURCE_READ_TEXT, sourceNoteOf } from './pageParts.js';
import { navBlock, pageBody, pageNav } from '../shared/pageSections.js';
import type { PageBlock } from '../shared/pageSections.js';
import { renderCaliberLine, renderConclusionBar } from 'base-paint/blocks';
import { barGroupHtml, factCardHtml } from './cards.js';
import type { BarsPage, ComparePage, DocInput } from './scene.js';

/** A 组 8 个场景 id（唯一定义地）：bars 4 ＋ compare 4。w09 不在此（查询域，1056）。 */
export const A_TICKET_IDS = [
  'monthly',
  'yearly',
  'overview',
  'stats',
  'period_compare',
  'range_compare',
  'yoy',
  'cat_compare',
] as const;

/** 是否走票据纸（按场景 id 分支，bars 族其余页走老路）。 */
export function isATicket(id: string): boolean {
  return (A_TICKET_IDS as readonly string[]).includes(id);
}

/** 店头品牌行（原型 `.shop-brand`）：饼干记账 · 唤醒词。 */
function brandOf(wakeWord: string): string {
  return '饼干记账 · ' + wakeWord;
}

/** H2 一句聚合（原型 v2.1 单行，不换行不断裂，CSS 由 TICKET_CSS 的单行类承担，此处只给文本）。 */
export function h2For(id: string, count: number, barRows: number): string {
  switch (id) {
    case 'monthly': return '月度共记 ' + String(count) + ' 笔';
    case 'yearly': return '年度共记 ' + String(count) + ' 笔';
    case 'overview': return '总览共记 ' + String(count) + ' 笔';
    case 'stats': return '全库共记 ' + String(count) + ' 笔';
    case 'period_compare': return '对比共记 2 月';
    case 'range_compare': return '双区间共记 2 段';
    case 'yoy': return '同比共记 2 月';
    case 'cat_compare': return '分类对比共记 ' + String(barRows) + ' 类';
    default: return '共记 ' + String(count) + ' 笔';
  }
}

/** 基线文件名（落点 LEDGER 末行，原型逐字）：a01-a03 在 1031，a09-a13 在 1021。 */
function baselineOf(id: string): string {
  switch (id) {
    case 'monthly': return 'a01-看月度-proto.html';
    case 'yearly': return 'a02-看年度-proto.html';
    case 'overview': return 'a03-看总览-proto.html';
    case 'stats': return 'a09-做统计-proto.html';
    case 'period_compare': return 'a10-看对比-proto.html';
    case 'range_compare': return 'a11-看双区间-proto.html';
    case 'yoy': return 'a12-看同比-proto.html';
    case 'cat_compare': return 'a13-看分类对比-proto.html';
    default: return '';
  }
}

/** 落点 S（原型 CALIBER 段那句）：a01-a03 S1，总览 S1；a09-a13 S3（1021 落点）。 */
function caliberTagOf(id: string): string {
  switch (id) {
    case 'monthly':
    case 'yearly':
    case 'overview': return '口径见基线原文，图形为占位，不重算；不断言数据对错。';
    default: return '图只是示意排布，不用它读数；数字看上面和下面。';
  }
}

/** 主数字（原型 summary-head：支出唯一，a09 笔数，a13 见明细）。 */
function summaryForBars(id: string, expense: number, count: number): { eyebrow: string; value: string; unit: string; note: string } {
  if (id === 'stats') {
    return { eyebrow: '分析域 · 总览', value: String(count), unit: '笔', note: '总笔数 · 明细与复制区与基线一致' };
  }
  return { eyebrow: '分析域 · 总览', value: money(expense), unit: '元', note: '支出 · 明细与复制区与基线一致' };
}

/** bars 落点账目（余数进落点，数字只搬家）：收入／净额／来源／基线，ovs 另加日均。 */
function ledgerBars(id: string, income: number, net: number, extra: readonly { k: string; v: string }[]): string {
  const rows = [
    { label: '收入', value: money(income) + ' 元' },
    { label: '净额', value: money(net) + ' 元' },
    ...extra.map((r) => ({ label: r.k, value: r.v })),
    { label: '来源', value: SOURCE_READ_TEXT },
    { label: '基线', value: baselineOf(id) },
  ];
  return renderLedgerRows({ rows, layout: 'ticket' });
}

/** compare 落点账目（三行式，取自 sides＋change，与原型 PAGES 表逐字对）：由调用方拼好三行传进来。 */
function ledgerCompare(rows: readonly { k: string; v: string }[], id: string): string {
  const full = [
    ...rows.map((r) => ({ label: r.k, value: r.v })),
    { label: '来源', value: '记账库' },
    { label: '基线', value: baselineOf(id) },
  ];
  return renderLedgerRows({ rows: full, layout: 'ticket' });
}

/** 票据纸装配（A 组共用收口）：店头＋主数字＋落点＋明细＋口径＋复制＋来源＋导航，包进小票纸。
 *
 * 为保 t729 骨架判据（恰好一个导航＋一行来源脚注＋复制区），复制／来源／导航沿用老口径组件，
 * 只是包进 `assembleSheetPage`（ticket 纸）而不是 `analysisDocOf` 的页面壳。
 */
function ticketDoc(input: {
  readonly docTitle: string;
  readonly wakeWord: string;
  readonly h2: string;
  readonly windowLabel: string;
  readonly summaryHtml: string;
  readonly summaryNote: string;
  readonly ledgerHtml: string;
  readonly detailHtml: string;
  readonly caliber: string;
  readonly caliberTag: string;
  readonly key: string;
  readonly params: Record<string, unknown>;
  readonly envelope: DocInput<BarsPage | ComparePage>['envelope'];
  readonly source: string;
  readonly detail: string;
  readonly actionAt: string;
  readonly windowStart: string;
  readonly windowEnd: string;
  readonly count: number;
  readonly conclusion: string;
}): string {
  const head = sheetHead(brandOf(input.wakeWord), escapeHtml(input.h2))
    + '<p class="shop-sub">' + escapeHtml(input.windowLabel) + '</p>';
  const summary = ticketSummary(input.summaryHtml, '<p class="ilife-ticket-summary-note">' + escapeHtml(input.summaryNote) + '</p>');
  const blocks: readonly PageBlock[] = [
    navBlock(input.ledgerHtml, 'sec-ledger', '落点'),
    navBlock(input.detailHtml, 'sec-detail', '明细'),
  ];
  const copyHtml = copyZoneOf({
    envelope: input.envelope,
    title: input.wakeWord,
    key: input.key,
    params: input.params,
    source: input.source,
    detail: input.detail,
    actionAt: input.actionAt,
  });
  const body = head
    + ticketRule()
    + summary
    + ticketRule()
    + ticketSection({ title: '落点', tag: 'LEDGER', content: input.ledgerHtml })
    + ticketRule()
    + ticketSection({ title: '明细', tag: 'DETAIL', content: input.detailHtml })
    + ticketRule()
    + ticketSection({
      title: '落点与口径',
      tag: 'CALIBER',
      content: '<p class="caliber">' + escapeHtml(input.caliberTag) + '</p>'
        + renderCaliberLine(input.caliber),
    })
    + renderConclusionBar(input.conclusion)
    + badgeOf({ word: input.wakeWord, caliber: '', status: 'ok', statusText: '看完了', next: '' })
    + pageNav(blocks)
    + pageBody(blocks)
    + navBlock(copyHtml, 'sec-copy', '复制').html
    + sourceNoteOf({
      sourceText: SOURCE_READ_TEXT,
      start: input.windowStart,
      end: input.windowEnd,
      count: input.count,
    });
  return assembleSheetPage({ docTitle: input.docTitle, bodyHtml: body, paper: 'receipt' });
}

/** bars 族 A 组 4 页的票据纸正文（明细沿用既有 barGroups，条宽逐字节不动）。 */
export function ticketBarsDoc(input: DocInput<BarsPage>, sceneId: string, extraLedger: readonly { k: string; v: string }[]): string {
  const r = input.result;
  const p = r.page;
  const s = summaryForBars(sceneId, r.kpi.expense, r.kpi.count);
  const summary = renderSummaryHead({
    eyebrow: s.eyebrow,
    value: s.value,
    unit: s.unit,
    note: s.note,
    layout: 'ticket',
    size: 'l',
  });
  const ledgerHtml = ledgerBars(sceneId, r.kpi.income, r.kpi.net, extraLedger);
  const parts: string[] = [];
  for (const g of p.barGroups) {
    parts.push('<p>' + escapeHtml(g.title) + '</p>' + barGroupHtml(g));
  }
  for (const c of p.factCards) {
    const html = factCardHtml(c);
    if (html !== '') parts.push('<p>' + escapeHtml(c.title) + '</p>' + html);
  }
  const detailHtml = parts.length === 0 ? '<p>暂无明细</p>' : parts.join('');
  return ticketDoc({
    docTitle: docTitleOf(r.title),
    wakeWord: input.wakeWord,
    h2: h2For(sceneId, r.count, p.barGroups.length === 0 ? 0 : p.barGroups[0].rows.length),
    windowLabel: r.label,
    summaryHtml: summary,
    summaryNote: s.note,
    ledgerHtml,
    detailHtml,
    caliber: r.caliber,
    caliberTag: caliberTagOf(sceneId),
    key: input.key,
    params: input.params,
    envelope: input.envelope,
    source: SOURCE_READ,
    detail: '取到 ' + String(r.count) + ' 条记录',
    actionAt: input.actionAt,
    windowStart: r.from === '' ? NO_WINDOW : r.from,
    windowEnd: r.to === '' ? NO_WINDOW : r.to,
    count: r.count,
    conclusion: r.conclusion,
  });
}

/** compare 主数字：前段／本期那一侧的支出（原型 a10/a11 前段，a12 本期；只搬家不重算）。 */
function firstSideExpense(p: ComparePage): number {
  const side = p.sides[0];
  if (side === undefined) return 0;
  for (const kpi of side.kpis) {
    if (kpi.label === '支出') {
      const n = Number(String(kpi.value).replace(/,/g, ''));
      return Number.isFinite(n) ? n : 0;
    }
  }
  return 0;
}

/** compare 族 4 页整族切票据纸（本族全在 A 组，无残留分支）。 */
export function ticketCompareDoc(
  input: DocInput<ComparePage>,
  sceneId: string,
  ledgerRows: readonly { k: string; v: string }[],
): string {
  const r = input.result;
  const p = r.page;
  const summary = renderSummaryHead({
    eyebrow: '分析域 · 对比',
    value: sceneId === 'cat_compare' ? '见明细' : money(firstSideExpense(p)),
    unit: sceneId === 'cat_compare' ? '类' : '元',
    note: sceneId === 'cat_compare' ? '结论 · 明细与复制区与基线一致' : '支出 · 明细与复制区与基线一致',
    layout: 'ticket',
    size: 'l',
  });
  const parts: string[] = [];
  for (const g of p.barGroups) {
    parts.push('<p>' + escapeHtml(g.title) + '</p>' + barGroupHtml(g));
  }
  for (const c of p.factCards) {
    const html = factCardHtml(c);
    if (html !== '') parts.push('<p>' + escapeHtml(c.title) + '</p>' + html);
  }
  const detailHtml = parts.length === 0 ? '<p>' + escapeHtml(r.conclusion) + '</p>' : parts.join('');
  return ticketDoc({
    docTitle: docTitleOf(r.title),
    wakeWord: input.wakeWord,
    h2: h2For(sceneId, r.count, r.page.barGroups.length === 0 ? 0 : r.page.barGroups[0].rows.length),
    windowLabel: r.label,
    summaryHtml: summary,
    summaryNote: sceneId === 'cat_compare' ? '结论 · 明细与复制区与基线一致' : '支出 · 明细与复制区与基线一致',
    ledgerHtml: ledgerCompare(ledgerRows, sceneId),
    detailHtml,
    caliber: r.caliber,
    caliberTag: caliberTagOf(sceneId),
    key: input.key,
    params: input.params,
    envelope: input.envelope,
    source: SOURCE_READ,
    detail: '取到 ' + String(r.count) + ' 条记录',
    actionAt: input.actionAt,
    windowStart: r.from === '' ? NO_WINDOW : r.from,
    windowEnd: r.to === '' ? NO_WINDOW : r.to,
    count: r.count,
    conclusion: r.conclusion,
  });
}
