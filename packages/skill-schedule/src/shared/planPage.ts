/** #782 · 「查日程」的**页型配方**（形状维度的唯一定义地）。
 *
 *  形状＝人裁过的 **A · 覆盖条＋事件卡**（票面 [#782](https://github.com/FeatherHunter/ilife/issues/782)，
 *  裁决原文 `B A A`，见 `docs/skills/skill-schedule/t782-形状-证据.md` 第六节）：
 *
 *    读数卡 → 结论条 → 24 小时覆盖条（置顶）→ 事件卡列表 → 折叠「空档」→ 筛选位 → 复制区
 *
 *  老侧 f10「查日程（单日）」的三个必现块：**24h 时间轴**＝覆盖条（置顶，有事件的格子才着色）、
 *  **事件卡**＝列表行（时间／标题／同步状态）、**筛选位**＝参数表单。
 *
 *  **本件只认形状，不认口径**：空档怎么算、状态取哪两位，都由 `plan` 侧算好再进来。
 *
 *  #786 动过两处（都不动件序列）：事件卡那一段收公共层行列表的入参（空列表那句话随查法变）、
 *  筛选位那句说明句改成行文（`、` 是 #516 分隔符门点名的并列符号）。
 */
import {
  renderConclusionBar, renderDisclosure, renderKpiGrid, renderListRows,
  renderParamForm, type KpiCardInput, type ListRowsInput, type ListRowInput, type ParamFieldInput,
} from 'base-paint/blocks';
import { scheduleCopyArea, type ScheduleCopyAreaInput } from '../render/copyArea.js';
import { assembleDocPage, type PageHead } from './docPage.js';
import { renderHourBand, type HourCell } from './pageParts.js';

/** 「查日程」一页要的全部东西（字段数：`head`／`cells`／`order`／`kpis`／`conclusion`／`events`／
 *  `gaps`／`filters`／`copy`）。
 *
 *  #786 的一处（只加可选位，不动件序列）：`events` 收**公共层行列表的入参**（而不是裸数组）——
 *  空列表那句话随查法变（「这一天没有事件」与「这一天没有标题命中的事件」不是一回事），
 *  那句话是**口径**、住调用方，形状侧只负责把它透传给 `renderListRows`。不给 `emptyText`
 *  ＝#782 那张页的同一句话，产出逐字节同。 */
export interface PlanPageData {
  readonly head: PageHead;
  /** 24 小时覆盖条的 24 格（没有事件的格子＝`key: null`，不着色）。 */
  readonly cells: readonly HourCell[];
  readonly order: readonly string[];
  /** 读数卡（事件数／已排时段／空档／已完成）。 */
  readonly kpis: readonly KpiCardInput[];
  readonly conclusion: string;
  /** 事件卡列表（一行一件）＋空列表时那句话（不给＝「这一天没有事件」）。 */
  readonly events: ListRowsInput;
  /** 空档列表（收在折叠区里）。 */
  readonly gaps: readonly ListRowInput[];
  /** 筛选位的字段（日期／分类／状态）。 */
  readonly filters: readonly ParamFieldInput[];
  readonly copy: ScheduleCopyAreaInput;
}

/** 出「查日程」整页。 */
export function renderPlanPage(data: PlanPageData): string {
  const content = [
    renderKpiGrid(data.kpis),
    renderConclusionBar(data.conclusion),
    renderHourBand(data.cells, { order: data.order, title: '24 小时覆盖', height: 120 }),
    renderListRows(data.events),
    renderDisclosure({ title: data.gaps.length > 0 ? '空档' : '空档（无）', contentHtml: renderListRows({ items: data.gaps, emptyText: '整天都被事件占满' }) }),
    // 说明句不堆并列分隔符（`、` 是 #516 分隔符门点名的并列符号之一）：写成一句行文。
    renderParamForm({ description: '换一个日期，或者按分类与状态再收一收。', fields: data.filters }),
    scheduleCopyArea({
      title: '复制与留档',
      dataActionId: 'ilife-sch-plan-copy-data',
      logActionId: 'ilife-sch-plan-copy-log',
      ...data.copy,
    }),
  ].filter((seg) => seg !== '').join('');
  return assembleDocPage({ head: data.head, content });
}
