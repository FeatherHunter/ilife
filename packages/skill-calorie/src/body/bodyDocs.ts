/** #353 · 身体域文档装配（体成分看／围度看两页）：
 * 自 `render/sportDocs.ts` **原样迁入**能力目录 `src/body/`（归属律：只属身体的东西住身体目录）。
 * 本层不做取数（数据由 `body/bodyPlate.ts` 备齐），不返空（缺失由数据层抛 missing-data）。
 * 包裹约定沿 sportDocs：内容 = base-paint/blocks 区块；文档 = fillTemplate 包裹；
 * sharedCss = buildStyleSheet().css + blocksCss()，不走 extraCss。
 *
 * **#535（2026-09-15）· 读侧族四页重排**：页头改读者看得懂的名字（`<title>` 与眉标不再印命令键与
 * 「运动身体」这类内部叫法）；页内形状另立 `body/bodyReadUi.ts`（窗口条／窄屏长表收束）；
 * 本件只留「哪一条事实住在哪一个形状里」。装配点一律接上 `pageUi: true`（共享的手机端配方）。
 *
 * 三条**不可动**的判据（同批测试钉死，改文案时逐条对）：
 *  - `#362`：窗口口径句原样出现（`窗口：全部历史` 等，且只在窗口条里出一次）；
 *    可见文本里 `共 N 条` 至少两处且彼此相等；记录表题含「体成分记录」并按需写「窗口内另有 M 条」；
 *    皮褶表题含「皮褶 7 点原始值」且 7 行逐点成行（缺槽位 `—`）；读数卡
 *    `最新体脂`／`距上次 Δ`／`趋势点`／`来源分组` 的标签与注文各自钉住若干事实。
 *  - `#361`：围度全量表题含「围度记录」、13 项列序与末列 `备注` 不动，窄屏卡（`.msr-card`）结构不动。
 *  - `#398`：`source=all` 时必出「来源不可直接对比」提示句与「来源分组」卡／表。
 */
import { escapeHtml } from 'base-paint';
import {
  renderCaliberLine,
  renderChartBlock,
  renderDataTable,
  renderEmptyBlock,
  renderKpiGrid,
  renderListRows,
  renderParamForm,
  renderTocBlock,
} from 'base-paint/blocks';
// `base-paint` 的子路径只导出 `.`／`./blocks`／`./help-shell`／`./save-html`；
// 页面级形状（事实条／图片容器／时间轴条）走索引进（`base-render/src/index.ts` 转出 `pageShapes.ts`）。
import { renderFactStrip } from 'base-paint';
import { MEASUREMENT_ZH } from '../fetch/body.js';
import { SOURCE_LABELS } from '../kcal.js';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { dataCopyArea } from '../shared/copyArea.js';
import { bodyReadUiCss, caliperSection, measureFullTable, measureUiCss, recordsSection, scrollHint, windowBar } from './bodyReadUi.js';
import { compositionWindowLabel } from './bodyPlate.js';
import type {
  BodyCompositionView,
  BodyMeasureView,
} from './bodyPlate.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 读侧四页的 `<title>`（编排者 2026-09-15 裁定：空格分隔、不带任何符号，同场景 09 交付页先例）。
 *  四页同值：页与页的区分靠页内主标题（`title`），不靠页签。 */
const DOC_TITLE = '卡路里 身体细节';

/** 页头眉标：读者看得懂的分区名（HELP 一级分组名），不再印 `calorie.view.*` 命令键。 */
const DOC_EYEBROW = '身体细节';

/* ── 体成分（body_composition_view.html 对照：锚点大数字＋来源面＋趋势＋记录表＋复制） ── */

/** 序 5（老正本 `:141`）：`source=all` 时必出的「来源不可直接对比」提示句——只提示，不拦截。
 *  `#362` 判据按「来源不可直接对比」六字认这一句，措辞可调、这六个字不动。 */
const SOURCE_TIP = '来源不可直接对比：皮褶钳（家测）与健身房 InBody／医院设备口径不同，趋势请在单一来源内看。';

