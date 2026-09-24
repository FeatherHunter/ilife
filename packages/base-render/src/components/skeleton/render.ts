/** skeleton · **渲染**（纯函数产 HTML；零 DOM、零副作用。本件只有形态 A「读数 ＋ 明细行骨架」一种骨架）。
 *
 *  —— 形态 A：照真版式排的骨架 ——
 *
 *  三条硬口径：
 *   · **按真实版式排，不是几条灰杠**：上面一条**大字位**（真件是页头的主读数）＋ 一条副行位；
 *     下面是若干条**明细行**（时间槽／两行名称位／值位），行间一条发丝线 —— 与 `entry-rows`
 *     同一副盒子（时间槽宽度直接读它的常量），所以真数据进来时**不跳版**；
 *   · **排头说人话**：`label`（正在读什么）＋ `eta`（还要多久）—— 骨架不是「无话可说」的样子；
 *   · **占位块全部 `aria-hidden`**：读屏只念排头那句（`role="status"`），不念十二个空盒子；
 *     根上 `aria-busy="true"` 告诉辅助技术「这一块还在变」。
 */
import { esc } from '../shared/escape.js';
import {
  SKELETON_CLASS,
  SKELETON_FORM_ATTR,
  SKELETON_ROWS_ATTR,
  skeletonSlot,
} from './attrs.js';
import { normalizeSkeleton, type SkeletonModel } from './model.js';

/** 一条明细行：时间槽 ＋ 名称位两行 ＋ 值位（三列的宽度由样式按真件的盒子钉死）。 */
function rowHtml(): string {
  return '<div class="' + skeletonSlot('row') + '">'
    + '<span class="' + skeletonSlot('row-time') + '"></span>'
    + '<span class="' + skeletonSlot('row-lines') + '">'
    + '<span class="' + skeletonSlot('line') + '"></span>'
    + '<span class="' + skeletonSlot('line-short') + '"></span>'
    + '</span>'
    + '<span class="' + skeletonSlot('row-value') + '"></span>'
    + '</div>';
}

/** 形态 A 的骨架。 */
function renderReadingList(m: SkeletonModel): string {
  const parts: string[] = [];
  parts.push('<p class="' + skeletonSlot('cap') + '" role="status">');
  parts.push('<span class="' + skeletonSlot('cap-text') + '">' + esc(m.label) + '</span>');
  if (m.eta !== undefined) parts.push('<b class="' + skeletonSlot('cap-eta') + '">' + esc(m.eta) + '</b>');
  parts.push('</p>');

  parts.push('<div class="' + skeletonSlot('card') + '">');
  parts.push('<div class="' + skeletonSlot('reading') + '" aria-hidden="true">');
  parts.push('<span class="' + skeletonSlot('reading-value') + '"></span>');
  parts.push('<span class="' + skeletonSlot('reading-sub') + '"></span>');
  parts.push('</div>');
  parts.push('<div class="' + skeletonSlot('list') + '" aria-hidden="true">');
  for (let i = 0; i < m.rows; i += 1) parts.push(rowHtml());
  parts.push('</div>');
  parts.push('</div>');
  return parts.join('');
}

/** 形态 → 骨架（本件只有一格；加第二形态就是加一支）。 */
const SKELETONS: Readonly<Record<SkeletonModel['form'], (m: SkeletonModel) => string>> = {
  'reading-list': renderReadingList,
};

/** 渲染加载骨架（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderSkeleton(input: unknown): string {
  const m = normalizeSkeleton(input);
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  return '<div class="' + SKELETON_CLASS + ' is-' + m.form + extra + '"'
    + ' aria-busy="true"'
    + ' ' + SKELETON_FORM_ATTR + '="' + m.form + '"'
    + ' ' + SKELETON_ROWS_ATTR + '="' + String(m.rows) + '"'
    + '>' + SKELETONS[m.form](m) + '</div>';
}
