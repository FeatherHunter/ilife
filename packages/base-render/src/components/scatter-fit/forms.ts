/** scatter-fit · **三形态的装配**（本件第二份源码件：`model.ts` 校验过的入参在这里变成模型的形状）。
 *
 *  为什么有这一件：本件一次落三个形态（散点／分箱／滞后），校验 ＋ 装配 ＋ 算数挤在一件里一度到 528 行
 *  （本包告警线 350，见 `packages/base-render/AGENTS.md`）。切口按「入参面／装配面／算数面」分：
 *   · `model.ts`：入参校验与归一化入口（`badInput()` 全在那边）；
 *   · 本件：已校验的入参 → 图形参数（三个骨架的模型、图例、无障碍名）；
 *   · `scale.ts`：轴域、坐标映射、刻度文字、拟合与概率带（纯算数，本件调它）。
 *  拆分只搬「住哪个文件」，产出一个字节都没改（判据里那条「拆分前后逐字节相同」钉的就是它）。
 *
 *  两条口径：
 *   1. **能算的都算出来**：刻度文字、相关系数、那句相关强度、形状与无障碍名都在这里定，
 *      `render.ts` 只负责拼标记，算术一个字都不写。
 *   2. **可见文本的用词纪律**：本件生成的字里**不出现** `·`／`；`／并列顿号——仓库的分隔符门
 *      （`test/separator-probe.mjs` R1–R3）对可见文本零豁免。故统计量的名字写「相关系数」，
 *      不写一个裸的英文 `r`（渲染面文字门对英文裸词也有一条）。
 */
import {
  SCATTER_FIT_AXIS_INSET,
  SCATTER_FIT_BIN_MIN_SAMPLE,
  SCATTER_FIT_MAX_LAG_DAYS,
  SCATTER_FIT_MISSING,
  SCATTER_FIT_X_TICKS,
  SCATTER_FIT_Y_TICKS,
  type ScatterFitBin,
  type ScatterFitForm,
  type ScatterFitLag,
  type ScatterFitPoint,
} from './attrs.js';
import { LINE_HALF_PCT, bandPolygon, fitOf, niceAxis, plainText, round2, signed, strengthText, tickTexts, upPct } from './scale.js';
import { m } from '../../entries/index.js';

/* ── 内部类型（`render.ts` 只吃它们；`model.ts` 只把这些类型名再报一次给出口） ── */

/** 一个读数（点阵用）。 */
export interface ScatterFitDotModel {
  /** 从下往上的百分比（CSS `bottom`）。 */
  readonly upPct: number;
  /** 从左往右的百分比（CSS `left`）。 */
  readonly leftPct: number;
  readonly title: string;
  readonly outlier: boolean;
}

/** 一箱（分箱用）。 */
export interface ScatterFitBinModel {
  readonly bottomPct: number;
  readonly heightPct: number;
  readonly medianPct: number;
  readonly title: string;
}

/** 一档（滞后用）。 */
export interface ScatterFitLagModel {
  readonly label: string;
  /** 条宽（轨道的一半 ＝ |r| ＝ 1）。 */
  readonly widthPct: number;
  readonly negative: boolean;
  readonly valueText: string;
  readonly strong: boolean;
}

/** 图例的一项：形（`is-*`）＋ 字。 */
export interface ScatterFitLegendItem {
  readonly kind: 'dot' | 'ring' | 'median' | 'range';
  readonly text: string;
}

/** 内部类型：每个字段都已校验、已归一、已算好；**别的形态那几段是空数组**（只有一段非空）。 */
export interface ScatterFitModel {
  readonly form: ScatterFitForm;
  readonly title: string;
  readonly xName: string;
  readonly yName: string;
  readonly stamp?: string;
  /** 卡头右端那句**从数据算出来**的统计。 */
  readonly tail: string;
  readonly note: string;
  readonly legend: readonly ScatterFitLegendItem[];
  readonly ariaLabel: string;
  readonly xTicks: readonly string[];
  readonly yTicks: readonly string[];
  readonly dots: readonly ScatterFitDotModel[];
  readonly bandShape: string;
  readonly fitShape: string;
  readonly bins: readonly ScatterFitBinModel[];
  readonly lags: readonly ScatterFitLagModel[];
  readonly extraClass?: string;
}

/** 三形态共用的那几个字段（校验一次、三个骨架都用）。 */
export interface CommonFields {
  readonly title: string;
  readonly xName: string;
  readonly yName: string;
  readonly xUnit?: string;
  readonly yUnit?: string;
  readonly stamp?: string;
  readonly noteIn?: string;
  readonly extraClass?: string;
}

