/** #782 · 「今天总结」的**页型配方**（形状维度的唯一定义地）。
 *
 *  形状＝人裁过的 **B · 时间轴主轴**（票面 [#782](https://github.com/FeatherHunter/ilife/issues/782)，
 *  裁决原文 `B A A`，见 `docs/skills/skill-schedule/t782-形状-证据.md` 第六节）：
 *
 *    结论条 → 24 小时色带（放大）→ 一行事实条（四卡摘要压成一行）→ 竖向时间轴逐条
 *    → 睡眠统计 → 折叠「分类进度」→ 作息库现状 → 复制区
 *
 *  老侧 f01「作息记录·单日」的四个必现块一块不少，只是换了骨架与主次：**4 卡摘要**落成一行事实条、
 *  **分类进度**收进折叠区、**24h 时间轴**由色带 ＋ 时间轴条两件一起承担、**睡眠统计**是它自己那一行。
 *
 *  #784 补的一处（老侧这一样没上过屏，不是「形」的改动）：
 *   · **作息库现状**（`status`，可选）：老侧 `status` 子命令的五条状态在页上占一条事实条
 *     （今天之前这些读数只写进 stderr，用户看不到）。
 *  不给时，产出与 #782 那张页**逐字节相同**（件序列与位置一处未动）。
 *
 *  **本件只认形状，不认口径**：进来的是摆好的数据（谁的时长、哪一类的色，都由 `query` 侧算好），
 *  出去的是 HTML 串。域票要出这一页，只许调本函数——骨架不许各域自造。
 */
import {
  renderConclusionBar, renderCopyBlock, renderDisclosure, renderDistributionRows, renderListRows,
  type DistributionRowInput, type ListRowInput,
} from 'base-paint/blocks';
import { renderFactStrip, type FactItemInput } from 'base-paint';
import { assembleDocPage, type PageHead } from './docPage.js';
import { categoryColor, renderHourBand, type HourCell } from './pageParts.js';

/** 「今天总结」一页要的全部东西（10 个字段，口径都在调用方）。 */
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
  /** 竖向时间轴：这一天逐条记录。**行列表三槽**（`left` 时间／`main` 做了什么／`right` 时长）。 */
  readonly timeline: readonly ListRowInput[];
  /** 睡眠统计那一行。 */
  readonly sleep: readonly FactItemInput[];
  /** 分类进度（收在折叠区里）。 */
  readonly distribution: readonly DistributionRowInput[];
  /** 复制区两段文本（数据／日志）。 */
  readonly copy: { readonly dataText: string; readonly logText: string };
  /** **作息库现状**（可选；不给＝这一块不出）：老侧 `status` 子命令那几条读数。
   *  `title` 只能是这一块的段落名（`作息库现状`），**不是页头**——页头住在 `head` 里。 */
  readonly status?: { readonly title: string; readonly items: readonly FactItemInput[] };
}

/** 出「今天总结」整页。 */
export function renderDayPage(data: DayPageData): string {
  const content = [
    renderConclusionBar(data.conclusion),
    renderHourBand(data.cells, { order: data.order, title: '24 小时时间轴', height: 140 }),
    renderFactStrip({ items: data.facts }),
    renderListRows({ items: data.timeline, emptyText: '这一天还没有记录' }),
    renderFactStrip({ items: data.sleep }),
    renderDisclosure({
      title: '分类进度（一级分类分布）',
      // 分布行按名上色（与色带／矩阵同一算式）：不给色就一律落 `--blue`，七条一样看不出分别。
      contentHtml: renderDistributionRows({
        rows: data.distribution.map((row) => ({ ...row, color: categoryColor(row.label, data.order) })),
      }),
    }),
    renderStatusBlock(data.status),
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

/** **作息库现状**那一段的装配（今天总结页与时间轴页共用一处，两页的说法不各写一遍）。
 *
 *  段落名走 `heat-title` 这个公共层已有的段名类（「周视图」那张页的矩阵段名也用它），
 *  读数走页面级事实条——**不新造类名、不新添 CSS**，所以共用位这一份仍只认形状。
 *  不给 `status`（或条目为空）＝空串，页上不留空块。 */
export function renderStatusBlock(
  status: { readonly title: string; readonly items: readonly FactItemInput[] } | undefined,
): string {
  if (status === undefined || status.items.length === 0) return '';
  return '<h2 class="heat-title">' + escText(status.title) + '</h2>' + renderFactStrip({ items: status.items });
}

/** 五字符转义（与公共层同口径；本件只为上面那个段落名用一次）。 */
function escText(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => {
    if (ch === '&') return '&amp;';
    if (ch === '<') return '&lt;';
    if (ch === '>') return '&gt;';
    if (ch === '"') return '&quot;';
    return '&#39;';
  });
}
