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
  SPREAD_DIST_BOX_MIN_COUNT,
  SPREAD_DIST_FORMS,
  SPREAD_DIST_MAX_BOXES,
  SPREAD_DIST_MAX_DAYS,
  SPREAD_DIST_MAX_STOPS,
  SPREAD_DIST_MIN_BOXES,
  SPREAD_DIST_MIN_DAYS,
  SPREAD_DIST_MIN_STOPS,
  type SpreadDistBox,
  type SpreadDistDay,
  type SpreadDistStop,
} from './attrs.js';
import { boxModel, quantileModel, rangeModel, type SpreadDistCommon, type SpreadDistModel } from './forms.js';

/* 内部类型住 `forms.ts`（那是三个骨架装配出来的形状）；这里只把类型名再报一次，方便 `render.ts` 读。 */
export type {
  SpreadDistCommon,
  SpreadDistDayModel,
  SpreadDistGroupModel,
  SpreadDistLegendItem,
  SpreadDistModel,
  SpreadDistRulerTickModel,
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

/** 笔数：**正整数**（`18 笔`里的 18；小数／0／负数都拒——笔数是数出来的，不是量出来的）。 */
function reqCount(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    badInput(field + ' 必须是正整数（这一组有几笔）');
  }
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

/** A 档一组：**两种读法二选一**（五数概括画箱／单笔读数只点），任一条对不上都当场拒。
 *
 *  为什么卡这么死：一张箱线图上，同一行的「箱」与「散点」是两种不同的读法（一个说形状、一个说每一笔），
 *  混在一行里读者分不清在看哪一种；样本量决定该用哪一种，件替调用方把这条守住。 */
function reqBox(item: unknown, i: number): SpreadDistBox {
  const at = 'spread-dist: input.boxes[' + String(i) + ']';
  assertPlainObject(item, at);
  const b = item as Record<string, unknown>;
  const label = reqRealText(b.label, at + '.label');
  const count = reqCount(b.count, at + '.count');
  const median = reqNumber(b.median, at + '.median');
  const five = [b.low, b.q1, b.q3, b.high];
  const given = five.filter((v) => v !== undefined).length;
  if (given !== 0 && given !== five.length) {
    badInput(at + ' 的 low／q1／q3／high 要么全给（画箱），要么全不给（样本不足时只点每一笔）'
      + '—— 只给一半画不出箱体，读者会以为那一头就是端点');
  }
  if (given === 0) {
    /* 样本不足那一支：**每一笔都点在尺子上**，故点数必须正好是笔数。 */
    if (b.points === undefined) {
      badInput(at + ' 没给五数概括（low／q1／q3／high），就必须给 points（每一笔的读数本身）'
        + '—— 一行要么是箱、要么是点，不给就什么都没画');
    }
    if (b.outliers !== undefined) badInput(at + '.outliers 与 points 不能同时给（不画箱就没有「须外的点」这回事）');
    if (count >= SPREAD_DIST_BOX_MIN_COUNT) {
      badInput(at + '.count 有 ' + String(count) + ' 笔（≥ ' + String(SPREAD_DIST_BOX_MIN_COUNT)
        + '）：样本够画箱，请给五数概括（画点会把「中间那批落在哪」这件事丢掉）');
    }
    const raw = b.points;
    if (!Array.isArray(raw) || raw.length !== count) {
      badInput(at + '.points 必须正好有 ' + String(count) + ' 笔（每一笔都点在尺子上，笔数对不上就是漏画）');
    }
    assertDenseArray(raw, at + '.points');
    const points = raw.map((p, j) => reqNumber(p, at + '.points[' + String(j) + ']'));
    return { label, count, median, points };
  }
  const low = reqNumber(b.low, at + '.low');
  const q1 = reqNumber(b.q1, at + '.q1');
  const q3 = reqNumber(b.q3, at + '.q3');
  const high = reqNumber(b.high, at + '.high');
  if (!(low <= q1 && q1 <= median && median <= q3 && q3 <= high)) {
    badInput(at + ' 必须满足 low ≤ q1 ≤ 中位 ≤ q3 ≤ high（次序反了，箱体与须会画到互相错位）');
  }
  if (count < SPREAD_DIST_BOX_MIN_COUNT) {
    badInput(at + '.count 只有 ' + String(count) + ' 笔（< ' + String(SPREAD_DIST_BOX_MIN_COUNT)
      + '）：样本太少，箱体的形状是估计出来的 ⇒ 请改给 points（每一笔点在尺子上，不画箱）');
  }
  if (b.points !== undefined) badInput(at + '.points 只在样本不足（count < '
    + String(SPREAD_DIST_BOX_MIN_COUNT) + '）时给：画箱那一支每一笔已经概括在五数里了');
  if (b.outliers === undefined) return { label, count, median, low, q1, q3, high };
  const raw = b.outliers;
  if (!Array.isArray(raw)) badInput(at + '.outliers 必须是数组（每一枚是那个离群读数的值）');
  assertDenseArray(raw, at + '.outliers');
  const outliers = raw.map((o, j) => {
    const v = reqNumber(o, at + '.outliers[' + String(j) + ']');
    if (low <= v && v <= high) {
      badInput(at + '.outliers[' + String(j) + '] 落在须里（' + String(v) + ' 在 ' + String(low) + ' 与 '
        + String(high) + ' 之间）：须里的点不是离群点，画上去读者会把它当异常');
    }
    return v;
  });
  return { label, count, median, low, q1, q3, high, outliers };
}

/** A 档各组：**1–8 组**（一组也画得出；多于 8 组一屏读不完），组名互不相同。 */
function reqBoxes(value: unknown): readonly SpreadDistBox[] {
  if (!Array.isArray(value) || value.length < SPREAD_DIST_MIN_BOXES) {
    badInput('spread-dist: input.boxes 至少 ' + String(SPREAD_DIST_MIN_BOXES) + ' 组（空数组没有东西可画）');
  }
  if (value.length > SPREAD_DIST_MAX_BOXES) {
    badInput('spread-dist: input.boxes 最多 ' + String(SPREAD_DIST_MAX_BOXES)
      + ' 组（再多一屏读不完，请调用方先按大类归并）');
  }
  assertDenseArray(value, 'spread-dist: input.boxes');
  const seen = new Set<string>();
  return value.map((item, i) => {
    const box = reqBox(item, i);
    if (seen.has(box.label)) {
      badInput('spread-dist: input.boxes[' + String(i) + '].label 与前面某一组同名（组名是这一行的坐标，两行同名就指代不了）');
    }
    seen.add(box.label);
    return box;
  });
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `SpreadDistModel`，不再自己碰 `any`。 */
export function normalizeSpreadDist(input: unknown): SpreadDistModel {
  assertPlainObject(input, 'renderSpreadDist: input');
  const raw = input as Record<string, unknown>;

  const form = raw.form === undefined ? SPREAD_DIST_FORMS[0] : raw.form;
  if (!(SPREAD_DIST_FORMS as readonly unknown[]).includes(form)) {
    badInput('spread-dist: input.form 必须是 ' + SPREAD_DIST_FORMS.join('／')
      + ' 之一（箱线／逐日范围柱／分位尺）');
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
  if (form === 'box') return boxModel(common, reqBoxes(raw.boxes));
  return rangeModel(common, reqDays(raw.days));
}
