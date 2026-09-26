/** scatter-fit · **入参校验与归一化入口**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级、不"尽量猜"：
 *      点／箱／档的枚数不对、或区间上下界反了，画出来是"错位"，而调用方以为自己给的是一张完整的图。
 *   2. **校验与算数分家**：本件只做「形状与范围」，算数（坐标映射、轴域与刻度、拟合与概率带）住同目录
 *      `scale.ts`，三个骨架的装配住 `forms.ts` —— 一次落三个形态，两件事挤在一件里会超本包告警线 350。
 *   3. **能算的都算出来**：刻度文字、相关系数、那句相关强度、形状与无障碍名都在 `forms.ts` 里算好；
 *      `render.ts` 只负责拼标记，算术一个字都不写。
 *   4. **空白串不是文本**：全空白的 `title`／`xName`／`yName` 会在屏上留一块空白，**一律拒**
 *      （与同层 `optExtraClass` 对空白串的口径一致；可选文本字段同办——空串仍按"未给"处理）。
 *   5. **入参表以外的键一律拒**（每个对象层都查：顶层与 `points`／`bins`／`lags` 的每一枚；
 *      写错的键静默吞掉最坑人——调用方以为自己设上了）。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  SCATTER_FIT_BIN_MAX,
  SCATTER_FIT_BIN_MIN,
  SCATTER_FIT_BIN_MIN_SAMPLE,
  SCATTER_FIT_FORMS,
  SCATTER_FIT_LAG_MAX,
  SCATTER_FIT_LAG_MIN,
  SCATTER_FIT_MAX_LAG_DAYS,
  SCATTER_FIT_MAX_POINTS,
  SCATTER_FIT_MIN_POINTS,
  type ScatterFitBin,
  type ScatterFitLag,
  type ScatterFitPoint,
} from './attrs.js';
import { binModel, lagModel, scatterModel, type CommonFields, type ScatterFitModel } from './forms.js';

/* 内部类型住 `forms.ts`（那是三个骨架装配出来的形状）；这里只把类型名再报一次，方便 `render.ts` 读。 */
export type {
  CommonFields,
  ScatterFitBinModel,
  ScatterFitDotModel,
  ScatterFitLagModel,
  ScatterFitLegendItem,
  ScatterFitModel,
} from './forms.js';

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

/** `ScatterFitInput` 的键（顶层入参表；必填与可选都列全）。 */
const INPUT_KEYS = ['title', 'xName', 'yName', 'xUnit', 'yUnit', 'stamp', 'form',
  'points', 'bins', 'lags', 'note', 'extraClass'] as const;

/** `ScatterFitPoint` 的键（`points` 的每一枚）。 */
const POINT_KEYS = ['x', 'y', 'label', 'outlier'] as const;

/** `ScatterFitBin` 的键（`bins` 的每一箱）。 */
const BIN_KEYS = ['label', 'low', 'median', 'high', 'count'] as const;

/** `ScatterFitLag` 的键（`lags` 的每一档）。 */
const LAG_KEYS = ['step', 'r'] as const;

/** 必填文本：非空串**且不是全空白**（全空白的标题会在屏上留一块空白，那是"看得到的错"）。 */
function reqRealText(value: unknown, field: string): string {
  const text = reqText(value, field);
  if (text.trim() === '') badInput(field + ' 必须是真正的文本（全空白不算）');
  return text;
}

/** 可选文本：空串＝未给（与全层 `optText` 同口径）；**全空白＝拒**（那会在屏上留一块空白）。 */
function optRealText(value: unknown, field: string): string | undefined {
  const text = optText(value, field);
  if (text !== undefined && text.trim() === '') badInput(field + ' 必须是真正的文本（全空白不算）');
  return text;
}

/** 读数量级上限：**判据是「两笔同量级的读数相加会不会溢出」**，不是"好不好读"——
 *  `|a| + |b| > Number.MAX_VALUE` 时图上会写出 `1e+308` 这种读不出来的数。
 *  `1e21` 那档照旧合法（十进制写法与指数写法的分界，本层当读数写）。 */
