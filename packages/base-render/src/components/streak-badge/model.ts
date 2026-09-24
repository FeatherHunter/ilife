/** streak-badge · **入参归一化与校验**（把 `any` 与说不出的 `unknown` 挡在门外，产出内部类型）。
 *
 *  两条口径：
 *   1. **非法入参一律 `badInput()`**（抛 `BlocksError`）——不静默降级：档位给错若不报，
 *      换皮后"强弱"就只是一点颜色差，读者看不出轻重；
 *   2. 归一化只做**形状**：连记天数、分母、日期格式**归调用方**（本件只收"已经是给人看的样子"的串）。
 */
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';
import {
  STREAK_BADGE_FORMS,
  STREAK_STRENGTHS,
  type StreakBadgeForm,
  type StreakBadgeItem,
  type StreakStrength,
} from './attrs.js';

/** 内部类型：每个字段都已校验、已归一。 */
export interface StreakBadgeModel {
  readonly form: StreakBadgeForm;
  readonly heading?: string;
  readonly badges: readonly NormalizedStreakBadge[];
  readonly absentLine?: string;
  readonly extraClass?: string;
}

export interface NormalizedStreakBadge {
  readonly strength: StreakStrength;
  readonly label: string;
  readonly value: string;
  readonly unit?: string;
}

function badgeOf(raw: unknown, field: string): NormalizedStreakBadge {
  assertPlainObject(raw, field);
  const item = raw as StreakBadgeItem;
  if (!(STREAK_STRENGTHS as readonly unknown[]).includes(item.strength)) {
    badInput(field + '.strength 必须是 ' + STREAK_STRENGTHS.join('／') + ' 之一，收到：' + String(item.strength));
  }
  return {
    strength: item.strength as StreakStrength,
    label: reqText(item.label, field + '.label'),
    value: reqText(item.value, field + '.value'),
    unit: optText(item.unit, field + '.unit'),
  };
}

/** 入参归一化。**唯一入口**：`render.ts` 只吃它产出的 `StreakBadgeModel`。 */
export function normalizeStreakBadges(input: unknown): StreakBadgeModel {
  assertPlainObject(input, 'renderStreakBadges: input');
  const raw = input as Record<string, unknown>;
  const form = raw.form === undefined ? STREAK_BADGE_FORMS[0] : raw.form;
  if (!(STREAK_BADGE_FORMS as readonly unknown[]).includes(form)) {
    badInput('streak-badge: input.form 必须是 ' + STREAK_BADGE_FORMS.join('／') + ' 之一（本件只落地形态 A「一行几个徽标」）');
  }
  if (!Array.isArray(raw.badges)) badInput('streak-badge: input.badges 必须是数组');
  const badges: NormalizedStreakBadge[] = [];
  for (let i = 0; i < raw.badges.length; i += 1) {
    badges.push(badgeOf(raw.badges[i], 'streak-badge: input.badges[' + i + ']'));
  }
  return {
    form: form as StreakBadgeForm,
    heading: optText(raw.heading, 'streak-badge: input.heading'),
    badges,
    absentLine: optText(raw.absentLine, 'streak-badge: input.absentLine'),
    extraClass: optExtraClass(raw.extraClass, 'streak-badge: input.extraClass'),
  };
}
