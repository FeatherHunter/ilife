/** radar-profile · **三形态的装配**（本件第二份源码件：`model.ts` 校验过的入参在这里变成模型的形状）。
 *
 *  为什么有这一件：本件一次落三个形态（多边形雷达／极区扇图／展平轴表），校验 ＋ 装配 ＋ 算数挤在一件里
 *  会超本包告警线 350（`packages/base-render/AGENTS.md`）。切口按「入参面／装配面／算数面」分：
 *   · `model.ts`：入参校验与归一化入口（`badInput()` 全在那边）；
 *   · 本件：三个骨架各自的装配（顶点、扇区、行的位置与那句算出来的话）；
 *   · `fields.ts`：模型类型与逐轴的小件（读数文字、位置、辐条、轴名、无障碍句）；
 *   · `scale.ts`：角度、极坐标、半径映射、路径与数字格式（纯算数，本件调它）。
 *
 *  两条口径：
 *   1. **能算的都算出来**：尾句、图例、平均分、差多少分、判定文字都在这里定；
 *      `render.ts` 只负责拼标记，算术一个字都不写。
 *   2. **可见文本的用词纪律**：本件生成的字里**不出现** `·`／`；`／并列顿号连排（仓库的分隔符门
 *      `test/separator-probe.mjs` R1–R3 对可见文本零豁免）；句间一律用 `，` 与 `。`——
 *      `，` 在那一门里是行文标点，不算并列分隔符。
 */
import { RADAR_PROFILE_MISSING, RADAR_PROFILE_RINGS } from './attrs.js';
import {
  axisSentences,
  labelModel,
  radiusOf,
  spokesOf,
  type RadarProfileAxisModel,
  type RadarProfileCommon,
  type RadarProfileGapModel,
  type RadarProfileLegendItemModel,
  type RadarProfileModel,
  type RadarProfileRailRowModel,
  type RadarProfileRingModel,
  type RadarProfileTableRowModel,
  type RadarProfileVertexModel,
  type RadarProfileWedgeModel,
} from './fields.js';
import { meanOk, plainNum, polygonPoints, polarOf, round2, sectorArcPath, sectorPath } from './scale.js';
import { m } from '../../entries/index.js';

/** 0…100 的占比 → 轨道上的百分数串（形态 `rail` 用）。 */
const pct = (v: number): string => plainNum(v) + '%';

/** 一根轴上的一个顶点：角度由序号给、半径由读数给（唯一的映射在 `scale.ts`，这里只封一层形状）。 */
const polar = (index: number, count: number, radius: number): RadarProfileVertexModel => {
  const p = polarOf(index, count, radius);
  return { x: p.x, y: p.y };
};

/** 轴表的表头（有没有上期一行取决于数据）。 */
function tableHeadOf(hasPast: boolean): string[] {
  return hasPast ? [m('base-render.components-radar-profile-forms.c001'), m('base-render.components-radar-profile-forms.c002'), m('base-render.components-radar-profile-forms.c003'), m('base-render.components-radar-profile-forms.c004')] : [m('base-render.components-radar-profile-forms.c005'), m('base-render.components-radar-profile-forms.c006')];
}

/** 三圈的字（里→中→外）。 */
function ringWord(index: number): string {
  return index === 0 ? m('base-render.components-radar-profile-forms.c007') : index === 1 ? m('base-render.components-radar-profile-forms.c008') : m('base-render.components-radar-profile-forms.c009');
}

/* ── 形态 `polygon`：多边形雷达（本期／上期两条轮廓） ─────────────────── */

