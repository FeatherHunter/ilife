/** #353 · 身体域文档装配（体成分看／围度看两页）：
 * 自 `render/sportDocs.ts` **原样迁入**能力目录 `src/body/`（归属律：只属身体的东西住身体目录）。
 * 本层不做取数（数据由 `body/bodyPlate.ts` 备齐），不返空（缺失由数据层抛 missing-data）。
 * 包裹约定沿 sportDocs：内容 = base-paint/blocks 区块；文档 = fillTemplate 包裹；
 * sharedCss = buildStyleSheet().css + blocksCss()，不走 extraCss。
 */
import {
  renderChartBlock,
  renderDataTable,
  renderEmptyBlock,
  renderKpiGrid,
  renderParamForm,
} from 'base-paint/blocks';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { dataCopyArea } from '../shared/copyArea.js';
import type {
  BodyCompositionView,
  BodyMeasureView,
} from './bodyPlate.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本文件各页共用的 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。 */
const DOC_TITLE = '卡路里·运动身体';

/* ── 体成分（body_composition_view.html 对照：来源筛选＋趋势＋记录表＋复制） ── */

export function buildBodyCompositionDoc(v: BodyCompositionView): string {
  const parts: string[] = [
    renderParamForm({
      fields: [{ name: 'source', label: '来源', value: v.source ?? '' }],
      description: '按来源筛选体成分（空=全部；趋势默认最近来源；对比两期归组合分析）',
    }),
    renderKpiGrid([
      { label: '体成分看', value: v.source ?? '全部来源', detail: '共 ' + v.total + ' 条' },
      { label: '最新体脂', value: v.latestPct === null ? '—' : String(v.latestPct) + '%' },
      { label: '趋势点', value: String(v.trend.length), unit: '天' },
    ]),
  ];
  let charts = false;
  if (v.trend.length > 0) {
    parts.push(renderChartBlock({
      kind: 'line',
      title: '体脂趋势',
      input: { items: v.trend.map((t) => ({ label: t.date.slice(5), value: t.avgPct })) },
    }));
    charts = true;
  }
  const rows = v.items.map((r) => {
    const d = r as { date?: unknown; body_fat_pct?: unknown; source?: unknown; note?: unknown };
    return {
      date: typeof d.date === 'string' ? d.date : '',
      pct: typeof d.body_fat_pct === 'number' ? d.body_fat_pct : '',
      source: typeof d.source === 'string' ? d.source : '',
      note: typeof d.note === 'string' ? d.note : '',
    };
  });
  parts.push(renderDataTable({
    columns: [
      { key: 'date', label: '日期' },
      { key: 'pct', label: '体脂', align: 'right' },
      { key: 'source', label: '来源' },
      { key: 'note', label: '备注' },
    ],
    rows,
    caption: '体成分记录（共 ' + v.total + ' 条）',
    emptyText: '无体成分记录',
  }));
  // #359 · 7 点皮褶回显：最近一条有皮褶数据的记录，7 个槽位逐点成行（部位 ↔ 值 一一对上，不看合计）。
  // 值取库内原始 mm（`bodyPlate` 已备齐），本层不换算、不四舍五入；缺槽位如实写「—」。
  const echo = v.calipers;
  if (echo) {
    parts.push(renderDataTable({
      columns: [
        { key: 'site', label: '部位' },
        { key: 'mm', label: '皮褶(mm)', align: 'right' },
        { key: 'date', label: '日期' },
      ],
      rows: echo.sites.map((s) => ({ site: s.label, mm: s.mm === null ? '—' : s.mm, date: echo.date })),
      caption: '皮褶 7 点原始值（' + echo.date + ' · 单位 mm · 共 ' + echo.sites.length + ' 点）',
      emptyText: '该记录无皮褶 7 点数据',
    }));
  }
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: 'calorie.view.body-composition',
      data: { items: rows, total: v.total },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '体成分看',
    eyebrow: 'calorie.view.body-composition · 运动身体域',
    subtitle: null,
    content: parts.join(''),
    charts,
  });
}

/* ── 围度（body_measurements_view.html 对照：项目筛选＋趋势＋记录表＋复制，13 项） ── */

const MEASURE_ZH: Record<string, string> = {
  chest_cm: '胸围', waist_cm: '腰围', abdomen_cm: '腹围', hip_cm: '臀围',
  left_thigh_cm: '左大腿', right_thigh_cm: '右大腿', left_calf_cm: '左小腿', right_calf_cm: '右小腿',
  left_arm_cm: '左上臂', right_arm_cm: '右上臂', left_forearm_cm: '左前臂', right_forearm_cm: '右前臂',
  shoulder_cm: '肩宽',
};

