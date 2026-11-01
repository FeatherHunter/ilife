/** photo-grid · **样式段**（本件唯一的样式来源）。**重做件**：占位必须读得出是相片。
 *
 *  四条重做口径（`重做设计口径.md` §0）逐条落在这一段里：
 *   ① **占位物读得出它是什么**：定形框（`aspect-ratio`）＋ 四角取景角标 ＋ 中央相机记号 ＋ 底部题注条；
 *   ② **状态除色之外还有第二样**：占位格与真图格靠 `is-placeholder`（虚线内圈 ＋ 相机记号），
 *      末尾「加一张」靠**虚线边框**与内容格分开 —— 换皮换到零阴影、零圆角也读得出；
 *   ③ **层次不靠投影与圆角**：框靠一圈发丝线 ＋ 四角角标，题注条靠**软底色 ＋ 上发丝线**；
 *   ④ **骨架对得上这类数据**：`<figure>` ＋ `<figcaption>`（照片与它的题注本来就是一格一件事）。
 *
 *  纪律：只经 `skinVar()` 读皮肤；scope 在 `.<prefix>page-ui` 之下；零 `:root`／`!important`；
 *  宽度只许容器判（`@container`），媒体查询只判设备能力（本件没用到）。
 */
import { skinVar } from '../skin/contract.js';
import { PHOTO_GRID_RATIOS, photoGridSlot, type PhotoGridSlot } from './attrs.js';
import { m } from '../../entries/index.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 取景角标的臂长（px）：一根角标两条边各这么长。 */
export const PHOTO_GRID_MARK_ARM_PX = 12;
/** 取景角标的线宽（px）。 */
export const PHOTO_GRID_MARK_THICK_PX = 2;
/** 取景角标离框边的内距（px）。 */
export const PHOTO_GRID_MARK_INSET_PX = 6;
/** 末尾「加一张」那格的命中下限（px）：**命中盒不得小于它**（视觉盒可以随比例更高）。 */
export const PHOTO_GRID_TOUCH_PX = 44;
/** 列数换档的容器阈值（px）：**容器宽 ≤ 它两列，> 它三列**。
 *  判的是**本件自己的宽度**（`@container`），不是视口宽度。这一档写成**窄档的上界**（`max-width`）、
 *  宽档当缺省：窄档才是要**覆盖**的那一档，而缺省态本身是站得住的（390 档不必再单列一条规则）。 */
export const PHOTO_GRID_TWO_COL_MAX_PX = 520;

