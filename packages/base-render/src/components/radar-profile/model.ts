/** radar-profile · **入参校验与归一化入口**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  四条口径：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级、不"尽量猜"：
 *      轴根数不对、轴名太长、得分越界、基准带上下界反了，画出来是"错位的形状"，
 *      而调用方以为自己给的是一张完整的画像。
 *   2. **缺值与空串是两件事**：`score: null` ＝ **缺测**（整根不落图、读数写 `—`，**不当 0 分算**）；
 *      字段缺席 ＝ 调用方没给（真必填的那几个当场报错）；空串／全空白串一律拒（会在屏上留一块空白）。
 *   3. **形态决定认哪些读数**：给别的形态才认的字段（`polygon` 的 `prior`／`wedge` 的 `goal`／
 *      `rail` 的 `band` 与轴 `note`）一律拒——收下却不画，等于静默丢数据。
 *   4. **校验与算数分家**：本件只做「形状与范围」，几何与格式化住 `scale.ts`，三形态的装配住 `forms.ts`
 *      ——一次落三个形态，两件事挤在一件里会超本包告警线 350。
 */
import { assertDenseArray, assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  RADAR_PROFILE_FORMS,
  RADAR_PROFILE_DEFAULT_GOAL,
  RADAR_PROFILE_MAX_AXES,
  RADAR_PROFILE_MAX_LABEL_CHARS,
  RADAR_PROFILE_MAX_SCORE,
  RADAR_PROFILE_MIN_AXES,
  type RadarProfileAxis,
  type RadarProfileBand,
  type RadarProfileForm,
} from './attrs.js';
import { axisModels, type RadarProfileCommon } from './fields.js';
import { polygonModel, railModel, wedgeModel } from './forms.js';
import type { RadarProfileModel } from './fields.js';

/* 内部类型住 `fields.ts`（那是三个骨架装配出来的形状）；这里只把类型名再报一次，方便 `render.ts` 读。 */
export type {
  RadarProfileAxisModel,
  RadarProfileCommon,
  RadarProfileGapModel,
  RadarProfileLabelModel,
  RadarProfileLegendItemModel,
  RadarProfileModel,
  RadarProfileRailRowModel,
  RadarProfileRingModel,
  RadarProfileSpokeModel,
  RadarProfileTableRowModel,
  RadarProfileVertexModel,
  RadarProfileWedgeModel,
} from './fields.js';

/* ── 校验小件 ─────────────────────────────────────────────────────── */

/** 必填文本：非空串**且不是全空白**（全空白的标题会在屏上留一块空白，那是"看得到的错"）。 */
function reqRealText(value: unknown, field: string): string {
  const text = reqText(value, field);
  if (text.trim() === '') badInput(field + ' 必须是真正的文本（全空白不算）');
  return text;
}

/** 可选文本：空串＝未给（与全层 `optText` 同口径）；**全空白＝拒**。 */
function optRealText(value: unknown, field: string): string | undefined {
  const text = optText(value, field);
  if (text !== undefined && text.trim() === '') badInput(field + ' 必须是真正的文本（全空白不算）');
  return text;
}

/** 轴名：非空、非全空白、**至多 `RADAR_PROFILE_MAX_LABEL_CHARS` 个字**（它浮在图的四周外侧）。 */
function reqLabel(value: unknown, field: string): string {
  if (typeof value !== 'string' || value === '') {
    badInput(field + ' 必须是非空字符串（这一根轴的名字）');
  }
  if (value.trim() === '') badInput(field + ' 必须是真正的文本（全空白不算）');
  if (value.length > RADAR_PROFILE_MAX_LABEL_CHARS) {
    badInput(field + ' 至多 ' + String(RADAR_PROFILE_MAX_LABEL_CHARS) + ' 个字（现在 '
      + String(value.length) + ' 个：轴名浮在图的四周外侧，再长就会顶宽容器或者压到隔壁那根）');
  }
  return value;
}

/** 得分：`null` ＝ 缺测（合法且是**有意的**写法）；数则须是 0…100 之间的有限数。 */
function reqScore(value: unknown, field: string): number | null {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    badInput(field + ' 必须是 0…' + String(RADAR_PROFILE_MAX_SCORE) + ' 之间的有限数（缺测请显式给缺测）');
  }
  if (value < 0 || value > RADAR_PROFILE_MAX_SCORE) {
    badInput(field + ' 必须在 0…' + String(RADAR_PROFILE_MAX_SCORE) + ' 之间（超出这个范围就不是这一档的分位了）');
  }
  return value;
}

/** 基准区间：两端都是 0…100 的有限数，且 `low ≤ high`（反了就画出一条负宽的带）。 */
function reqBand(value: unknown, field: string): RadarProfileBand {
  assertPlainObject(value, field);
  const raw = value as Record<string, unknown>;
  const low = raw.low;
  const high = raw.high;
  if (typeof low !== 'number' || !Number.isFinite(low) || low < 0 || low > RADAR_PROFILE_MAX_SCORE) {
    badInput(field + '.low 必须是 0…' + String(RADAR_PROFILE_MAX_SCORE) + ' 之间的有限数');
  }
  if (typeof high !== 'number' || !Number.isFinite(high) || high < 0 || high > RADAR_PROFILE_MAX_SCORE) {
    badInput(field + '.high 必须是 0…' + String(RADAR_PROFILE_MAX_SCORE) + ' 之间的有限数');
  }
  if (!(low <= high)) badInput(field + ' 必须满足 low ≤ high（下界、上界按这个次序给）');
  return { low, high };
}

