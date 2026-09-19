/** 分析域·**卡形状渲染**（五种形态族的模板共用）：条卡组／列表卡／小表卡／事实卡／图卡／对比双卡。
 *
 * 为什么单出一件（而不是各族模板各写一份）：这六种卡**被两个以上的族用到**——
 *  条卡与列表卡用在「读数＋条」「读数＋图」「对比＋变更」「解读＋多卡」四族，事实卡五族都用。
 *  按「共用件从第二个用法里长出来」的老规矩收在这里；**族之间真正不同的只有卡的先后**，
 *  那份次序住各自的模板件（`./template-*.ts`），本件一行序列都不写。
 *
 * 口径出处：
 *   - 卡一律取公共层的形状件（#688 裁定 7「同一个形状全仓只许一处定义」）：条卡＝`renderDistributionRows`、
 *     列表卡＝`renderListRows`、小表卡＝`renderDataTable`、图卡＝`renderChartBlock`、读数卡＝`renderKpiGrid`；
 *   - **每张卡自带空态句**（#688 §三 第 7 条：每表／每列表／每图各传 `emptyText`，不许照老侧留白卡）；
 *   - 图一律走公共层图表（#688 §二 C5：技能侧零 SVG 副本、零样式副本；本域的环／柱／折线／直方四图都在闭集里）。
 */
import { renderChartBlock, renderChips, renderDataTable, renderDistributionRows, renderEmptyBlock, renderKpiGrid, renderListRows } from 'base-paint/blocks';
import type { KpiCardInput } from 'base-paint/blocks';
import type { PageBlock } from '../shared/pageSections.js';
import type { BarGroup, ChartCard, EmptySpec, FactCard, ListCard, TableCard } from './scene.js';
import { textOrDash } from './pageParts.js';

/** 一格带导航面与段标题的卡（各族的块清单由它逐张拼出）：锚点与导航条目同源给，标题即那枚 `<h2>`。 */
export function cardBlock(html: string, anchor: string, title: string): PageBlock {
  return { html, nav: { anchor, navText: title === '' ? anchor : title }, ...(title === '' ? {} : { heading: title }) };
}

/** 一张卡没有内容时出的空态（每卡各带一句，见文件头口径）。 */
function emptyCard(text: string): string {
  return renderEmptyBlock({ text });
}

/** 条卡组（一组占比条）：行即条；零行出这一组自己的空态句。 */
export function barGroupHtml(group: BarGroup): string {
  if (group.rows.length === 0) return emptyCard(group.emptyText);
  return renderDistributionRows({
    rows: group.rows.map((r) => ({ label: r.label, value: r.text, pct: r.pct })),
  });
}

/** 列表卡：`左 ｜ 主文 ｜ 右`，零行出这一张卡的空态句。 */
export function listCardHtml(card: ListCard): string {
  if (card.rows.length === 0) return emptyCard(card.emptyText);
  return renderListRows({
    items: card.rows.map((r) => ({
      left: r.left,
      main: r.main,
      right: r.right,
      ...(r.done === true ? { done: true } : {}),
    })),
  });
}

/** 小表卡：表题走公共层 `caption` 位；零行出 `emptyText`（公共层表格件自己出空态，本件不另写一套）。 */
export function tableCardHtml(card: TableCard): string {
  return renderDataTable({
    columns: card.columns,
    rows: card.rows,
    ...(card.caption === undefined ? {} : { caption: card.caption }),
    emptyText: card.emptyText,
  });
}

/** 事实卡：`键 ｜ 值` 两栏（`renderListRows` 的右栏对齐），零行不出（调用方按 `rows.length` 决定要不要这张卡）。 */
export function factCardHtml(card: FactCard): string {
  if (card.rows.length === 0) return '';
  return renderListRows({ items: card.rows.map((r) => ({ main: r.k, right: textOrDash(r.v) })) });
}

/** 图卡：kind ＋ 数据 ＋ 标题全交给公共层图表件（技能侧零 SVG 副本）。 */
export function chartCardHtml(card: ChartCard): string {
  return renderChartBlock({ kind: card.kind, input: card.input, title: card.title });
}

/** 对比的一侧（一段期间的四格读数）：卡区标题即这段期间的标签。 */
export interface CompareSideCard {
  readonly title: string;
  readonly kpis: readonly KpiCardInput[];
}

/** 对比双卡（并排两段期间；两端都是读数卡区，只有标题不同）。 */
export function compareSidesHtml(sides: readonly CompareSideCard[]): string {
  return sides.map((s) => renderKpiGrid(s.kpis, { title: s.title })).join('');
}

/** 读数卡区（本域五个族共用的一格）：标题给了就出一枚段标题；零卡＝空串（不产空网格）。 */
export function kpiGridHtml(cards: readonly KpiCardInput[], title = ''): string {
  if (cards.length === 0) return '';
  return renderKpiGrid(cards, title === '' ? undefined : { title });
}

/** 芯片列：筛选条件／结果计数那一排短词（老侧 `.filter-chip`）。 */
export function chipsHtml(items: readonly string[]): string {
  return items.length === 0 ? '' : renderChips({ items: items.map((text) => ({ text })) });
}

/** 可见芯片列＝**族槽与结果槽的并集**（去重）。
 *  两个槽的分工：`page.chips` 是这一族自己要摆在正文里的芯片，`SceneResult.chips` 是这次结果的胶囊；
 *  四族的模板都只出一排芯片，故取并集——两处写同一个值时不会出双份，只写一处的场景也不会漏掉那一枚。 */
export function mergedChips(family: readonly string[], result: readonly string[]): string {
  return chipsHtml([...new Set([...family, ...result])]);
}

/** 空态格（含引导句）：窗口内一条记录也没有时**整页仍完整**，这一格就是那句空态（#688 裁定 4）。 */
export function emptyHtml(spec: EmptySpec): string {
  return renderEmptyBlock({ text: spec.text, hint: spec.hint });
}

/** 一段期间的读数（对比页的一侧：期间标签 ＋ 那一侧的读数卡）。 */
export function sideKpisOf(label: string, kpi: { count: number; expense: number; income: number; net: number }, money: (n: number) => string): readonly KpiCardInput[] {
  return [
    { label: '笔数', value: String(kpi.count), unit: '笔' },
    { label: '支出', value: money(kpi.expense), unit: '元' },
    { label: '收入', value: money(kpi.income), unit: '元' },
    { label: '净额', value: money(kpi.net), unit: '元', detail: kpi.net >= 0 ? '收大于支' : '支大于收' },
  ];
}
