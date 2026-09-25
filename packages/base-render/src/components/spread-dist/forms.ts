/** spread-dist · **两个骨架的装配**（本件第二份源码件：`model.ts` 校验过的入参在这里变成模型的形状）。
 *
 *  为什么有这一件：一次落两档形态，校验 ＋ 装配 ＋ 算数挤在一件里会超本包告警线 350
 *  （`packages/base-render/AGENTS.md`）。切口与兄弟件 `scatter-fit/forms.ts` 同：本件不碰 `any`
 *  （入参已由 `model.ts` 校验过），也不产标记（`render.ts` 只拼标记，算术一个字都不写）。
 *
 *  —— 两档 ——
 *   · `range` 逐日范围柱：每天一根从最低到最高的竖条 ＋ 中间一个中位块，横轴是日子，纵轴是同一个读数；
 *   · `quantile` 分位尺：结论一句话在上，下面一档一格写着「分位名 ＋ 说明句 ＋ 那个数」。
 *
 *  三条口径：
 *   1. **能算的都算出来**：刻度文字与刻度位置、每根条与每个中位块的百分比、卡头那句统计、
 *      口径句与无障碍名都在这里定 —— `render.ts` 里没有一个算术。
 *   2. **可见文本的用词纪律**：本件生成的字里**不出现** `·`／`；`／并列顿号／`／`／`｜`／`|`／`＋`
 *      —— 仓库的分隔符门（`test/separator-probe.mjs` R1–R3）对可见文本零豁免。
 *      故分位那一档的说明句写成「不超过它的读数占 25%」，不写 `P25 · 四分之一`。
 *   3. **缺值写成 `—`**：那一天没给中位数就不编一个数出来（拿最低或最高顶替 = 把「中间那批落在哪」编出来）。
 */
import {
  SPREAD_DIST_MISSING,
  type SpreadDistDay,
  type SpreadDistForm,
  type SpreadDistStop,
} from './attrs.js';
import { niceAxis, plainText, tickTexts, unitPart, upPct, type Axis } from './scale.js';

/* ── 内部类型（`render.ts` 只吃它们；`model.ts` 只把这些类型名再报一次给出口） ── */

/** 一天一列（B 档用）：范围条 ＋（可选）中位块。 */
export interface SpreadDistDayModel {
  /** 范围条底边（从下往上的百分比）。 */
  readonly bottomPct: number;
  /** 范围条高度（百分比）＝`upPct(high) − upPct(low)`：**与 `bottomPct` 出自同一个映射**。 */
  readonly heightPct: number;
  /** 中位块所在的位置（百分比）；那一天没给中位数时 `null`（不出中位块）。 */
  readonly medianPct: number | null;
  readonly title: string;
}

/** 一枚纵轴刻度：文字 ＋ **它自己那个值的位置**（两者出自同一份轴域；`bottom` 由 `upPct` 给）。 */
export interface SpreadDistTickModel {
  readonly text: string;
  readonly bottomPct: number;
}

/** 一档（C 档用）。 */
export interface SpreadDistStopModel {
  readonly name: string;
  /** 说明句（`不超过它的读数占 25%`）；档名不是 `P<数字>` 时＝**空串**（本件不编一句自己也不知道对不对的话）。 */
  readonly label: string;
  readonly valueText: string;
  /** 是不是正中那一档（分位尺的正中＝中位）：它有选中面（有文字的面走软底那一档）。 */
  readonly median: boolean;
}

/** 图例的一项：形（`is-*`）＋ 字。 */
export interface SpreadDistLegendItem {
  readonly kind: 'range' | 'median';
  readonly text: string;
}

/** 内部类型：每个字段都已校验、已归一、已算好；**没用上的那一段是空数组**（只有一段非空）。 */
export interface SpreadDistModel {
  readonly form: SpreadDistForm;
  readonly title: string;
  readonly stamp?: string;
  /** 卡头右端那句**从数据算出来**的统计。 */
  readonly tail: string;
  readonly note: string;
  readonly ariaLabel: string;
  readonly yTicks: readonly SpreadDistTickModel[];
  readonly xLabels: readonly string[];
  readonly days: readonly SpreadDistDayModel[];
  readonly stops: readonly SpreadDistStopModel[];
  readonly lead: string;
  readonly legend: readonly SpreadDistLegendItem[];
  readonly extraClass?: string;
}

