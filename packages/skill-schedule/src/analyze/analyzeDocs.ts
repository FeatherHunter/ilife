/** #789 · 「分析与洞察」域的**页数据与页装配**（口径层）：三张页各自要什么。
 *
 *  为什么口径住这里、不住共用位：共用位不许出现任何一个能力的名字，而「七维是哪七个、日均按谁摊、
 *  基线取哪一段、二级分类怎么归」全是**本域的口径**——摆好再交给 `src/shared/` 的整页装配与
 *  本域的族级件（`./analyzeParts.ts`）。
 *
 *  **不重算别家口径**：一级分类映射调 `policy` 的 `l1Of`，健康分调 `policy` 的 `computeHealthScore`，
 *  红黄线的判定调 `policy` 的 `detectAnomalies`（阈值只此一处），时长格式化调 `fmtDur`／`fmtDurShort`，
 *  时间解析调 `toMinutes`；热力矩阵与配色调 `src/shared/pageParts.ts` 的现成件。
 *
 *  三张页（老侧家族 → 哪一条唤醒词）：
 *    · **作息对比**（老侧 f03）←「对比两个月」（`kind=months` 或 `kind=ranges`）：
 *      四卡对照 ＋ 7 维差异柱 ＋ AI 思考钩子；
 *    · **类别深挖**（老侧 f04）←「类别深挖」（`kind=category`）：
 *      24h × N 天热力图 ＋ 分类总览 ＋ 记录明细；
 *    · **异常检测**（老侧 f05）←「异常检测」（`kind=anomaly`）：
 *      红框与黄框的异常条目 ＋ 7 维雷达。
 *
 *  **载荷不动**：本票只把「真页 HTML」交回出口，三个 `data` 载荷（`buildRecordCompare`／
 *  `buildCategoryDeep`／`buildAnomaly`）逐字不变——那是机器读的那一份。页是给人读的那一份，
 *  按老侧家族的信息层级画（老侧逐块的名字与口径见 `docs/skills/skill-schedule/场景清单.json`
 *  的 `families[].blocks_old`）。
 *
 *  **页上文案纪律**：不出现命令键、库列名、参数名、英文裸词；并列关系一律用版面表达
 *  （卡片格／对照行／框），不拿 `、`／`·`／`｜`／`；`／`~` 这些符号顶替设计——范围一律写「至」，
 *  不用波浪号。需要一行里并列两件事时走公共层 `renderCaliberLine`（它按全角竖线拆成两段版面）。
 */
import {
  renderCaliberLine, renderConclusionBar, renderCopyBlock, renderDataTable, renderDistributionRows,
  renderKpiGrid, renderProseBlock,
  type DataTableRow, type KpiCardInput,
} from 'base-paint/blocks';
import {
  HEALTH_TARGETS, detectAnomalies,
  fmtDur, fmtDurShort, fmtPct, getEmojiPrefix, l1Of, parseCategory, toMinutes,
} from '../policy/index.js';
import { assembleDocPage, type PageHead } from '../shared/docPage.js';
import { categoryColor, hourCellsOf, renderHeatMatrix, type HeatRow } from '../shared/pageParts.js';
import type { ScheduleRecord } from '../fetch/db.js';
import {
  analyzePartsCss, renderAnomalyFrames, renderDiffBars, renderRadar, renderSectionTitle,
  type AnomalyFrameInput, type DiffBarInput,
} from './analyzeParts.js';

/** 页眉那一行域词（三张页同一句）。 */
const EYEBROW = '作息管家 分析与洞察';

/** 七个维度＝健康分那张表（老侧 `HEALTH_DIMS` 同一组：创作不参评）。 */
const DIMS: readonly string[] = Object.keys(HEALTH_TARGETS);

/** 基线段长度（老侧 `render_record_anomaly` 的 30 天，不新造）。 */
const BASELINE_DAYS = 30;

/** 热力图最多印多少行（再多只印最近这些天，与老侧区间页的上限同量级）。 */
const HEAT_ROWS_MAX = 31;

