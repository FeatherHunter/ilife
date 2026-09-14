/** #384 · 报告子形态页渲染·公共原语（1 个多态底座共用的区块件）。
 *
 * 为什么另立一件：8 个形态若各写一份 KPI／折线／表格／页脚，同一套原语就复制 8 遍
 * （违反「概念唯一」）；本件是那**唯一一份**，`reportDoc.ts` 与它两个分片都从这里取。
 *
 * 纪律：颜色字面量 0（走 `base-paint` 令牌，主色既有 `--blue`）；样式一律经
 * `assembleDocPage`（内部＝`buildStyleSheet().css + blocksCss()`，不走 `extraCss`）。
 * 折线量程贴着数据（给宽了曲线就是平线，读不出走势）——与 `multiTrendPage` 同取向，各自域内独立。
 */
import { renderChartBlock, renderDataTable } from 'base-paint/blocks';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { DB_FILENAME } from '../paths.js';
import type { ReportPlate } from './reportPlate.js';

export const DOC_VERSION = '0.1.0' as const;
export const DOC_SKILL = 'calorie' as const;

export function fmt(v: number | null | undefined, unit = ''): string {
  if (v === null || v === undefined) return '—';
  return String(v) + unit;
}

export function fmtInt(v: number | null | undefined, unit = ''): string {
  if (v === null || v === undefined) return '—';
  return String(Math.round(v)) + unit;
}

/** 逐日点 → 折线（`label` 带月日；`value` 缺即断点，不补 0）；全空走表格空态。 */
export function lineOf(
  points: readonly { readonly date: string; readonly value: number | null }[],
  title: string,
  opts: { readonly format?: (v: number) => string; readonly target?: number | null } = {},
): string {
  const items = points.map((p) => ({ label: p.date.slice(5), value: p.value }));
  const target = opts.target === null || opts.target === undefined ? null : opts.target;
  if (items.every((i) => i.value === null)) {
    return renderDataTable({
      columns: [{ key: 'note', label: '说明' }],
      rows: [{ note: '这段时间还没有可画的数据' }],
      caption: title,
    });
  }
  const values = items.map((i) => i.value).filter((v): v is number => v !== null);
  const lo = Math.min(...values, ...(target === null ? [] : [target]));
  const hi = Math.max(...values, ...(target === null ? [] : [target]));
  const pad = Math.max((hi - lo) * 0.12, hi === lo ? Math.max(Math.abs(hi) * 0.05, 1) : 0);
  return renderChartBlock({
    kind: 'line',
    title,
    input: {
      items,
      options: {
        yTicks: 3,
        labels: 'select',
        yMin: Math.max(0, Math.floor(lo - pad)),
        yMax: Math.ceil(hi + pad),
        connectNulls: true,
        highlightLast: true,
        ...(opts.format === undefined ? {} : { format: opts.format }),
        ...(target === null ? {} : { markLine: { value: target, label: '目标' } }),
      },
    },
  });
}

/** 逐日明细表（日期 ＋ 一列数值 ＋ 可选附加列）：表题与单位由形态给。 */
export function tableOf(
  points: readonly { readonly date: string; readonly value: number | null }[],
  valueLabel: string,
  caption: string,
  extra?: readonly { readonly label: string; readonly values: readonly (string | number | null)[] }[],
): string {
  const columns = [
    { key: 'date', label: '日期' },
    { key: 'value', label: valueLabel, align: 'right' as const },
    ...(extra ?? []).map((e) => ({ key: e.label, label: e.label, align: 'right' as const })),
  ];
  const rows = points.map((p, i) => {
    const row: Record<string, string | number | null> = { date: p.date, value: p.value === null ? null : p.value };
    for (const e of extra ?? []) row[e.label] = e.values[i] ?? null;
    return row;
  });
  return renderDataTable({ columns, rows, caption, emptyText: '这段时间还没有逐日记录' });
}

/** 键值两列表（口径说明／计算假设／分项表共用一份，不各写一遍）。 */
export function kvTable(caption: string, rows: readonly { readonly k: string; readonly v: string | number | null }[]): string {
  return renderDataTable({
    columns: [{ key: 'k', label: caption.replace(/（.*$/, '') }, { key: 'v', label: '取值' }],
    rows: rows.map((r) => ({ k: r.k, v: r.v })),
    caption,
  });
}

/** 页脚：数据三格式 ＋ 日志两格式（既有 actionBar 能力；本图不新增场景按钮契约）。 */
export function footerOf(plate: ReportPlate, kindLabel: string): string {
  const envelope = {
    version: DOC_VERSION,
    skill: DOC_SKILL,
    shape: 'stat' as const,
    key: 'calorie.report.' + plate.base.kind,
    data: {
      metrics: {
        days: plate.base.days,
      },
    },
  };
  return copyArea({
    data: { envelope },
    log: {
      envelope,
      copyLog: copyLog({
        command: 'calorie-cmd-read calorie.report.' + plate.base.kind,
        source: DB_FILENAME + ' ｜ 报告子形态 ' + kindLabel,
        actionAt: plate.base.end,
        version: DOC_VERSION,
      }),
    },
  });
}

/** 命令回执行（页面底部一行小字，用户可照抄重跑；不进 actionBar 契约）。 */
export function commandNote(command: string): string {
  if (command === '') return '';
  return renderDataTable({
    columns: [{ key: 'cmd', label: '重跑这条报告' }],
    rows: [{ cmd: command }],
    caption: '命令',
  });
}

/** 眉标一行（左：区间与天数）——照 B 线老 A 壳 `meta-bar`。 */
export function metaLeftOf(plate: ReportPlate): string {
  return plate.base.start + ' ~ ' + plate.base.end + ' · 共 ' + plate.base.days + ' 天';
}
