/** 分析域·A 组票据纸呈现（1057 落地：总览／对比组 8 页切票据纸 v2；1061 续 C 组 5 页；
 *  1066 起 `ticketDoc` 复用给 B 组（见 `./ticket-b.ts`），本件其余只盖 A／C。
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
 * 谁在用（调用点，指名）：`./template-bars.ts`（A 组 4 页分支）与 `./template-compare.ts`
 *   （本族 4 页全在 A 组，整族切）；`./ticket-b.ts`（B 组 12 页，复用下文 `ticketDoc` 装配）。
 *   本件不含块位序列（序列仍在各族模板件），只产票据纸段落。
 */
import { renderChartBlock, renderLedgerRows, renderSheetFrame, renderSummaryHead } from 'base-paint/blocks';
import { escapeHtml } from 'base-paint';
import { assembleSheetPage, sheetHead, ticketActions, ticketRule, ticketSection, ticketSummary } from '../shared/docPage.js';
import { renderCaliberLine } from 'base-paint/blocks';
import { baselineFileOf, copyZoneOf, docTitleOf, money, SOURCE_READ, SOURCE_READ_TEXT } from './pageParts.js';
import type { AnalysisCopy } from './copyTextAnalysis.js';
import { barGroupHtml, compareSidesHtml, factCardHtml, listCardHtml } from './cards.js';
import { chartFor } from './chartOf.js';
import type { BarsPage, ComparePage, DocInput } from './scene.js';
import { m } from '../entries/index.js';

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

/** C 组 5 个场景 id（1061 落地：a04-a08 bars 族剩余 5 页；与 A 组同走票据纸，w09 不在此）。 */
export const C_TICKET_IDS = [
  'week',
  'category',
  'account',
  'ledger',
  'structure',
] as const;

/** 是否走票据纸（按场景 id 分支，bars 族其余页走老路）。 */
export function isATicket(id: string): boolean {
  return (A_TICKET_IDS as readonly string[]).includes(id)
    || (C_TICKET_IDS as readonly string[]).includes(id);
}

/** 是否 C 组票据纸（1061：a04-a08；落点余数行为整行式，与 A 组收入／净额＋余数不同）。 */
export function isCTicket(id: string): boolean {
  return (C_TICKET_IDS as readonly string[]).includes(id);
}

/** 店头品牌行（原型 `.shop-brand`）：饼干记账 · 唤醒词。 */
function brandOf(wakeWord: string): string {
  return m('skill-bill.analysis-ticket.c001', { p0: String(wakeWord) });
}

/** H2 一句聚合（原型 v2.1 单行，不换行不断裂，CSS 由 TICKET_CSS 的单行类承担，此处只给文本）。 */
export function h2For(id: string, count: number, barRows: number): string {
  // 写成 if 链而不是 switch：迁移器只认 copy／concat 位置，switch 的分支标签会被判跳过（#1208）。
  if (id === 'monthly') return m('skill-bill.analysis-ticket.c002', { p0: String(String(count)) });
  if (id === 'yearly') return m('skill-bill.analysis-ticket.c003', { p0: String(String(count)) });
  if (id === 'overview') return m('skill-bill.analysis-ticket.c004', { p0: String(String(count)) });
  if (id === 'stats') return m('skill-bill.analysis-ticket.c005', { p0: String(String(count)) });
  if (id === 'period_compare') return m('skill-bill.analysis-ticket.c006');
  if (id === 'range_compare') return m('skill-bill.analysis-ticket.c007');
  if (id === 'yoy') return m('skill-bill.analysis-ticket.c008');
  if (id === 'cat_compare') return m('skill-bill.analysis-ticket.c009', { p0: String(String(barRows)) });
  if (id === 'week') return m('skill-bill.analysis-ticket.c010', { p0: String(String(count)) });
  if (id === 'category') return m('skill-bill.analysis-ticket.c011', { p0: String(String(barRows)) });
  if (id === 'account') return m('skill-bill.analysis-ticket.c012', { p0: String(String(barRows)) });
  if (id === 'ledger') return m('skill-bill.analysis-ticket.c013', { p0: String(String(barRows)) });
  if (id === 'structure') return m('skill-bill.analysis-ticket.c014', { p0: String(String(count)) });
  return m('skill-bill.analysis-ticket.c015', { p0: String(String(count)) });
}

