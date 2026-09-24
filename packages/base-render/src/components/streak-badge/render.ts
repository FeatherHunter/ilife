/** streak-badge · **渲染**（纯函数产 HTML；零 DOM、零副作用）。
 *
 *  形状：`小标题（可选）` → `徽标逐个` → `空态（可选）`。
 *  一个徽标：`前词 · 数（放大成读数）· 量词`，强弱档进 `is-<档>` 类。
 *
 *  它替掉的是哪几种错法：
 *   · 三个徽标只换颜色（读者分不出哪个是"当前战绩"、哪个是"上次断点"）⇒ 档位决定**形状**与字重；
 *   · 数藏在句子里（「连续记录了 37 天」）⇒ 读数与前后词分槽，逐个数竖排对得齐；
 *   · 断签也画成同一个绿徽标 ⇒ 弱档没有底色、只有底线，读起来是"注脚"不是"战绩"。
 */
import { esc } from '../shared/escape.js';
import {
  streakBadgeClass, streakBadgeSlot, type StreakBadgeSlot, type StreakStrength,
} from './attrs.js';
import { normalizeStreakBadges, type NormalizedStreakBadge } from './model.js';
import type { StreakBadgeForm, StreakBadgeInput, StreakBadgeItem } from './attrs.js';

export type { StreakBadgeForm, StreakBadgeInput, StreakBadgeItem, StreakBadgeSlot, StreakStrength };

/** 槽类名的本件内缩写（前缀固定 `ilife-`：换前缀是样式段的事）。 */
const slot = (name: StreakBadgeSlot): string => streakBadgeSlot(name);

function badgeHtml(badge: NormalizedStreakBadge): string {
  return '<span class="' + slot('badge') + ' is-' + badge.strength + '">'
    + '<span class="' + slot('label') + '">' + esc(badge.label) + '</span>'
    + '<b class="' + slot('value') + '">' + esc(badge.value) + '</b>'
    + (badge.unit === undefined ? '' : '<span class="' + slot('unit') + '">' + esc(badge.unit) + '</span>')
    + '</span>';
}

/** 连记徽标：一行几个。空数组且没有空态那一句 ⇒ 出不了一个字。 */
export function renderStreakBadges(input: StreakBadgeInput): string {
  const m = normalizeStreakBadges(input);
  if (m.badges.length === 0 && m.absentLine === undefined) return '';
  const head = m.heading === undefined
    ? ''
    : '<div class="' + slot('head') + '"><span class="' + slot('heading') + '">' + esc(m.heading) + '</span></div>';
  const list = m.badges.length === 0
    ? ''
    : '<div class="' + slot('list') + '">' + m.badges.map(badgeHtml).join('') + '</div>';
  const absent = m.absentLine === undefined
    ? ''
    : '<p class="' + slot('absent') + '">' + esc(m.absentLine) + '</p>';
  return '<div class="' + streakBadgeClass() + (m.extraClass === undefined ? '' : ' ' + m.extraClass) + '">'
    + head + list + absent + '</div>';
}
