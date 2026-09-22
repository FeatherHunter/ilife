/** #785 · 「24h 概览（多日）」的**页型配方**（形状维度的唯一定义地）。
 *
 *  为什么要新立一张：老侧 f11「查日程（多日 24h 概览）」与 f10「查日程（单日）」共用同一个模板
 *  （`schedule_list_events.html`），但**两块内容不一样**：单日页给的是事件卡与筛选位（那是 `planPage.ts`），
 *  f11 给的是「一天 24 格长什么样」的聚合视图。交接件写着其余家族出页前先把骨架定下来——这里是本票定的那一份。
 *
 *  形状＝件序列：
 *
 *    读数卡 → 结论条 → 口径行 → 多日概览表（一行一天）→ 逐日 24 格（段名 ＋ 行列表）→ 复制区
 *
 *  老侧 f11 的两个必现块：**同小时合并**＝逐日 24 格里那一格的内容（上游已把同一小时的多条并成一串）、
 *  **多日聚合（不含 notes／completion／飞书状态）**＝口径行明说丢了哪几样 ＋ 一行一天的概览表。
 *
 *  **本件只认形状，不认口径**：分桶怎么分、哪一格写什么、表里报哪几列，都由 `query` 侧算好再进来。
 *  件序列**不随数据多寡变形**：一天也走这一套（表退化成一行、24 格只有一段）。
 *
 *  #891 补的**页内定位**（不动件序列）：小节＝逐日那几段（`周六 09-05` 这种短名）＋ 复制区。
 *  按 `./pageNav.ts` 的长页判据（小节数 ≥ `SECTION_TOC_MIN`）：**一天那一档判为短页**（逐日 1 段 ＋ 复制区
 *  ＝ 2 小节，页首不出目录）；**多天（≥2 天）是长页**，页首出页内目录。
 */
import {
  renderCaliberLine, renderConclusionBar, renderDataTable, renderKpiGrid, renderListRows,
  type DataTableColumn, type DataTableRow, type KpiCardInput, type ListRowInput,
} from 'base-paint/blocks';
import { scheduleCopyArea, type ScheduleCopyAreaInput } from '../render/copyArea.js';
import { assembleDocPage, type PageHead } from './docPage.js';
import { pageSections } from './pageNav.js';

/** 逐日那一段（一天一段：段名 ＋ 24 格 ＋ 该日的随附读数）。 */
export interface OverviewDaySection {
  /** 段名（日期与星期 ＋ 已排格数，调用方拼好）。 */
  readonly title: string;
  /** 这一段的**短名**（页内目录的条目文本）：日期与星期，含排布格数的读数不进目录、
   *  留在大段名上（口径见 `./pageNav.ts` 的件头）。 */
  readonly navText: string;
  /** 这一天 24 格（时:00 ／ 内容）；空桶也占一行，形状不随数据变。 */
  readonly rows: readonly ListRowInput[];
  /** 该日的随附读数（首建与末改时间）；不给＝这一段不出脚注。 */
  readonly footnote?: string;
}

/** 「24h 概览（多日）」一页要的全部东西（8 个字段）。 */
export interface OverviewPageData {
  readonly head: PageHead;
  readonly kpis: readonly KpiCardInput[];
  readonly conclusion: string;
  /** 口径行：这一页是聚合视图、丢了哪几样（用行文写，不堆并列分隔符）。 */
  readonly caliber: string;
  /** 多日概览表：一行一天（列与行都由调用方给）。 */
  readonly table: {
    readonly columns: readonly DataTableColumn[];
    readonly rows: readonly DataTableRow[];
    readonly caption?: string;
  };
  /** 逐日 24 格：一天一段，顺序即调用方给的顺序。 */
  readonly days: readonly OverviewDaySection[];
  readonly copy: ScheduleCopyAreaInput;
}

/** 出「24h 概览（多日）」整页。 */
export function renderOverviewPage(data: OverviewPageData): string {
  const { toc, body } = pageSections([
    { html: renderKpiGrid(data.kpis) },
    { html: renderConclusionBar(data.conclusion) },
    { html: renderCaliberLine(data.caliber) },
    { html: renderDataTable({
      columns: data.table.columns,
      rows: data.table.rows,
      ...(data.table.caption === undefined ? {} : { caption: data.table.caption }),
    }) },
    ...data.days.map((day) => ({
      navText: day.navText,
      html: '<h2 class="heat-title">' + escText(day.title) + '</h2>'
        + renderListRows({ items: day.rows, emptyText: '这一天没有安排' })
        + (day.footnote === undefined || day.footnote === '' ? '' : renderCaliberLine(day.footnote)),
    })),
    { navText: '复制与留档', html: scheduleCopyArea({
      title: '复制与留档',
      dataActionId: 'ilife-sch-overview-copy-data',
      logActionId: 'ilife-sch-overview-copy-log',
      ...data.copy,
    }) },
  ]);
  return assembleDocPage({ head: data.head, content: toc + body });
}

/** 五字符转义（与公共层同口径；本件只为段名用一次，与 `dayPage.ts` 那一处同法）。 */
function escText(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => {
    if (ch === '&') return '&amp;';
    if (ch === '<') return '&lt;';
    if (ch === '>') return '&gt;';
    if (ch === '"') return '&quot;';
    return '&#39;';
  });
}
