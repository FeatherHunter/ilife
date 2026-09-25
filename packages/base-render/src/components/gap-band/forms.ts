/** gap-band · **两个骨架的装配**（本件第三份源码件：`model.ts` 校验过的入参在这里变成模型的形状）。
 *
 *  为什么有这一件：一次落两档形态，校验 ＋ 装配 ＋ 算数挤在一件里会超本包告警线 350
 *  （`packages/base-render/AGENTS.md`）。切口与兄弟件 `spread-dist/forms.ts` 同：本件不碰 `any`
 *  （入参已由 `model.ts` 校验过），也不产标记（`render.ts` 只拼标记，算术一个字都不写）。
 *
 *  —— 两档 ——
 *   · `band` 连续差值带：实际折线去、计划线回的那块面积就是差，两端连成一片；
 *   · `deviation` 每日偏差柱：零位线就是目标，柱朝上超了、朝下还差。
 *
 *  三条口径：
 *   1. **能算的都算出来**：刻度文字、计划线位置、折线与带子的 SVG 坐标、锚点位置、柱高百分比、
 *      卡头那句、口径句与无障碍名都在这里定 —— `render.ts` 里没有一个算术。
 *   2. **可见文本的用词纪律**：本件生成的字里**不出现** `·`／`；`／并列顿号／`／`／`｜`／`|`／`＋`
 *      —— 仓库的分隔符门（`test/separator-probe.mjs` R1–R3）对可见文本零豁免。
 *      故正数补 ASCII `+`（全角 `＋` 才是并列分隔符），负数用 `−`，日子之间用 `，`。
 *   3. **偏差是算出来的**：B 档入参只给绝对读数 ＋ 目标，柱高、柱上那个数、累计净差全从这两样出 ——
 *      调用方手写的偏差一旦和读数对不上，图就同时说两句话。
 */
import {
  GAP_BAND_DEV_MAX_PCT,
  type GapBandDay,
  type GapBandForm,
} from './attrs.js';
import { niceAxis, plainText, round2, signedText, tickTexts, topPct, unitPart, type Axis } from './scale.js';

/* ── 内部类型（`render.ts` 只吃它们；`model.ts` 只把类型名再报一次给出口） ── */

/** 一枚纵轴刻度：文字 ＋ 它那个值 ＋ **它自己那个值的纵向位置**（位置从 `scale.ts` 的唯一映射出，
 *  不是靠"首末对齐 ＋ 等距"推出来的 —— 后者让中间那枚随行高漂走，判据也量不到）。 */
export interface GapBandTickModel {
  readonly text: string;
  readonly value: number;
  /** 从下往上的百分比（＝`upPct(value)`，与计划线、折线顶点、带子多边形同一支映射）。 */
  readonly bottomPct: number;
}

/** 图内锚点：哪天 ＋ 差多少 ＋ 画在哪（`leftPct` 是精确的列心；收边由样式按列心做，
 *  见 `style.ts` 锚点那一段）。 */
export interface GapBandAnchorModel {
  readonly day: string;
  readonly diff: string;
  readonly leftPct: number;
  /** `hi` 锚点画在点的**下方**（行内 `--at` → 样式里 `top`）、`lo` 与 `flat` 画在点的**上方**
   *  （行内 `bottom`）—— 两枚都朝图里长，四条边收在图区内。 */
  readonly kind: 'hi' | 'lo' | 'flat';
  readonly topPct: number;
  readonly bottomPct: number;
}

/** 横轴一枚日子：日子名 ＋ 那天的绝对读数（已写成给人看的样子，不带单位，单位在轴顶）。 */
export interface GapBandXModel {
  readonly day: string;
  readonly valueText: string;
}

/** 图例的一项：形（`is-*`）＋ 字。 */
export interface GapBandLegendItem {
  readonly kind: 'line' | 'plan' | 'band' | 'up' | 'down' | 'zero';
  readonly text: string;
}

