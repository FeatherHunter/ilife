/** portion-gauge · **入参校验与归一化入口**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级、不“尽量猜”：
 *      行数不够、克数不是数、占比越界，画出来都是“错位”，而调用方以为拿到了一组完整换算。
 *   2. **换算链三栏的数是同一份真值**：克数串、百分比、菜谱那一句都在这里**各算一次**，
 *      `render.ts` 只把算好的串写进两处（行头与换算栏各一处）——两处各算一遍必然走散。
 *   3. **空白串不是文本**：全空白的 `title`／食材名会在屏上留一块空白，**一律拒**
 *      （与同层 `optExtraClass` 对空白串的口径一致；可选文本字段同办：空串仍按“未给”处理）。
 */
import { assertDenseArray, assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  PORTION_GAUGE_FORMS,
  PORTION_GAUGE_MAX_ROWS,
  PORTION_GAUGE_MIN_ROWS,
  type PortionGaugeForm,
  type PortionGaugeRow,
} from './attrs.js';

/** 一行的内部形状：每个字段都已校验、已归一、已算好（`render.ts` 只拼标记，一个算术都不写）。 */
export interface PortionGaugeRowModel {
  readonly name: string;
  /** 出处那句（`主料，菜谱写“2 份”`）：分档与菜谱写法拼在这里，换算左栏读的是同一个菜谱串。 */
  readonly sub: string;
  /** 这一行合计多少克的写法（`700 g`）：行头与换算右栏读的是**同一个串**。 */
  readonly gramsText: string;
  /** 菜谱写的那一句（`2 份`）：出处句与换算左栏读的是**同一个串**。 */
  readonly recipeText: string;
  /** 右栏口径名（`营养库口径`／`生重（1 碗 ＝ 150 g）`）。 */
  readonly toLabelText: string;
  /** 占比（0…100，取一位小数）：占比那句的字与占比条的宽度读的是**同一个数**。 */
  readonly sharePct: number;
  /** 占比那句（`占一天蛋白 70%`）。 */
  readonly shareText: string;
}

/** 内部类型：每个字段都已校验、已归一、已算好。 */
export interface PortionGaugeModel {
  readonly form: PortionGaugeForm;
  readonly title: string;
  readonly stamp?: string;
  readonly tail?: string;
  readonly rows: readonly PortionGaugeRowModel[];
  readonly note: string;
  /** 缺换算的食材有几样（0＝没有缺的，那一行整行不出）。 */
  readonly missingCount: number;
  /** 缺换算那一行里的数（`还差 12 样没有换算` 里的 `12`）：**与克数走同一把分组**（同一处出，
   *  指数写法同样不被打散）；`missingCount` 是 0 时是空串（那一行整行不出）。 */
  readonly missingText: string;
  readonly extraClass?: string;
}

/** 本件的口径句（调用方不给 `note` 时用它；分隔符只用逗号与句号）。 */
export const PORTION_GAUGE_NOTE = '口径：左边永远是菜谱写的单位（份，碗，把），'
  + '右边永远是营养库认的单位（g）。中间是这一份菜的换算系数，'
  + '系数变了要写明是哪一版菜谱改的，不悄悄改数。'
  + '缺换算系数的食材整行不画，只在下面写还差几样没有换算。';

/** 必填文本：非空串**且不是全空白**（全空白的标题会在屏上留一块空白，那是“看得到的错”）。 */
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

/** 三位分组（`1200` → `1,200`；负号留在最前；小数部分原样）。
 *
 *  **指数写法原样返回**：量级大到（或小到）`String()` 只给指数写法时（`1e+21`／`1e-7`），
 *  按三位插逗号会把它切成 `1e,+21`／`1,e-7`——那是**读不出来的数**（同族先例
 *  `spread-dist/scale.ts` 的 `numText()`）。**非有限值一律 `badInput`**：写不出数的东西不上屏。 */
function groupNum(value: number): string {
  if (!Number.isFinite(value)) badInput('portion-gauge: 要写的数必须是有限数（读不到 ' + String(value) + '）');
  const s = String(value);
  if (s.includes('e') || s.includes('E')) return s;
  const dot = s.indexOf('.');
  const head = dot < 0 ? s : s.slice(0, dot);
  const frac = dot < 0 ? '' : s.slice(dot);
  const neg = head.startsWith('-');
  const body = neg ? head.slice(1) : head;
  let out = '';
  for (let i = 0; i < body.length; i += 1) {
    if (i > 0 && (body.length - i) % 3 === 0) out += ',';
    out += body[i];
  }
  return (neg ? '-' : '') + out + frac;
}

/** 一行的克数（有限数且大于 0）：0 与负数不是“一行菜的量”，小数照收（`12.5 g`）。 */
function reqGrams(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) badInput(field + ' 必须是有限数');
  if (!(value > 0)) badInput(field + ' 必须大于 0（一行菜没有克数就谈不上换算）');
  return value;
}

