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
 */
import {
  renderConclusionBar, renderCopyBlock, renderDisclosure, renderKpiGrid, renderListRows,
  renderParamForm, type KpiCardInput, type ListRowInput, type ParamFieldInput,
} from 'base-paint/blocks';
import { assembleDocPage, type PageHead } from './docPage.js';
import { renderHourBand, type HourCell } from './pageParts.js';

/** 「查日程」一页要的全部东西（8 个字段）。 */
export interface PlanPageData {
  readonly head: PageHead;
  /** 24 小时覆盖条的 24 格（没有事件的格子＝`key: null`，不着色）。 */
  readonly cells: readonly HourCell[];
  readonly order: readonly string[];
  /** 读数卡（事件数／已排时段／空档／已完成）。 */
  readonly kpis: readonly KpiCardInput[];
  readonly conclusion: string;
  /** 事件卡列表（一行一件）。 */
  readonly events: readonly ListRowInput[];
  /** 空档列表（收在折叠区里）。 */
  readonly gaps: readonly ListRowInput[];
  /** 筛选位的字段（日期／分类／状态）。 */
  readonly filters: readonly ParamFieldInput[];
  readonly copy: { readonly dataText: string; readonly logText: string };
}

/** 出「查日程」整页。 */
export function renderPlanPage(data: PlanPageData): string {
  const content = [
    renderKpiGrid(data.kpis),
    renderConclusionBar(data.conclusion),
    renderHourBand(data.cells, { order: data.order, title: '24 小时覆盖', height: 120 }),
    renderListRows({ items: data.events, emptyText: '这一天没有事件' }),
    renderDisclosure({ title: data.gaps.length > 0 ? '空档' : '空档（无）', contentHtml: renderListRows({ items: data.gaps, emptyText: '整天都被事件占满' }) }),
    renderParamForm({ description: '按日期、分类或状态缩小范围。', fields: data.filters }),
    renderCopyBlock({
      title: '复制与留档',
      dataText: data.copy.dataText,
      logText: data.copy.logText,
      dataActionId: 'ilife-sch-plan-copy-data',
      logActionId: 'ilife-sch-plan-copy-log',
    }),
  ].filter((seg) => seg !== '').join('');
  return assembleDocPage({ head: data.head, content });
}
