/** small-multiples · **入参校验与归一化入口**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级、不"尽量猜"：
 *      期间数不够或太多、期间名给了空串、读数不是有限数、把两期都标成本期，这四种画出来都是"错位"，
 *      而调用方会以为自己拿到的是一张对得上的柱阵。
 *   2. **校验与算数分家**：本件只做「形状与范围」，坐标映射与均值住同目录 `scale.ts`（唯一一处纯函数）。
 *   3. **能算的都算出来**：柱高百分比、均值、每根柱下面那枚读数、口径句与无障碍名都在这里定；
 *      `render.ts` 只负责拼标记，算术一个字都不写。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  SMALL_MULTIPLES_FORMS,
  SMALL_MULTIPLES_MAX_PERIODS,
  SMALL_MULTIPLES_MIN_PERIODS,
  SMALL_MULTIPLES_NOW_LABEL,
  type SmallMultiplesForm,
  type SmallMultiplesPeriod,
} from './attrs.js';
import { barPct, barRange, meanOf, numText } from './scale.js';

/* ── 内部类型（`render.ts` 只吃这些：每个字段都已校验、已归一、已算好） ─────── */

/** 一列：柱高（算出来的百分比）＋ 是不是本期。 */
export interface SmallMultiplesBarModel {
  readonly heightPct: number;
  readonly now: boolean;
}

/** 一枚横轴标签：期间名 ＋ 那一期的绝对读数（**已写成给人看的样子**）＋ 是不是本期。 */
export interface SmallMultiplesTickModel {
  readonly label: string;
  readonly value: string;
  readonly now: boolean;
}

/** 内部类型：形态 ＋ 卡头 ＋ 柱阵 ＋ 均值线 ＋ 口径句 ＋ 无障碍名。 */
export interface SmallMultiplesModel {
  readonly form: SmallMultiplesForm;
  readonly title: string;
  readonly stamp?: string;
  /** 卡头右端那句**从数据算出来**的话（虚线是什么）。 */
  readonly tail: string;
  /** 均值线的位置（用**同一个** `barPct()` 把均值当读数算出来的百分比）。 */
  readonly meanPct: number;
  /** 均值那一枚标注上的字（`均值 1,810 卡`）。 */
  readonly meanText: string;
  readonly bars: readonly SmallMultiplesBarModel[];
  readonly ticks: readonly SmallMultiplesTickModel[];
  readonly note: string;
  readonly ariaLabel: string;
  readonly extraClass?: string;
}

/* ── 校验 ─────────────────────────────────────────────────────────── */

/** 期间：2–8 期，期间名非空，读数是有限数，`now` 只许标一期。 */
function reqPeriods(value: unknown): readonly SmallMultiplesPeriod[] {
  if (!Array.isArray(value) || value.length < SMALL_MULTIPLES_MIN_PERIODS) {
    badInput('small-multiples: input.periods 至少 ' + String(SMALL_MULTIPLES_MIN_PERIODS)
      + ' 条（一期看不出跨期怎么变）');
  }
  if (value.length > SMALL_MULTIPLES_MAX_PERIODS) {
    badInput('small-multiples: input.periods 最多 ' + String(SMALL_MULTIPLES_MAX_PERIODS)
      + ' 条（再多窄容器里每列不到 42px，期间名与读数只能压字；请调用方先合并期间）');
  }
  let nowCount = 0;
  const out = value.map((item, i) => {
    const at = 'small-multiples: input.periods[' + String(i) + ']';
    assertPlainObject(item, at);
    const p = item as Record<string, unknown>;
    const label = reqText(p.label, at + '.label');
    const v = p.value;
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      badInput(at + '.value 必须是有限数（这一期的读数；某一期没数就别给这一期，不要传 0 顶替）');
    }
    let now = false;
    if (p.now !== undefined) {
      if (typeof p.now !== 'boolean') badInput(at + '.now 必须是布尔（缺省＝不是本期）');
      now = p.now;
      if (now) nowCount += 1;
    }
    return { label, value: v, now };
  });
  if (nowCount > 1) {
    badInput('small-multiples: input.periods 里最多标一期 now（本期只有一期，标两期说不出"这一列"是哪一列）');
  }
  return out;
}