/** 两档共用的那几个字段（校验一次、两个骨架都用）。 */
export interface SpreadDistCommon {
  readonly title: string;
  readonly unit?: string;
  readonly stamp?: string;
  readonly noteIn?: string;
  readonly extraClass?: string;
}

/** 分位档名里的百分位（`P25` → 25）；档名不是 `P<数字>` 时 `null`。 */
export function percentileOf(name: string): number | null {
  const m = /^[Pp](\d{1,2})$/.exec(name.trim());
  if (m === null) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= 99 ? n : null;
}

/** 一档的说明句：**只说实话**——「不超过它的读数占 n%」就是这一档的定义。
 *  档名不是 `P<数字>`（例如调用方自己写 `中位`）时不给说明句：本件不编。 */
export function stopMeaning(name: string): string {
  const n = percentileOf(name);
  return n === null ? '' : '不超过它的读数占 ' + String(n) + '%';
}

/** 一段读数的写法（数字 ＋ 单位）。 */
const reading = (v: number, unit: string | undefined): string => plainText(v) + unitPart(unit);

/** 抵在中文动词后面的那个名字：ASCII 打头时补一个空格（`区间最宽的是周三` 与 `拉得最开的是 P75` 都要读得顺）。 */
const afterVerb = (name: string): string => (/^[0-9A-Za-z]/.test(name) ? ' ' : '') + name;

/** 先说的那个名字后面接中文动词：ASCII 结尾时补一个空格（`P90 是 320 元` 与 `顶是 320 元` 都要读得顺）。 */
const beforeVerb = (name: string): string => (/[0-9A-Za-z]$/.test(name) ? ' ' : '');

/** 两个名字之间的那个「到」：两边有任何一边是西文就留空格（`P75 到 P90`／`高位到顶`）。 */
const rangeSep = (a: string, b: string): string => (/[0-9A-Za-z]$/.test(a) || /^[0-9A-Za-z]/.test(b) ? ' 到 ' : '到');

/* ── B 档：逐日范围柱 ─────────────────────────────────────────────── */