/** 来源中文名：唯一定义地是 `kcal.ts` 的 `SOURCE_LABELS`（老正本 `:332`／`:366` 同口径），本层不自持名表。 */
function srcZh(source: string | null): string {
  return source === null ? '' : ((SOURCE_LABELS as Record<string, string>)[source] ?? source);
}

/** 图的点（`renderChartBlock` 的 `value` 只许 number）：非有限值不画也不计 ⇒ 读数卡「趋势点」与图**同源**。 */
function chartPoints(points: readonly { date: string; avgPct: number }[]): { label: string; value: number }[] {
  return points.filter((p) => typeof p.avgPct === 'number' && Number.isFinite(p.avgPct))
    .map((p) => ({ label: p.date.slice(5), value: p.avgPct }));
}

export function buildBodyCompositionDoc(v: BodyCompositionView): string {
  /** 窗口口径句（页面可见文本的唯一定义地，`#362` 判据认这一句）：**只在窗口条里出一次**——
   *  改前它在读数卡明细／表题／图题里各说一遍。 */
  const win = compositionWindowLabel(v.window);
  /** 走势视角＝窗口按天数点名（唤醒词「看体脂趋势」）；记录视角＝全部历史或自定区间。
   *  两页共用同一个构建函数，靠窗口种类换主次：走势页先图后表，记录页先表后图。 */
  const byTrend = v.window.kind === 'days';
  const grouped = v.sourceCount > 0;
  const d = v.delta;
  const single = chartPoints(v.trend);
  const groups = v.sourceSeries.map((s) => ({ source: s.source, latest: s.latestDate, points: chartPoints(s.points) }));
  // 读数卡「趋势点」＝图上真正画出来的点数（分组态＝各来源点数之和）⇒ 不可能出现「有图 ＋ 趋势点 0 个」。
  const trendDays = grouped ? groups.reduce((n, g) => n + g.points.length, 0) : single.length;

  /* ── 读数卡：值槽一律放数（来源名只当明细或徽标）── */
  const anchor = v.anchor;
  const anchorDetail = anchor === null ? undefined
    : anchor.date + (anchor.source === null ? '' : '（' + srcZh(anchor.source) + '）');
  // Δ 卡：原先是「距上次测量 1 天（…）· 体脂率 下降 0.5%」这一条 `·` 串——拆成人话一句；
  // 卡片槽吃纯文本（形状落不进来），上一次的来源因此另出一条卡外事实条（见下面 renderFactStrip）。
  const dirWord = d === null || d.diffPct === 0 ? '' : (d.diffPct > 0 ? '上升' : '下降');
  const deltaCard = {
    label: '距上次 Δ',
    value: d === null ? '—' : (d.diffPct > 0 ? '+' : '') + d.diffPct + '%',
    detail: d === null
      ? '首条记录，暂无对比基线'
      : '距上次测量 ' + d.gapDays + ' 天（' + d.prevDate + '），这次' + (dirWord === '' ? '持平' : dirWord),
  };
  const cards = [
    // 序 9（老正本 `:155` 锚点区）：首屏读数＝**最新一条**（`anchor`），不是窗口均值；徽标「最新」照老 `:333`。
    {
      label: '最新体脂',
      value: anchor === null || anchor.pct === null ? '—' : String(anchor.pct) + '%',
      ...(anchorDetail === undefined ? {} : { detail: anchorDetail }),
      status: 'ok' as const,
      statusText: '最新',
    },
    deltaCard,
    { label: '趋势点', value: String(trendDays), unit: '个', detail: '图上画出来的点，一个点是一次测量那天的读数' },
  ];
  if (grouped) cards.push({ label: '来源分组', value: String(v.sourceCount), unit: '组', detail: '每个来源各成一条线，不混着算' });
  const parts: string[] = [bodyReadUiCss(), windowBar(win), renderKpiGrid(cards)];
  if (d !== null && d.prevSource !== null && d.prevSource !== (anchor?.source ?? null)) {
    parts.push(renderFactStrip({ items: [{ label: '上次测量来自', value: srcZh(d.prevSource) }] }));
  }
  if (grouped) parts.push(renderListRows({ items: [{ main: SOURCE_TIP }] }));

  /* ── 走势块：分组态逐来源一图（裁定 5：不合并成一条混源线）── */
  const trendParts: string[] = [];
  let charts = false;
  if (grouped) {
    for (const g of groups) {
      if (g.points.length === 0) continue;
      // 分组图题自报窗口：`#362` 判据逐张图认这句话（**分组态独有**；缺省单源路径上不再重复窗口）。
      trendParts.push(renderChartBlock({
        kind: 'line',
        title: srcZh(g.source) + '的体脂趋势（窗口：' + win + '）',
        input: { items: g.points },
      }));
      charts = true;
    }
    trendParts.push(renderDataTable({
      columns: [
        { key: 'source', label: '来源' },
        { key: 'points', label: '走势点', align: 'right' },
        { key: 'latest', label: '最新一天' },
      ],
      rows: groups.map((g) => ({ source: srcZh(g.source), points: g.points.length, latest: g.latest })),
      caption: '来源分组（' + v.sourceCount + ' 组，各自成线）',
      emptyText: '这个窗口里没有可分开的来源',
    }));
  } else if (single.length > 0) {
    trendParts.push(renderChartBlock({ kind: 'line', title: '体脂趋势', input: { items: single } }));
    charts = true;
  }
  if (!charts) {
    trendParts.push(renderEmptyBlock({ title: '体脂趋势', text: '这个窗口里还没有能连成走势的读数。' }));
  } else {
    // 图没有纵轴刻度（共享图表件不给刻度文本）⇒ 量级由卡外事实条给（最低／最高取自图上同一批点）。
    const plotted = (grouped ? groups.flatMap((g) => g.points) : single).map((p) => p.value);
    trendParts.push(renderFactStrip({ items: [
      { label: '窗口内最低', value: Math.min(...plotted) + '%' },
      { label: '窗口内最高', value: Math.max(...plotted) + '%' },
    ] }));
  }
  // 图上每个点是什么、以及这条走势用的是窗口内哪一批记录（本页第二处、也是最后一处「共 N 条」读数：
  // 另一处在记录表题里；改前这两处还外加窗口条上一枚同样的胶囊，编排者已按「同数留一处」删掉）。
  trendParts.push(renderCaliberLine('图上每个点是一次测量那天的读数｜窗口内共 ' + v.windowTotal + ' 条记录'));

  /* ── 记录清单：表题报本页行数（`#362` 判据按「共 N 条」认读数，窗口那件事不在这句里重复）── */
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
  const truncated = v.windowTotal > v.total;
  // `limit` 只截显示：窗口内还有多少条**写在表题里**（不静默截断）。
  const recordsBlock = recordsSection(rows, '体成分记录（共 ' + v.total + ' 条'
    + (truncated ? '，本页只列最近 ' + v.total + ' 条，窗口内另有 ' + (v.windowTotal - v.total) + ' 条未列' : '')
    + '）', '还没有体脂记录。用「记体脂（皮褶钳）」或别处量到的数记一条，第一条就是基线。');

  /* ── #359 · 7 点皮褶回显：最近一条有皮褶数据的记录，7 个槽位逐点成行（部位 ↔ 值 一一对上，不看合计）。
     值取库内原始 mm（`bodyPlate` 已备齐），本层不换算、不四舍五入；缺槽位如实写「—」。
     #535：日期与单位原先逐行各印一遍（7 行同一天），收进表题一处；列从 3 列收成 2 列。 ── */
  const echo = v.calipers;
  const caliperBlock = echo === null ? '' : caliperSection(echo.date, echo.sites);

  /** 页内定位（长页）：锚点吃 `pageUi` 给的 `scroll-margin-top: 20px`；顺序跟着主次走。 */
  const toc: { id: string; text: string }[] = byTrend
    ? [{ id: 'trend', text: '体脂走势' }, { id: 'records', text: '记录清单' }]
    : [{ id: 'records', text: '记录清单' }, { id: 'trend', text: '体脂走势' }];
  if (caliperBlock !== '') toc.push({ id: 'calipers', text: '七点皮褶' });
  parts.push(renderTocBlock({ items: toc }));
  const trendSection = '<section id="trend">' + trendParts.join('') + '</section>';
  parts.push(...(byTrend ? [trendSection, recordsBlock] : [recordsBlock, trendSection]));
  parts.push(caliperBlock);

  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: 'calorie.view.body-composition',
      // 裁定 2 · 复制数据＝**库内原始行原样透传**（含 7 个皮褶槽与 `null`），不写「—」、不四舍五入、不换名词。
      data: { items: v.items.map((r) => ({ ...r })), total: v.total },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: byTrend ? '体脂趋势' : '体脂记录',
    eyebrow: DOC_EYEBROW,
    subtitle: byTrend
      ? '体脂率随时间的走势，一个点是一次测量。'
      : '每次测到的体脂率按日期倒序列出，最新一条在最上面。',
    content: parts.join(''),
    charts,
    pageUi: true,
  });
}