/** 主数字（原型 summary-head：支出唯一，a09 笔数，a13 见明细；C 组 a04 本周支出／a05 总支出／a06-a08 见明细）。 */
function summaryForBars(id: string, expense: number, count: number): { eyebrow: string; value: string; unit: string; note: string } {
  if (id === 'stats') {
    return { eyebrow: m('skill-bill.analysis-ticket.c016'), value: String(count), unit: m('skill-bill.analysis-ticket.c017'), note: m('skill-bill.analysis-ticket.c018') };
  }
  if (id === 'week') {
    return { eyebrow: m('skill-bill.analysis-ticket.c019'), value: money(expense), unit: m('skill-bill.analysis-ticket.c020'), note: m('skill-bill.analysis-ticket.c021') };
  }
  if (id === 'category') {
    return { eyebrow: m('skill-bill.analysis-ticket.c022'), value: money(expense), unit: m('skill-bill.analysis-ticket.c023'), note: m('skill-bill.analysis-ticket.c024') };
  }
  if (id === 'yearly') {
    return { eyebrow: m('skill-bill.analysis-ticket.c025'), value: money(expense), unit: m('skill-bill.analysis-ticket.c026'), note: m('skill-bill.analysis-ticket.c027') };
  }
  if (id === 'account' || id === 'ledger' || id === 'structure') {
    return { eyebrow: m('skill-bill.analysis-ticket.c028'), value: m('skill-bill.analysis-ticket.c029'), unit: '', note: m('skill-bill.analysis-ticket.c030') };
  }
  // 链里的条件先抽成局部变量，外层 + 链只拼字面量与变量（迁移器才能整句化，手册 §4.7）。
  const where = id === 'overview' ? m('skill-bill.analysis-ticket.c031') : m('skill-bill.analysis-ticket.c032');
  return { eyebrow: m('skill-bill.analysis-ticket.c033'), value: money(expense), unit: m('skill-bill.analysis-ticket.c034'), note: m('skill-bill.analysis-ticket.c035', { p0: String(where) }) };
}

/** bars 落点账目（余数进落点，数字只搬家）：收入／净额／来源／基线，ovs 另加日均；stats 例外不加收入／净额（原型 v2.1 六行）。 */
function ledgerBars(id: string, income: number, net: number, extra: readonly { k: string; v: string }[]): string {
  const rows = [
    ...(id === 'stats' ? [] : [{ label: m('skill-bill.analysis-ticket.c036'), value: m('skill-bill.analysis-ticket.c037', { p0: String(money(income)) }) }, { label: m('skill-bill.analysis-ticket.c038'), value: m('skill-bill.analysis-ticket.c039', { p0: String(money(net)) }) }]),
    ...extra.map((r) => ({ label: r.k, value: r.v })),
    { label: m('skill-bill.analysis-ticket.c040'), value: SOURCE_READ_TEXT },
    { label: m('skill-bill.analysis-ticket.c041'), value: baselineFileOf(id) },
  ];
  return renderLedgerRows({ rows, layout: 'ticket' });
}

/** compare 落点账目（三行式，取自 sides＋change，与原型 PAGES 表逐字对）：由调用方拼好三行传进来。 */
function ledgerCompare(rows: readonly { k: string; v: string }[], id: string): string {
  const full = [
    ...rows.map((r) => ({ label: r.k, value: r.v })),
    { label: m('skill-bill.analysis-ticket.c042'), value: m('skill-bill.analysis-ticket.c043') },
    { label: m('skill-bill.analysis-ticket.c044'), value: baselineFileOf(id) },
  ];
  return renderLedgerRows({ rows: full, layout: 'ticket' });
}

/** #1128 ④ 折线点选高亮 ＋ 读数气泡（**一处注入，25 页共用**）。
 *  渐进增强：没有这段 JS 时这一页仍是一张静态折线图（点标记只是多了 `role`／`tabindex`）。
 *  交互：点一个点 ⇒ 该点高亮（`.is-on`）＋ 气泡贴在该点上，文案取该点 `data-tip`（＝「X 轴文字: 数值」）；
 *  再点同一点或点空白、或按 Esc ⇒ 取消。触屏可用（走 click，不依赖 hover）。 */
