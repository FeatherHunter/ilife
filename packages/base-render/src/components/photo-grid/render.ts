/** photo-grid · **渲染**（纯函数产 HTML；本件只有形态 A「网格 ＋ 加一张」一种骨架）。
 *
 *  —— 形态 A：网格 ＋ 加一张 ——
 *
 *  **重做件**（原型 3/3/3）：原型拿渐变块当照片，读者看不出那是相片位。重做后一格由三样定形，
 *  缺图时也一眼读出「这里放一张照片」：
 *   ① **定形框**：`aspect-ratio` 落在框上（真图与占位共用同一个框，加载不跳版）；
 *   ② **四角取景角标**：取景器的样子（纯装饰，`aria-hidden`）；
 *   ③ **底部题注条**：日期 ＋ 说明（这是这一格「拍的是什么」）。
 *  末尾那一格是**虚线框 ＋ 加号**，靠**边框样式**（不是颜色）与内容格分开。
 *
 *  它替掉的两种错法：
 *   · 一格一块灰、没有比例 —— 图一到位整页往下推，读者眼前一跳；
 *   · 末尾那格做成实心按钮 —— 与内容格混成一个网格，读者分不清哪格是照片、哪格是入口。
 */
import { esc } from '../shared/escape.js';
import {
  PHOTO_GRID_ADD_LABEL,
  PHOTO_GRID_ADD_MARK,
  PHOTO_GRID_CLASS,
  PHOTO_GRID_EMPTY_TEXT,
  photoGridSlot,
  type PhotoGridRatio,
} from './attrs.js';
import { normalizePhotoGrid, type PhotoGridGroupModel, type PhotoGridItemModel, type PhotoGridModel } from './model.js';

/** 定形框：比例闭集 → 框上的类（`-frame-4-5` 之类）。真图与占位**同一个框**。 */
function frameClass(ratio: PhotoGridRatio): string {
  return photoGridSlot('frame') + '-' + ratio;
}

/** 一格的框里装什么：真图，或者「这里放一张照片」的占位（相机记号 ＋ 这句该放什么）。 */
function innerHtml(item: PhotoGridItemModel): string {
  const parts: string[] = ['<i class="' + photoGridSlot('marks') + '" aria-hidden="true"></i>'];
  if (item.src === undefined) {
    parts.push('<i class="' + photoGridSlot('lens') + '" aria-hidden="true"></i>');
    parts.push('<span class="' + photoGridSlot('alt') + '">' + esc(item.alt) + '</span>');
  } else {
    parts.push('<img class="' + photoGridSlot('img') + '" src="' + esc(item.src) + '" alt="' + esc(item.alt)
      + '" loading="lazy" decoding="async">');
  }
  if (item.stackText !== undefined) {
    parts.push('<span class="' + photoGridSlot('stack') + '">' + esc(item.stackText) + '</span>');
  }
  return parts.join('');
}

/** 一格：定形框 ＋ 题注条。 */
function cellHtml(item: PhotoGridItemModel, ratio: PhotoGridRatio): string {
  const parts: string[] = ['<figure class="' + photoGridSlot('cell') + ' '
    + (item.src === undefined ? 'is-placeholder' : 'is-photo') + '">'];
  parts.push('<span class="' + photoGridSlot('frame') + ' ' + frameClass(ratio) + '">'
    + innerHtml(item) + '</span>');
  const caps: string[] = [];
  if (item.date !== undefined) caps.push('<span class="' + photoGridSlot('date') + '">' + esc(item.date) + '</span>');
  if (item.caption !== undefined) caps.push('<span class="' + photoGridSlot('text') + '">' + esc(item.caption) + '</span>');
  if (caps.length > 0) {
    parts.push('<figcaption class="' + photoGridSlot('caption') + '">' + caps.join('') + '</figcaption>');
  }
  parts.push('</figure>');
  return parts.join('');
}

/** 末尾那一格：虚线框 ＋ 加号 ＋ 「加一张」（**内容格**，不是按钮）。 */
function addHtml(m: PhotoGridModel): string {
  const parts: string[] = ['<span class="' + photoGridSlot('add') + '">'];
  parts.push('<span class="' + photoGridSlot('add-mark') + '" aria-hidden="true">' + esc(PHOTO_GRID_ADD_MARK) + '</span>');
  parts.push('<span class="' + photoGridSlot('add-label') + '">' + esc(m.addLabel ?? PHOTO_GRID_ADD_LABEL) + '</span>');
  if (m.addHint !== undefined) {
    parts.push('<span class="' + photoGridSlot('add-hint') + '">' + esc(m.addHint) + '</span>');
  }
  parts.push('</span>');
  return parts.join('');
}

/** 一行的格（末尾那个「加一张」跟着**最后一组**走：它是这面墙的出口，不是某一组的）。 */
function gridHtml(group: PhotoGridGroupModel, m: PhotoGridModel, last: boolean): string {
  const parts: string[] = ['<div class="' + photoGridSlot('grid') + '">'];
  for (const item of group.photos) parts.push(cellHtml(item, m.ratio));
  if (m.add && last) parts.push(addHtml(m));
  parts.push('</div>');
  return parts.join('');
}

/** 形态 A 的骨架。平铺＝一组（无组头）；分组＝逐组一块（组头写月份与张数）。 */
function renderGrid(m: PhotoGridModel): string {
  const parts: string[] = [];
  if (m.total === 0) {
    parts.push('<p class="' + photoGridSlot('empty') + '">' + esc(PHOTO_GRID_EMPTY_TEXT) + '</p>');
    if (m.add) parts.push('<div class="' + photoGridSlot('grid') + '">' + addHtml(m) + '</div>');
    return parts.join('');
  }
  m.groups.forEach((group, i) => {
    const last = i === m.groups.length - 1;
    if (group.month === undefined) {
      parts.push(gridHtml(group, m, last));
      return;
    }
    parts.push('<div class="' + photoGridSlot('group') + '">');
    parts.push('<p class="' + photoGridSlot('group-head') + '">'
      + '<b class="' + photoGridSlot('month') + '">' + esc(group.month) + '</b>'
      + '<span class="' + photoGridSlot('group-count') + '">' + esc(group.countText) + '</span>'
      + (group.note === undefined ? '' : '<span class="' + photoGridSlot('note') + '">' + esc(group.note) + '</span>')
      + '</p>');
    parts.push(gridHtml(group, m, last));
    parts.push('</div>');
  });
  const foot: string[] = ['<span class="' + photoGridSlot('count') + '">共 ' + esc(String(m.total)) + ' 张</span>'];
  for (const seg of m.note) foot.push('<span class="' + photoGridSlot('note') + '">' + esc(seg) + '</span>');
  parts.push('<p class="' + photoGridSlot('foot') + '">' + foot.join('') + '</p>');
  return parts.join('');
}

/** 形态 → 骨架（本件只有一格；分派写在这里，加第二形态就是加一支）。 */
const SKELETONS: Readonly<Record<PhotoGridModel['form'], (m: PhotoGridModel) => string>> = {
  grid: renderGrid,
};

/** 渲染照片网格（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderPhotoGrid(input: unknown): string {
  const m = normalizePhotoGrid(input);
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  return '<div class="' + PHOTO_GRID_CLASS + ' is-' + m.form + extra + '">' + SKELETONS[m.form](m) + '</div>';
}