/** 形态 `polygon`：三圈网格 ＋ 两条轮廓 ＋ 顶点 ＋ 读数表 ＋ 刻度条。 */
export function polygonModel(c: RadarProfileCommon, axes: readonly RadarProfileAxisModel[]): RadarProfileModel {
  const count = axes.length;
  const scores = axes.map((a) => a.score);
  const pasts = axes.map((a) => a.past);
  const hasPast = pasts.some((v) => v !== null);
  const present = axes.filter((a) => a.score !== null);
  /* 网格三圈：**半径与刻度是同一份真值**（同一支 `radiusOf()` 从印出来的三个数算）。 */
  const rings: RadarProfileRingModel[] = RADAR_PROFILE_RINGS.map((value) => ({ value, radius: radiusOf(value) }));
  const nowDots: RadarProfileVertexModel[] = present
    .map((a) => polar(axes.indexOf(a), count, radiusOf(a.score as number)));
  const meanNow = meanOk(present.map((a) => a.score as number));
  const pastNote = hasPast
    ? m('base-render.components-radar-profile-forms.c010')
    : m('base-render.components-radar-profile-forms.c011');
  const paired = axes.filter((a) => a.score !== null && a.past !== null);
  const meanPairedNow = meanOk(paired.map((a) => a.score as number));
  const meanPairedPast = meanOk(paired.map((a) => a.past as number));
  const deltaOfMeans = meanPairedNow === null || meanPairedPast === null ? null : meanPairedNow - meanPairedPast;
  const deltaTail = deltaOfMeans === null
    ? ''
    : deltaOfMeans === 0
      ? m('base-render.components-radar-profile-forms.c012')
      : deltaOfMeans > 0
        ? m('base-render.components-radar-profile-forms.c013', { p0: String(plainNum(Math.abs(deltaOfMeans))) })
        : m('base-render.components-radar-profile-forms.c014', { p0: String(plainNum(Math.abs(deltaOfMeans))) });
  const tail = m('base-render.components-radar-profile-forms.c015', {
    p0: String(meanNow === null ? RADAR_PROFILE_MISSING : plainNum(meanNow)),
    p1: String(deltaTail),
  });
  const stampTail = c.stamp === undefined ? '' : '（' + c.stamp + '）';
  const legend: RadarProfileLegendItemModel[] = [{
    slot: 'axline', kind: 'now', text: m('base-render.components-radar-profile-forms.c016', { p0: String(stampTail) }),
  }];
  if (hasPast) {
    const pastStampTail = c.pastStamp === undefined ? '' : '（' + c.pastStamp + '）';
    legend.push({ slot: 'axline', kind: 'past', text: m('base-render.components-radar-profile-forms.c017', { p0: String(pastStampTail) }) });
  }
  const tableHead = tableHeadOf(hasPast);
  const tableRows: RadarProfileTableRowModel[] = axes.map((a) => ({
    name: a.label, nowText: a.valueText, pastText: a.pastText, deltaText: a.deltaText, dir: a.dir,
  }));
  return {
    form: 'polygon',
    title: c.title,
    stamp: c.stamp,
    tail,
    /* 三个圈数用「，」分段，不用并排顿号：`、` 连排三段会被仓库的分隔符门（`test/separator-probe.mjs`
       的 R3）判红——它是"该做版式"的信号，不是一句人话该有的写法。 */
    note: c.noteIn ?? m('base-render.components-radar-profile-forms.c018', { p0: String(RADAR_PROFILE_MISSING) }),
    ariaLabel: m('base-render.components-radar-profile-forms.c019', {
      p0: String(count),
      p1: String(axisSentences(axes, hasPast)),
      p2: String(pastNote),
    }),
    extraClass: c.extraClass,
    labels: axes.map((a, i) => labelModel(a, i, count)),
    rings,
    spokes: spokesOf(axes, count),
    pastPoints: hasPast ? polygonPoints(pasts, radiusOf(100)) : '',
    nowPoints: polygonPoints(scores, radiusOf(100)),
    nowDots,
    scaleItems: RADAR_PROFILE_RINGS.map((v, i) => m('base-render.components-radar-profile-forms.c020', { p0: String(ringWord(i)), p1: String(plainNum(v)) })),
    tableHead,
    tableRows,
    wedges: [],
    goalRadius: 0,
    goalNumText: '',
    hubText: '',
    gaps: [],
    legend,
    rows: [],
  };
}

/* ── 形态 `wedge`：极区扇图（半径＝得分，达标环） ─────────────────────── */

