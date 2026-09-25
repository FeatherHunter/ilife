/** spread-dist · **入参校验与归一化入口**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级、不"尽量猜"：
 *      天数不够、分位档数是偶数、区间上下界反了、分位不随档名递增，画出来都是"错位"，
 *      而调用方以为自己给的是一张完整的图。
 *   2. **校验与算数分家**：本件只做「形状与范围」，算数（轴域、刻度、坐标映射、数字写法）住同目录
 *      `scale.ts`，两个骨架的装配住 `forms.ts` —— 一次落两档，三件事挤在一件里会超本包告警线 350。
 *   3. **空白串不是文本**：全空白的 `title`／日子／档名会在屏上留一块空白，**一律拒**
 *      （与同层 `optExtraClass` 对空白串的口径一致；可选文本字段同办：空串仍按"未给"处理）。
 */
import { assertDenseArray, assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  SPREAD_DIST_FORMS,
  SPREAD_DIST_MAX_DAYS,
  SPREAD_DIST_MAX_STOPS,
  SPREAD_DIST_MIN_DAYS,
  SPREAD_DIST_MIN_STOPS,
  type SpreadDistDay,
  type SpreadDistStop,
} from './attrs.js';
import { quantileModel, rangeModel, type SpreadDistCommon, type SpreadDistModel } from './forms.js';

/* 内部类型住 `forms.ts`（那是两个骨架装配出来的形状）；这里只把类型名再报一次，方便 `render.ts` 读。 */
export type {
  SpreadDistCommon,
  SpreadDistDayModel,
  SpreadDistLegendItem,
  SpreadDistModel,
  SpreadDistStopModel,
  SpreadDistTickModel,
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

/** 逐日读数：3–12 天，`low ≤ high`，给了中位数就得满足 `low ≤ median ≤ high`。 */
function reqDays(value: unknown): readonly SpreadDistDay[] {
  if (!Array.isArray(value) || value.length < SPREAD_DIST_MIN_DAYS) {
    badInput('spread-dist: input.days 至少 ' + String(SPREAD_DIST_MIN_DAYS)
      + ' 条（一天谈不上逐日波动，请调用方先在别处聚合）');
  }
  if (value.length > SPREAD_DIST_MAX_DAYS) {
    badInput('spread-dist: input.days 最多 ' + String(SPREAD_DIST_MAX_DAYS)
      + ' 条（再多窄容器里一列站不住，请调用方先按周聚合）');
  }
  assertDenseArray(value, 'spread-dist: input.days');
  return value.map((item, i) => {
    const at = 'spread-dist: input.days[' + String(i) + ']';
    assertPlainObject(item, at);
    const d = item as Record<string, unknown>;
    const label = reqRealText(d.label, at + '.label');
    const low = reqNumber(d.low, at + '.low');
    const high = reqNumber(d.high, at + '.high');
    if (!(low <= high)) badInput(at + ' 必须满足 low ≤ high（最低那个读数不能比最高那个还大）');
    if (d.median === undefined) return { label, low, high };
    const median = reqNumber(d.median, at + '.median');
    if (!(low <= median && median <= high)) {
      badInput(at + ' 的中位数必须落在最低与最高之间（否则中位块会画到区间条外面）');
    }
    return { label, low, high, median };
  });
}

/** 分位各档：**3／5／7 档**（奇数——正中那一档就是中位），档名互不相同，读数随档名递增。 */
function reqStops(value: unknown): readonly SpreadDistStop[] {
  if (!Array.isArray(value) || value.length < SPREAD_DIST_MIN_STOPS) {
    badInput('spread-dist: input.stops 至少 ' + String(SPREAD_DIST_MIN_STOPS) + ' 档（少了读不出摊开的样子）');
  }
  if (value.length > SPREAD_DIST_MAX_STOPS) {
    badInput('spread-dist: input.stops 最多 ' + String(SPREAD_DIST_MAX_STOPS)
      + ' 档（再多窄容器里每一格都要折行）');
  }
  if (value.length % 2 === 0) {
    badInput('spread-dist: input.stops 的档数必须是奇数（' + String(SPREAD_DIST_MIN_STOPS) + '／5／'
      + String(SPREAD_DIST_MAX_STOPS) + '）——正中那一档就是中位，偶数档没有正中');
  }
  assertDenseArray(value, 'spread-dist: input.stops');
  const seen = new Set<string>();
  let prev = Number.NEGATIVE_INFINITY;
  return value.map((item, i) => {
    const at = 'spread-dist: input.stops[' + String(i) + ']';
    assertPlainObject(item, at);
    const s = item as Record<string, unknown>;
    const name = reqRealText(s.name, at + '.name');
    if (seen.has(name)) badInput(at + '.name 与前面某一档同名（档名是这一格的坐标，两格同名就指代不了）');
    seen.add(name);
    const v = reqNumber(s.value, at + '.value');
    if (i > 0 && v < prev) {
      badInput(at + '.value 必须不小于上一档（分位是单调的，读数反着走画出来是错的）');
    }
    prev = v;
    return { name, value: v };
  });
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `SpreadDistModel`，不再自己碰 `any`。 */
export function normalizeSpreadDist(input: unknown): SpreadDistModel {
  assertPlainObject(input, 'renderSpreadDist: input');
  const raw = input as Record<string, unknown>;

  const form = raw.form === undefined ? SPREAD_DIST_FORMS[0] : raw.form;
  if (!(SPREAD_DIST_FORMS as readonly unknown[]).includes(form)) {
    badInput('spread-dist: input.form 必须是 ' + SPREAD_DIST_FORMS.join('／')
      + ' 之一（逐日范围柱／分位尺）');
  }
  const common: SpreadDistCommon = {
    title: reqRealText(raw.title, 'spread-dist: input.title'),
    unit: optRealText(raw.unit, 'spread-dist: input.unit'),
    stamp: optRealText(raw.stamp, 'spread-dist: input.stamp'),
    noteIn: optRealText(raw.note, 'spread-dist: input.note'),
    extraClass: optExtraClass(raw.extraClass, 'spread-dist: input.extraClass'),
  };
  /* 形态决定读哪个数组：**缺了就是缺了**（不拿另一个形态的字段顶上，那是静默降级）。 */
  if (form === 'quantile') return quantileModel(common, reqStops(raw.stops));
  return rangeModel(common, reqDays(raw.days));
}
