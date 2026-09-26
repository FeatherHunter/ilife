/** small-multiples · **入参校验与归一化入口**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级、不"尽量猜"：
 *      期间数不够或太多、期间名给了空串、**两期同名**、读数不是有限数、把两期都标成本期，这五种画出来都是"错位"，
 *      而调用方会以为自己拿到的是一张对得上的柱阵。
 *   2. **校验与算数分家**：本件只做「形状与范围」，坐标映射与均值住同目录 `scale.ts`（唯一一处纯函数）。
 *   3. **能算的都算出来**：柱高百分比、均值、每根柱下面那枚读数、口径句与无障碍名都在这里定；
 *      `render.ts` 只负责拼标记，算术一个字都不写。
 *   4. **入参表以外的键一律拒**（每个对象层都查：顶层与 `periods` 的每一期；写错的键静默吞掉最坑人——
 *      调用方以为自己设上了）。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  SMALL_MULTIPLES_BAR_CEIL_PCT,
  SMALL_MULTIPLES_BAR_FLOOR_PCT,
  SMALL_MULTIPLES_FORMS,
  SMALL_MULTIPLES_MAX_PERIODS,
  SMALL_MULTIPLES_MIN_PERIODS,
  SMALL_MULTIPLES_NOW_LABEL,
  type SmallMultiplesForm,
  type SmallMultiplesPeriod,
} from './attrs.js';
import { barPct, barRange, meanOf, meanShown, numText } from './scale.js';

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
  /** 均值线的位置（用**同一个** `barPct()` 把**未量化**的均值当读数算出来的百分比）。 */
  readonly meanPct: number;
  /** 均值那一枚标注画在**线下**吗（线在刻度中线之上时为真：标注朝柱阵里长，保证不出框）。 */
  readonly meanUnder: boolean;
  /** 均值那一枚标注上的字（`均值 1,810 卡`）。 */
  readonly meanText: string;
  readonly bars: readonly SmallMultiplesBarModel[];
  readonly ticks: readonly SmallMultiplesTickModel[];
  readonly note: string;
  readonly ariaLabel: string;
  readonly extraClass?: string;
}

/* ── 校验 ─────────────────────────────────────────────────────────── */

/** 只许入参表里写着的键：多给一个键（多半是打错名）＝拒，不静默吞掉。
 *
 *  **两条都会被查到**（只走 `Object.keys` 会漏一半）：
 *   · `Object.getOwnPropertyNames` —— 自有的**全部**键，含**不可枚举**的（`Object.keys` 看不见它）；
 *   · `for…in` —— 走**整条原型链**（`Object.create({bogus: 1})` 那种继承来的键就是这一路）。
 *
 *  先例：`goal-stairs/model.ts`／`relation-picker/model.ts` 的同名小件（同一个规矩不在两处各写一套口径）。
 */
function assertKeys(raw: Record<string, unknown>, allowed: readonly string[], field: string): void {
  const bad: string[] = [];
  const note = (key: string): void => {
    if (!allowed.includes(key) && !bad.includes(key)) bad.push(key);
  };
  for (const key of Object.getOwnPropertyNames(raw)) note(key);
  for (const key in raw) note(key);
  if (bad.length > 0) {
    badInput(field + ' 里没有 `' + bad.join('`／`') + '` 这个键（入参表以外的键一律拒：'
      + '写错的键静默吞掉会让调用方以为自己设上了；继承来的与不可枚举的键同样算）');
  }
}

/** `SmallMultiplesInput` 的键（顶层入参表；必填与可选都列全）。 */
const INPUT_KEYS = ['title', 'periods', 'unit', 'stamp', 'form', 'note', 'extraClass'] as const;

/** `SmallMultiplesPeriod` 的键（`periods` 的每一期）。 */
const PERIOD_KEYS = ['label', 'value', 'now'] as const;

/** 读数量级上限：**判据是「两笔同量级的读数相加会不会溢出」**，不是"好不好读"——
 *  `|a| + |b| > Number.MAX_VALUE` 时柱高与读数会写出 `1e+308` 这种读不出来的数。
 *  `1e21`／`1e-7` 那两档照旧合法（十进制写法与指数写法的分界、微小读数都在本层照收）。 */
const SMALL_MULTIPLES_MAGNITUDE_MAX = Number.MAX_VALUE;

