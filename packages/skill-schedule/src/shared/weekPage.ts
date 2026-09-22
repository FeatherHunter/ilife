/** #782 · 「周视图」的**页型配方**（形状维度的唯一定义地）。
 *
 *  形状＝人裁过的 **A · 矩阵为主**（票面 [#782](https://github.com/FeatherHunter/ilife/issues/782)，
 *  裁决原文 `B A A`，见 `docs/skills/skill-schedule/t782-形状-证据.md` 第六节）：
 *
 *    读数卡 → 7×24 热力矩阵（页主体）→ 图例 → 分类总览 → 每日汇总列表 → 复制区
 *
 *  老侧 f08「周视图」的五个必现块：**7×24 全分类热力图**＝矩阵（页主体）、**分类总览**＝分布行、
 *  **每日汇总**＝列表行、**健康分**＝读数卡之一、**复制 prompt 位**＝复制区。
 *
 *  **本件只认形状，不认口径**：格子取哪个分类、健康分怎么算、顺序表从哪来，都由 `query` 侧给。
 *
 *  #891 补的**页内定位**（不动件序列）：本页**小节恒 2 颗**（`7×24 全分类热力图`／`复制给 AI`），
 *  按 `./pageNav.ts` 的长页判据（小节数 ≥ `SECTION_TOC_MIN`）**这一页被判为短页**，页首不出页内目录；
 *  两颗段名照旧各包一层带 `id` 的 `<section>`（锚点仍在，只有目录不出）。
 */
import {
  renderDistributionRows, renderKpiGrid, renderListRows,
  type DistributionRowInput, type KpiCardInput, type ListRowInput,
} from 'base-paint/blocks';
import { scheduleCopyArea, type ScheduleCopyAreaInput } from '../render/copyArea.js';
import { assembleDocPage, type PageHead } from './docPage.js';
import { pageSections } from './pageNav.js';
import { categoryColor, renderHeatMatrix, type HeatRow } from './pageParts.js';

/** 「周视图」一页要的全部东西（7 个字段）。 */
export interface WeekPageData {
  readonly head: PageHead;
  readonly kpis: readonly KpiCardInput[];
  /** 七天各一行（每行 24 格）；行尾合计由调用方格式化好（`sum`）。 */
  readonly rows: readonly HeatRow[];
  readonly order: readonly string[];
  /** 分类总览。 */
  readonly distribution: readonly DistributionRowInput[];
  /** 每日汇总（一行一天）。 */
  readonly daily: readonly ListRowInput[];
  readonly copy: ScheduleCopyAreaInput;
}

/** 出「周视图」整页。 */
export function renderWeekPage(data: WeekPageData): string {
  const { toc, body } = pageSections([
    { html: renderKpiGrid(data.kpis) },
    // 段名是「7×24 全分类热力图」；目录项逐字用它。
    { navText: '7×24 全分类热力图', html: renderHeatMatrix(data.rows, { order: data.order, id: 'week-heat', title: '7×24 全分类热力图', legend: true }) },
    // 分类总览按名上色（与矩阵同一算式）：不给色就一律落 `--blue`，八行一样看不出分别。
    { html: renderDistributionRows({
      rows: data.distribution.map((row) => ({ ...row, color: categoryColor(row.label, data.order) })),
    }) },
    { html: renderListRows({ items: data.daily, emptyText: '这一周没有记录' }) },
    { navText: '复制给 AI', html: scheduleCopyArea({
      title: '复制给 AI',
      dataActionId: 'ilife-sch-week-copy-data',
      logActionId: 'ilife-sch-week-copy-log',
      ...data.copy,
    }) },
  ]);
  return assembleDocPage({ head: data.head, content: toc + body });
}