/** 单位那一段（进了可见文本，故与刻度文字同一处拼）。 */
const unitPart = (unit: string | undefined): string => (unit === undefined ? '' : ' ' + unit);

/* ── 三个骨架 ─────────────────────────────────────────────────────── */

/** 形态 A：散点＋拟合线＋概率带。 */
export function scatterModel(c: CommonFields, points: readonly ScatterFitPoint[]): ScatterFitModel {
  const axisX = niceAxis(Math.min(...points.map((p) => p.x)), Math.max(...points.map((p) => p.x)), SCATTER_FIT_X_TICKS);
  const axisY = niceAxis(Math.min(...points.map((p) => p.y)), Math.max(...points.map((p) => p.y)), SCATTER_FIT_Y_TICKS);
  const fit = fitOf(points);
  /* 带子的半宽要换算成**同一套坐标**里的百分比：轴域被映射到 3%…97%，故乘 94 而不是 100。 */
  const halfUp = (fit.half / (axisY.hi - axisY.lo)) * (100 - 2 * SCATTER_FIT_AXIS_INSET);
  const dots = points.map((p) => {
    const labelPrefix = p.label === undefined ? '' : p.label + '：';
    const outlierSuffix = p.outlier === undefined ? '' : '（' + p.outlier + '）';
    return {
      upPct: upPct(p.y, axisY),
      leftPct: upPct(p.x, axisX),
      title: labelPrefix + c.xName + ' ' + plainText(p.x) + unitPart(c.xUnit)
        + '，' + c.yName + ' ' + plainText(p.y) + unitPart(c.yUnit) + outlierSuffix,
      outlier: p.outlier !== undefined,
    };
  });
  const named = points.filter((p) => p.outlier !== undefined);
  const namedPart = named.length === 0 ? '' : m('base-render.components-scatter-fit-forms.c001', { p0: String(String(named.length)) });
  const legend: ScatterFitLegendItem[] = [{ kind: 'dot', text: m('base-render.components-scatter-fit-forms.c002', { p0: String(c.yName) }) }];
  for (const p of named) legend.push({ kind: 'ring', text: m('base-render.components-scatter-fit-forms.c003', { p0: String(String(p.outlier)) }) });
  const head = m('base-render.components-scatter-fit-forms.c004', {
    p0: String(c.xName),
    p1: String(plainText(axisX.lo)),
    p2: String(plainText(axisX.hi)),
    p3: String(unitPart(c.xUnit)),
    p4: String(c.yName),
    p5: String(plainText(axisY.lo)),
    p6: String(plainText(axisY.hi)),
    p7: String(unitPart(c.yUnit)),
  });
  const about = fit.r === null
    ? m('base-render.components-scatter-fit-forms.c005', { p0: String(fit.why) })
    : m('base-render.components-scatter-fit-forms.c006', {
      p0: String(signed(fit.r)),
      p1: String(strengthText(fit.r)),
    });
  /* **算不出拟合就不画线与带**：r 无定义时那条"最小二乘线"是常数（一条横线或竖线），画出来会被当成趋势；
     脚注也跟着换口径——不能一边不画线、一边说"线是最小二乘拟合"。 */
  const drawFit = fit.r !== null;
  return {
    form: 'scatter',
    title: c.title,
    xName: c.xName,
    yName: c.yName,
    stamp: c.stamp,
    /* 相关系数算不出时写缺值符号 ＋ 原因：**不编一个 0 出来**（那会读成"没有关系"）。 */
    tail: fit.r === null
      ? m('base-render.components-scatter-fit-forms.c007', {
        p0: String(SCATTER_FIT_MISSING),
        p1: String(fit.why),
      })
      : m('base-render.components-scatter-fit-forms.c008', {
        p0: String(signed(fit.r)),
        p1: String(strengthText(fit.r)),
      }),
    note: c.noteIn ?? (drawFit
      ? m('base-render.components-scatter-fit-forms.c009')
      : m('base-render.components-scatter-fit-forms.c010', { p0: String(fit.why) })),
    legend,
    ariaLabel: m('base-render.components-scatter-fit-forms.c011', {
      p0: String(head),
      p1: String(String(points.length)),
      p2: String(namedPart),
      p3: String(about),
    }),
    xTicks: tickTexts(axisX, SCATTER_FIT_X_TICKS, c.xUnit, false),
    yTicks: tickTexts(axisY, SCATTER_FIT_Y_TICKS, c.yUnit, true),
    dots,
    bandShape: drawFit ? bandPolygon(axisX, axisY, fit, halfUp) : '',
    /* 拟合线：同一个多边形，半厚取**图高的百分比**（不是数据单位）——线的粗细不该随数值范围变。 */
    fitShape: drawFit ? bandPolygon(axisX, axisY, fit, LINE_HALF_PCT) : '',
    bins: [],
    lags: [],
    extraClass: c.extraClass,
  };
}

