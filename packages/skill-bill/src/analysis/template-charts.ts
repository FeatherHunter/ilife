/** 分析域模板之二 · **读数＋图**（`t685-按域页型表.md` §2.3 第二族；4 个场景）。
 *
 * **本件是这一族页型的块位序列唯一住所**。盖住的场景：看趋势／看分类趋势／看分布／看异常。
 *
 * **块位序列**（照 #688 §五 5.2 的 ⑦ 列顺序）：
 *   页头 ● → 结论句 ● → 页内导航 ● → 读数行 ○（看异常没有总读数卡，它报的是「环比变化」）→ 芯片列 ○
 *     → 图表 ●（这一族**必有**图——族名里那个「图」就是它；四图＝双折线／柱／直方／环形）→
 *     主列表 ○（逐月明细那一类）→ 事实行卡 ○（区间分布明细那一类）→ 空态 ● → 口径说明行 ●
 *     → 复制区 ● → 来源脚注 ●
 *
 * **本族的口径句是硬要求**（#688 §四 裁定 3）：折线／柱图必须带纵轴可读刻度、零值不出柱身、
 *  点数不足时不画半截线改出说明句、**跨空档用同色虚线并把「哪几个月没有记录」写进图下口径句**——
 *  这四条的读数由场景在 `caliber` 里给（缺月点名），图本身的刻度与虚线由公共层图表件按 `kind` 出。
 *
 * 谁在用（一个调用点，指名）：`src/analysis/read.ts`——`family === 'charts'` 那 4 个场景出页时调它。
 */
import { cardBlock, chartCardHtml, emptyHtml, factCardHtml, kpiGridHtml, listCardHtml, mergedChips } from './cards.js';
import { NO_WINDOW, SOURCE_READ, analysisDocOf, docTitleOf } from './pageParts.js';
import type { ChartsPage, DocInput } from './scene.js';
import type { PageBlock } from '../shared/pageSections.js';

export function chartsDoc(input: DocInput<ChartsPage>): string {
  const r = input.result;
  const p = r.page;
  const nothing = p.kpis.length === 0 && p.charts.length === 0
    && p.listCards.every((c) => c.rows.length === 0) && p.factCards.every((c) => c.rows.length === 0);
  const blocks: readonly PageBlock[] = [
    ...(p.kpis.length === 0 ? [] : [cardBlock(kpiGridHtml(p.kpis), 'sec-kpi', '读数')]),
    ...(p.chips.length === 0 && r.chips.length === 0 ? [] : [{ html: mergedChips(p.chips, r.chips) }]),
    ...(p.charts.length === 0 ? [] : p.charts.map((c, i) => cardBlock(
      chartCardHtml(c), 'sec-chart-' + String(i + 1), c.title,
    ))),
    ...(p.listCards.length === 0 ? [] : p.listCards.map((c, i) => cardBlock(
      listCardHtml(c), 'sec-list-' + String(i + 1), c.title,
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
