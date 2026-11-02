/** 分析域模板之一 · **读数＋条**（`t685-按域页型表.md` §2.3 第一族；13 个场景）。
 *
 * **本件是这一族页型的块位序列唯一住所**：块序、每块的出现条件、每块吃的数据都写在这里。
 *  改一次这一族的版式只动本件一处（另一族的版式改动动不了本族的产物）。
 *
 * 盖住的场景（老侧渲染器行号见 t685 §2.3）：看月度／看年度／看总览／看周报／看分类／看账户／看账本／
 *  看结构／做统计／看活跃／看退款／看大额／看高频。
 *
 * **块位序列**（照 #688 §五 5.2 的 ⑦ 结果型可切换页那一列的顺序；● 恒出、○ 有内容才出）：
 *   页头（眉标 ● ＋ 标题 ● ＋ 状态徽章 ●）→ 结论句 ● → 页内导航 ●
 *     → 读数行 ○（第 5 行；本族多数页有，看账户／看账本／看结构没有——它们报的是「分组的读数」，见下）
 *     → 主表／主列表 ○（第 12 行：明细行卡，含筛选条件回显的芯片 ○）
 *     → 分类聚合／占比条 ●（第 13 行：这一族**必有**这一块——族名里那个「条」就是它）
 *     → 图表 ○（第 14 行；看分类／看结构两页有环形图）
 *     → 事实行卡 ○（第 13 行相邻的键值读数，看总览「区间标注」那一格）
 *     → 空态块 ＋ 引导句 ●（第 23 行；窗口内一条记录也没有时出，见下）
 *     → 口径说明行 ●（第 24 行）→ 复制区 ●（第 25 行）→ 来源脚注 ●（第 26 行）
 *
 * **空态是两档**（照 #688 §三 第 7 条与裁定 4）：每一块（每张条卡、每张列表卡）自带自己的空态句；
 *  整页**一张卡都没有内容**时另出联合兜底那一格（「近一段时间还没有数据」＋「怎么记第一条」的引导句）——
 *  这一格在正文之后、口径行之前，页头与来源脚注照旧，整页仍是完整文档。
 *
 * 谁在用（一个调用点，指名）：`src/analysis/read.ts`——`family === 'bars'` 那 13 个场景出页时调它。
 */
import { barGroupHtml, cardBlock, chartCardHtml, emptyHtml, factCardHtml, kpiGridHtml, listCardHtml, mergedChips } from './cards.js';
import { NO_WINDOW, SOURCE_READ, analysisDocOf, docTitleOf, money, pctText } from './pageParts.js';
import { isATicket, ticketBarsDoc } from './ticket.js';
import { isBTicket } from './ticket-b.js';
import { ticketBarsBDoc } from './ticket-b-bars.js';
import type { BarsPage, DocInput } from './scene.js';
import type { PageBlock } from '../shared/pageSections.js';
import { m } from '../entries/index.js';

/** A 组＋C 组＋B 组 bars kind 到场景 id（分支唯一定义地；按 params.kind，不写唤醒词字面）。 */
function sceneIdOfBars(kind: unknown): string {
  switch (typeof kind === 'string' ? kind : '') {
    case 'monthly': return 'monthly';
    case 'yearly': return 'yearly';
    case 'overview': return 'overview';
    case 'stats': return 'stats';
    case 'week': return 'week';
    case 'category': return 'category';
    case 'account': return 'account';
    case 'ledger': return 'ledger';
    case 'structure': return 'structure';
    case 'top': return 'top';
    case 'frequent': return 'top_freq';
    case 'activity': return 'activity';
    case 'refund': return 'refund';
    default: return '';
  }
}

/** 首个条卡首行（C 组落点“支出最多／去得最多”只搬家：标签＋数值段＋占比段取自既有条卡文本，不重算）。 */
function headBarOf(input: DocInput<BarsPage>): { label: string; amount: string; pct: string } | null {
  const g = input.result.page.barGroups[0];
  const row = g?.rows[0];
  if (row === undefined) return null;
  const segs = row.text.split(' · ');
  return { label: row.label, amount: segs[0] ?? '', pct: segs[2] ?? '' };
}

/** “55.00 元”→55（落点比上周的差值只搬家：从事实卡上周支出解析，不重查库）。 */
function parseAmount(v: string): number {
  const n = Number(v.split(' ')[0]?.replace(/,/g, '') ?? '');
  return Number.isFinite(n) ? n : 0;
}