export function buildBodyMeasureDoc(v: BodyMeasureView): string {
  // #360 · 趋势部位：带部位用所传部位，不带部位用自动挑的最近有数据部位（`autoMetric`）；
  // 全量表分支（`metric` 为空）照旧渲染未过滤列表（归 #361，本票不动表结构，只修缺值格）。
  const trendMetric = v.metric ?? v.autoMetric;
  const trendZh = trendMetric ? (MEASURE_ZH[trendMetric] ?? trendMetric) : '';
  const cm = (n: number | null): string => (n === null ? '—' : String(n) + 'cm');
  // 趋势点 0（样本不足）时写「—」不带单位（照老 `:491／:496／:507` 全落「—」）。
  const trendPointCard = v.kpi.count === 0
    ? { label: '趋势点', value: '—', detail: trendZh }
    : { label: '趋势点', value: String(v.kpi.count), unit: '天', detail: trendZh };
  const parts: string[] = [
    renderParamForm({
      fields: [{ name: 'metric', label: '围度项', value: v.metric ?? '' }],
      description: '13 围度项按名筛选（空=全部并自动挑最近有数据部位出趋势；两期对比归组合分析）',
    }),
    renderKpiGrid([
      { label: '围度看', value: v.metric ? (MEASURE_ZH[v.metric] ?? v.metric) : '全部围度', detail: '共 ' + v.total + ' 条' },
      { label: '最新', value: v.latestVal === null ? '—' : String(v.latestVal) + 'cm', detail: trendZh },
      trendPointCard,
      { label: '均值', value: cm(v.kpi.avg), detail: trendZh },
      { label: '最小', value: cm(v.kpi.min), detail: trendZh },
      { label: '最大', value: cm(v.kpi.max), detail: trendZh },
      { label: '变化量', value: v.kpi.delta === null ? '—' : (v.kpi.delta >= 0 ? '+' : '') + v.kpi.delta + 'cm', detail: trendZh },
    ]),
  ];
  let charts = false;
  if (trendMetric && v.trend.length > 0) {
    parts.push(renderChartBlock({
      kind: 'line',
      title: trendZh + '趋势',
      input: { items: v.trend.map((t) => ({ label: t.date.slice(5), value: t.avgVal })) },
    }));
    charts = true;
  } else if (trendMetric) {
    // #360 · 样本不足兜底：图区空态句（仍注部位，照老 `body_measurements_view.html:504` 文案），
    // KPI 四格已是「—」（`cm(null)`／`delta null`／点数 0→「—」，照老 `:491／:496／:507`）。
    parts.push(renderEmptyBlock({ title: trendZh + '趋势', text: '该部位暂无趋势数据' }));
  }
  if (v.metric) {
    const mkey = v.metric;
    parts.push(renderDataTable({
      columns: [
        { key: 'date', label: '日期' },
        { key: 'val', label: (MEASURE_ZH[mkey] ?? mkey) + '(cm)', align: 'right' },
        { key: 'note', label: '备注' },
      ],
      rows: v.items.map((r) => {
        const val = r[mkey];
        return {
          date: typeof r['date'] === 'string' ? (r['date'] as string) : '',
          // #360 · 裁定 2 表体：缺值格可见「—」（老 `:385`），不再留空串（空串会与备注空格连成连续空单元）。
          val: typeof val === 'number' ? val : '—',
          note: typeof r['note'] === 'string' ? (r['note'] as string) : '',
        };
      }),
      caption: (MEASURE_ZH[mkey] ?? mkey) + '记录（共 ' + v.total + ' 条）',
      emptyText: '该项目无记录',
    }));
  } else {
    // #360 · 裁定 2 表体：数值缺值格一律「—」（老 `:385`）；备注沿旧口径（空串仍空，不新增语义，归 #361）。
    const numOrDash = (x: unknown): number | string => (typeof x === 'number' ? x : '—');
    const strOrEmpty = (x: unknown): string => (typeof x === 'string' ? x : '');
    parts.push(renderDataTable({
      columns: [
        { key: 'date', label: '日期' },
        { key: 'chest', label: '胸', align: 'right' },
        { key: 'waist', label: '腰', align: 'right' },
        { key: 'abdomen', label: '腹', align: 'right' },
        { key: 'hip', label: '臀', align: 'right' },
        { key: 'note', label: '备注' },
      ],
      rows: v.items.map((r) => ({
        date: strOrEmpty(r['date']), chest: numOrDash(r['chest_cm']), waist: numOrDash(r['waist_cm']),
        abdomen: numOrDash(r['abdomen_cm']), hip: numOrDash(r['hip_cm']), note: strOrEmpty(r['note']),
      })),
      caption: '围度记录（共 ' + v.total + ' 条；全量 13 项见复制数据）',
      emptyText: '无围度记录',
    }));
  }
  const rows = v.items.map((r) => ({ ...r }));
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: 'calorie.view.body-measure',
      data: { items: rows, total: v.total },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '围度看',
    eyebrow: 'calorie.view.body-measure · 运动身体域',
    subtitle: null,
    content: parts.join(''),
    charts,
  });
}
