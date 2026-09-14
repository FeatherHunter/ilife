/** #111 · 运动移植 6 键全文档装配（数据→区块→填充器）。
 *
 * 范围（t71「需移植」之运动 6 项）：`calorie.view.exercise-strength`
 * （exercise_strength：按动作聚合＋重量轨迹）／`calorie.view.exercise-cardio`
 * （exercise_cardio：按类型聚合＋配速）／`calorie.view.exercise-distribution`
 * （exercise_distribution：分类占比＋摄入/TDEE 联动）／
 * `calorie.view.exercise-recap`（exercise_recap：多窗复盘＋TOP5＋一句话）／
 * `calorie.view.exercise-review`（exercise_review：计划 vs 实绩）／
 * `calorie.view.exercise-trend`（exercise_trend：日序列＋周频次＋峰值）。
 * 不碰：process_progress（落地/训记二期，O3/oosLanding/oosXunji 命中但不执行，
 * 路由不动）／营养 4（→ #112）／趋势 2＋其他 6（→ #113）／47 页已有（#108–#110 已关）。
 *
 * 做法（#104 §4 用法，照抄 trendDocs 头 90 行）：内容 = base-paint/blocks 12 区块
 * （B-01 壳／B-02 KPI／B-03 表／B-04 图／B-05 列表／B-08 折叠／B-09 参数表单／
 * B-11 复制区），文档 = fillTemplate 包裹（资产裸文本＋填充器包裹；
 * sharedCss = buildStyleSheet().css + blocksCss()，不走 extraCss；
 * 图表页另加 CHARTS-HELPERS＋buildChartsHelpersJs，图表 CSS 由其运行时注入）。
 * 复制文本一律 buildDataText（#77 契约）：stat 投影 metrics 只收确定数字。
 * 本层不做取数（数据由 render/exercisePort.ts 备齐），不返空（缺失由数据层抛 missing-data）。
 *
 * **#453（地图 #156 页面族第 4 票，形状照已验样板 #423）**：分布／力量／有氧三支换融合版式——
 * 卡清单（`Card`）各自判空＋`renderTocBlock` 页内导航＋`renderCaliberLine` 口径行＋
 * `shared/sourceLine.ts` 来源脚注＋`assembleDocPage({printable:true})`（#448 透传位）＋
 * `shared/copyArea.ts` 三格式复制＋`shared/emptyGuide.ts` 空态带下一句；类别色只走
 * `exercise/categoryColors.ts` 的 `categoryColor()`。**#454（第 5 票）把趋势（`buildTrendDoc`）
 * 与复盘（`buildRecapDoc`）两支也换成同一套融合版式**（卡清单逐卡判空＋五窗同版＋逐日表截断明示）；
 * `buildReviewDoc`（计划复盘）仍走老版式。本族不接四态头与变更卡载具（那是写操作器件，
 * 只读页硬套会印出与事实不符的态标签）。
 */
import {
  renderCaliberLine,
  renderChartBlock,
  renderChips,
  renderCopyBlock,
  renderDataTable,
  renderDisclosure,
  renderDistributionRows,
  renderFeedbackBlock,
  renderKpiGrid,
  renderListRows,
  renderParamForm,
  renderTocBlock,
} from 'base-paint/blocks';
import { buildDataText, buildLogText } from 'base-paint';
import type { DataTextInput } from 'base-paint';
import { categoryColor } from '../exercise/categoryColors.js';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { copyArea, copyLog, dataCopyArea } from '../shared/copyArea.js';
import { emptyGuide } from '../shared/emptyGuide.js';
import { sourceLine } from '../shared/sourceLine.js';
import { nowStamp } from './receipt.js';
import type {
  CardioView,
  DistributionView,
  RecapView,
  ReviewView,
  StrengthView,
  TrendView,
} from './exercisePort.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本文件各页共用的 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。 */
const DOC_TITLE = '卡路里·运动移植';

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return String(n);
}