const LINE_TAP_JS = '<' + 'script>(function(){'
  /* 出码里**一个双引号都不打**：上游装配会把 " 转义成 \" 写进页面，故选择器与样式值一律走字符码。 */
  + 'var QQ=String.fromCharCode(34),LB=String.fromCharCode(91),RB=String.fromCharCode(93),PX=String.fromCharCode(112,120);'
  + 'var wrap=document.querySelector(LB+\'data-chart-kind=\'+QQ+\'line\'+QQ+RB);if(!wrap)return;'
  + 'var tip=document.createElement(\'div\');tip.className=\'ilife-charts-tip\';tip.hidden=true;wrap.appendChild(tip);'
  + 'var on=null;'
  + 'function close(){if(on){on.classList.remove(\'is-on\');on=null;}tip.hidden=true;}'
  + 'wrap.addEventListener(\'click\',function(e){var d=e.target&&e.target.closest?e.target.closest(\'.ilife-charts-dot\'):null;'
  + '  if(!d){close();return;}if(d===on){close();return;}close();on=d;d.classList.add(\'is-on\');'
  + '  tip.textContent=d.getAttribute(\'data-tip\')||\'\';tip.hidden=false;'
  + '  var a=d.getBoundingClientRect(),b=wrap.getBoundingClientRect();'
  + '  tip.style.left=Math.round(a.left-b.left+a.width/2)+PX;tip.style.top=Math.round(a.top-b.top-6)+PX;});'
  + 'document.addEventListener(\'keydown\',function(e){if(e.key===\'Escape\')close();});'
  + '})();<' + '/script>';

/** 图形占位那一句（判地两版，与 `caliberTagOf` 同一分界）：a01-a03 说「不重算口径」，a04 起说「不用它读数」。 */
function chartNoteOf(id: string): string {
  // 写成 if 链而不是 switch：迁移器只认 copy／concat 位置，switch 的分支标签会被判跳过（#1208）。
  if (id === 'monthly' || id === 'yearly' || id === 'overview') {
    return m('skill-bill.analysis-ticket.c045');
  }
  return m('skill-bill.analysis-ticket.c046');
}

/** 判地头三张（a01／a02／a03）没有纸外页脚，a04 起每页都有：`饼干记账 · <唤醒词>`。 */
const NO_FOOT_SCENES = ['monthly', 'yearly', 'overview'];

/** 纸外页脚那一行（空串＝判地这一页不出脚注）。 */
function footNoteOf(id: string, wakeWord: string): string {
  return NO_FOOT_SCENES.includes(id) ? '' : '<p class="ilife-ticket-foot">' + escapeHtml(m('skill-bill.analysis-ticket.c047', { p0: String(wakeWord) })) + '</p>';
}

/** 票据纸装配（A／B／C 三组 25 页共用收口）：**块位序列逐块照判地**（`proto/analysis/a01…a25` v2.1）——
 *  店头（品牌／H2／窗口）→ 虚线 → 主数字（眉标／值／单位／说明／印章）→ 虚线 → 图形占位 CHART → 虚线 →
 *  明细卡 DETAIL → 虚线 → 落点与口径 CALIBER → 虚线 → 动作区（复制区）→ ✂ 裁切线 → 纸外页脚。
 *
 *  **#1120 对齐判地时删掉的块**（判地 25/25 没有，改前产物有）：页内导航、`pageBody` 的第二遍正文
 *  （改前落点与明细各印两遍）、结论条、类型徽章、来源脚注。值、文案与复制载荷一处不动（只重排块位、删块）。
 *  图形说明句与 `caliberTag` 由本件按场景 id 现算（住 `chartNoteOf`／`caliberTagOf` 一处），调用方不再各传一份。
 */
