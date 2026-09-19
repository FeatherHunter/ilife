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
import { NO_WINDOW, SOURCE_READ, analysisDocOf, docTitleOf } from './pageParts.js';
import { renderCaliberLine, renderConclusionBar } from 'base-paint/blocks';
import type { ComparePage, DocInput } from './scene.js';
import type { PageBlock } from '../shared/pageSections.js';

export function compareDoc(input: DocInput<ComparePage>): string {
  const r = input.result;
  const p = r.page;
  const nothing = p.sides.length === 0 && p.barGroups.every((g) => g.rows.length === 0)
    && p.factCards.every((c) => c.rows.length === 0);
  const blocks: readonly PageBlock[] = [
    ...(p.kpis.length === 0 ? [] : [cardBlock(kpiGridHtml(p.kpis), 'sec-kpi', '读数')]),
    ...(p.chips.length === 0 && r.chips.length === 0 ? [] : [{ html: mergedChips(p.chips, r.chips) }]),
    ...(p.sides.length === 0 ? [] : [cardBlock(compareSidesHtml(p.sides), 'sec-compare', '两段对比')]),
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
    statusText: nothing ? '两段都没有记录' : '看完了',
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