function fmtPace(p: number | null | undefined): string {
  if (p === null || p === undefined) return '—';
  return String(p) + ' 分/公里';
}

/** 逐条记录表（100 条截断明示，沿 R3 口径；备注仅展示，不做筛选维度）。 */
const RECORD_CAP = 100;

function windowForm(start: string, end: string, extra: string): string {
  return renderParamForm({
    fields: [
      { name: 'start', label: '开始', value: start },
      { name: 'end', label: '结束', value: end },
    ],
    description: extra,
  });
}

/* ── #453 融合版式共用件（分布／力量／有氧三页共用；形状照 #423 回执族样板） ── */

/** 页内一张卡（`id` 即页内导航的锚点，导航项按同一份清单生成）；卡外壳＝锚点 id ＋ 区块 HTML。 */
interface Card { readonly id: string; readonly label: string; readonly html: string }

function shell(card: Card): string {
  return '<section id="' + card.id + '">' + card.html + '</section>';
}

/** 窗口卡：这一页看的是哪一段（开始／结束两个真日期）。 */
function windowCard(start: string, end: string, description: string): Card {
  return { id: 'sec-window', label: '窗口', html: windowForm(start, end, description) };
}

/** 数值格的人话写法：缺值一律「—」（不空着、也不编 0）；`unit` 空串即不带单位。 */
function numUnit(v: number | null | undefined, unit: string): string {
  if (v === null || v === undefined) return '—';
  return unit === '' ? String(v) : String(v) + ' ' + unit;
}

/** 来源脚注卡（#422 `sourceLine`）：窗口 ＋ 本窗条数（**0 条也要印**，空态也报得出处）。 */
function sourceCard(source: string, start: string, end: string, count: number): Card {
  return { id: 'sec-source', label: '数据来源', html: sourceLine({ source, start, end, count }) };
}

/** 页尾三件：页内导航 ＋ 口径行 ＋ 卡 ＋ 三格式复制区（三页装配的唯一出口，免得各页抄一遍）。 */
function finishPage(cards: readonly Card[], caliber: string, envelopeKey: string,
  metrics: Record<string, number | null | undefined>): string {
  return [
    renderTocBlock({ items: cards.map((c) => ({ id: c.id, text: c.label })) }),
    renderCaliberLine(caliber),
    cards.map(shell).join(''),
    copyArea({
      data: {
        envelope: {
          version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: envelopeKey,
          data: { metrics: metricsOf(metrics) },
        },
      },
    }),
  ].join('');
}

/** 库内分类 → 类别色键（`categoryColors.ts` 的四键）；表外分类不给键。 */
const CATEGORY_KEYS: Record<string, string> = { 力量: 'strength', 有氧: 'cardio', 柔韧: 'flex', 日常: 'daily' };

/** 分类色：只从 `categoryColor()`（技能层单源色表）取 hex；表外分类返回 `{}`
 *  （不给色＝区块回落到冻结 token 缺省色，本层不写第二份色表、也不写 token 名）。 */
function colorOf(category: string): { readonly color?: string } {
  const key = CATEGORY_KEYS[category];
  const hex = key === undefined ? undefined : categoryColor(key);
  return hex === undefined ? {} : { color: hex };
}

/* ── 力量训练总览（exercise_strength.html 对照：#453 融合版式：动作表＋重量轨迹＋逐条记录） ── */

/** 力量页的来源句（读页自己的取数面）。 */
const STRENGTH_SOURCE = 'exercise_log（本窗未删除的力量行）';

