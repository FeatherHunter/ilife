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

/** 0…100 的占比 → 轨道上的百分数串（形态 `rail` 用）。 */
const pct = (v: number): string => plainNum(v) + '%';

/** 一根轴上的一个顶点：角度由序号给、半径由读数给（唯一的映射在 `scale.ts`，这里只封一层形状）。 */
const polar = (index: number, count: number, radius: number): RadarProfileVertexModel => {
  const p = polarOf(index, count, radius);
  return { x: p.x, y: p.y };
};

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
  const paired = axes.filter((a) => a.score !== null && a.past !== null);
  const meanPairedNow = meanOk(paired.map((a) => a.score as number));
  const meanPairedPast = meanOk(paired.map((a) => a.past as number));
  const deltaOfMeans = meanPairedNow === null || meanPairedPast === null ? null : meanPairedNow - meanPairedPast;
  const tail = '本期平均 ' + (meanNow === null ? RADAR_PROFILE_MISSING : plainNum(meanNow)) + ' 分'
    + (deltaOfMeans === null ? ''
      : (deltaOfMeans === 0 ? '，与上期持平'
        : '，比上期' + (deltaOfMeans > 0 ? '高 ' : '低 ') + plainNum(Math.abs(deltaOfMeans)) + ' 分'));
  const legend: RadarProfileLegendItemModel[] = [{
    slot: 'axline', kind: 'now', text: '本期' + (c.stamp === undefined ? '' : '（' + c.stamp + '）'),
  }];
  if (hasPast) {
    legend.push({ slot: 'axline', kind: 'past', text: '上期' + (c.pastStamp === undefined ? '' : '（' + c.pastStamp + '）') });
  }
  const tableHead = ['轴（满分 100）', '本期'].concat(hasPast ? ['上期', '差'] : []);
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
    note: c.noteIn ?? '口径：每根轴各自 0 到 100 分，轴与轴不是同一个单位，所以只能比形状、不能比面积。'
      + '网格三级是里圈 33 分，中圈 66 分，外圈 100 分。实线是本期，虚线是上期，两条叠在一起的地方更深。'
      + '缺测的轴整根不画，读数写 ' + RADAR_PROFILE_MISSING + '，不当 0 分算。',
    ariaLabel: count + ' 根轴的雷达图：' + axisSentences(axes, hasPast) + '。'
      + (hasPast ? '上期那条轮廓更小或更大都要按轴逐根看，形状差得多就是偏科。' : '实线轮廓就是本期形状。'),
    extraClass: c.extraClass,
    labels: axes.map((a, i) => labelModel(a, i, count)),
    rings,
    spokes: spokesOf(axes, count),
    pastPoints: hasPast ? polygonPoints(pasts, radiusOf(100)) : '',
    nowPoints: polygonPoints(scores, radiusOf(100)),
    nowDots,
    scaleItems: RADAR_PROFILE_RINGS.map((v, i) => ['里圈', '中圈', '外圈'][i] + ' ' + plainNum(v) + ' 分'),
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
    .map((g) => ({ label: g.label, scoreText: plainNum(g.score) + ' 分', diffText: '差 ' + plainNum(g.diff) + ' 分' }));
  const present = axes.filter((a) => a.score !== null);
  const mean = meanOk(present.map((a) => a.score as number));
  const legend: RadarProfileLegendItemModel[] = [{
    slot: 'swatch', kind: 'ok', text: '达标 ' + String(okCount) + ' 根轴', goalNum: plainNum(goal),
  }];
  if (warnCount > 0) legend.push({ slot: 'swatch', kind: 'warn', text: '未达标 ' + String(warnCount) + ' 根轴' });
  return {
    form: 'wedge',
    title: c.title,
    stamp: c.stamp,
    tail: '平均 ' + (mean === null ? RADAR_PROFILE_MISSING : plainNum(mean)) + ' 分，达标 ' + String(okCount) + ' 根轴',
    note: c.noteIn ?? '口径：每根扇区的张角固定，半径比例于得分，所以读的是哪几根伸得远，不是面积。'
      + '虚线圆环是达标线，判据画在图上、不挂角标。没到环的逐根给出差的分数，不靠颜色表示未达标。'
      + '缺测的轴不落扇区，读数写 ' + RADAR_PROFILE_MISSING + '，不当 0 分算。',
    ariaLabel: '极区扇图：半径比例于得分，达标线 ' + plainNum(goal) + ' 分。' + axisSentences(axes, false) + '。'
      + '达标 ' + String(okCount) + ' 根，未达标 ' + String(warnCount) + ' 根。',
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
  if (axis.score === null) return { kind: 'missing', text: RADAR_PROFILE_MISSING + ' 未测' };
  if (axis.band === undefined) return { kind: 'none', text: '未给基准带' };
  const score = round2(axis.score);
  const low = round2(axis.band.low);
  const high = round2(axis.band.high);
  if (score < low) return { kind: 'low', text: '▼ 低于带 ' + plainNum(round2(low - score)) + ' 分' };
  if (score > high) return { kind: 'high', text: '▲ 高于带 ' + plainNum(round2(score - high)) + ' 分' };
  return { kind: 'in', text: '✓ 在带内' };
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
      bandText: a.band === undefined ? undefined : '带 ' + plainNum(a.band.low) + '–' + plainNum(a.band.high) + ' 分',
    };
  });
  const countIn = rows.filter((r) => r.verdictKind === 'in').length;
  const countOut = rows.filter((r) => r.verdictKind === 'low' || r.verdictKind === 'high').length;
  const countNone = rows.filter((r) => r.verdictKind === 'none').length;
  const countMissing = rows.filter((r) => r.verdictKind === 'missing').length;
  const tail = '在带内 ' + String(countIn) + ' 根轴，出带 ' + String(countOut) + ' 根轴'
    + (countNone === 0 ? '' : '，未给带 ' + String(countNone) + ' 根轴')
    + (countMissing === 0 ? '' : '，未测 ' + String(countMissing) + ' 根轴');
  return {
    form: 'rail',
    title: c.title,
    stamp: c.stamp,
    tail,
    note: c.noteIn ?? '口径：每一行的轨道都是从 0 到 100 分。色带是这一根的基准区间，竖线是当前值，'
      + '读数贴在竖线旁边，不必围着圈子找。判定只给不在带内的那几根着色，在带内的走灰字。'
      + '缺测的那根不画竖线，判定写未测，不当 0 分算。',
    ariaLabel: '展平成轴表的画像：' + rows.map((r) => r.label + ' '
      + (r.bandText === undefined ? '' : r.bandText + '，') + r.verdict).join('。') + '。',
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
