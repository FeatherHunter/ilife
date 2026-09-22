/** #785 · 「区间汇总」的**页型配方**（形状维度的唯一定义地）。
 *
 *  为什么新立一张（接手 `出页交接-页型配方怎么用.md` §一的口径）：老侧 f02「作息记录·区间」这一族
 *  在 #782 那一轮没有冻骨架（那一轮只裁了三张：今天总结／查日程／周视图），交接件写着「其余 15 个家族
 *  出页前先把骨架与件序列定下来」——这里是本票定的那一份，别的域不许各造一份。
 *
 *  形状＝件序列（照老侧 f02 的必现块摆位，一块不少，只换主次）：
 *
 *    读数卡 → 结论条 → 分类聚合（分布行）→ 7 维趋势（图表块）→ 睡眠统计（事实条）→ 每日明细（行列表）→ 复制区
 *
 *  老侧 f02 的必现块：**分类聚合**＝分布行、**7 维趋势**＝图表块、**睡眠统计**＝事实条；
 *  另有老侧同页的 4 卡摘要（这里＝读数卡）与每日明细（这里＝行列表），健康分落读数卡之一。
 *
 *  **本件只认形状，不认口径**：哪 7 维、每格多少分钟、分布行怎么排序、睡眠取哪几类，都由 `query` 侧
 *  算好再进来（与 `weekPage.ts` 同一分工）。
 */
import {
  renderChartBlock, renderConclusionBar, renderDistributionRows,
  renderKpiGrid, renderListRows, type ChartBlockInput, type DistributionRowInput,
  type KpiCardInput, type ListRowInput,
} from 'base-paint/blocks';
import { renderFactStrip, type FactItemInput } from 'base-paint';
import { scheduleCopyArea, type ScheduleCopyAreaInput } from '../render/copyArea.js';
import { assembleDocPage, type PageHead } from './docPage.js';
import { categoryColor } from './pageParts.js';

/** 「区间汇总」一页要的全部东西（8 个字段）。 */
export interface RangePageData {
  readonly head: PageHead;
  /** 读数卡：块数／覆盖／覆盖天数／健康分（老侧同页的「4 卡摘要」）。 */
  readonly kpis: readonly KpiCardInput[];
  readonly conclusion: string;
  /** **分类聚合**：一级分类的时长与占比（标签是给人看的一级分类名，不是 `l1.x` 那种原始键）。 */
  readonly distribution: readonly DistributionRowInput[];
  /** 分布行上色要的顺序（一级分类的权威顺序，由调用方从 `policy` 取）。 */
  readonly order: readonly string[];
  /** **7 维趋势**：图表块的 kind ＋ 入参（本件只补段名，不挑 kind——单日区间与多日区间的画法不同）。 */
  readonly trend: Omit<ChartBlockInput, 'title'>;
  /** **睡眠统计**：夜间睡眠／午睡／合计。 */
  readonly sleep: readonly FactItemInput[];
  /** 每日明细（一行一天：日期／块数／当天时长）。 */
  readonly daily: readonly ListRowInput[];
  readonly copy: ScheduleCopyAreaInput;
}

/** 出「区间汇总」整页。 */
export function renderRangePage(data: RangePageData): string {
  const content = [
    renderKpiGrid(data.kpis),
    renderConclusionBar(data.conclusion),
    // 分类聚合这一段要有名字（老侧 f02 的必现块就叫「分类聚合」）：段名走 `heat-title` 这个公共层
    // 已有的段名类（今天总结页的「作息库现状」与周视图的矩阵段名都走它），不新造类名、不新添 CSS。
    '<h2 class="heat-title">分类聚合</h2>',
    // 分布行按名上色（与色带／矩阵同一算式）：不给色就一律落 `--blue`，八行一样看不出分别。
    renderDistributionRows({
      rows: data.distribution.map((row) => ({ ...row, color: categoryColor(row.label, data.order) })),
    }),
    renderChartBlock({ ...data.trend, title: '7 维趋势' }),
    renderFactStrip({ items: data.sleep }),
    renderListRows({ items: data.daily, emptyText: '这一区间没有记录' }),
    scheduleCopyArea({
      title: '复制与留档',
      dataActionId: 'ilife-sch-range-copy-data',
      logActionId: 'ilife-sch-range-copy-log',
      ...data.copy,
    }),
  ].filter((seg) => seg !== '').join('');
  return assembleDocPage({ head: data.head, content });
}