const SCATTER_FIT_MAGNITUDE_MAX = Number.MAX_VALUE;

/** 一个读数：**两条闸**——① 非有限（`NaN`／`±Infinity`）拒；② 量级大到相加就溢出（`±1e308`）拒。
 *
 *  第 ② 条与「轴域算不出来即拒」那条（住 `scale.ts` 的 `niceAxis()`，管的是**跨度**）**不是一档**：
 *  那一档管的是「一头 `−1e308`、另一头 `1e308`」这种跨度溢出；这一档管的是**单笔读数本身**。 */
function reqReading(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) badInput(field + ' 必须是有限数');
  if (Math.abs(value) + Math.abs(value) > SCATTER_FIT_MAGNITUDE_MAX) {
    badInput(field + ' 的量级太大：两笔同量级的读数相加就溢出成 `Infinity`'
      + '（轴上会写出 `1e+308` 这类读不出来的数；读数至多到 `Number.MAX_VALUE ÷ 2` 那一档）');
  }
  return value;
}

/** 散点：1–120 条，x／y 都是有限数；`outlier` 给了就得写清原因（点名是给人看的，不是一枚空标记）。 */
function reqPoints(value: unknown): readonly ScatterFitPoint[] {
  if (!Array.isArray(value) || value.length < SCATTER_FIT_MIN_POINTS) {
    badInput('scatter-fit: input.points 至少 ' + String(SCATTER_FIT_MIN_POINTS)
      + ' 条（一个读数都没有就画不出图）');
  }
  if (value.length > SCATTER_FIT_MAX_POINTS) {
    badInput('scatter-fit: input.points 最多 ' + String(SCATTER_FIT_MAX_POINTS) + ' 条（再多请调用方先聚合）');
  }
  return value.map((item, i) => {
    const at = 'scatter-fit: input.points[' + String(i) + ']';
    assertPlainObject(item, at);
    const p = item as Record<string, unknown>;
    assertKeys(p, POINT_KEYS, at);
    const x = reqReading(p.x, at + '.x');
    const y = reqReading(p.y, at + '.y');
    return {
      x,
      y,
      label: optRealText(p.label, at + '.label'),
      outlier: optRealText(p.outlier, at + '.outlier'),
    };
  });
}

/** 分箱：2–8 箱，`low ≤ median ≤ high`，每箱样本数 ≥ 5（样本太薄的箱画出来说明不了任何事）。 */
function reqBins(value: unknown): readonly ScatterFitBin[] {
  if (!Array.isArray(value) || value.length < SCATTER_FIT_BIN_MIN) {
    badInput('scatter-fit: input.bins 至少 ' + String(SCATTER_FIT_BIN_MIN) + ' 箱（一箱看不出趋势）');
  }
  if (value.length > SCATTER_FIT_BIN_MAX) {
    badInput('scatter-fit: input.bins 最多 ' + String(SCATTER_FIT_BIN_MAX) + ' 箱（再多窄屏读不出标签）');
  }
  return value.map((item, i) => {
    const at = 'scatter-fit: input.bins[' + String(i) + ']';
    assertPlainObject(item, at);
    const b = item as Record<string, unknown>;
    assertKeys(b, BIN_KEYS, at);
    const label = reqRealText(b.label, at + '.label');
    const nums: number[] = [];
    for (const key of ['low', 'median', 'high'] as const) {
      nums.push(reqReading(b[key], at + '.' + key));
    }
    const low = nums[0];
    const median = nums[1];
    const high = nums[2];
    if (!(low <= median && median <= high)) {
      badInput(at + ' 必须满足 low ≤ median ≤ high（下四分位、中位数、上四分位按这个次序）');
    }
    const count = b.count;
    if (typeof count !== 'number' || !Number.isInteger(count) || count < SCATTER_FIT_BIN_MIN_SAMPLE) {
      badInput(at + '.count 至少 ' + String(SCATTER_FIT_BIN_MIN_SAMPLE)
        + ' 个样本（样本太薄的箱画出来说明不了任何事，请调用方先合箱）');
    }
    if (Math.abs(count) + Math.abs(count) > SCATTER_FIT_MAGNITUDE_MAX) {
      badInput(at + '.count 的量级太大（样本数至多到 `Number.MAX_VALUE ÷ 2` 那一档）');
    }
    return { label, low, median, high, count };
  });
}

