/** photo-compare · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级；
 *   2. **没有差值行的「前后对比」是错的**：`deltas` 空数组一律拒（本件重做就是为了「变了多少」这句）；
 *   3. **算得出来的都不许调用方再给**：箭头的方向记号、拖动的初始百分比、`aria` 那句比较说明。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  PHOTO_COMPARE_FORMS,
  PHOTO_COMPARE_STEP,
  PHOTO_COMPARE_TONES,
  PHOTO_COMPARE_TONE_MARKS,
  type PhotoCompareDelta,
  type PhotoCompareForm,
  type PhotoCompareSide,
  type PhotoCompareTone,
} from './attrs.js';

/** 归一化后的一张。 */
export interface PhotoCompareSideModel {
  readonly date: string;
  readonly alt: string;
  readonly src?: string;
  readonly caption?: string;
  readonly size?: string;
  /** 题注条整条出不出（说明与读数两样都没有时不出，不留空条）。 */
  readonly hasCaption: boolean;
}

/** 归一化后的一行差值。 */
export interface PhotoCompareDeltaModel {
  readonly label: string;
  readonly before: string;
  readonly after: string;
  readonly change: string;
  readonly tone: PhotoCompareTone;
  /** 方向记号（↓／↑／＝）：**色之外的第二样**（正负号在 `change` 里，这是第三样）。 */
  readonly mark: string;
}

/** 归一化后的入参。 */
export interface PhotoCompareModel {
  readonly form: PhotoCompareForm;
  readonly before: PhotoCompareSideModel;
  readonly after: PhotoCompareSideModel;
  readonly deltas: readonly PhotoCompareDeltaModel[];
  readonly verdict?: string;
  readonly note?: string;
  /** 拖动竖线的初始位置（0–100 的整数）。 */
  readonly position: number;
  /** `range` 的 `aria-label`（说清左右各是哪一天）。 */
  readonly rangeLabel: string;
  readonly extraClass?: string;
}

/** 一张：日期与那段说明都必填（日期是这一件的第二个读数）。 */
function sideModel(value: unknown, field: string): PhotoCompareSideModel {
  assertPlainObject(value, field);
  const raw = value as PhotoCompareSide;
  const caption = optText(raw.caption, field + '.caption');
  const size = optText(raw.size, field + '.size');
  return {
    date: reqText(raw.date, field + '.date'),
    alt: reqText(raw.alt, field + '.alt'),
    src: optText(raw.src, field + '.src'),
    caption,
    size,
    hasCaption: caption !== undefined || size !== undefined,
  };
}

/** 一行差值：四格全必填（说不出「变了多少」的行没有存在的理由）。 */
function deltaModel(value: unknown, index: number): PhotoCompareDeltaModel {
  const field = 'photo-compare: input.deltas[' + index + ']';
  assertPlainObject(value, field);
  const raw = value as PhotoCompareDelta;
  const toneGiven: unknown = raw.tone;
  if (toneGiven !== undefined && !(PHOTO_COMPARE_TONES as readonly unknown[]).includes(toneGiven)) {
    badInput(field + '.tone 必须是 ' + PHOTO_COMPARE_TONES.join('／') + ' 之一');
  }
  const tone = (toneGiven ?? 'same') as PhotoCompareTone;
  return {
    label: reqText(raw.label, field + '.label'),
    before: reqText(raw.before, field + '.before'),
    after: reqText(raw.after, field + '.after'),
    change: reqText(raw.change, field + '.change'),
    tone,
    mark: PHOTO_COMPARE_TONE_MARKS[tone],
  };
}

/** 入参归一化。**唯一入口**：`render.ts` 与 `runtime.ts` 都只吃它产出的 `PhotoCompareModel`。 */
export function normalizePhotoCompare(input: unknown): PhotoCompareModel {
  assertPlainObject(input, 'renderPhotoCompare: input');
  const raw = input as Record<string, unknown>;

  const form = raw.form === undefined ? PHOTO_COMPARE_FORMS[0] : raw.form;
  if (!(PHOTO_COMPARE_FORMS as readonly unknown[]).includes(form)) {
    badInput('photo-compare: input.form 必须是 ' + PHOTO_COMPARE_FORMS.join('／')
      + ' 之一（本件只落地形态 A「拖动对照」）');
  }

  const before = sideModel(raw.before, 'photo-compare: input.before');
  const after = sideModel(raw.after, 'photo-compare: input.after');
  if (before.date === after.date) {
    badInput('photo-compare: input.before.date 与 input.after.date 不许同一天（同一天没有"前后"）');
  }

  const given: unknown = raw.deltas;
  if (!Array.isArray(given)) badInput('photo-compare: input.deltas 必须是数组');
  if (given.length === 0) {
    badInput('photo-compare: input.deltas 不许空数组——只给拖动，读者读不出「变了多少」（这正是本件要替掉的）');
  }
  const deltas = given.map((d, i) => deltaModel(d, i));

  const posGiven: unknown = raw.position;
  let position = 50;
  if (posGiven !== undefined) {
    if (typeof posGiven !== 'number' || !Number.isFinite(posGiven)) {
      badInput('photo-compare: input.position 必须是 0–100 的数字');
    }
    if (posGiven < 0 || posGiven > 100) badInput('photo-compare: input.position 必须落在 0–100');
    position = Math.round(posGiven / PHOTO_COMPARE_STEP) * PHOTO_COMPARE_STEP;
    position = Math.min(100, Math.max(0, position));
  }

  return {
    form: form as PhotoCompareForm,
    before,
    after,
    deltas,
    verdict: optText(raw.verdict, 'photo-compare: input.verdict'),
    note: optText(raw.note, 'photo-compare: input.note'),
    position,
    rangeLabel: '拖动竖线，比较 ' + before.date + ' 与 ' + after.date + ' 两张照片',
    extraClass: optExtraClass(raw.extraClass, 'photo-compare: input.extraClass'),
  };
}