/** 形态 `wedge`：逐根扇区（半径＝得分）＋ 外沿弧 ＋ 达标环 ＋ 平均分 ＋ 未达标点名。 */
export function wedgeModel(c: RadarProfileCommon, axes: readonly RadarProfileAxisModel[], goal: number): RadarProfileModel {
  const count = axes.length;
  /* **判定与印出来的数是同一个数**：`plainNum()` 印的是 `round2()` 之后的值，比较前先取整到这一位
     ——否则 79.999 印成「80 分」却被判未达标、点名写出「差 0 分」（读数与判定自相矛盾）。 */
  const goalNum = round2(goal);
  const wedges: RadarProfileWedgeModel[] = [];
  const dots: RadarProfileVertexModel[] = [];
  const shortfalls: { readonly label: string; readonly score: number; readonly diff: number }[] = [];
  axes.forEach((a, index) => {
    if (a.score === null) return;
    const score = round2(a.score);
    const r = radiusOf(score);
    wedges.push({ path: sectorPath(index, count, r), arc: sectorArcPath(index, count, r), ok: score >= goalNum, score });
    dots.push(polar(index, count, r));
    /* 点名那一行的轴名**与扇区同一趟装配**（轴名与得分必须同源：早先版本拿"有读数扇区的序号"
       去索引全部轴，缺一根就读成「A 50 分」而真值是「B 50 分」——清单与无障碍名互相矛盾）。 */
    shortfalls.push({ label: a.label, score, diff: round2(goalNum - score) });
  });
  const okCount = wedges.filter((w) => w.ok).length;
  const warnCount = wedges.length - okCount;
  /* 未达标逐根点名：**先给差得最多的那根**（差多少分写成字，不靠颜色）。 */
  const gaps: RadarProfileGapModel[] = shortfalls
    .filter((g) => g.diff > 0)
    .sort((a, b) => b.diff - a.diff)
    .map((g) => ({ label: g.label, scoreText: m('base-render.components-radar-profile-forms.c021', { p0: String(plainNum(g.score)) }), diffText: m('base-render.components-radar-profile-forms.c022', { p0: String(plainNum(g.diff)) }) }));
  const present = axes.filter((a) => a.score !== null);
  const mean = meanOk(present.map((a) => a.score as number));
  const legend: RadarProfileLegendItemModel[] = [{
    slot: 'swatch', kind: 'ok', text: m('base-render.components-radar-profile-forms.c023', { p0: String(String(okCount)) }), goalNum: plainNum(goal),
  }];
  if (warnCount > 0) legend.push({ slot: 'swatch', kind: 'warn', text: m('base-render.components-radar-profile-forms.c024', { p0: String(String(warnCount)) }) });
  return {
    form: 'wedge',
    title: c.title,
    stamp: c.stamp,
    tail: m('base-render.components-radar-profile-forms.c025', {
      p0: String(mean === null ? RADAR_PROFILE_MISSING : plainNum(mean)),
      p1: String(String(okCount)),
    }),
    note: c.noteIn ?? m('base-render.components-radar-profile-forms.c026', { p0: String(RADAR_PROFILE_MISSING) }),
    ariaLabel: m('base-render.components-radar-profile-forms.c027', {
      p0: String(plainNum(goal)),
      p1: String(axisSentences(axes, false)),
      p2: String(String(okCount)),
      p3: String(String(warnCount)),
    }),
    extraClass: c.extraClass,
    labels: axes.map((a, i) => labelModel(a, i, count)),
    rings: [],
    spokes: spokesOf(axes, count),
    pastPoints: '',
    nowPoints: '',
    nowDots: dots,
    scaleItems: [],
    tableHead: [],
    tableRows: [],
    wedges,
    goalRadius: radiusOf(goal),
    goalNumText: plainNum(goal),
    hubText: mean === null ? RADAR_PROFILE_MISSING : plainNum(mean),
    gaps,
    legend,
    rows: [],
  };
}

/* ── 形态 `rail`：展平成轴表（基准带＋我的位置） ─────────────────────── */