export function buildStrengthDoc(v: StrengthView): string {
  const hasRows = v.byMovement.length > 0;
  const cards: Card[] = [
    windowCard(v.start, v.end, '只数分类为力量的记录（库内分类实填优先、缺失按名推断；配速与时长口径不在此页）'),
    {
      id: 'sec-figures',
      label: '核心数字',
      html: renderKpiGrid([
        { label: '动作数', value: String(v.movementCount), unit: '个', detail: v.start + ' ~ ' + v.end },
        { label: '总组数', value: String(v.totalSets), unit: '组', detail: '本窗动作记录条数' },
        { label: '总重量', value: numUnit(v.totalVolumeKg, 'kg'), detail: '重量或次数缺一即不计' },
        { label: '总次数', value: numUnit(v.totalReps, '次') },
      ]),
    },
  ];
  // 口径写在动作表的标题里（票面第 2 条）：窗口 ＋ 「单侧口径 Σkg×次数」，全页只此一处。
  if (hasRows) {
    cards.push({
      id: 'sec-table',
      label: '按动作聚合',
      html: renderDataTable({
        columns: [
          { key: 'movement', label: '动作' },
          { key: 'sets', label: '组数', align: 'right' },
          { key: 'volumeKg', label: '总重量', align: 'right' },
          { key: 'reps', label: '总次数', align: 'right' },
        ],
        rows: v.byMovement.map((m) => ({
          movement: m.movement,
          sets: numUnit(m.sets, '组'),
          volumeKg: numUnit(m.volumeKg, 'kg'),
          reps: numUnit(m.reps, '次'),
        })),
        caption: '按动作聚合（' + v.start + ' ~ ' + v.end + '）｜单侧口径 Σkg×次数：逐条「重量×次数」累加，'
          + '重量或次数缺一即「—」',
      }),
    });
  }
  const trail = v.trail.filter((p) => p.volumeKg !== null);
  const charts = trail.length > 0;
  if (charts) {
    cards.push({
      id: 'sec-chart',
      label: '重量轨迹',
      html: renderChartBlock({
        kind: 'line',
        title: '重量轨迹（近 10 个训练日）',
        input: { items: trail.map((p) => ({ label: p.date.slice(5), value: p.volumeKg })) },
      }),
    });
  }
  if (hasRows) {
    const total = v.rows.length;
    cards.push({
      id: 'sec-detail',
      label: '逐条记录',
      html: renderDataTable({
        columns: [
          { key: 'date', label: '日期' },
          { key: 'type', label: '动作' },
          { key: 'load', label: '重量×次数' },
          { key: 'note', label: '备注' },
        ],
        rows: v.rows.slice(0, RECORD_CAP).map((r) => ({
          date: r.date,
          type: r.type,
          load: numUnit(r.loadKg, 'kg') + '×' + numUnit(r.reps, ''),
          note: r.note.trim() === '' ? '—' : r.note,
        })),
        caption: '力量逐条记录（共 ' + total + ' 条'
          + (total > RECORD_CAP ? '，本页只列前 ' + RECORD_CAP + ' 条' : '') + '）',
      }),
    });
  } else {
    cards.push({
      id: 'sec-empty',
      label: '按动作聚合',
      html: emptyGuide({ icon: '🏋️', text: '本窗还没有力量训练记录', hint: '说「记力量训练」就能记下第一条' }),
    });
  }
  cards.push(sourceCard(STRENGTH_SOURCE, v.start, v.end, v.rows.length));
  return assembleDocPage({
    docTitle: '卡路里·力量训练总览',
    title: '力量训练总览',
    eyebrow: '运动 · 力量总览',
    subtitle: '按动作聚合＋重量轨迹（缺值显「—」，不编数）',
    content: finishPage(cards, '口径：组数＝本窗动作记录条数；总重量＝逐条「重量×次数」累加（缺一即「—」）；'
      + '总次数＝本窗各条次数之和；配速与时长口径不在此页', '力量训练总览', {
      movementCount: v.movementCount, totalSets: v.totalSets,
      totalVolumeKg: v.totalVolumeKg, totalReps: v.totalReps,
    }),
    charts,
    printable: true,
  });
}

/* ── 有氧训练总览（exercise_cardio.html 对照：#453 融合版式：类型表＋类型图＋逐条记录） ── */

