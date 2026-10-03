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


/** A 组余数行＋C 组整行式落点（数字取自本次结果，只搬家）：总览加日均，统计加记账日／日均／首笔／最近；C 组见分支。 */
function extraLedgerOfBars(kind: unknown, input: DocInput<BarsPage>): readonly { k: string; v: string }[] {
  const p = input.result.page;
  const kpi = input.result.kpi;
  const k = typeof kind === 'string' ? kind : '';
  if (k === 'week') {
    let last = 0;
    for (const c of p.factCards) for (const row of c.rows) if (row.k === '上周支出') last = parseAmount(row.v);
    const diff = Math.round((kpi.expense - last) * 100) / 100;
    const pct = last === 0 ? 0 : Math.round((diff / last) * 1000) / 10;
    const diffText = diff === 0 ? money(0) + ' 元（' + pctText(0) + '）'
      : diff > 0 ? '+' + money(diff) + ' 元（' + pctText(Math.abs(pct)) + '）' : money(diff) + ' 元（' + pctText(Math.abs(pct)) + '）';
    return [
      { k: '收入', v: money(kpi.income) + ' 元' },
      { k: '净额', v: money(kpi.net) + ' 元' },
      { k: '比上周', v: diffText },
    ];
  }
  if (k === 'category') {
    const head = headBarOf(input);
    if (head === null) return [];
    return [{ k: '支出最多', v: head.label + ' ' + head.amount + ' · 占 ' + head.pct }];
  }
  if (k === 'account' || k === 'ledger') {
    const head = headBarOf(input);
    const out = [
      { k: '支出', v: money(kpi.expense) + ' 元' },
      { k: '收入', v: money(kpi.income) + ' 元' },
    ];
    if (head !== null) out.push({ k: '支出最多', v: head.label + ' ' + head.amount });
    return out;
  }
  if (k === 'structure') {
    const incItems = donutItemsOf(p.charts.find((c) => c.title === '收入来源结构'));
    const expItems = donutItemsOf(p.charts.find((c) => c.title === '支出去向结构'));
    const out = [
      { k: '收入', v: money(kpi.income) + ' 元（' + String(incItems.length) + ' 个一级分类）' },
      { k: '支出', v: money(kpi.expense) + ' 元（' + String(expItems.length) + ' 个一级分类）' },
    ];
    const top = expItems[0];
    if (top !== undefined) out.push({ k: '去得最多', v: top.label + ' ' + money(top.value) + ' 元' });
    return out;
  }
  if (k === 'overview') {
    for (const c of p.factCards) {
      for (const row of c.rows) {
        if (row.k === '日均支出') return [{ k: '日均支出', v: row.v }];
      }
    }
    return [];
  }
  if (k === 'stats') {
    const out: { k: string; v: string }[] = [];
    for (const kpi of p.kpis) {
      if (kpi.label === '记账天数') out.push({ k: '记账日', v: kpi.value + ' ' + (kpi.unit ?? '天') });
      if (kpi.label === '日均笔数') out.push({ k: '日均', v: kpi.value + ' 笔' });
    }
    for (const c of p.factCards) {
      for (const row of c.rows) {
        if (row.k === '首笔时间') out.push({ k: '首笔', v: row.v });
        if (row.k === '最近记录') out.push({ k: '最近', v: row.v });
      }
    }
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
    ...(p.kpis.length === 0 ? [] : [cardBlock(kpiGridHtml(p.kpis), 'sec-kpi', '读数')]),
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
    statusText: nothing ? '这一段没有记录' : '看完了',
    next: nothing ? p.empty.hint : '',
    conclusion: r.conclusion,
    caliber: r.caliber,
    blocks,
    envelope: input.envelope,
    source: SOURCE_READ,
    detail: '取到 ' + String(r.count) + ' 条记录',
    actionAt: input.actionAt,
    windowStart: r.from === '' ? NO_WINDOW : r.from,
    windowEnd: r.to === '' ? NO_WINDOW : r.to,
    count: r.count,
  });
}
