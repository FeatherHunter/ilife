/** rating-row · **渲染**（纯函数产 HTML；零 DOM、零副作用）。
 *
 *  —— 形态 A：星级 ＋ 数字读数 ——
 *
 *  骨架（顺序固定，判据逐槽断）：
 *    `label`（给什么打分 ＋ 上次对照）→ `body`（`stars` 星组 ＋ `score` 大数字读数）
 *    → 可选的 `hint`（读数后一句）／`why`（禁用原因）／`error`（错态）。
 *
 *  三条硬口径：
 *   · **每颗星是可聚焦的按钮**：`<button type="button" role="radio" aria-checked aria-label="N 分">`，
 *     住在 `role="radiogroup"` 里；漫游 `tabindex` 与方向键由运行时给（渲染期先给出**可聚焦的那一枚**）；
 *   · **星星之外必须给数字读数**：空心星 `☆` 变成实心星 `★`（形状）＋ 那枚 `tabular-nums` 的大数字（字）
 *     —— 只给星星的话「4 分还是 4.5 分」读不出来；缺值写 `—`（与「0 分」区分）；
 *   · 小数（`4.5`）**只影响显示**：前四颗实心、第五颗半实心（左半实心，形状上看得出来）。
 */
import { esc } from '../shared/escape.js';
import {
  RATING_ROW_CLASS,
  RATING_ROW_DISABLED_ATTR,
  RATING_ROW_FORM_ATTR,
  RATING_ROW_HALF_ATTR,
  RATING_ROW_LOADING_ATTR,
  RATING_ROW_MAX_ATTR,
  RATING_ROW_NAME_ATTR,
  RATING_ROW_STAR_ATTR,
  RATING_ROW_VALUE_ATTR,
  ratingRowSlot,
  type RatingRowForm,
} from './attrs.js';
import { normalizeRatingRow, ratingRowErrorId, ratingRowStarLabel, ratingRowValueText, type RatingRowModel } from './model.js';

/** 一颗星的状态：整颗实心／半颗（左半实心）／空。 */
function starState(value: number | null, star: number): 'on' | 'half' | 'off' {
  if (value === null) return 'off';
  if (star <= value) return 'on';
  return star - 0.5 <= value ? 'half' : 'off';
}

/** 星组（`role="radiogroup"`）：每颗星都是可聚焦的按钮，`aria-label="N 分"`。 */
function starsHtml(m: RatingRowModel): string {
  const attrs: string[] = [
    'class="' + ratingRowSlot('stars') + '"',
    'role="radiogroup"',
    'aria-label="' + esc(m.label) + '"',
  ];
  if (m.required) attrs.push('aria-required="true"');
  if (m.error !== undefined) {
    attrs.push('aria-invalid="true"');
    attrs.push('aria-describedby="' + esc(ratingRowErrorId(m.name)) + '"');
  }
  if (m.loading) attrs.push('aria-busy="true"');
  const parts: string[] = ['<div ' + attrs.join(' ') + '>'];
  /* 漫游 tabindex：**可聚焦的那一枚** ＝ 当前分值那一颗；没有分值就落在第一颗。 */
  const focusAt = m.value === null ? 1 : Math.max(1, Math.ceil(m.value));
  for (let star = 1; star <= m.max; star += 1) {
    const state = starState(m.value, star);
    /* 状态一律写在**无障碍面／`data-*`** 上，不另挂 `is-*` 修饰类：整颗实心＝`aria-checked="true"`
       （每颗星本来就必须带它），半颗＝`data-ilife-rating-half`。两三个字母的类名是全仓共享的
       拼写空间：重名就会被别件的选择器命中（判据「跨件零交集」会红）。 */
    const starAttrs: string[] = [
      'type="button"',
      'class="' + ratingRowSlot('star') + '"',
      'role="radio"',
      'aria-checked="' + (state === 'on' ? 'true' : 'false') + '"',
      'aria-label="' + esc(ratingRowStarLabel(star)) + '"',
      RATING_ROW_STAR_ATTR + '="' + String(star) + '"',
      'tabindex="' + (star === focusAt ? '0' : '-1') + '"',
    ];
    if (state === 'half') starAttrs.push(RATING_ROW_HALF_ATTR + '="1"');
    if (m.disabled || m.loading) {
      /* 不可评时按钮落 `disabled`（说得出为什么：原因那句话在 `why` 槽里）。 */
      starAttrs.push('disabled');
    }
    parts.push('<button ' + starAttrs.join(' ') + '>'
      + '<span class="' + ratingRowSlot('glyph') + '" aria-hidden="true"></span>'
      + '</button>');
  }
  parts.push('</div>');
  return parts.join('');
}