/** 形态 `range`：每天一根范围条 ＋ 一个中位块，纵轴刻度与柱位出自同一份轴域。 */
export function rangeModel(c: SpreadDistCommon, days: readonly SpreadDistDay[]): SpreadDistModel {
  const lows = days.map((d) => d.low);
  const highs = days.map((d) => d.high);
  const axis: Axis = niceAxis(Math.min(...lows), Math.max(...highs));
  const built = days.map((d) => ({
    bottomPct: upPct(d.low, axis),
    heightPct: Number((upPct(d.high, axis) - upPct(d.low, axis)).toFixed(2)),
    medianPct: d.median === undefined ? null : upPct(d.median, axis),
    title: d.label + '：最低 ' + plainText(d.low) + unitPart(c.unit) + '，最高 ' + plainText(d.high)
      + unitPart(c.unit) + '，中位数 ' + (d.median === undefined ? SPREAD_DIST_MISSING : plainText(d.median))
      + (d.median === undefined ? '' : unitPart(c.unit)),
  }));
  /* 卡头那句：**把最宽的那一天点出来**（原型那一档的读数就是「周三那一根特别长」）。
     每天一样宽时照实说一样宽，不编一个「最宽的」出来。 */
  const spans = days.map((d) => d.high - d.low);
  const widest = spans.indexOf(Math.max(...spans));
  const even = spans.every((s) => s === spans[0]);
  const tail = even
    ? '每天区间一样宽'
    : '区间最宽的是' + afterVerb(days[widest].label) + '（' + reading(days[widest].low, c.unit) + ' 到 '
      + reading(days[widest].high, c.unit) + '）';
  const withMedian = days.filter((d) => d.median !== undefined).length;
  return {
    form: 'range',
    title: c.title,
    stamp: c.stamp,
    tail,
    note: c.noteIn ?? '口径：竖条是当天最低到最高，中间的粗块是当天读数的中位数。'
      + '有一天特别长，说明那天有一个读数特别高，不把那一个当异常删掉。'
      + '某一天没给中位数时，那一格只画区间，中位数写 ' + SPREAD_DIST_MISSING + '，不拿最低或最高顶替。',
    ariaLabel: '逐日范围柱：' + String(days.length) + ' 天（' + days.map((d) => d.label).join('，') + '），'
      + '每天一根从最低到最高的竖条，中间的粗块是当天的中位数。纵轴最低 ' + plainText(axis.lo) + ' 到最高 '
      + plainText(axis.hi) + unitPart(c.unit) + '。中位数齐的有 ' + String(withMedian) + ' 天。' + tail + '。',
    yTicks: tickTexts(axis, c.unit).map((text, i) => ({
      text,
      /* 刻度的位置与柱子的位置**出自同一个 `upPct`**，取的那个数也与刻度文字同一支量化
         —— 这是「刻度与轴域同一份真值」的落点（`absolute ＋ bottom`，父级 `relative`）。 */
      bottomPct: upPct(Number((axis.hi - axis.step * i).toFixed(axis.decimals)), axis),
    })),
    xLabels: days.map((d) => d.label),
    days: built,
    stops: [],
    lead: '',
    legend: [
      { kind: 'range', text: '当天最低到最高' },
      { kind: 'median', text: '当天读数的中位数' },
    ],
    extraClass: c.extraClass,
  };
}

/* ── C 档：分位尺 ─────────────────────────────────────────────────── */

/** 形态 `quantile`：**结论一句话在上、读数在下**；正中那一档（中位）带选中面。 */
export function quantileModel(c: SpreadDistCommon, stops: readonly SpreadDistStop[]): SpreadDistModel {
  const mid = (stops.length - 1) / 2;
  const built = stops.map((s, i) => ({
    name: s.name,
    label: stopMeaning(s.name),
    valueText: reading(s.value, c.unit),
    median: i === mid,
  }));
  const half = stops[mid];
  const top = stops[stops.length - 1];
  /* 结论一句话：把「一半落在哪」与「最上面那一档在哪」先说出来（照原型定稿版的信息序）。 */
  const lead = '一半的读数不超过 ' + reading(half.value, c.unit) + '，' + top.name + beforeVerb(top.name)
    + '是 ' + reading(top.value, c.unit) + '。';
  /* 卡头那句：**两档之间拉得最开的是哪一段**（原型 A 档的读数就是「四组里「其他」拉得最长」）。 */
  const gaps = stops.slice(1).map((s, i) => s.value - stops[i].value);
  const widest = gaps.indexOf(Math.max(...gaps));
  const even = gaps.every((g) => g === gaps[0]);
  const tail = even
    ? '每两档之间一样宽'
    : '拉得最开的是' + afterVerb(stops[widest].name)
      + rangeSep(stops[widest].name, stops[widest + 1].name) + stops[widest + 1].name + '（'
      + reading(stops[widest].value, c.unit) + ' 到 ' + reading(stops[widest + 1].value, c.unit) + '）';
  return {
    form: 'quantile',
    title: c.title,
    stamp: c.stamp,
    tail,
    note: c.noteIn ?? '口径：每一档写的是不超过它的读数占多少，正中那一档就是中位。'
      + '比最高那一档还大的读数本件不硬塞进读数里，极端值要另开一处点名，不靠把读数拉长。',
    ariaLabel: '分位尺：' + String(stops.length) + ' 档（'
      + stops.map((s) => s.name + ' 是 ' + reading(s.value, c.unit)).join('，') + '），正中那一档是中位。',
    yTicks: [],
    xLabels: [],
    days: [],
    stops: built,
    lead,
    legend: [],
    extraClass: c.extraClass,
  };
}
