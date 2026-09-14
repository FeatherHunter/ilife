/** #353 · 身体域文档装配（体成分看／围度看两页）：
 * 自 `render/sportDocs.ts` **原样迁入**能力目录 `src/body/`（归属律：只属身体的东西住身体目录）。
 * 本层不做取数（数据由 `body/bodyPlate.ts` 备齐），不返空（缺失由数据层抛 missing-data）。
 * 包裹约定沿 sportDocs：内容 = base-paint/blocks 区块；文档 = fillTemplate 包裹；
 * sharedCss = buildStyleSheet().css + blocksCss()，不走 extraCss。
 */
import { escapeHtml } from 'base-paint';
import {
  renderChartBlock,
  renderDataTable,
  renderEmptyBlock,
  renderKpiGrid,
  renderListRows,
  renderParamForm,
} from 'base-paint/blocks';
import { MEASUREMENT_FIELDS, MEASUREMENT_ZH } from '../fetch/body.js';
import { SOURCE_LABELS } from '../kcal.js';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { dataCopyArea } from '../shared/copyArea.js';
import { compositionWindowLabel } from './bodyPlate.js';
import type {
  BodyCompositionView,
  BodyMeasureView,
} from './bodyPlate.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本文件各页共用的 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。 */
const DOC_TITLE = '卡路里·运动身体';

/* ── 体成分（body_composition_view.html 对照：锚点大数字＋来源面＋趋势＋记录表＋复制） ── */

/** 序 5（老正本 `:141`）：`source=all` 时必出的「来源不可直接对比」提示句——只提示，不拦截。 */
const SOURCE_TIP = '来源不可直接对比：皮褶钳（家测）与健身房 InBody／医院设备口径不同，趋势请在单一来源内看。';

/** 来源中文名：唯一定义地是 `kcal.ts` 的 `SOURCE_LABELS`（老正本 `:332`／`:366` 同口径），本层不自持名表。 */
function srcZh(source: string | null): string {
  return source === null ? '' : ((SOURCE_LABELS as Record<string, string>)[source] ?? source);
}

/** 图的点（`renderChartBlock` 的 `value` 只许 number）：非有限值不画也不计 ⇒ KPI「趋势点」与图**同源**。 */
function chartPoints(points: readonly { date: string; avgPct: number }[]): { label: string; value: number }[] {
  return points.filter((p) => typeof p.avgPct === 'number' && Number.isFinite(p.avgPct))
    .map((p) => ({ label: p.date.slice(5), value: p.avgPct }));
}

