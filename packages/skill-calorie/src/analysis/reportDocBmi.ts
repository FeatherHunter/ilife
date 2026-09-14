/** #384 · 报告子形态页渲染·BMI 形态（先验件）。
 *
 * 老侧契约（`templates/health_report.html` `kind=bmi`）：4 张 KPI（当前 BMI／分类／身高／采样点）
 * ＋ 历史轨迹折线 ＋ 分类里程碑（`from → to`）；分级阈值文案「偏瘦<18.5 正常<24.9 超重<28 肥胖≥28」原样搬。
 *
 * 分级判定取 `reportPlate.bmiBandOf`（**唯一判据**，本件不重写阈值）；
 * 逐日体重与 BMI 取 `fetchWeightLogs`（已有同形取数，不重算第二份 BMI）。
 * 颜色字面量 0；折线量程贴着数据。
 */
import { renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import { bmiBandOf, BMI_BANDS } from './reportPlate.js';
import { fmt, lineOf } from './reportDocParts.js';
import type { ReportPlate } from './reportPlate.js';

/** 分类里程碑：分数带「from → to」的流水（相邻两次称重跨档才算一次）。 */
function milestonesOf(points: readonly { readonly date: string; readonly bmi: number | null }[]): string[] {
  const out: string[] = [];
  let prev: string | null = null;
  for (const p of points) {
    if (p.bmi === null) continue;
    const band = bmiBandOf(p.bmi);
    if (prev !== null && band !== prev) out.push(prev + ' → ' + band + '（' + p.date + '，BMI ' + p.bmi + '）');
    prev = band;
  }
  return out;
}

export function buildBmiBlocks(plate: ReportPlate): string {
  const pts = plate.bandPoints;
  const withBmi = pts.filter((p): p is { date: string; kg: number; bmi: number } => p.bmi !== null);
  if (withBmi.length === 0) {
    return renderDataTable({
      columns: [{ key: 'note', label: '说明' }],
      rows: [{ note: '这段时间没有可算 BMI 的称重记录（BMI 由体重与档案身高算出）' }],
      caption: '逐日体重与 BMI',
    });
  }
  const last = withBmi[withBmi.length - 1] as { date: string; kg: number; bmi: number };
  const band = bmiBandOf(last.bmi);
  const milestones = milestonesOf(pts);
  return renderKpiGrid([
    { label: '当前 BMI', value: String(last.bmi), detail: last.date + ' · ' + band },
    {
      label: '分类', value: band,
      detail: '偏瘦<18.5 正常<24.9 超重<28 肥胖≥28',
      ...(band === '正常' ? { status: 'ok' as const } : { status: 'warn' as const }),
    },
    {
      label: '身高', value: fmt(plate.base.profile.heightCm), unit: 'cm',
      detail: plate.base.profile.heightCm === null ? '未设档案身高' : '来自档案（BMI 的分母）',
    },
    { label: '采样点', value: String(withBmi.length), unit: '次', detail: '窗口共 ' + plate.base.days + ' 天' },
  ])
    + lineOf(pts.map((p) => ({ date: p.date, value: p.bmi })), 'BMI 轨迹（逐日体重与 BMI）', { format: (v) => v.toFixed(1) })
    + renderDataTable({
      columns: [
        { key: 'band', label: 'BMI 分级' },
        { key: 'range', label: '区间' },
        { key: 'now', label: '当前落在' },
      ],
      rows: BMI_BANDS.map((b) => ({
        band: b.label,
        range: b.hi === null ? '≥ ' + String(b.lo) : String(b.lo) + ' – ' + String(b.hi),
        now: band === b.label ? '✔' : '',
      })),
      caption: 'BMI 分级（页面文案口径）',
    })
    + renderDataTable({
      columns: [
        { key: 'date', label: '日期' },
        { key: 'kg', label: '体重kg', align: 'right' },
        { key: 'bmi', label: 'BMI', align: 'right' },
      ],
      rows: pts.map((p) => ({ date: p.date, kg: p.kg, bmi: p.bmi === null ? null : p.bmi })),
      caption: '逐日体重与 BMI',
      emptyText: '这段时间还没有称重记录',
    })
    + (milestones.length === 0
      ? renderDataTable({
        columns: [{ key: 'm', label: '分类里程碑' }],
        rows: [],
        caption: '分类里程碑',
        emptyText: '窗口内 BMI 没有跨过分级线',
      })
      : renderDataTable({
        columns: [{ key: 'm', label: '分类里程碑' }],
        rows: milestones.map((m) => ({ m })),
        caption: '分类里程碑（from → to）',
      }));
}
