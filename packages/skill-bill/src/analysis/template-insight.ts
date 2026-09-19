/** 分析域模板之五 · **解读＋多卡**（`t685-按域页型表.md` §2.3 第五族；1 个场景：看洞察）。
 *
 * **本件是这一族页型的块位序列唯一住所**，也是「六块全条件出」那一支的唯一样本。
 *
 * **块位序列**（照 #688 §五 5.2 的 ⑦ 列顺序；老侧 `renderInsight` 是首块非读数卡的那一族）：
 *   页头 ● → 结论句 ●（解读条：这一批数说明了什么）→ 页内导航 ●
 *     → 读数行 ●（区间支出／收入／净额／笔数）→ 事实行卡 ●（区间、趋势均值、最大偏离月）
 *     → 条卡组 ○（消费习惯：分类分布）→ 图表 ○（月度走势）→ 主列表 ○（大额支出 TOP）
 *     → 空态 ● → 口径说明行 ● → 复制区 ● → 来源脚注 ●
 *
 * **老侧那一件不照抄**（#688 §二 C8）：老页有 `parseAiNote`，把 `消费习惯:…|异常波动:…|省钱建议:…`
 *  切成带标题的分段卡、未知标题降级「AI 解读」。新侧的分析页由本地 CLI 渲染、**没有 AI 解读文本可切**，
 *  故不引入 `renderDetailSection` 的分段卡：解读那一段由**结论句**承载（同一份事实，摆法更省一处机制）。
 *  这条差异记在 `docs/skills/skill-bill/t729-差异表.md`。
 *
 * 谁在用（一个调用点，指名）：`src/analysis/read.ts`——`family === 'insight'` 的那 1 个场景出页时调它。
 */
import { barGroupHtml, cardBlock, chartCardHtml, emptyHtml, factCardHtml, kpiGridHtml, listCardHtml } from './cards.js';
import { NO_WINDOW, SOURCE_READ, analysisDocOf, docTitleOf } from './pageParts.js';
import type { DocInput, InsightPage } from './scene.js';
import type { PageBlock } from '../shared/pageSections.js';

export function insightDoc(input: DocInput<InsightPage>): string {
  const r = input.result;
  const p = r.page;
  const nothing = p.kpis.length === 0 && p.charts.length === 0
    && p.barGroups.every((g) => g.rows.length === 0) && p.listCards.every((c) => c.rows.length === 0);
  const blocks: readonly PageBlock[] = [
    ...(p.kpis.length === 0 ? [] : [cardBlock(kpiGridHtml(p.kpis), 'sec-kpi', '读数')]),
    ...(p.factCards.length === 0 ? [] : p.factCards.map((c, i) => cardBlock(
      factCardHtml(c), 'sec-facts-' + String(i + 1), c.title,
    ))),
    ...(p.barGroups.length === 0 ? [] : p.barGroups.map((g, i) => cardBlock(
      barGroupHtml(g), 'sec-bars-' + String(i + 1), g.title,
    ))),
    ...(p.charts.length === 0 ? [] : p.charts.map((c, i) => cardBlock(
      chartCardHtml(c), 'sec-chart-' + String(i + 1), c.title,
    ))),
    ...(p.listCards.length === 0 ? [] : p.listCards.map((c, i) => cardBlock(
      listCardHtml(c), 'sec-list-' + String(i + 1), c.title,
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
