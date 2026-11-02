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
 *
 *  #891 补的**页内定位**（不动件序列，只给已有的段名加锚点与页首目录）：判据（小节数 ≥ 3 出目录）
 *  与装配的唯一一处定义地在 `shared/pageNav.ts` 的 `SECTION_TOC_MIN`。三张页都是长页：
 *  作息对比 4 小节、类别深挖 5 小节、异常检测 4 小节（段名见各自的件序列；带读数的那两颗段名
 *  〔`24h × N 天热力图`〕在目录里收成短名 `热力图`，读数留在大段名上）。
 */
import {
  renderCaliberLine, renderConclusionBar, renderDataTable, renderDistributionRows,
  renderKpiGrid, renderProseBlock,
  type DataTableRow, type KpiCardInput,
} from 'base-paint/blocks';
import {
  HEALTH_TARGETS, detectAnomalies,
  fmtDur, fmtDurShort, fmtPct, getEmojiPrefix, l1Of, parseCategory, toMinutes,
} from '../policy/index.js';
import { buildCategoryDeep, buildRecordCompare } from '../render/index.js';
import { scheduleCopyArea, scheduleCopyLog, scheduleNowStamp } from '../render/copyArea.js';
import { assembleDocPage, type PageHead } from '../shared/docPage.js';
import { pageSections } from '../shared/pageNav.js';
import { categoryColor, hourCellsOf, renderHeatMatrix, type HeatRow } from '../shared/pageParts.js';
import type { ScheduleRecord } from '../fetch/db.js';
import {
  analyzePartsCss, renderAnomalyFrames, renderDiffBars, renderRadar, renderSectionTitle,
  type AnomalyFrameInput, type DiffBarInput,
} from './analyzeParts.js';
import { m } from '../entries/index.js';

/** 页眉那一行域词（三张页同一句）。#1197：取词在渲染期，故写成函数（模块级常量只会在加载期取到 zh）。 */
function eyebrow(): string { return m('skill-schedule.analyze-analyzeDocs.c107'); }

/** 七个维度＝健康分那张表（老侧 `HEALTH_DIMS` 同一组：创作不参评）。 */
const DIMS: readonly string[] = Object.keys(HEALTH_TARGETS);

/** 基线段长度（老侧 `render_record_anomaly` 的 30 天，不新造）。 */
const BASELINE_DAYS = 30;

/** 热力图最多印多少行（再多只印最近这些天，与老侧区间页的上限同量级）。 */
const HEAT_ROWS_MAX = 31;

/** 一处「大变化」线：日均差超过这么久（老侧 `ai_questions_for_compare` 的 4h 是**总量**口径的线，
 *  本页把维度读数换成日均之后按同一量级重定：两小时／半小时／一小时）。 */
const BIG_CHANGE_MINUTES = 2 * 60;

/** 七天的上屏写法（与 query 域同口径；#1197：取词在渲染期，故写成函数）。 */
function weekdayLabels(): readonly string[] { return [m('skill-schedule.analyze-analyzeDocs.c108'), m('skill-schedule.analyze-analyzeDocs.c109'), m('skill-schedule.analyze-analyzeDocs.c110'), m('skill-schedule.analyze-analyzeDocs.c111'), m('skill-schedule.analyze-analyzeDocs.c112'), m('skill-schedule.analyze-analyzeDocs.c113'), m('skill-schedule.analyze-analyzeDocs.c114')]; }

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
  return m('skill-schedule.analyze-analyzeDocs.c001');
}