/** 达标线：0…100 的有限数（0 ＝ 谁都达标，100 ＝ 只有满分达标，两者都合法）。 */
function reqGoal(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > RADAR_PROFILE_MAX_SCORE) {
    badInput(field + ' 必须是 0…' + String(RADAR_PROFILE_MAX_SCORE) + ' 之间的有限数');
  }
  return value;
}

/** 几根轴：3…8 根、不许有洞、逐根校验；**给别的形态才认的字段一律拒**（不静默丢数据）。 */
function reqAxes(value: unknown, form: RadarProfileForm): RadarProfileAxis[] {
  if (!Array.isArray(value) || value.length < RADAR_PROFILE_MIN_AXES) {
    badInput('radar-profile: input.axes 至少要三项（三根轴才围得成一个形状）');
  }
  if (value.length > RADAR_PROFILE_MAX_AXES) {
    badInput('radar-profile: input.axes 至多 ' + String(RADAR_PROFILE_MAX_AXES) + ' 项（再多的轴在窄档上挤在一起）');
  }
  assertDenseArray(value, 'radar-profile: input.axes');
  const out: RadarProfileAxis[] = [];
  value.forEach((item, i) => {
    const at = 'radar-profile: input.axes[' + String(i) + ']';
    assertPlainObject(item, at);
    const raw = item as Record<string, unknown>;
    const label = reqLabel(raw.label, at + '.label');
    if (raw.score === undefined) {
      badInput(at + '.score 必填（给一个 0…' + String(RADAR_PROFILE_MAX_SCORE) + ' 的数，或者显式给缺测）');
    }
    const score = reqScore(raw.score, at + '.score');
    /* 上期只有形态 `polygon` 会画（表里的"上期／差"两列）：别的形态收下它只会静默丢掉。 */
    if (form !== 'polygon' && raw.past !== undefined) {
      badInput(at + '.past 只有形态 polygon（本期／上期两条轮廓）才认：'
        + '形态 ' + form + ' 把它收下却不画，等于静默丢数据');
    }
    const past = raw.past === undefined ? null : reqScore(raw.past, at + '.past');
    /* 说明与基准带只有形态 `rail` 会画。 */
    if (form !== 'rail' && raw.note !== undefined) badInput(at + '.note 只有形态 rail（展平成轴表）才认');
    if (form !== 'rail' && raw.band !== undefined) badInput(at + '.band 只有形态 rail（基准带）才认');
    out.push({
      label,
      score,
      past,
      note: form === 'rail' ? optRealText(raw.note, at + '.note') : undefined,
      band: form === 'rail' && raw.band !== undefined ? reqBand(raw.band, at + '.band') : undefined,
    });
  });
  return out;
}

/* ── 入口 ─────────────────────────────────────────────────────────── */

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `RadarProfileModel`，不再自己碰 `any`。 */
export function normalizeRadarProfile(input: unknown): RadarProfileModel {
  assertPlainObject(input, 'renderRadarProfile: input');
  const raw = input as Record<string, unknown>;

  const form = raw.form === undefined ? RADAR_PROFILE_FORMS[0] : raw.form;
  if (!(RADAR_PROFILE_FORMS as readonly unknown[]).includes(form)) {
    badInput('radar-profile: input.form 必须是 ' + RADAR_PROFILE_FORMS.join('／')
      + ' 之一（polygon 多边形雷达／wedge 极区扇图／rail 展平成轴表）');
  }
  const formKey = form as RadarProfileForm;
  if (formKey !== 'polygon' && raw.pastStamp !== undefined) {
    badInput('radar-profile: input.pastStamp 只有形态 polygon（本期／上期两条轮廓）才认');
  }
  if (formKey !== 'wedge' && raw.goal !== undefined) {
    badInput('radar-profile: input.goal 只有形态 wedge（达标环）才认');
  }
  const axes = axisModels(reqAxes(raw.axes, formKey));
  if (!axes.some((a) => a.score !== null)) {
    badInput('radar-profile: input.axes 里一根轴的读数都没有（全是缺测就围不成形状）');
  }
  const common: RadarProfileCommon = {
    title: reqRealText(raw.title, 'radar-profile: input.title'),
    stamp: optRealText(raw.stamp, 'radar-profile: input.stamp'),
    pastStamp: formKey === 'polygon' ? optRealText(raw.pastStamp, 'radar-profile: input.pastStamp') : undefined,
    noteIn: optRealText(raw.note, 'radar-profile: input.note'),
    extraClass: optExtraClass(raw.extraClass, 'radar-profile: input.extraClass'),
  };
  if (formKey === 'wedge') {
    const goal = raw.goal === undefined ? RADAR_PROFILE_DEFAULT_GOAL : reqGoal(raw.goal, 'radar-profile: input.goal');
    return wedgeModel(common, axes, goal);
  }
  if (formKey === 'rail') return railModel(common, axes);
  return polygonModel(common, axes);
}