export function ticketDoc(input: {
  readonly docTitle: string;
  readonly wakeWord: string;
  readonly sceneId: string;
  readonly h2: string;
  readonly windowLabel: string;
  readonly summaryHtml: string;
  readonly summaryNote: string;
  readonly caliber: string;
  readonly ledgerHtml: string;
  readonly detailHtml: string;
  readonly chartHtml: string;
  readonly key: string;
  readonly params: Record<string, unknown>;
  readonly envelope: DocInput<BarsPage | ComparePage>['envelope'];
  readonly source: string;
  readonly detail: string;
  readonly actionAt: string;
  readonly copy?: AnalysisCopy;
}): string {
  const paper = sheetHead(brandOf(input.wakeWord), escapeHtml(input.h2), input.windowLabel)
    + ticketRule()
    + ticketSummary(input.summaryHtml, '<p class="ilife-ticket-summary-note">' + escapeHtml(input.summaryNote) + '</p>')
    + ticketRule()
    + ticketSection({
      title: m('skill-bill.analysis-ticket.c048'), tag: 'CHART',
      /* #1128：#1076 负责人判 5 格 no（a14／a15／a16／a17／a21 要真图）⇒ 有数据就出真图；
         撑不起图的页退回判地那句占位说明（判地本段只有占位文字，这是本票记在票面的判地变更）。 */
      content: input.chartHtml === ''
        ? '<div class="ilife-ticket-card">' + escapeHtml(chartNoteOf(input.sceneId)) + '</div>'
        : input.chartHtml + (input.chartHtml.includes('data-chart-kind="line"') ? LINE_TAP_JS : ''),
    })
    + ticketRule()
    + (input.detailHtml === ''
      ? ''
      : ticketSection({ title: m('skill-bill.analysis-ticket.c049'), tag: 'DETAIL', content: '<div class="ilife-ticket-card">' + input.detailHtml + '</div>' }) + ticketRule())
    + ticketSection({
      title: m('skill-bill.analysis-ticket.c050'), tag: 'CALIBER',
      content: input.ledgerHtml + renderCaliberLine(input.caliber),
    })
    + ticketRule()
    + ticketActions(copyZoneOf({
      envelope: input.envelope,
      title: input.wakeWord,
      key: input.key,
      params: input.params,
      source: input.source,
      detail: input.detail,
      actionAt: input.actionAt,
      ...(input.copy === undefined ? {} : { copy: input.copy }),
    }));
  return assembleSheetPage({
    docTitle: input.docTitle,
    bodyHtml: renderSheetFrame({ variant: 'ticket', cutLine: true, cutLineText: m('skill-bill.analysis-ticket.c051'), content: paper })
      + footNoteOf(input.sceneId, input.wakeWord),
    paper: 'receipt',
  });
}

/** bars 族 A 组 4 页＋C 组 5 页的票据纸正文（明细沿用既有 barGroups，条宽逐字节不动；C 组另带 listCards／charts，A 组为空故无影响）。 */
export function ticketBarsDoc(input: DocInput<BarsPage>, sceneId: string, extraLedger: readonly { k: string; v: string }[]): string {
  const r = input.result;
  const p = r.page;
  const s = summaryForBars(sceneId, r.kpi.expense, r.kpi.count);
  const summary = renderSummaryHead({
    eyebrow: s.eyebrow,
    value: s.value,
    unit: s.unit,
    stamp: { text: m('skill-bill.analysis-ticket.c052'), tone: 'ok' as const },
    layout: 'ticket',
    size: 'l',
  });
  const ledgerHtml = isCTicket(sceneId)
    ? ledgerCompare(extraLedger, sceneId)
    : ledgerBars(sceneId, r.kpi.income, r.kpi.net, extraLedger);
  const parts: string[] = [];
  // #1135（负责人 2026-10-05 改口径）：序号**每卡各自从 1 起**；图卡**不出 DETAIL**（#G）。
  for (const g of p.barGroups) {
    parts.push('<p>' + escapeHtml(g.title) + '</p>' + barGroupHtml(g, 0));
  }
  for (const c of p.listCards) {
    const html = listCardHtml(c, 0);
    if (html !== '') parts.push('<p>' + escapeHtml(c.title) + '</p>' + html);
  }
  for (const c of (sceneId === 'overview' ? [] : p.factCards)) {
    const html = factCardHtml(c, 0);
    if (html !== '') parts.push('<p>' + escapeHtml(c.title) + '</p>' + html);
  }
  /* 手册 §4.6：上屏那句和 HTML 结构拆开——结构串只留标签（无中文，门不扫），中文那句单成一个字面量，
     由词条层承载；两份拼起来与改前逐字节一致。 */
  const noDetailText = m('skill-bill.analysis-ticket.c053');
  const noDetailHtml = '<p>' + noDetailText + '</p>';
  const detailHtml = parts.length === 0 ? (sceneId === 'overview' ? '' : noDetailHtml) : parts.join('');
  return ticketDoc({
    docTitle: docTitleOf(r.title),
    wakeWord: input.wakeWord,
    sceneId,
    h2: h2For(sceneId, r.count, p.barGroups.length === 0 ? 0 : p.barGroups[0].rows.length),
    windowLabel: r.label,
    summaryHtml: summary,
    summaryNote: s.note,
    ledgerHtml,
    detailHtml,
    chartHtml: chartFor(sceneId, p),
    caliber: r.caliber,
    key: input.key,
    params: input.params,
    envelope: input.envelope,
    source: SOURCE_READ,
    detail: m('skill-bill.analysis-ticket.c054', { p0: String(String(r.count)) }),
    actionAt: input.actionAt,
    ...(r.copy === undefined ? {} : { copy: r.copy }),
  });
}