/** 带正负号的长时长（成句的地方用）。 */
function signedDur(mins: number): string {
  const n = Math.round(mins);
  if (n > 0) return '+' + fmtDur(n);
  if (n < 0) return '-' + fmtDur(-n);
  return m('skill-schedule.analyze-analyzeDocs.c002');
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
const spanText = (r: ScheduleRecord): string => m('skill-schedule.analyze-analyzeDocs.c003', { p0: String(r.time_start), p1: String(r.time_end) });

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
    qs.push(m('skill-schedule.analyze-analyzeDocs.c004', {
      p0: String(labelA),
      p1: String(labelB),
      p2: String(top.label),
      p3: String(signedDur(top.deltaMinutes)),
    }));
  }
  const keep = rows.find((row) => row.label === '维持');
  if (keep !== undefined && Math.abs(keep.deltaMinutes) > 30) {
    qs.push(m('skill-schedule.analyze-analyzeDocs.c005', { p0: String(signedDur(keep.deltaMinutes)) }));
  }
  const work = rows.find((row) => row.label === '工作');
  if (work !== undefined && work.deltaMinutes > 60) {
    qs.push(m('skill-schedule.analyze-analyzeDocs.c006', { p0: String(signedDur(work.deltaMinutes)) }));
  }
  if (qs.length === 0) {
    qs.push(m('skill-schedule.analyze-analyzeDocs.c007'));
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
      label: m('skill-schedule.analyze-analyzeDocs.c008'), value: input.labelA,
      detail: m('skill-schedule.analyze-analyzeDocs.c009', {
        p0: String(input.startA),
        p1: String(input.endA),
        p2: String(String(datesA.length)),
        p3: String(String(activeA)),
      }),
    },
    {
      label: m('skill-schedule.analyze-analyzeDocs.c010'), value: input.labelB,
      detail: m('skill-schedule.analyze-analyzeDocs.c011', {
        p0: String(input.startB),
        p1: String(input.endB),
        p2: String(String(datesB.length)),
        p3: String(String(activeB)),
      }),
    },
    { label: m('skill-schedule.analyze-analyzeDocs.c012'), value: signedShort(totalB - totalA), detail: m('skill-schedule.analyze-analyzeDocs.c013') },
    { label: m('skill-schedule.analyze-analyzeDocs.c014'), value: signedShort(avgB - avgA), detail: m('skill-schedule.analyze-analyzeDocs.c015') },
  ];
  const head: PageHead = {
    docTitle: m('skill-schedule.analyze-analyzeDocs.c016'),
    eyebrow: eyebrow(),
    title: m('skill-schedule.analyze-analyzeDocs.c017'),
    subtitle: m('skill-schedule.analyze-analyzeDocs.c018', {
      p0: String(input.labelA),
      p1: String(input.startA),
      p2: String(input.endA),
      p3: String(input.labelB),
      p4: String(input.startB),
      p5: String(input.endB),
    }),
  };
  const conclusion = m('skill-schedule.analyze-analyzeDocs.c019', {
    p0: String(input.labelA),
    p1: String(input.labelB),
    p2: String(fmtDur(totalA)),
    p3: String(fmtDur(totalB)),
    p4: String(fmtDur(Math.round(avgA))),
    p5: String(fmtDur(Math.round(avgB))),
    p6: String(String(changed.length)),
  });
  const { toc, body } = pageSections([
    { navText: m('skill-schedule.analyze-analyzeDocs.c020'), html: renderKpiGrid(cards, { title: m('skill-schedule.analyze-analyzeDocs.c021') }) },
    { html: renderConclusionBar(conclusion) },
    { navText: m('skill-schedule.analyze-analyzeDocs.c022'), html: renderSectionTitle(m('skill-schedule.analyze-analyzeDocs.c023'))
      + renderCaliberLine(m('skill-schedule.analyze-analyzeDocs.c024', {
        p0: String(input.labelA),
        p1: String(input.startA),
        p2: String(input.endA),
        p3: String(input.labelB),
        p4: String(input.startB),
        p5: String(input.endB),
      }))
      + renderCaliberLine(m('skill-schedule.analyze-analyzeDocs.c025'))
      + renderDiffBars(rows) },
    { navText: m('skill-schedule.analyze-analyzeDocs.c026'), html: renderSectionTitle(m('skill-schedule.analyze-analyzeDocs.c027'))
      + renderCaliberLine(m('skill-schedule.analyze-analyzeDocs.c028'))
      // 逐句一段正文（**不用列表行**：那一件是「一行一格、超出裁掉」的形状，窄屏上问题会被省略号吃掉——
      //  #789 的响应式读数在 390 档实测裁掉过四成，见证据件第四节）。
      + compareQuestions(rows, input.labelA, input.labelB).map((text) => renderProseBlock({ text })).join('') },
    { navText: m('skill-schedule.analyze-analyzeDocs.c029'), html: scheduleCopyArea({
      title: m('skill-schedule.analyze-analyzeDocs.c030'),
      dataActionId: 'ilife-sch-compare-copy-data',
      logActionId: 'ilife-sch-compare-copy-log',
      key: 'schedule.record.compare',
      payload: buildRecordCompare({ labelA: input.labelA, labelB: input.labelB, a: [...input.a], b: [...input.b] }),
      log: scheduleCopyLog({
        command: 'schedule-cmd-read schedule.record.compare --params {"kind":"ranges","labelA":"' + input.labelA
          + '","startA":"' + input.startA + '","endA":"' + input.endA + '","labelB":"' + input.labelB
          + '","startB":"' + input.startB + '","endB":"' + input.endB + '"}',
        source: m('skill-schedule.analyze-analyzeDocs.c031', { p0: String(String(input.a.length + input.b.length)) }),
        actionAt: scheduleNowStamp(),
      }),
    }) },
  ]);
  return assembleDocPage({ head, content: toc + body, extraCss: analyzePartsCss() });
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
      label: weekdayLabels()[new Date(date + 'T00:00:00').getDay()],
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
    const key = parsed.level2 === null ? m('skill-schedule.analyze-analyzeDocs.c032') : parsed.level2;
    bySecond.set(key, (bySecond.get(key) ?? 0) + (r.duration_minutes ?? 0));
  }
  const secondKeys = [...bySecond.keys()].sort((x, y) => (bySecond.get(y) ?? 0) - (bySecond.get(x) ?? 0));
  const secondRows = secondKeys.map((key) => ({
    label: key,
    value: m('skill-schedule.analyze-analyzeDocs.c033', {
      p0: String(fmtDur(bySecond.get(key) ?? 0)),
      p1: String(String(fmtPct(bySecond.get(key) ?? 0, total))),
    }),
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
      label: m('skill-schedule.analyze-analyzeDocs.c034'), value: input.level1,
      detail: input.requested === input.level1 ? m('skill-schedule.analyze-analyzeDocs.c035') : m('skill-schedule.analyze-analyzeDocs.c036', { p0: String(input.requested) }),
    },
    { label: m('skill-schedule.analyze-analyzeDocs.c037'), value: fmtDur(total), detail: m('skill-schedule.analyze-analyzeDocs.c038') },
    { label: m('skill-schedule.analyze-analyzeDocs.c039'), value: String(active), unit: m('skill-schedule.analyze-analyzeDocs.c040'), detail: m('skill-schedule.analyze-analyzeDocs.c041', { p0: String(String(dates.length)) }) },
    { label: m('skill-schedule.analyze-analyzeDocs.c115'), value: fmtDur(Math.round(dailyAvg)), detail: m('skill-schedule.analyze-analyzeDocs.c042') },
  ];
  const head: PageHead = {
    docTitle: m('skill-schedule.analyze-analyzeDocs.c043'),
    eyebrow: eyebrow(),
    title: m('skill-schedule.analyze-analyzeDocs.c044'),
    subtitle: m('skill-schedule.analyze-analyzeDocs.c045', {
      p0: String(input.level1),
      p1: String(input.start),
      p2: String(input.end),
      p3: String(String(active)),
      p4: String(fmtDur(total)),
    }),
  };
  const caliber = input.requested === input.level1
    ? m('skill-schedule.analyze-analyzeDocs.c046')
    : m('skill-schedule.analyze-analyzeDocs.c047', { p0: String(input.requested), p1: String(input.level1) });
  const heatTitle = m('skill-schedule.analyze-analyzeDocs.c048', { p0: String(String(dates.length)) });
  const { toc, body } = pageSections([
    { navText: m('skill-schedule.analyze-analyzeDocs.c049'), html: renderKpiGrid(cards, { title: m('skill-schedule.analyze-analyzeDocs.c050') }) },
    { html: renderCaliberLine(caliber) },
    // 段名是「24h × N 天热力图」（N 随这一段的天数变）；目录项与它逐字同源（同一个常量写两处拼接）。
    { navText: heatTitle, html: renderHeatMatrix(capped, {
      order: [input.level1],
      id: 'sch-an-heat',
      title: heatTitle,
      legend: true,
      withTotal: true,
      dayLabel: (row) => row.label + ' ' + row.date.slice(5),
    }) },
    { html: capped.length === rows.length
      ? ''
      : renderCaliberLine(m('skill-schedule.analyze-analyzeDocs.c051', {
        p0: String(String(rows.length)),
        p1: String(String(capped.length)),
      })) },
    { navText: m('skill-schedule.analyze-analyzeDocs.c052'), html: renderSectionTitle(m('skill-schedule.analyze-analyzeDocs.c053'))
      + renderCaliberLine(m('skill-schedule.analyze-analyzeDocs.c054'))
      + renderDistributionRows({ rows: secondRows }) },
    { navText: m('skill-schedule.analyze-analyzeDocs.c055'), html: renderSectionTitle(m('skill-schedule.analyze-analyzeDocs.c056'))
      + renderDataTable({
        columns: [
          { key: 'date', label: m('skill-schedule.analyze-analyzeDocs.c057') },
          { key: 'time', label: m('skill-schedule.analyze-analyzeDocs.c058') },
          { key: 'activity', label: m('skill-schedule.analyze-analyzeDocs.c059') },
          { key: 'category', label: m('skill-schedule.analyze-analyzeDocs.c060') },
          { key: 'duration', label: m('skill-schedule.analyze-analyzeDocs.c061'), align: 'right' },
        ],
        rows: detailRows,
        emptyText: m('skill-schedule.analyze-analyzeDocs.c062'),
      }) },
    { navText: m('skill-schedule.analyze-analyzeDocs.c063'), html: scheduleCopyArea({
      title: m('skill-schedule.analyze-analyzeDocs.c064'),
      dataActionId: 'ilife-sch-category-copy-data',
      logActionId: 'ilife-sch-category-copy-log',
      key: 'schedule.record.compare',
      payload: buildCategoryDeep(input.start, input.end, input.level1, [...input.records]),
      log: scheduleCopyLog({
        command: 'schedule-cmd-read schedule.record.compare --params {"kind":"category","category":"'
          + input.level1 + '","start":"' + input.start + '","end":"' + input.end + '"}',
        source: m('skill-schedule.analyze-analyzeDocs.c065', { p0: String(String(hits.length)) }),
        actionAt: scheduleNowStamp(),
      }),
    }) },
  ]);
  return assembleDocPage({ head, content: toc + body, extraCss: analyzePartsCss() });
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
    headline: a.dim + (a.deltaPct > 0 ? m('skill-schedule.analyze-analyzeDocs.c066') : m('skill-schedule.analyze-analyzeDocs.c067')) + String(Math.abs(a.deltaPct)) + '%',
    detail: m('skill-schedule.analyze-analyzeDocs.c068', {
      p0: String(fmtDur(Math.round(a.cur))),
      p1: String(fmtDur(Math.round(a.prev))),
      p2: String(signedDur(a.cur - a.prev)),
    }),
  }));
  const reds = found.filter((a) => a.level === 'red').length;
  const yellows = found.filter((a) => a.level === 'yellow').length;
  const windowStart = shiftDays(input.end, w - 1);
  const emptyText = w >= BASELINE_DAYS
    ? m('skill-schedule.analyze-analyzeDocs.c069')
    : m('skill-schedule.analyze-analyzeDocs.c070');
  const cards: readonly KpiCardInput[] = [
    { label: m('skill-schedule.analyze-analyzeDocs.c071'), value: String(w), unit: m('skill-schedule.analyze-analyzeDocs.c072'), detail: m('skill-schedule.analyze-analyzeDocs.c073', { p0: String(windowStart), p1: String(input.end) }) },
    {
      label: m('skill-schedule.analyze-analyzeDocs.c074'), value: String(found.length), unit: m('skill-schedule.analyze-analyzeDocs.c075'),
      detail: found.length === 0 ? m('skill-schedule.analyze-analyzeDocs.c076') : m('skill-schedule.analyze-analyzeDocs.c077'),
    },
    { label: m('skill-schedule.analyze-analyzeDocs.c078'), value: String(reds), unit: m('skill-schedule.analyze-analyzeDocs.c079'), detail: m('skill-schedule.analyze-analyzeDocs.c080') },
    { label: m('skill-schedule.analyze-analyzeDocs.c081'), value: String(yellows), unit: m('skill-schedule.analyze-analyzeDocs.c082'), detail: m('skill-schedule.analyze-analyzeDocs.c083') },
  ];
  const head: PageHead = {
    docTitle: m('skill-schedule.analyze-analyzeDocs.c084'),
    eyebrow: eyebrow(),
    title: m('skill-schedule.analyze-analyzeDocs.c085'),
    subtitle: m('skill-schedule.analyze-analyzeDocs.c086', {
      p0: String(String(w)),
      p1: String(windowStart),
      p2: String(input.end),
      p3: String(input.baselineStart),
      p4: String(input.end),
    }),
  };
  const radarRows = DIMS.map((dim) => ({
    dim,
    cur: Math.round(curDaily[dim]),
    prev: Math.round(baseDaily[dim]),
    move: signedShort(curDaily[dim] - baseDaily[dim]),
  }));
  // #1223：逐维那一句先算成中转变量——整句化只认「一段文案 ＋ 若干变量」，
  // 链里再嵌回调（map 里的拼接）会被判成形状拿不准，整件不写盘。
  const radarSummary = radarRows.map((row) => m('skill-schedule.analyze-analyzeDocs.c087', {
    p0: String(row.dim),
    p1: String(fmtDur(row.cur)),
    p2: String(fmtDur(row.prev)),
    p3: String(row.move),
  })).join('');
  const { toc, body } = pageSections([
    { navText: m('skill-schedule.analyze-analyzeDocs.c088'), html: renderKpiGrid(cards, { title: m('skill-schedule.analyze-analyzeDocs.c089') }) },
    { navText: m('skill-schedule.analyze-analyzeDocs.c090'), html: renderSectionTitle(m('skill-schedule.analyze-analyzeDocs.c091'))
      + renderCaliberLine(m('skill-schedule.analyze-analyzeDocs.c092', { p0: String(input.baselineStart), p1: String(input.end) }))
      + renderAnomalyFrames(frames, emptyText) },
    { navText: m('skill-schedule.analyze-analyzeDocs.c093'), html: renderSectionTitle(m('skill-schedule.analyze-analyzeDocs.c094'))
      + renderRadar({
        dims: DIMS.map((dim) => ({ label: dim, current: curDaily[dim], baseline: baseDaily[dim] })),
        currentLabel: m('skill-schedule.analyze-analyzeDocs.c095', { p0: String(String(w)) }),
        baselineLabel: m('skill-schedule.analyze-analyzeDocs.c096'),
        caption: m('skill-schedule.analyze-analyzeDocs.c097', { p0: String(String(w)) }),
      })
      + renderDataTable({
        columns: [
          { key: 'dim', label: m('skill-schedule.analyze-analyzeDocs.c098') },
          { key: 'cur', label: m('skill-schedule.analyze-analyzeDocs.c099'), align: 'right' },
          { key: 'prev', label: m('skill-schedule.analyze-analyzeDocs.c100'), align: 'right' },
          { key: 'move', label: m('skill-schedule.analyze-analyzeDocs.c101'), align: 'right' },
        ],
        rows: radarRows.map((row) => {
          const glyph = getEmojiPrefix(row.dim);
          return { dim: glyph === '' ? row.dim : glyph + ' ' + row.dim, cur: fmtDur(row.cur), prev: fmtDur(row.prev), move: row.move };
        }),
        caption: m('skill-schedule.analyze-analyzeDocs.c102'),
      }) },
    { navText: m('skill-schedule.analyze-analyzeDocs.c103'), html: scheduleCopyArea({
      title: m('skill-schedule.analyze-analyzeDocs.c104'),
      dataActionId: 'ilife-sch-anomaly-copy-data',
      logActionId: 'ilife-sch-anomaly-copy-log',
      key: 'schedule.record.compare',
      // 这一份摘要从页上那几张读数原样拼（不重跑口径：红黄框与逐维日均就是上面算出来的那几行）。
      payload: {
        summary: m('skill-schedule.analyze-analyzeDocs.c105', {
          p0: String(String(w)),
          p1: String(windowStart),
          p2: String(input.end),
          p3: String(input.baselineStart),
          p4: String(input.end),
          p5: String(String(reds)),
          p6: String(String(yellows)),
          p7: String(radarSummary),
        }),
      },
      log: scheduleCopyLog({
        command: 'schedule-cmd-read schedule.record.compare --params {"kind":"anomaly","end":"' + input.end
          + '","windowDays":' + String(w) + '}',
        source: m('skill-schedule.analyze-analyzeDocs.c106', { p0: String(String(input.records.length)) }),
        actionAt: scheduleNowStamp(),
      }),
    }) },
  ]);
  return assembleDocPage({ head, content: toc + body, extraCss: analyzePartsCss() });
}
