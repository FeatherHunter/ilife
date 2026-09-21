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
 */
import {
  renderCopyBlock, renderDistributionRows, renderKpiGrid, renderListRows,
  type DistributionRowInput, type KpiCardInput, type ListRowInput,
} from 'base-paint/blocks';
import { assembleDocPage, type PageHead } from './docPage.js';
import { renderHeatMatrix, type HeatRow } from './pageParts.js';

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
  readonly copy: { readonly dataText: string; readonly logText: string };
}

/** 出「周视图」整页。 */
export function renderWeekPage(data: WeekPageData): string {
  const content = [
    renderKpiGrid(data.kpis),
    renderHeatMatrix(data.rows, { order: data.order, id: 'week-heat', title: '7×24 全分类热力图', legend: true }),
    renderDistributionRows({ rows: data.distribution }),
    renderListRows({ items: data.daily, emptyText: '这一周没有记录' }),
    renderCopyBlock({
      title: '复制给 AI',
      dataText: data.copy.dataText,
      logText: data.copy.logText,
      dataActionId: 'ilife-sch-week-copy-data',
      logActionId: 'ilife-sch-week-copy-log',
    }),
  ].filter((seg) => seg !== '').join('');
  return assembleDocPage({ head: data.head, content });
}