export function buildBodyCompositionDoc(v: BodyCompositionView): string {
  /** 窗口口径句（页面可见文本的唯一定义地，`#362` 判据认这一句；老正本 `:433` 也自报窗口）。 */
  const win = '窗口：' + compositionWindowLabel(v.window);
  const grouped = v.sourceCount > 0;
  const d = v.delta;
  // 序 8（老正本 `:339-340`／`:344`）：比较对象与间隔天数都写出来；无基线只写「暂无对比基线」。
  const deltaNote = d === null
    ? '首条记录，暂无对比基线'
    : '距上次测量 ' + d.gapDays + ' 天（' + d.prevDate + '）· 体脂率 '
      + (d.diffPct > 0 ? '上升' : d.diffPct < 0 ? '下降' : '持平') + ' ' + Math.abs(d.diffPct) + '%'
      + (d.prevSource !== null && d.prevSource !== (v.anchor?.source ?? null) ? '（上次来源 ' + srcZh(d.prevSource) + '）' : '');
  const single = chartPoints(v.trend);
  const groups = v.sourceSeries.map((s) => ({ source: s.source, latest: s.latestDate, points: chartPoints(s.points) }));
  // KPI「趋势点」＝图上真正画出来的点数（分组态＝各来源点数之和）⇒ 不可能出现「有图＋趋势点 0 天」。
  const trendDays = grouped ? groups.reduce((n, g) => n + g.points.length, 0) : single.length;
  const parts: string[] = [
    renderParamForm({
      fields: [{ name: 'source', label: '来源', value: v.sourceParam ?? '' }],
      description: '按来源筛选体成分（不传＝不限来源，趋势按最近来源；all＝全部来源并按来源分组展示；对比两期归组合分析）· ' + win,
    }),
  ];
  if (grouped) parts.push(renderListRows({ items: [{ main: SOURCE_TIP }] }));
  const cards = [
    // 序 9（老正本 `:155` 锚点区）：首屏读数＝**最新一条**（`anchor`），不是窗口均值；徽标「最新」照老 `:333`。
    {
      label: '体成分看',
      value: grouped ? '全部来源' : (v.source === null ? '全部来源' : srcZh(v.source)),
      detail: '共 ' + v.total + ' 条 · ' + win,
    },
    {
      label: '最新体脂',
      value: v.anchor === null || v.anchor.pct === null ? '—' : String(v.anchor.pct) + '%',
      ...(v.anchor === null ? {} : { detail: v.anchor.date + (v.anchor.source === null ? '' : ' · ' + srcZh(v.anchor.source)) }),
      status: 'ok' as const,
      statusText: '最新',
    },
    { label: '距上次 Δ', value: d === null ? '—' : (d.diffPct > 0 ? '+' : '') + d.diffPct + '%', detail: deltaNote },
    {
      label: '趋势点',
      value: String(trendDays),
      unit: '天',
      detail: win + (grouped ? ' · ' + v.sourceCount + ' 组分别成线' : (v.source === null ? '' : ' · 来源 ' + srcZh(v.source))),
    },
  ];
  if (grouped) cards.push({ label: '来源分组', value: String(v.sourceCount), unit: '组', detail: win });
  parts.push(renderKpiGrid(cards));
  let charts = false;
  if (grouped) {
    // 裁定 5：来源之间**不合并**成一条线（数据层的 `sourceSeries` 已经分好），逐来源一图。
    parts.push(renderDataTable({
      columns: [{ key: 'source', label: '来源' }, { key: 'points', label: '点数', align: 'right' }, { key: 'latest', label: '最新日期' }],
      rows: groups.map((g) => ({ source: srcZh(g.source), points: g.points.length, latest: g.latest })),
      caption: '来源分组（' + v.sourceCount + ' 组 · ' + win + '）',
      emptyText: '窗口内无来源分组',
    }));
    for (const g of groups) {
      if (g.points.length === 0) continue;
      parts.push(renderChartBlock({ kind: 'line', title: '体脂趋势 · ' + srcZh(g.source) + '（' + win + '）', input: { items: g.points } }));
      charts = true;
    }
  } else if (single.length > 0) {
    parts.push(renderChartBlock({ kind: 'line', title: '体脂趋势（' + win + '）', input: { items: single } }));
    charts = true;
  }
  if (!charts) parts.push(renderEmptyBlock({ title: '体脂趋势', text: '窗口内暂无趋势点' }));
  // 裁定 2 · 可见文本：缺值一律「—」（老 `:342`／`:347-352`）；复制 payload（下 `items`）保留原始空值，两套口径不互染。
  const rows = v.items.map((r) => {
    const x = r as { date?: unknown; body_fat_pct?: unknown; source?: unknown; note?: unknown };
    return {
      date: typeof x.date === 'string' ? x.date : '—',
      pct: typeof x.body_fat_pct === 'number' ? String(x.body_fat_pct) + '%' : '—',
      source: typeof x.source === 'string' ? srcZh(x.source) : '—',
      note: typeof x.note === 'string' ? x.note : '',
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
    // `limit` 只截显示：窗口内还有多少条**写在标题里**（不静默截断）。
    caption: '体成分记录（' + win + ' · 共 ' + v.total + ' 条'
      + (v.windowTotal > v.total ? '，窗口内另有 ' + (v.windowTotal - v.total) + ' 条，本页只列最近 ' + v.total + ' 条' : '') + '）',
    emptyText: '无体成分记录 → 记体脂：皮褶钳或外部测量，第一条就是基线',
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
      // 裁定 2 · 复制数据＝**库内原始行原样透传**（含 7 个皮褶槽与 `null`），不写「—」、不四舍五入、不换名词。
      data: { items: v.items.map((r) => ({ ...r })), total: v.total },
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

/** #361 · 全量 13 项列序：直引 `fetch/body.ts` 的 `MEASUREMENT_FIELDS`
 *（与 `compare.ts` 同一来源；本文件不定序也不定中文名——中文名一律取 `fetch/body.ts` 的 `MEASUREMENT_ZH`，
 * #440 前本文件自持过一份 `MEASURE_ZH`，同源已收）。 */
const MEASURE_FIELDS: readonly string[] = MEASUREMENT_FIELDS;

/** #361 · 窄屏卡片样式（页内 CSS；`libraryDocs.ts` 的 `FOOD_CSS` 同形先例，不碰共用层）。
 * 口径照老 `body_measurements_view.html:128-151`：宽屏见表、窄屏（≤640px）见卡，
 * 卡片只列已填项（老 `:389-399`），全空行写「未填围度」（老 `:397`）。类名前缀 `msr-`，只作用于本页。 */
const MEASURE_CSS = [
  '<style>',
  '.msr-cards{display:none}',
  '.msr-card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin-bottom:10px}',
  '.msr-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}',
  '.msr-date{font-size:14px;font-weight:700}',
  '.msr-note{font-size:11px;color:var(--fg3);max-width:55%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
  '.msr-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 12px}',
  '.msr-item{display:flex;justify-content:space-between;font-size:12.5px;padding:4px 8px;background:var(--soft);border-radius:7px}',
  '.msr-k{color:var(--fg3)}',
  '.msr-v{font-weight:600;font-variant-numeric:tabular-nums}',
  '.msr-empty{color:var(--fg3);font-size:12px;padding:4px 0}',
  '@media (max-width:640px){.msr-table{display:none}.msr-cards{display:block}}',
  '</style>',
].join('\n');

/** #361 · 窄屏卡片（与宽表同一份 `v.items`：同行同序，只列已填项并注 `cm`；
 * 缺值在卡片上是「不出该项」（老 `:393-395` 的 `filter(c => r[c] != null)`），
 * 可见「—」只落在宽表缺值格（裁定 2 表体），两处不混。 */
function renderMeasureCards(items: readonly Record<string, unknown>[]): string {
  const cards = items.map((r) => {
    const date = typeof r['date'] === 'string' ? (r['date'] as string) : '';
    const note = typeof r['note'] === 'string' ? (r['note'] as string) : '';
    const cells = MEASURE_FIELDS
      .filter((f) => typeof r[f] === 'number')
      .map((f) => '<div class="msr-item"><span class="msr-k">'
        + escapeHtml(MEASUREMENT_ZH[f] ?? f) + '</span><span class="msr-v">'
        + escapeHtml(String(r[f])) + 'cm</span></div>')
      .join('');
    return '<div class="msr-card"><div class="msr-head"><span class="msr-date">'
      + escapeHtml(date) + '</span>'
      + (note === '' ? '' : '<span class="msr-note">' + escapeHtml(note) + '</span>')
      + '</div><div class="msr-grid">'
      + (cells === '' ? '<div class="msr-empty">未填围度</div>' : cells)
      + '</div></div>';
  }).join('');
  return '<div class="msr-cards">' + cards + '</div>';
}

export function buildBodyMeasureDoc(v: BodyMeasureView): string {
  // #360 · 趋势部位：带部位用所传部位，不带部位用自动挑的最近有数据部位（`autoMetric`）；
  // #361 · 全量表分支（`metric` 为空）：未过滤列表印全量 13 项（宽表＋窄屏卡同源），趋势闸门与 KPI 逻辑保持 #360 原样。
  const trendMetric = v.metric ?? v.autoMetric;
  const trendZh = trendMetric ? (MEASUREMENT_ZH[trendMetric] ?? trendMetric) : '';
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
      { label: '围度看', value: v.metric ? (MEASUREMENT_ZH[v.metric] ?? v.metric) : '全部围度', detail: '共 ' + v.total + ' 条' },
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
        { key: 'val', label: (MEASUREMENT_ZH[mkey] ?? mkey) + '(cm)', align: 'right' },
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
      caption: (MEASUREMENT_ZH[mkey] ?? mkey) + '记录（共 ' + v.total + ' 条）',
      emptyText: '该项目无记录',
    }));
  } else {
    // #361 · 全量 13 项：列序直引 `MEASURE_FIELDS`（即 `fetch/body.ts` 列序，无第二份定序）；
    // 数值缺值格一律「—」（老 `:385`，#360 口径沿用）；备注沿旧口径（空串仍空）。
    // 复制 payload 行（下 `rows`）保持原样透传，不写「—」（裁定 2）。
    const numOrDash = (x: unknown): number | string => (typeof x === 'number' ? x : '—');
    const strOrEmpty = (x: unknown): string => (typeof x === 'string' ? x : '');
    const fullTable = renderDataTable({
      columns: [
        { key: 'date', label: '日期' },
        ...MEASURE_FIELDS.map((f) => ({ key: f, label: MEASUREMENT_ZH[f] ?? f, align: 'right' as const })),
        { key: 'note', label: '备注' },
      ],
      rows: v.items.map((r) => {
        const row: Record<string, unknown> = { date: strOrEmpty(r['date']), note: strOrEmpty(r['note']) };
        for (const f of MEASURE_FIELDS) row[f] = numOrDash(r[f]);
        return row;
      }),
      caption: '围度记录（共 ' + v.total + ' 条 · 13 项全量 · 单位 cm）',
      emptyText: '无围度记录',
    });
    // #361 · 宽屏表＋窄屏卡：同一份 `v.items`（老 `:389-399` 同源口径），CSS 按 640px 切换显隐。
    parts.push(MEASURE_CSS + '<div class="msr-table">' + fullTable + '</div>' + renderMeasureCards(v.items));
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