/** 有氧页的来源句（读页自己的取数面）。 */
const CARDIO_SOURCE = 'exercise_log（本窗未删除的有氧行）';

export function buildCardioDoc(v: CardioView): string {
  const hasRows = v.byType.length > 0;
  const cards: Card[] = [
    windowCard(v.start, v.end, '只数分类为有氧的记录（库内分类实填优先、缺失按名推断；柔韧与日常不在此页）'),
    {
      id: 'sec-figures',
      label: '核心数字',
      html: renderKpiGrid([
        { label: '次数', value: String(v.sessions), unit: '次', detail: v.start + ' ~ ' + v.end },
        { label: '总时长', value: numUnit(v.totalMinutes, '分钟') },
        { label: '总距离', value: numUnit(v.totalDistanceKm, '公里') },
        { label: '平均步速', value: fmtPace(v.avgPaceMinPerKm), detail: '总分钟÷总公里（没有距离就不算）' },
      ]),
    },
  ];
  if (hasRows) {
    cards.push({
      id: 'sec-table',
      label: '按类型聚合',
      html: renderDataTable({
        columns: [
          { key: 'type', label: '类型' },
          { key: 'sessions', label: '次数', align: 'right' },
          { key: 'minutes', label: '时长', align: 'right' },
          { key: 'km', label: '距离', align: 'right' },
          { key: 'pace', label: '步速', align: 'right' },
        ],
        rows: v.byType.map((t) => ({
          type: t.type,
          sessions: numUnit(t.sessions, '次'),
          minutes: numUnit(t.minutes, '分钟'),
          km: numUnit(t.distanceKm, 'km'),
          pace: fmtPace(t.paceMinPerKm),
        })),
        caption: '按类型聚合（' + v.start + ' ~ ' + v.end + '）；缺一格显「—」不空着',
      }),
    });
    cards.push({
      id: 'sec-chart',
      label: '类型图',
      html: renderChartBlock({
        kind: 'bar',
        title: '按类型次数',
        input: { items: v.byType.map((t) => ({ label: t.type, value: t.sessions })) },
      }),
    });
    cards.push({
      id: 'sec-detail',
      label: '逐条记录',
      html: renderDataTable({
        columns: [
          { key: 'date', label: '日期' },
          { key: 'type', label: '类型' },
          { key: 'minutes', label: '时长' },
          { key: 'km', label: '距离' },
          { key: 'note', label: '备注' },
        ],
        rows: v.rows.slice(0, RECORD_CAP).map((r) => ({
          date: r.date,
          type: r.type,
          minutes: numUnit(r.minutes, '分钟'),
          km: numUnit(r.distanceKm, 'km'),
          note: r.note.trim() === '' ? '—' : r.note,
        })),
        caption: '有氧逐条记录（共 ' + v.rows.length + ' 条'
          + (v.rows.length > RECORD_CAP ? '，本页只列前 ' + RECORD_CAP + ' 条' : '') + '）',
      }),
    });
  } else {
    cards.push({
      id: 'sec-empty',
      label: '按类型聚合',
      html: emptyGuide({ icon: '🏃', text: '本窗还没有有氧运动记录', hint: '说「记有氧运动」就能记下第一条' }),
    });
  }
  cards.push(sourceCard(CARDIO_SOURCE, v.start, v.end, v.sessions));
  return assembleDocPage({
    docTitle: '卡路里·有氧训练总览',
    title: '有氧训练总览',
    eyebrow: '运动 · 有氧总览',
    subtitle: '按类型聚合＋步速（没有距离就不算步速，缺值显「—」）',
    content: finishPage(cards, '口径：次数＝本窗记录条数；时长＝分钟；距离＝公里；步速＝分钟÷公里'
      + '（没有距离就不算步速）；缺一格显「—」，不空着也不编 0', '有氧训练总览', {
      sessions: v.sessions, totalMinutes: v.totalMinutes,
      totalDistanceKm: v.totalDistanceKm, avgPaceMinPerKm: v.avgPaceMinPerKm,
    }),
    charts: hasRows,
    printable: true,
  });
}