/** 期间：2–8 期，期间名非空**且两两不同**，读数是有限数，`now` 只许标一期。 */
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
    assertKeys(p, PERIOD_KEYS, at);
    const label = reqText(p.label, at + '.label');
    const v = p.value;
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      badInput(at + '.value 必须是有限数（这一期的读数；某一期没数就别给这一期，不要传 0 顶替）');
    }
    /* 量级这一档管的是**单笔读数本身**（与 `scale.ts` 里「轴域没有宽度」那条不是一档）：
       `1e308` 是有限数，可两笔同量级的读数相加就溢出成 `Infinity`，柱高与底下那枚读数会写成
       `1e+308` 那种读不出来的数。`1e21` 那一档照旧合法（十进制写法与指数写法的分界，本层当读数写）。 */
    if (Math.abs(v) + Math.abs(v) > SMALL_MULTIPLES_MAGNITUDE_MAX) {
      badInput(at + '.value 的量级太大：两笔同量级的读数相加就溢出成 `Infinity`'
        + '（柱阵与读数会写成 `1e+308` 这类读不出来的数；读数至多到 `Number.MAX_VALUE ÷ 2` 那一档）');
    }
    let now = false;
    if (p.now !== undefined) {
      if (typeof p.now !== 'boolean') badInput(at + '.now 必须是布尔（缺省＝不是本期）');
      now = p.now;
      if (now) nowCount += 1;
    }
    return { label, value: v, now };
  });
  /* 期间名是这一列的**坐标**（写在轴上、也进无障碍名）：两列同名，轴上与读屏里那两列就分不出谁是谁——
     图还是画得出来的，只是它答不了「哪一列是谁」。**重复名一律拒**，让调用方自己改名。 */
  const firstSeen = new Map<string, number>();
  for (let i = 0; i < out.length; i += 1) {
    const seenAt = firstSeen.get(out[i].label);
    if (seenAt === undefined) {
      firstSeen.set(out[i].label, i);
      continue;
    }
    /* 文案两条约束：① 点名**两条路径**（`input.periods[i].label`）——调用方与读的人都照它对账；
       ② 用「不许同名」这个说法：层的通用样例修补器（`皮肤矩阵.test.mjs` 的 `repairOnce`）
       认「不许同／不得同／不许一样 ＋ 两条路径」，照它能把重复的那个名字改掉 ⇒ 本件在横切判据里不被跳过。 */
    badInput('small-multiples: input.periods[' + String(seenAt) + '].label 与 input.periods[' + String(i)
      + '].label 不许同名（期间名是这一列的坐标：两列同名，轴上与读屏里就分不出谁是谁；'
      + '请给每一期不同的期间名，或先把这两期合成一期）');
  }
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
  /* **两个均值**（返修点）：`mean` 未量化、只喂坐标映射（量化过的数可以落到轴域外，线就跑出柱阵）；
     `shown` 是上屏那一枚（取整口径住 `scale.ts`），屏上的字与 aria 都从它出。 */
  const mean = meanOf(values);
  const shown = meanShown(values);
  const meanPct = barPct(mean, range);
  const n = periods.length;
  const unitPart = c.unit === undefined ? '' : ' ' + c.unit;
  const loText = numText(range.lo);
  const hiText = numText(range.hi);
  const meanText = '均值 ' + numText(shown) + unitPart;
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
    meanPct,
    /* 标注朝柱阵里那一侧长：线在**刻度中线**（下限与上限的中点，＝全平那一档的位置）之上时画到线下。
       线上／线下各占半个柱阵区 ⇒ 只要标注不超过半个区高，它就一定在柱阵框内（判据在真机上量四条边）。 */
    meanUnder: meanPct > (SMALL_MULTIPLES_BAR_FLOOR_PCT + SMALL_MULTIPLES_BAR_CEIL_PCT) / 2,
    meanText,
    bars: periods.map((p) => ({ heightPct: barPct(p.value, range), now: p.now === true })),
    ticks: periods.map((p) => ({ label: p.label, value: numText(p.value), now: p.now === true })),
    note,
    ariaLabel: '柱阵：' + String(n) + ' 期并排（' + labels + '），'
      + (range.flat
        ? '这几期的读数完全一样，都是 ' + loText + unitPart
        : '最低 ' + loText + unitPart + '，最高 ' + hiText + unitPart)
      + '，均值 ' + numText(shown) + unitPart + '。虚线是均值线。'
      + (hasNow ? '轴上写着「' + SMALL_MULTIPLES_NOW_LABEL + '」的那一列是本期。' : ''),
    extraClass: c.extraClass,
  };
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `SmallMultiplesModel`，不再自己碰 `any`。 */
export function normalizeSmallMultiples(input: unknown): SmallMultiplesModel {
  assertPlainObject(input, 'renderSmallMultiples: input');
  const raw = input as Record<string, unknown>;
  assertKeys(raw, INPUT_KEYS, 'renderSmallMultiples: input');

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
