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
import { NO_WINDOW, SOURCE_READ, analysisDocOf, docTitleOf } from './pageParts.js';
import type { BarsPage, DocInput } from './scene.js';
import type { PageBlock } from '../shared/pageSections.js';

export function barsDoc(input: DocInput<BarsPage>): string {
  const r = input.result;
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