/** 形态 B：分箱趋势带（中位数 ＋ 四分位区间）。 */
export function binModel(c: CommonFields, bins: readonly ScatterFitBin[]): ScatterFitModel {
  const axisY = niceAxis(Math.min(...bins.map((b) => b.low)), Math.max(...bins.map((b) => b.high)), SCATTER_FIT_Y_TICKS);
  const built = bins.map((b) => ({
    bottomPct: upPct(b.low, axisY),
    heightPct: round2(upPct(b.high, axisY) - upPct(b.low, axisY)),
    medianPct: upPct(b.median, axisY),
    title: m('base-render.components-scatter-fit-forms.c012', {
      p0: String(b.label),
      p1: String(plainText(b.median)),
      p2: String(unitPart(c.yUnit)),
      p3: String(plainText(b.low)),
      p4: String(plainText(b.high)),
      p5: String(unitPart(c.yUnit)),
      p6: String(String(b.count)),
    }),
  }));
  return {
    form: 'bin',
    title: c.title,
    xName: c.xName,
    yName: c.yName,
    stamp: c.stamp,
    tail: m('base-render.components-scatter-fit-forms.c013', {
      p0: String(c.xName),
      p1: String(String(bins.length)),
    }),
    note: c.noteIn ?? m('base-render.components-scatter-fit-forms.c014', {
      p0: String(c.xName),
      p1: String(String(SCATTER_FIT_BIN_MIN_SAMPLE)),
    }),
    legend: [{ kind: 'median', text: m('base-render.components-scatter-fit-forms.c015') }, { kind: 'range', text: m('base-render.components-scatter-fit-forms.c016') }],
    ariaLabel: m('base-render.components-scatter-fit-forms.c017', {
      p0: String(c.xName),
      p1: String(String(bins.length)),
      p2: String(bins.map((b) => b.label).join('，')),
      p3: String(c.yName),
      p4: String(plainText(axisY.lo)),
      p5: String(plainText(axisY.hi)),
      p6: String(unitPart(c.yUnit)),
    }),
    xTicks: bins.map((b) => b.label),
    yTicks: tickTexts(axisY, SCATTER_FIT_Y_TICKS, c.yUnit, true),
    dots: [],
    bandShape: '',
    fitShape: '',
    bins: built,
    lags: [],
    extraClass: c.extraClass,
  };
}

/** 形态 C：滞后相关（错开几天最强）。 */
export function lagModel(c: CommonFields, lags: readonly ScatterFitLag[]): ScatterFitModel {
  let strongAt = 0;
  lags.forEach((g, i) => { if (Math.abs(g.r) > Math.abs(lags[strongAt].r)) strongAt = i; });
  const built = lags.map((g, i) => ({
    label: g.step === 0 ? m('base-render.components-scatter-fit-forms.c018') : m('base-render.components-scatter-fit-forms.c019', { p0: String(String(g.step)) }),
    widthPct: round2(Math.abs(g.r) * 50),
    negative: g.r < 0,
    valueText: signed(g.r),
    strong: i === strongAt,
  }));
  const strong = lags[strongAt];
  const at = strong.step === 0 ? m('base-render.components-scatter-fit-forms.c020') : m('base-render.components-scatter-fit-forms.c021', { p0: String(String(strong.step)) });
  /** 一档的字：当天，或错开几天。 */
  const lagWord = (step: number): string => (step === 0 ? m('base-render.components-scatter-fit-forms.c022') : m('base-render.components-scatter-fit-forms.c023', { p0: String(String(step)) }));
  return {
    form: 'lag',
    title: c.title,
    xName: c.xName,
    yName: c.yName,
    stamp: c.stamp,
    tail: m('base-render.components-scatter-fit-forms.c024', { p0: String(at) }),
    note: c.noteIn ?? m('base-render.components-scatter-fit-forms.c025', { p0: String(String(SCATTER_FIT_MAX_LAG_DAYS)) }),
    legend: [],
    ariaLabel: m('base-render.components-scatter-fit-forms.c026', {
      p0: String(c.xName),
      p1: String(c.yName),
      p2: String(lags.map((g) => lagWord(g.step) + ' ' + signed(g.r)).join('，')),
      p3: String(at),
      p4: String(signed(strong.r)),
    }),
    xTicks: [],
    yTicks: [],
    dots: [],
    bandShape: '',
    fitShape: '',
    bins: [],
    lags: built,
    extraClass: c.extraClass,
  };
}