/* ── 运动类型分布（exercise_distribution.html 对照：#453 融合版式：占比迷你条＋分类表＋共享图表） ── */

/** 分布页的来源句（读页自己的取数面）。 */
const DIST_SOURCE = 'exercise_log（本窗未删除的行）';

export function buildDistributionDoc(v: DistributionView): string {
  const hasRows = v.buckets.length > 0;
  // 合计行：四类桶逐项累加；时长只在有已知值的桶间累加（缺值不进合计，也不印假 0）。
  let totalMinutes = 0;
  let minutesKnown = false;
  for (const b of v.buckets) {
    if (b.minutes !== null) {
      totalMinutes += b.minutes;
      minutesKnown = true;
    }
  }
  const share = (n: number | null): string => (n === null ? '—' : String(n) + '%');
  const cards: Card[] = [
    windowCard(v.start, v.end, '分类＝库内实填优先（力量／有氧／柔韧／日常；表外归「其他」）；'
      + '占比＝该类占本窗合计（热量口径）'),
    {
      id: 'sec-figures',
      label: '核心数字',
      html: renderKpiGrid([
        { label: '会话', value: String(v.sessions), unit: '次', detail: v.days + ' 天 · 活跃 ' + v.activeDays + ' 天' },
        { label: '总消耗', value: String(v.totalBurned), unit: '卡' },
        { label: '摄入', value: numUnit(v.intakeCal, '卡'), detail: '窗内饮食合计（没有饮食记录即「—」）' },
        { label: '缺口', value: numUnit(v.deficit, '卡'), detail: 'TDEE×天＋运动−摄入（缺摄入即「—」）' },
      ]),
    },
  ];
  if (hasRows) {
    // 分类占比：迷你条与数字同格；条色走 `categoryColor()` 的 hex（四类色不在此处另写一份）。
    cards.push({
      id: 'sec-ratio',
      label: '分类占比',
      html: renderDistributionRows({
        rows: v.buckets.map((b) => ({
          label: b.category,
          value: share(b.shareByBurned),
          pct: b.shareByBurned ?? 0,
          ...colorOf(b.category),
        })),
      }),
    });
    cards.push({
      id: 'sec-table',
      label: '分类明细',
      html: renderDataTable({
        columns: [
          { key: 'category', label: '分类' },
          { key: 'sessions', label: '次数', align: 'right' },
          { key: 'burned', label: '热量', align: 'right' },
          { key: 'share', label: '占比', align: 'right' },
          { key: 'minutes', label: '时长', align: 'right' },
        ],
        rows: [
          ...v.buckets.map((b) => ({
            category: b.category,
            sessions: numUnit(b.sessions, '次'),
            burned: numUnit(b.burned, '卡'),
            share: share(b.shareByBurned),
            minutes: numUnit(b.minutes, '分钟'),
          })),
          {
            category: '合计',
            sessions: numUnit(v.sessions, '次'),
            burned: numUnit(v.totalBurned, '卡'),
            share: '100%',
            minutes: numUnit(minutesKnown ? totalMinutes : null, '分钟'),
          },
        ],
        caption: '分类明细（' + v.start + ' ~ ' + v.end + '，末行为合计）',
      }),
    });
    cards.push({
      id: 'sec-chart',
      label: '分类图',
      html: renderChartBlock({
        kind: 'bar',
        title: '按分类热量分布',
        input: { items: v.buckets.map((b) => ({ label: b.category, value: b.burned })) },
      }),
    });
    cards.push({
      id: 'sec-link',
      label: '摄入/TDEE 联动',
      html: renderDisclosure({
        title: '摄入/TDEE 联动（运动贡献）',
        contentHtml: renderListRows({
          items: [
            { left: '摄入合计', main: numUnit(v.intakeCal, '卡'), right: v.days + ' 天' },
            { left: '运动消耗', main: numUnit(v.totalBurned, '卡'), right: v.sessions + ' 次' },
            { left: 'TDEE 合计', main: numUnit(v.tdeeTotal, '卡'), right: '档案静态值×天' },
            { left: '缺口', main: numUnit(v.deficit, '卡'), right: v.deficit === null ? '缺摄入未算' : 'TDEE＋运动−摄入' },
          ],
        }),
      }),
    });
  } else {
    cards.push({
      id: 'sec-empty',
      label: '分类明细',
      html: emptyGuide({ icon: '📊', text: '本窗还没有运动记录', hint: '说「记运动」就能记下第一条' }),
    });
  }
  cards.push(sourceCard(DIST_SOURCE, v.start, v.end, v.sessions));
  return assembleDocPage({
    docTitle: '卡路里·运动类型分布',
    title: '运动类型分布',
    eyebrow: '运动 · 类型分布',
    subtitle: '分类占比＋摄入/TDEE 联动（缺摄入不编缺口，缺值显「—」）',
    content: finishPage(cards, '口径：占比＝该类热量÷本窗合计热量；次数＝本窗记录条数；'
      + '时长＝分钟（没有时长的分类不进合计）；缺口＝TDEE×天＋运动−摄入（缺摄入即「—」）', '运动类型分布', {
      sessions: v.sessions, activeDays: v.activeDays, days: v.days, totalBurned: v.totalBurned,
      intakeCal: v.intakeCal, tdeeTotal: v.tdeeTotal, deficit: v.deficit,
    }),
    charts: hasRows,
    printable: true,
  });
}