/** 一处「大变化」线：日均差超过这么久（老侧 `ai_questions_for_compare` 的 4h 是**总量**口径的线，
 *  本页把维度读数换成日均之后按同一量级重定：两小时／半小时／一小时）。 */
const BIG_CHANGE_MINUTES = 2 * 60;

const WEEKDAY = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/* ─────────────────────────── 小工具（日期与读数） ─────────────────────────── */

const pad2 = (n: number): string => String(n).padStart(2, '0');

const fmtDate = (d: Date): string => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());

/** `start` 至 `end` 逐日（含两端）；起止非法或倒置时给空数组，调用方按空态处理。 */
export function datesOf(start: string, end: string): string[] {
  const out: string[] = [];
  const d = new Date(start + 'T00:00:00');
  const last = new Date(end + 'T00:00:00');
  if (Number.isNaN(d.getTime()) || Number.isNaN(last.getTime()) || d.getTime() > last.getTime()) return out;
  while (d.getTime() <= last.getTime()) {
    out.push(fmtDate(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/** 某天往前推 `n` 天（`n` 取正数）。 */
export function shiftDays(date: string, n: number): string {
  const d = new Date(date + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return date;
  d.setDate(d.getDate() - n);
  return fmtDate(d);
}

/** 基线段的第一天：检测窗口结束日往前数满 30 天（与老侧「基线＝结束日往前 30 天」同一段）。 */
export function baselineStartOf(end: string): string {
  return shiftDays(end, BASELINE_DAYS - 1);
}

/** 逐维（一级分类）合计分钟。表外的分类进 `未知` 那一格（与 `l1Of` 同一落点）。 */
function byDim(records: readonly ScheduleRecord[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of records) {
    const dim = l1Of(r.category);
    out[dim] = (out[dim] ?? 0) + (r.duration_minutes ?? 0);
  }
  return out;
}

const totalOf = (dim: Record<string, number>): number => Object.values(dim).reduce((a, b) => a + b, 0);

/** 带正负号的短时长（卡片与柱子旁那一栏用；`+`／`-` 前置）。 */
function signedShort(mins: number): string {
  const n = Math.round(mins);
  if (n > 0) return '+' + fmtDurShort(n);
  if (n < 0) return '-' + fmtDurShort(-n);
  return '0分钟';
}

/** 带正负号的长时长（成句的地方用）。 */
function signedDur(mins: number): string {
  const n = Math.round(mins);
  if (n > 0) return '+' + fmtDur(n);
  if (n < 0) return '-' + fmtDur(-n);
  return '0分钟';
}

/** 带正负号的百分数（一位小数）。 */
function signedPct(pct: number): string {
  return (pct > 0 ? '+' : '') + String(pct) + '%';
}

function minutesOf(records: readonly ScheduleRecord[]): number {
  return records.reduce((a, r) => a + (r.duration_minutes ?? 0), 0);
}

/** 按天的时刻片段（热力矩阵那一件要的形状：当天的分钟数 + 一枚不透明键）。 */
function spansOf(records: readonly ScheduleRecord[], key: string): { start: number; end: number; key: string }[] {
  return records.map((r) => ({ start: toMinutes(r.time_start), end: toMinutes(r.time_end), key }));
}

/** 时段写法（页上只用「至」，不用波浪号）。 */
const spanText = (r: ScheduleRecord): string => r.time_start + ' 至 ' + r.time_end;

/* ─────────────────────────── ① 作息对比（老侧 f03） ─────────────────────────── */

/** 一行差异（柱子那一件要的读数 + 成句要用的长写法与原始差）。 */
interface CompareRow extends DiffBarInput {
  readonly deltaMinutes: number;
  readonly aLong: string;
  readonly bLong: string;
}

export interface ComparePageInput {
  readonly labelA: string;
  readonly startA: string;
  readonly endA: string;
  readonly labelB: string;
  readonly startB: string;
  readonly endB: string;
  readonly a: readonly ScheduleRecord[];
  readonly b: readonly ScheduleRecord[];
}

/** AI 思考钩子那几句（照老侧 `ai_questions_for_compare` 的骨架重写：大变化、睡眠那一维、工作那一维、兜底）。 */
function compareQuestions(rows: readonly CompareRow[], labelA: string, labelB: string): string[] {
  const qs: string[] = [];
  const big = rows.filter((row) => Math.abs(row.deltaMinutes) > BIG_CHANGE_MINUTES);
  if (big.length > 0) {
    const top = big[0];
    qs.push(labelA + ' 与 ' + labelB + ' 在「' + top.label + '」这一维的日均差了 ' + signedDur(top.deltaMinutes)
      + '，这一段变化的主因你想从哪里说起？');
  }
  const keep = rows.find((row) => row.label === '维持');
  if (keep !== undefined && Math.abs(keep.deltaMinutes) > 30) {
    qs.push('「维持」那一维的日均差 ' + signedDur(keep.deltaMinutes) + '，这一段是你主动调整还是被事情推着走的？');
  }
  const work = rows.find((row) => row.label === '工作');
  if (work !== undefined && work.deltaMinutes > 60) {
    qs.push('「工作」那一维的日均多出 ' + signedDur(work.deltaMinutes) + '，多出来的时间是从哪一处挪过来的？');
  }
  if (qs.length === 0) {
    qs.push('两段的日均整体接近，有没有哪一处细小的差别其实更要紧？');
  }
  return qs;
}

/** 作息对比整页（老侧 f03：四卡对照 ＋ 7 维差异 ＋ AI 钩子位）。
 *
 *  **口径**：七维那一段比的是**按有记录的天数摊平的日均**（老侧 `build_diff_table` 比的是总量——那
 *  口径遇到「一个区间记录到一半」就会把整个区间读成下降，本票按日均比，与「异常检测」那一页同一条）。
 *  四卡里同时给总量差，两个读法都在页上，读者自己看得见差在哪。 */
export function renderComparePage(input: ComparePageInput): string {
  const dimA = byDim(input.a);
  const dimB = byDim(input.b);
  const datesA = datesOf(input.startA, input.endA);
  const datesB = datesOf(input.startB, input.endB);
  const activeA = Math.max(1, new Set(input.a.map((r) => r.date)).size);
  const activeB = Math.max(1, new Set(input.b.map((r) => r.date)).size);
  const totalA = totalOf(dimA);
  const totalB = totalOf(dimB);
  const avgA = totalA / activeA;
  const avgB = totalB / activeB;

  const rows: CompareRow[] = DIMS.map((dim) => {
    const aDaily = Math.round((dimA[dim] ?? 0) / activeA);
    const bDaily = Math.round((dimB[dim] ?? 0) / activeB);
    const delta = bDaily - aDaily;
    const pct = aDaily > 0 ? fmtPct(Math.abs(delta), aDaily) : (bDaily > 0 ? 100 : 0);
    return {
      label: dim,
      glyph: getEmojiPrefix(dim),
      aValue: aDaily,
      bValue: bDaily,
      aText: fmtDurShort(aDaily),
      bText: fmtDurShort(bDaily),
      deltaText: signedShort(delta) + '，' + signedPct(delta > 0 ? pct : -pct),
      deltaMinutes: delta,
      aLong: fmtDur(aDaily),
      bLong: fmtDur(bDaily),
      tone: delta > 0 ? 'up' : (delta < 0 ? 'down' : 'flat'),
    };
  });
  const changed = rows.filter((row) => {
    const base = row.aValue > 0 ? row.aValue : row.bValue;
    return base > 0 && Math.abs(row.deltaMinutes) / base >= 0.1;
  });
  const cards: readonly KpiCardInput[] = [
    {
      label: '区间 A', value: input.labelA,
      detail: input.startA + ' 至 ' + input.endA + '，共 ' + String(datesA.length) + ' 天，其中 ' + String(activeA) + ' 天有记录',
    },
    {
      label: '区间 B', value: input.labelB,
      detail: input.startB + ' 至 ' + input.endB + '，共 ' + String(datesB.length) + ' 天，其中 ' + String(activeB) + ' 天有记录',
    },
    { label: '总时长差', value: signedShort(totalB - totalA), detail: 'B 减 A 的净变化' },
    { label: '日均差', value: signedShort(avgB - avgA), detail: '按有记录的天数摊平到每一天' },
  ];
  const head: PageHead = {
    docTitle: '作息管家 作息对比',
    eyebrow: EYEBROW,
    title: '作息对比',
    subtitle: input.labelA + '（' + input.startA + ' 至 ' + input.endA + '）与 ' + input.labelB
      + '（' + input.startB + ' 至 ' + input.endB + '）逐维对照。',
  };
  const conclusion = input.labelA + ' 与 ' + input.labelB + '：总时长从 ' + fmtDur(totalA) + ' 到 ' + fmtDur(totalB)
    + '。按有记录的天数摊平，日均从 ' + fmtDur(Math.round(avgA)) + ' 到 ' + fmtDur(Math.round(avgB))
    + '。七个维度里有 ' + String(changed.length) + ' 个的日均变化过了一成。';
  const content = [
    renderKpiGrid(cards, { title: '四卡对照' }),
    renderConclusionBar(conclusion),
    renderSectionTitle('7 维差异'),
    renderCaliberLine('A 段＝' + input.labelA + '，' + input.startA + ' 至 ' + input.endA
      + ' ｜ B 段＝' + input.labelB + '，' + input.startB + ' 至 ' + input.endB),
    renderCaliberLine('柱长按这一维里两段的较大者比 ｜ 差值是 B 减 A，涨绿降红 ｜ 七维按一级分类合计，创作不参评'),
    renderDiffBars(rows),
    renderSectionTitle('AI 思考钩子'),
    renderCaliberLine('这一节是留给 AI 的入口：把下面任意一句复制给 AI，它就着这两个区间往下聊'),
    // 逐句一段正文（**不用列表行**：那一件是「一行一格、超出裁掉」的形状，窄屏上问题会被省略号吃掉——
    //  #789 的响应式读数在 390 档实测裁掉过四成，见证据件第四节）。
    ...compareQuestions(rows, input.labelA, input.labelB).map((text) => renderProseBlock({ text })),
    renderCopyBlock({
      title: '复制与留档',
      dataText: '【作息管家 · 作息对比】' + input.labelA + '（' + input.startA + ' 至 ' + input.endA + '）对 '
        + input.labelB + '（' + input.startB + ' 至 ' + input.endB + '）\n'
        + rows.map((row) => row.label + '：' + row.aLong + ' 到 ' + row.bLong + '（' + signedDur(row.deltaMinutes) + '）').join('\n'),
      logText: '场景：作息对比 ｜ A：' + input.labelA + ' ｜ B：' + input.labelB
        + ' ｜ 数据来源：作息记录表（' + String(input.a.length + input.b.length) + ' 行）',
      dataActionId: 'ilife-sch-compare-copy-data',
      logActionId: 'ilife-sch-compare-copy-log',
    }),
  ].filter((seg) => seg !== '').join('');
  return assembleDocPage({ head, content, extraCss: analyzePartsCss() });
}

/* ─────────────────────────── ② 类别深挖（老侧 f04） ─────────────────────────── */

export interface CategoryPageInput {
  /** 用户说的那个词（只用来讲清「按一级分类归一」这一件事）。 */
  readonly requested: string;
  /** 归一后的一级分类（页面与载荷都用它）。 */
  readonly level1: string;
  readonly start: string;
  readonly end: string;
  /** 待筛的记录（**页面自己按 `start` 至 `end` 与这一维再筛一道**：越界的、别的分类的一条都不上台面）。 */
  readonly records: readonly ScheduleRecord[];
}

/** 类别深挖整页（老侧 f04：24h × N 天热力图 ＋ 分类总览 ＋ 记录明细）。 */
export function renderCategoryPage(input: CategoryPageInput): string {
  const hits = input.records.filter((r) => r.date >= input.start && r.date <= input.end
    && l1Of(r.category) === input.level1);
  const dates = datesOf(input.start, input.end);
  const rows: HeatRow[] = dates.map((date) => {
    const day = hits.filter((r) => r.date === date);
    const cells = hourCellsOf(spansOf(day, input.level1));
    return {
      label: WEEKDAY[new Date(date + 'T00:00:00').getDay()],
      date,
      cells,
      sum: fmtDurShort(minutesOf(day)),
    };
  });
  const capped = rows.length > HEAT_ROWS_MAX ? rows.slice(rows.length - HEAT_ROWS_MAX) : rows;
  const active = new Set(hits.map((r) => r.date)).size;
  const total = minutesOf(hits);
  const dailyAvg = active > 0 ? total / active : 0;

  const bySecond = new Map<string, number>();
  for (const r of hits) {
    const parsed = parseCategory(r.category);
    const key = parsed.level2 === null ? '未分二级' : parsed.level2;
    bySecond.set(key, (bySecond.get(key) ?? 0) + (r.duration_minutes ?? 0));
  }
  const secondKeys = [...bySecond.keys()].sort((x, y) => (bySecond.get(y) ?? 0) - (bySecond.get(x) ?? 0));
  const secondRows = secondKeys.map((key) => ({
    label: key,
    value: fmtDur(bySecond.get(key) ?? 0) + '，占 ' + String(fmtPct(bySecond.get(key) ?? 0, total)) + '%',
    pct: total > 0 ? Math.round(((bySecond.get(key) ?? 0) / total) * 100) : 0,
    color: categoryColor(key, secondKeys),
  }));

  const detailRows: DataTableRow[] = [...hits]
    .sort((x, y) => (x.date + x.time_start).localeCompare(y.date + y.time_start))
    .map((r) => ({
      date: r.date,
      time: spanText(r),
      activity: r.activity,
      category: r.category,
      duration: fmtDur(r.duration_minutes ?? 0),
    }));

  const cards: readonly KpiCardInput[] = [
    {
      label: '深挖类别', value: input.level1,
      detail: input.requested === input.level1 ? '你问的就是这一维' : '「' + input.requested + '」按一级分类归到这一维',
    },
    { label: '总时长', value: fmtDur(total), detail: '这一段里这一维的时长合计' },
    { label: '活跃天数', value: String(active), unit: '天', detail: '窗里一共 ' + String(dates.length) + ' 天' },
    { label: '日均', value: fmtDur(Math.round(dailyAvg)), detail: '按有记录的那几天摊平' },
  ];
  const head: PageHead = {
    docTitle: '作息管家 类别深挖',
    eyebrow: EYEBROW,
    title: '类别深挖',
    subtitle: '「' + input.level1 + '」在 ' + input.start + ' 至 ' + input.end + ' 的读数：'
      + String(active) + ' 天里有记录，共 ' + fmtDur(total) + '。',
  };
  const caliber = input.requested === input.level1
    ? '这一维按一级分类算 ｜ 热力一格是一小时 ｜ 没有记录的小时也占格'
    : '「' + input.requested + '」按一级分类归到「' + input.level1 + '」 ｜ 热力一格是一小时 ｜ 没有记录的小时也占格';
  const content = [
    renderKpiGrid(cards, { title: '这一段的读数' }),
    renderCaliberLine(caliber),
    renderHeatMatrix(capped, {
      order: [input.level1],
      id: 'sch-an-heat',
      title: '24h × ' + String(dates.length) + ' 天热力图',
      legend: true,
      withTotal: true,
      dayLabel: (row) => row.label + ' ' + row.date.slice(5),
    }),
    capped.length === rows.length
      ? ''
      : renderCaliberLine('这一段跨了 ' + String(rows.length) + ' 天，热力图只印最近 ' + String(capped.length) + ' 天'),
    renderSectionTitle('分类总览'),
    renderCaliberLine('这一维下面各二级分类的时长与占比 ｜ 只有一级分类的记录归在「未分二级」'),
    renderDistributionRows({ rows: secondRows }),
    renderSectionTitle('记录明细'),
    renderDataTable({
      columns: [
        { key: 'date', label: '日期' },
        { key: 'time', label: '时段' },
        { key: 'activity', label: '活动' },
        { key: 'category', label: '分类' },
        { key: 'duration', label: '时长', align: 'right' },
      ],
      rows: detailRows,
      emptyText: '这一段里这一维没有记录',
    }),
    renderCopyBlock({
      title: '复制与留档',
      dataText: '【作息管家 · 类别深挖】' + input.level1 + '（' + input.start + ' 至 ' + input.end + '）\n'
        + '共 ' + fmtDur(total) + '，活跃 ' + String(active) + ' 天，日均 ' + fmtDur(Math.round(dailyAvg)) + '\n'
        + detailRows.map((row) => String(row.date) + ' ' + String(row.time) + ' ' + String(row.activity)).join('\n'),
      logText: '场景：类别深挖 ｜ 类别：' + input.level1 + ' ｜ 区间：' + input.start + ' 至 ' + input.end
        + ' ｜ 数据来源：作息记录表（' + String(hits.length) + ' 行）',
      dataActionId: 'ilife-sch-category-copy-data',
      logActionId: 'ilife-sch-category-copy-log',
    }),
  ].filter((seg) => seg !== '').join('');
  return assembleDocPage({ head, content, extraCss: analyzePartsCss() });
}

/* ─────────────────────────── ③ 异常检测（老侧 f05） ─────────────────────────── */

export interface AnomalyPageInput {
  readonly end: string;
  readonly windowDays: number;
  /** 窗口那一段的记录。 */
  readonly records: readonly ScheduleRecord[];
  /** 基线段（结束日往前 30 天，含窗口本身）的记录。 */
  readonly baseline: readonly ScheduleRecord[];
  readonly baselineStart: string;
}

/** 异常检测整页（老侧 f05：红框与黄框的条目 ＋ 7 维雷达）。
 *
 *  **口径**（老侧 `render_record_anomaly` 同一条）：基线段＝结束日往前 30 天，窗口＝最近 N 天；
 *  两段各自**先摊成日均**再比。红黄线取 `policy` 的 `detectAnomalies`：偏离过两成红框，过一成黄框。
 *  （老侧拿两段的总量直接比，窗口比基线短时必然读成降——本票按日均比，不照抄那处口径瑕疵。） */
export function renderAnomalyPage(input: AnomalyPageInput): string {
  const cur = byDim(input.records);
  const base = byDim(input.baseline);
  const w = Math.max(1, input.windowDays);
  const curDaily: Record<string, number> = {};
  const baseDaily: Record<string, number> = {};
  for (const dim of DIMS) {
    curDaily[dim] = (cur[dim] ?? 0) / w;
    baseDaily[dim] = (base[dim] ?? 0) / BASELINE_DAYS;
  }
  const found = detectAnomalies(curDaily, baseDaily)
    .sort((x, y) => (x.level === y.level ? Math.abs(y.deltaPct) - Math.abs(x.deltaPct) : (x.level === 'red' ? -1 : 1)));
  const frames: AnomalyFrameInput[] = found.map((a) => ({
    level: a.level === 'red' ? 'red' : 'yellow',
    headline: a.dim + (a.deltaPct > 0 ? '涨 ' : '降 ') + String(Math.abs(a.deltaPct)) + '%',
    detail: '这一段日均 ' + fmtDur(Math.round(a.cur)) + '，基线日均 ' + fmtDur(Math.round(a.prev))
      + '，两段差了 ' + signedDur(a.cur - a.prev) + '。',
  }));
  const reds = found.filter((a) => a.level === 'red').length;
  const yellows = found.filter((a) => a.level === 'yellow').length;
  const windowStart = shiftDays(input.end, w - 1);
  const emptyText = w >= BASELINE_DAYS
    ? '窗口与基线取的是同一段日子，逐维当然读不出偏离。要看偏离，把窗口开小一点（比如最近 7 天）。'
    : '这一段的日均与基线比，没有哪一维的偏离过了一成。';
  const cards: readonly KpiCardInput[] = [
    { label: '检测窗口', value: String(w), unit: '天', detail: windowStart + ' 至 ' + input.end },
    {
      label: '检出异常', value: String(found.length), unit: '项',
      detail: found.length === 0 ? '这一段没有过线的维度' : '过了一成的维度数',
    },
    { label: '红框', value: String(reds), unit: '项', detail: '偏离过了两成' },
    { label: '黄框', value: String(yellows), unit: '项', detail: '偏离过了一成' },
  ];
  const head: PageHead = {
    docTitle: '作息管家 异常检测',
    eyebrow: EYEBROW,
    title: '异常检测',
    subtitle: '最近 ' + String(w) + ' 天（' + windowStart + ' 至 ' + input.end + '）的日均，与 ' + input.baselineStart
      + ' 至 ' + input.end + ' 这 30 天的日均逐维对照。',
  };
  const radarRows = DIMS.map((dim) => ({
    dim,
    cur: Math.round(curDaily[dim]),
    prev: Math.round(baseDaily[dim]),
    move: signedShort(curDaily[dim] - baseDaily[dim]),
  }));
  const content = [
    renderKpiGrid(cards, { title: '这一趟检测的读数' }),
    renderSectionTitle('异常详情'),
    renderCaliberLine('红框＝偏离过两成 ｜ 黄框＝偏离过一成 ｜ 基线＝' + input.baselineStart
      + ' 至 ' + input.end + ' 这 30 天的日均'),
    renderAnomalyFrames(frames, emptyText),
    renderSectionTitle('7 维雷达'),
    renderRadar({
      dims: DIMS.map((dim) => ({ label: dim, current: curDaily[dim], baseline: baseDaily[dim] })),
      currentLabel: '最近 ' + String(w) + ' 天',
      baselineLabel: '近 30 天',
      caption: '蓝面＝最近 ' + String(w) + ' 天的日均，灰面＝近 30 天的日均。每一个轴按这一维里两段的较大者铺满，谁缩进去谁就少。',
    }),
    renderDataTable({
      columns: [
        { key: 'dim', label: '维度' },
        { key: 'cur', label: '这一段日均', align: 'right' },
        { key: 'prev', label: '基线日均', align: 'right' },
        { key: 'move', label: '日均变化', align: 'right' },
      ],
      rows: radarRows.map((row) => {
        const glyph = getEmojiPrefix(row.dim);
        return { dim: glyph === '' ? row.dim : glyph + ' ' + row.dim, cur: fmtDur(row.cur), prev: fmtDur(row.prev), move: row.move };
      }),
      caption: '七维的日均读数（创作不参评）',
    }),
    renderCopyBlock({
      title: '复制与留档',
      dataText: '【作息管家 · 异常检测】最近 ' + String(w) + ' 天（' + windowStart + ' 至 ' + input.end + '）\n'
        + '基线：' + input.baselineStart + ' 至 ' + input.end + ' 这 30 天的日均\n'
        + radarRows.map((row) => row.dim + '：这一段 ' + fmtDur(row.cur) + '，基线 ' + fmtDur(row.prev) + '（' + row.move + '）').join('\n'),
      logText: '场景：异常检测 ｜ 窗口：' + String(w) + ' 天 ｜ 基线：' + input.baselineStart + ' 至 ' + input.end
        + ' ｜ 数据来源：作息记录表（窗口 ' + String(input.records.length) + ' 行）',
      dataActionId: 'ilife-sch-anomaly-copy-data',
      logActionId: 'ilife-sch-anomaly-copy-log',
    }),
  ].filter((seg) => seg !== '').join('');
  return assembleDocPage({ head, content, extraCss: analyzePartsCss() });
}