/** compare 主数字：前段／本期那一侧的支出（原型 a10/a11 前段，a12 本期；只搬家不重算）。 */
function firstSideExpense(p: ComparePage): number {
  // 判据位按位置取，不按显示标签挑读数（标签随语言变，位置不变）。
  // 发射方正序：cards.ts:132-139 `sideKpisOf` 固定 4 格（0 笔数／1 支出／2 收入／3 净额），
  // 四个 compare 场景（period_compare／range_compare／yoy／cat_compare 的空 sides）全用它。
  const kpi = p.sides[0]?.kpis[1];
  if (kpi === undefined) return 0;
  const n = Number(String(kpi.value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
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
    eyebrow: m('skill-bill.analysis-ticket.c055'),
    value: sceneId === 'cat_compare' ? m('skill-bill.analysis-ticket.c056') : money(firstSideExpense(p)),
    unit: sceneId === 'cat_compare' ? '' : m('skill-bill.analysis-ticket.c057'),
    stamp: { text: m('skill-bill.analysis-ticket.c058'), tone: 'ok' as const },
    layout: 'ticket',
    size: 'l',
  });
  /* 手册 §4.6：段标题那句与 HTML 结构拆开（结构串只有标签，中文单成一个字面量交给词条层）。 */
  const bothSidesText = m('skill-bill.analysis-ticket.c059');
  const bothSidesHtml = '<p>' + bothSidesText + '</p>';
  const parts: string[] = [...(sceneId === 'range_compare' && p.sides.length !== 0 ? [bothSidesHtml + compareSidesHtml(p.sides)] : [])];
  /* a12 看同比：明细含两段对比双卡（8 数只搬家，与原型 ol 同数；range 行不动）。 */
  if (sceneId === 'yoy' && p.sides.length !== 0) parts.push(bothSidesHtml + compareSidesHtml(p.sides));
  // #1135（负责人 2026-10-05 改口径）：序号**每卡各自从 1 起**。
  for (const g of p.barGroups) {
    parts.push('<p>' + escapeHtml(g.title) + '</p>' + barGroupHtml(g, 0));
  }
  for (const c of p.factCards) {
    const html = factCardHtml(c, 0);
    if (html !== '') { parts.push('<p>' + escapeHtml(c.title) + '</p>' + html); }
  }
  if (sceneId === 'cat_compare') {
    // 局部名不叫 m：会遮住注入的取词函数 m()（手册 §4.5m）。
    const mark = r.conclusion.match(/合计差 ([+-]?\d+\.\d+ 元)/);
    /* 手册 §4.6：中文那句（含尾部间隔点）单成一个字面量，标签与取值留在结构里。 */
    const diffLabel = m('skill-bill.analysis-ticket.c060');
    if (mark !== null) parts.push('<p>' + diffLabel + escapeHtml(mark[1]) + '</p>');
  }
  const detailHtml = parts.length === 0 ? '<p>' + escapeHtml(r.conclusion) + '</p>' : parts.join('');
  return ticketDoc({
    docTitle: docTitleOf(r.title),
    wakeWord: input.wakeWord,
    sceneId,
    h2: h2For(sceneId, r.count, r.page.barGroups.length === 0 ? 0 : r.page.barGroups[0].rows.length),
    windowLabel: r.label,
    summaryHtml: summary,
    summaryNote: sceneId === 'cat_compare' ? m('skill-bill.analysis-ticket.c061') : m('skill-bill.analysis-ticket.c062'),
    ledgerHtml: ledgerCompare(ledgerRows, sceneId),
    detailHtml,
    chartHtml: chartFor(sceneId, p),
    caliber: r.caliber,
    key: input.key,
    params: input.params,
    envelope: input.envelope,
    source: SOURCE_READ,
    detail: m('skill-bill.analysis-ticket.c063', { p0: String(String(r.count)) }),
    actionAt: input.actionAt,
    ...(r.copy === undefined ? {} : { copy: r.copy }),
  });
}