/** 一行的判定：在带内走灰字（状态做减法），出带才点名，未给带与未测各写各的字。
 *  **比较与差值都用印出来的那个数**（`plainNum()` 的粒度＝两位小数）：读数印「80」而判定写
 *  「▼ 低于带 0 分」是自相矛盾的读数，读者没法照它决定要不要管这一根。 */
function verdictOf(axis: RadarProfileAxisModel): {
  readonly kind: RadarProfileRailRowModel['verdictKind'];
  readonly text: string;
} {
  if (axis.score === null) return { kind: 'missing', text: m('base-render.components-radar-profile-forms.c028', { p0: String(RADAR_PROFILE_MISSING) }) };
  if (axis.band === undefined) return { kind: 'none', text: m('base-render.components-radar-profile-forms.c029') };
  const score = round2(axis.score);
  const low = round2(axis.band.low);
  const high = round2(axis.band.high);
  if (score < low) return { kind: 'low', text: m('base-render.components-radar-profile-forms.c030', { p0: String(plainNum(round2(low - score))) }) };
  if (score > high) return { kind: 'high', text: m('base-render.components-radar-profile-forms.c031', { p0: String(plainNum(round2(score - high))) }) };
  return { kind: 'in', text: m('base-render.components-radar-profile-forms.c032') };
}

/** 形态 `rail`：每根轴一行（轴名 ＋ 轨道 ＋ 判定），轨道上色带是基准区间、竖线是当前值。 */
export function railModel(c: RadarProfileCommon, axes: readonly RadarProfileAxisModel[]): RadarProfileModel {
  const count = axes.length;
  const rows: RadarProfileRailRowModel[] = axes.map((a) => {
    const v = verdictOf(a);
    return {
      label: a.label,
      note: a.note,
      at: a.at === null ? undefined : pct(a.at),
      valueText: a.valueText,
      b1: a.band === undefined ? undefined : pct(a.band.low),
      b2: a.band === undefined ? undefined : pct(a.band.high),
      verdict: v.text,
      verdictKind: v.kind,
      bandText: a.band === undefined ? undefined : m('base-render.components-radar-profile-forms.c033', {
        p0: String(plainNum(a.band.low)),
        p1: String(plainNum(a.band.high)),
      }),
    };
  });
  const bandPart = (row: RadarProfileRailRowModel): string => (row.bandText === undefined ? '' : row.bandText + '，');
  const rowsSpeech = rows.map((row) => row.label + ' ' + bandPart(row) + row.verdict).join('。');
  const countIn = rows.filter((r) => r.verdictKind === 'in').length;
  const countOut = rows.filter((r) => r.verdictKind === 'low' || r.verdictKind === 'high').length;
  const countNone = rows.filter((r) => r.verdictKind === 'none').length;
  const countMissing = rows.filter((r) => r.verdictKind === 'missing').length;
  const noneTail = countNone === 0 ? '' : m('base-render.components-radar-profile-forms.c034', { p0: String(String(countNone)) });
  const missingTail = countMissing === 0 ? '' : m('base-render.components-radar-profile-forms.c035', { p0: String(String(countMissing)) });
  const tail = m('base-render.components-radar-profile-forms.c036', {
    p0: String(String(countIn)),
    p1: String(String(countOut)),
    p2: String(noneTail),
    p3: String(missingTail),
  });
  return {
    form: 'rail',
    title: c.title,
    stamp: c.stamp,
    tail,
    note: c.noteIn ?? m('base-render.components-radar-profile-forms.c037'),
    ariaLabel: m('base-render.components-radar-profile-forms.c038', { p0: String(rowsSpeech) }),
    extraClass: c.extraClass,
    labels: axes.map((a, i) => labelModel(a, i, count)),
    rings: [],
    spokes: [],
    pastPoints: '',
    nowPoints: '',
    nowDots: [],
    scaleItems: [],
    tableHead: [],
    tableRows: [],
    wedges: [],
    goalRadius: 0,
    goalNumText: '',
    hubText: '',
    gaps: [],
    legend: [],
    rows,
  };
}
