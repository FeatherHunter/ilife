/** radar-profile · **装配出来的形状 ＋ 逐轴的小件**（三形态共用那一份）。
 *
 *  为什么有这一件：本件一次落三个形态（多边形雷达／极区扇图／展平轴表），校验 ＋ 装配 ＋ 算数 ＋ 类型
 *  挤在一件里会超本包告警线 350（`packages/base-render/AGENTS.md`）。切法按**面**分：
 *   · `model.ts`：入参校验与归一化入口（`badInput()` 全在那边）；
 *   · 本件：**模型类型**（三个骨架装配出来的形状）与**逐轴的小件**（读数文字、位置、差、辐条、轴名、无障碍句）；
 *   · `forms.ts`：三个骨架各自的装配（调本件的小件）；
 *   · `scale.ts`：角度、极坐标、半径映射、路径与数字格式（纯算数，本件调它）。
 *  拆分只搬「住哪个文件」，产出一个字节都没改。
 *
 *  两条口径：
 *   1. **能算的都算出来**：读数文字、位置占比、差的字形、辐条终点、轴名锚点都在这里定下来；
 *      `render.ts` 只负责拼标记，算术一个字都不写。
 *   2. **缺值与缺测是两件事**：`score === null` ＝ 缺测（画面上整根不落、读数写 `—`），
 *      `past === null` ＝ 没有上期（那一列根本不出）。
 */
import { RADAR_PROFILE_RADIUS, type RadarProfileAxis, type RadarProfileForm } from './attrs.js';
import {
  anchorOf,
  deltaText,
  labelPercentOf,
  percentOfScore,
  plainNum,
  polarOf,
  radiusOfScore,
  round2,
} from './scale.js';

/** 卡头／脚注那几段共有的事实。 */
export interface RadarProfileCommon {
  readonly title: string;
  readonly stamp?: string;
  readonly pastStamp?: string;
  readonly noteIn?: string;
  readonly extraClass?: string;
}

/** 一根轴（**含缺测的**）：读数的三种写法与算出来的位置都在这里。 */
export interface RadarProfileAxisModel {
  readonly label: string;
  /** 本期得分；`null` ＝ 缺测。 */
  readonly score: number | null;
  /** 上期得分；`null` ＝ 没有上期（没有上期时整列不出）。 */
  readonly past: number | null;
  readonly note?: string;
  readonly band?: { readonly low: number; readonly high: number };
  /** 0…100 的位置占比（唯一映射的产物：多边形的顶点半径、轨道上那根竖线都用它）。 */
  readonly at: number | null;
  readonly valueText: string;
  readonly pastText: string;
  readonly delta: number | null;
  readonly deltaText: string;
  /** 差那一格的方向（`up`／`down`／`flat`／`none`）：字形由它出，颜色不由它出。 */
  readonly dir: 'up' | 'down' | 'flat' | 'none';
}

/** 轴名那一块：名字一行、读数一行，位置是**同一个映射**的百分比。 */
export interface RadarProfileLabelModel {
  readonly label: string;
  readonly valueText: string;
  readonly present: boolean;
  readonly anchor: 'top' | 'right' | 'bottom' | 'left';
  readonly left: number;
  readonly top: number;
}

/** 一格网格环（三级；值就是印在刻度条上的那个数）。 */
export interface RadarProfileRingModel {
  readonly value: number;
  readonly radius: number;
}

/** 一根辐条（只画**有读数**的轴：缺测的轴整根不画）。 */
export interface RadarProfileSpokeModel {
  readonly x2: number;
  readonly y2: number;
}

/** 一个顶点（本期读数落在它那根轴上的位置）。 */
export interface RadarProfileVertexModel {
  readonly x: number;
  readonly y: number;
}

/** 读数表的一行。 */
export interface RadarProfileTableRowModel {
  readonly name: string;
  readonly nowText: string;
  readonly pastText: string;
  readonly deltaText: string;
  readonly dir: 'up' | 'down' | 'flat' | 'none';
}

/** 图例的一项（`形 ＋ 字`；形由 `slot`／`kind` 给）。 */
export interface RadarProfileLegendItemModel {
  readonly slot: 'axline' | 'swatch';
  readonly kind: 'now' | 'past' | 'ok' | 'warn';
  readonly text: string;
  /** 达标那一项里**印出来的达标分**（判据从它把刻度读回来）；其余项不给。 */
  readonly goalNum?: string;
}

/** 一根扇区（半径＝得分；`score` 存的是**印出来的那个数**——达标判定与点名差值都从它算）。 */
export interface RadarProfileWedgeModel {
  readonly path: string;
  readonly arc: string;
  readonly ok: boolean;
  readonly score: number;
}

/** 未达标点名清单的一行。 */
export interface RadarProfileGapModel {
  readonly label: string;
  readonly scoreText: string;
  readonly diffText: string;
}