/** 形态 `band` 的内部类型：SVG 两串坐标 ＋ 计划线位置 ＋ 锚点 ＋ 净差。 */
export interface GapBandBandModel {
  readonly form: 'band';
  readonly title: string;
  readonly stamp?: string;
  /** 卡头右端那句（计划值：`计划 7.5 h`）。 */
  readonly tail: string;
  readonly note: string;
  readonly ariaLabel: string;
  readonly ticks: readonly GapBandTickModel[];
  /** 实际折线的 SVG 坐标串（`x,y x,y …`，`render.ts` 原样写进 `points`）。 */
  readonly linePoints: string;
  /** 带子的 SVG 坐标串（折线去、计划线回，两端连成一片）。 */
  readonly bandPoints: string;
  /** 计划线从上往下的百分比（与刻度同一份轴域，行内 `top` 就写它）。 */
  readonly planTopPct: number;
  /** 计划线右端那枚标注（`计划 7.5 h`）。 */
  readonly planText: string;
  readonly anchors: readonly GapBandAnchorModel[];
  readonly xLabels: readonly GapBandXModel[];
  readonly sumText: string;
  readonly sumDesc: string;
  readonly legend: readonly GapBandLegendItem[];
  readonly extraClass?: string;
}

/** 一天的偏差柱：柱上那个数 ＋ 高度 ＋ 朝向。 */
export interface GapBandDevBarModel {
  readonly label: string;
  /** 柱上那个数（一律带符号：`+400`／`−700`／`0`）。 */
  readonly devText: string;
  /** 柱高（占图区总高的百分比，与零位对称的那把尺）。 */
  readonly heightPct: number;
  readonly up: boolean;
  readonly title: string;
}

/** 形态 `deviation` 的内部类型：零位恒在 50%，柱高与最大偏差同比例。 */
export interface GapBandDevModel {
  readonly form: 'deviation';
  readonly title: string;
  readonly stamp?: string;
  /** 卡头右端那句（朝向说明：`朝上超了目标`）。 */
  readonly tail: string;
  readonly note: string;
  readonly ariaLabel: string;
  readonly bars: readonly GapBandDevBarModel[];
  readonly sumText: string;
  readonly sumDesc: string;
  readonly legend: readonly GapBandLegendItem[];
  readonly extraClass?: string;
}

/** 内部类型：每个字段都已校验、已归一、已算好。 */
export type GapBandModel = GapBandBandModel | GapBandDevModel;

/** 两档共用的那几个字段（校验一次、两个骨架都用）。 */
export interface GapBandCommon {
  readonly title: string;
  readonly unit?: string;
  readonly stamp?: string;
  readonly noteIn?: string;
  readonly extraClass?: string;
}

/* ── 小工具（本件内部用） ─────────────────────────────────────────── */

/** 第 i 列（共 n 列）的中心横坐标（百分比）：SVG 顶点、横轴日子与锚点都从它出 —— 三处各写一套必然错位。
 *  首末两列的锚点半枚标签会出框 —— 收敛落在样式里（`left: clamp(70px, var(--ax), …)`），
 *  模型只给精确的列心（判据按这支公式验）。 */
const xPct = (i: number, n: number): number => round2(((i + 0.5) / n) * 100);

/** 锚点横坐标（＝它那一列的中心，精确值；窄档下的收边由样式的 `clamp` 做）。 */
const anchorX = (i: number, n: number): number => xPct(i, n);

/** 一段读数的写法（数字 ＋ 单位）。 */
const reading = (v: number, unit: string | undefined): string => plainText(v) + unitPart(unit);

/** 差的短写法（锚点里那枚：`多 0.9 h`／`少 1.0 h`／`和计划持平`）。 */
const diffShort = (d: number, unit: string | undefined): string => (d > 0
  ? '多 ' + reading(d, unit)
  : (d < 0 ? '少 ' + reading(Math.abs(d), unit) : '和计划持平'));

