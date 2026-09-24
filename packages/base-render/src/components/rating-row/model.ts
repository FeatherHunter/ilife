/** rating-row · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径（与本节其余件同一份）：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级、不「尽量猜」；
 *   2. **缺值与 0 是两件事**：`value: null` ＝ 还没评过（读数写 `—`）；`value: 0` ＝ 给了零分（读数写 `0`）；
 *   3. 归一化只做「形状」：小数（`4.5`）按**半分档**收（`.5` 之外的分位一律拒——星星画不出来那个精度）。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  RATING_ROW_DEFAULT_MAX,
  RATING_ROW_FORMS,
  RATING_ROW_LOADING_TEXT,
  RATING_ROW_MAX_MAX,
  RATING_ROW_MISSING,
  type RatingRowForm,
} from './attrs.js';

/** 内部类型（`render.ts` 只吃它，不再自己碰 `any`）。 */
export interface RatingRowModel {
  readonly form: RatingRowForm;
  readonly name: string;
  readonly label: string;
  /** `null` ＝ 还没评过（读数写 `—`）。 */
  readonly value: number | null;
  readonly max: number;
  readonly prevNote?: string;
  readonly hint?: string;
  readonly required: boolean;
  readonly disabled: boolean;
  readonly disabledReason?: string;
  readonly loading: boolean;
  readonly loadingText: string;
  readonly error?: string;
  readonly extraClass?: string;
}

/** 可选布尔：只收真布尔（`'yes'`／`1` 一律拒——它们说不出"是不是真的指 true"）。 */
function optBool(value: unknown, field: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') badInput(field + ' 必须是布尔');
  return value;
}

/** 可选分数：只收有限数或数字串；**半分档**（`.5` 之外的分位画不出来，当场拒）。 */
function optScore(value: unknown, field: string): number | undefined {
  if (value === undefined) return undefined;
  let n: number;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) badInput(field + ' 必须是有限数字');
    n = value;
  } else if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    n = Number(value);
  } else {
    badInput(field + ' 必须是数字或数字串');
  }
  if (n < 0) badInput(field + ' 不得小于 0');
  if (!Number.isInteger(n * 2)) {
    badInput(field + ' 只许整数或 .5 档（半分）：星星画不出更细的精度，给了也读不出来');
  }
  return n;
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `RatingRowModel`。 */
export function normalizeRatingRow(input: unknown): RatingRowModel {
  assertPlainObject(input, 'renderRatingRow: input');
  const raw = input as Record<string, unknown>;

  const form = raw.form === undefined ? RATING_ROW_FORMS[0] : raw.form;
  if (!(RATING_ROW_FORMS as readonly unknown[]).includes(form)) {
    badInput('rating-row: input.form 必须是 ' + RATING_ROW_FORMS.join('／') + ' 之一（本件只落地形态 A「星级＋分数」）');
  }

  const max = optScore(raw.max, 'rating-row: input.max');
  const stars = max === undefined ? RATING_ROW_DEFAULT_MAX : max;
  if (!Number.isInteger(stars) || stars < 1 || stars > RATING_ROW_MAX_MAX) {
    badInput('rating-row: input.max 必须是 1–' + String(RATING_ROW_MAX_MAX) + ' 之间的整数（满档＝几颗星）');
  }

  /* 缺值与 0 是两件事：`null` 写 `—`，`0` 写 `0`。 */
  let value: number | null = null;
  if (raw.value !== undefined && raw.value !== null) {
    const v = optScore(raw.value, 'rating-row: input.value') as number;
    if (v > stars) badInput('rating-row: input.value 不得大于满档 ' + String(stars) + '：' + String(v));
    value = v;
  }

  const disabled = optBool(raw.disabled, 'rating-row: input.disabled') === true;
  const disabledReason = optText(raw.disabledReason, 'rating-row: input.disabledReason');
  if (disabledReason !== undefined && !disabled) {
    badInput('rating-row: input.disabledReason 只在 disabled=true 时给（否则这句"为什么不能评"说不清）');
  }
  const loading = optBool(raw.loading, 'rating-row: input.loading') === true;
  const loadingText = optText(raw.loadingText, 'rating-row: input.loadingText');
  if (loadingText !== undefined && !loading) badInput('rating-row: input.loadingText 只在 loading=true 时给');

  return {
    form: form as RatingRowForm,
    name: reqText(raw.name, 'rating-row: input.name'),
    label: reqText(raw.label, 'rating-row: input.label'),
    value,
    max: stars,
    prevNote: optText(raw.prevNote, 'rating-row: input.prevNote'),
    hint: optText(raw.hint, 'rating-row: input.hint'),
    required: optBool(raw.required, 'rating-row: input.required') === true,
    disabled,
    disabledReason,
    loading,
    loadingText: loadingText === undefined ? RATING_ROW_LOADING_TEXT : loadingText,
    error: optText(raw.error, 'rating-row: input.error'),
    extraClass: optExtraClass(raw.extraClass, 'rating-row: input.extraClass'),
  };
}

/** 那枚大数字怎么印（**渲染与运行时同一份算法**：两处各写一套必然走散）。 */
export function ratingRowValueText(value: number | null): string {
  return value === null ? RATING_ROW_MISSING : String(value);
}

/** 一颗星的无障碍名字（`aria-label="4 分"`）。 */
export function ratingRowStarLabel(star: number): string {
  return String(star) + ' 分';
}

/** 错态那一句挂的 `id`（`aria-describedby` 指它）：机器键里不合法 id 的字符一律换成 `-`。 */
export function ratingRowErrorId(name: string): string {
  return 'ilife-rating-err-' + name.replace(/[^A-Za-z0-9_-]+/g, '-');
}