/* ── 运动复盘（exercise_recap.html 对照：#454 融合版式：一句话结论＋类型分布＋高频徽章＋每日消耗） ── */

/** 复盘页的来源句（读页自己的取数面）。 */
const RECAP_SOURCE = 'exercise_log（本窗未删除的行）';

/** 复盘页口径行（页内数字怎么来的，写在页面上）。 */
const RECAP_CALIBER = '口径：结论句按本窗记录算（频次＝记录条数）；分布条占比＝该类次数÷本窗次数'
  + '（条色＝该类别的固定色）；徽章＝本窗次数前 5 的运动；折线按窗口每一天画点'
  + '（没有记录的日子留空，不断 0）；时长＝分钟、消耗＝卡。';

/** 五个时间窗（本周／本月／最近 90 天／今年／自定义时间）共用这一个装配：窗口只从数据侧进，
 *  模板零分支——同一组锚点 id 与区块类名，差异只在文本与数据；`sessions === 0` 才改走空态。 */
export function buildRecapDoc(v: RecapView): string {
  const hasRows = v.sessions > 0;
  const cards: Card[] = [
    windowCard(v.start, v.end, '复盘窗＝调用方给 start/end（旧 period week/month/90d/year/range 逐一映射；多窗各直出一页）'),
    {
      id: 'sec-conclusion',
      label: '一句话结论',
      // 结论条＝页内静态提示形态（浅色、不可点掉），一句话由数据侧给，页面不另编措辞。
      html: renderFeedbackBlock({
        staticNotice: true,
        toast: { msg: v.summary, icon: hasRows ? 'ok' : 'info' },
      }),
    },
    {
      id: 'sec-figures',
      label: '核心数字',
      html: renderKpiGrid([
        { label: '总时长', value: numUnit(v.totalMinutes, '分钟'), detail: v.start + ' ~ ' + v.end },
        { label: '总消耗', value: numUnit(v.totalBurned, '卡') },
        { label: '频次', value: String(v.sessions), unit: '次', detail: '活跃 ' + v.activeDays + ' / ' + v.days + ' 天' },
        { label: '覆盖分类', value: String(v.byCategory.length), unit: '类' },
      ]),
    },
  ];
  if (hasRows) {
    // 类型分布条：条色只走 `categoryColor()` 的 hex；占比按次数（与结论句同一口径）。
    cards.push({
      id: 'sec-category',
      label: '类型分布',
      html: renderDistributionRows({
        rows: v.byCategory.map((b) => ({
          label: b.category,
          value: b.sessions + ' 次 · ' + b.burned + ' 卡',
          pct: Math.round((b.sessions / v.sessions) * 1000) / 10,
          ...colorOf(b.category),
        })),
      }),
    });
    // 高频运动徽章：本窗次数前 5（次数并列时取并到的顺手序，页面不另排序）。
    cards.push({
      id: 'sec-badges',
      label: '高频运动',
      html: renderChips({ items: v.top5.map((t) => ({ text: t.type + ' ×' + t.sessions })) }),
    });
    cards.push({
      id: 'sec-daily',
      label: '每日消耗趋势',
      html: renderChartBlock({
        kind: 'line',
        title: '每日消耗趋势（空缺断点不断 0）',
        input: { items: v.daily.map((d) => ({ label: d.date.slice(5), value: d.burned })) },
      }),
    });
  } else {
    cards.push({
      id: 'sec-empty',
      label: '类型分布',
      html: emptyGuide({ icon: '📊', text: '本窗还没有运动记录', hint: '说「记运动」就能记下第一条' }),
    });
  }
  cards.push(sourceCard(RECAP_SOURCE, v.start, v.end, v.sessions));
  return assembleDocPage({
    docTitle: '卡路里·运动复盘',
    title: '运动复盘 ' + v.start + ' ~ ' + v.end,
    eyebrow: '运动 · 复盘',
    subtitle: '结论一句话 ＋ 类型分布 ＋ 高频运动 ＋ 每日消耗趋势',
    content: finishPage(cards, RECAP_CALIBER, '运动复盘', {
      sessions: v.sessions, totalMinutes: v.totalMinutes, totalBurned: v.totalBurned,
      activeDays: v.activeDays, days: v.days,
    }),
    charts: hasRows,
    printable: true,
  });
}