/* ── 围度（body_measurements_view.html 对照：项目筛选＋趋势＋记录表＋复制，13 项） ── */

export function buildBodyMeasureDoc(v: BodyMeasureView): string {
  // #360 · 趋势部位：带部位用所传部位，不带部位用自动挑的最近有数据部位（`autoMetric`）；
  // #361 · 全量表分支（`metric` 为空）：未过滤列表印全量 13 项（宽表＋窄屏卡同源，形状住 `bodyReadUi`）。
  const trendMetric = v.metric ?? v.autoMetric;
  const trendZh = trendMetric ? (MEASUREMENT_ZH[trendMetric] ?? trendMetric) : '';
  /** #534 波次裁定的两位（编排者已把 `windowLabel` 补进取数层）：`windowGiven` 为真＝唤醒词
   *  「看围度趋势」显式点了窗口 ⇒ 这一页以走势为主（走势在前、记录在后）；为假＝「看围度」走的
   *  缺省窗口 ⇒ 以全量记录为主（记录在前、走势在后）。页名与副标题跟着这一位走。 */
  const byTrend = v.windowGiven;
  const cm = (n: number | null): string => (n === null ? '—' : String(n) + 'cm');
  // 趋势点 0（样本不足）时写「—」不带单位（照老 `:491／:496／:507` 全落「—」）。
  // 注文说清这一格数的是什么：图上画出来的点，不是跨了多少天（编排者 2026-09-15 复核口径）。
  const trendPointCard = v.kpi.count === 0
    ? { label: '趋势点', value: '—', detail: trendZh }
    : { label: '趋势点', value: String(v.kpi.count), unit: '天', detail: '图上画出来的点，一个点是一次测量那天' };
  const parts: string[] = [bodyReadUiCss(), measureUiCss()];
  // 窗口条（与体成分两页同形）：窗口只说一次；条数是本页唯一一处「共 N 条」读数（表题只留表名）。
  // 取数层若没给窗口文案（合成分支）则整条不出——不印半句「窗口：」。
  if (typeof v.windowLabel === 'string' && v.windowLabel !== '') parts.push(windowBar(v.windowLabel, '共 ' + v.total + ' 条'));
  // 读数卡：值槽一律放数（改前第一张卡的值是「全部围度」这类词）；部位名只在第一张卡当明细。
  parts.push(renderKpiGrid([
    { label: '最新', value: v.latestVal === null ? '—' : String(v.latestVal) + 'cm', detail: trendZh },
    trendPointCard,
    { label: '均值', value: cm(v.kpi.avg) },
    { label: '最小', value: cm(v.kpi.min) },
    { label: '最大', value: cm(v.kpi.max) },
    { label: '变化量', value: v.kpi.delta === null ? '—' : (v.kpi.delta >= 0 ? '+' : '') + v.kpi.delta + 'cm' },
  ]));
  /** 趋势块：一个部位一条线（图上每个点＝那天该项的均值，取数层已定，本层不重算）。 */
  const trendParts: string[] = [];
  let charts = false;
  if (trendMetric && v.trend.length > 0) {
    trendParts.push(renderChartBlock({
      kind: 'line',
      title: trendZh + '趋势',
      input: { items: v.trend.map((t) => ({ label: t.date.slice(5), value: t.avgVal })) },
    }));
    charts = true;
  } else if (trendMetric) {
    // #360 · 样本不足兜底：图区空态句（仍注部位，照老 `body_measurements_view.html:504` 文案），
    // KPI 四格已是「—」（`cm(null)`／`delta null`／点数 0→「—」，照老 `:491／:496／:507`）。
    trendParts.push(renderEmptyBlock({ title: trendZh + '趋势', text: '这个部位还没有可以连成趋势的记录。' }));
  }
  /** 记录块：带部位时只列那一项；不带的（全量表）印 13 项宽表＋窄屏卡。表题只留表名——窗口与条数
   *  已由上面那条窗口条说过一次（编排者 2026-09-15 口径：同一个数留一处）。 */
  const metric = v.metric;
  let recordsBlock: string;
  if (metric !== null) {
    const zh = MEASUREMENT_ZH[metric] ?? metric;
    recordsBlock = '<section id="records"><div class="bru-table">' + renderDataTable({
      columns: [
        { key: 'date', label: '日期' },
        { key: 'val', label: zh + '（厘米）', align: 'right' },
        { key: 'note', label: '备注' },
      ],
      rows: v.items.map((r) => {
        const val = r[metric];
        return {
          date: typeof r['date'] === 'string' ? (r['date'] as string) : '',
          // #360 · 裁定 2 表体：缺值格可见「—」（老 `:385`），不再留空串（空串会与备注空格连成连续空单元）。
          val: typeof val === 'number' ? val : '—',
          note: typeof r['note'] === 'string' ? (r['note'] as string) : '',
        };
      }),
      caption: zh + '记录',
      emptyText: '这个部位还没有记录',
    }) + '</div>' + scrollHint('表格较宽时，可以在表里左右滑。') + '</section>';
  } else {
    // #361 · 全量 13 项：列序直引 `fetch/body.ts`（无第二份定序）；数值缺值格一律「—」；
    // 复制 payload 行保持原样透传，不写「—」（裁定 2）。
    recordsBlock = '<section id="records">'
      + measureFullTable(v.items, byTrend ? '围度记录明细' : '围度记录', '还没有围度记录。用「记围度」记一条，第一条就是基线。')
      + renderCaliberLine('表里与卡上的数值单位都是 cm｜没量到的项写字面「—」') + '</section>';
  }
  /** 页内定位（长页）：顺序跟着主次走；没有走势块（样本不足或没有可比部位）时不出走势那颗胶囊。 */
  const toc: { id: string; text: string }[] = byTrend
    ? [{ id: 'trend', text: '围度趋势' }, { id: 'records', text: '记录明细' }]
    : [{ id: 'records', text: '全部记录' }, { id: 'trend', text: '围度趋势' }];
  parts.push(renderTocBlock({ items: toc }));
  const trendBlock = trendParts.length > 0 ? '<section id="trend">' + trendParts.join('') + '</section>' : '';
  parts.push(...(byTrend ? [trendBlock, recordsBlock] : [recordsBlock, trendBlock]));
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: 'calorie.view.body-measure',
      data: { items: v.items.map((r) => ({ ...r })), total: v.total },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: byTrend ? '围度趋势' : '围度记录',
    eyebrow: DOC_EYEBROW,
    subtitle: byTrend
      ? '同一部位的围度随时间的走势，一个点是一次测量。'
      : '每次量的围度按日期列出，一条一行。',
    content: parts.join(''),
    charts,
    pageUi: true,
  });
}
