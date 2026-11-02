/** 分析域模板之四 · **对比＋变更**（`t685-按域页型表.md` §2.3 第四族；4 个场景）。
 *
 * **本件是这一族页型的块位序列唯一住所**。盖住的场景：看对比／看双区间／看同比／看分类对比。
 *
 * **块位序列**（照 #688 §五 5.2 的 ⑦ 列顺序）：
 *   页头 ● → 结论句 ● → 页内导航 ● → 对比双卡 ●（两段期间各自的读数卡区：笔数／支出／收入／净额）
 *     → 变更徽标 ●（支出侧差值与百分比；结论条承载那一句，方向由它自己说清）
 *     → 条卡组 ○（分类差异 TOP：看双区间与看分类对比有）→ 事实行卡 ○（分类差异的逐行读数）
 *     → 空态 ● → 口径说明行 ● → 复制区 ● → 来源脚注 ●
 *
 * 谁在用（一个调用点，指名）：`src/analysis/read.ts`——`family === 'compare'` 那 4 个场景出页时调它。
 */
import { barGroupHtml, cardBlock, compareSidesHtml, emptyHtml, factCardHtml, kpiGridHtml, mergedChips } from './cards.js';
import { NO_WINDOW, SOURCE_READ, analysisDocOf, docTitleOf, money } from './pageParts.js';
import { renderCaliberLine, renderConclusionBar } from 'base-paint/blocks';
import { ticketCompareDoc } from './ticket.js';
import type { ComparePage, DocInput } from './scene.js';
import type { PageBlock } from '../shared/pageSections.js';
import { m } from '../entries/index.js';

/** compare kind 到场景 id（本族 4 页全在 A 组 1057，无残留分支；按 params.kind，不写唤醒词字面）。 */
function sceneIdOfCompare(kind: unknown): string {
  switch (typeof kind === 'string' ? kind : '') {
    case 'period': return 'period_compare';
    case 'range': return 'range_compare';
    case 'yoy': return 'yoy';
    case 'category': return 'cat_compare';
    default: return '';
  }
}

/** 两侧支出值（sides kpis 第 2 格，已是两位小数文本）。
 *
 * 判据位按位置取，不按显示标签挑读数（标签随语言变，位置不变）。
 * 发射方正序：cards.ts:132-139 `sideKpisOf` 固定 4 格（0 笔数／1 支出／2 收入／3 净额）。 */
function sideExpense(side: ComparePage['sides'][number] | undefined): string {
  const kpi = side?.kpis[1];
  return kpi === undefined ? '0.00' : String(kpi.value);
}

/** 变更句里箭头那一段（箭头 ↑／↓／→ 与分隔符 `·` 都不随语言变，会变的只有两侧措辞）。
 *
 * `keepArrow`：看双区间那行要的是纯金额段（去掉箭头）；其余两页要连箭头一起搬。 */
function changeSegOf(text: string, keepArrow: boolean): string {
  const at = text.search(/[↑↓→]/);
  const seg = (at < 0 ? text : text.slice(at)).split('·')[0].trim();
  return keepArrow ? seg : seg.replace(/^[↑↓→]\s*/, '');
}