/** 环形图明细项（只搬家：从既有图卡 input 取 items，不重算；非环形或无 items 即空）。 */
function donutItemsOf(card: { readonly kind: string; readonly input: unknown } | undefined): readonly { readonly label: string; readonly value: number }[] {
  if (card === undefined || card.kind !== 'donut') return [];
  const inp = card.input;
  if (typeof inp !== 'object' || inp === null || !('items' in inp)) return [];
  const items = (inp as { readonly items: unknown }).items;
  if (!Array.isArray(items)) return [];
  const out: { label: string; value: number }[] = [];
  for (const it of items) {
    if (typeof it !== 'object' || it === null) continue;
    const rec = it as Record<string, unknown>;
    if (typeof rec.label !== 'string' || typeof rec.value !== 'number' || !Number.isFinite(rec.value)) continue;
    out.push({ label: rec.label, value: rec.value });
  }
  return out;
}


/** 环形图圆心读数（只搬家：发射方在 options.centerValue 里填的是该方向的合计金额）。 */
function donutCenterOf(card: { readonly input: unknown } | undefined): string {
  if (card === undefined) return '';
  const inp = card.input;
  if (typeof inp !== 'object' || inp === null || !('options' in inp)) return '';
  const opts = (inp as { readonly options: unknown }).options;
  if (typeof opts !== 'object' || opts === null) return '';
  const center = (opts as { readonly centerValue?: unknown }).centerValue;
  return typeof center === 'string' ? center : '';
}

/** A 组余数行＋C 组整行式落点（数字取自本次结果，只搬家）：总览加日均，统计加记账日／日均／首笔／最近；C 组见分支。 */
function extraLedgerOfBars(kind: unknown, input: DocInput<BarsPage>): readonly { k: string; v: string }[] {
  const p = input.result.page;
  const kpi = input.result.kpi;
  const k = typeof kind === 'string' ? kind : '';
  if (k === 'week') {
    // 判据位按位置取，不按显示标签挑行（ADR-0004：标签随语言变，位置不变）。
    // 发射方正序：scene-week.ts:115-126 事实卡固定 8 行，第 5 行（0 起）是「上周支出」。
    const lastRow = p.factCards[0]?.rows[5];
    const last = lastRow === undefined ? 0 : parseAmount(lastRow.v);
    const diff = Math.round((kpi.expense - last) * 100) / 100;
    const pct = last === 0 ? 0 : Math.round((diff / last) * 1000) / 10;
    const diffText = diff === 0 ? m('skill-bill.analysis-template-bars.c001', { p0: String(money(0)), p1: String(pctText(0)) })
      : diff > 0 ? m('skill-bill.analysis-template-bars.c002', {
        p0: String(money(diff)),
        p1: String(pctText(Math.abs(pct))),
      }) : m('skill-bill.analysis-template-bars.c003', {
        p0: String(money(diff)),
        p1: String(pctText(Math.abs(pct))),
      });
    return [
      { k: m('skill-bill.analysis-template-bars.c004'), v: m('skill-bill.analysis-template-bars.c005', { p0: String(money(kpi.income)) }) },
      { k: m('skill-bill.analysis-template-bars.c006'), v: m('skill-bill.analysis-template-bars.c007', { p0: String(money(kpi.net)) }) },
      { k: m('skill-bill.analysis-template-bars.c008'), v: diffText },
    ];
  }
  if (k === 'category') {
    const head = headBarOf(input);
    if (head === null) return [];
    return [{ k: m('skill-bill.analysis-template-bars.c009'), v: m('skill-bill.analysis-template-bars.c010', {
      p0: String(head.label),
      p1: String(head.amount),
      p2: String(head.pct),
    }) }];
  }
  if (k === 'account' || k === 'ledger') {
    const head = headBarOf(input);
    const out = [
      { k: m('skill-bill.analysis-template-bars.c011'), v: m('skill-bill.analysis-template-bars.c012', { p0: String(money(kpi.expense)) }) },
      { k: m('skill-bill.analysis-template-bars.c013'), v: m('skill-bill.analysis-template-bars.c014', { p0: String(money(kpi.income)) }) },
    ];
    if (head !== null) out.push({ k: m('skill-bill.analysis-template-bars.c015'), v: head.label + ' ' + head.amount });
    return out;
  }
  if (k === 'structure') {
    // 判据位按结构取，不按图卡标题挑图（标题随语言变）。
    // 发射方正序：scene-structure.ts:40-60 先 push 收入环形、再 push 支出环形；只出一个环形时，
    // 用圆心读数（发射方填的就是该方向的合计，见 :47／:57）判它属于哪个方向。
    const donuts = p.charts.filter((c) => c.kind === 'donut');
    const incomeFirst = donuts.length !== 1 ? true : donutCenterOf(donuts[0]) === money(kpi.income);
    const incItems = donutItemsOf(incomeFirst ? donuts[0] : donuts[1]);
    const expItems = donutItemsOf(incomeFirst ? donuts[1] : donuts[0]);
    const out = [
      { k: m('skill-bill.analysis-template-bars.c016'), v: m('skill-bill.analysis-template-bars.c017', {
        p0: String(money(kpi.income)),
        p1: String(String(incItems.length)),
      }) },
      { k: m('skill-bill.analysis-template-bars.c018'), v: m('skill-bill.analysis-template-bars.c019', {
        p0: String(money(kpi.expense)),
        p1: String(String(expItems.length)),
      }) },
    ];
    const top = expItems[0];
    if (top !== undefined) out.push({ k: m('skill-bill.analysis-template-bars.c020'), v: m('skill-bill.analysis-template-bars.c021', { p0: String(top.label), p1: String(money(top.value)) }) });
    return out;
  }
  if (k === 'overview') {
    // 判据位按位置取。发射方正序：scene-overview.ts:79-88 事实卡固定两行，第 1 行（0 起）是「日均支出」。
    const row = p.factCards[0]?.rows[1];
    return row === undefined ? [] : [{ k: m('skill-bill.analysis-template-bars.c022'), v: row.v }];
  }
  if (k === 'stats') {
    // 判据位按位置取。发射方正序：scene-stats.ts:76-78 kpis 固定 3 格
    // （0 总笔数／1 记账天数／2 日均笔数）；:92-98 事实卡固定两行（0 首笔时间／1 最近记录）。
    const out: { k: string; v: string }[] = [];
    const days = p.kpis[1];
    if (days !== undefined) out.push({ k: m('skill-bill.analysis-template-bars.c023'), v: days.value + ' ' + (days.unit ?? m('skill-bill.analysis-template-bars.c024')) });
    const perDay = p.kpis[2];
    if (perDay !== undefined) out.push({ k: m('skill-bill.analysis-template-bars.c032'), v: m('skill-bill.analysis-template-bars.c025', { p0: String(perDay.value) }) });
    const rows = p.factCards[0]?.rows;
    const firstRow = rows?.[0];
    const lastRow = rows?.[1];
    if (firstRow !== undefined) out.push({ k: m('skill-bill.analysis-template-bars.c026'), v: firstRow.v });
    if (lastRow !== undefined) out.push({ k: m('skill-bill.analysis-template-bars.c027'), v: lastRow.v });
    return out;
  }
  return [];
}

