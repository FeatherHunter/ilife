/** gap-band · **入参校验与归一化入口**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级、不"尽量猜"：
 *      天数不够、计划／目标缺了或不是数、日子空串，画出来都是"错位"，
 *      而调用方以为自己给的是一张完整的图。
 *   2. **校验与算数分家**：本件只做「形状与范围」，算数（轴域、刻度、坐标映射、数字写法）住同目录
 *      `scale.ts`，两个骨架的装配住 `forms.ts` —— 一次落两档，三件事挤在一件里会超本包告警线 350。
 *   3. **空白串不是文本**：全空白的 `title`／日子会在屏上留一块空白，**一律拒**
 *      （与同层 `optExtraClass` 对空白串的口径一致；可选文本字段同办：空串仍按"未给"处理）。
 */
import { assertDenseArray, assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  GAP_BAND_FORMS,
  GAP_BAND_MAX_DAYS,
  GAP_BAND_MIN_DAYS,
  type GapBandDay,
} from './attrs.js';
import { bandModel, deviationModel, type GapBandCommon, type GapBandModel } from './forms.js';

/* 内部类型住 `forms.ts`（那是两个骨架装配出来的形状）；这里只把类型名再报一次，方便 `render.ts` 读。 */
export type {
  GapBandAnchorModel,
  GapBandBandModel,
  GapBandDevBarModel,
  GapBandDevModel,
  GapBandLegendItem,
  GapBandModel,
  GapBandTickModel,
  GapBandXModel,
} from './forms.js';

/* ── 校验 ─────────────────────────────────────────────────────────── */

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

/** 一个读数：有限数（`NaN`／`Infinity`／数字串一律拒）。 */
function reqNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) badInput(field + ' 必须是有限数');
  return value;
}

/** 逐日读数：3–12 天，日子非空，读数是有限数（B 档的偏差是拿它减目标算出来的，这里只收绝对读数）。 */
function reqDays(value: unknown): readonly GapBandDay[] {
  if (!Array.isArray(value) || value.length < GAP_BAND_MIN_DAYS) {
    badInput('gap-band: input.days 至少 ' + String(GAP_BAND_MIN_DAYS)
      + ' 条（一两天谈不上随时间的差）');
  }
  if (value.length > GAP_BAND_MAX_DAYS) {
    badInput('gap-band: input.days 最多 ' + String(GAP_BAND_MAX_DAYS)
      + ' 条（再多窄容器里一列站不住，请调用方先按周聚合）');
  }
  assertDenseArray(value, 'gap-band: input.days');
  return value.map((item, i) => {
    const at = 'gap-band: input.days[' + String(i) + ']';
    assertPlainObject(item, at);
    const d = item as Record<string, unknown>;
    return { label: reqRealText(d.label, at + '.label'), value: reqNumber(d.value, at + '.value') };
  });
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `GapBandModel`，不再自己碰 `any`。 */
export function normalizeGapBand(input: unknown): GapBandModel {
  assertPlainObject(input, 'renderGapBand: input');
  const raw = input as Record<string, unknown>;

  const form = raw.form === undefined ? GAP_BAND_FORMS[0] : raw.form;
  if (!(GAP_BAND_FORMS as readonly unknown[]).includes(form)) {
    badInput('gap-band: input.form 必须是 ' + GAP_BAND_FORMS.join('／')
      + ' 之一（连续差值带／每日偏差柱）');
  }
  const common: GapBandCommon = {
    title: reqRealText(raw.title, 'gap-band: input.title'),
    unit: optRealText(raw.unit, 'gap-band: input.unit'),
    stamp: optRealText(raw.stamp, 'gap-band: input.stamp'),
    noteIn: optRealText(raw.note, 'gap-band: input.note'),
    extraClass: optExtraClass(raw.extraClass, 'gap-band: input.extraClass'),
  };
  const days = reqDays(raw.days);
  /* 形态决定读哪个标量：**缺了就是缺了**（不拿另一个形态的字段顶上，那是静默降级）。 */
  if (form === 'deviation') {
    return deviationModel(common, reqNumber(raw.target, 'gap-band: input.target'), days);
  }
  return bandModel(common, reqNumber(raw.plan, 'gap-band: input.plan'), days);
}