/* ── 装配（形态 `columns`） ───────────────────────────────────────── */

/** 三形态共用的那几个字段（校验一次；本件只有一档，摆在这儿是为了加第二档时不改调用面）。 */
interface CommonFields {
  readonly title: string;
  readonly unit?: string;
  readonly stamp?: string;
  readonly noteIn?: string;
  readonly extraClass?: string;
}

/** 形态 `columns`：一行并排的期间列 ＋ 那条均值线。**算数全在这一支里**（调 `scale.ts`）。 */
function columnsModel(c: CommonFields, periods: readonly SmallMultiplesPeriod[]): SmallMultiplesModel {
  const values = periods.map((p) => p.value);
  /* 轴域取一次：柱高、均值线的位置、口径句里的上下界、无障碍名里的最低／最高**都从它出**。 */
  const range = barRange(values);
  const mean = meanOf(values);
  const n = periods.length;
  const unitPart = c.unit === undefined ? '' : ' ' + c.unit;
  const loText = numText(range.lo);
  const hiText = numText(range.hi);
  const meanText = '均值 ' + numText(mean) + unitPart;
  const hasNow = periods.some((p) => p.now === true);
  const labels = periods.map((p) => p.label).join('，');

  const note = c.noteIn ?? (range.flat
    ? '口径：这几期的读数完全一样，柱高都画在中线（分不出高低）。每一期的读数写在它那根柱子下面。'
      + '虚线是这 ' + String(n) + ' 期的均值，它跟每一根柱顶一样高。'
    : '口径：柱高只在最低 ' + loText + ' 与最高 ' + hiText + ' 之间归一化（不做 0 起点，'
      + '否则几根柱子看着一样高），所以拿它比相对高低，不比绝对量——每一期的读数写在它那根柱子下面。'
      + '虚线是这 ' + String(n) + ' 期的均值。「均值」不是「目标」：要跟目标比请另给一个数。');

  return {
    form: 'columns',
    title: c.title,
    stamp: c.stamp,
    /* 卡头那句是**从数据算出来**的（不是装饰）：它替读者把那条虚线认出来，不靠颜色。 */
    tail: '虚线＝' + String(n) + ' 期均值',
    meanPct: barPct(mean, range),
    meanText,
    bars: periods.map((p) => ({ heightPct: barPct(p.value, range), now: p.now === true })),
    ticks: periods.map((p) => ({ label: p.label, value: numText(p.value), now: p.now === true })),
    note,
    ariaLabel: '柱阵：' + String(n) + ' 期并排（' + labels + '），'
      + (range.flat
        ? '这几期的读数完全一样，都是 ' + loText + unitPart
        : '最低 ' + loText + unitPart + '，最高 ' + hiText + unitPart)
      + '，均值 ' + numText(mean) + unitPart + '。虚线是均值线。'
      + (hasNow ? '轴上写着「' + SMALL_MULTIPLES_NOW_LABEL + '」的那一列是本期。' : ''),
    extraClass: c.extraClass,
  };
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `SmallMultiplesModel`，不再自己碰 `any`。 */
export function normalizeSmallMultiples(input: unknown): SmallMultiplesModel {
  assertPlainObject(input, 'renderSmallMultiples: input');
  const raw = input as Record<string, unknown>;

  const form = raw.form === undefined ? SMALL_MULTIPLES_FORMS[0] : raw.form;
  if (!(SMALL_MULTIPLES_FORMS as readonly unknown[]).includes(form)) {
    badInput('small-multiples: input.form 必须是 ' + SMALL_MULTIPLES_FORMS.join('／')
      + ' 之一（本件只落地「期间并排迷你柱阵 ＋ 均值线」这一档）');
  }
  const common: CommonFields = {
    title: reqText(raw.title, 'small-multiples: input.title'),
    unit: optText(raw.unit, 'small-multiples: input.unit'),
    stamp: optText(raw.stamp, 'small-multiples: input.stamp'),
    noteIn: optText(raw.note, 'small-multiples: input.note'),
    extraClass: optExtraClass(raw.extraClass, 'small-multiples: input.extraClass'),
  };
  return columnsModel(common, reqPeriods(raw.periods));
}