export function barsDoc(input: DocInput<BarsPage>): string {
  const r = input.result;
  const kind = (input.params as Record<string, unknown>)['kind'];
  const sceneId = sceneIdOfBars(kind);
  if (sceneId !== '' && isATicket(sceneId)) {
    return ticketBarsDoc(input, sceneId, extraLedgerOfBars(kind, input));
  }
  if (sceneId !== '' && isBTicket(sceneId)) {
    return ticketBarsBDoc(input, sceneId);
  }
  const p = r.page;
  const nothing = p.kpis.length === 0 && p.charts.length === 0
    && p.barGroups.every((g) => g.rows.length === 0) && p.listCards.every((c) => c.rows.length === 0);
  const blocks: readonly PageBlock[] = [
    ...(p.kpis.length === 0 ? [] : [cardBlock(kpiGridHtml(p.kpis), 'sec-kpi', m('skill-bill.analysis-template-bars.c028'))]),
    ...(p.chips.length === 0 && r.chips.length === 0 ? [] : [{ html: mergedChips(p.chips, r.chips) }]),
    ...(p.listCards.length === 0 ? [] : p.listCards.map((c, i) => cardBlock(
      listCardHtml(c), 'sec-list-' + String(i + 1), c.title,
    ))),
    ...(p.barGroups.length === 0 ? [] : p.barGroups.map((g, i) => cardBlock(
      barGroupHtml(g), 'sec-bars-' + String(i + 1), g.title,
    ))),
    ...(p.charts.length === 0 ? [] : p.charts.map((c, i) => cardBlock(
      chartCardHtml(c), 'sec-chart-' + String(i + 1), c.title,
    ))),
    ...(p.factCards.length === 0 ? [] : p.factCards.map((c, i) => cardBlock(
      factCardHtml(c), 'sec-facts-' + String(i + 1), c.title,
    ))),
    ...(nothing ? [{ html: emptyHtml(p.empty) }] : []),
  ];
  return analysisDocOf({
    key: input.key,
    params: input.params,
    wakeWord: input.wakeWord,
    docTitle: docTitleOf(r.title),
    subtitle: r.label,
    shape: input.envelope.shape,
    wordCaliber: '',
    status: nothing ? 'empty' : 'ok',
    statusText: nothing ? m('skill-bill.analysis-template-bars.c029') : m('skill-bill.analysis-template-bars.c030'),
    next: nothing ? p.empty.hint : '',
    conclusion: r.conclusion,
    caliber: r.caliber,
    blocks,
    envelope: input.envelope,
    source: SOURCE_READ,
    detail: m('skill-bill.analysis-template-bars.c031', { p0: String(String(r.count)) }),
    actionAt: input.actionAt,
    windowStart: r.from === '' ? NO_WINDOW : r.from,
    windowEnd: r.to === '' ? NO_WINDOW : r.to,
    count: r.count,
  });
}