/** 占比（有限数且落在 0…100）：越界的占比画出来会顶出轨道，不静默夹。 */
function reqSharePct(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) badInput(field + ' 必须是有限数');
  if (!(value >= 0 && value <= 100)) badInput(field + ' 必须落在 0 到 100 之间（越界的占比会顶出轨道）');
  return Math.round(value * 10) / 10;
}

/** 换算各行：1–8 行；每一行的名字、菜谱写法、克数、占比项、占比都得到位。 */
function reqRows(value: unknown): readonly PortionGaugeRow[] {
  if (!Array.isArray(value) || value.length < PORTION_GAUGE_MIN_ROWS) {
    badInput('portion-gauge: input.rows 至少 ' + String(PORTION_GAUGE_MIN_ROWS)
      + ' 行（一道菜也要换算，请调用方至少给一行）');
  }
  if (value.length > PORTION_GAUGE_MAX_ROWS) {
    badInput('portion-gauge: input.rows 最多 ' + String(PORTION_GAUGE_MAX_ROWS)
      + ' 行（再多一屏读不完，请调用方先按餐分组）');
  }
  assertDenseArray(value, 'portion-gauge: input.rows');
  return value.map((item, i) => {
    const at = 'portion-gauge: input.rows[' + String(i) + ']';
    assertPlainObject(item, at);
    const r = item as Record<string, unknown>;
    const row: PortionGaugeRow = {
      name: reqRealText(r.name, at + '.name'),
      recipe: reqRealText(r.recipe, at + '.recipe'),
      grams: reqGrams(r.grams, at + '.grams'),
      shareOf: reqRealText(r.shareOf, at + '.shareOf'),
      sharePct: reqSharePct(r.sharePct, at + '.sharePct'),
    };
    const kind = optRealText(r.kind, at + '.kind');
    const basis = optRealText(r.basis, at + '.basis');
    const toLabel = optRealText(r.toLabel, at + '.toLabel');
    return {
      ...row,
      ...(kind === undefined ? {} : { kind }),
      ...(basis === undefined ? {} : { basis }),
      ...(toLabel === undefined ? {} : { toLabel }),
    };
  });
}

/** 缺换算有几样（非负整数；0＝没有缺的）。**写法与克数同一处出**：屏上那个数经 `groupNum()`。 */
function reqMissingCount(value: unknown): number {
  if (value === undefined) return 0;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    badInput('portion-gauge: input.missingCount 必须是非负整数（缺几样就写几样，没有缺的就不给）');
  }
  return value;
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `PortionGaugeModel`，不再自己碰 `any`。 */
export function normalizePortionGauge(input: unknown): PortionGaugeModel {
  assertPlainObject(input, 'renderPortionGauge: input');
  const raw = input as Record<string, unknown>;

  const form = raw.form === undefined ? PORTION_GAUGE_FORMS[0] : raw.form;
  if (!(PORTION_GAUGE_FORMS as readonly unknown[]).includes(form)) {
    badInput('portion-gauge: input.form 必须是 ' + PORTION_GAUGE_FORMS.join('／')
      + ' 之一（本件只落地换算三栏）');
  }

  const rows = reqRows(raw.rows).map((r) => {
    /* 同一份真值各算一次：克数串只拼一遍（行头与右栏同引），菜谱串只收一遍
       （出处句与左栏同引），百分比只取一位（占比句与条宽同引）。 */
    const gramsText = groupNum(r.grams) + ' g';
    const pctText = String(r.sharePct) + '%';
    const toName = r.toLabel ?? '营养库口径';
    const model: PortionGaugeRowModel = {
      name: r.name,
      sub: (r.kind === undefined ? '' : r.kind + '，') + '菜谱写「' + r.recipe + '」',
      gramsText,
      recipeText: r.recipe,
      toLabelText: r.basis === undefined ? toName : toName + '（' + r.basis + '）',
      sharePct: r.sharePct,
      shareText: '占一天' + r.shareOf + ' ' + pctText,
    };
    return model;
  });

  /* 缺换算那个数也在这一处定形（写法与克数同一把分组）：`render.ts` 只贴它，不再自己 `String()`。 */
  const missingCount = reqMissingCount(raw.missingCount);

  return {
    form: form as PortionGaugeForm,
    title: reqRealText(raw.title, 'portion-gauge: input.title'),
    stamp: optRealText(raw.stamp, 'portion-gauge: input.stamp'),
    tail: optRealText(raw.tail, 'portion-gauge: input.tail'),
    rows,
    note: optRealText(raw.note, 'portion-gauge: input.note') ?? PORTION_GAUGE_NOTE,
    missingCount,
    missingText: missingCount > 0 ? groupNum(missingCount) : '',
    extraClass: optExtraClass(raw.extraClass, 'portion-gauge: input.extraClass'),
  };
}