/* ── A 档：连续差值带 ─────────────────────────────────────────────── */

/** 形态 `band`：实际折线去、计划线回的那块面积 ＋ 两枚图内锚点 ＋ 净差行。 */
export function bandModel(c: GapBandCommon, plan: number, days: readonly GapBandDay[]): GapBandBandModel {
  const values = days.map((d) => d.value);
  const axis: Axis = niceAxis(Math.min(plan, ...values), Math.max(plan, ...values));
  const n = days.length;
  const planY = topPct(plan, axis);
  const ys = values.map((v) => topPct(v, axis));
  const linePoints = values.map((_, i) => String(xPct(i, n)) + ',' + String(ys[i])).join(' ');
  const bandPoints = linePoints + ' '
    + values.map((_, i) => String(xPct(n - 1 - i, n)) + ',' + String(planY)).join(' ');
  /* 两枚锚点：差最大与最小的那两天（差相等时只出一枚，不叠在一起）。 */
  const diffs = values.map((v) => v - plan);
  let hi = 0;
  let lo = 0;
  for (let i = 1; i < diffs.length; i += 1) {
    if (diffs[i] > diffs[hi]) hi = i;
    if (diffs[i] < diffs[lo]) lo = i;
  }
  const anchors: GapBandAnchorModel[] = hi === lo
    ? [{
      day: days[hi].label, diff: diffShort(diffs[hi], c.unit), leftPct: anchorX(hi, n),
      kind: 'flat', topPct: ys[hi], bottomPct: round2(100 - ys[hi]),
    }]
    : [
      {
        day: days[hi].label, diff: diffShort(diffs[hi], c.unit), leftPct: anchorX(hi, n),
        kind: 'hi', topPct: ys[hi], bottomPct: round2(100 - ys[hi]),
      },
      {
        day: days[lo].label, diff: diffShort(diffs[lo], c.unit), leftPct: anchorX(lo, n),
        kind: 'lo', topPct: ys[lo], bottomPct: round2(100 - ys[lo]),
      },
    ];
  /* 净差：几天合起来比计划多还是少、几天没达计划（原型定稿版底部那一行）。
     先归一到两位小数再比零 —— 浮点余数（如 -4.4e-16）不是"差"，不能进"少 0 h"那一支。 */
  const net = Number(diffs.reduce((a, d) => a + d, 0).toFixed(2));
  const below = diffs.filter((d) => d < 0).length;
  const sumText = signedText(net) + unitPart(c.unit);
  const sumDesc = net === 0
    ? '净差 0' + unitPart(c.unit) + '，' + String(n) + ' 天合起来和计划持平'
    : '净差，' + String(n) + ' 天合起来比计划' + (net < 0 ? '少 ' : '多 ')
      + reading(Math.abs(net), c.unit) + '，'
      + (below === 0 ? String(n) + ' 天全达计划' : String(below) + ' 天没达计划');
  const dayVals = days.map((d) => d.label + ' ' + plainText(d.value)).join('，');
  const extreme = hi === lo
    ? '每天和计划持平'
    : '最深的一处是' + days[lo].label + diffShort(diffs[lo], c.unit)
      + '，最高的一处是' + days[hi].label + diffShort(diffs[hi], c.unit);
  return {
    form: 'band',
    title: c.title,
    stamp: c.stamp,
    tail: '计划 ' + reading(plan, c.unit),
    note: c.noteIn ?? '口径：带子是实际线和计划线之间的面积，不填 0 基线，填到 0 就看不出差了。'
      + '带子两端连成一片，不按天切开。最深和最高两处读数挂在图上，计划线穿通整块，刻度值贴在刻度上。',
    ariaLabel: '差值带：计划 ' + reading(plan, c.unit) + '，' + dayVals
      + '，带子是实际线和计划线之间的面积，' + extreme + '。',
    ticks: tickTexts(axis, c.unit).map((text, i) => {
      /* 刻度的值与位置（从大往小，与文字同一支量化）：位置＝`upPct(值)`，
         于是"刻度文字说 7"与"7 画在哪"是同一份真值。判据从印出来的文字反推轴域、逐枚对账。 */
      const value = Number((axis.hi - axis.step * i).toFixed(axis.decimals));
      return { text, value, bottomPct: round2(100 - topPct(value, axis)) };
    }),
    linePoints,
    bandPoints,
    planTopPct: planY,
    planText: '计划 ' + reading(plan, c.unit),
    anchors,
    xLabels: days.map((d) => ({ day: d.label, valueText: plainText(d.value) })),
    sumText,
    sumDesc,
    legend: [
      { kind: 'line', text: '实际线（2px 实线）' },
      { kind: 'plan', text: '计划线（虚线）' },
      { kind: 'band', text: '带子是两线之差' },
    ],
    extraClass: c.extraClass,
  };
}

