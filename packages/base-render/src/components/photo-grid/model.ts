/** photo-grid · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  三条口径：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级；
 *   2. **`photos` 与 `groups` 恰好给一个**：两个都给＝说不清按不按月分；两个都不给＝说不清这一页有没有照片；
 *   3. **算得出来的都不许调用方再给**：组头的「几天 · 几张」、脚注的「共 N 张」、
 *      「这张是几张叠着」的角标下限，都是本件算的。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  PHOTO_GRID_FORMS,
  PHOTO_GRID_MIN_STACK,
  PHOTO_GRID_RATIOS,
  type PhotoGridForm,
  type PhotoGridGroup,
  type PhotoGridItem,
  type PhotoGridRatio,
} from './attrs.js';

/** 归一化后的一格。 */
export interface PhotoGridItemModel {
  readonly src?: string;
  readonly alt: string;
  readonly date?: string;
  readonly caption?: string;
  /** 张数角标上的字（「3 张」）；不到下限时 `undefined`。 */
  readonly stackText?: string;
  readonly size?: string;
}

/** 归一化后的一个月（不按月分组时整页只有一组，`month` 为 `undefined`）。 */
export interface PhotoGridGroupModel {
  readonly month?: string;
  readonly note?: string;
  readonly photos: readonly PhotoGridItemModel[];
  /** 组头计数（「3 天 · 6 张」；没有日期时写「6 张」）。 */
  readonly countText: string;
}

/** 归一化后的入参。 */
export interface PhotoGridModel {
  readonly form: PhotoGridForm;
  readonly groups: readonly PhotoGridGroupModel[];
  readonly ratio: PhotoGridRatio;
  readonly add: boolean;
  readonly addLabel?: string;
  readonly addHint?: string;
  readonly note: readonly string[];
  /** 一格照片都没有（平铺时是 `photos: []`，分组时是每组都空）。 */
  readonly total: number;
  readonly extraClass?: string;
}

/** 一格里「几张叠着」：正整数，且 `>= PHOTO_GRID_MIN_STACK` 才值得出角标。 */
function itemModel(value: unknown, field: string): PhotoGridItemModel {
  assertPlainObject(value, field);
  const raw = value as PhotoGridItem;
  const alt = reqText(raw.alt, field + '.alt');
  const src = optText(raw.src, field + '.src');
  const countGiven: unknown = raw.count;
  let stackText: string | undefined;
  if (countGiven !== undefined) {
    if (typeof countGiven !== 'number' || !Number.isInteger(countGiven) || countGiven < 1) {
      badInput(field + '.count 必须是 >= 1 的整数（这一格是几张叠着）');
    }
    if (countGiven >= PHOTO_GRID_MIN_STACK) stackText = String(countGiven) + ' 张';
  }
  return {
    src,
    alt,
    date: optText(raw.date, field + '.date'),
    caption: optText(raw.caption, field + '.caption'),
    stackText,
    size: optText(raw.size, field + '.size'),
  };
}

/** 一组：月份（可缺，平铺时缺）＋ 这一组的格。组头计数由本件算。 */
function groupModel(value: unknown, field: string, withMonth: boolean): PhotoGridGroupModel {
  assertPlainObject(value, field);
  const raw = value as PhotoGridGroup;
  const month = withMonth
    ? reqText(raw.month, field + '.month')
    : optText(raw.month, field + '.month');
  const given: unknown = raw.photos;
  if (!Array.isArray(given)) badInput(field + '.photos 必须是数组');
  const photos = given.map((p, i) => itemModel(p, field + '.photos[' + i + ']'));
  /* 「几天」＝题注条上出现过的**不同日期**个数（不解析日期本身，标了几个不同的日子就是几天）。 */
  const days = new Set<string>();
  for (const p of photos) if (p.date !== undefined) days.add(p.date);
  const countText = (days.size > 0 ? String(days.size) + ' 天 · ' : '') + String(photos.length) + ' 张';
  return {
    month,
    note: optText(raw.note, field + '.note'),
    photos,
    countText,
  };
}

/** 串或串数组 → 段数组（与 `page-head` 同口径）。 */
function textList(value: unknown, field: string): readonly string[] {
  if (value === undefined) return [];
  if (typeof value === 'string') {
    const one = optText(value, field);
    return one === undefined ? [] : [one];
  }
  if (!Array.isArray(value)) badInput(field + ' 必须是字符串，或字符串数组（逐段一枚）');
  const out: string[] = [];
  for (let i = 0; i < value.length; i += 1) {
    const one = optText(value[i], field + '[' + i + ']');
    if (one !== undefined) out.push(one);
  }
  return out;
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `PhotoGridModel`。 */
export function normalizePhotoGrid(input: unknown): PhotoGridModel {
  assertPlainObject(input, 'renderPhotoGrid: input');
  const raw = input as Record<string, unknown>;

  const form = raw.form === undefined ? PHOTO_GRID_FORMS[0] : raw.form;
  if (!(PHOTO_GRID_FORMS as readonly unknown[]).includes(form)) {
    badInput('photo-grid: input.form 必须是 ' + PHOTO_GRID_FORMS.join('／') + ' 之一（本件只落地形态 A「网格 ＋ 加一张」）');
  }

  const hasPhotos = raw.photos !== undefined;
  const hasGroups = raw.groups !== undefined;
  if (hasPhotos === hasGroups) {
    badInput('photo-grid: input.photos 与 input.groups 恰好给一个'
      + (hasPhotos ? '（两个都给了：说不清这一页按不按月分）' : '（都没给：说不清这一页有没有照片）'));
  }

  let groups: readonly PhotoGridGroupModel[];
  if (hasGroups) {
    const given: unknown = raw.groups;
    if (!Array.isArray(given)) badInput('photo-grid: input.groups 必须是数组');
    groups = given.map((g, i) => groupModel(g, 'photo-grid: input.groups[' + i + ']', true));
  } else {
    const given: unknown = raw.photos;
    if (!Array.isArray(given)) badInput('photo-grid: input.photos 必须是数组');
    /* 平铺也是一组（只是没有月份）：出标记时两条路合成一段代码，两种形态的字面差别就只剩组头。 */
    groups = [groupModel({ photos: given }, 'photo-grid: input.photos', false)];
  }

  const ratioGiven: unknown = raw.ratio;
  if (ratioGiven !== undefined && !(PHOTO_GRID_RATIOS as readonly unknown[]).includes(ratioGiven)) {
    badInput('photo-grid: input.ratio 必须是 ' + PHOTO_GRID_RATIOS.join('／') + ' 之一');
  }

  let total = 0;
  for (const g of groups) total += g.photos.length;

  return {
    form: form as PhotoGridForm,
    groups,
    ratio: (ratioGiven ?? PHOTO_GRID_RATIOS[0]) as PhotoGridRatio,
    add: raw.add !== false,
    addLabel: optText(raw.addLabel, 'photo-grid: input.addLabel'),
    addHint: optText(raw.addHint, 'photo-grid: input.addHint'),
    note: textList(raw.note, 'photo-grid: input.note'),
    total,
    extraClass: optExtraClass(raw.extraClass, 'photo-grid: input.extraClass'),
  };
}