/** 数字读数那一排：大数字 ＋ 分母（＋ 可选补充）。**星星之外必须有它**。
 *  加载态：数字位**原地换字**（盒模型不动 ⇒ 不跳版），并把这一排做成 `role="status"` 让读屏也知道。 */
function scoreHtml(m: RatingRowModel): string {
  const parts: string[] = ['<p class="' + ratingRowSlot('score') + '"'
    + (m.loading ? ' role="status"' : '') + '>'];
  parts.push('<b class="' + ratingRowSlot('num') + '">'
    + esc(m.loading ? m.loadingText : ratingRowValueText(m.value)) + '</b>');
  parts.push('<span class="' + ratingRowSlot('den') + '">/ ' + String(m.max) + ' 星</span>');
  if (m.hint !== undefined) parts.push('<span class="' + ratingRowSlot('hint') + '">' + esc(m.hint) + '</span>');
  parts.push('</p>');
  return parts.join('');
}

/** 形态 A 的骨架。 */
function renderStars(m: RatingRowModel): string {
  const parts: string[] = [];
  parts.push('<p class="' + ratingRowSlot('label') + '"><b class="' + ratingRowSlot('label-title') + '">'
    + esc(m.label) + '</b>'
    + (m.prevNote === undefined ? '' : '<span class="' + ratingRowSlot('prev') + '">' + esc(m.prevNote) + '</span>')
    + '</p>');
  parts.push('<div class="' + ratingRowSlot('body') + '">' + starsHtml(m) + scoreHtml(m) + '</div>');
  if (m.disabledReason !== undefined) {
    parts.push('<p class="' + ratingRowSlot('why') + '">' + esc(m.disabledReason) + '</p>');
  }
  if (m.error !== undefined) {
    parts.push('<p class="' + ratingRowSlot('error') + '" id="' + esc(ratingRowErrorId(m.name)) + '">' + esc(m.error) + '</p>');
  }
  return parts.join('');
}

/** 形态 → 骨架（加第二形态就是加一支）。 */
const SKELETONS: Readonly<Record<RatingRowForm, (m: RatingRowModel) => string>> = {
  stars: renderStars,
};

/** 渲染评分行（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderRatingRow(input: unknown): string {
  const m = normalizeRatingRow(input);
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  const attrs: string[] = [
    'class="' + RATING_ROW_CLASS + ' is-' + m.form + extra + '"',
    RATING_ROW_NAME_ATTR + '="' + esc(m.name) + '"',
    RATING_ROW_FORM_ATTR + '="' + esc(m.form) + '"',
    RATING_ROW_MAX_ATTR + '="' + String(m.max) + '"',
  ];
  if (m.value !== null) attrs.push(RATING_ROW_VALUE_ATTR + '="' + esc(String(m.value)) + '"');
  if (m.disabled) attrs.push(RATING_ROW_DISABLED_ATTR + '="1"');
  if (m.loading) attrs.push(RATING_ROW_LOADING_ATTR + '="1"');
  return '<div ' + attrs.join(' ') + '>' + SKELETONS[m.form](m) + '</div>';
}