/* ── B 档：每日偏差柱 ─────────────────────────────────────────────── */

/** 形态 `deviation`：零位线就是目标，柱朝上超了、朝下还差，柱上数字一律带符号。 */
export function deviationModel(
  c: GapBandCommon, target: number, days: readonly GapBandDay[],
): GapBandDevModel {
  const n = days.length;
  const devs = days.map((d) => d.value - target);
  const maxAbs = Math.max(0, ...devs.map((d) => Math.abs(d)));
  const bars: GapBandDevBarModel[] = days.map((d, i) => {
    const dev = devs[i];
    const shown = maxAbs === 0 ? 0 : round2((Math.abs(dev) / maxAbs) * GAP_BAND_DEV_MAX_PCT);
    const word = dev > 0 ? '超 ' : (dev < 0 ? '差 ' : '持平');
    return {
      label: d.label,
      devText: signedText(Number(dev.toFixed(2))),
      heightPct: shown,
      up: dev >= 0,
      title: d.label + '：' + word + reading(Math.abs(dev), c.unit),
    };
  });
  /* 累计净差（原型 B 档的口径：累计写在底部读数里，单看某一天会误事）。归一后再比零，理由同 A 档。 */
  const net = Number(devs.reduce((a, d) => a + d, 0).toFixed(2));
  const under = devs.filter((d) => d < 0).length;
  const sumText = signedText(net) + unitPart(c.unit);
  const sumDesc = net === 0
    ? '净差 0' + unitPart(c.unit) + '，' + String(n) + ' 天合起来和目标持平'
    : '净差，' + String(n) + ' 天合起来比目标' + (net < 0 ? '少 ' : '多 ')
      + reading(Math.abs(net), c.unit) + '，'
      + (under === 0 ? String(n) + ' 天全达目标' : String(under) + ' 天没达目标');
  const items = days.map((d, i) => {
    const dev = devs[i];
    return d.label + (dev > 0 ? '超 ' : (dev < 0 ? '差 ' : '持平'))
      + (dev === 0 ? '' : reading(Math.abs(dev), c.unit));
  }).join('，');
  return {
    form: 'deviation',
    title: c.title,
    stamp: c.stamp,
    tail: '朝上超了目标',
    note: c.noteIn ?? '口径：柱高是实际减目标的绝对值，方向是超了还是差了，'
      + '数字一律带正负号，不靠颜色读。零位线是目标，不是 0 卡。累计写在底部读数里，单看某一天会误事。',
    ariaLabel: '每日偏差柱：' + items + '，累计净差 ' + sumText + '。',
    bars,
    sumText,
    sumDesc,
    legend: [
      { kind: 'up', text: '朝上超了目标' },
      { kind: 'down', text: '朝下还差' },
      { kind: 'zero', text: '零位线是目标' },
    ],
    extraClass: c.extraClass,
  };
}

/** 形态键的类型守卫（`render.ts` 分派用，不另写一套字符串比对）。 */
export function isGapBandForm(value: unknown): value is GapBandForm {
  return value === 'band' || value === 'deviation';
}