/** compare 落点（原型 v2.1 PAGES 表式，数字只搬家）：a11 range 四行（前段／后段／支出差／差得最多），其余三页照旧。 */
function ledgerRowsOfCompare(kind: unknown, p: ComparePage, conclusion: string): readonly { k: string; v: string }[] {
  if ((typeof kind === 'string' ? kind : '') === 'category') {
    const head = p.barGroups.length === 0 || p.barGroups[0].rows.length === 0 ? undefined : p.barGroups[0].rows[0];
    const range = head === undefined ? '' : (head.text.split('·')[0] ?? '').trim();
    const diffPart = head === undefined ? '' : (head.text.split('·')[1] ?? '').split('（')[0].trim();
    const maxText = head === undefined ? m('skill-bill.analysis-template-compare.c001') : m('skill-bill.analysis-template-compare.c002', {
      p0: String(head.label),
      p1: String(diffPart),
      p2: String(range),
    });
    // 局部名不叫 m：会遮住注入的取词函数 m()（手册 §4.5m）。
    const mark = conclusion.match(/合计差 ([+-]?\d+\.\d+ 元)/);
    return [
      { k: m('skill-bill.analysis-template-compare.c003'), v: maxText },
      { k: m('skill-bill.analysis-template-compare.c004'), v: mark === null ? '—' : mark[1] },
    ];
  }
  if ((typeof kind === 'string' ? kind : '') === 'range') {
    const ra = p.sides[0];
    const rb = p.sides[1];
    const raw = changeSegOf(p.change.text, false);
    const head = p.barGroups.length === 0 || p.barGroups[0].rows.length === 0 ? undefined : p.barGroups[0].rows[0];
    let maxText = m('skill-bill.analysis-template-compare.c005');
    if (head !== undefined) {
      const seg = head.text.split('·')[1]?.split('（')[0]?.trim() ?? '';
      maxText = m('skill-bill.analysis-template-compare.c006', { p0: String(head.label), p1: String(seg) });
    }
    return [
      { k: m('skill-bill.analysis-template-compare.c007'), v: m('skill-bill.analysis-template-compare.c008', { p0: String(sideExpense(ra)) }) },
      { k: m('skill-bill.analysis-template-compare.c009'), v: m('skill-bill.analysis-template-compare.c010', { p0: String(sideExpense(rb)) }) },
      { k: m('skill-bill.analysis-template-compare.c011'), v: raw === '' ? '—' : raw },
      { k: m('skill-bill.analysis-template-compare.c012'), v: maxText },
    ];
  }
  /* a12 看同比：PAGES 表三行式（2026-10 支出／2025-10 支出／同比差＋55.00 元式），数字只搬家。 */
  if ((typeof kind === 'string' ? kind : '') === 'yoy') {
    const ya = p.sides[0];
    const yb = p.sides[1];
    // 期间名取标题的第一个词（月是数据，逐字不动；标题是「月 ＋ 本期／去年措辞」）。
    // 这样英文列不必保留「今年」「去年」这两个词也能取到月（#1208）。
    const yMonthA = (ya === undefined ? '' : ya.title).split(' ')[0] ?? '';
    const yMonthB = (yb === undefined ? '' : yb.title).split(' ')[0] ?? '';
    const yExpA = Number(sideExpense(ya).replace(/,/g, ''));
    const yExpB = Number(sideExpense(yb).replace(/,/g, ''));
    const yDiff = Number.isFinite(yExpA) && Number.isFinite(yExpB) ? yExpA - yExpB : 0;
    const ySigned = yDiff > 0 ? '+' + money(yDiff) : money(yDiff);
    // 百分比在括号里：全角／半角括号都认（英文列可能写成半角括号）。
    const yPct = (p.change.text.match(/[(（]([^）)]+)[）)]/) ?? [])[1] ?? '—';
    // 链里的条件先抽成局部变量，外层 + 链只拼字面量与变量（迁移器才能整句化，手册 §4.7）。
    const yLabelA = yMonthA === '' ? m('skill-bill.analysis-template-compare.c013') : yMonthA;
    const yLabelB = yMonthB === '' ? m('skill-bill.analysis-template-compare.c014') : yMonthB;
    return [
      { k: m('skill-bill.analysis-template-compare.c015', { p0: String(yLabelA) }), v: m('skill-bill.analysis-template-compare.c016', { p0: String(sideExpense(ya)) }) },
      { k: m('skill-bill.analysis-template-compare.c017', { p0: String(yLabelB) }), v: m('skill-bill.analysis-template-compare.c018', { p0: String(sideExpense(yb)) }) },
      { k: m('skill-bill.analysis-template-compare.c019'), v: yPct === '—' ? '—' : m('skill-bill.analysis-template-compare.c020', { p0: String(ySigned), p1: String(yPct) }) },
    ];
  }
  const a = p.sides[0];
  const b = p.sides[1];
  const aLabel = a === undefined ? m('skill-bill.analysis-template-compare.c021') : a.title;
  const bLabel = b === undefined ? m('skill-bill.analysis-template-compare.c022') : b.title;
  const changeText = changeSegOf(p.change.text, true);
  return [
    { k: m('skill-bill.analysis-template-compare.c023', { p0: String(aLabel) }), v: m('skill-bill.analysis-template-compare.c024', { p0: String(sideExpense(a)) }) },
    { k: m('skill-bill.analysis-template-compare.c025', { p0: String(bLabel) }), v: m('skill-bill.analysis-template-compare.c026', { p0: String(sideExpense(b)) }) },
    { k: m('skill-bill.analysis-template-compare.c027'), v: changeText === '' ? '—' : changeText },
  ];
}

export function compareDoc(input: DocInput<ComparePage>): string {
  const r = input.result;
  const p = r.page;
  const kind = (input.params as Record<string, unknown>)['kind'];
  const sceneId = sceneIdOfCompare(kind);
  if (sceneId !== '') {
    return ticketCompareDoc(input, sceneId, ledgerRowsOfCompare(kind, p, r.conclusion));
  }
  const nothing = p.sides.length === 0 && p.barGroups.every((g) => g.rows.length === 0)
    && p.factCards.every((c) => c.rows.length === 0);
  const blocks: readonly PageBlock[] = [
    ...(p.kpis.length === 0 ? [] : [cardBlock(kpiGridHtml(p.kpis), 'sec-kpi', m('skill-bill.analysis-template-compare.c028'))]),
    ...(p.chips.length === 0 && r.chips.length === 0 ? [] : [{ html: mergedChips(p.chips, r.chips) }]),
    ...(p.sides.length === 0 ? [] : [cardBlock(compareSidesHtml(p.sides), 'sec-compare', m('skill-bill.analysis-template-compare.c029'))]),
    ...(p.change.text === '' ? [] : [{ html: renderConclusionBar(p.change.text) }]),
    ...(p.change.detail === '' ? [] : [{ html: renderCaliberLine(p.change.detail) }]),
    ...(p.barGroups.length === 0 ? [] : p.barGroups.map((g, i) => cardBlock(
      barGroupHtml(g), 'sec-bars-' + String(i + 1), g.title,
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
    statusText: nothing ? m('skill-bill.analysis-template-compare.c030') : m('skill-bill.analysis-template-compare.c031'),
    next: nothing ? p.empty.hint : '',
    conclusion: r.conclusion,
    caliber: r.caliber,
    blocks,
    envelope: input.envelope,
    source: SOURCE_READ,
    detail: m('skill-bill.analysis-template-compare.c032', { p0: String(String(r.count)) }),
    actionAt: input.actionAt,
    windowStart: r.from === '' ? NO_WINDOW : r.from,
    windowEnd: r.to === '' ? NO_WINDOW : r.to,
    count: r.count,
  });
}