/** 四角取景角标：8 层背景（每角一条横、一条竖），不新增元素、不吃伪元素、零阴影下也在。 */
function marksCss(): string[] {
  const color = skinVar('line');
  const bar = 'linear-gradient(' + color + ', ' + color + ')';
  const arm = String(PHOTO_GRID_MARK_ARM_PX) + 'px';
  const thick = String(PHOTO_GRID_MARK_THICK_PX) + 'px';
  const inset = String(PHOTO_GRID_MARK_INSET_PX) + 'px';
  const right = 'calc(100% - ' + inset + ')';
  const bottom = 'calc(100% - ' + inset + ')';
  const pos: string[] = [];
  for (const [y, x] of [[inset, inset], [inset, right], [bottom, inset], [bottom, right]]) {
    pos.push(x + ' ' + y, x + ' ' + y);
  }
  return [
    '  background-image: ' + [bar, bar, bar, bar, bar, bar, bar, bar].join(', ') + ';',
    '  background-size: ' + [arm + ' ' + thick, thick + ' ' + arm].join(', ')
      + [arm + ' ' + thick, thick + ' ' + arm].join(', ')
      + [arm + ' ' + thick, thick + ' ' + arm].join(', ')
      + [arm + ' ' + thick, thick + ' ' + arm].join(', ') + ';',
    '  background-position: ' + pos.join(', ') + ';',
    '  background-repeat: no-repeat;',
  ];
}

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function photoGridCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const box = root + ' .' + p + 'block-photo-grid';
  const slotSel = (s: PhotoGridSlot): string => '.' + photoGridSlot(s, p);
  const s = (slot: PhotoGridSlot): string => root + ' ' + slotSel(slot);

  const out: string[] = [
    m('base-render.components-photo-grid-style.c001'),
    m('base-render.components-photo-grid-style.c002'),
    m('base-render.components-photo-grid-style.c003'),
    box + ' {',
    '  container-type: inline-size;',
    '  display: grid;',
    '  gap: 14px;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-body') + ';',
    '  line-height: 1.5;',
    '}',
    m('base-render.components-photo-grid-style.c004'),
    s('grid') + ' {',
    '  display: grid;',
    m('base-render.components-photo-grid-style.c005'),
    '  grid-template-columns: repeat(3, minmax(0, 1fr));',
    '  gap: 12px 10px;',
    '  min-width: 0;',
    '  align-items: start;',
    '}',
    '/* 一格：`<figure>` ＝ 一张照片 ＋ 它的题注（本来就是一格一件事）。 */',
    s('cell') + ' {',
    '  display: grid;',
    '  gap: 6px;',
    '  min-width: 0;',
    '  margin: 0;',
    '}',
    m('base-render.components-photo-grid-style.c006'),
    s('frame') + ' {',
    '  position: relative;',
    '  display: grid;',
    '  place-items: center;',
    '  width: 100%;',
    '  min-width: 0;',
    '  box-sizing: border-box;',
    '  border: 1px solid ' + skinVar('edge') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + skinVar('surface-2') + ';',
    '  overflow: hidden;',
    '}',
  ];
  for (const ratio of PHOTO_GRID_RATIOS) {
    out.push(root + ' .' + photoGridSlot('frame', p) + '-' + ratio
      + ' { aspect-ratio: ' + ratio.split('-').join(' / ') + '; }');
  }
  out.push(
    m('base-render.components-photo-grid-style.c007'),
    s('marks') + ' {',
    '  position: absolute;',
    '  inset: 0;',
    '  pointer-events: none;',
    ...marksCss(),
    '}',
    m('base-render.components-photo-grid-style.c008'),
    s('lens') + ' {',
    '  position: relative;',
    '  display: block;',
    '  grid-area: 1 / 1;',
    '  align-self: end;',
    '  margin-bottom: 6px;',
    '  width: 34px;',
    '  height: 26px;',
    '  box-sizing: border-box;',
    '  border: ' + String(PHOTO_GRID_MARK_THICK_PX) + 'px solid ' + skinVar('ink-3') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '}',
    s('lens') + '::before {',
    '  content: "";',
    '  position: absolute;',
    '  left: 50%;',
    '  top: 50%;',
    '  width: 10px;',
    '  height: 10px;',
    '  margin: -6px 0 0 -6px;',
    '  box-sizing: border-box;',
    '  border: ' + String(PHOTO_GRID_MARK_THICK_PX) + 'px solid ' + skinVar('ink-3') + ';',
    '  border-radius: 50%;',
    '}',
    s('lens') + '::after {',
    '  content: "";',
    '  position: absolute;',
    '  right: 3px;',
    '  top: -7px;',
    '  width: 8px;',
    '  height: 5px;',
    '  box-sizing: border-box;',
    '  border: ' + String(PHOTO_GRID_MARK_THICK_PX) + 'px solid ' + skinVar('ink-3') + ';',
    '  border-bottom: 0;',
    '  border-radius: 3px 3px 0 0;',
    '}',
    m('base-render.components-photo-grid-style.c009'),
    s('alt') + ' {',
    '  grid-area: 2 / 1;',
    '  align-self: start;',
    '  justify-self: center;',
    '  max-width: 100%;',
    '  padding: 0 8px;',
    '  box-sizing: border-box;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  text-align: center;',
    '  overflow-wrap: anywhere;',
    '}',
    s('frame') + ' { grid-template-rows: 1fr auto 1fr; }',
    s('cell') + '.is-placeholder ' + slotSel('frame') + ' {',
    '  border-style: dashed;',
    '  background: ' + skinVar('surface') + ';',
    '}',
    m('base-render.components-photo-grid-style.c010'),
    s('img') + ' {',
    '  display: block;',
    '  grid-area: 1 / 1 / 4 / 2;',
    '  width: 100%;',
    '  height: 100%;',
    '  max-width: 100%;',
    '  object-fit: cover;',
    '}',
    m('base-render.components-photo-grid-style.c011'),
    m('base-render.components-photo-grid-style.c012'),
    s('stack') + ' {',
    '  position: absolute;',
    '  right: ' + String(PHOTO_GRID_MARK_INSET_PX) + 'px;',
    '  bottom: ' + String(PHOTO_GRID_MARK_INSET_PX) + 'px;',
    '  padding: 1px 7px;',
    '  border: 1px solid ' + skinVar('accent') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + skinVar('accent-soft') + ';',
    '  color: ' + skinVar('accent-text') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '}',
    m('base-render.components-photo-grid-style.c013'),
    s('caption') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 2px 8px;',
    '  min-width: 0;',
    '  padding: 6px 8px;',
    '  box-sizing: border-box;',
    '  border-top: 1px solid ' + skinVar('line') + ';',
    '  background: ' + skinVar('surface-2') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  line-height: 1.5;',
    '}',
    s('date') + ' {',
    '  flex: none;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '}',
    s('text') + ' {',
    '  flex: 1 1 auto;',
    '  min-width: 0;',
    '  overflow-wrap: anywhere;',
    '}',
    m('base-render.components-photo-grid-style.c014'),
    s('add') + ' {',
    '  display: grid;',
    '  place-items: center;',
    '  align-content: center;',
    '  gap: 4px;',
    '  min-height: ' + String(PHOTO_GRID_TOUCH_PX) + 'px;',
    '  box-sizing: border-box;',
    '  padding: 14px 8px;',
    '  border: 1px dashed ' + skinVar('line') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: transparent;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '  text-align: center;',
    '}',
    s('add-mark') + ' {',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: calc(' + skinVar('fs-body') + ' * 1.6);',
    '  line-height: 1;',
    '  font-weight: 600;',
    '}',
    s('add-label') + ', ' + s('add-hint') + ' {',
    '  max-width: 100%;',
    '  overflow-wrap: anywhere;',
    '}',
    s('add-hint') + ' {',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-weight: 600;',
    '}',
    m('base-render.components-photo-grid-style.c015'),
    s('group') + ' {',
    '  display: grid;',
    '  gap: 8px;',
    '  min-width: 0;',
    '}',
    s('group-head') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 2px 10px;',
    '  margin: 0;',
    '  padding-bottom: 6px;',
    '  min-width: 0;',
    '  border-bottom: 1px solid ' + skinVar('line') + ';',
    '}',
    s('month') + ' {',
    '  flex: none;',
    '  color: ' + skinVar('ink') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  font-weight: 700;',
    '}',
    s('group-count') + ' {',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-variant-numeric: tabular-nums;',
    '}',
    s('group-head') + ' > ' + slotSel('note') + ' { margin-left: auto; }',
    m('base-render.components-photo-grid-style.c016'),
    s('foot') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 4px 8px;',
    '  margin: 0;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  line-height: 1.6;',
    '}',
    s('count') + ' {',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '}',
    s('foot') + ' > ' + slotSel('note') + ' {',
    '  padding-left: 8px;',
    '  border-left: 1px solid ' + skinVar('line') + ';',
    '  overflow-wrap: anywhere;',
    '}',
    m('base-render.components-photo-grid-style.c017'),
    s('empty') + ' {',
    '  margin: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '}',
    m('base-render.components-photo-grid-style.c018'),
    box + ' :focus-visible {',
    '  outline: 2px solid ' + skinVar('accent') + ';',
    '  outline-offset: 2px;',
    '}',
    m('base-render.components-photo-grid-style.c019', { p0: String(String(PHOTO_GRID_TWO_COL_MAX_PX)) }),
    m('base-render.components-photo-grid-style.c020'),
    '@container (max-width: ' + String(PHOTO_GRID_TWO_COL_MAX_PX) + 'px) {',
    '  ' + s('grid') + ' {',
    '    grid-template-columns: repeat(2, minmax(0, 1fr));',
    '  }',
    '}',
  );
  return out.join(LF);
}
