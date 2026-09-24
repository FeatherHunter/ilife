/** skeleton · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  两条口径：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级：行数被静默夹到上限，
 *      会让「加载完不跳版」这条不变量在页面上悄悄失效（本件的高度是行数的线性式，夹了就不准了）；
 *   2. 归一化只做「形状」：行数只收整数、只收 `1..SKELETON_MAX_ROWS`；文本一律逐字上屏。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import { SKELETON_FORMS, SKELETON_MAX_ROWS, type SkeletonForm } from './attrs.js';

/** 内部类型：每个字段都已校验、已归一（`undefined` 一律换成「不给」）。 */
export interface SkeletonModel {
  readonly form: SkeletonForm;
  /** 正在读什么。 */
  readonly label: string;
  /** 明细行占位几条（整数 1..SKELETON_MAX_ROWS）。 */
  readonly rows: number;
  /** 还要多久／读多少。 */
  readonly eta?: string;
  readonly extraClass?: string;
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `SkeletonModel`，不再自己碰 `any`。 */
export function normalizeSkeleton(input: unknown): SkeletonModel {
  assertPlainObject(input, 'renderSkeleton: input');
  const raw = input as Record<string, unknown>;

  const form = raw.form === undefined ? SKELETON_FORMS[0] : raw.form;
  if (!(SKELETON_FORMS as readonly unknown[]).includes(form)) {
    badInput('skeleton: input.form 必须是 ' + SKELETON_FORMS.join('／') + ' 之一'
      + '（本件只落地形态 A「读数 ＋ 明细行骨架」）');
  }

  const rows: unknown = raw.rows;
  if (typeof rows !== 'number' || !Number.isInteger(rows)) {
    badInput('skeleton: input.rows 必须是整数（行数是本件高度的唯一变量）');
  }
  if (rows < 1 || rows > SKELETON_MAX_ROWS) {
    badInput('skeleton: input.rows 必须在 1..' + String(SKELETON_MAX_ROWS) + ' 之间（不给就静默夹，'
      + '高度就不再是行数的线性式，「加载完不跳版」会悄悄失效）：' + String(rows));
  }

  return {
    form: form as SkeletonForm,
    label: reqText(raw.label, 'skeleton: input.label'),
    rows,
    eta: optText(raw.eta, 'skeleton: input.eta'),
    extraClass: optExtraClass(raw.extraClass, 'skeleton: input.extraClass'),
  };
}