/* ── 计划复盘（exercise_review.html 对照） ──
 *
 * **T351-v7：整支已搬进姊妹件 `./reviewDocs.ts`**（键 `calorie.view.exercise-review`，
 * order201–206）——本件已超 350 行告警线（见包 `AGENTS.md` 台账挂号行），复盘族的页内样式
 * 与热力图再挤进来只会更糟；搬走后本件只留「分布／力量／有氧／运动复盘／趋势」五键，
 * `buildReviewDoc` 改由 `../workout/review.ts` 直接 import 姊妹件。
 * 台账许诺的「趋势／复盘一族分住两件」这次只走完「复盘」这一半：`buildRecapDoc`（运动复盘）
 * 与 `buildTrendDoc`（运动趋势）是 #454 刚换过版式的融合版式，属另一半，留给收口票。
 */

/* ── 运动趋势（exercise_trend.html 对照：#454 融合版式：每日折线＋每周柱图＋逐日表） ── */

/** 趋势页的来源句（读页自己的取数面）。 */
const TREND_SOURCE = 'exercise_log（本窗未删除的行）';

/** 逐日表上限：超出即印截断（页眉条数与可见行数同口径，沿 R3 的截断明示）。 */
const TREND_ROWS_CAP = 100;

export function buildTrendDoc(v: TrendView): string {
  const hasRows = v.activeDays > 0;
  const shown = Math.min(v.days.length, TREND_ROWS_CAP);
  const truncated = v.days.length > TREND_ROWS_CAP;
  const sessions = v.days.reduce((n, d) => n + d.sessions, 0);
  const cards: Card[] = [
    windowCard(v.start, v.end, '时序视角（旧 --days 30 默认；本键 start/end 显式窗）'),
    {
      id: 'sec-figures',
      label: '核心数字',
      html: renderKpiGrid([
        { label: '运动天数', value: String(v.activeDays), unit: '天', detail: v.start + ' ~ ' + v.end },
        { label: '总时长', value: numUnit(v.totalMinutes, '分钟') },
        { label: '总消耗', value: numUnit(v.totalBurned, '卡') },
        {
          label: '峰值',
          value: v.peak === null ? '—' : numUnit(v.peak.burned, '卡'),
          detail: v.peak === null ? '本窗无记录' : '单日最高 ' + v.peak.date,
        },
      ]),
    },
  ];
  if (hasRows) {
    // 每日消耗折线：消耗实线（共享刻度）＋时长虚线（`ownScale` 独立刻度，两套刻度互不压平）；
    // 没有记录的日子当场是 `null`（不是 0），点自然断开——「空缺断点不断 0」由数据结构保证。
    const burnItems = v.days.map((d) => ({ label: d.date.slice(5), value: d.burned }));
    const minItems = v.days.map((d) => ({ label: d.date.slice(5), value: d.minutes }));
    cards.push({
      id: 'sec-line',
      label: '每日消耗折线',
      html: renderChartBlock({
        kind: 'line',
        title: '每日消耗＋时长（消耗实线 · 时长虚线，两套刻度）',
        input: {
          items: burnItems,
          options: {
            series: [
              { name: '消耗(卡)', items: burnItems },
              { name: '时长(分)', items: minItems, dashed: true, ownScale: true },
            ],
          },
        },
      }),
    });
    cards.push({
      id: 'sec-weekly',
      label: '每周频次',
      html: renderChartBlock({
        kind: 'bar',
        title: '每周运动频次',
        input: { items: v.weekly.map((w) => ({ label: w.weekStart.slice(5) + '周', value: w.sessions })) },
      }),
    });
    cards.push({
      id: 'sec-daily',
      label: '逐日明细',
      html: renderDataTable({
        columns: [
          { key: 'date', label: '日期' },
          { key: 'sessions', label: '次数', align: 'right' },
          { key: 'minutes', label: '时长', align: 'right' },
          { key: 'burned', label: '消耗', align: 'right' },
        ],
        // 空缺日（窗内没有记录的那天）一律「—」：0 次／0 卡都不是那天的实话。
        rows: v.days.slice(0, TREND_ROWS_CAP).map((d) => ({
          date: d.date,
          sessions: d.sessions === 0 ? '—' : d.sessions + ' 次',
          minutes: numUnit(d.minutes, '分钟'),
          burned: numUnit(d.burned, '卡'),
        })),
        caption: '逐日明细（共 ' + v.days.length + ' 天；本表列出 ' + shown + ' 天'
          + (truncated ? '——已截断，只列前 ' + TREND_ROWS_CAP + ' 天' : '，未截断')
          + '；空缺日「—」不断 0）',
      }),
    });
  } else {
    cards.push({
      id: 'sec-empty',
      label: '逐日明细',
      html: emptyGuide({ icon: '📈', text: '本窗还没有运动记录', hint: '说「记运动」就能记下第一笔' }),
    });
  }
  cards.push(sourceCard(TREND_SOURCE, v.start, v.end, sessions));
  return assembleDocPage({
    docTitle: '卡路里·运动趋势',
    title: '运动趋势 ' + v.start + ' ~ ' + v.end,
    eyebrow: '运动 · 趋势',
    subtitle: '每日消耗与时长 ＋ 每周频次 ＋ 逐日明细（空缺日留空，不补 0）',
    content: finishPage(cards, '口径：折线与逐日表按窗口每一天画一行（没有记录的日子留空「—」，不补 0）；'
      + '次数＝本窗记录条数；时长＝分钟、消耗＝卡；逐日表最多列 ' + TREND_ROWS_CAP + ' 天，超出即印截断'
      + '（页眉的天数与表里可见行数同口径）。', '运动趋势', {
      activeDays: v.activeDays, totalMinutes: v.totalMinutes,
      totalBurned: v.totalBurned, peakBurned: v.peak === null ? null : v.peak.burned,
    }),
    charts: hasRows,
    printable: true,
  });
}