/** 滞后：2–6 档，错开天数 0…5 且严格递增，r 在 −1…1（错开更多天，样本会薄到说明不了任何事）。 */
function reqLags(value: unknown): readonly ScatterFitLag[] {
  if (!Array.isArray(value) || value.length < SCATTER_FIT_LAG_MIN) {
    badInput('scatter-fit: input.lags 至少 ' + String(SCATTER_FIT_LAG_MIN) + ' 档（一档没有"最强"可比）');
  }
  if (value.length > SCATTER_FIT_LAG_MAX) {
    badInput('scatter-fit: input.lags 最多 ' + String(SCATTER_FIT_LAG_MAX) + ' 档');
  }
  let prev = -1;
  return value.map((item, i) => {
    const at = 'scatter-fit: input.lags[' + String(i) + ']';
    assertPlainObject(item, at);
    const g = item as Record<string, unknown>;
    assertKeys(g, LAG_KEYS, at);
    const step = g.step;
    if (typeof step !== 'number' || !Number.isInteger(step) || step < 0 || step > SCATTER_FIT_MAX_LAG_DAYS) {
      badInput(at + '.step 必须是 0…' + String(SCATTER_FIT_MAX_LAG_DAYS)
        + ' 的整数（错开更多天样本会薄到说明不了任何事）');
    }
    if (step <= prev) badInput(at + '.step 必须严格递增（第 ' + String(i) + ' 档不大于上一档）');
    prev = step;
    const r = reqReading(g.r, at + '.r');
    if (r < -1 || r > 1) badInput(at + '.r 必须是 −1…1 之间的有限数');
    return { step, r };
  });
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `ScatterFitModel`，不再自己碰 `any`。 */
export function normalizeScatterFit(input: unknown): ScatterFitModel {
  assertPlainObject(input, 'renderScatterFit: input');
  const raw = input as Record<string, unknown>;
  assertKeys(raw, INPUT_KEYS, 'renderScatterFit: input');

  const form = raw.form === undefined ? SCATTER_FIT_FORMS[0] : raw.form;
  if (!(SCATTER_FIT_FORMS as readonly unknown[]).includes(form)) {
    badInput('scatter-fit: input.form 必须是 ' + SCATTER_FIT_FORMS.join('／')
      + ' 之一（A 散点／B 分箱／C 滞后）');
  }
  const common: CommonFields = {
    title: reqRealText(raw.title, 'scatter-fit: input.title'),
    xName: reqRealText(raw.xName, 'scatter-fit: input.xName'),
    yName: reqRealText(raw.yName, 'scatter-fit: input.yName'),
    xUnit: optRealText(raw.xUnit, 'scatter-fit: input.xUnit'),
    yUnit: optRealText(raw.yUnit, 'scatter-fit: input.yUnit'),
    stamp: optRealText(raw.stamp, 'scatter-fit: input.stamp'),
    noteIn: optRealText(raw.note, 'scatter-fit: input.note'),
    extraClass: optExtraClass(raw.extraClass, 'scatter-fit: input.extraClass'),
  };
  /* 形态决定读哪个数组：**缺了就是缺了**（不拿别的形态的字段顶上，那是静默降级）。 */
  if (form === 'bin') return binModel(common, reqBins(raw.bins));
  if (form === 'lag') return lagModel(common, reqLags(raw.lags));
  return scatterModel(common, reqPoints(raw.points));
}
