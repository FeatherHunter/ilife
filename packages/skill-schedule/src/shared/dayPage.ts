/** #782 · 「今天总结」的**页型配方**（形状维度的唯一定义地）。
 *
 *  形状＝人裁过的 **B · 时间轴主轴**（票面 [#782](https://github.com/FeatherHunter/ilife/issues/782)，
 *  裁决原文 `B A A`，见 `docs/skills/skill-schedule/t782-形状-证据.md` 第六节）：
 *
 *    结论条 → 24 小时色带（放大）→ 一行事实条（四卡摘要压成一行）→ 竖向时间轴逐条
 *    → 睡眠统计 → 折叠「分类进度」→ 复制区
 *
 *  老侧 f01「作息记录·单日」的四个必现块一块不少，只是换了骨架与主次：**4 卡摘要**落成一行事实条、
 *  **分类进度**收进折叠区、**24h 时间轴**由色带 ＋ 时间轴条两件一起承担、**睡眠统计**是它自己那一行。
 *
 *  **本件只认形状，不认口径**：进来的是摆好的数据（谁的时长、哪一类的色，都由 `query` 侧算好），
 *  出去的是 HTML 串。域票要出这一页，只许调本函数——骨架不许各域自造。
 */
import {
  renderConclusionBar, renderCopyBlock, renderDisclosure, renderDistributionRows,
  type DistributionRowInput,
} from 'base-paint/blocks';
import { renderFactStrip, renderTimelineRows, type FactItemInput, type TimelineRowInput } from 'base-paint';
import { assembleDocPage, type PageHead } from './docPage.js';
import { renderHourBand, type HourCell } from './pageParts.js';

/** 「今天总结」一页要的全部东西（8 个字段，口径都在调用方）。 */
export interface DayPageData {
  readonly head: PageHead;
  /** 24 小时色带要的 24 格。 */
  readonly cells: readonly HourCell[];
  /** 色带配色与图例的顺序（一级分类的权威顺序，由调用方从 `policy` 取）。 */
  readonly order: readonly string[];
  /** 结论条那一句。 */
  readonly conclusion: string;
  /** 一行事实条：老侧「4 卡摘要」的四个读数。 */
  readonly facts: readonly FactItemInput[];
  /** 竖向时间轴：这一天逐条记录。 */
  readonly timeline: readonly TimelineRowInput[];
  /** 睡眠统计那一行。 */
  readonly sleep: readonly FactItemInput[];
  /** 分类进度（收在折叠区里）。 */
  readonly distribution: readonly DistributionRowInput[];
  /** 复制区两段文本（数据／日志）。 */
  readonly copy: { readonly dataText: string; readonly logText: string };
}

/** 出「今天总结」整页。 */
export function renderDayPage(data: DayPageData): string {
  const content = [
    renderConclusionBar(data.conclusion),
    renderHourBand(data.cells, { order: data.order, title: '24 小时时间轴', height: 140 }),
    renderFactStrip({ items: data.facts }),
    renderTimelineRows({ rows: data.timeline }),
    renderFactStrip({ items: data.sleep }),
    renderDisclosure({
      title: '分类进度（一级分类分布）',
      contentHtml: renderDistributionRows({ rows: data.distribution }),
    }),
    renderCopyBlock({
      title: '复制与留档',
      dataText: data.copy.dataText,
      logText: data.copy.logText,
      dataActionId: 'ilife-sch-day-copy-data',
      logActionId: 'ilife-sch-day-copy-log',
    }),
  ].filter((seg) => seg !== '').join('');
  return assembleDocPage({ head: data.head, content });
}