/** 展平轴表的一行。 */
export interface RadarProfileRailRowModel {
  readonly label: string;
  readonly note?: string;
  /** 位置（轨道宽度的百分数串，如 `62%`）；缺测＝不给。 */
  readonly at?: string;
  readonly valueText: string;
  readonly b1?: string;
  readonly b2?: string;
  readonly verdict: string;
  readonly verdictKind: 'in' | 'low' | 'high' | 'none' | 'missing';
  readonly bandText?: string;
}

/** 内部类型：每个字段都已校验、已归一、已算好；**别的形态那几段是空数组／空串**（只有一段非空）。 */
export interface RadarProfileModel {
  readonly form: RadarProfileForm;
  readonly title: string;
  readonly stamp?: string;
  readonly tail: string;
  readonly note: string;
  readonly ariaLabel: string;
  readonly extraClass?: string;
  readonly labels: readonly RadarProfileLabelModel[];
  /* polygon */
  readonly rings: readonly RadarProfileRingModel[];
  readonly spokes: readonly RadarProfileSpokeModel[];
  readonly pastPoints: string;
  readonly nowPoints: string;
  readonly nowDots: readonly RadarProfileVertexModel[];
  readonly scaleItems: readonly string[];
  readonly tableHead: readonly string[];
  readonly tableRows: readonly RadarProfileTableRowModel[];
  /* wedge */
  readonly wedges: readonly RadarProfileWedgeModel[];
  readonly goalRadius: number;
  readonly goalNumText: string;
  readonly hubText: string;
  readonly gaps: readonly RadarProfileGapModel[];
  /* 两形态共用 */
  readonly legend: readonly RadarProfileLegendItemModel[];
  /* rail */
  readonly rows: readonly RadarProfileRailRowModel[];
}

/** 一根轴：把校验过的读数装成"图上用的那个形状"。 */
function axisModel(
  raw: {
    readonly label: string;
    readonly score: number | null;
    readonly past: number | null;
    readonly note?: string;
    readonly band?: { readonly low: number; readonly high: number };
  },
): RadarProfileAxisModel {
  /* **三种写法与那一个差都从印出来的数算**（`plainNum()` 的粒度＝两位小数）：否则 80.004 与 79.996
     两格都印「80」，而差那一格写出「▲ +0.01」——同一行自相矛盾，读者不知道该信谁。 */
  const now = raw.score === null ? null : round2(raw.score);
  const past = raw.past === null ? null : round2(raw.past);
  const delta = now === null || past === null ? null : round2(now - past);
  return {
    ...raw,
    at: now === null ? null : percentOfScore(now),
    valueText: now === null ? '—' : plainNum(now),
    pastText: past === null ? '—' : plainNum(past),
    delta,
    deltaText: deltaText(delta),
    dir: delta === null ? 'none' : (delta > 0 ? 'up' : (delta < 0 ? 'down' : 'flat')),
  };
}

/** 校验过的几根轴 → 图上用的那一份（位置、读数文字、差的形状都在这里定下来，三个形态共用）。 */
export function axisModels(list: readonly RadarProfileAxis[]): RadarProfileAxisModel[] {
  return list.map((one) => axisModel({
    label: one.label,
    score: one.score,
    past: one.past === undefined ? null : one.past,
    note: one.note,
    band: one.band,
  }));
}

/** 有读数的那些轴 → 辐条的终点（缺测的轴整根不画：辐条与顶点一起不画）。 */
export function spokesOf(axes: readonly RadarProfileAxisModel[], count: number): RadarProfileSpokeModel[] {
  const out: RadarProfileSpokeModel[] = [];
  axes.forEach((a, index) => {
    if (a.score === null) return;
    const p = polarOf(index, count, RADAR_PROFILE_RADIUS);
    out.push({ x2: p.x, y2: p.y });
  });
  return out;
}

/** 轴名那一块（缺测的轴照样出名字与 `—`：读者要知道"这根没测"，而不是"这根不存在"）。 */
export function labelModel(axis: RadarProfileAxisModel, index: number, count: number): RadarProfileLabelModel {
  const at = labelPercentOf(index, count);
  return {
    label: axis.label,
    valueText: axis.valueText,
    present: axis.score !== null,
    anchor: anchorOf(index, count),
    left: at.left,
    top: at.top,
  };
}

/** 逐轴点名的句子（无障碍名用）：每根轴一句，句间用句号，不堆并列分隔符。 */
export function axisSentences(axes: readonly RadarProfileAxisModel[], withPast: boolean): string {
  return axes.map((a) => a.label + ' 本期 '
    + (a.score === null ? '缺测' : plainNum(a.score) + ' 分')
    + (withPast ? (a.past === null ? '，上期缺测' : '，上期 ' + plainNum(a.past) + ' 分') : '')).join('。');
}

/** 半径基准（三个形态共用同一把尺子：满分 100 对应 `RADAR_PROFILE_RADIUS`）。 */
export const radiusOf = (score: number): number => radiusOfScore(score, RADAR_PROFILE_RADIUS);
